from __future__ import annotations

from datetime import datetime, timezone, timedelta
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from database import queries
from utils.config import settings
from utils.constants import ApprovalStatus, ApprovalType, ERR_APPROVAL_NOT_FOUND, ERR_APPROVAL_ALREADY_RESOLVED, ERR_APPROVAL_EXPIRED
from utils.logging_config import get_logger

logger = get_logger(__name__)


class ApprovalManager:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def create_approval_request(
        self,
        user_id: str,
        workflow_id: str,
        approval_type: str | ApprovalType,
        decision_context: dict[str, Any],
        notes: str | None = None,
    ) -> dict[str, Any]:
        expires_at = datetime.now(timezone.utc) + timedelta(hours=settings.approval_timeout_hours)

        approval = await queries.create_approval(
            self._db,
            user_id=user_id,
            workflow_id=workflow_id,
            approval_type=approval_type.value if isinstance(approval_type, ApprovalType) else approval_type,
            status=ApprovalStatus.PENDING.value,
            expires_at=expires_at,
            decision_context=decision_context,
            notes=notes,
        )

        logger.info(
            "approval_request_created",
            approval_id=approval.id,
            user_id=user_id,
            workflow_id=workflow_id,
            approval_type=str(approval_type),
        )

        return self._serialize(approval)

    async def get_pending_approvals(self, user_id: str) -> list[dict[str, Any]]:
        approvals = await queries.list_pending_approvals(self._db, user_id)
        # Mark expired ones
        now = datetime.now(timezone.utc)
        results = []
        for approval in approvals:
            if approval.expires_at and approval.expires_at < now:
                await queries.update_approval(
                    self._db, approval.id, user_id, status=ApprovalStatus.EXPIRED.value
                )
                continue
            results.append(self._serialize(approval))
        return results

    async def process_decision(
        self,
        approval_id: str,
        user_id: str,
        decision: str,  # "approved" | "rejected"
        notes: str | None = None,
    ) -> dict[str, Any]:
        approval = await queries.get_approval(self._db, approval_id, user_id)
        if not approval:
            raise ValueError(ERR_APPROVAL_NOT_FOUND)

        if approval.status != ApprovalStatus.PENDING.value:
            raise ValueError(ERR_APPROVAL_ALREADY_RESOLVED)

        now = datetime.now(timezone.utc)
        if approval.expires_at and approval.expires_at < now:
            await queries.update_approval(
                self._db, approval_id, user_id, status=ApprovalStatus.EXPIRED.value
            )
            raise ValueError(ERR_APPROVAL_EXPIRED)

        new_status = ApprovalStatus.APPROVED.value if decision == "approved" else ApprovalStatus.REJECTED.value

        updated = await queries.update_approval(
            self._db,
            approval_id,
            user_id,
            status=new_status,
            approved_by=user_id,
            approved_date=now,
            notes=notes,
        )

        logger.info(
            "approval_decision_processed",
            approval_id=approval_id,
            decision=decision,
            user_id=user_id,
        )

        return self._serialize(updated)

    @staticmethod
    def _serialize(approval) -> dict[str, Any]:
        if approval is None:
            return {}
        return {
            "id": approval.id,
            "user_id": approval.user_id,
            "workflow_id": approval.workflow_id,
            "approval_type": approval.approval_type,
            "status": approval.status,
            "requested_date": approval.requested_date.isoformat() if approval.requested_date else None,
            "expires_at": approval.expires_at.isoformat() if approval.expires_at else None,
            "approved_by": approval.approved_by,
            "approved_date": approval.approved_date.isoformat() if approval.approved_date else None,
            "notes": approval.notes,
            "decision_context": approval.decision_context,
        }
