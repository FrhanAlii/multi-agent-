from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from utils.config import settings
from utils.logging_config import get_logger

logger = get_logger(__name__)

# python-magic requires libmagic DLL on Windows.
# Fall back gracefully if it's not available.
try:
    import magic as _magic
    _MAGIC_AVAILABLE = True
except (ImportError, OSError):
    _MAGIC_AVAILABLE = False
    logger.warning("python_magic_unavailable", detail="MIME detection disabled — trusting file extensions")

MIME_TO_EXT: dict[str, str] = {
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/msword": "doc",
    "text/plain": "txt",
    "text/csv": "csv",
    "application/json": "json",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
}

# Magic bytes for quick header checks (no libmagic dependency)
MAGIC_BYTES: dict[str, bytes] = {
    "pdf": b"%PDF",
    "docx": b"PK\x03\x04",   # ZIP-based format
    "xlsx": b"PK\x03\x04",
}


def _detect_mime(content: bytes) -> str:
    if _MAGIC_AVAILABLE:
        try:
            return _magic.from_buffer(content[:2048], mime=True)
        except Exception:
            pass
    return "application/octet-stream"


@dataclass
class ValidationReport:
    is_valid: bool
    file_type: str
    mime_type: str
    file_size: int
    issues: list[str]
    warnings: list[str]


def validate_document(
    content: bytes,
    filename: str,
    declared_extension: str,
) -> ValidationReport:
    issues: list[str] = []
    warnings: list[str] = []

    file_size = len(content)

    # Size checks
    if file_size == 0:
        issues.append("File is empty")
    elif file_size > settings.max_file_size_mb * 1024 * 1024:
        issues.append(
            f"File size {file_size / 1_048_576:.1f} MB exceeds limit of {settings.max_file_size_mb} MB"
        )

    # Extension allowed?
    if declared_extension not in settings.allowed_extensions:
        issues.append(f"File type .{declared_extension} is not allowed")

    # MIME detection (optional)
    mime_type = _detect_mime(content)
    if mime_type != "application/octet-stream":
        detected_ext = MIME_TO_EXT.get(mime_type, declared_extension)
        if detected_ext != declared_extension:
            warnings.append(
                f"File extension .{declared_extension} does not match detected type {mime_type}"
            )

    # Magic-byte integrity checks (no libmagic needed)
    expected_bytes = MAGIC_BYTES.get(declared_extension)
    if expected_bytes and file_size >= len(expected_bytes):
        if not content[:len(expected_bytes)] == expected_bytes:
            # Warn rather than block — some tools produce valid files without standard headers
            warnings.append(
                f".{declared_extension} header bytes not detected — file may be non-standard"
            )

    # JSON syntax check
    if declared_extension == "json":
        try:
            import json
            json.loads(content.decode("utf-8", errors="ignore"))
        except Exception:
            issues.append("JSON file contains invalid JSON syntax")

    is_valid = len(issues) == 0
    logger.info(
        "document_validated",
        filename=filename,
        is_valid=is_valid,
        mime_type=mime_type,
        issues=issues,
    )
    return ValidationReport(
        is_valid=is_valid,
        file_type=declared_extension,
        mime_type=mime_type,
        file_size=file_size,
        issues=issues,
        warnings=warnings,
    )
