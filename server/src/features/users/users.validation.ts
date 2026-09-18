import { Role } from "@prisma/client";
import { BadRequestError, UnprocessableEntityError } from "../../core/errors.js";

const VALID_ROLES: Role[] = ["REQUESTER", "IT_STAFF", "ADMINISTRATOR"];

export interface CreateUserInput {
  name: string;
  email: string;
  role: Role;
  isActive?: boolean;
  initialPassword: string;
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  role?: Role;
  isActive?: boolean;
}

export interface ResetPasswordInput {
  initialPassword: string;
}

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

export function validateCreateUser(body: any): CreateUserInput {
  if (!body || typeof body !== "object") {
    throw new BadRequestError("Request body must be a JSON object");
  }

  const { name, email, role, isActive, initialPassword } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    throw new BadRequestError("Name is required and cannot be empty");
  }

  if (!email || typeof email !== "string" || email.trim().length === 0) {
    throw new BadRequestError("Email is required and cannot be empty");
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    throw new BadRequestError("Invalid email address format");
  }

  if (!role || !VALID_ROLES.includes(role)) {
    throw new UnprocessableEntityError("Invalid user role", [
      `Role must be one of: ${VALID_ROLES.join(", ")}`,
    ]);
  }

  if (!initialPassword || typeof initialPassword !== "string") {
    throw new BadRequestError("Initial password is required");
  }

  const pwdCheck = validatePasswordComplexity(initialPassword);
  if (!pwdCheck.isValid) {
    throw new UnprocessableEntityError(
      "Initial password does not meet complexity requirements",
      pwdCheck.errors
    );
  }

  return {
    name: name.trim(),
    email: email.trim().toLowerCase(),
    role,
    isActive: typeof isActive === "boolean" ? isActive : true,
    initialPassword,
  };
}

export function validateUpdateUser(body: any): UpdateUserInput {
  if (!body || typeof body !== "object") {
    throw new BadRequestError("Request body must be a JSON object");
  }

  const result: UpdateUserInput = {};

  if ("name" in body) {
    if (typeof body.name !== "string" || body.name.trim().length === 0) {
      throw new BadRequestError("Name cannot be empty");
    }
    result.name = body.name.trim();
  }

  if ("email" in body) {
    if (typeof body.email !== "string" || body.email.trim().length === 0) {
      throw new BadRequestError("Email cannot be empty");
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email.trim())) {
      throw new BadRequestError("Invalid email address format");
    }
    result.email = body.email.trim().toLowerCase();
  }

  if ("role" in body) {
    if (!VALID_ROLES.includes(body.role)) {
      throw new UnprocessableEntityError("Invalid user role", [
        `Role must be one of: ${VALID_ROLES.join(", ")}`,
      ]);
    }
    result.role = body.role;
  }

  if ("isActive" in body) {
    if (typeof body.isActive !== "boolean") {
      throw new BadRequestError("isActive must be a boolean");
    }
    result.isActive = body.isActive;
  }

  return result;
}

export function validateResetPassword(body: any): ResetPasswordInput {
  if (!body || typeof body !== "object") {
    throw new BadRequestError("Request body must be a JSON object");
  }

  const { initialPassword } = body;

  if (!initialPassword || typeof initialPassword !== "string") {
    throw new BadRequestError("Initial password is required");
  }

  const pwdCheck = validatePasswordComplexity(initialPassword);
  if (!pwdCheck.isValid) {
    throw new UnprocessableEntityError(
      "Initial password does not meet complexity requirements",
      pwdCheck.errors
    );
  }

  return { initialPassword };
}
