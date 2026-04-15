from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from database.queries import create_audit_log
from utils.constants import AuditAction
from utils.logging_config import get_logger

logger = get_logger(__name__)


class AuditLogger:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def log(
        self,
        action: str | AuditAction,
        user_id: str | None = None,
        resource_type: str | None = None,
        resource_id: str | None = None,
        result: str = "success",
        details: dict[str, Any] | None = None,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> None:
        try:
            await create_audit_log(
                self._db,
                user_id=user_id,
                action=action.value if isinstance(action, AuditAction) else action,
                resource_type=resource_type,
                resource_id=resource_id,
                result=result,
                details=details,
                ip_address=ip_address,
                user_agent=user_agent,
                created_date=datetime.now(timezone.utc),
            )
            logger.info(
                "audit_logged",
                action=str(action),
                user_id=user_id,
                resource_id=resource_id,
                result=result,
            )
        except Exception as e:
            # Never let audit failures break the main flow
            logger.error("audit_log_failed", error=str(e), action=str(action))

    async def log_document_upload(self, user_id: str, document_id: str, filename: str, ip: str | None = None) -> None:
        await self.log(
            AuditAction.DOCUMENT_UPLOAD,
            user_id=user_id,
            resource_type="document",
            resource_id=document_id,
            details={"filename": filename},
            ip_address=ip,
        )

    async def log_workflow_start(self, user_id: str, workflow_id: str, workflow_type: str) -> None:
        await self.log(
            AuditAction.WORKFLOW_START,
            user_id=user_id,
            resource_type="workflow",
            resource_id=workflow_id,
            details={"workflow_type": workflow_type},
        )

    async def log_workflow_complete(self, user_id: str, workflow_id: str, result_summary: str) -> None:
        await self.log(
            AuditAction.WORKFLOW_COMPLETE,
            user_id=user_id,
            resource_type="workflow",
            resource_id=workflow_id,
            details={"result_summary": result_summary},
        )

    async def log_approval_request(
        self, user_id: str, approval_id: str, approval_type: str, workflow_id: str
    ) -> None:
        await self.log(
            AuditAction.APPROVAL_REQUEST,
            user_id=user_id,
            resource_type="approval",
            resource_id=approval_id,
            details={"approval_type": approval_type, "workflow_id": workflow_id},
        )

    async def log_approval_decision(
        self, user_id: str, approval_id: str, decision: str, notes: str | None
    ) -> None:
        action = AuditAction.APPROVAL_GRANTED if decision == "approved" else AuditAction.APPROVAL_REJECTED
        await self.log(
            action,
            user_id=user_id,
            resource_type="approval",
            resource_id=approval_id,
            details={"decision": decision, "notes": notes},
        )

    async def log_agent_decision(
        self, user_id: str, workflow_id: str, agent: str, decision: str, confidence: float
    ) -> None:
        await self.log(
            AuditAction.AGENT_DECISION,
            user_id=user_id,
            resource_type="workflow",
            resource_id=workflow_id,
            details={"agent": agent, "decision": decision, "confidence": confidence},
        )
