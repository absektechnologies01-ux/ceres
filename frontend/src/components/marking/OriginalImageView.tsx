import type { Sheet } from '../../types';

interface OriginalImageViewProps {
  sheets: Sheet[];
  activeQuestionSheetId?: string | null;
}

export default function OriginalImageView({ sheets, activeQuestionSheetId }: OriginalImageViewProps) {
  if (sheets.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        No images available for this submission.
      </div>
    );
  }

  // Sort sheets by upload_order, and prioritise the one containing the active question
  const sorted = [...sheets].sort((a, b) => {
    if (activeQuestionSheetId) {
      if (a.id === activeQuestionSheetId) return -1;
      if (b.id === activeQuestionSheetId) return 1;
    }
    return a.upload_order - b.upload_order;
  });

  return (
    <div className="overflow-y-auto h-full">
      <div className="space-y-4 p-4">
        {sorted.map((sheet) => (
          <div key={sheet.id}>
            {activeQuestionSheetId === sheet.id && (
              <p className="text-xs text-primary font-medium mb-1">
                Active question is on this sheet
              </p>
            )}
            <img
              src={sheet.image_url}
              alt={`Sheet ${sheet.upload_order}`}
              className="w-full rounded border border-gray-200 shadow-sm"
              loading="lazy"
            />
            <p className="text-xs text-gray-400 mt-1">Sheet #{sheet.upload_order}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
