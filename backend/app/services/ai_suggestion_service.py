import json
import re

import httpx

from app.config import settings

_MATH_FORMAT_INSTRUCTION = (
    "Format any mathematical notation using LaTeX delimiters: \\(...\\) for "
    "inline math and \\[...\\] for display/block math. Do not use $ or $$."
)


class AiSuggestionError(Exception):
    """Raised when the AI suggestion can't be produced (missing config,
    DeepSeek API failure, or an unparseable response)."""


async def _chat_completion(prompt: str, json_mode: bool = False) -> str:
    if not settings.DEEPSEEK_API_KEY:
        raise AiSuggestionError("DeepSeek API key is not configured.")

    payload = {
        "model": "deepseek-chat",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.2,
    }
    if json_mode:
        payload["response_format"] = {"type": "json_object"}

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                settings.DEEPSEEK_API_URL,
                json=payload,
                headers={"Authorization": f"Bearer {settings.DEEPSEEK_API_KEY}"},
            )
            response.raise_for_status()
            data = response.json()
    except httpx.HTTPError as exc:
        raise AiSuggestionError(f"DeepSeek API request failed: {exc}") from exc

    try:
        return data["choices"][0]["message"]["content"]
    except (KeyError, IndexError) as exc:
        raise AiSuggestionError("DeepSeek API returned an unexpected response shape.") from exc


async def generate_independent_answer(question_text: str) -> str:
    """Generates the AI's own answer to the question — deliberately without
    seeing the marking scheme's expected answer, so it's a genuinely
    independent second reference point for the teacher (catching cases
    where the scheme itself is wrong, unclear, or was mis-parsed)."""
    prompt = (
        "You are an expert subject-matter teacher. Answer the following "
        "exam question directly and completely, exactly as a model student "
        f"would, showing your working if it's a calculation. {_MATH_FORMAT_INSTRUCTION}\n\n"
        f"Question:\n{question_text}"
    )
    answer = await _chat_completion(prompt)
    return answer.strip()


def _parse_json_response(raw: str) -> dict:
    text = raw.strip()
    fence_match = re.match(r'^```(?:json)?\s*([\s\S]+?)\s*```$', text)
    if fence_match:
        text = fence_match.group(1)
    return json.loads(text)


async def suggest_score(
    question_text: str,
    max_marks: float,
    expected_answer: str,
    ai_answer: str,
    student_answer: str,
) -> dict:
    """Suggests a score for the student's answer by comparing it against
    both the marking scheme's expected answer and the independently
    generated AI answer. Returns {"score": float, "rationale": str}."""
    prompt = (
        "You are grading a student's exam answer. You are given the "
        "question, the maximum marks available, the official marking "
        "scheme's expected answer, an independently generated model answer "
        "(for cross-reference), and the student's actual answer. Compare "
        "the student's answer against both reference answers and suggest a "
        "fair score out of the maximum marks. Respond with ONLY a JSON "
        'object of the exact shape {"score": <number between 0 and '
        f'{max_marks}>, "rationale": "<one or two sentence explanation>"}}.\n\n'
        f"Question:\n{question_text}\n\n"
        f"Maximum marks: {max_marks}\n\n"
        f"Marking scheme's expected answer:\n{expected_answer}\n\n"
        f"Independent model answer:\n{ai_answer}\n\n"
        f"Student's answer:\n{student_answer}"
    )
    raw = await _chat_completion(prompt, json_mode=True)

    try:
        parsed = _parse_json_response(raw)
        score = float(parsed["score"])
        rationale = str(parsed.get("rationale", "")).strip()
    except (json.JSONDecodeError, KeyError, TypeError, ValueError) as exc:
        raise AiSuggestionError("DeepSeek returned an unparseable scoring response.") from exc

    score = max(0.0, min(score, max_marks))
    return {"score": score, "rationale": rationale}


async def generate_class_insights(question_stats: list, class_name: str, course_name: str) -> str:
    """Generates class-wide teaching insights for the session report by
    analyzing aggregate per-question performance — e.g. flagging a
    question/topic the class struggled with and suggesting what to
    review. One call per report, not per student."""
    stats_lines = []
    for q in question_stats:
        pct = (q["average_score"] / q["max_marks"] * 100) if q["max_marks"] else 0
        stats_lines.append(
            f"- {q['label']} ({q.get('question_text') or 'no question text available'}): "
            f"class average {q['average_score']:.1f}/{q['max_marks']:.1f} ({pct:.0f}%), "
            f"lowest {q['min_score']:.1f}, highest {q['max_score']:.1f}"
        )
    stats_block = '\n'.join(stats_lines)

    prompt = (
        "You are an experienced teacher reviewing exam results for a class. "
        f"Below is the class-wide performance breakdown for {course_name} "
        f"({class_name}), one line per question. Identify which topics/"
        "questions the class struggled with, and give 2-4 short, concrete, "
        "actionable teaching suggestions for what to review or reteach. Be "
        "specific to the weak areas, not generic advice. Keep it concise "
        "(a short paragraph or a few bullet points). Do not use markdown "
        "headers; plain sentences or simple '-' bullet points only.\n\n"
        f"{stats_block}"
    )
    insights = await _chat_completion(prompt)
    return insights.strip()
