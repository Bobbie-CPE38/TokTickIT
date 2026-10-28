import { Request, Response, NextFunction } from "express";
import * as dashboardsService from "./dashboards.service.js";

export async function getRequesterDashboard(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    res.status(200).json(await dashboardsService.getRequesterDashboard(req.user!));
  } catch (error) {
    next(error);
  }
}

export async function getStaffDashboard(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    res.status(200).json(await dashboardsService.getStaffDashboard(req.user!));
  } catch (error) {
    next(error);
  }
}

export async function getAdminDashboard(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    res.status(200).json(await dashboardsService.getAdminDashboard(req.user!));
  } catch (error) {
    next(error);
  }
}
