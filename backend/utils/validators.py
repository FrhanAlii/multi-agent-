import re
from pathlib import Path
from fastapi import HTTPException, status
from utils.config import settings
from utils.constants import ERR_INVALID_FILE_TYPE, ERR_FILE_TOO_LARGE


def validate_file_extension(filename: str) -> str:
    ext = Path(filename).suffix.lstrip(".").lower()
    if ext not in settings.allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"{ERR_INVALID_FILE_TYPE}: .{ext}. Allowed: {', '.join(settings.allowed_extensions)}",
        )
    return ext


def validate_file_size(size_bytes: int) -> None:
    max_bytes = settings.max_file_size_mb * 1024 * 1024
    if size_bytes > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"{ERR_FILE_TOO_LARGE}: {size_bytes / 1_048_576:.1f} MB > {settings.max_file_size_mb} MB",
        )


def validate_user_owns_resource(resource_user_id: str, current_user_id: str) -> None:
    if str(resource_user_id) != str(current_user_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden — resource belongs to another user",
        )


def sanitize_filename(filename: str) -> str:
    name = Path(filename).stem
    ext = Path(filename).suffix
    safe_name = re.sub(r"[^\w\-_.]", "_", name)
    return f"{safe_name}{ext}"


def validate_uuid(value: str, field_name: str = "id") -> str:
    uuid_pattern = re.compile(
        r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
        re.IGNORECASE,
    )
    if not uuid_pattern.match(value):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid {field_name} format",
        )
    return value


def validate_non_empty_string(value: str, field_name: str = "field") -> str:
    if not value or not value.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{field_name} must not be empty",
        )
    return value.strip()
