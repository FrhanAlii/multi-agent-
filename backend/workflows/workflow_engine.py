from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from database import queries
from utils.constants import WorkflowStatus
from utils.logging_config import get_logger
from workflows.workflow_states import WorkflowState, can_transition

logger = get_logger(__name__)


class WorkflowEngine:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def create_workflow(
        self,
        user_id: str,
        workflow_type: str,
        document_ids: list[str],
    ) -> dict[str, Any]:
        workflow = await queries.create_workflow(
            self._db,
            user_id=user_id,
            workflow_type=workflow_type,
            status=WorkflowStatus.PENDING.value,
            document_ids=document_ids,
        )
        logger.info("workflow_created", workflow_id=workflow.id, user_id=user_id)
        return self._serialize(workflow)

    async def transition(
        self,
        workflow_id: str,
        user_id: str,
        to_status: str,
        agent_state: dict[str, Any] | None = None,
        result: dict[str, Any] | None = None,
        error: str | None = None,
    ) -> dict[str, Any]:
        workflow = await queries.get_workflow(self._db, workflow_id, user_id)
        if not workflow:
            raise ValueError(f"Workflow {workflow_id} not found")

        if not can_transition(workflow.status, to_status):
            raise ValueError(
                f"Cannot transition workflow from '{workflow.status}' to '{to_status}'"
            )

        updates: dict[str, Any] = {"status": to_status}
        if agent_state is not None:
            updates["agent_state"] = agent_state
        if result is not None:
            updates["result"] = result
        if error is not None:
            updates["error_message"] = error
        if to_status in (WorkflowStatus.COMPLETED.value, WorkflowStatus.FAILED.value):
            updates["completed_date"] = datetime.now(timezone.utc)

        updated = await queries.update_workflow(self._db, workflow_id, user_id, **updates)
        logger.info("workflow_transitioned", workflow_id=workflow_id, to=to_status)
        return self._serialize(updated)

    async def get_status(self, workflow_id: str, user_id: str) -> dict[str, Any]:
        workflow = await queries.get_workflow(self._db, workflow_id, user_id)
        if not workflow:
            raise ValueError(f"Workflow {workflow_id} not found")
        return self._serialize(workflow)

    async def list_workflows(
        self,
        user_id: str,
        status: str | None = None,
        limit: int = 20,
        offset: int = 0,
    ) -> list[dict[str, Any]]:
        workflows = await queries.list_workflows(self._db, user_id, status=status, limit=limit, offset=offset)
        return [self._serialize(w) for w in workflows]

    @staticmethod
    def _serialize(workflow) -> dict[str, Any]:
        if workflow is None:
            return {}
        return {
            "id": workflow.id,
            "user_id": workflow.user_id,
            "workflow_type": workflow.workflow_type,
            "status": workflow.status,
            "document_ids": workflow.document_ids,
            "created_date": workflow.created_date.isoformat() if workflow.created_date else None,
            "updated_date": workflow.updated_date.isoformat() if workflow.updated_date else None,
            "completed_date": workflow.completed_date.isoformat() if workflow.completed_date else None,
            "result": workflow.result,
            "error_message": workflow.error_message,
        }
