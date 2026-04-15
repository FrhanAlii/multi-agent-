"""Tests for document upload, validation, and processing flow."""
from __future__ import annotations

import pytest
from unittest.mock import AsyncMock, MagicMock, patch


def test_validate_file_extension_allowed():
    from utils.validators import validate_file_extension
    assert validate_file_extension("report.pdf") == "pdf"
    assert validate_file_extension("data.csv") == "csv"
    assert validate_file_extension("Document.DOCX") == "docx"


def test_validate_file_extension_blocked():
    from fastapi import HTTPException
    from utils.validators import validate_file_extension
    with pytest.raises(HTTPException) as exc:
        validate_file_extension("malware.exe")
    assert exc.value.status_code == 415


def test_validate_file_size_ok():
    from utils.validators import validate_file_size
    validate_file_size(1024 * 1024)  # 1 MB — should not raise


def test_validate_file_size_too_large():
    from fastapi import HTTPException
    from utils.validators import validate_file_size
    with pytest.raises(HTTPException) as exc:
        validate_file_size(200 * 1024 * 1024)  # 200 MB
    assert exc.value.status_code == 413


def test_validate_user_owns_resource_passes():
    from utils.validators import validate_user_owns_resource
    validate_user_owns_resource("user-123", "user-123")  # Should not raise


def test_validate_user_owns_resource_fails():
    from fastapi import HTTPException
    from utils.validators import validate_user_owns_resource
    with pytest.raises(HTTPException) as exc:
        validate_user_owns_resource("user-456", "user-123")
    assert exc.value.status_code == 403


def test_sanitize_filename():
    from utils.validators import sanitize_filename
    result = sanitize_filename("../../../etc/passwd.txt")
    assert ".." not in result
    assert result.endswith(".txt")


@pytest.mark.asyncio
async def test_upload_processor_rejects_empty_file():
    from document_handling.upload_processor import process_upload

    result = await process_upload(
        content=b"",
        filename="empty.txt",
        file_extension="txt",
        user_id="user-001",
    )
    assert result.success is False
    assert any("empty" in e.lower() for e in result.errors)


@pytest.mark.asyncio
async def test_upload_processor_rejects_duplicate():
    from document_handling.upload_processor import process_upload

    content = b"Hello world, this is test content for duplicate detection."
    import hashlib
    file_hash = hashlib.sha256(content).hexdigest()

    existing = [{"id": "existing-doc", "file_hash": file_hash, "text_sample": ""}]

    with patch("document_handling.upload_processor.validate_document") as mock_val, \
         patch("document_handling.upload_processor.extract_text", return_value="Hello world"), \
         patch("document_handling.upload_processor.score_document") as mock_score:
        mock_val.return_value = MagicMock(is_valid=True, issues=[], warnings=[])
        mock_score.return_value = MagicMock(score=80, grade="good", requires_human_review=False)

        result = await process_upload(
            content=content,
            filename="test.txt",
            file_extension="txt",
            user_id="user-001",
            existing_documents=existing,
        )

    assert result.success is False
    assert result.deduplication.is_duplicate is True


def test_storage_manager_hash():
    from document_handling.storage_manager import compute_hash
    content = b"test content"
    h = compute_hash(content)
    assert len(h) == 64  # SHA-256 hex


def test_extract_text_from_txt():
    from document_handling.storage_manager import extract_text
    content = b"Hello, this is a test document."
    result = extract_text(content, "txt")
    assert "Hello" in result
