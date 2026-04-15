from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from api.deps import get_current_user_id, get_db
from rag.dual_rag_orchestrator import get_dual_rag
from rag.client_rag.client_rag_manager import get_client_rag_manager

router = APIRouter(prefix="/api/rag", tags=["RAG"])


class SearchRequest(BaseModel):
    query: str
    top_k: int = 5
    hybrid: bool = True


class DocumentContextRequest(BaseModel):
    document_id: str
    query: str
    top_k: int = 3


@router.post("/search")
async def search_rag(
    body: SearchRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    rag = get_dual_rag()
    result = rag.search(user_id=user_id, query=body.query, top_k=body.top_k)
    return {
        "query": result.query,
        "results": [
            {
                "content": r.content,
                "relevance_score": r.relevance_score,
                "final_score": r.final_score,
                "source": r.metadata.get("source_file") or r.document_id,
                "section": r.semantic_section,
            }
            for r in result.merged_results
        ],
        "attribution": result.attribution,
        "total_client_hits": len(result.client_results),
        "total_universal_hits": len(result.universal_results),
    }


@router.get("/status")
async def rag_status(
    user_id: str = Depends(get_current_user_id),
):
    rag_manager = get_client_rag_manager()
    doc_count = rag_manager.get_document_count(user_id)
    return {
        "client_chunks": doc_count,
        "user_id": user_id,
        "universal_kb_available": True,
    }


@router.post("/document-context")
async def get_document_context(
    body: DocumentContextRequest,
    user_id: str = Depends(get_current_user_id),
):
    rag_manager = get_client_rag_manager()
    results = rag_manager.search(
        user_id=user_id,
        query=body.query,
        top_k=body.top_k,
        hybrid=True,
    )
    # Filter to target document
    filtered = [r for r in results if r.document_id == body.document_id]
    return {
        "document_id": body.document_id,
        "query": body.query,
        "context_chunks": [
            {
                "content": r.content,
                "section": r.semantic_section,
                "relevance_score": r.relevance_score,
            }
            for r in filtered
        ],
    }


@router.get("/metrics")
async def rag_metrics(
    user_id: str = Depends(get_current_user_id),
):
    rag_manager = get_client_rag_manager()
    return {
        "user_id": user_id,
        "total_chunks_indexed": rag_manager.get_document_count(user_id),
        "retrieval_model": "all-MiniLM-L6-v2",
        "search_type": "hybrid (semantic + keyword)",
    }
