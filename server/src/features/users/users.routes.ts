import { Router } from "express";
import { authenticate } from "../../core/middleware/authenticate.js";
import { requireRole } from "../../core/middleware/authorize.js";
import * as usersController from "./users.controller.js";

export const usersRouter = Router();

usersRouter.use(authenticate, requireRole("ADMINISTRATOR"));

usersRouter.get("/", usersController.getUsers);
usersRouter.post("/", usersController.createUser);
usersRouter.patch("/:id", usersController.updateUser);
usersRouter.post("/:id/reset-password", usersController.resetPassword);
