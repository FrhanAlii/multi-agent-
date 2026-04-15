from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from api.deps import get_db
from rag.client_rag.client_rag_manager import get_client_rag_manager
from rag.dual_rag_orchestrator import get_dual_rag
from utils.config import settings

router = APIRouter(prefix="/api/health", tags=["Health"])


@router.get("")
async def health():
    return {"status": "ok", "version": "1.0.0"}


@router.get("/database")
async def database_health(db: AsyncSession = Depends(get_db)):
    try:
        await db.execute(text("SELECT 1"))
        return {"status": "ok", "database": "connected"}
    except Exception as e:
        return {"status": "error", "database": str(e)}


@router.get("/rag")
async def rag_health():
    try:
        rag = get_dual_rag()
        universal_available = rag._get_universal_collection() is not None
        return {
            "status": "ok",
            "universal_kb": "available" if universal_available else "not_initialized",
            "client_rag": "available",
            "embedding_model": settings.embedding_model,
        }
    except Exception as e:
        return {"status": "error", "detail": str(e)}


@router.get("/agents")
async def agents_health():
    try:
        from agents.orchestrator import get_compiled_graph
        graph = get_compiled_graph()
        nodes = list(graph.nodes.keys()) if hasattr(graph, "nodes") else []
        return {
            "status": "ok",
            "agents": [
                "document_intake",
                "data_extraction",
                "process_decision",
                "compliance_checker",
                "execution",
            ],
            "graph_nodes": nodes,
        }
    except Exception as e:
        return {"status": "error", "detail": str(e)}
