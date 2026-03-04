import { useState } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import type { SubmissionQuestion, Sheet } from '../../types';
import OriginalImageView from './OriginalImageView';

/** Returns true if the string looks like an HTML document from Datalab. */
function isHtmlContent(text: string): boolean {
  const t = text.trimStart();
  return t.startsWith('<!DOCTYPE') || t.startsWith('<html') || t.startsWith('<p') || t.startsWith('<ul') || t.startsWith('<ol');
}

/** Extracts just the <body> inner content from a full HTML document. */
function extractBodyHtml(html: string): string {
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return bodyMatch ? bodyMatch[1].trim() : html;
}

/** Escapes HTML special characters so plain text is safe to inject via innerHTML. */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\n/g, '<br>');
}

/**
 * Finds LaTeX math delimiters in a string and replaces them with KaTeX-rendered
 * HTML. Handles \begin{env}...\end{env}, $$...$$, \[...\], \(...\), and $...$.
 * Falls back to the raw expression on any parse error.
 */
function renderLatex(input: string): string {
  const tryRender = (latex: string, display: boolean, fallback: string): string => {
    try {
      return katex.renderToString(latex, { displayMode: display, throwOnError: false, output: 'html' });
    } catch {
      return fallback;
    }
  };

  return input
    // \begin{env}...\end{env} — must come first to avoid partial matches
    .replace(/\\begin\{([^}]+)\}([\s\S]+?)\\end\{\1\}/g, (match, env, body) =>
      tryRender(`\\begin{${env}}${body}\\end{${env}}`, true, match)
    )
    // $$...$$ (display)
    .replace(/\$\$([\s\S]+?)\$\$/g, (match, body) => tryRender(body, true, match))
    // \[...\] (display)
    .replace(/\\\[([\s\S]+?)\\\]/g, (match, body) => tryRender(body, true, match))
    // \(...\) (inline)
    .replace(/\\\(([\s\S]+?)\\\)/g, (match, body) => tryRender(body, false, match))
    // $...$ (inline) — avoid matching $$
    .replace(/(?<!\$)\$(?!\$)((?:[^$\n\\]|\\.)+?)\$(?!\$)/g, (match, body) =>
      tryRender(body, false, match)
    );
}

/** Prepares content for dangerouslySetInnerHTML: extracts body if HTML, escapes if plain, then renders LaTeX. */
function prepareContent(text: string): string {
  const base = isHtmlContent(text) ? extractBodyHtml(text) : escapeHtml(text);
  return renderLatex(base);
}

interface QuestionDisplayProps {
  question: SubmissionQuestion | null;
  sheets: Sheet[];
  showImage: boolean;
  onToggleImage: () => void;
}

export default function QuestionDisplay({
  question,
  sheets,
  showImage,
  onToggleImage,
}: QuestionDisplayProps) {
  const [schemeExpanded, setSchemeExpanded] = useState(false);

  if (!question) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        Select a question from the panel on the right.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 flex-shrink-0">
        <div>
          <span className="text-xs text-gray-500 uppercase tracking-wide">Question</span>
          <h2 className="text-lg font-semibold text-gray-900 font-mono">{question.label}</h2>
        </div>
        <button
          onClick={onToggleImage}
          className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium border transition-colors
            border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-primary hover:text-primary
            focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {showImage ? (
            <>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Show OCR Text
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Show Original Image
            </>
          )}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {showImage ? (
          <OriginalImageView sheets={sheets} activeQuestionSheetId={question.sheet_id} />
        ) : (
          <div className="h-full overflow-y-auto px-6 py-4 space-y-5">
            {/* Question text */}
            {question.question_text && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Question</p>
                <div
                  className="text-sm text-gray-900 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: prepareContent(question.question_text) }}
                />
              </div>
            )}

            {/* Student answer */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Student's Answer</p>
              {question.text_content && question.text_content !== 'No answer found for this question.' ? (
                <div
                  className="text-sm text-gray-800 leading-relaxed [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-2 [&_li]:mb-0.5"
                  dangerouslySetInnerHTML={{ __html: prepareContent(question.text_content) }}
                />
              ) : (
                <div className="rounded-md bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700">
                  No answer found for this question.
                </div>
              )}
            </div>

            {/* Marking scheme answer — collapsible */}
            {question.expected_answer && (
              <div className="border-t border-gray-100 pt-4">
                <button
                  onClick={() => setSchemeExpanded((x) => !x)}
                  className="flex items-center gap-2 text-sm font-medium text-primary hover:underline focus:outline-none"
                >
                  <svg
                    className={`h-4 w-4 transition-transform ${schemeExpanded ? 'rotate-90' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  Marking Scheme Answer
                </button>
                {schemeExpanded && (
                  <div
                    className="mt-2 rounded-md bg-blue-50 border border-blue-100 px-4 py-3 text-sm text-blue-900 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: prepareContent(question.expected_answer) }}
                  />
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
