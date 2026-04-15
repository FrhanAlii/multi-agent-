from __future__ import annotations

from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from api.deps import get_current_user_id, get_db
from services.document_service import DocumentService
from utils.constants import ERR_NOT_FOUND

router = APIRouter(prefix="/api/documents", tags=["Documents"])


@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    request: Request = None,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    content = await file.read()
    ip = request.client.host if request and request.client else None
    service = DocumentService(db)
    result = await service.upload_document(
        user_id=user_id,
        content=content,
        filename=file.filename or "upload",
        ip_address=ip,
    )
    if not result["success"]:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=result["errors"])
    return result


@router.get("/list")
async def list_documents(
    doc_status: str | None = Query(None, alias="status"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    service = DocumentService(db)
    return await service.list_documents(user_id, status=doc_status, limit=limit, offset=offset)


# NOTE: /search must be registered before /{document_id} to avoid the path
# parameter capturing the literal string "search".
@router.get("/search")
async def search_documents(
    q: str = Query(..., min_length=1, description="Search query — matches filename, notes, and document content via semantic search"),
    file_type: str | None = Query(None, description="Filter by file extension: pdf, docx, csv, txt, json, xlsx"),
    doc_status: str | None = Query(None, alias="status", description="Filter by document status"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Search documents by filename/notes (SQL ILIKE) and by content (semantic RAG search).
    Returns merged and deduplicated results ordered by relevance.
    """
    service = DocumentService(db)
    return await service.search_documents(
        user_id=user_id,
        query=q,
        file_type=file_type,
        status=doc_status,
        limit=limit,
        offset=offset,
    )


@router.get("/{document_id}/quality")
async def get_quality_score(
    document_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    service = DocumentService(db)
    doc = await service.get_document(document_id, user_id)
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=ERR_NOT_FOUND)
    return {
        "document_id": document_id,
        "quality_score": doc.get("quality_score"),
        "status": doc.get("status"),
        "processing_notes": doc.get("processing_notes"),
    }


@router.get("/{document_id}")
async def get_document(
    document_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    service = DocumentService(db)
    doc = await service.get_document(document_id, user_id)
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=ERR_NOT_FOUND)
    return doc


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    document_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    service = DocumentService(db)
    deleted = await service.delete_document(document_id, user_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=ERR_NOT_FOUND)
