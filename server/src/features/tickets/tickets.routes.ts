import { Router } from "express";
import * as ticketsController from "./tickets.controller.js";

export const ticketsRouter = Router();

ticketsRouter.post("/tickets", ticketsController.createTicket);
ticketsRouter.get("/tickets", ticketsController.listTickets);
ticketsRouter.get("/tickets/:id", ticketsController.getTicketDetail);
ticketsRouter.patch("/tickets/:id/resolve-indication", ticketsController.indicateTicketResolved);
