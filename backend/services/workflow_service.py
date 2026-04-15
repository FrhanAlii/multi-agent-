from __future__ import annotations

from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from agents.orchestrator import run_workflow, resume_workflow
from database import queries
from utils.constants import WorkflowStatus, WorkflowType
from utils.logging_config import get_logger
from workflows.audit_logger import AuditLogger
from workflows.workflow_engine import WorkflowEngine
from workflows.workflow_states import WorkflowState

logger = get_logger(__name__)


class WorkflowService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db
        self._engine = WorkflowEngine(db)
        self._audit = AuditLogger(db)

    async def start_workflow(
        self,
        user_id: str,
        document_ids: list[str],
        workflow_type: str,
        initial_request: str = "",
    ) -> dict[str, Any]:
        # Validate documents belong to user
        for doc_id in document_ids:
            doc = await queries.get_document(self._db, doc_id, user_id)
            if not doc:
                raise ValueError(f"Document {doc_id} not found")

        # Create workflow record
        workflow = await self._engine.create_workflow(
            user_id=user_id,
            workflow_type=workflow_type,
            document_ids=document_ids,
        )
        workflow_id = workflow["id"]

        await self._audit.log_workflow_start(user_id, workflow_id, workflow_type)

        # Build initial LangGraph state
        initial_state: WorkflowState = {
            "workflow_id": workflow_id,
            "user_id": user_id,
            "document_ids": document_ids,
            "workflow_type": workflow_type,
            "initial_request": initial_request,
            "messages": [],
            "document_classification": None,
            "required_processing_steps": None,
            "extracted_data": None,
            "extraction_confidence": None,
            "extraction_sources": None,
            "low_confidence_fields": None,
            "decision": None,
            "decision_confidence": None,
            "decision_paths": None,
            "decision_sources": None,
            "requires_human_decision": None,
            "compliance_report": None,
            "compliance_violations": None,
            "compliance_suggestions": None,
            "is_compliant": None,
            "requires_escalation": None,
            "pending_approval_id": None,
            "approval_status": None,
            "approval_notes": None,
            "execution_plan": None,
            "execution_result": None,
            "execution_success": None,
            "current_step": "pending",
            "next_step": "document_intake",
            "error": None,
            "should_stop": None,
            "completed_steps": [],
        }

        # Transition to processing
        await self._engine.transition(workflow_id, user_id, WorkflowStatus.PROCESSING.value)

        try:
            final_state = await run_workflow(initial_state)

            # Determine final status
            if final_state.get("error"):
                await self._engine.transition(
                    workflow_id, user_id,
                    WorkflowStatus.FAILED.value,
                    error=final_state["error"],
                )
                await self._audit.log(
                    "workflow_fail", user_id=user_id,
                    resource_type="workflow", resource_id=workflow_id,
                    result="failure", details={"error": final_state["error"]},
                )
            elif final_state.get("current_step") == "await_approval":
                await self._engine.transition(
                    workflow_id, user_id,
                    WorkflowStatus.AWAITING_APPROVAL.value,
                    agent_state=final_state,
                )
            elif final_state.get("execution_success") is not None:
                status = WorkflowStatus.COMPLETED.value if final_state["execution_success"] else WorkflowStatus.FAILED.value
                await self._engine.transition(
                    workflow_id, user_id, status,
                    result=final_state.get("execution_result"),
                    agent_state=final_state,
                )
                if final_state["execution_success"]:
                    await self._audit.log_workflow_complete(
                        user_id, workflow_id,
                        f"Completed: {final_state.get('decision', {}).get('primary_decision', 'unknown')}"
                    )

            return {
                "workflow_id": workflow_id,
                "status": (await self._engine.get_status(workflow_id, user_id))["status"],
                "completed_steps": final_state.get("completed_steps", []),
                "requires_approval": final_state.get("current_step") == "await_approval",
                "messages": final_state.get("messages", []),
            }

        except Exception as e:
            logger.error("workflow_execution_error", workflow_id=workflow_id, error=str(e))
            await self._engine.transition(
                workflow_id, user_id, WorkflowStatus.FAILED.value, error=str(e)
            )
            return {"workflow_id": workflow_id, "status": "failed", "error": str(e)}

    async def resume_after_approval(
        self, workflow_id: str, user_id: str, approval_status: str, notes: str | None
    ) -> dict[str, Any]:
        await self._engine.transition(workflow_id, user_id, WorkflowStatus.EXECUTING.value)

        final_state = await resume_workflow(workflow_id, approval_status, notes)

        if final_state.get("execution_success"):
            await self._engine.transition(
                workflow_id, user_id, WorkflowStatus.COMPLETED.value,
                result=final_state.get("execution_result"),
            )
        else:
            await self._engine.transition(
                workflow_id, user_id, WorkflowStatus.FAILED.value,
                error=final_state.get("error"),
            )

        return {
            "workflow_id": workflow_id,
            "status": WorkflowStatus.COMPLETED.value if final_state.get("execution_success") else WorkflowStatus.FAILED.value,
            "execution_result": final_state.get("execution_result"),
        }

    async def create_workflow(
        self,
        user_id: str,
        document_ids: list[str],
        workflow_type: str,
    ) -> dict[str, Any]:
        """Create a workflow record without running it. Use submit_workflow to execute."""
        for doc_id in document_ids:
            doc = await queries.get_document(self._db, doc_id, user_id)
            if not doc:
                raise ValueError(f"Document {doc_id} not found")
        return await self._engine.create_workflow(
            user_id=user_id,
            workflow_type=workflow_type,
            document_ids=document_ids,
        )

    async def submit_workflow(
        self,
        workflow_id: str,
        user_id: str,
        initial_request: str = "",
    ) -> dict[str, Any]:
        """Submit a pending workflow for multi-agent processing."""
        wf = await self._engine.get_status(workflow_id, user_id)
        if not wf:
            raise ValueError(f"Workflow {workflow_id} not found")
        if wf["status"] != WorkflowStatus.PENDING.value:
            raise ValueError(
                f"Only pending workflows can be submitted (current status: {wf['status']})"
            )

        await self._audit.log_workflow_start(user_id, workflow_id, wf["workflow_type"])

        initial_state: WorkflowState = {
            "workflow_id": workflow_id,
            "user_id": user_id,
            "document_ids": wf.get("document_ids") or [],
            "workflow_type": wf["workflow_type"],
            "initial_request": initial_request,
            "messages": [],
            "document_classification": None,
            "required_processing_steps": None,
            "extracted_data": None,
            "extraction_confidence": None,
            "extraction_sources": None,
            "low_confidence_fields": None,
            "decision": None,
            "decision_confidence": None,
            "decision_paths": None,
            "decision_sources": None,
            "requires_human_decision": None,
            "compliance_report": None,
            "compliance_violations": None,
            "compliance_suggestions": None,
            "is_compliant": None,
            "requires_escalation": None,
            "pending_approval_id": None,
            "approval_status": None,
            "approval_notes": None,
            "execution_plan": None,
            "execution_result": None,
            "execution_success": None,
            "current_step": "pending",
            "next_step": "document_intake",
            "error": None,
            "should_stop": None,
            "completed_steps": [],
        }

        await self._engine.transition(workflow_id, user_id, WorkflowStatus.PROCESSING.value)

        try:
            final_state = await run_workflow(initial_state)

            if final_state.get("error"):
                await self._engine.transition(workflow_id, user_id, WorkflowStatus.FAILED.value, error=final_state["error"])
            elif final_state.get("current_step") == "await_approval":
                await self._engine.transition(workflow_id, user_id, WorkflowStatus.AWAITING_APPROVAL.value, agent_state=final_state)
            elif final_state.get("execution_success") is not None:
                new_status = WorkflowStatus.COMPLETED.value if final_state["execution_success"] else WorkflowStatus.FAILED.value
                await self._engine.transition(workflow_id, user_id, new_status, result=final_state.get("execution_result"), agent_state=final_state)
                if final_state["execution_success"]:
                    await self._audit.log_workflow_complete(user_id, workflow_id, "submitted and completed")

            return {
                "workflow_id": workflow_id,
                "status": (await self._engine.get_status(workflow_id, user_id))["status"],
                "completed_steps": final_state.get("completed_steps", []),
                "requires_approval": final_state.get("current_step") == "await_approval",
                "messages": final_state.get("messages", []),
            }
        except Exception as e:
            logger.error("workflow_submit_error", workflow_id=workflow_id, error=str(e))
            await self._engine.transition(workflow_id, user_id, WorkflowStatus.FAILED.value, error=str(e))
            return {"workflow_id": workflow_id, "status": "failed", "error": str(e)}

    async def get_workflow(self, workflow_id: str, user_id: str) -> dict[str, Any] | None:
        return await self._engine.get_status(workflow_id, user_id)

    async def list_workflows(
        self, user_id: str, status: str | None = None, limit: int = 20, offset: int = 0
    ) -> list[dict[str, Any]]:
        return await self._engine.list_workflows(user_id, status=status, limit=limit, offset=offset)
