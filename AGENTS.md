# AGENTS.md — TokTickIT AI Agent Instructions

Welcome, AI Coding Agent. This repository is **TokTickIT**, a full-stack IT service desk application developed for KMUTT CPE 334 (Introduction to Software Engineering in the Age of AI Agents).

Follow all instructions in this file strictly to ensure high-quality, spec-compliant, and test-driven implementations.

---

## 1. Project Overview & Architecture

- **Frontend (`client/`):** React 18, TypeScript, Vite, Bootstrap 5 / Zen Green custom CSS styling, Vitest + React Testing Library.
- **Backend (`server/`):** Node.js, Express, TypeScript, Prisma ORM, PostgreSQL (via Docker), bcrypt, jsonwebtoken, Vitest + Supertest.
- **E2E Testing (`e2e/`):** Playwright for cross-browser and responsive workflow tests across Desktop (`≥ 992px`), Tablet (`768–991px`), and Mobile (`< 768px`).
- **Current Milestone:** **Lab 3 — Users, Roles, IT Staff Ticketing, and Admin Screens (Sprint 3)**.

---

## 2. The Engineering Contract (Single Source of Truth)

Before making any modifications or writing code, **always read and adhere to the Lab 3 engineering contract in `docs/lab-03/` on branch `lab3-staging`**:

1. **[`docs/lab-03/specification.md`](./docs/lab-03/specification.md):**
   - Functional requirements (`FR-01` to `FR-27`).
   - Business rules (`BR-01` to `BR-23`), including session identity resolution (`BR-03`), admin safety guards (`BR-16`, `BR-17`), permitted status transitions (`BR-14`), resolution summary retention on closure (`BR-15`), and IT Staff attachment uploads (`BR-23`).
   - Prisma schema evolution (`User`, `Ticket`, `Attachment`, `PublicComment`, `InternalNote`).
   - PostgreSQL migration strategy, including custom SQL enum migration (`PENDING` $\rightarrow$ `WAITING_FOR_REQUESTER`, plus `REOPENED`, `CANCELLED`).
   - Idempotent seed rules with dual-domain structure: preserving original Lab 2 users under `@kmutt.ac.th` with role `REQUESTER` for zero test regression, alongside new operational accounts under `@toktickit.com` for IT Staff and Administrator.
   - Acceptance criteria (`AC-01` to `AC-25`) in Given-When-Then format.
   - Definition of Done (DoD) for product completion and course delivery.
2. **[`docs/lab-03/ui-spec.md`](./docs/lab-03/ui-spec.md):**
   - Zen Green visual design tokens (Primary Green `#006B3C`, Secondary `#0B7A46`, Pale `#EAF6EF`, Page `#F5F7F6`, Text `#1C2D27`, Read-only `#F3F6F4`).
   - Badge palettes for roles (`Requester`, `IT Staff`, `Administrator`), priorities (`Low`, `Medium`, `High`, `Urgent`), and statuses (`New`, `Open`, `In Progress`, `Waiting for Requester`, `Resolved`, `Closed`, `Reopened`, `Cancelled`).
   - Layout wireframes for Login (`/login`), Change Password (`/change-password`), Requester Ticket Detail (`/tickets/:id`), IT Staff Ticket Queue (`/queue`), IT Staff Ticket Detail (`/queue/:id`), and Admin User Management (`/admin/users`).
   - 8-column justification for the IT Staff Ticket Queue table avoiding unreadable mega-grids.
   - Screen operational modes (Section 6.2), confirmation modals (`RESOLVED`, `CLOSED`, `REOPENED`, `CANCELLED`), and the Section 8 Visual Checklist.
3. **[`docs/lab-03/api-spec.md`](./docs/lab-03/api-spec.md):**
   - REST API endpoints, HTTP verbs, and status codes (`200`, `201`, `400`, `401`, `403`, `404`, `409`, `410`, `413`, `415`, `422`, `500`).
   - Stateless JWT Bearer token authentication in `Authorization: Bearer <token>` header (cookie-free CSRF immunity justification).
   - Role-Based Authorization Matrix across `REQUESTER`, `IT_STAFF`, and `ADMINISTRATOR`.
   - Anti-leakage privacy rule: Cross-requester ticket and attachment queries strictly return HTTP `404 Not Found`.
   - Attachment lifecycle contracts with Option B support: allowing IT Staff and Administrators to upload attachments to any ticket.
   - Server-side queue query sanitization and error schemas.
4. **[`docs/lab-03/tests.md`](./docs/lab-03/tests.md):**
   - Planned test table (`API-01`–`API-35`, `UI-01`–`UI-13`, `E2E-01`–`E2E-04`).
   - Complete Traceability Matrix mapping 100% of Acceptance Criteria (`AC-01`–`AC-25`) to automated test files.
   - Explicit Lab 2 regression test requirement (`API-35`): all 43 existing Lab 2 automated tests in `server/tests/lab-02/` must pass against the migrated database.

---

## 3. Strict Scope Boundaries (Out-of-Scope in Lab 3)

Per PDF Section 4.2 and course specifications, **DO NOT invent or implement any of the following features:**
- ❌ **No email delivery or password reset emails:** No Nodemailer, SendGrid, magic links, or email delivery of credentials. Initial passwords and resets are set directly in UI / API with `mustChangePassword = true`.
- ❌ **No MFA, social login, Google OAuth, or SSO.**
- ❌ **No self-registration or public sign-up forms:** User accounts are provisioned exclusively by Administrators.
- ❌ **No user deletion:** Never execute `prisma.user.delete()`. Use deactivation (`isActive = false`) to preserve foreign key integrity with historical tickets, comments, notes, and attachments.
- ❌ **No multiple roles per user:** Users have exactly one role (`REQUESTER`, `IT_STAFF`, or `ADMINISTRATOR`).
- ❌ **No IT Staff "Actions Taken":** Deferred to Lab 4.
- ❌ **No hard deletion:** Attachments must NEVER be deleted with `prisma.attachment.delete()`; they must always be soft-removed (`isRemoved = true`, `removedAt`, `removalReason`).

---

## 4. Git & Engineering Workflow

1. **Branching Strategy:**
   - Base integration branch: `lab3-staging`
   - Feature branches: `feature/lab3-<feature-name>` (e.g. `feature/lab3-auth-foundation`, `feature/lab3-requester-continuity`, `feature/lab3-staff-queue`, `feature/lab3-staff-ticket-detail`, `feature/lab3-admin-user-management`, `feature/lab3-e2e-and-release`).
   - NEVER commit directly to `main` or `lab3-staging`.
2. **Issue-Driven Focus:**
   - Work on ONE GitHub Issue and ONE feature branch at a time.
   - Consult the roadmap in the brain artifact `lab3_implementation_plan_and_ai_guide.md` for exact task breakdowns.
   - Do not implement features outside the scope of the assigned issue.
3. **Commit Messages:**
   - Use conventional commit messages: `feat(scope): ...`, `fix(scope): ...`, `test(scope): ...`, `docs(scope): ...`.

---

## 5. Development & Testing Commands

### Database & Environment Setup
```bash
# Start PostgreSQL & Adminer
docker compose up -d

# Backend setup, Prisma migration & seed
cd server
npx prisma migrate dev
npm run prisma:seed
npm run dev

# Frontend setup
cd client
npm run dev
```

### Running Automated Test Suites
```bash
# Run all backend API & unit tests (Lab 2 regression + Lab 3 suites)
cd server
npm test

# Run all frontend React component tests
cd client
npm test

# Run Playwright E2E tests (from root)
npm run test:e2e
```

### Code Quality Checks
```bash
# Verify TypeScript compiler types across both projects (Zero errors required)
cd server && npx tsc --noEmit
cd client && npx tsc --noEmit
```

---

## 6. Standard Operating Protocol for AI Agents

Whenever prompted to implement a task or issue:

1. **Step 1: Inspect Contract & Acceptance Criteria**
   - Read the relevant sections of `docs/lab-03/specification.md`, `ui-spec.md`, `api-spec.md`, and `tests.md`.
   - Identify all `FR-xx`, `BR-xx`, and `AC-xx` criteria assigned to the issue.
2. **Step 2: Write Failing Tests First (TDD)**
   - Implement the test cases specified in `docs/lab-03/tests.md` under `server/tests/lab-03/` or `client/tests/lab-03/`.
   - Run `npm test` and verify that the tests fail for the expected reason.
3. **Step 3: Implement Minimal Correct Code**
   - Write only the necessary code in backend and frontend to satisfy the failing tests.
   - Strictly follow the Zen Green tokens (`ui-spec.md`) and API schemas (`api-spec.md`).
4. **Step 4: Verify & Self-Audit**
   - Confirm that all unit, API, and UI tests pass 100%.
   - **Zero Regression Check:** Confirm that all 43 Lab 2 tests under `server/tests/lab-02/` continue to pass 100%.
   - Ensure zero TypeScript compiler errors (`npx tsc --noEmit` on both client and server).
   - Check error resilience: form values must remain preserved in UI state when API errors occur (`BR-20`).
   - Check multi-tenant isolation: cross-requester access must return **HTTP 404 Not Found**, never `403 Forbidden`.
   - Check admin safety guards: self-deactivation and last active admin deactivation must be rejected with **HTTP 422 Unprocessable Entity**.
5. **Step 5: Summarize Completed Scope**
   - Report the exact Acceptance Criteria (`AC-xx`) and Test IDs (`API-xx`, `UI-xx`) completed.
