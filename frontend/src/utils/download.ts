export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Reads the detail message out of an axios error whose response body was
 * requested as a Blob (e.g. a PDF endpoint) — the error body still arrives
 * as a Blob in that case, not parsed JSON, so it needs to be read as text
 * and parsed manually to surface the backend's actual error message. */
export async function extractErrorMessage(
  error: unknown,
  fallback = 'Something went wrong. Please try again.'
): Promise<string> {
  const data = (error as { response?: { data?: unknown } })?.response?.data;
  if (data instanceof Blob) {
    try {
      const parsed = JSON.parse(await data.text());
      if (typeof parsed?.detail === 'string') return parsed.detail;
    } catch {
      // fall through to fallback
    }
  }
  return fallback;
}
