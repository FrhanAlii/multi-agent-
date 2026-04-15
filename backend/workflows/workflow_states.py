from typing import Any, TypedDict, Annotated
import operator
from dataclasses import dataclass, field
from datetime import datetime


class AgentMessage(TypedDict):
    agent: str
    content: str
    timestamp: str
    confidence: float | None
    sources: list[str] | None


class WorkflowState(TypedDict):
    """LangGraph state passed between all agents in the workflow."""

    # Identity
    workflow_id: str
    user_id: str

    # Input
    document_ids: list[str]
    workflow_type: str
    initial_request: str

    # Agent outputs — accumulated across nodes
    messages: Annotated[list[AgentMessage], operator.add]

    # Intake analysis
    document_classification: dict[str, Any] | None
    required_processing_steps: list[str] | None

    # Extracted data
    extracted_data: dict[str, Any] | None
    extraction_confidence: float | None
    extraction_sources: list[dict[str, Any]] | None
    low_confidence_fields: list[str] | None

    # Process decision
    decision: dict[str, Any] | None
    decision_confidence: float | None
    decision_paths: list[dict[str, Any]] | None
    decision_sources: list[dict[str, Any]] | None
    requires_human_decision: bool | None

    # Compliance
    compliance_report: dict[str, Any] | None
    compliance_violations: list[dict[str, Any]] | None
    compliance_suggestions: list[str] | None
    is_compliant: bool | None
    requires_escalation: bool | None

    # Approval gate
    pending_approval_id: str | None
    approval_status: str | None
    approval_notes: str | None

    # Execution
    execution_plan: dict[str, Any] | None
    execution_result: dict[str, Any] | None
    execution_success: bool | None

    # Workflow control
    current_step: str
    next_step: str | None
    error: str | None
    should_stop: bool | None
    completed_steps: Annotated[list[str], operator.add]


# Valid workflow state transitions
VALID_TRANSITIONS: dict[str, list[str]] = {
    "pending": ["processing"],
    "processing": ["awaiting_approval", "executing", "failed"],
    "awaiting_approval": ["approved", "rejected", "failed"],
    "approved": ["executing"],
    "executing": ["completed", "failed"],
    "completed": [],
    "failed": [],
    "cancelled": [],
}


def can_transition(from_status: str, to_status: str) -> bool:
    return to_status in VALID_TRANSITIONS.get(from_status, [])


def build_agent_message(
    agent: str,
    content: str,
    confidence: float | None = None,
    sources: list[str] | None = None,
) -> AgentMessage:
    return AgentMessage(
        agent=agent,
        content=content,
        timestamp=datetime.utcnow().isoformat(),
        confidence=confidence,
        sources=sources,
    )
