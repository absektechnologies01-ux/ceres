import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import type { AiSuggestion, SubmissionQuestion, Sheet } from '../../types';
import { submissionsApi } from '../../api/submissions';
import { useMarkingStore } from '../../store/markingStore';
import OriginalImageView from './OriginalImageView';
import Spinner from '../ui/Spinner';

const MARKDOWN_PROSE_CLASSES =
  '[&_p]:mb-2 last:[&_p]:mb-0 ' +
  '[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-2 [&_li]:mb-0.5 ' +
  '[&_table]:w-full [&_table]:border-collapse [&_table]:my-2 ' +
  '[&_th]:border [&_th]:border-gray-300 [&_th]:bg-gray-50 [&_th]:px-2 [&_th]:py-1.5 [&_th]:text-left [&_th]:font-semibold ' +
  '[&_td]:border [&_td]:border-gray-300 [&_td]:px-2 [&_td]:py-1.5 ' +
  '[&_strong]:font-semibold [&_em]:italic';

/** Converts this system's \(...\)/\[...\] LaTeX delimiters (used
 * consistently across the backend's scheme/OCR parsing and AI prompts)
 * into the $.../$$...$$ syntax remark-math looks for. */
function convertLatexDelimiters(text: string): string {
  return text
    .replace(/\\\[([\s\S]+?)\\\]/g, (_match, body) => `$$${body}$$`)
    .replace(/\\\(([\s\S]+?)\\\)/g, (_match, body) => `$${body}$`);
}

function MarkdownContent({ content, className = '' }: { content: string; className?: string }) {
  return (
    <div className={`${MARKDOWN_PROSE_CLASSES} ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
        {convertLatexDelimiters(content)}
      </ReactMarkdown>
    </div>
  );
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
  const activeSubmissionId = useMarkingStore((s) => s.activeSubmissionId);

  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<AiSuggestion | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  // Reset AI suggestion state when the active question changes — otherwise
  // a stale suggestion from a previous question could keep showing while a
  // different one is displayed, which would be actively misleading.
  useEffect(() => {
    setAiLoading(false);
    setAiSuggestion(null);
    setAiError(null);
  }, [question?.question_number]);

  if (!question) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        Select a question from the panel on the right.
      </div>
    );
  }

  const handleGetAiSuggestion = async () => {
    if (!activeSubmissionId) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const result = await submissionsApi.getAiSuggestion(activeSubmissionId, question);
      setAiSuggestion(result);
    } catch {
      setAiError('Could not get an AI suggestion right now. Please try again.');
    } finally {
      setAiLoading(false);
    }
  };

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
                <MarkdownContent content={question.question_text} className="text-sm text-gray-900 leading-relaxed" />
              </div>
            )}

            {/* Student answer */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Student's Answer</p>
              {question.text_content && question.text_content !== 'No answer found for this question.' ? (
                <MarkdownContent content={question.text_content} className="text-sm text-gray-800 leading-relaxed" />
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
                  <MarkdownContent
                    content={question.expected_answer}
                    className="mt-2 rounded-md bg-blue-50 border border-blue-100 px-4 py-3 text-sm text-blue-900 leading-relaxed"
                  />
                )}
              </div>
            )}

            {/* AI suggestion — advisory only, on-demand */}
            <div className="border-t border-gray-100 pt-4">
              {!aiSuggestion && (
                <button
                  onClick={handleGetAiSuggestion}
                  disabled={aiLoading}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium border transition-colors
                    border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-primary hover:text-primary
                    focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                >
                  {aiLoading ? (
                    <>
                      <Spinner size="sm" />
                      Getting AI suggestion…
                    </>
                  ) : (
                    'Get AI Suggestion'
                  )}
                </button>
              )}

              {aiError && (
                <div className="mt-2 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                  {aiError}
                </div>
              )}

              {aiSuggestion && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                      AI Suggestion (advisory only — not saved)
                    </p>
                    <button
                      onClick={handleGetAiSuggestion}
                      disabled={aiLoading}
                      className="text-xs text-primary hover:underline focus:outline-none disabled:opacity-50"
                    >
                      {aiLoading ? 'Refreshing…' : 'Regenerate'}
                    </button>
                  </div>

                  <div className="rounded-md bg-purple-50 border border-purple-100 px-4 py-3">
                    <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-1">
                      Independent AI Answer
                    </p>
                    <MarkdownContent content={aiSuggestion.ai_answer} className="text-sm text-purple-900 leading-relaxed" />
                  </div>

                  <div className="rounded-md bg-purple-50 border border-purple-100 px-4 py-3">
                    <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-1">
                      Suggested Score
                    </p>
                    <p className="text-sm font-semibold text-purple-900">
                      {aiSuggestion.suggested_score} / {question.max_marks}
                    </p>
                    {aiSuggestion.rationale && (
                      <p className="text-sm text-purple-800 mt-1 leading-relaxed">{aiSuggestion.rationale}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
