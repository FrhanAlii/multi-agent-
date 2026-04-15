"""Tests for workflow engine, approval manager, and audit logging."""
from __future__ import annotations

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timezone, timedelta


def test_can_transition_valid():
    from workflows.workflow_states import can_transition
    assert can_transition("pending", "processing") is True
    assert can_transition("processing", "awaiting_approval") is True
    assert can_transition("awaiting_approval", "approved") is True
    assert can_transition("approved", "executing") is True
    assert can_transition("executing", "completed") is True


def test_can_transition_invalid():
    from workflows.workflow_states import can_transition
    assert can_transition("completed", "processing") is False
    assert can_transition("pending", "executing") is False
    assert can_transition("failed", "completed") is False


def test_build_agent_message():
    from workflows.workflow_states import build_agent_message
    msg = build_agent_message("test_agent", "Decision made", confidence=0.9, sources=["doc1.pdf"])
    assert msg["agent"] == "test_agent"
    assert msg["content"] == "Decision made"
    assert msg["confidence"] == 0.9
    assert "doc1.pdf" in msg["sources"]
    assert "timestamp" in msg


@pytest.mark.asyncio
async def test_workflow_engine_creates_workflow():
    mock_db = AsyncMock()
    mock_workflow = MagicMock()
    mock_workflow.id = "wf-001"
    mock_workflow.user_id = "user-001"
    mock_workflow.workflow_type = "document_processing"
    mock_workflow.status = "pending"
    mock_workflow.document_ids = ["doc-001"]
    mock_workflow.created_date = datetime.now(timezone.utc)
    mock_workflow.updated_date = datetime.now(timezone.utc)
    mock_workflow.completed_date = None
    mock_workflow.result = None
    mock_workflow.error_message = None

    with patch("workflows.workflow_engine.queries") as mock_queries:
        mock_queries.create_workflow = AsyncMock(return_value=mock_workflow)
        mock_queries.get_workflow = AsyncMock(return_value=mock_workflow)

        from workflows.workflow_engine import WorkflowEngine
        engine = WorkflowEngine(mock_db)
        result = await engine.create_workflow("user-001", "document_processing", ["doc-001"])

    assert result["id"] == "wf-001"
    assert result["status"] == "pending"


@pytest.mark.asyncio
async def test_workflow_engine_rejects_invalid_transition():
    mock_db = AsyncMock()
    mock_workflow = MagicMock()
    mock_workflow.status = "completed"

    with patch("workflows.workflow_engine.queries") as mock_queries:
        mock_queries.get_workflow = AsyncMock(return_value=mock_workflow)

        from workflows.workflow_engine import WorkflowEngine
        engine = WorkflowEngine(mock_db)

        with pytest.raises(ValueError, match="Cannot transition"):
            await engine.transition("wf-001", "user-001", "processing")


@pytest.mark.asyncio
async def test_approval_manager_creates_approval():
    mock_db = AsyncMock()
    mock_approval = MagicMock()
    mock_approval.id = "approval-001"
    mock_approval.user_id = "user-001"
    mock_approval.workflow_id = "wf-001"
    mock_approval.approval_type = "process_decision"
    mock_approval.status = "pending"
    mock_approval.requested_date = datetime.now(timezone.utc)
    mock_approval.expires_at = datetime.now(timezone.utc) + timedelta(hours=48)
    mock_approval.approved_by = None
    mock_approval.approved_date = None
    mock_approval.notes = None
    mock_approval.decision_context = {"decision": "approve_invoice"}

    with patch("workflows.approval_manager.queries") as mock_queries:
        mock_queries.create_approval = AsyncMock(return_value=mock_approval)

        from workflows.approval_manager import ApprovalManager
        manager = ApprovalManager(mock_db)
        result = await manager.create_approval_request(
            user_id="user-001",
            workflow_id="wf-001",
            approval_type="process_decision",
            decision_context={"decision": "approve_invoice"},
        )

    assert result["id"] == "approval-001"
    assert result["status"] == "pending"


@pytest.mark.asyncio
async def test_approval_manager_rejects_already_resolved():
    mock_db = AsyncMock()
    mock_approval = MagicMock()
    mock_approval.status = "approved"

    with patch("workflows.approval_manager.queries") as mock_queries:
        mock_queries.get_approval = AsyncMock(return_value=mock_approval)

        from workflows.approval_manager import ApprovalManager
        from utils.constants import ERR_APPROVAL_ALREADY_RESOLVED
        manager = ApprovalManager(mock_db)

        with pytest.raises(ValueError, match=ERR_APPROVAL_ALREADY_RESOLVED):
            await manager.process_decision("approval-001", "user-001", "approved")


@pytest.mark.asyncio
async def test_audit_logger_does_not_raise_on_db_failure():
    """Audit failures must never break the main flow."""
    mock_db = AsyncMock()

    with patch("workflows.audit_logger.create_audit_log", side_effect=Exception("DB down")):
        from workflows.audit_logger import AuditLogger
        logger = AuditLogger(mock_db)
        # Should not raise
        await logger.log("test_action", user_id="user-001", resource_type="document")
