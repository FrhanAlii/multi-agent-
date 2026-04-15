from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

import chromadb
from chromadb import Collection

from rag.client_rag.embedding_service import get_embedding_service
from utils.config import settings
from utils.logging_config import get_logger

logger = get_logger(__name__)


@dataclass
class RetrievalResult:
    chunk_id: str
    content: str
    document_id: str
    semantic_section: str
    relevance_score: float
    importance_score: float
    final_score: float
    metadata: dict[str, Any] = field(default_factory=dict)


class RetrievalEngine:
    def __init__(self, collection: Collection, importance_weight: float = 0.2) -> None:
        self._collection = collection
        self._importance_weight = importance_weight
        self._embedding_service = get_embedding_service()

    def search(
        self,
        query: str,
        top_k: int | None = None,
        min_score: float | None = None,
        filters: dict[str, Any] | None = None,
    ) -> list[RetrievalResult]:
        top_k = top_k or settings.retrieval_top_k
        min_score = min_score if min_score is not None else settings.min_relevance_score

        query_embedding = self._embedding_service.embed_query(query)

        where = filters or None
        results = self._collection.query(
            query_embeddings=[query_embedding],
            n_results=min(top_k * 2, max(1, self._collection.count())),
            where=where,
            include=["documents", "metadatas", "distances"],
        )

        if not results["documents"] or not results["documents"][0]:
            return []

        retrieval_results: list[RetrievalResult] = []
        for doc, meta, dist, chunk_id in zip(
            results["documents"][0],
            results["metadatas"][0],
            results["distances"][0],
            results["ids"][0],
        ):
            # Chroma returns L2 distance; convert to cosine similarity
            relevance = max(0.0, 1.0 - dist / 2.0)
            importance = float(meta.get("importance_score", 0.5))
            final = (1 - self._importance_weight) * relevance + self._importance_weight * importance

            if final < min_score:
                continue

            retrieval_results.append(
                RetrievalResult(
                    chunk_id=chunk_id,
                    content=doc,
                    document_id=str(meta.get("document_id", "")),
                    semantic_section=str(meta.get("semantic_section", "")),
                    relevance_score=round(relevance, 4),
                    importance_score=round(importance, 4),
                    final_score=round(final, 4),
                    metadata=dict(meta),
                )
            )

        retrieval_results.sort(key=lambda r: r.final_score, reverse=True)
        return retrieval_results[:top_k]

    def hybrid_search(
        self,
        query: str,
        top_k: int | None = None,
        keyword_boost: float = 0.1,
    ) -> list[RetrievalResult]:
        top_k = top_k or settings.retrieval_top_k
        semantic_results = self.search(query, top_k=top_k * 2)

        query_terms = set(query.lower().split())
        for result in semantic_results:
            content_lower = result.content.lower()
            keyword_hits = sum(1 for term in query_terms if term in content_lower)
            keyword_score = min(1.0, keyword_hits / max(1, len(query_terms)))
            result.final_score = min(1.0, result.final_score + keyword_score * keyword_boost)

        semantic_results.sort(key=lambda r: r.final_score, reverse=True)
        return semantic_results[:top_k]
