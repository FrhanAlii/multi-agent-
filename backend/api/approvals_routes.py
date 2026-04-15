from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from api.deps import get_current_user_id, get_db
from services.approval_service import ApprovalService
from services.workflow_service import WorkflowService
from utils.constants import ERR_NOT_FOUND

router = APIRouter(prefix="/api/approvals", tags=["Approvals"])


class DecisionRequest(BaseModel):
    notes: str | None = None


@router.get("/pending")
async def get_pending_approvals(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    service = ApprovalService(db)
    return await service.get_pending_approvals(user_id)


@router.get("/history")
async def get_approval_history(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    service = ApprovalService(db)
    return await service.get_approval_history(user_id, limit=limit, offset=offset)


@router.get("/{approval_id}")
async def get_approval(
    approval_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    service = ApprovalService(db)
    approval = await service.get_approval(approval_id, user_id)
    if not approval:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=ERR_NOT_FOUND)
    return approval


@router.post("/{approval_id}/approve")
async def approve(
    approval_id: str,
    body: DecisionRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    service = ApprovalService(db)
    try:
        approval = await service.approve(approval_id, user_id, notes=body.notes)
        # Resume the associated workflow
        wf_service = WorkflowService(db)
        workflow_result = await wf_service.resume_after_approval(
            workflow_id=approval["workflow_id"],
            user_id=user_id,
            approval_status="approved",
            notes=body.notes,
        )
        return {"approval": approval, "workflow": workflow_result}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/{approval_id}/reject")
async def reject(
    approval_id: str,
    body: DecisionRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    service = ApprovalService(db)
    try:
        approval = await service.reject(approval_id, user_id, notes=body.notes)
        wf_service = WorkflowService(db)
        await wf_service.resume_after_approval(
            workflow_id=approval["workflow_id"],
            user_id=user_id,
            approval_status="rejected",
            notes=body.notes,
        )
        return {"approval": approval}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/{approval_id}/execute")
async def execute_approved_action(
    approval_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Manually trigger execution for an already-approved action."""
    service = ApprovalService(db)
    approval = await service.get_approval(approval_id, user_id)
    if not approval:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=ERR_NOT_FOUND)
    if approval["status"] != "approved":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Approval is not in approved status")

    wf_service = WorkflowService(db)
    return await wf_service.resume_after_approval(
        workflow_id=approval["workflow_id"],
        user_id=user_id,
        approval_status="approved",
        notes=None,
    )
