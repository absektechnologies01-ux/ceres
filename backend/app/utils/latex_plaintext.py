import re

_SUPERSCRIPT_DIGITS = {
    '0': '\u2070', '1': '\u00b9', '2': '\u00b2', '3': '\u00b3', '4': '\u2074',
    '5': '\u2075', '6': '\u2076', '7': '\u2077', '8': '\u2078', '9': '\u2079',
    '+': '\u207a', '-': '\u207b', '=': '\u207c', '(': '\u207d', ')': '\u207e',
}

_SYMBOL_MAP = {
    r'\times': '×', r'\cdot': '·', r'\div': '÷', r'\pm': '±', r'\mp': '∓',
    r'\leq': '≤', r'\geq': '≥', r'\neq': '≠', r'\approx': '≈', r'\infty': '∞',
    r'\alpha': 'α', r'\beta': 'β', r'\gamma': 'γ', r'\delta': 'δ', r'\theta': 'θ',
    r'\lambda': 'λ', r'\mu': 'μ', r'\pi': 'π', r'\sigma': 'σ', r'\phi': 'φ',
    r'\omega': 'ω', r'\Delta': 'Δ', r'\Sigma': 'Σ', r'\int': '∫',
}


def _superscript(content: str) -> str:
    if all(c in _SUPERSCRIPT_DIGITS for c in content):
        return ''.join(_SUPERSCRIPT_DIGITS[c] for c in content)
    return f'^({content})'


def simplify_latex_for_pdf(text: str) -> str:
    """
    Converts a string that may contain LaTeX (as produced elsewhere in this
    codebase — \\(...\\) / \\[...\\] delimited, with \\frac, ^{...}, \\left/
    \\right, etc.) into a readable plain-text approximation for contexts
    that can't run a real math renderer (e.g. this PDF report, generated
    via xhtml2pdf, which has no JavaScript/KaTeX engine — unlike the web
    marking interface). Only handles the simple, mostly-inline expressions
    that appear in question labels; not a general LaTeX-to-text renderer.
    """
    if not text or '\\' not in text:
        return text

    result = text
    result = result.replace('\\(', '').replace('\\)', '')
    result = result.replace('\\[', '').replace('\\]', '')
    result = re.sub(r'\\left\s*([([{])', r'\1', result)
    result = re.sub(r'\\right\s*([)\]}])', r'\1', result)
    # Superscripts first — \frac's braces may themselves contain a ^{...},
    # and the (non-nesting) \frac pattern below can't match through that.
    result = re.sub(r'\^\{([^{}]*)\}', lambda m: _superscript(m.group(1)), result)
    result = re.sub(r'\^([0-9])', lambda m: _superscript(m.group(1)), result)
    result = re.sub(r'\\frac\{([^{}]*)\}\{([^{}]*)\}', r'(\1)/(\2)', result)
    result = result.replace('\\,', ' ').replace('\\;', ' ').replace('\\ ', ' ')

    for latex, symbol in _SYMBOL_MAP.items():
        result = result.replace(latex, symbol)

    result = re.sub(r'[ \t]+', ' ', result).strip()
    return result
