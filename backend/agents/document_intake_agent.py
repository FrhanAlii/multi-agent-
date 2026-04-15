from __future__ import annotations

from typing import Any

from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate

from rag.dual_rag_orchestrator import get_dual_rag
from utils.config import settings
from utils.constants import AgentType, CONFIDENCE_MEDIUM
from utils.logging_config import get_logger
from workflows.workflow_states import WorkflowState, build_agent_message

logger = get_logger(__name__)

INTAKE_PROMPT = ChatPromptTemplate.from_messages([
    ("system", """You are a document intake specialist for a business process automation system.
Analyze the provided document content and classify it.

Return a JSON object with:
- document_type: the type of business document (invoice, contract, report, policy, procedure, request, compliance_doc, other)
- business_process: the business process this document relates to (e.g., procurement, HR, finance, compliance, operations)
- required_processing_steps: list of processing steps needed (data_extraction, compliance_check, approval, execution)
- complexity: low | medium | high
- key_entities: list of key entities found (companies, people, amounts, dates)
- summary: 2-3 sentence summary of the document
- confidence: float 0-1 indicating your confidence in the classification

Respond ONLY with valid JSON."""),
    ("human", "Document content:\n\n{content}\n\nAdditional context from knowledge base:\n{context}"),
])


def build_document_intake_agent():
    return ChatOpenAI(
        model=settings.llm_model,
        temperature=0.0,
        api_key=settings.openai_api_key,
    )


async def document_intake_node(state: WorkflowState) -> dict[str, Any]:
    import json
    logger.info("document_intake_start", workflow_id=state["workflow_id"])

    # Gather document content from state (populated by orchestrator before calling)
    document_content = state.get("initial_request", "")

    # Query RAG for classification context
    rag = get_dual_rag()
    rag_result = rag.search(
        user_id=state["user_id"],
        query=f"document classification: {document_content[:500]}",
        top_k=3,
    )

    llm = build_document_intake_agent()
    chain = INTAKE_PROMPT | llm

    try:
        response = await chain.ainvoke({
            "content": document_content[:4000],
            "context": rag_result.context_text[:2000],
        })

        result = json.loads(response.content)
        confidence = float(result.get("confidence", 0.7))

        message = build_agent_message(
            agent=AgentType.DOCUMENT_INTAKE.value,
            content=f"Document classified as: {result.get('document_type')} / {result.get('business_process')}",
            confidence=confidence,
            sources=rag_result.attribution.get("client", []) + rag_result.attribution.get("universal", []),
        )

        logger.info(
            "document_intake_complete",
            workflow_id=state["workflow_id"],
            doc_type=result.get("document_type"),
            confidence=confidence,
        )

        return {
            "messages": [message],
            "document_classification": result,
            "required_processing_steps": result.get("required_processing_steps", []),
            "current_step": "document_intake",
            "next_step": "data_extraction",
            "completed_steps": ["document_intake"],
        }

    except (json.JSONDecodeError, Exception) as e:
        logger.error("document_intake_failed", error=str(e), workflow_id=state["workflow_id"])
        return {
            "messages": [build_agent_message(
                agent=AgentType.DOCUMENT_INTAKE.value,
                content=f"Intake failed: {e}",
                confidence=0.0,
            )],
            "error": str(e),
            "should_stop": True,
            "completed_steps": ["document_intake"],
        }
