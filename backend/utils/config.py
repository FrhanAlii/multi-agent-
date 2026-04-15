import os
from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # API
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    debug: bool = False

    # JWT
    jwt_secret_key: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24  # 24 hours

    # Database
    database_url: str = "postgresql+asyncpg://user:password@localhost:5432/outreachai"
    database_pool_size: int = 10
    database_max_overflow: int = 20

    # LLM
    openai_api_key: str = ""
    llm_model: str = "gpt-4o-mini"
    llm_temperature: float = 0.1
    llm_max_tokens: int = 4096

    # Embeddings
    embedding_model: str = "all-MiniLM-L6-v2"
    embedding_batch_size: int = 32

    # Chroma
    chroma_persist_dir: str = "./rag/universal_kb/chroma_db"
    chroma_client_base_dir: str = "./rag/client_chroma"
    universal_kb_collection: str = "universal_business_process_kb"

    # Document storage
    document_storage_dir: str = "./storage/documents"
    max_file_size_mb: int = 50
    allowed_extensions: list[str] = ["pdf", "docx", "doc", "txt", "csv", "json", "xlsx"]

    # RAG
    retrieval_top_k: int = 5
    chunk_size: int = 512
    chunk_overlap: int = 50
    min_relevance_score: float = 0.3

    # Workflow
    approval_timeout_hours: int = 48
    max_retry_attempts: int = 3

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
