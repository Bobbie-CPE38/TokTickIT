import { Request, Response, NextFunction } from "express";
import { BadRequestError } from "../../core/errors.js";
import * as actionsTakenService from "./actions-taken.service.js";

export async function getTicketActions(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const ticketId = parseInt(req.params.id, 10);
    if (isNaN(ticketId)) {
      throw new BadRequestError("Invalid ticket ID provided.");
    }

    const actions = await actionsTakenService.fetchTicketActions(
      ticketId,
      req.user!
    );
    res.status(200).json(actions);
  } catch (error) {
    next(error);
  }
}

export async function createTicketAction(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const ticketId = parseInt(req.params.id, 10);
    if (isNaN(ticketId)) {
      throw new BadRequestError("Invalid ticket ID provided.");
    }

    const action = await actionsTakenService.createTicketAction(
      ticketId,
      req.body,
      req.user!
    );
    res.status(201).json(action);
  } catch (error) {
    next(error);
  }
}

export async function getActionById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const actionId = parseInt(req.params.actionId, 10);
    if (isNaN(actionId)) {
      throw new BadRequestError("Invalid action ID provided.");
    }

    const action = await actionsTakenService.fetchActionById(
      actionId,
      req.user!
    );
    res.status(200).json(action);
  } catch (error) {
    next(error);
  }
}

export async function patchAction(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const actionId = parseInt(req.params.actionId, 10);
    if (isNaN(actionId)) {
      throw new BadRequestError("Invalid action ID provided.");
    }

    const updated = await actionsTakenService.updateAction(
      actionId,
      req.body,
      req.user!
    );
    res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
}
