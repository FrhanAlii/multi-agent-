from __future__ import annotations

import re
from dataclasses import dataclass

from utils.constants import (
    QUALITY_SCORE_EXCELLENT,
    QUALITY_SCORE_GOOD,
    QUALITY_SCORE_ACCEPTABLE,
    QUALITY_SCORE_POOR,
)
from utils.logging_config import get_logger

logger = get_logger(__name__)


@dataclass
class QualityReport:
    score: float                    # 0-100
    grade: str                      # excellent / good / acceptable / poor / unusable
    requires_human_review: bool
    issues: list[str]
    recommendations: list[str]
    metrics: dict[str, float]


def _grade(score: float) -> str:
    if score >= QUALITY_SCORE_EXCELLENT:
        return "excellent"
    if score >= QUALITY_SCORE_GOOD:
        return "good"
    if score >= QUALITY_SCORE_ACCEPTABLE:
        return "acceptable"
    if score >= QUALITY_SCORE_POOR:
        return "poor"
    return "unusable"


def score_document(text: str, file_type: str, file_size: int) -> QualityReport:
    issues: list[str] = []
    recommendations: list[str] = []
    metrics: dict[str, float] = {}

    # Length score (0-25)
    char_count = len(text)
    word_count = len(text.split())
    metrics["char_count"] = float(char_count)
    metrics["word_count"] = float(word_count)

    if char_count == 0:
        length_score = 0.0
        issues.append("Document has no extractable text")
    elif char_count < 100:
        length_score = 5.0
        issues.append("Document is extremely short")
    elif char_count < 500:
        length_score = 12.0
        recommendations.append("Document is very short — consider adding more content")
    elif char_count < 2000:
        length_score = 18.0
    else:
        length_score = 25.0

    # Readability score (0-25): ratio of alphabetic chars
    if char_count > 0:
        alpha_ratio = sum(1 for c in text if c.isalpha()) / char_count
        metrics["alpha_ratio"] = round(alpha_ratio, 3)
        if alpha_ratio < 0.3:
            readability_score = 5.0
            issues.append("High proportion of non-alphabetic characters (possible OCR artifact or binary data)")
        elif alpha_ratio < 0.5:
            readability_score = 12.0
            recommendations.append("Document contains many special characters — may affect extraction quality")
        elif alpha_ratio < 0.7:
            readability_score = 18.0
        else:
            readability_score = 25.0
    else:
        readability_score = 0.0

    # Completeness score (0-25): structured indicators
    has_sentences = bool(re.search(r"[.!?]", text))
    has_paragraphs = "\n\n" in text or text.count("\n") > 5
    has_structure = bool(re.search(r"^#|\d+\.\s|^-\s", text, re.MULTILINE))
    completeness_score = (8.0 if has_sentences else 0.0) + \
                         (8.0 if has_paragraphs else 0.0) + \
                         (9.0 if has_structure else 0.0)
    metrics["has_sentences"] = float(has_sentences)
    metrics["has_paragraphs"] = float(has_paragraphs)
    metrics["has_structure"] = float(has_structure)

    if not has_sentences:
        issues.append("No complete sentences detected")
    if not has_paragraphs:
        recommendations.append("Add paragraph structure to improve processing")

    # Corruption indicators (0-25)
    null_ratio = text.count("\x00") / max(1, char_count)
    gibberish_ratio = len(re.findall(r"[^\x09\x0a\x0d\x20-\x7e]", text)) / max(1, char_count)
    metrics["null_ratio"] = round(null_ratio, 4)
    metrics["gibberish_ratio"] = round(gibberish_ratio, 4)

    if null_ratio > 0.01:
        corruption_score = 0.0
        issues.append("Document contains null bytes — likely binary or corrupted")
    elif gibberish_ratio > 0.2:
        corruption_score = 8.0
        issues.append("High proportion of non-printable characters detected")
    elif gibberish_ratio > 0.05:
        corruption_score = 15.0
        recommendations.append("Some non-printable characters detected")
    else:
        corruption_score = 25.0

    total_score = round(length_score + readability_score + completeness_score + corruption_score, 1)
    grade = _grade(total_score)
    requires_review = total_score < QUALITY_SCORE_ACCEPTABLE or len(issues) > 0

    logger.info(
        "document_scored",
        score=total_score,
        grade=grade,
        file_type=file_type,
        issues=len(issues),
    )

    return QualityReport(
        score=total_score,
        grade=grade,
        requires_human_review=requires_review,
        issues=issues,
        recommendations=recommendations,
        metrics=metrics,
    )
