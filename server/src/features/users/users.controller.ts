import { Request, Response, NextFunction } from "express";
import * as usersService from "./users.service.js";
import {
  validateCreateUser,
  validateUpdateUser,
  validateResetPassword,
} from "./users.validation.js";
import { BadRequestError, UnauthorizedError } from "../../core/errors.js";

export async function getUsers(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const search = req.query.search as string | undefined;
    const role = req.query.role as string | undefined;

    const users = await usersService.getUsers(search, role);
    res.status(200).json(users);
  } catch (err) {
    next(err);
  }
}

export async function createUser(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const validatedData = validateCreateUser(req.body);
    const user = await usersService.createUser(validatedData);
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
}

export async function updateUser(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const targetId = parseInt(req.params.id, 10);
    if (isNaN(targetId)) {
      throw new BadRequestError("Invalid user ID");
    }

    if (!req.user) {
      throw new UnauthorizedError("Unauthorized");
    }

    const validatedData = validateUpdateUser(req.body);
    const updatedUser = await usersService.updateUser(
      targetId,
      req.user,
      validatedData
    );
    res.status(200).json(updatedUser);
  } catch (err) {
    next(err);
  }
}

export async function resetPassword(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const targetId = parseInt(req.params.id, 10);
    if (isNaN(targetId)) {
      throw new BadRequestError("Invalid user ID");
    }

    const { initialPassword } = validateResetPassword(req.body);
    const result = await usersService.resetPassword(targetId, initialPassword);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}
