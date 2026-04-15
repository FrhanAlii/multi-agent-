from __future__ import annotations

import hashlib
import shutil
import uuid
from pathlib import Path
from datetime import datetime, timezone

from utils.config import settings
from utils.logging_config import get_logger

logger = get_logger(__name__)

_BASE = Path(settings.document_storage_dir)


def _user_dir(user_id: str) -> Path:
    path = _BASE / user_id
    path.mkdir(parents=True, exist_ok=True)
    return path


def compute_hash(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()


def store_file(
    user_id: str,
    content: bytes,
    original_filename: str,
    file_extension: str,
) -> tuple[str, str]:
    """Store file and return (storage_path, file_hash)."""
    file_hash = compute_hash(content)
    safe_name = f"{uuid.uuid4().hex}.{file_extension}"
    dest = _user_dir(user_id) / safe_name

    dest.write_bytes(content)
    logger.info("file_stored", user_id=user_id, path=str(dest), size=len(content))
    return str(dest), file_hash


def read_file(storage_path: str) -> bytes:
    return Path(storage_path).read_bytes()


def delete_file(storage_path: str) -> bool:
    path = Path(storage_path)
    if path.exists():
        path.unlink()
        logger.info("file_deleted", path=storage_path)
        return True
    return False


def archive_file(storage_path: str, user_id: str) -> str:
    src = Path(storage_path)
    if not src.exists():
        return storage_path
    archive_dir = _BASE / user_id / "archive"
    archive_dir.mkdir(parents=True, exist_ok=True)
    dest = archive_dir / src.name
    shutil.move(str(src), str(dest))
    logger.info("file_archived", from_path=storage_path, to_path=str(dest))
    return str(dest)


def extract_text(content: bytes, file_type: str) -> str:
    """Extract raw text from document content based on file type."""
    if file_type == "txt":
        return content.decode("utf-8", errors="ignore")

    if file_type == "pdf":
        try:
            import pdfplumber
            import io
            with pdfplumber.open(io.BytesIO(content)) as pdf:
                return "\n".join(page.extract_text() or "" for page in pdf.pages)
        except ImportError:
            logger.warning("pdfplumber_not_installed")
            return content.decode("utf-8", errors="ignore")
        except Exception as e:
            logger.error("pdf_extraction_failed", error=str(e))
            return ""

    if file_type in ("docx", "doc"):
        try:
            import docx2txt
            import io
            return docx2txt.process(io.BytesIO(content))
        except ImportError:
            logger.warning("docx2txt_not_installed")
            return content.decode("utf-8", errors="ignore")
        except Exception as e:
            logger.error("docx_extraction_failed", error=str(e))
            return ""

    if file_type == "csv":
        return content.decode("utf-8", errors="ignore")

    if file_type == "json":
        import json
        try:
            data = json.loads(content.decode("utf-8", errors="ignore"))
            return json.dumps(data, indent=2)
        except Exception:
            return content.decode("utf-8", errors="ignore")

    if file_type == "xlsx":
        try:
            import openpyxl
            import io
            wb = openpyxl.load_workbook(io.BytesIO(content), data_only=True)
            lines: list[str] = []
            for sheet in wb.worksheets:
                lines.append(f"Sheet: {sheet.title}")
                for row in sheet.iter_rows(values_only=True):
                    lines.append("\t".join(str(c) if c is not None else "" for c in row))
            return "\n".join(lines)
        except ImportError:
            logger.warning("openpyxl_not_installed")
            return ""
        except Exception as e:
            logger.error("xlsx_extraction_failed", error=str(e))
            return ""

    return content.decode("utf-8", errors="ignore")
