import express, { Request, Response } from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
import multer from "multer";
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

// ---------------------------------------------------------------------------
// Lab 2 — List Requester Tickets (Search, Filter, Sort, Paginate)
// GET /api/tickets
// ---------------------------------------------------------------------------
app.get("/api/tickets", async (req: Request, res: Response) => {
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

    // Query parameters validation
    const queryDetails: string[] = [];

    let page = 1;
    if (req.query.page !== undefined) {
      page = parseInt(String(req.query.page), 10);
      if (isNaN(page) || page < 1) {
        queryDetails.push("page must be an integer greater than or equal to 1.");
      }
    }

    let pageSize = 10;
    if (req.query.pageSize !== undefined) {
      pageSize = parseInt(String(req.query.pageSize), 10);
      if (isNaN(pageSize) || pageSize < 1 || pageSize > 50) {
        queryDetails.push("pageSize must be an integer between 1 and 50.");
      }
    }

    let categoryId: number | undefined;
    if (req.query.categoryId !== undefined && req.query.categoryId !== "") {
      categoryId = parseInt(String(req.query.categoryId), 10);
      if (isNaN(categoryId)) {
        queryDetails.push("categoryId must be a valid integer.");
      }
    }

    const allowedPriorities = ["LOW", "MEDIUM", "HIGH", "URGENT"];
    let requestedPriority: any = undefined;
    if (req.query.requestedPriority !== undefined && req.query.requestedPriority !== "") {
      const rp = String(req.query.requestedPriority);
      if (!allowedPriorities.includes(rp)) {
        queryDetails.push("requestedPriority must be one of: LOW, MEDIUM, HIGH, URGENT.");
      } else {
        requestedPriority = rp;
      }
    }

    let itPriority: any = undefined;
    if (req.query.itPriority !== undefined && req.query.itPriority !== "") {
      const ip = String(req.query.itPriority);
      if (!allowedPriorities.includes(ip)) {
        queryDetails.push("itPriority must be one of: LOW, MEDIUM, HIGH, URGENT.");
      } else {
        itPriority = ip;
      }
    }

    const allowedStatuses = ["NEW", "OPEN", "IN_PROGRESS", "PENDING", "RESOLVED", "CLOSED"];
    let status: any = undefined;
    if (req.query.status !== undefined && req.query.status !== "") {
      const st = String(req.query.status);
      if (!allowedStatuses.includes(st)) {
        queryDetails.push("status must be one of: NEW, OPEN, IN_PROGRESS, PENDING, RESOLVED, CLOSED.");
      } else {
        status = st;
      }
    }

    const allowedSortBy = ["createdAt", "updatedAt", "ticketNumber", "requestedPriority"];
    let sortBy = "createdAt";
    if (req.query.sortBy !== undefined && req.query.sortBy !== "") {
      const sb = String(req.query.sortBy);
      if (!allowedSortBy.includes(sb)) {
        queryDetails.push("sortBy must be one of: createdAt, updatedAt, ticketNumber, requestedPriority.");
      } else {
        sortBy = sb;
      }
    }

    let sortOrder: "asc" | "desc" = "desc";
    if (req.query.sortOrder !== undefined && req.query.sortOrder !== "") {
      const so = String(req.query.sortOrder).toLowerCase();
      if (so !== "asc" && so !== "desc") {
        queryDetails.push("sortOrder must be 'asc' or 'desc'.");
      } else {
        sortOrder = so;
      }
    }

    if (queryDetails.length > 0) {
      return res.status(400).json({
        error: "Invalid query parameters.",
        details: queryDetails,
      });
    }

    // Build Prisma query filter
    const where: any = {
      requesterId: requester.id,
    };

    if (categoryId !== undefined) {
      where.categoryId = categoryId;
    }

    if (requestedPriority !== undefined) {
      where.requestedPriority = requestedPriority;
    }

    if (itPriority !== undefined) {
      where.itPriority = itPriority;
    }

    if (status !== undefined) {
      where.currentStatus = status;
    }

    const search = req.query.search ? String(req.query.search).trim() : "";
    if (search) {
      where.OR = [
        {
          ticketNumber: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          summary: {
            contains: search,
            mode: "insensitive",
          },
        },
      ];
    }

    const total = await prisma.ticket.count({ where });
    const totalPages = Math.ceil(total / pageSize);

    const tickets = await prisma.ticket.findMany({
      where,
      orderBy: {
        [sortBy]: sortOrder,
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        category: { select: { id: true, name: true } },
        relatedSystem: { select: { id: true, name: true } },
        _count: {
          select: {
            attachments: {
              where: { isRemoved: false },
            },
          },
        },
      },
    });

    const data = tickets.map((t) => ({
      id: t.id,
      ticketNumber: t.ticketNumber,
      summary: t.summary,
      requestedPriority: t.requestedPriority,
      itPriority: t.itPriority,
      currentStatus: t.currentStatus,
      ticketOwner: t.ticketOwner,
      categoryId: t.categoryId,
      categoryName: t.category.name,
      relatedSystemId: t.relatedSystemId,
      relatedSystemName: t.relatedSystem.name,
      attachmentCount: t._count.attachments,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    }));

    res.status(200).json({
      data,
      pagination: {
        total,
        page,
        pageSize,
        totalPages,
      },
    });
  } catch (error) {
    console.error("[API ERROR] /api/tickets list error:", error);
    res.status(500).json({ error: "Unable to load tickets." });
  }
});

// ---------------------------------------------------------------------------
// Lab 2 — Get Single Ticket Detail
// GET /api/tickets/:id
// ---------------------------------------------------------------------------
app.get("/api/tickets/:id", async (req: Request, res: Response) => {
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

    const requester = await prisma.developmentRequester.findUnique({
      where: { id: requesterId },
    });

    if (!requester || !requester.isActive) {
      return res.status(403).json({ error: "Forbidden: Requester is inactive or does not exist." });
    }

    const ticketId = parseInt(req.params.id, 10);
    if (isNaN(ticketId)) {
      return res.status(400).json({ error: "Invalid ticket ID provided." });
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        requester: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
          },
        },
        category: { select: { id: true, name: true } },
        relatedSystem: { select: { id: true, name: true } },
        attachments: {
          select: {
            id: true,
            originalFileName: true,
            fileSize: true,
            mimeType: true,
            isRemoved: true,
            removedAt: true,
            removalReason: true,
            createdAt: true,
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found." });
    }

    if (ticket.requesterId !== requester.id) {
      return res.status(403).json({ error: "Forbidden: Access denied to this ticket." });
    }

    res.status(200).json(ticket);
  } catch (error) {
    console.error("[API ERROR] /api/tickets/:id error:", error);
    res.status(500).json({ error: "Unable to load ticket details." });
  }
});

// ---------------------------------------------------------------------------
// Lab 2 — Attachment Storage Configuration (Multer)
// ---------------------------------------------------------------------------
const uploadsDir = path.resolve("uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const key = `${randomUUID()}-${Date.now()}${ext}`;
    cb(null, key);
  },
});

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB max
  },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      const err = new Error("Unsupported file type. Only JPEG, PNG, WEBP, and PDF files are allowed.");
      (err as any).statusCode = 415;
      return cb(err as any);
    }
    cb(null, true);
  },
}).single("file");

// ---------------------------------------------------------------------------
// Lab 2 — Upload Attachment to Ticket
// POST /api/tickets/:id/attachments
// ---------------------------------------------------------------------------
app.post("/api/tickets/:id/attachments", (req: Request, res: Response) => {
  upload(req, res, async (uploadErr) => {
    try {
      const prisma = getPrisma();
      const requesterIdHeader = req.headers["x-requester-id"];

      if (!requesterIdHeader) {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(401).json({ error: "Unauthorized: Missing X-Requester-Id header." });
      }

      const requesterId = parseInt(String(requesterIdHeader), 10);
      if (isNaN(requesterId)) {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(401).json({ error: "Unauthorized: Invalid X-Requester-Id header." });
      }

      const requester = await prisma.developmentRequester.findUnique({
        where: { id: requesterId },
      });

      if (!requester || !requester.isActive) {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(403).json({ error: "Forbidden: Requester is inactive or does not exist." });
      }

      const ticketId = parseInt(req.params.id, 10);
      if (isNaN(ticketId)) {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: "Invalid ticket ID provided." });
      }

      // Verify ticket exists and is owned by requester
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
      });

      if (!ticket) {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(404).json({ error: "Ticket not found." });
      }

      if (ticket.requesterId !== requester.id) {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(403).json({ error: "Forbidden: Access denied to this ticket." });
      }

      // Handle upload error if any
      if (uploadErr) {
        if (uploadErr instanceof multer.MulterError) {
          if (uploadErr.code === "LIMIT_FILE_SIZE") {
            return res.status(413).json({ error: "File size exceeds the 5 MB limit." });
          }
          return res.status(400).json({ error: uploadErr.message });
        }
        if ((uploadErr as any).statusCode === 415) {
          return res.status(415).json({ error: uploadErr.message });
        }
        return res.status(400).json({ error: uploadErr.message || "File upload failed." });
      }

      if (!req.file) {
        return res.status(400).json({ error: "No file provided in form data." });
      }

      // Check active attachment limit (max 5 active files per ticket)
      const activeCount = await prisma.attachment.count({
        where: { ticketId, isRemoved: false },
      });

      if (activeCount >= 5) {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(422).json({
          error: "Validation failed",
          details: ["A ticket may have at most 5 active attachments."],
        });
      }

      const attachment = await prisma.attachment.create({
        data: {
          ticketId,
          originalFileName: req.file.originalname,
          storageKey: req.file.filename,
          fileSize: req.file.size,
          mimeType: req.file.mimetype,
          uploadedByRequesterId: requester.id,
          isRemoved: false,
        },
      });

      res.status(201).json({
        id: attachment.id,
        ticketId: attachment.ticketId,
        originalFileName: attachment.originalFileName,
        fileSize: attachment.fileSize,
        mimeType: attachment.mimeType,
        isRemoved: attachment.isRemoved,
        createdAt: attachment.createdAt.toISOString(),
      });
    } catch (error) {
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      console.error("[API ERROR] /api/tickets/:id/attachments upload error:", error);
      res.status(500).json({ error: "Unable to upload attachment." });
    }
  });
});

// ---------------------------------------------------------------------------
// Lab 2 — Download Active Attachment
// GET /api/attachments/:id/download
// ---------------------------------------------------------------------------
app.get("/api/attachments/:id/download", async (req: Request, res: Response) => {
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

    const requester = await prisma.developmentRequester.findUnique({
      where: { id: requesterId },
    });

    if (!requester || !requester.isActive) {
      return res.status(403).json({ error: "Forbidden: Requester is inactive or does not exist." });
    }

    const attachmentId = parseInt(req.params.id, 10);
    if (isNaN(attachmentId)) {
      return res.status(400).json({ error: "Invalid attachment ID provided." });
    }

    const attachment = await prisma.attachment.findUnique({
      where: { id: attachmentId },
      include: { ticket: true },
    });

    if (!attachment) {
      return res.status(404).json({ error: "Attachment not found." });
    }

    if (attachment.ticket.requesterId !== requester.id) {
      return res.status(403).json({ error: "Forbidden: Access denied to this attachment." });
    }

    if (attachment.isRemoved) {
      return res.status(410).json({
        error: "Attachment has been removed and is no longer available for download.",
      });
    }

    const filePath = path.join(uploadsDir, attachment.storageKey);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found on disk." });
    }

    res.setHeader("Content-Type", attachment.mimeType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(attachment.originalFileName)}"`
    );
    res.setHeader("Content-Length", attachment.fileSize);

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  } catch (error) {
    console.error("[API ERROR] /api/attachments/:id/download error:", error);
    res.status(500).json({ error: "Unable to download attachment." });
  }
});

// ---------------------------------------------------------------------------
// Lab 2 — Soft-Remove Attachment
// PATCH /api/attachments/:id/soft-remove
// ---------------------------------------------------------------------------
app.patch("/api/attachments/:id/soft-remove", async (req: Request, res: Response) => {
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

    const requester = await prisma.developmentRequester.findUnique({
      where: { id: requesterId },
    });

    if (!requester || !requester.isActive) {
      return res.status(403).json({ error: "Forbidden: Requester is inactive or does not exist." });
    }

    const attachmentId = parseInt(req.params.id, 10);
    if (isNaN(attachmentId)) {
      return res.status(400).json({ error: "Invalid attachment ID provided." });
    }

    const { removalReason } = req.body ?? {};
    const trimmedReason = typeof removalReason === "string" ? removalReason.trim() : "";

    if (!trimmedReason || trimmedReason.length < 3 || trimmedReason.length > 255) {
      return res.status(422).json({
        error: "Validation failed",
        details: ["Removal reason is required and must be between 3 and 255 characters."],
      });
    }

    const attachment = await prisma.attachment.findUnique({
      where: { id: attachmentId },
      include: { ticket: true },
    });

    if (!attachment) {
      return res.status(404).json({ error: "Attachment not found." });
    }

    if (attachment.ticket.requesterId !== requester.id) {
      return res.status(403).json({ error: "Forbidden: Access denied to this attachment." });
    }

    if (attachment.isRemoved) {
      return res.status(409).json({ error: "Attachment is already removed." });
    }

    const updated = await prisma.attachment.update({
      where: { id: attachmentId },
      data: {
        isRemoved: true,
        removedAt: new Date(),
        removalReason: trimmedReason,
      },
    });

    res.status(200).json({
      id: updated.id,
      ticketId: updated.ticketId,
      originalFileName: updated.originalFileName,
      isRemoved: updated.isRemoved,
      removedAt: updated.removedAt?.toISOString(),
      removalReason: updated.removalReason,
    });
  } catch (error) {
    console.error("[API ERROR] /api/attachments/:id/soft-remove error:", error);
    res.status(500).json({ error: "Unable to soft-remove attachment." });
  }
});

export default app;

