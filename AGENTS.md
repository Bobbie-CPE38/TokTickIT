# AGENTS.md — TokTickIT AI Agent Instructions

Welcome, AI Coding Agent. This repository is **TokTickIT**, a full-stack IT service desk application developed for KMUTT CPE 334 (Introduction to Software Engineering in the Age of AI Agents).

Follow all instructions in this file strictly to ensure high-quality, spec-compliant, and test-driven implementations.

---

## 1. Project Overview & Architecture

- **Frontend (`client/`):** React 18, TypeScript, Vite, Bootstrap 5 / Zen Green custom CSS styling, Vitest + React Testing Library.
- **Backend (`server/`):** Node.js, Express, TypeScript, Prisma ORM, PostgreSQL (via Docker), Vitest + Supertest.
- **E2E Testing (`e2e/`):** Playwright for cross-browser and responsive workflow tests.
- **Current Milestone:** **Lab 2 — Requester Ticketing MVP with UI Foundation**.

---

## 2. The Engineering Contract (Single Source of Truth)

Before making any modifications or writing code, **always read and adhere to the Lab 2 engineering contract in `docs/lab-02/`**:

1. **[`docs/lab-02/specification.md`](./docs/lab-02/specification.md):**
   - Functional requirements (`FR-01` to `FR-18`)
   - Business rules (`BR-01` to `BR-17`)
   - Prisma schema, relations, compound indexes (`@@index([requesterId, createdAt])`), and idempotent seed rules
   - Acceptance criteria (`AC-01` to `AC-14`) in Given-When-Then format
   - Definition of Done (DoD)
2. **[`docs/lab-02/ui-spec.md`](./docs/lab-02/ui-spec.md):**
   - Zen Green visual design tokens (Primary Green `#006B3C`, Secondary `#0B7A46`, Pale `#EAF6EF`, Page `#F5F7F6`, Text `#1C2D27`, Read-only `#F3F6F4`)
   - Badge palettes for priorities and statuses
   - Layout wireframes for Selector, Create Ticket (`/tickets/new`), My Tickets (`/tickets`), and Ticket Detail (`/tickets/:id`)
   - Component state rules (busy spinners, inline validation errors, disabled states)
   - Responsive breakpoints (Desktop `≥ 992px`, Tablet `768–991px`, Mobile `< 768px`)
3. **[`docs/lab-02/api-spec.md`](./docs/lab-02/api-spec.md):**
   - REST API endpoints, HTTP verbs, and status codes (`200`, `201`, `400`, `401`, `403`, `404`, `410`, `413`, `415`, `422`, `500`)
   - `X-Requester-Id` header testing context on all protected endpoints
   - Standardized error format `{ "error": "...", "details": [...] }`
4. **[`docs/lab-02/tests.md`](./docs/lab-02/tests.md):**
   - Planned test table (`API-01`–`API-17`, `UI-01`–`UI-10`, `E2E-01`)
   - Exact test file paths and acceptance criteria traceability matrix

---

## 3. Strict Scope Boundaries (Out-of-Scope in Lab 2)

**DO NOT invent or implement any of the following features:**
- ❌ **No real authentication or security:** No passwords, hashing (bcrypt), login/logout endpoints, JWT tokens, sessions, or registration forms. Use ONLY the `X-Requester-Id` header testing mechanism.
- ❌ **No IT Staff workflows:** No IT Staff dashboard/queue, ticket claiming/reassignment, IT Priority modification, or ticket status progression buttons (In Progress, Resolved, Closed).
- ❌ **No collaboration tools:** No Public Comments, Internal Notes, or Actions Taken tabs.
- ❌ **No hard deletion:** Attachments must NEVER be deleted with `prisma.attachment.delete()`; they must always be soft-removed (`isRemoved = true`, `removedAt`, `removalReason`).

---

## 4. Git & Engineering Workflow

1. **Branching Strategy:**
   - Base integration branch: `lab2-staging`
   - Feature branches: `feature/lab2-<feature-name>` (e.g. `feature/lab2-requester-context`, `feature/lab2-ticket-creation`)
   - NEVER commit directly to `main` or `lab2-staging`.
2. **Issue-Driven Focus:**
   - Work on ONE GitHub Issue and ONE feature branch at a time.
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
# Run all backend API & unit tests
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
# Verify TypeScript compiler types across both projects
cd server && npx tsc --noEmit
cd client && npx tsc --noEmit
```

---

## 6. Standard Operating Protocol for AI Agents

Whenever prompted to implement a task or issue:

1. **Step 1: Inspect Contract & Acceptance Criteria**
   - Read the relevant sections of `docs/lab-02/specification.md`, `ui-spec.md`, `api-spec.md`, and `tests.md`.
   - Identify all `BR-xx` business rules and `AC-xx` criteria assigned to the issue.
2. **Step 2: Write Failing Tests First (TDD)**
   - Implement the test cases specified in `docs/lab-02/tests.md` under `server/tests/lab-02/` or `client/tests/lab-02/`.
   - Run `npm test` and verify that the tests fail for the expected reason.
3. **Step 3: Implement Minimal Correct Code**
   - Write only the necessary code in backend and frontend to satisfy the failing tests.
   - Strictly follow the Zen Green tokens (`ui-spec.md`) and API schemas (`api-spec.md`).
4. **Step 4: Verify & Self-Audit**
   - Confirm that all unit, API, and UI tests pass 100%.
   - Ensure zero TypeScript compiler errors (`npx tsc --noEmit`).
   - Check error resilience: form values must remain preserved when API errors occur.
   - Check multi-tenant isolation: cross-requester access must return `403 Forbidden` / `404 Not Found`.
5. **Step 5: Summarize Completed Scope**
   - Report the exact Acceptance Criteria (`AC-xx`) and Test IDs (`API-xx`, `UI-xx`) completed.
