import bcrypt from "bcryptjs";
import { Role, Prisma } from "@prisma/client";
import { getPrisma } from "../../prisma.js";
import {
  ConflictError,
  NotFoundError,
  UnprocessableEntityError,
} from "../../core/errors.js";
import { AuthUser } from "../../core/tokens.js";
import {
  CreateUserInput,
  UpdateUserInput,
} from "./users.validation.js";

export async function getUsers(search?: string, role?: string) {
  const prisma = getPrisma();
  const where: Prisma.UserWhereInput = {};

  if (search && search.trim().length > 0) {
    const q = search.trim();
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
    ];
  }

  if (role && ["REQUESTER", "IT_STAFF", "ADMINISTRATOR"].includes(role)) {
    where.role = role as Role;
  }

  return prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      mustChangePassword: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { id: "asc" },
  });
}

export async function createUser(data: CreateUserInput) {
  const prisma = getPrisma();

  // Check unique email (BR-09)
  const existing = await prisma.user.findFirst({
    where: { email: { equals: data.email, mode: "insensitive" } },
  });

  if (existing) {
    throw new ConflictError("An account with this email address already exists");
  }

  const passwordHash = await bcrypt.hash(data.initialPassword, 10);

  return prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      role: data.role,
      isActive: data.isActive ?? true,
      passwordHash,
      mustChangePassword: true,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      mustChangePassword: true,
      createdAt: true,
    },
  });
}

export async function updateUser(
  targetId: number,
  updaterUser: AuthUser,
  data: UpdateUserInput
) {
  const prisma = getPrisma();

  const targetUser = await prisma.user.findUnique({
    where: { id: targetId },
  });

  if (!targetUser) {
    throw new NotFoundError("User not found");
  }

  // Safety Guard: Self-deactivation or changing own role away from ADMINISTRATOR (BR-16)
  if (updaterUser.id === targetId) {
    if (data.isActive === false) {
      throw new UnprocessableEntityError("You cannot deactivate your own account");
    }
    if (data.role !== undefined && data.role !== "ADMINISTRATOR") {
      throw new UnprocessableEntityError(
        "You cannot change your own role away from Administrator"
      );
    }
  }

  // Safety Guard: Last active administrator protection (BR-17)
  const isTargetActiveAdmin =
    targetUser.role === "ADMINISTRATOR" && targetUser.isActive;
  const isDeactivating = data.isActive === false;
  const isChangingAdminRole =
    data.role !== undefined && data.role !== "ADMINISTRATOR";

  if (isTargetActiveAdmin && (isDeactivating || isChangingAdminRole)) {
    const activeAdminCount = await prisma.user.count({
      where: { role: "ADMINISTRATOR", isActive: true },
    });
    if (activeAdminCount <= 1) {
      throw new UnprocessableEntityError(
        "Cannot deactivate the last remaining active Administrator"
      );
    }
  }

  // Duplicate email check if email is being updated (BR-09)
  if (data.email && data.email.toLowerCase() !== targetUser.email.toLowerCase()) {
    const emailExists = await prisma.user.findFirst({
      where: {
        email: { equals: data.email, mode: "insensitive" },
        id: { not: targetId },
      },
    });
    if (emailExists) {
      throw new ConflictError("An account with this email address already exists");
    }
  }

  // Persist update (Never delete User per BR-18)
  return prisma.user.update({
    where: { id: targetId },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.email !== undefined ? { email: data.email } : {}),
      ...(data.role !== undefined ? { role: data.role } : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      mustChangePassword: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function resetPassword(targetId: number, initialPassword: string) {
  const prisma = getPrisma();

  const targetUser = await prisma.user.findUnique({
    where: { id: targetId },
  });

  if (!targetUser) {
    throw new NotFoundError("User not found");
  }

  const passwordHash = await bcrypt.hash(initialPassword, 10);

  await prisma.user.update({
    where: { id: targetId },
    data: {
      passwordHash,
      mustChangePassword: true,
    },
  });

  return {
    message: "Initial password reset successfully",
    userId: targetId,
    mustChangePassword: true,
  };
}
