from __future__ import annotations

from typing import Any

from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate

from rag.dual_rag_orchestrator import get_dual_rag
from utils.config import settings
from utils.constants import AgentType, CONFIDENCE_LOW, CONFIDENCE_MEDIUM
from utils.logging_config import get_logger
from workflows.workflow_states import WorkflowState, build_agent_message

logger = get_logger(__name__)

EXTRACTION_PROMPT = ChatPromptTemplate.from_messages([
    ("system", """You are a data extraction specialist for business process automation.
Extract all structured data from the document.

Return a JSON object with:
- extracted_fields: dict of field_name -> {{value, confidence (0-1), source_quote}}
- tables: list of extracted tables (if any)
- key_dates: list of {{date, type, value}}
- key_amounts: list of {{amount, currency, type, context}}
- parties: list of {{name, role, type}}
- overall_confidence: float 0-1 (average confidence across all extractions)
- low_confidence_fields: list of field names with confidence < 0.65
- extraction_notes: any issues or observations

Use the knowledge base context to understand expected fields for this document type.
Respond ONLY with valid JSON."""),
    ("human", """Document type: {document_type}
Business process: {business_process}

Document content:
{content}

Knowledge base context (extraction patterns and templates):
{context}"""),
])


async def data_extraction_node(state: WorkflowState) -> dict[str, Any]:
    import json
    logger.info("data_extraction_start", workflow_id=state["workflow_id"])

    classification = state.get("document_classification") or {}
    doc_type = classification.get("document_type", "unknown")
    business_process = classification.get("business_process", "unknown")
    document_content = state.get("initial_request", "")

    # Query dual RAG for extraction patterns
    rag = get_dual_rag()
    rag_result = rag.search(
        user_id=state["user_id"],
        query=f"data extraction template {doc_type} {business_process} required fields",
        top_k=5,
    )

    llm = ChatOpenAI(model=settings.llm_model, temperature=0.0, api_key=settings.openai_api_key)
    chain = EXTRACTION_PROMPT | llm

    try:
        response = await chain.ainvoke({
            "document_type": doc_type,
            "business_process": business_process,
            "content": document_content[:5000],
            "context": rag_result.context_text[:2000],
        })

        result = json.loads(response.content)
        overall_confidence = float(result.get("overall_confidence", 0.7))
        low_confidence_fields = result.get("low_confidence_fields", [])
        requires_review = overall_confidence < CONFIDENCE_MEDIUM or bool(low_confidence_fields)

        message = build_agent_message(
            agent=AgentType.DATA_EXTRACTION.value,
            content=(
                f"Extracted {len(result.get('extracted_fields', {}))} fields. "
                f"Confidence: {overall_confidence:.0%}. "
                f"Low-confidence fields: {', '.join(low_confidence_fields) or 'none'}."
            ),
            confidence=overall_confidence,
            sources=rag_result.attribution.get("client", []),
        )

        logger.info(
            "data_extraction_complete",
            workflow_id=state["workflow_id"],
            fields=len(result.get("extracted_fields", {})),
            confidence=overall_confidence,
            requires_review=requires_review,
        )

        return {
            "messages": [message],
            "extracted_data": result,
            "extraction_confidence": overall_confidence,
            "extraction_sources": [
                {"chunk_id": r.chunk_id, "content": r.content[:200], "score": r.final_score}
                for r in rag_result.merged_results[:3]
            ],
            "low_confidence_fields": low_confidence_fields,
            "requires_human_decision": requires_review if overall_confidence < CONFIDENCE_LOW else None,
            "current_step": "data_extraction",
            "next_step": "process_decision",
            "completed_steps": ["data_extraction"],
        }

    except Exception as e:
        logger.error("data_extraction_failed", error=str(e), workflow_id=state["workflow_id"])
        return {
            "messages": [build_agent_message(
                agent=AgentType.DATA_EXTRACTION.value,
                content=f"Extraction failed: {e}",
                confidence=0.0,
            )],
            "error": str(e),
            "should_stop": True,
            "completed_steps": ["data_extraction"],
        }
