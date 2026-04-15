from __future__ import annotations

from typing import Any

from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate

from rag.dual_rag_orchestrator import get_dual_rag
from utils.config import settings
from utils.constants import AgentType, CONFIDENCE_HIGH, CONFIDENCE_MEDIUM
from utils.logging_config import get_logger
from workflows.workflow_states import WorkflowState, build_agent_message

logger = get_logger(__name__)

DECISION_PROMPT = ChatPromptTemplate.from_messages([
    ("system", """You are a business process decision specialist.
Based on the extracted data and business rules, determine the appropriate process decision.

Return a JSON object with:
- primary_decision: the main recommended action/decision
- decision_rationale: detailed explanation of why this decision was made
- decision_paths: list of possible paths, each with {{path, conditions, confidence, implications}}
- confidence: float 0-1 for the primary decision
- requires_human_approval: bool (true if confidence < 0.85 or decision is high-risk)
- risk_level: low | medium | high | critical
- affected_parties: list of stakeholders impacted
- next_actions: list of recommended next steps
- source_rules: list of business rules consulted

Respond ONLY with valid JSON."""),
    ("human", """Document type: {document_type}
Business process: {business_process}

Extracted data:
{extracted_data}

Business rules and policies from knowledge base:
{context}"""),
])


async def process_decision_node(state: WorkflowState) -> dict[str, Any]:
    import json
    logger.info("process_decision_start", workflow_id=state["workflow_id"])

    classification = state.get("document_classification") or {}
    extracted_data = state.get("extracted_data") or {}

    # Query dual RAG for business rules and decision templates
    query = (
        f"business rules decision policy for {classification.get('document_type', '')} "
        f"{classification.get('business_process', '')}"
    )
    rag = get_dual_rag()
    rag_result = rag.search(user_id=state["user_id"], query=query, top_k=5)

    llm = ChatOpenAI(model=settings.llm_model, temperature=0.1, api_key=settings.openai_api_key)
    chain = DECISION_PROMPT | llm

    try:
        response = await chain.ainvoke({
            "document_type": classification.get("document_type", "unknown"),
            "business_process": classification.get("business_process", "unknown"),
            "extracted_data": json.dumps(extracted_data, indent=2)[:3000],
            "context": rag_result.context_text[:2000],
        })

        result = json.loads(response.content)
        confidence = float(result.get("confidence", 0.7))
        requires_human = result.get("requires_human_approval", confidence < CONFIDENCE_HIGH)

        message = build_agent_message(
            agent=AgentType.PROCESS_DECISION.value,
            content=(
                f"Decision: {result.get('primary_decision')}. "
                f"Confidence: {confidence:.0%}. Risk: {result.get('risk_level', 'unknown')}. "
                f"Human approval {'required' if requires_human else 'not required'}."
            ),
            confidence=confidence,
            sources=rag_result.attribution.get("universal", []),
        )

        logger.info(
            "process_decision_complete",
            workflow_id=state["workflow_id"],
            confidence=confidence,
            requires_human=requires_human,
            risk=result.get("risk_level"),
        )

        return {
            "messages": [message],
            "decision": result,
            "decision_confidence": confidence,
            "decision_paths": result.get("decision_paths", []),
            "decision_sources": [
                {"content": r.content[:200], "source": r.metadata.get("source_file"), "score": r.final_score}
                for r in rag_result.merged_results[:3]
            ],
            "requires_human_decision": requires_human,
            "current_step": "process_decision",
            "next_step": "compliance_check",
            "completed_steps": ["process_decision"],
        }

    except Exception as e:
        logger.error("process_decision_failed", error=str(e), workflow_id=state["workflow_id"])
        return {
            "messages": [build_agent_message(
                agent=AgentType.PROCESS_DECISION.value,
                content=f"Decision failed: {e}",
                confidence=0.0,
            )],
            "error": str(e),
            "should_stop": True,
            "completed_steps": ["process_decision"],
        }
