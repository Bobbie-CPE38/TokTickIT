import { Router } from "express";
import * as attachmentsController from "./attachments.controller.js";

export const attachmentsRouter = Router();

attachmentsRouter.post("/tickets/:id/attachments", attachmentsController.uploadAttachment);
attachmentsRouter.get("/attachments/:id/download", attachmentsController.downloadAttachment);
attachmentsRouter.patch("/attachments/:id/soft-remove", attachmentsController.softRemoveAttachment);
