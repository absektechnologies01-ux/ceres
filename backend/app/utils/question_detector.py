import re
from typing import List, Dict

QUESTION_LABEL_PATTERN = re.compile(
    r'(?:^|\n)\s*((?:Q|q|Question|question|QUESTION)\s*\.?\s*(\d+[a-zA-Z]?))\b',
    re.MULTILINE
)
_HTML_TAG_RE = re.compile(r'<[^>]+>')


def _strip_html(text: str) -> str:
    """Strip HTML tags and decode common entities to plain text."""
    plain = _HTML_TAG_RE.sub(' ', text)
    plain = plain.replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>').replace('&nbsp;', ' ')
    plain = re.sub(r'\n{3,}', '\n\n', plain)
    return plain


def detect_questions(ocr_text: str, ocr_metadata: dict = None) -> List[Dict]:
    """
    Detects question labels in OCR text and returns structured list.
    HTML is stripped before detection so tags don't interfere with matching.
    Each item: { label, question_number, start_pos, text_content }
    """
    plain = _strip_html(ocr_text)
    questions = []
    matches = list(QUESTION_LABEL_PATTERN.finditer(plain))

    for i, match in enumerate(matches):
        start = match.start()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(plain)
        questions.append({
            "label": match.group(1).strip(),
            "question_number": match.group(2).strip(),
            "start_pos": start,
            "text_content": plain[match.end():end].strip()
        })

    return questions
