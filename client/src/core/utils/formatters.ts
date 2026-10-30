/**
 * Reads the current URL query string (dashboard drill-down filters such as ?status=NEW).
 */
export function getQueryParams(): URLSearchParams {
  return new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
}

/**
 * Formats a timestamp for compact ticket lists, e.g. "May 12, 09:14 AM".
 */
export function formatShortDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Formats a file size in bytes to human-readable string (B, KB, MB).
 */
export function formatFileSize(bytes: number, kbDecimals: number = 0): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(kbDecimals)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
