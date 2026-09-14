import { Request, Response, NextFunction } from "express";
import * as authService from "./auth.service.js";

export async function login(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { email, password } = req.body ?? {};
    const result = await authService.login(email, password);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export function logout(req: Request, res: Response): void {
  const result = authService.logout(req.token);
  res.status(200).json(result);
}

export function getMe(req: Request, res: Response): void {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  res.status(200).json(req.user);
}

export async function changePassword(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const { currentPassword, newPassword, confirmPassword } = req.body ?? {};
    const result = await authService.changePassword(
      req.user.id,
      currentPassword,
      newPassword,
      confirmPassword
    );
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}
