export interface ValidationResult {
  isValid: boolean;
  details: string[];
  sanitized?: string;
}

export function validateCommentInput(input: unknown): ValidationResult {
  const details: string[] = [];

  if (!input || typeof input !== "object") {
    return {
      isValid: false,
      details: ["Request body must be a valid JSON object."],
    };
  }

  const { content } = input as { content?: unknown };

  if (content === undefined || content === null || typeof content !== "string") {
    details.push("Comment content is required and must be a string.");
    return { isValid: false, details };
  }

  const trimmed = content.trim();

  if (trimmed.length === 0) {
    details.push("Comment content must not be empty or whitespace-only.");
  } else if (trimmed.length > 2000) {
    details.push("Comment content must not exceed 2,000 characters.");
  }

  return {
    isValid: details.length === 0,
    details,
    sanitized: trimmed,
  };
}
