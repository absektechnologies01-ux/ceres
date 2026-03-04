import re
from typing import Optional, Tuple

# Strict: 10 consecutive digits
_STRICT_ID_RE = re.compile(r'\b(\d{10})\b')
# Flexible: 10 digits that may have spaces or dashes between them (OCR splits boxed cells)
_FLEXIBLE_ID_RE = re.compile(r'\b(\d[\s\-]{0,2}){9}\d\b')
_HTML_TAG_PATTERN = re.compile(r'<[^>]+>')


def _strip_html(text: str) -> str:
    """Strip HTML tags and decode common entities to plain text."""
    plain = _HTML_TAG_PATTERN.sub(' ', text)
    plain = plain.replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>').replace('&nbsp;', ' ')
    return plain


def _digits_only(s: str) -> str:
    return re.sub(r'\D', '', s)


def _find_id_in_text(text: str) -> Optional[str]:
    """
    Try strict 10-digit match first, then flexible (spaces/dashes between digits).
    Returns the normalised 10-digit string or None.
    """
    m = _STRICT_ID_RE.search(text)
    if m:
        return m.group()
    m = _FLEXIBLE_ID_RE.search(text)
    if m:
        candidate = _digits_only(m.group())
        if len(candidate) == 10:
            return candidate
    return None


def extract_student_id(ocr_text: str, ocr_metadata: dict) -> Tuple[Optional[str], float]:
    """
    Extracts student ID from OCR output.
    Strategy 1: positional metadata (top portion of page, any horizontal position).
    Strategy 2: full-text scan with flexible digit matching.
    Returns (student_id, confidence_score).
    """
    # Strategy 1: positional metadata blocks
    if ocr_metadata and "blocks" in ocr_metadata:
        top_candidates = _extract_top_candidates(ocr_metadata)
        for candidate in top_candidates:
            sid = _find_id_in_text(candidate["text"])
            if sid:
                return sid, candidate.get("confidence", 0.85)

    # Strategy 2: full text scan (strip HTML first)
    plain = _strip_html(ocr_text)
    sid = _find_id_in_text(plain)
    if sid:
        return sid, 0.65

    return None, 0.0


def _extract_top_candidates(metadata: dict) -> list:
    """
    Filter OCR blocks that appear in the top third of the page.
    Widened from top-right only to full width so IDs in any column are found.
    """
    candidates = []
    page_h = metadata.get("page_height", 1)
    for block in metadata.get("blocks", []):
        bbox = block.get("bbox", {})
        y = bbox.get("y", 0)
        # Top third of the page (was top-right 25% — too restrictive)
        if y < page_h * 0.35:
            candidates.append({
                "text": block.get("text", ""),
                "confidence": block.get("confidence", 0.75),
            })
    return candidates
