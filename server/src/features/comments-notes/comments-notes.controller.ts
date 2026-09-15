import { Request, Response, NextFunction } from "express";
import { resolveRequester } from "../../core/middleware/authenticate.js";
import * as commentsNotesService from "./comments-notes.service.js";

export async function getPublicComments(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userResolution = await resolveRequester(req);
    if (userResolution === "unauthorized") {
      res.status(401).json({ error: "Unauthorized: Missing authentication credentials." });
      return;
    }
    if (userResolution === "inactive") {
      res.status(403).json({ error: "Forbidden: Account is inactive or does not exist." });
      return;
    }

    const ticketId = parseInt(req.params.id, 10);
    if (isNaN(ticketId)) {
      res.status(400).json({ error: "Invalid ticket ID provided." });
      return;
    }

    const comments = await commentsNotesService.fetchPublicComments(
      ticketId,
      userResolution
    );
    res.status(200).json(comments);
  } catch (error) {
    next(error);
  }
}

export async function postPublicComment(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userResolution = await resolveRequester(req);
    if (userResolution === "unauthorized") {
      res.status(401).json({ error: "Unauthorized: Missing authentication credentials." });
      return;
    }
    if (userResolution === "inactive") {
      res.status(403).json({ error: "Forbidden: Account is inactive or does not exist." });
      return;
    }

    const ticketId = parseInt(req.params.id, 10);
    if (isNaN(ticketId)) {
      res.status(400).json({ error: "Invalid ticket ID provided." });
      return;
    }

    const comment = await commentsNotesService.createPublicComment(
      ticketId,
      req.body,
      userResolution
    );
    res.status(201).json(comment);
  } catch (error) {
    next(error);
  }
}
