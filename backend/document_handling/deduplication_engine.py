from __future__ import annotations

from dataclasses import dataclass
from difflib import SequenceMatcher

from utils.logging_config import get_logger

logger = get_logger(__name__)


@dataclass
class DuplicationResult:
    is_duplicate: bool
    duplicate_document_id: str | None
    similarity_score: float
    match_type: str   # "exact" | "near_duplicate" | "unique"
    recommendation: str


def check_exact_duplicate(file_hash: str, existing_hash: str) -> bool:
    return file_hash == existing_hash


def compute_text_similarity(text_a: str, text_b: str) -> float:
    """Compute similarity ratio between two documents (0-1)."""
    if not text_a or not text_b:
        return 0.0
    # Use SequenceMatcher on truncated text for performance
    a = text_a[:5000]
    b = text_b[:5000]
    return SequenceMatcher(None, a, b).ratio()


def check_for_duplicates(
    file_hash: str,
    text_content: str,
    existing_documents: list[dict],  # [{"id": ..., "file_hash": ..., "text_sample": ...}]
    similarity_threshold: float = 0.85,
) -> DuplicationResult:
    for doc in existing_documents:
        # Exact hash match
        if doc.get("file_hash") == file_hash:
            logger.info("exact_duplicate_found", duplicate_id=doc["id"])
            return DuplicationResult(
                is_duplicate=True,
                duplicate_document_id=doc["id"],
                similarity_score=1.0,
                match_type="exact",
                recommendation=f"Exact duplicate of document {doc['id']}. Upload rejected.",
            )

    # Near-duplicate content check
    for doc in existing_documents:
        text_sample = doc.get("text_sample", "")
        if not text_sample:
            continue
        score = compute_text_similarity(text_content, text_sample)
        if score >= similarity_threshold:
            logger.info("near_duplicate_found", duplicate_id=doc["id"], score=score)
            return DuplicationResult(
                is_duplicate=True,
                duplicate_document_id=doc["id"],
                similarity_score=round(score, 3),
                match_type="near_duplicate",
                recommendation=(
                    f"Document is {score*100:.0f}% similar to existing document {doc['id']}. "
                    "Consider updating the existing document instead of uploading a new one."
                ),
            )

    return DuplicationResult(
        is_duplicate=False,
        duplicate_document_id=None,
        similarity_score=0.0,
        match_type="unique",
        recommendation="Document is unique.",
    )
