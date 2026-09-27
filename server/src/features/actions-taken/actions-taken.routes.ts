import { Router } from "express";
import { authenticate } from "../../core/middleware/authenticate.js";
import { requireRole } from "../../core/middleware/authorize.js";
import * as actionsTakenController from "./actions-taken.controller.js";

export const actionsTakenRouter = Router();

// List Actions Taken for Ticket (Requester owned, IT Staff, Administrator)
actionsTakenRouter.get(
  "/tickets/:id/actions-taken",
  authenticate,
  actionsTakenController.getTicketActions
);

// Create Action Taken under Ticket (IT Staff, Administrator)
actionsTakenRouter.post(
  "/tickets/:id/actions-taken",
  authenticate,
  requireRole("IT_STAFF", "ADMINISTRATOR"),
  actionsTakenController.createTicketAction
);

// Retrieve Single Action Taken (Requester owned, IT Staff, Administrator)
actionsTakenRouter.get(
  "/actions-taken/:actionId",
  authenticate,
  actionsTakenController.getActionById
);

// Update Existing Action Taken (IT Staff, Administrator)
actionsTakenRouter.patch(
  "/actions-taken/:actionId",
  authenticate,
  requireRole("IT_STAFF", "ADMINISTRATOR"),
  actionsTakenController.patchAction
);
