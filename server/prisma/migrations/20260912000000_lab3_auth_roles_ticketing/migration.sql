-- Step 1: Safely rename legacy PENDING enum value to WAITING_FOR_REQUESTER
ALTER TYPE "TicketStatus" RENAME VALUE 'PENDING' TO 'WAITING_FOR_REQUESTER';

-- Step 2: Add new status values to the enum
ALTER TYPE "TicketStatus" ADD VALUE IF NOT EXISTS 'REOPENED';
ALTER TYPE "TicketStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';

-- Step 3: Create Role enum
CREATE TYPE "Role" AS ENUM ('REQUESTER', 'IT_STAFF', 'ADMINISTRATOR');

-- Step 4: Migrate development_requesters table to users
ALTER TABLE "development_requesters" RENAME TO "users";
ALTER TABLE "users" ADD COLUMN "passwordHash" TEXT NOT NULL DEFAULT '$2b$10$Pgrt5/Fx.G.k.cLe/m7G2OoHBAh8oJADVJ9OvO7M7ctZH.4iHoPga';
ALTER TABLE "users" ADD COLUMN "role" "Role" NOT NULL DEFAULT 'REQUESTER';
ALTER TABLE "users" ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" DROP COLUMN IF EXISTS "department";
ALTER TABLE "users" RENAME CONSTRAINT "development_requesters_pkey" TO "users_pkey";
ALTER INDEX IF EXISTS "development_requesters_email_key" RENAME TO "users_email_key";
CREATE INDEX "users_role_isActive_idx" ON "users"("role", "isActive");

-- Step 5: Update tickets table
ALTER TABLE "tickets" DROP CONSTRAINT IF EXISTS "tickets_requesterId_fkey";
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "tickets" DROP COLUMN IF EXISTS "ticketOwner";
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "ticketOwnerId" INTEGER;
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_ticketOwnerId_fkey" FOREIGN KEY ("ticketOwnerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "isRequesterResolved" BOOLEAN NOT NULL DEFAULT false;
DROP INDEX IF EXISTS "tickets_categoryId_idx";
CREATE INDEX IF NOT EXISTS "tickets_ticketOwnerId_currentStatus_idx" ON "tickets"("ticketOwnerId", "currentStatus");
CREATE INDEX IF NOT EXISTS "tickets_itPriority_idx" ON "tickets"("itPriority");

-- Step 6: Update attachments table
ALTER TABLE "attachments" DROP CONSTRAINT IF EXISTS "attachments_uploadedByRequesterId_fkey";
ALTER TABLE "attachments" RENAME COLUMN "uploadedByRequesterId" TO "uploadedByUserId";
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Step 7: Create public_comments and internal_notes tables
CREATE TABLE "public_comments" (
    "id" SERIAL NOT NULL,
    "ticketId" INTEGER NOT NULL,
    "authorId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "public_comments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "internal_notes" (
    "id" SERIAL NOT NULL,
    "ticketId" INTEGER NOT NULL,
    "authorId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "internal_notes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "public_comments_ticketId_createdAt_idx" ON "public_comments"("ticketId", "createdAt");
CREATE INDEX "internal_notes_ticketId_createdAt_idx" ON "internal_notes"("ticketId", "createdAt");

ALTER TABLE "public_comments" ADD CONSTRAINT "public_comments_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public_comments" ADD CONSTRAINT "public_comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "internal_notes" ADD CONSTRAINT "internal_notes_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "internal_notes" ADD CONSTRAINT "internal_notes_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
