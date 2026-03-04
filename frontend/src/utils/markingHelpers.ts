/**
 * Format marks display — shows halves as "0.5", "1.5" etc., not "1.500"
 */
export function formatMarks(marks: number | null): string {
  if (marks === null) return '—';
  if (Number.isInteger(marks)) return String(marks);
  // Show at most 1 decimal place, trimming trailing zeros
  return marks.toFixed(1);
}

/**
 * Round to nearest 0.5
 */
export function roundToHalf(value: number): number {
  return Math.round(value * 2) / 2;
}

/**
 * Compute total awarded marks from scores record
 */
export function computeTotal(
  scores: Record<string, { awarded_marks: number | null }>
): number {
  return Object.values(scores).reduce(
    (sum, s) => sum + (s.awarded_marks ?? 0),
    0
  );
}

/**
 * Compute max possible marks from scores record
 */
export function computeMax(
  scores: Record<string, { max_marks: number }>
): number {
  return Object.values(scores).reduce((sum, s) => sum + s.max_marks, 0);
}
