/**
 * Validates password complexity per BR-07:
 * Minimum 8 characters, containing uppercase, lowercase, numeric digit, and special character.
 */
export function validatePasswordComplexity(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!password || password.length < 8) {
    errors.push("Must be at least 8 characters");
  }

  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  if (!hasUpper || !hasLower) {
    errors.push("Must include upper and lower case letters");
  }

  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password);
  if (!hasNumber || !hasSpecial) {
    errors.push("Must include a number and special character");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
