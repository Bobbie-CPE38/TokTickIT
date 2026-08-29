import express, { Request, Response } from "express";
import cors from "cors";
import { getPrisma } from "./prisma.js";
// getPrisma() is your lazy database handle. Call it INSIDE a route when you
// need the DB (Issue 4). It is intentionally unused until then.
void getPrisma;

// The Express app is exported separately from app.listen() (see index.ts) so
// Supertest can import `app` without opening a port. Do not merge these files.
export const app = express();

app.use(cors());          // already wired: lets the Vite dev server call this API
app.use(express.json());

// ---------------------------------------------------------------------------
// Issue 2 — API health check
// Make the test in tests/lab-01/health.test.ts pass.
// It must return HTTP 200 with JSON: { status: "ok", service: "TokTickIT API" }
// ---------------------------------------------------------------------------
app.get("/api/health", (_req: Request, res: Response) => {
  // TODO(Issue 2): replace this stub with the required 200 response.
  res.status(200).json({ status: "ok", service: "TokTickIT API" });
});

// ---------------------------------------------------------------------------
// Issue 4 — Category list
// Add:  GET /api/categories
//   -> read categories from PostgreSQL via getPrisma().category.findMany(...)
//   -> return each { id, name } in a predictable (id) order
//   -> on failure, respond 500 with a safe message (no internal details)
// TODO(Issue 4): implement the route here.
// ---------------------------------------------------------------------------
app.get("/api/categories", async (_req: Request, res: Response) => {
  try {
    const prisma = getPrisma();

    const categories = await prisma.category.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { id: "asc" },
    });

    res.status(200).json(categories);
  } catch (error) {
    console.error("[API ERROR] /api/categories error:", error);
    res.status(500).json({ error: "Unable to load categories." });
  }
});

// ---------------------------------------------------------------------------
// Lab 2 — List Active Development Requesters
// GET /api/requesters/active
// ---------------------------------------------------------------------------
app.get("/api/requesters/active", async (_req: Request, res: Response) => {
  try {
    const prisma = getPrisma();

    const requesters = await prisma.developmentRequester.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        email: true,
        department: true,
      },
      orderBy: { id: "asc" },
    });

    res.status(200).json(requesters);
  } catch (error) {
    console.error("[API ERROR] /api/requesters/active error:", error);
    res.status(500).json({ error: "Unable to load active requesters." });
  }
});

// ---------------------------------------------------------------------------
// Lab 2 — List Active Related Systems
// GET /api/related-systems
// ---------------------------------------------------------------------------
app.get("/api/related-systems", async (_req: Request, res: Response) => {
  try {
    const prisma = getPrisma();

    const systems = await prisma.relatedSystem.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });

    res.status(200).json(systems);
  } catch (error) {
    console.error("[API ERROR] /api/related-systems error:", error);
    res.status(500).json({ error: "Unable to load related systems." });
  }
});

// ---------------------------------------------------------------------------
// Lab 2 — Create Ticket
// POST /api/tickets
// ---------------------------------------------------------------------------
app.post("/api/tickets", async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const requesterIdHeader = req.headers["x-requester-id"];

    if (!requesterIdHeader) {
      return res.status(401).json({ error: "Unauthorized: Missing X-Requester-Id header." });
    }

    const requesterId = parseInt(String(requesterIdHeader), 10);
    if (isNaN(requesterId)) {
      return res.status(401).json({ error: "Unauthorized: Invalid X-Requester-Id header." });
    }

    // Verify requester exists and is active
    const requester = await prisma.developmentRequester.findUnique({
      where: { id: requesterId },
    });

    if (!requester || !requester.isActive) {
      return res.status(403).json({ error: "Forbidden: Requester is inactive or does not exist." });
    }

    const {
      categoryId,
      relatedSystemId,
      requestedPriority = "MEDIUM",
      summary,
      description,
    } = req.body ?? {};

    const details: string[] = [];

    if (!categoryId || typeof categoryId !== "number") {
      details.push("Please select a valid category.");
    }
    if (!relatedSystemId || typeof relatedSystemId !== "number") {
      details.push("Please select a valid related system.");
    }

    const allowedPriorities = ["LOW", "MEDIUM", "HIGH", "URGENT"];
    if (!requestedPriority || !allowedPriorities.includes(requestedPriority)) {
      details.push("Requested priority must be one of: LOW, MEDIUM, HIGH, URGENT.");
    }

    const trimmedSummary = typeof summary === "string" ? summary.trim() : "";
    if (!trimmedSummary || trimmedSummary.length < 5 || trimmedSummary.length > 150) {
      details.push("Summary must be between 5 and 150 characters.");
    }

    const trimmedDescription = typeof description === "string" ? description.trim() : "";
    if (!trimmedDescription || trimmedDescription.length < 10 || trimmedDescription.length > 2000) {
      details.push("Description must be between 10 and 2000 characters.");
    }

    if (details.length > 0) {
      return res.status(422).json({ error: "Validation failed", details });
    }

    // Verify category and related system exist and are active
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
    });
    if (!category || !category.isActive) {
      return res.status(422).json({
        error: "Validation failed",
        details: ["Invalid or inactive categoryId provided."],
      });
    }

    const relatedSystem = await prisma.relatedSystem.findUnique({
      where: { id: relatedSystemId },
    });
    if (!relatedSystem || !relatedSystem.isActive) {
      return res.status(422).json({
        error: "Validation failed",
        details: ["Invalid or inactive relatedSystemId provided."],
      });
    }

    // Generate unique ticket number: TKT-YYYY-NNNNNN
    const currentYear = new Date().getFullYear();
    const count = await prisma.ticket.count();
    let seq = count + 1;
    let ticketNumber = `TKT-${currentYear}-${String(seq).padStart(6, "0")}`;
    while (await prisma.ticket.findUnique({ where: { ticketNumber } })) {
      seq++;
      ticketNumber = `TKT-${currentYear}-${String(seq).padStart(6, "0")}`;
    }

    const newTicket = await prisma.ticket.create({
      data: {
        ticketNumber,
        summary: trimmedSummary,
        description: trimmedDescription,
        requestedPriority,
        itPriority: "MEDIUM",
        currentStatus: "NEW",
        ticketOwner: null,
        resolutionSummary: null,
        requesterId: requester.id,
        categoryId: category.id,
        relatedSystemId: relatedSystem.id,
      },
      include: {
        category: { select: { id: true, name: true } },
        relatedSystem: { select: { id: true, name: true } },
      },
    });

    res.status(201).json(newTicket);
  } catch (error) {
    console.error("[API ERROR] /api/tickets creation error:", error);
    res.status(500).json({ error: "Unable to create ticket." });
  }
});

export default app;
