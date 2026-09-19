import { Request, Response, NextFunction } from "express";
import {
  validateStaffQueueQuery,
  validateAssignmentInput,
  validatePriorityInput,
} from "./staff.validation.js";
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

export async function getStaffTicketDetail(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const ticketId = parseInt(req.params.id, 10);
    if (isNaN(ticketId)) {
      res.status(400).json({ error: "Invalid ticket ID provided." });
      return;
    }

    const ticket = await staffService.getStaffTicketDetail(ticketId);
    res.status(200).json(ticket);
  } catch (error) {
    next(error);
  }
}

export async function assignTicket(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const ticketId = parseInt(req.params.id, 10);
    if (isNaN(ticketId)) {
      res.status(400).json({ error: "Invalid ticket ID provided." });
      return;
    }

    const validation = validateAssignmentInput(req.body);
    if (!validation.isValid) {
      res.status(400).json({ error: "Invalid assignment payload", details: validation.details });
      return;
    }

    const result = await staffService.assignTicket(ticketId, validation.ticketOwnerId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function updateTicketPriority(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const ticketId = parseInt(req.params.id, 10);
    if (isNaN(ticketId)) {
      res.status(400).json({ error: "Invalid ticket ID provided." });
      return;
    }

    const validation = validatePriorityInput(req.body);
    if (!validation.isValid) {
      res.status(400).json({ error: "Invalid priority payload", details: validation.details });
      return;
    }

    const result = await staffService.updateTicketPriority(ticketId, validation.itPriority);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function updateTicketStatus(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const ticketId = parseInt(req.params.id, 10);
    if (isNaN(ticketId)) {
      res.status(400).json({ error: "Invalid ticket ID provided." });
      return;
    }

    const { currentStatus, resolutionSummary } = req.body || {};
    const result = await staffService.updateTicketStatus(ticketId, currentStatus, resolutionSummary);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function getStaffAssignees(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const assignees = await staffService.getStaffAssignees();
    res.status(200).json(assignees);
  } catch (error) {
    next(error);
  }
}

