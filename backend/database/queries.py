from datetime import datetime, timezone
from typing import Any
from sqlalchemy import select, update, delete, and_, func
from sqlalchemy.ext.asyncio import AsyncSession

from database.models import Document, DocumentChunk, ProcessWorkflow, Approval, AuditLog, User


# ─── Documents ────────────────────────────────────────────────────────────────

async def get_document(db: AsyncSession, document_id: str, user_id: str) -> Document | None:
    result = await db.execute(
        select(Document).where(
            and_(Document.id == document_id, Document.user_id == user_id)
        )
    )
    return result.scalar_one_or_none()


async def list_documents(
    db: AsyncSession,
    user_id: str,
    status: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> list[Document]:
    q = select(Document).where(Document.user_id == user_id)
    if status:
        q = q.where(Document.status == status)
    q = q.order_by(Document.upload_date.desc()).limit(limit).offset(offset)
    result = await db.execute(q)
    return list(result.scalars().all())


async def create_document(db: AsyncSession, **kwargs) -> Document:
    doc = Document(**kwargs)
    db.add(doc)
    await db.flush()
    await db.refresh(doc)
    return doc


async def update_document(db: AsyncSession, document_id: str, user_id: str, **kwargs) -> Document | None:
    kwargs["updated_date"] = datetime.now(timezone.utc)
    await db.execute(
        update(Document)
        .where(and_(Document.id == document_id, Document.user_id == user_id))
        .values(**kwargs)
    )
    return await get_document(db, document_id, user_id)


async def delete_document(db: AsyncSession, document_id: str, user_id: str) -> bool:
    result = await db.execute(
        delete(Document).where(
            and_(Document.id == document_id, Document.user_id == user_id)
        )
    )
    return result.rowcount > 0


async def search_documents(
    db: AsyncSession,
    user_id: str,
    query: str,
    file_type: str | None = None,
    status: str | None = None,
    limit: int = 20,
    offset: int = 0,
) -> list[Document]:
    from sqlalchemy import or_
    q = select(Document).where(Document.user_id == user_id)
    if query:
        q = q.where(
            or_(
                Document.original_file_name.ilike(f"%{query}%"),
                Document.processing_notes.ilike(f"%{query}%"),
            )
        )
    if file_type:
        q = q.where(Document.file_type == file_type.lower())
    if status:
        q = q.where(Document.status == status)
    q = q.order_by(Document.upload_date.desc()).limit(limit).offset(offset)
    result = await db.execute(q)
    return list(result.scalars().all())


async def find_document_by_hash(db: AsyncSession, file_hash: str, user_id: str) -> Document | None:
    result = await db.execute(
        select(Document).where(
            and_(Document.file_hash == file_hash, Document.user_id == user_id,
                 Document.status != "deleted")
        )
    )
    return result.scalar_one_or_none()


async def create_chunk(db: AsyncSession, **kwargs) -> DocumentChunk:
    chunk = DocumentChunk(**kwargs)
    db.add(chunk)
    await db.flush()
    return chunk


async def get_chunks_for_document(db: AsyncSession, document_id: str) -> list[DocumentChunk]:
    result = await db.execute(
        select(DocumentChunk)
        .where(DocumentChunk.document_id == document_id)
        .order_by(DocumentChunk.chunk_number)
    )
    return list(result.scalars().all())


# ─── Workflows ────────────────────────────────────────────────────────────────

async def create_workflow(db: AsyncSession, **kwargs) -> ProcessWorkflow:
    wf = ProcessWorkflow(**kwargs)
    db.add(wf)
    await db.flush()
    await db.refresh(wf)
    return wf


async def get_workflow(db: AsyncSession, workflow_id: str, user_id: str) -> ProcessWorkflow | None:
    result = await db.execute(
        select(ProcessWorkflow).where(
            and_(ProcessWorkflow.id == workflow_id, ProcessWorkflow.user_id == user_id)
        )
    )
    return result.scalar_one_or_none()


async def list_workflows(
    db: AsyncSession,
    user_id: str,
    status: str | None = None,
    limit: int = 20,
    offset: int = 0,
) -> list[ProcessWorkflow]:
    q = select(ProcessWorkflow).where(ProcessWorkflow.user_id == user_id)
    if status:
        q = q.where(ProcessWorkflow.status == status)
    q = q.order_by(ProcessWorkflow.created_date.desc()).limit(limit).offset(offset)
    result = await db.execute(q)
    return list(result.scalars().all())


async def update_workflow(db: AsyncSession, workflow_id: str, user_id: str, **kwargs) -> ProcessWorkflow | None:
    kwargs["updated_date"] = datetime.now(timezone.utc)
    await db.execute(
        update(ProcessWorkflow)
        .where(and_(ProcessWorkflow.id == workflow_id, ProcessWorkflow.user_id == user_id))
        .values(**kwargs)
    )
    return await get_workflow(db, workflow_id, user_id)


# ─── Approvals ────────────────────────────────────────────────────────────────

async def create_approval(db: AsyncSession, **kwargs) -> Approval:
    approval = Approval(**kwargs)
    db.add(approval)
    await db.flush()
    await db.refresh(approval)
    return approval


async def get_approval(db: AsyncSession, approval_id: str, user_id: str) -> Approval | None:
    result = await db.execute(
        select(Approval).where(
            and_(Approval.id == approval_id, Approval.user_id == user_id)
        )
    )
    return result.scalar_one_or_none()


async def list_pending_approvals(db: AsyncSession, user_id: str) -> list[Approval]:
    result = await db.execute(
        select(Approval)
        .where(and_(Approval.user_id == user_id, Approval.status == "pending"))
        .order_by(Approval.requested_date.asc())
    )
    return list(result.scalars().all())


async def update_approval(db: AsyncSession, approval_id: str, user_id: str, **kwargs) -> Approval | None:
    await db.execute(
        update(Approval)
        .where(and_(Approval.id == approval_id, Approval.user_id == user_id))
        .values(**kwargs)
    )
    return await get_approval(db, approval_id, user_id)


# ─── Audit Logs ───────────────────────────────────────────────────────────────

async def create_audit_log(db: AsyncSession, **kwargs) -> AuditLog:
    log = AuditLog(**kwargs)
    db.add(log)
    await db.flush()
    return log


async def list_audit_logs(
    db: AsyncSession,
    user_id: str,
    resource_type: str | None = None,
    resource_id: str | None = None,
    limit: int = 100,
    offset: int = 0,
) -> list[AuditLog]:
    q = select(AuditLog).where(AuditLog.user_id == user_id)
    if resource_type:
        q = q.where(AuditLog.resource_type == resource_type)
    if resource_id:
        q = q.where(AuditLog.resource_id == resource_id)
    q = q.order_by(AuditLog.created_date.desc()).limit(limit).offset(offset)
    result = await db.execute(q)
    return list(result.scalars().all())
