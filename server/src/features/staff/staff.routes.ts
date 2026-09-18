import { Router } from "express";
import { authenticate } from "../../core/middleware/authenticate.js";
import { requireRole } from "../../core/middleware/authorize.js";
import * as staffController from "./staff.controller.js";

export const staffRouter = Router();

staffRouter.use(authenticate, requireRole("IT_STAFF", "ADMINISTRATOR"));

staffRouter.get("/tickets", staffController.getStaffQueue);
staffRouter.get("/assignees", staffController.getStaffAssignees);
staffRouter.get("/tickets/:id", staffController.getStaffTicketDetail);
staffRouter.patch("/tickets/:id/assignment", staffController.assignTicket);
staffRouter.patch("/tickets/:id/priority", staffController.updateTicketPriority);
staffRouter.patch("/tickets/:id/status", staffController.updateTicketStatus);

