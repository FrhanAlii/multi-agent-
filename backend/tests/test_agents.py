"""Unit tests for individual agents."""
from __future__ import annotations

import pytest
from unittest.mock import AsyncMock, MagicMock, patch


@pytest.fixture
def base_state():
    return {
        "workflow_id": "test-wf-001",
        "user_id": "test-user-001",
        "document_ids": ["doc-001"],
        "workflow_type": "document_processing",
        "initial_request": "Invoice from Acme Corp for $5,000 dated 2026-04-01. Services: software consulting.",
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


@pytest.mark.asyncio
async def test_document_intake_agent_classifies_document(base_state):
    mock_response = MagicMock()
    mock_response.content = '{"document_type":"invoice","business_process":"finance","required_processing_steps":["data_extraction","compliance_check","approval"],"complexity":"low","key_entities":["Acme Corp"],"summary":"Software consulting invoice.","confidence":0.92}'

    with patch("agents.document_intake_agent.ChatOpenAI") as mock_llm_cls, \
         patch("agents.document_intake_agent.get_dual_rag") as mock_rag:
        mock_rag.return_value.search.return_value = MagicMock(
            context_text="Invoices require approval above $1000.",
            attribution={"client": [], "universal": ["business_process_guidelines.txt"]},
            merged_results=[],
        )
        mock_llm = MagicMock()
        mock_chain = MagicMock()
        mock_chain.ainvoke = AsyncMock(return_value=mock_response)
        mock_llm_cls.return_value.__or__ = MagicMock(return_value=mock_chain)

        from agents.document_intake_agent import document_intake_node
        result = await document_intake_node(base_state)

    assert result["document_classification"]["document_type"] == "invoice"
    assert result["document_classification"]["business_process"] == "finance"
    assert "document_intake" in result["completed_steps"]
    assert result["next_step"] == "data_extraction"
    assert len(result["messages"]) == 1


@pytest.mark.asyncio
async def test_document_intake_agent_handles_llm_error(base_state):
    with patch("agents.document_intake_agent.ChatOpenAI") as mock_llm_cls, \
         patch("agents.document_intake_agent.get_dual_rag") as mock_rag:
        mock_rag.return_value.search.return_value = MagicMock(
            context_text="", attribution={"client": [], "universal": []}, merged_results=[]
        )
        mock_llm = MagicMock()
        mock_chain = MagicMock()
        mock_chain.ainvoke = AsyncMock(side_effect=Exception("LLM API error"))
        mock_llm_cls.return_value.__or__ = MagicMock(return_value=mock_chain)

        from agents.document_intake_agent import document_intake_node
        result = await document_intake_node(base_state)

    assert result["should_stop"] is True
    assert result["error"] is not None


@pytest.mark.asyncio
async def test_compliance_checker_flags_critical_violation(base_state):
    base_state["document_classification"] = {"document_type": "invoice", "business_process": "finance"}
    base_state["extracted_data"] = {"extracted_fields": {"amount": {"value": 500000, "confidence": 0.95}}}
    base_state["decision"] = {"primary_decision": "approve_payment"}

    mock_response = MagicMock()
    mock_response.content = '{"is_compliant":false,"compliance_score":0.2,"violations":[{"rule":"spending_limit","severity":"critical","description":"Amount exceeds authorization limit","affected_field":"amount"}],"warnings":[],"policy_gaps":[],"remediation_steps":["Escalate to CFO"],"regulatory_references":[],"requires_escalation":true,"compliance_notes":""}'

    with patch("agents.compliance_checker_agent.ChatOpenAI") as mock_llm_cls, \
         patch("agents.compliance_checker_agent.get_dual_rag") as mock_rag:
        mock_rag.return_value.search.return_value = MagicMock(
            context_text="Spending above $100,000 requires CFO approval.",
            attribution={"client": [], "universal": []},
            merged_results=[],
        )
        mock_chain = MagicMock()
        mock_chain.ainvoke = AsyncMock(return_value=mock_response)
        mock_llm_cls.return_value.__or__ = MagicMock(return_value=mock_chain)

        from agents.compliance_checker_agent import compliance_checker_node
        result = await compliance_checker_node(base_state)

    assert result["is_compliant"] is False
    assert result["requires_escalation"] is True
    assert result["next_step"] == "await_approval"
    assert len(result["compliance_violations"]) == 1
