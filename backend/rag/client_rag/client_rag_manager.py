from __future__ import annotations

import hashlib
from pathlib import Path
from typing import Any

import chromadb
from chromadb import Collection, PersistentClient

from rag.client_rag.chunking_engine import Chunk
from rag.client_rag.embedding_service import get_embedding_service
from rag.client_rag.retrieval_engine import RetrievalEngine, RetrievalResult
from utils.config import settings
from utils.logging_config import get_logger

logger = get_logger(__name__)


def _collection_name(user_id: str) -> str:
    return f"client_{user_id}_documents"


class ClientRagManager:
    def __init__(self) -> None:
        self._base_dir = Path(settings.chroma_client_base_dir)
        self._base_dir.mkdir(parents=True, exist_ok=True)
        self._clients: dict[str, PersistentClient] = {}
        self._embedding_service = get_embedding_service()

    def _get_client(self, user_id: str) -> PersistentClient:
        if user_id not in self._clients:
            user_dir = self._base_dir / user_id
            user_dir.mkdir(parents=True, exist_ok=True)
            self._clients[user_id] = chromadb.PersistentClient(path=str(user_dir))
        return self._clients[user_id]

    def _get_collection(self, user_id: str) -> Collection:
        client = self._get_client(user_id)
        return client.get_or_create_collection(
            name=_collection_name(user_id),
            metadata={"hnsw:space": "cosine"},
        )

    def add_chunks(self, user_id: str, chunks: list[Chunk]) -> int:
        if not chunks:
            return 0

        collection = self._get_collection(user_id)
        texts = [c.content for c in chunks]
        embeddings = self._embedding_service.embed_texts(texts)

        ids: list[str] = []
        metadatas: list[dict[str, Any]] = []
        for chunk in chunks:
            chunk_id = hashlib.sha256(
                f"{chunk.metadata.get('document_id', '')}_{chunk.chunk_number}".encode()
            ).hexdigest()[:32]
            ids.append(chunk_id)
            metadatas.append({
                "document_id": chunk.metadata.get("document_id", ""),
                "source_file": chunk.metadata.get("source_file", ""),
                "chunk_number": chunk.chunk_number,
                "semantic_section": chunk.semantic_section,
                "chunk_type": chunk.chunk_type,
                "importance_score": chunk.importance_score,
                "tokens": chunk.tokens,
            })

        collection.upsert(ids=ids, documents=texts, embeddings=embeddings, metadatas=metadatas)
        logger.info("chunks_added_to_client_rag", user_id=user_id, count=len(chunks))
        return len(chunks)

    def delete_document_chunks(self, user_id: str, document_id: str) -> None:
        collection = self._get_collection(user_id)
        collection.delete(where={"document_id": document_id})
        logger.info("chunks_deleted_from_client_rag", user_id=user_id, document_id=document_id)

    def search(
        self,
        user_id: str,
        query: str,
        top_k: int | None = None,
        hybrid: bool = True,
    ) -> list[RetrievalResult]:
        collection = self._get_collection(user_id)
        engine = RetrievalEngine(collection)
        if hybrid:
            return engine.hybrid_search(query, top_k=top_k)
        return engine.search(query, top_k=top_k)

    def get_document_count(self, user_id: str) -> int:
        try:
            collection = self._get_collection(user_id)
            return collection.count()
        except Exception:
            return 0

    def delete_user_collection(self, user_id: str) -> None:
        client = self._get_client(user_id)
        try:
            client.delete_collection(_collection_name(user_id))
            logger.info("client_collection_deleted", user_id=user_id)
        except Exception as e:
            logger.warning("collection_delete_failed", user_id=user_id, error=str(e))


# Module-level singleton
_client_rag_manager: ClientRagManager | None = None


def get_client_rag_manager() -> ClientRagManager:
    global _client_rag_manager
    if _client_rag_manager is None:
        _client_rag_manager = ClientRagManager()
    return _client_rag_manager
