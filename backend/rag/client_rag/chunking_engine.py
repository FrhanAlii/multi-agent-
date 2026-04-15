import re
from dataclasses import dataclass, field
from typing import Any
from utils.config import settings
from utils.logging_config import get_logger

logger = get_logger(__name__)


@dataclass
class Chunk:
    content: str
    chunk_number: int
    semantic_section: str
    chunk_type: str
    importance_score: float
    tokens: int
    metadata: dict[str, Any] = field(default_factory=dict)


SECTION_PATTERNS = [
    (re.compile(r"^#{1,3}\s+.+", re.MULTILINE), "heading"),
    (re.compile(r"^\d+\.\s+.+", re.MULTILINE), "numbered_list"),
    (re.compile(r"^[-*•]\s+.+", re.MULTILINE), "bullet_list"),
    (re.compile(r"^\|.+\|$", re.MULTILINE), "table"),
    (re.compile(r"```[\s\S]*?```", re.DOTALL), "code_block"),
]

IMPORTANT_KEYWORDS = [
    "must", "shall", "required", "mandatory", "critical", "important",
    "policy", "compliance", "regulation", "rule", "requirement",
    "deadline", "approval", "authorized", "prohibited", "exception",
]


def _estimate_tokens(text: str) -> int:
    return max(1, len(text) // 4)


def _score_importance(text: str) -> float:
    text_lower = text.lower()
    hits = sum(1 for kw in IMPORTANT_KEYWORDS if kw in text_lower)
    base = min(1.0, 0.3 + hits * 0.07)
    if len(text) < 100:
        base *= 0.8
    return round(base, 3)


def _detect_chunk_type(text: str) -> str:
    for pattern, chunk_type in SECTION_PATTERNS:
        if pattern.search(text):
            return chunk_type
    return "paragraph"


def _split_into_paragraphs(text: str) -> list[str]:
    paragraphs = re.split(r"\n{2,}", text.strip())
    return [p.strip() for p in paragraphs if p.strip()]


def _split_large_paragraph(text: str, max_size: int, overlap: int) -> list[str]:
    sentences = re.split(r"(?<=[.!?])\s+", text)
    chunks: list[str] = []
    current_parts: list[str] = []
    current_len = 0

    for sentence in sentences:
        s_len = len(sentence)
        if current_len + s_len > max_size and current_parts:
            chunks.append(" ".join(current_parts))
            # keep overlap
            overlap_text = " ".join(current_parts)[-overlap:]
            current_parts = [overlap_text, sentence] if overlap_text else [sentence]
            current_len = len(overlap_text) + s_len
        else:
            current_parts.append(sentence)
            current_len += s_len

    if current_parts:
        chunks.append(" ".join(current_parts))

    return chunks


def chunk_text(
    text: str,
    document_id: str,
    source_file: str = "",
    chunk_size: int | None = None,
    chunk_overlap: int | None = None,
) -> list[Chunk]:
    chunk_size = chunk_size or settings.chunk_size * 4  # char-based (approx 4 chars/token)
    chunk_overlap = chunk_overlap or settings.chunk_overlap * 4

    paragraphs = _split_into_paragraphs(text)
    chunks: list[Chunk] = []
    chunk_num = 0
    current_section = "introduction"

    for para in paragraphs:
        # Update section name if this looks like a heading
        heading_match = re.match(r"^#+\s+(.+)", para)
        if heading_match:
            current_section = heading_match.group(1).strip()

        if len(para) > chunk_size:
            sub_chunks = _split_large_paragraph(para, chunk_size, chunk_overlap)
        else:
            sub_chunks = [para]

        for sub in sub_chunks:
            if not sub.strip():
                continue
            chunk = Chunk(
                content=sub,
                chunk_number=chunk_num,
                semantic_section=current_section,
                chunk_type=_detect_chunk_type(sub),
                importance_score=_score_importance(sub),
                tokens=_estimate_tokens(sub),
                metadata={
                    "document_id": document_id,
                    "source_file": source_file,
                    "char_start": text.find(sub),
                },
            )
            chunks.append(chunk)
            chunk_num += 1

    logger.info("chunked_document", document_id=document_id, total_chunks=len(chunks))
    return chunks
