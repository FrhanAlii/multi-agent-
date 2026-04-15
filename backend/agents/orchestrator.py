from __future__ import annotations

from typing import Any, Literal

from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver

from agents.document_intake_agent import document_intake_node
from agents.data_extraction_agent import data_extraction_node
from agents.process_decision_agent import process_decision_node
from agents.compliance_checker_agent import compliance_checker_node
from agents.execution_agent import execution_node
from utils.logging_config import get_logger
from workflows.workflow_states import WorkflowState

logger = get_logger(__name__)


# ─── Routing functions ────────────────────────────────────────────────────────

def route_after_intake(state: WorkflowState) -> Literal["data_extraction", "end"]:
    if state.get("should_stop") or state.get("error"):
        return "end"
    return "data_extraction"


def route_after_extraction(state: WorkflowState) -> Literal["process_decision", "await_approval", "end"]:
    if state.get("should_stop") or state.get("error"):
        return "end"
    # Force human review if extraction confidence is very low
    if (state.get("extraction_confidence") or 1.0) < 0.45:
        return "await_approval"
    return "process_decision"


def route_after_decision(state: WorkflowState) -> Literal["compliance_check", "await_approval", "end"]:
    if state.get("should_stop") or state.get("error"):
        return "end"
    if state.get("requires_human_decision"):
        return "await_approval"
    return "compliance_check"


def route_after_compliance(state: WorkflowState) -> Literal["execution", "await_approval", "end"]:
    if state.get("should_stop") or state.get("error"):
        return "end"
    if state.get("requires_escalation") or not state.get("is_compliant", True):
        return "await_approval"
    return "execution"


def route_after_approval(state: WorkflowState) -> Literal["execution", "end"]:
    approval_status = state.get("approval_status")
    if approval_status == "approved":
        return "execution"
    # Rejected or still pending
    return "end"


# ─── Approval checkpoint node ─────────────────────────────────────────────────

async def approval_gate_node(state: WorkflowState) -> dict[str, Any]:
    """
    Pauses the workflow at a human approval gate.
    The orchestrator saves state here; the workflow resumes when
    approval_service calls resume_workflow().
    """
    from workflows.workflow_states import build_agent_message
    from utils.constants import AgentType

    logger.info("workflow_paused_at_approval_gate", workflow_id=state["workflow_id"])
    return {
        "messages": [
            build_agent_message(
                agent="orchestrator",
                content="Workflow paused — awaiting human approval.",
                confidence=None,
            )
        ],
        "current_step": "await_approval",
        "next_step": None,
        "completed_steps": ["await_approval"],
    }


# ─── Graph builder ────────────────────────────────────────────────────────────

def build_workflow_graph() -> StateGraph:
    graph = StateGraph(WorkflowState)

    graph.add_node("document_intake", document_intake_node)
    graph.add_node("data_extraction", data_extraction_node)
    graph.add_node("process_decision", process_decision_node)
    graph.add_node("compliance_check", compliance_checker_node)
    graph.add_node("await_approval", approval_gate_node)
    graph.add_node("execution", execution_node)

    graph.set_entry_point("document_intake")

    graph.add_conditional_edges("document_intake", route_after_intake, {
        "data_extraction": "data_extraction",
        "end": END,
    })
    graph.add_conditional_edges("data_extraction", route_after_extraction, {
        "process_decision": "process_decision",
        "await_approval": "await_approval",
        "end": END,
    })
    graph.add_conditional_edges("process_decision", route_after_decision, {
        "compliance_check": "compliance_check",
        "await_approval": "await_approval",
        "end": END,
    })
    graph.add_conditional_edges("compliance_check", route_after_compliance, {
        "execution": "execution",
        "await_approval": "await_approval",
        "end": END,
    })
    graph.add_conditional_edges("await_approval", route_after_approval, {
        "execution": "execution",
        "end": END,
    })
    graph.add_edge("execution", END)

    return graph


# ─── Compiled graph with memory checkpointer ─────────────────────────────────

_memory = MemorySaver()
_compiled_graph = None


def get_compiled_graph():
    global _compiled_graph
    if _compiled_graph is None:
        _compiled_graph = build_workflow_graph().compile(
            checkpointer=_memory,
            interrupt_before=["await_approval"],
        )
    return _compiled_graph


async def run_workflow(initial_state: WorkflowState) -> WorkflowState:
    graph = get_compiled_graph()
    config = {"configurable": {"thread_id": initial_state["workflow_id"]}}

    final_state = await graph.ainvoke(initial_state, config=config)
    logger.info(
        "workflow_run_complete",
        workflow_id=initial_state["workflow_id"],
        steps=final_state.get("completed_steps", []),
    )
    return final_state


async def resume_workflow(workflow_id: str, approval_status: str, approval_notes: str | None = None) -> WorkflowState:
    """Resume a paused workflow after human approval decision."""
    graph = get_compiled_graph()
    config = {"configurable": {"thread_id": workflow_id}}

    # Update state with approval outcome
    update = {"approval_status": approval_status, "approval_notes": approval_notes}
    final_state = await graph.ainvoke(update, config=config)

    logger.info(
        "workflow_resumed",
        workflow_id=workflow_id,
        approval_status=approval_status,
    )
    return final_state
