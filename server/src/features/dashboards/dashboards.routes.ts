import { Router } from "express";
import { authenticate } from "../../core/middleware/authenticate.js";
import { requireRole } from "../../core/middleware/authorize.js";
import * as dashboardsController from "./dashboards.controller.js";

export const dashboardsRouter = Router();

dashboardsRouter.use(authenticate);

// Requester personal dashboard (own tickets only, BR-13)
dashboardsRouter.get(
  "/requester",
  requireRole("REQUESTER"),
  dashboardsController.getRequesterDashboard
);

// IT Staff operational dashboard (IT Staff, Administrator)
dashboardsRouter.get(
  "/staff",
  requireRole("IT_STAFF", "ADMINISTRATOR"),
  dashboardsController.getStaffDashboard
);

// Administrator dashboard: operational metrics + user governance summary
dashboardsRouter.get(
  "/admin",
  requireRole("ADMINISTRATOR"),
  dashboardsController.getAdminDashboard
);
