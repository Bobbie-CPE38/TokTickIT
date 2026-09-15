/**
 * Formats a file size in bytes to human-readable string (B, KB, MB).
 */
export function formatFileSize(bytes: number, kbDecimals: number = 0): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(kbDecimals)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
