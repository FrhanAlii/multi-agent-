"""Tests for RAG system — chunking, embedding, retrieval, dual orchestration."""
from __future__ import annotations

import pytest
from unittest.mock import MagicMock, patch


def test_chunk_text_basic():
    from rag.client_rag.chunking_engine import chunk_text

    text = "First paragraph about compliance.\n\nSecond paragraph about approval workflows.\n\nThird paragraph about data extraction."
    chunks = chunk_text(text, document_id="test-doc", source_file="test.txt")

    assert len(chunks) >= 1
    assert all(c.content.strip() for c in chunks)
    assert all(0 <= c.importance_score <= 1 for c in chunks)
    assert [c.chunk_number for c in chunks] == list(range(len(chunks)))


def test_chunk_text_preserves_sections():
    from rag.client_rag.chunking_engine import chunk_text

    text = "# Compliance Rules\n\nAll invoices must be approved.\n\n# Approval Policy\n\nApprovals expire after 48 hours."
    chunks = chunk_text(text, document_id="test-doc")

    sections = {c.semantic_section for c in chunks}
    assert "Compliance Rules" in sections or "Approval Policy" in sections


def test_chunk_text_splits_long_paragraphs():
    from rag.client_rag.chunking_engine import chunk_text

    long_text = "This is a sentence. " * 500  # ~10,000 chars
    chunks = chunk_text(text=long_text, document_id="test-doc", chunk_size=200, chunk_overlap=20)

    assert len(chunks) > 1


def test_importance_scoring():
    from rag.client_rag.chunking_engine import _score_importance

    important = "This policy is mandatory and required for all compliance."
    unimportant = "The weather was nice today."

    assert _score_importance(important) > _score_importance(unimportant)


def test_retrieval_engine_scores_and_ranks():
    from rag.client_rag.retrieval_engine import RetrievalEngine

    mock_collection = MagicMock()
    mock_collection.count.return_value = 10
    mock_collection.query.return_value = {
        "documents": [["Compliance is mandatory for all processes.", "Weather is nice today."]],
        "metadatas": [
            [{"document_id": "d1", "importance_score": 0.9, "semantic_section": "compliance"},
             {"document_id": "d2", "importance_score": 0.1, "semantic_section": "misc"}],
        ],
        "distances": [[0.1, 0.9]],
        "ids": [["chunk-1", "chunk-2"]],
    }

    with patch("rag.client_rag.retrieval_engine.get_embedding_service") as mock_emb_svc:
        mock_emb_svc.return_value.embed_query.return_value = [0.1] * 384
        engine = RetrievalEngine(mock_collection)
        results = engine.search("compliance requirements", top_k=2)

    assert len(results) >= 1
    # Compliance chunk should score higher than weather
    assert results[0].document_id == "d1"


def test_deduplication_exact_match():
    from document_handling.deduplication_engine import check_for_duplicates

    existing = [{"id": "doc-1", "file_hash": "abc123", "text_sample": "Some content"}]
    result = check_for_duplicates("abc123", "Some content", existing)

    assert result.is_duplicate is True
    assert result.match_type == "exact"
    assert result.duplicate_document_id == "doc-1"


def test_deduplication_unique():
    from document_handling.deduplication_engine import check_for_duplicates

    existing = [{"id": "doc-1", "file_hash": "abc123", "text_sample": "Completely different text about finance."}]
    result = check_for_duplicates("def456", "Text about weather and nature walks.", existing)

    assert result.is_duplicate is False
    assert result.match_type == "unique"


def test_quality_scorer_empty_document():
    from document_handling.quality_scorer import score_document

    report = score_document("", file_type="txt", file_size=0)
    assert report.score == 0
    assert report.grade == "unusable"
    assert report.requires_human_review is True


def test_quality_scorer_good_document():
    from document_handling.quality_scorer import score_document

    good_text = """
# Invoice Processing Policy

This document outlines the mandatory requirements for processing invoices.

## Approval Requirements
All invoices above $1,000 must be approved by a manager.
Critical invoices require immediate escalation.

## Compliance
Invoice processing must comply with company policy and regulations.
"""
    report = score_document(good_text, file_type="txt", file_size=len(good_text))
    assert report.score > 60
    assert report.grade in ("excellent", "good", "acceptable")
