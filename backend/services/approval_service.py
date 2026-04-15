from __future__ import annotations

from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from database import queries
from utils.constants import ApprovalStatus
from utils.logging_config import get_logger
from workflows.approval_manager import ApprovalManager
from workflows.audit_logger import AuditLogger

logger = get_logger(__name__)


class ApprovalService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db
        self._manager = ApprovalManager(db)
        self._audit = AuditLogger(db)

    async def create_approval(
        self,
        user_id: str,
        workflow_id: str,
        approval_type: str,
        decision_context: dict[str, Any],
        notes: str | None = None,
    ) -> dict[str, Any]:
        approval = await self._manager.create_approval_request(
            user_id=user_id,
            workflow_id=workflow_id,
            approval_type=approval_type,
            decision_context=decision_context,
            notes=notes,
        )
        await self._audit.log_approval_request(
            user_id, approval["id"], approval_type, workflow_id
        )
        return approval

    async def get_pending_approvals(self, user_id: str) -> list[dict[str, Any]]:
        return await self._manager.get_pending_approvals(user_id)

    async def get_approval(self, approval_id: str, user_id: str) -> dict[str, Any] | None:
        approval = await queries.get_approval(self._db, approval_id, user_id)
        if not approval:
            return None
        return ApprovalManager._serialize(approval)

    async def approve(
        self, approval_id: str, user_id: str, notes: str | None = None
    ) -> dict[str, Any]:
        result = await self._manager.process_decision(
            approval_id=approval_id,
            user_id=user_id,
            decision="approved",
            notes=notes,
        )
        await self._audit.log_approval_decision(user_id, approval_id, "approved", notes)
        return result

    async def reject(
        self, approval_id: str, user_id: str, notes: str | None = None
    ) -> dict[str, Any]:
        result = await self._manager.process_decision(
            approval_id=approval_id,
            user_id=user_id,
            decision="rejected",
            notes=notes,
        )
        await self._audit.log_approval_decision(user_id, approval_id, "rejected", notes)
        return result

    async def get_approval_history(
        self, user_id: str, limit: int = 50, offset: int = 0
    ) -> list[dict[str, Any]]:
        from sqlalchemy import select
        from database.models import Approval
        result = await self._db.execute(
            select(Approval)
            .where(Approval.user_id == user_id)
            .order_by(Approval.requested_date.desc())
            .limit(limit)
            .offset(offset)
        )
        return [ApprovalManager._serialize(a) for a in result.scalars().all()]
