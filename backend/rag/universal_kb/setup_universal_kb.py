"""
One-time setup script for the universal knowledge base.
Run from the backend/ directory:
    python -m rag.universal_kb.setup_universal_kb
"""

from __future__ import annotations

import hashlib
import sys
from pathlib import Path

import chromadb
from chromadb import PersistentClient

# Add backend/ to path when running as script
sys.path.insert(0, str(Path(__file__).parents[2]))

from rag.client_rag.chunking_engine import chunk_text
from rag.client_rag.embedding_service import get_embedding_service
from utils.config import settings
from utils.logging_config import get_logger, setup_logging

setup_logging()
logger = get_logger(__name__)

DOCUMENTS_DIR = Path(__file__).parent / "documents"
CHROMA_DIR = Path(__file__).parent / "chroma_db"


def _read_document(path: Path) -> str:
    suffix = path.suffix.lower()
    if suffix == ".txt":
        return path.read_text(encoding="utf-8", errors="ignore")
    if suffix == ".md":
        return path.read_text(encoding="utf-8", errors="ignore")
    if suffix == ".pdf":
        try:
            import pdfplumber
            with pdfplumber.open(path) as pdf:
                return "\n".join(page.extract_text() or "" for page in pdf.pages)
        except ImportError:
            logger.warning("pdfplumber_not_installed", path=str(path))
            return ""
    logger.warning("unsupported_document_type", path=str(path), suffix=suffix)
    return ""


def setup_universal_kb(force: bool = False) -> None:
    CHROMA_DIR.mkdir(parents=True, exist_ok=True)
    DOCUMENTS_DIR.mkdir(parents=True, exist_ok=True)

    client: PersistentClient = chromadb.PersistentClient(path=str(CHROMA_DIR))
    embedding_service = get_embedding_service()

    # Get or recreate collection
    if force:
        try:
            client.delete_collection(settings.universal_kb_collection)
            logger.info("existing_collection_deleted")
        except Exception:
            pass

    collection = client.get_or_create_collection(
        name=settings.universal_kb_collection,
        metadata={"hnsw:space": "cosine", "description": "Universal business process KB"},
    )

    source_files = list(DOCUMENTS_DIR.rglob("*"))
    source_files = [f for f in source_files if f.is_file() and f.suffix.lower() in (".txt", ".md", ".pdf")]

    if not source_files:
        logger.warning("no_documents_found", directory=str(DOCUMENTS_DIR))
        _seed_sample_documents(DOCUMENTS_DIR)
        source_files = list(DOCUMENTS_DIR.rglob("*.txt"))

    total_chunks = 0
    for doc_path in source_files:
        logger.info("processing_document", path=str(doc_path))
        text = _read_document(doc_path)
        if not text.strip():
            continue

        doc_id = hashlib.sha256(doc_path.name.encode()).hexdigest()[:16]
        chunks = chunk_text(text, document_id=doc_id, source_file=doc_path.name)

        texts = [c.content for c in chunks]
        embeddings = embedding_service.embed_texts(texts)
        ids = [f"{doc_id}_{c.chunk_number}" for c in chunks]
        metadatas = [
            {
                "document_id": doc_id,
                "source_file": doc_path.name,
                "chunk_number": c.chunk_number,
                "semantic_section": c.semantic_section,
                "chunk_type": c.chunk_type,
                "importance_score": c.importance_score,
            }
            for c in chunks
        ]

        collection.upsert(ids=ids, documents=texts, embeddings=embeddings, metadatas=metadatas)
        total_chunks += len(chunks)
        logger.info("document_indexed", doc=doc_path.name, chunks=len(chunks))

    logger.info("universal_kb_setup_complete", total_chunks=total_chunks, documents=len(source_files))


def _seed_sample_documents(documents_dir: Path) -> None:
    """Create placeholder documents when none exist."""
    samples = {
        "business_process_guidelines.txt": """
# Business Process Guidelines

## Document Processing Standards
All incoming documents must be validated before processing.
Documents require quality score of at least 60 before entering workflow.
Low-quality documents must be flagged for human review.

## Approval Requirements
Process decisions with confidence below 0.65 require human approval.
Compliance violations must always be escalated to human review.
Financial decisions above $10,000 require mandatory approval.

## Data Extraction Standards
Extracted data must include confidence scores for each field.
Fields with confidence below 0.45 must be flagged as uncertain.
All extracted data must be validated against business rules.

## Compliance Framework
All actions must comply with applicable regulations.
Compliance reports must document any policy gaps.
Serious violations require immediate escalation.
        """,
        "workflow_templates.txt": """
# Standard Workflow Templates

## Document Intake Workflow
1. Receive document from user
2. Validate file type and integrity
3. Score document quality
4. Route to appropriate processing pipeline
5. Log intake in audit trail

## Data Extraction Workflow
1. Load document content
2. Apply extraction patterns
3. Score confidence per field
4. Flag uncertain extractions
5. Return structured data with sources

## Compliance Check Workflow
1. Load compliance rules
2. Validate extracted data against rules
3. Identify gaps and violations
4. Generate compliance report
5. Escalate serious violations

## Approval Workflow
1. Create approval request with full context
2. Route to authorized approver
3. Wait for decision (timeout: 48 hours)
4. Execute if approved
5. Log decision in audit trail
        """,
    }

    for filename, content in samples.items():
        (documents_dir / filename).write_text(content.strip(), encoding="utf-8")
    logger.info("sample_documents_created", count=len(samples))


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Set up Universal Knowledge Base")
    parser.add_argument("--force", action="store_true", help="Delete and recreate the collection")
    args = parser.parse_args()
    setup_universal_kb(force=args.force)
