from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import chromadb
from chromadb import PersistentClient

from rag.client_rag.client_rag_manager import get_client_rag_manager
from rag.client_rag.embedding_service import get_embedding_service
from rag.client_rag.retrieval_engine import RetrievalEngine, RetrievalResult
from utils.config import settings
from utils.logging_config import get_logger

logger = get_logger(__name__)


@dataclass
class DualRagResult:
    query: str
    client_results: list[RetrievalResult]
    universal_results: list[RetrievalResult]
    merged_results: list[RetrievalResult]
    context_text: str
    attribution: dict[str, list[str]] = field(default_factory=dict)


class DualRagOrchestrator:
    def __init__(self) -> None:
        self._client_rag = get_client_rag_manager()
        self._embedding_service = get_embedding_service()
        self._universal_collection: Any = None

    def _get_universal_collection(self):
        if self._universal_collection is None:
            chroma_dir = Path(settings.chroma_persist_dir)
            if not chroma_dir.exists():
                logger.warning("universal_kb_not_found", path=str(chroma_dir))
                return None
            try:
                client: PersistentClient = chromadb.PersistentClient(path=str(chroma_dir))
                self._universal_collection = client.get_or_create_collection(
                    name=settings.universal_kb_collection,
                    metadata={"hnsw:space": "cosine"},
                )
            except Exception as e:
                logger.error("universal_kb_load_failed", error=str(e))
                return None
        return self._universal_collection

    def _search_universal_kb(self, query: str, top_k: int) -> list[RetrievalResult]:
        collection = self._get_universal_collection()
        if collection is None or collection.count() == 0:
            return []
        engine = RetrievalEngine(collection)
        return engine.hybrid_search(query, top_k=top_k)

    def _deduplicate(self, results: list[RetrievalResult]) -> list[RetrievalResult]:
        seen_content: set[str] = set()
        unique: list[RetrievalResult] = []
        for r in results:
            # Use first 100 chars as dedup key
            key = r.content[:100].strip().lower()
            if key not in seen_content:
                seen_content.add(key)
                unique.append(r)
        return unique

    def _build_context(self, results: list[RetrievalResult], max_chars: int = 8000) -> str:
        parts: list[str] = []
        total = 0
        for r in results:
            source = r.metadata.get("source_file") or r.document_id or "unknown"
            snippet = f"[Source: {source} | Score: {r.final_score:.2f}]\n{r.content}"
            if total + len(snippet) > max_chars:
                break
            parts.append(snippet)
            total += len(snippet)
        return "\n\n---\n\n".join(parts)

    def search(
        self,
        user_id: str,
        query: str,
        top_k: int | None = None,
        client_weight: float = 0.6,
    ) -> DualRagResult:
        top_k = top_k or settings.retrieval_top_k

        # Client-first: search user's own documents
        client_results = self._client_rag.search(user_id, query, top_k=top_k, hybrid=True)

        # Augment with universal KB
        universal_results = self._search_universal_kb(query, top_k=top_k)

        # Boost client results
        for r in client_results:
            r.final_score = min(1.0, r.final_score * (1 + client_weight))

        # Merge and deduplicate
        merged = self._deduplicate(client_results + universal_results)
        merged.sort(key=lambda r: r.final_score, reverse=True)
        merged = merged[:top_k]

        # Build attribution map
        attribution: dict[str, list[str]] = {"client": [], "universal": []}
        client_ids = {r.chunk_id for r in client_results}
        for r in merged:
            key = "client" if r.chunk_id in client_ids else "universal"
            source = r.metadata.get("source_file") or r.document_id
            if source not in attribution[key]:
                attribution[key].append(source)

        context_text = self._build_context(merged)

        logger.info(
            "dual_rag_search",
            user_id=user_id,
            client_hits=len(client_results),
            universal_hits=len(universal_results),
            merged_hits=len(merged),
        )

        return DualRagResult(
            query=query,
            client_results=client_results,
            universal_results=universal_results,
            merged_results=merged,
            context_text=context_text,
            attribution=attribution,
        )


# Module-level singleton
_dual_rag: DualRagOrchestrator | None = None


def get_dual_rag() -> DualRagOrchestrator:
    global _dual_rag
    if _dual_rag is None:
        _dual_rag = DualRagOrchestrator()
    return _dual_rag
