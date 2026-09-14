import bcrypt from "bcryptjs";
import { getPrisma } from "../../prisma.js";
import {
  AuthUser,
  generateToken,
  blocklistToken,
} from "../../core/tokens.js";
import {
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  UnprocessableEntityError,
} from "../../core/errors.js";
import { validatePasswordComplexity } from "./auth.validation.js";

export async function login(email?: string, password?: string): Promise<{ token: string; user: AuthUser }> {
  if (!email || !password || typeof email !== "string" || typeof password !== "string") {
    throw new BadRequestError("Email and password are required.");
  }

  const prisma = getPrisma();
  const user = await prisma.user.findFirst({
    where: {
      email: {
        equals: email.trim(),
        mode: "insensitive",
      },
    },
  });

  if (!user) {
    throw new UnauthorizedError("Invalid email or password. Please try again.");
  }

  if (!user.isActive) {
    throw new ForbiddenError("Account is inactive. Please contact your system administrator.");
  }

  const passwordMatch = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatch) {
    throw new UnauthorizedError("Invalid email or password. Please try again.");
  }

  const safeUser: AuthUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    isActive: user.isActive,
    mustChangePassword: user.mustChangePassword,
  };

  const token = generateToken(safeUser);

  return {
    token,
    user: safeUser,
  };
}

export function logout(token?: string): { message: string } {
  if (token) {
    blocklistToken(token);
  }
  return { message: "Logged out successfully" };
}

export async function changePassword(
  userId: number,
  currentPassword?: string,
  newPassword?: string,
  confirmPassword?: string
): Promise<{ message: string }> {
  if (!currentPassword || !newPassword || !confirmPassword) {
    throw new BadRequestError("Current password, new password, and confirmation password are required.");
  }

  if (newPassword !== confirmPassword) {
    throw new BadRequestError("Passwords do not match.");
  }

  const prisma = getPrisma();
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new UnauthorizedError("User not found.");
  }

  const isCurrentValid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isCurrentValid) {
    throw new UnauthorizedError("Current password is incorrect.");
  }

  const complexity = validatePasswordComplexity(newPassword);
  if (!complexity.isValid) {
    throw new UnprocessableEntityError("Password does not meet complexity requirements", complexity.errors);
  }

  const newPasswordHash = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash: newPasswordHash,
      mustChangePassword: false,
    },
  });

  return { message: "Password changed successfully" };
}
