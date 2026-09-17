import express from "express";
import cors from "cors";
import { config } from "./core/config.js";
import { errorHandler } from "./core/middleware/errorHandler.js";
import { referenceRouter } from "./features/reference/reference.routes.js";
import { authRouter } from "./features/auth/auth.routes.js";
import { ticketsRouter } from "./features/tickets/tickets.routes.js";
import { attachmentsRouter } from "./features/attachments/attachments.routes.js";
import { commentsNotesRouter } from "./features/comments-notes/comments-notes.routes.js";
import { staffRouter } from "./features/staff/staff.routes.js";

export const app = express();

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(config.uploadDir));

// Domain feature routers
app.use("/api", referenceRouter);
app.use("/api/auth", authRouter);
app.use("/api", ticketsRouter);
app.use("/api", attachmentsRouter);
app.use("/api", commentsNotesRouter);
app.use("/api/staff", staffRouter);

// Centralized error handling middleware
app.use(errorHandler);

export default app;
