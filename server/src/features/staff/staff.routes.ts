import { Router } from "express";
import { authenticate } from "../../core/middleware/authenticate.js";
import { requireRole } from "../../core/middleware/authorize.js";
import * as staffController from "./staff.controller.js";

export const staffRouter = Router();

staffRouter.get(
  "/tickets",
  authenticate,
  requireRole("IT_STAFF", "ADMINISTRATOR"),
  staffController.getStaffQueue
);
