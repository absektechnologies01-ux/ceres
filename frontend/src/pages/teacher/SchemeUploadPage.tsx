import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { schemesApi } from '../../api/schemes';
import type { MarkingScheme, SchemeQuestion } from '../../types';
import TopBar from '../../components/layout/TopBar';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';

export default function SchemeUploadPage() {
  const { id } = useParams<{ id: string }>();
  const [scheme, setScheme] = useState<MarkingScheme | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!id) return;
    schemesApi.get(id)
      .then(setScheme)
      .catch(() => { /* no scheme yet */ })
      .finally(() => setLoading(false));
  }, [id]);

  const handleFile = async (file: File) => {
    if (!id) return;
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['pdf', 'docx', 'doc'].includes(ext ?? '')) {
      setError('Only PDF or Word (.docx/.doc) files are supported.');
      return;
    }
    setError('');
    setUploading(true);
    try {
      const result = await schemesApi.upload(id, file);
      if (!result.questions || result.questions.length === 0) {
        setError('Could not parse questions from this document. Please ensure questions are labelled as Q1, Question 1, etc. with marks in parentheses e.g. (10 marks)');
        return;
      }
      setScheme(result);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg ?? 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  if (loading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;

  return (
    <div>
      <TopBar title="Marking Scheme" backTo={`/teacher/sessions/${id}`} />
      <div className="p-6 max-w-3xl">
        {/* Upload area */}
        <div
          onDrop={onDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => fileRef.current?.click()}
          className={`
            border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors
            ${dragOver ? 'border-primary bg-primary-light' : 'border-gray-300 hover:border-primary hover:bg-gray-50'}
          `}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.docx,.doc"
            className="hidden"
            onChange={onInputChange}
          />
          {uploading ? (
            <div className="flex flex-col items-center gap-3">
              <Spinner size="lg" />
              <p className="text-sm text-gray-600">Uploading and parsing…</p>
            </div>
          ) : (
            <>
              <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-sm font-medium text-gray-700">
                {scheme ? 'Drop a new file to replace the scheme' : 'Drop your marking scheme here'}
              </p>
              <p className="text-xs text-gray-400 mt-1">PDF or Word (.docx/.doc) — up to 10MB</p>
              <Button variant="secondary" size="sm" className="mt-4" onClick={(e) => e.stopPropagation()}>
                Browse file
              </Button>
            </>
          )}
        </div>

        {error && (
          <div className="mt-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Parsed questions preview */}
        {scheme && scheme.questions.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800">
                Parsed Questions ({scheme.questions.length})
              </h3>
              <Link to={`/teacher/sessions/${id}/marking`}>
                <Button variant="primary" size="sm">Go to Marking →</Button>
              </Link>
            </div>
            <div className="rounded-lg border border-gray-200 overflow-hidden">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-primary">
                  <tr>
                    {['Question', 'Max Marks', 'Expected Answer'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {scheme.questions.map((q: SchemeQuestion, i: number) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-3 text-sm font-mono text-gray-700">Q{q.question_number}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{q.max_marks}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">{q.expected_answer || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
