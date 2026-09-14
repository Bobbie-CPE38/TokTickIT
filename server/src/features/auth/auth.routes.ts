import { Router } from "express";
import * as authController from "./auth.controller.js";
import { authenticate } from "../../core/middleware/authenticate.js";

export const authRouter = Router();

authRouter.post("/login", authController.login);
authRouter.post("/logout", authenticate, authController.logout);
authRouter.get("/me", authenticate, authController.getMe);
authRouter.post("/change-password", authenticate, authController.changePassword);
