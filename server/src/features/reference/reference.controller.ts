import { Request, Response, NextFunction } from "express";
import * as referenceService from "./reference.service.js";

export function getHealth(_req: Request, res: Response): void {
  res.status(200).json({ status: "ok", service: "TokTickIT API" });
}

export async function getCategories(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const categories = await referenceService.fetchCategories();
    res.status(200).json(categories);
  } catch (error) {
    console.error("[API ERROR] /api/categories error:", error);
    res.status(500).json({ error: "Unable to load categories." });
  }
}

export async function getRelatedSystems(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const systems = await referenceService.fetchRelatedSystems();
    res.status(200).json(systems);
  } catch (error) {
    console.error("[API ERROR] /api/related-systems error:", error);
    res.status(500).json({ error: "Unable to load related systems." });
  }
}

export async function getActiveRequesters(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const requesters = await referenceService.fetchActiveRequesters();
    res.status(200).json(requesters);
  } catch (error) {
    console.error("[API ERROR] /api/requesters/active error:", error);
    res.status(500).json({ error: "Unable to load active requesters." });
  }
}
