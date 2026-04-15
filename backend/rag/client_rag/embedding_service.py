from __future__ import annotations

import asyncio
from functools import lru_cache
from typing import Any

from sentence_transformers import SentenceTransformer
from utils.config import settings
from utils.logging_config import get_logger

logger = get_logger(__name__)


@lru_cache(maxsize=1)
def _load_model(model_name: str) -> SentenceTransformer:
    logger.info("loading_embedding_model", model=model_name)
    return SentenceTransformer(model_name)


class EmbeddingService:
    def __init__(self, model_name: str | None = None) -> None:
        self._model_name = model_name or settings.embedding_model
        self._batch_size = settings.embedding_batch_size
        self._model: SentenceTransformer | None = None

    def _get_model(self) -> SentenceTransformer:
        if self._model is None:
            self._model = _load_model(self._model_name)
        return self._model

    def embed_texts(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []
        model = self._get_model()
        embeddings = model.encode(
            texts,
            batch_size=self._batch_size,
            show_progress_bar=False,
            normalize_embeddings=True,
        )
        return [emb.tolist() for emb in embeddings]

    def embed_query(self, query: str) -> list[float]:
        return self.embed_texts([query])[0]

    async def embed_texts_async(self, texts: list[str]) -> list[list[float]]:
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self.embed_texts, texts)

    async def embed_query_async(self, query: str) -> list[float]:
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self.embed_query, query)

    def get_embedding_dimension(self) -> int:
        return self._get_model().get_sentence_embedding_dimension()


# Module-level singleton
_embedding_service: EmbeddingService | None = None


def get_embedding_service() -> EmbeddingService:
    global _embedding_service
    if _embedding_service is None:
        _embedding_service = EmbeddingService()
    return _embedding_service
