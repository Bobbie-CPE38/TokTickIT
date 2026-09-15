import { Request, Response, NextFunction } from "express";
import { resolveRequester } from "../../core/middleware/authenticate.js";
import { validateTicketListQuery } from "./tickets.validation.js";
import * as ticketsService from "./tickets.service.js";

export async function createTicket(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const requesterResolution = await resolveRequester(req);
    if (requesterResolution === "unauthorized") {
      res.status(401).json({ error: "Unauthorized: Missing authentication credentials." });
      return;
    }
    if (requesterResolution === "inactive") {
      res.status(403).json({ error: "Forbidden: Requester is inactive or does not exist." });
      return;
    }

    const result = await ticketsService.createTicket(req.body ?? {}, requesterResolution);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function listTickets(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const requesterResolution = await resolveRequester(req);
    if (requesterResolution === "unauthorized") {
      res.status(401).json({ error: "Unauthorized: Missing authentication credentials." });
      return;
    }
    if (requesterResolution === "inactive") {
      res.status(403).json({ error: "Forbidden: Requester is inactive or does not exist." });
      return;
    }

    const queryValidation = validateTicketListQuery(req.query);
    if (!queryValidation.isValid) {
      res.status(400).json({
        error: "Invalid query parameters.",
        details: queryValidation.details,
      });
      return;
    }

    const result = await ticketsService.listRequesterTickets(
      queryValidation.sanitized,
      requesterResolution
    );
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function getTicketDetail(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const requesterResolution = await resolveRequester(req);
    if (requesterResolution === "unauthorized") {
      res.status(401).json({ error: "Unauthorized: Missing authentication credentials." });
      return;
    }
    if (requesterResolution === "inactive") {
      res.status(403).json({ error: "Forbidden: Requester is inactive or does not exist." });
      return;
    }

    const ticketId = parseInt(req.params.id, 10);
    if (isNaN(ticketId)) {
      res.status(400).json({ error: "Invalid ticket ID provided." });
      return;
    }

    const result = await ticketsService.getRequesterTicketDetail(
      ticketId,
      requesterResolution
    );
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}
