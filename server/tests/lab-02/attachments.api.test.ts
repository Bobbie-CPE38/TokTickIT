import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import path from "path";
import fs from "fs";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

describe("Lab 2 Attachments API Tests (API-11 through API-17)", () => {
  const prisma = getPrisma();

  let jenniferId: number;
  let davidId: number;
  let jenniferTicketId: number;
  let davidTicketId: number;

  beforeAll(async () => {
    const jennifer = await prisma.developmentRequester.findFirst({
      where: { email: "jennifer.anderson@kmutt.ac.th" },
    });
    const david = await prisma.developmentRequester.findFirst({
      where: { email: "david.lee@kmutt.ac.th" },
    });
    jenniferId = jennifer!.id;
    davidId = david!.id;

    // Create a fresh test ticket for Jennifer
    const cat = await prisma.category.findFirst({ where: { isActive: true } });
    const sys = await prisma.relatedSystem.findFirst({ where: { isActive: true } });

    const ticketJ = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-TEST-${Date.now()}-1`,
        summary: "Ticket for Attachment Tests",
        description: "Testing attachments upload, download, and soft removal workflows.",
        requestedPriority: "MEDIUM",
        itPriority: "MEDIUM",
        currentStatus: "NEW",
        requesterId: jenniferId,
        categoryId: cat!.id,
        relatedSystemId: sys!.id,
      },
    });
    jenniferTicketId = ticketJ.id;

    const ticketD = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-TEST-${Date.now()}-2`,
        summary: "David Lee Ticket for Isolation Tests",
        description: "Testing cross-requester isolation for attachments.",
        requestedPriority: "LOW",
        itPriority: "LOW",
        currentStatus: "NEW",
        requesterId: davidId,
        categoryId: cat!.id,
        relatedSystemId: sys!.id,
      },
    });
    davidTicketId = ticketD.id;
  });

  describe("POST /api/tickets/:id/attachments", () => {
    /**
     * Upload a valid attachment (JPG/PNG/WEBP/PDF)
     */
    it("uploads a valid PNG attachment successfully (HTTP 201)", async () => {
      const fileBuffer = Buffer.from("fake-png-image-content-bytes");

      const res = await request(app)
        .post(`/api/tickets/${jenniferTicketId}/attachments`)
        .set("X-Requester-Id", jenniferId.toString())
        .attach("file", fileBuffer, {
          filename: "screenshot.png",
          contentType: "image/png",
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("id");
      expect(res.body).toHaveProperty("originalFileName", "screenshot.png");
      expect(res.body).toHaveProperty("fileSize", fileBuffer.length);
      expect(res.body).toHaveProperty("mimeType", "image/png");
      expect(res.body).toHaveProperty("isRemoved", false);
      expect(res.body).toHaveProperty("createdAt");
    });

    /**
     * API-11: Upload unsupported file type (e.g. .exe, .zip)
     * Requirements: AC-10, BR-09
     */
    it("API-11: rejects unsupported file type with HTTP 415 (AC-10, BR-09)", async () => {
      const exeBuffer = Buffer.from("malicious-exe-binary-content");

      const res = await request(app)
        .post(`/api/tickets/${jenniferTicketId}/attachments`)
        .set("X-Requester-Id", jenniferId.toString())
        .attach("file", exeBuffer, {
          filename: "installer.exe",
          contentType: "application/x-msdownload",
        });

      expect(res.status).toBe(415);
      expect(res.body).toHaveProperty("error");
    });

    /**
     * API-12: Upload file exceeding 5 MB limit
     * Requirements: AC-10, BR-10
     */
    it("API-12: rejects file exceeding 5 MB with HTTP 413 Payload Too Large (AC-10, BR-10)", async () => {
      // 5 MB + 1 KB = 5,243,904 bytes
      const largeBuffer = Buffer.alloc(5 * 1024 * 1024 + 1024);

      const res = await request(app)
        .post(`/api/tickets/${jenniferTicketId}/attachments`)
        .set("X-Requester-Id", jenniferId.toString())
        .attach("file", largeBuffer, {
          filename: "large-video-report.png",
          contentType: "image/png",
        });

      expect(res.status).toBe(413);
      expect(res.body).toHaveProperty("error");
    });

    /**
     * API-13: Upload 6th active attachment when 5 active files exist
     * Requirements: AC-11, BR-11
     */
    it("API-13: rejects 6th active attachment when ticket already has 5 active files (AC-11, BR-11)", async () => {
      // Create a dedicated ticket with exactly 5 active attachments
      const cat = await prisma.category.findFirst({ where: { isActive: true } });
      const sys = await prisma.relatedSystem.findFirst({ where: { isActive: true } });

      const maxTicket = await prisma.ticket.create({
        data: {
          ticketNumber: `TKT-MAX-${Date.now()}`,
          summary: "Ticket with 5 active attachments",
          description: "This ticket will have 5 active attachments to test cap.",
          requesterId: jenniferId,
          categoryId: cat!.id,
          relatedSystemId: sys!.id,
        },
      });

      // Upload 5 attachments
      for (let i = 1; i <= 5; i++) {
        const buf = Buffer.from(`attachment-content-${i}`);
        const uploadRes = await request(app)
          .post(`/api/tickets/${maxTicket.id}/attachments`)
          .set("X-Requester-Id", jenniferId.toString())
          .attach("file", buf, {
            filename: `file-${i}.pdf`,
            contentType: "application/pdf",
          });
        expect(uploadRes.status).toBe(201);
      }

      // Try uploading 6th attachment
      const extraBuf = Buffer.from("attachment-6-content");
      const res6 = await request(app)
        .post(`/api/tickets/${maxTicket.id}/attachments`)
        .set("X-Requester-Id", jenniferId.toString())
        .attach("file", extraBuf, {
          filename: "file-6.pdf",
          contentType: "application/pdf",
        });

      expect([400, 422]).toContain(res6.status);
      expect(res6.body).toHaveProperty("error");
    });

    it("rejects attachment upload to another requester's ticket with HTTP 403 / 404 (BR-04)", async () => {
      const fileBuffer = Buffer.from("david-uploading-to-jennifer-ticket");

      const res = await request(app)
        .post(`/api/tickets/${jenniferTicketId}/attachments`)
        .set("X-Requester-Id", davidId.toString())
        .attach("file", fileBuffer, {
          filename: "intruder.png",
          contentType: "image/png",
        });

      expect([403, 404]).toContain(res.status);
    });
  });

  describe("GET /api/attachments/:id/download", () => {
    let activeAttachmentId: number;
    let activeAttachmentContent: Buffer;
    let softRemovedAttachmentId: number;

    beforeAll(async () => {
      activeAttachmentContent = Buffer.from("ACTIVE-FILE-BINARY-CONTENT-FOR-DOWNLOAD");
      const resActive = await request(app)
        .post(`/api/tickets/${jenniferTicketId}/attachments`)
        .set("X-Requester-Id", jenniferId.toString())
        .attach("file", activeAttachmentContent, {
          filename: "active-doc.pdf",
          contentType: "application/pdf",
        });
      activeAttachmentId = resActive.body.id;

      const removedContent = Buffer.from("SOFT-REMOVED-FILE-BINARY-CONTENT");
      const resRemoved = await request(app)
        .post(`/api/tickets/${jenniferTicketId}/attachments`)
        .set("X-Requester-Id", jenniferId.toString())
        .attach("file", removedContent, {
          filename: "removed-doc.pdf",
          contentType: "application/pdf",
        });
      softRemovedAttachmentId = resRemoved.body.id;

      // Soft remove this attachment
      await prisma.attachment.update({
        where: { id: softRemovedAttachmentId },
        data: {
          isRemoved: true,
          removedAt: new Date(),
          removalReason: "Uploaded outdated report version",
        },
      });
    });

    /**
     * API-14: Download active file
     * Requirements: AC-12, FR-16
     */
    it("API-14: streams binary file and sets correct headers for active attachment (AC-12, FR-16)", async () => {
      const res = await request(app)
        .get(`/api/attachments/${activeAttachmentId}/download`)
        .set("X-Requester-Id", jenniferId.toString());

      expect(res.status).toBe(200);
      expect(res.header["content-type"]).toContain("application/pdf");
      expect(res.header["content-disposition"]).toContain("active-doc.pdf");
      expect(res.body).toEqual(activeAttachmentContent);
    });

    /**
     * API-16: Download soft-removed file
     * Requirements: AC-13, BR-13
     */
    it("API-16: blocks download of soft-removed file with HTTP 410 Gone / 403 Forbidden (AC-13, BR-13)", async () => {
      const res = await request(app)
        .get(`/api/attachments/${softRemovedAttachmentId}/download`)
        .set("X-Requester-Id", jenniferId.toString());

      expect([410, 403]).toContain(res.status);
      expect(res.body).toHaveProperty("error");
    });

    it("blocks download attempt by another requester with HTTP 403 / 404 (BR-04)", async () => {
      const res = await request(app)
        .get(`/api/attachments/${activeAttachmentId}/download`)
        .set("X-Requester-Id", davidId.toString());

      expect([403, 404]).toContain(res.status);
      expect(res.body).toHaveProperty("error");
    });
  });

  describe("PATCH /api/attachments/:id/soft-remove", () => {
    let attachmentToSoftRemoveId: number;

    beforeAll(async () => {
      const buf = Buffer.from("FILE-TO-BE-SOFT-REMOVED");
      const res = await request(app)
        .post(`/api/tickets/${jenniferTicketId}/attachments`)
        .set("X-Requester-Id", jenniferId.toString())
        .attach("file", buf, {
          filename: "confidential-log.png",
          contentType: "image/png",
        });
      attachmentToSoftRemoveId = res.body.id;
    });

    /**
     * API-17: Soft remove with missing or short reason (<3 chars)
     * Requirements: BR-12
     */
    it("API-17: rejects soft removal when reason is missing or shorter than 3 chars (BR-12)", async () => {
      // Empty / missing reason
      const resEmpty = await request(app)
        .patch(`/api/attachments/${attachmentToSoftRemoveId}/soft-remove`)
        .set("X-Requester-Id", jenniferId.toString())
        .send({});

      expect([400, 422]).toContain(resEmpty.status);
      expect(resEmpty.body).toHaveProperty("error");

      // Short reason (< 3 chars)
      const resShort = await request(app)
        .patch(`/api/attachments/${attachmentToSoftRemoveId}/soft-remove`)
        .set("X-Requester-Id", jenniferId.toString())
        .send({ removalReason: "no" });

      expect([400, 422]).toContain(resShort.status);

      // Verify attachment still active in DB
      const dbAtt = await prisma.attachment.findUnique({
        where: { id: attachmentToSoftRemoveId },
      });
      expect(dbAtt!.isRemoved).toBe(false);
    });

    /**
     * API-15: Soft remove with valid reason
     * Requirements: AC-13, BR-12
     */
    it("API-15: soft-removes attachment with audit reason and preserves record (AC-13, BR-12)", async () => {
      const validReason = "Uploaded duplicate log file with personal info";

      const res = await request(app)
        .patch(`/api/attachments/${attachmentToSoftRemoveId}/soft-remove`)
        .set("X-Requester-Id", jenniferId.toString())
        .send({ removalReason: validReason });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("id", attachmentToSoftRemoveId);
      expect(res.body).toHaveProperty("isRemoved", true);
      expect(res.body).toHaveProperty("removedAt");
      expect(res.body).toHaveProperty("removalReason", validReason);

      // Verify DB record is retained (NOT deleted) with isRemoved = true
      const dbAtt = await prisma.attachment.findUnique({
        where: { id: attachmentToSoftRemoveId },
      });
      expect(dbAtt).not.toBeNull();
      expect(dbAtt!.isRemoved).toBe(true);
      expect(dbAtt!.removedAt).not.toBeNull();
      expect(dbAtt!.removalReason).toBe(validReason);
    });

    it("rejects soft removal by another requester with HTTP 403 / 404 (BR-04)", async () => {
      // Create fresh attachment on Jennifer's ticket
      const buf = Buffer.from("ANOTHER-FILE");
      const uploadRes = await request(app)
        .post(`/api/tickets/${jenniferTicketId}/attachments`)
        .set("X-Requester-Id", jenniferId.toString())
        .attach("file", buf, {
          filename: "another.png",
          contentType: "image/png",
        });

      const res = await request(app)
        .patch(`/api/attachments/${uploadRes.body.id}/soft-remove`)
        .set("X-Requester-Id", davidId.toString())
        .send({ removalReason: "David trying to remove Jennifer's attachment" });

      expect([403, 404]).toContain(res.status);
    });
  });
});
