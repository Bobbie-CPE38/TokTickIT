import { Router } from "express";
import * as commentsNotesController from "./comments-notes.controller.js";

export const commentsNotesRouter = Router();

commentsNotesRouter.get("/tickets/:id/comments", commentsNotesController.getPublicComments);
commentsNotesRouter.post("/tickets/:id/comments", commentsNotesController.postPublicComment);
commentsNotesRouter.get("/tickets/:id/notes", commentsNotesController.getInternalNotes);
commentsNotesRouter.post("/tickets/:id/notes", commentsNotesController.postInternalNote);

