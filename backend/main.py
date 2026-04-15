from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from api.documents_routes import router as documents_router
from api.workflows_routes import router as workflows_router
from api.approvals_routes import router as approvals_router
from api.rag_routes import router as rag_router
from api.health_routes import router as health_router
from utils.config import settings
from utils.logging_config import setup_logging


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging()

    # Auto-create tables when using SQLite (local dev)
    if settings.database_url.startswith("sqlite"):
        from database.session import create_tables
        await create_tables()

    # Pre-warm embedding model
    from rag.client_rag.embedding_service import get_embedding_service
    get_embedding_service()

    yield


app = FastAPI(
    title="OutreachAI — Intelligent Business Process Automation",
    description=(
        "Enterprise-grade multi-agent backend with dual RAG, "
        "compliance checking, and human-in-the-loop approvals."
    ),
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/", include_in_schema=False)
async def root():
    return JSONResponse({
        "status": "ok",
        "service": "OutreachAI Backend",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/api/health"
    })


app.include_router(health_router)
app.include_router(documents_router)
app.include_router(workflows_router)
app.include_router(approvals_router)
app.include_router(rag_router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=settings.debug,
        log_level="debug" if settings.debug else "info",
    )
