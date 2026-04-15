from __future__ import annotations

from typing import Any

from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate

from rag.dual_rag_orchestrator import get_dual_rag
from utils.config import settings
from utils.constants import AgentType
from utils.logging_config import get_logger
from workflows.workflow_states import WorkflowState, build_agent_message

logger = get_logger(__name__)

COMPLIANCE_PROMPT = ChatPromptTemplate.from_messages([
    ("system", """You are a compliance specialist for a business process automation system.
Validate the extracted data and proposed decision against all applicable rules and regulations.

Return a JSON object with:
- is_compliant: bool
- compliance_score: float 0-1 (1 = fully compliant)
- violations: list of {{rule, severity (critical/major/minor), description, affected_field}}
- warnings: list of {{rule, description, recommendation}}
- policy_gaps: list of areas not covered by current policies
- remediation_steps: list of required actions to achieve compliance
- regulatory_references: list of relevant regulations consulted
- requires_escalation: bool (true if any critical violations)
- compliance_notes: additional observations

Severity guide:
- critical: legal violation, immediate halt required
- major: policy violation, human review required
- minor: best practice deviation, log and continue

Respond ONLY with valid JSON."""),
    ("human", """Document type: {document_type}
Business process: {business_process}

Extracted data:
{extracted_data}

Proposed decision:
{decision}

Compliance rules and regulations from knowledge base:
{context}"""),
])


async def compliance_checker_node(state: WorkflowState) -> dict[str, Any]:
    import json
    logger.info("compliance_check_start", workflow_id=state["workflow_id"])

    classification = state.get("document_classification") or {}
    extracted_data = state.get("extracted_data") or {}
    decision = state.get("decision") or {}

    # Query both RAGs specifically for compliance rules
    rag = get_dual_rag()
    rag_result = rag.search(
        user_id=state["user_id"],
        query=(
            f"compliance rules regulations {classification.get('business_process', '')} "
            f"{classification.get('document_type', '')} policy requirements"
        ),
        top_k=6,
    )

    llm = ChatOpenAI(model=settings.llm_model, temperature=0.0, api_key=settings.openai_api_key)
    chain = COMPLIANCE_PROMPT | llm

    try:
        response = await chain.ainvoke({
            "document_type": classification.get("document_type", "unknown"),
            "business_process": classification.get("business_process", "unknown"),
            "extracted_data": json.dumps(extracted_data, indent=2)[:2000],
            "decision": json.dumps(decision, indent=2)[:1000],
            "context": rag_result.context_text[:3000],
        })

        result = json.loads(response.content)
        is_compliant = result.get("is_compliant", True)
        violations = result.get("violations", [])
        critical_violations = [v for v in violations if v.get("severity") == "critical"]
        requires_escalation = result.get("requires_escalation", bool(critical_violations))

        message = build_agent_message(
            agent=AgentType.COMPLIANCE_CHECKER.value,
            content=(
                f"Compliance {'PASSED' if is_compliant else 'FAILED'}. "
                f"Score: {result.get('compliance_score', 0):.0%}. "
                f"Violations: {len(violations)} ({len(critical_violations)} critical). "
                f"{'Escalation required.' if requires_escalation else ''}"
            ),
            confidence=result.get("compliance_score", 0.5),
            sources=rag_result.attribution.get("universal", []),
        )

        logger.info(
            "compliance_check_complete",
            workflow_id=state["workflow_id"],
            is_compliant=is_compliant,
            violations=len(violations),
            critical=len(critical_violations),
            requires_escalation=requires_escalation,
        )

        # Determine next step based on compliance result
        if critical_violations:
            next_step = "await_approval"  # Force human review
        elif not is_compliant and violations:
            next_step = "await_approval"
        else:
            next_step = "execution"

        return {
            "messages": [message],
            "compliance_report": result,
            "compliance_violations": violations,
            "compliance_suggestions": result.get("remediation_steps", []),
            "is_compliant": is_compliant,
            "requires_escalation": requires_escalation,
            "requires_human_decision": requires_escalation or not is_compliant,
            "current_step": "compliance_check",
            "next_step": next_step,
            "completed_steps": ["compliance_check"],
        }

    except Exception as e:
        logger.error("compliance_check_failed", error=str(e), workflow_id=state["workflow_id"])
        return {
            "messages": [build_agent_message(
                agent=AgentType.COMPLIANCE_CHECKER.value,
                content=f"Compliance check failed: {e}",
                confidence=0.0,
            )],
            "error": str(e),
            "should_stop": True,
            "completed_steps": ["compliance_check"],
        }
