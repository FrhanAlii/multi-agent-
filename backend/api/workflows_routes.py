from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from api.deps import get_current_user_id, get_db
from services.workflow_service import WorkflowService
from utils.constants import ERR_NOT_FOUND

router = APIRouter(prefix="/api/workflows", tags=["Workflows"])


class StartWorkflowRequest(BaseModel):
    document_ids: list[str]
    workflow_type: str
    initial_request: str = ""


class CreateWorkflowRequest(BaseModel):
    document_ids: list[str]
    workflow_type: str


class SubmitWorkflowRequest(BaseModel):
    initial_request: str = ""


@router.post("/start", status_code=status.HTTP_201_CREATED)
async def start_workflow(
    body: StartWorkflowRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Create a workflow and immediately run the full agent pipeline."""
    service = WorkflowService(db)
    try:
        return await service.start_workflow(
            user_id=user_id,
            document_ids=body.document_ids,
            workflow_type=body.workflow_type,
            initial_request=body.initial_request,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# NOTE: /list must be registered before /{workflow_id} to prevent path shadowing.
@router.get("/list")
async def list_workflows(
    wf_status: str | None = Query(None, alias="status"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    service = WorkflowService(db)
    return await service.list_workflows(user_id, status=wf_status, limit=limit, offset=offset)


@router.get("/{workflow_id}/history")
async def get_workflow_history(
    workflow_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    from services.audit_service import AuditService
    service = AuditService(db)
    return await service.get_logs(user_id, resource_type="workflow", resource_id=workflow_id)


@router.post("/{workflow_id}/submit")
async def submit_workflow(
    workflow_id: str,
    body: SubmitWorkflowRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Submit a pending workflow for multi-agent processing.
    Useful for 2-step flows: create workflow first, then submit when ready.
    """
    service = WorkflowService(db)
    try:
        return await service.submit_workflow(
            workflow_id=workflow_id,
            user_id=user_id,
            initial_request=body.initial_request,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/{workflow_id}")
async def get_workflow(
    workflow_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    service = WorkflowService(db)
    wf = await service.get_workflow(workflow_id, user_id)
    if not wf:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=ERR_NOT_FOUND)
    return wf
