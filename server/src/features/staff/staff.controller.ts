import { Request, Response, NextFunction } from "express";
import { validateStaffQueueQuery } from "./staff.validation.js";
import * as staffService from "./staff.service.js";

export async function getStaffQueue(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const validation = validateStaffQueueQuery(req.query);
    if (!validation.isValid) {
      res.status(400).json({
        error: "Invalid query parameter",
        details: validation.details,
      });
      return;
    }

    const result = await staffService.getStaffQueue(validation.sanitized);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}
