from __future__ import annotations

from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from database import queries
from utils.logging_config import get_logger

logger = get_logger(__name__)


class AuditService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def get_logs(
        self,
        user_id: str,
        resource_type: str | None = None,
        resource_id: str | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[dict[str, Any]]:
        logs = await queries.list_audit_logs(
            self._db,
            user_id=user_id,
            resource_type=resource_type,
            resource_id=resource_id,
            limit=limit,
            offset=offset,
        )
        return [self._serialize(log) for log in logs]

    @staticmethod
    def _serialize(log) -> dict[str, Any]:
        return {
            "id": log.id,
            "action": log.action,
            "resource_type": log.resource_type,
            "resource_id": log.resource_id,
            "result": log.result,
            "created_date": log.created_date.isoformat() if log.created_date else None,
            "details": log.details,
            "ip_address": log.ip_address,
        }
