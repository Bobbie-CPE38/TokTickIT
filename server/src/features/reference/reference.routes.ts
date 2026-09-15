import { Router } from "express";
import * as referenceController from "./reference.controller.js";

export const referenceRouter = Router();

referenceRouter.get("/health", referenceController.getHealth);
referenceRouter.get("/categories", referenceController.getCategories);
referenceRouter.get("/related-systems", referenceController.getRelatedSystems);
referenceRouter.get("/requesters/active", referenceController.getActiveRequesters);
