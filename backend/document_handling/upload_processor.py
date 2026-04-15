from __future__ import annotations

import asyncio
from dataclasses import dataclass
from typing import Any

from document_handling.document_validator import validate_document, ValidationReport
from document_handling.quality_scorer import score_document, QualityReport
from document_handling.storage_manager import store_file, extract_text, compute_hash
from document_handling.deduplication_engine import check_for_duplicates, DuplicationResult
from utils.logging_config import get_logger

logger = get_logger(__name__)


@dataclass
class UploadResult:
    success: bool
    storage_path: str | None
    file_hash: str | None
    file_type: str
    file_size: int
    extracted_text: str
    validation: ValidationReport | None
    quality: QualityReport | None
    deduplication: DuplicationResult | None
    errors: list[str]


async def process_upload(
    content: bytes,
    filename: str,
    file_extension: str,
    user_id: str,
    existing_documents: list[dict[str, Any]] | None = None,
) -> UploadResult:
    errors: list[str] = []
    existing_documents = existing_documents or []

    # Step 1: Validate
    validation = validate_document(content, filename, file_extension)
    if not validation.is_valid:
        return UploadResult(
            success=False,
            storage_path=None,
            file_hash=None,
            file_type=file_extension,
            file_size=len(content),
            extracted_text="",
            validation=validation,
            quality=None,
            deduplication=None,
            errors=validation.issues,
        )

    # Step 2: Extract text
    loop = asyncio.get_event_loop()
    extracted_text = await loop.run_in_executor(
        None, extract_text, content, file_extension
    )

    # Step 3: Quality scoring
    quality = score_document(extracted_text, file_extension, len(content))
    if quality.score == 0:
        errors.append("Document quality score is 0 — no usable content found")

    # Step 4: Deduplication
    file_hash = compute_hash(content)
    deduplication = check_for_duplicates(
        file_hash=file_hash,
        text_content=extracted_text,
        existing_documents=existing_documents,
    )
    if deduplication.is_duplicate:
        return UploadResult(
            success=False,
            storage_path=None,
            file_hash=file_hash,
            file_type=file_extension,
            file_size=len(content),
            extracted_text=extracted_text,
            validation=validation,
            quality=quality,
            deduplication=deduplication,
            errors=[deduplication.recommendation],
        )

    # Step 5: Store file
    storage_path, _ = await loop.run_in_executor(
        None, store_file, user_id, content, filename, file_extension
    )

    logger.info(
        "upload_processed",
        user_id=user_id,
        filename=filename,
        quality_score=quality.score,
        storage_path=storage_path,
    )

    return UploadResult(
        success=True,
        storage_path=storage_path,
        file_hash=file_hash,
        file_type=file_extension,
        file_size=len(content),
        extracted_text=extracted_text,
        validation=validation,
        quality=quality,
        deduplication=deduplication,
        errors=errors,
    )
