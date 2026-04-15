from __future__ import annotations

from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from database import queries
from document_handling.upload_processor import process_upload
from rag.client_rag.chunking_engine import chunk_text
from rag.client_rag.client_rag_manager import get_client_rag_manager
from utils.constants import DocumentStatus
from utils.logging_config import get_logger
from utils.validators import sanitize_filename, validate_file_extension, validate_file_size
from workflows.audit_logger import AuditLogger

logger = get_logger(__name__)


class DocumentService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db
        self._rag = get_client_rag_manager()
        self._audit = AuditLogger(db)

    async def upload_document(
        self,
        user_id: str,
        content: bytes,
        filename: str,
        ip_address: str | None = None,
    ) -> dict[str, Any]:
        # Validate file
        ext = validate_file_extension(filename)
        validate_file_size(len(content))
        safe_name = sanitize_filename(filename)

        # Fetch existing docs for dedup check
        existing = await queries.list_documents(self._db, user_id, limit=500)
        existing_for_dedup = [
            {"id": d.id, "file_hash": d.file_hash, "text_sample": ""}
            for d in existing
        ]

        # Create initial DB record
        doc = await queries.create_document(
            self._db,
            user_id=user_id,
            file_name=safe_name,
            original_file_name=filename,
            file_type=ext,
            file_size=len(content),
            file_hash="pending",
            storage_path="pending",
            status=DocumentStatus.UPLOADING.value,
        )

        try:
            # Process upload
            result = await process_upload(
                content=content,
                filename=safe_name,
                file_extension=ext,
                user_id=user_id,
                existing_documents=existing_for_dedup,
            )

            if not result.success:
                await queries.update_document(
                    self._db, doc.id, user_id,
                    status=DocumentStatus.FAILED.value,
                    processing_notes="; ".join(result.errors),
                )
                return {"success": False, "document_id": doc.id, "errors": result.errors}

            # Update record with actual values
            await queries.update_document(
                self._db, doc.id, user_id,
                file_hash=result.file_hash,
                storage_path=result.storage_path,
                quality_score=result.quality.score if result.quality else None,
                status=DocumentStatus.CHUNKING.value,
                processing_notes="; ".join(result.validation.warnings) if result.validation else None,
            )

            # Chunk and embed
            await self._chunk_and_embed(
                user_id=user_id,
                document_id=doc.id,
                text=result.extracted_text,
                filename=safe_name,
            )

            await queries.update_document(
                self._db, doc.id, user_id,
                status=DocumentStatus.READY.value,
                is_embedded=True,
            )

            await self._audit.log_document_upload(user_id, doc.id, filename, ip_address)

            logger.info("document_upload_complete", document_id=doc.id, user_id=user_id)
            return {
                "success": True,
                "document_id": doc.id,
                "quality_score": result.quality.score if result.quality else None,
                "quality_grade": result.quality.grade if result.quality else None,
                "requires_review": result.quality.requires_human_review if result.quality else False,
                "warnings": result.validation.warnings if result.validation else [],
            }

        except Exception as e:
            logger.error("document_upload_failed", error=str(e), document_id=doc.id)
            await queries.update_document(
                self._db, doc.id, user_id,
                status=DocumentStatus.FAILED.value,
                processing_notes=str(e),
            )
            return {"success": False, "document_id": doc.id, "errors": [str(e)]}

    async def _chunk_and_embed(
        self, user_id: str, document_id: str, text: str, filename: str
    ) -> None:
        chunks = chunk_text(text, document_id=document_id, source_file=filename)
        if not chunks:
            return

        # Save chunks to DB
        for chunk in chunks:
            await queries.create_chunk(
                self._db,
                document_id=document_id,
                chunk_number=chunk.chunk_number,
                content=chunk.content,
                semantic_section=chunk.semantic_section,
                chunk_type=chunk.chunk_type,
                importance_score=chunk.importance_score,
                tokens=chunk.tokens,
                chunk_metadata=chunk.metadata,
            )

        # Add to client Chroma collection
        self._rag.add_chunks(user_id, chunks)
        logger.info("chunks_saved", document_id=document_id, count=len(chunks))

    async def get_document(self, document_id: str, user_id: str) -> dict[str, Any] | None:
        doc = await queries.get_document(self._db, document_id, user_id)
        if not doc:
            return None
        return self._serialize(doc)

    async def list_documents(
        self, user_id: str, status: str | None = None, limit: int = 50, offset: int = 0
    ) -> list[dict[str, Any]]:
        docs = await queries.list_documents(self._db, user_id, status=status, limit=limit, offset=offset)
        return [self._serialize(d) for d in docs]

    async def search_documents(
        self,
        user_id: str,
        query: str,
        file_type: str | None = None,
        status: str | None = None,
        limit: int = 20,
        offset: int = 0,
    ) -> list[dict[str, Any]]:
        # DB search (filename / notes)
        db_results = await queries.search_documents(
            self._db, user_id, query,
            file_type=file_type, status=status, limit=limit, offset=offset,
        )
        db_ids = {d.id for d in db_results}
        serialized = [self._serialize(d) for d in db_results]

        # Semantic RAG search — find additional document IDs from chunk content
        if query:
            rag_hits = self._rag.search(user_id, query, top_k=10, hybrid=True)
            seen_doc_ids: set[str] = set()
            for hit in rag_hits:
                doc_id = hit.document_id
                if doc_id and doc_id not in db_ids and doc_id not in seen_doc_ids:
                    seen_doc_ids.add(doc_id)
                    doc = await queries.get_document(self._db, doc_id, user_id)
                    if doc:
                        entry = self._serialize(doc)
                        entry["rag_score"] = round(hit.final_score, 4)
                        entry["matched_section"] = hit.semantic_section
                        serialized.append(entry)

        return serialized

    async def delete_document(self, document_id: str, user_id: str) -> bool:
        doc = await queries.get_document(self._db, document_id, user_id)
        if not doc:
            return False
        # Remove from Chroma
        self._rag.delete_document_chunks(user_id, document_id)
        # Delete from storage and DB
        from document_handling.storage_manager import delete_file
        delete_file(doc.storage_path)
        return await queries.delete_document(self._db, document_id, user_id)

    @staticmethod
    def _serialize(doc) -> dict[str, Any]:
        return {
            "id": doc.id,
            "file_name": doc.original_file_name,
            "file_type": doc.file_type,
            "file_size": doc.file_size,
            "quality_score": doc.quality_score,
            "status": doc.status,
            "upload_date": doc.upload_date.isoformat() if doc.upload_date else None,
            "is_embedded": doc.is_embedded,
            "processing_notes": doc.processing_notes,
        }
