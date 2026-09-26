# AGENTS.md — TokTickIT AI Agent Instructions

Welcome, AI Coding Agent. This repository is **TokTickIT**, a full-stack IT service desk application developed for KMUTT CPE 334 (Introduction to Software Engineering in the Age of AI Agents).

Follow all instructions in this file strictly to ensure high-quality, spec-compliant, and test-driven implementations.

---

## 1. Project Overview & Architecture

TokTickIT is organized using a **Feature-Based Hybrid Architecture** across both backend and frontend:

- **Frontend (`client/`):** React 18, TypeScript, Vite, Bootstrap 5 / Zen Green custom CSS styling, Vitest + React Testing Library.
  - `src/core/router/`: Zero-dependency browser History API navigation provider (`RouterContext`, `RouteGuard`).
  - `src/layouts/`: Layout shells (`AuthLayout`, `AppLayout`).
  - `src/components/common/`: Shared reusable UI components (`StatusBadge`, `PriorityBadge`, `EyeToggleIcon`).
  - `src/components/`: Backward-compatibility re-export shims (`Login.tsx`, `AttachmentSection.tsx`, `RequesterTicketDetail.tsx`, etc.).
  - `src/features/`: Domain vertical slices (`auth`, `tickets`, `attachments`, `comments-notes`, `staff`, `admin`, `reference`, `actions-taken`, `dashboards`).
  - `src/App.tsx`: Minimal root orchestrator (< 80 lines) mounting auth and routing providers.
- **Backend (`server/`):** Node.js, Express, TypeScript, Prisma ORM, PostgreSQL (via Docker), bcrypt, jsonwebtoken, Vitest + Supertest.
  - `src/core/`: Cross-cutting foundational infrastructure (`config.ts`, `tokens.ts`, `errors.ts`, `middleware/`).
  - `src/features/`: Domain vertical slices containing routes, controllers, and services (`auth`, `tickets`, `attachments`, `comments-notes`, `staff`, `users`, `reference`, `actions-taken`, `dashboards`).
  - `src/app.ts`: Minimal Express bootstrap (< 100 lines) mounting feature routers and global error handling.
- **E2E Testing (`e2e/`):** Playwright for cross-browser and responsive workflow tests across Desktop (`≥ 992px`), Tablet (`768–991px`), and Mobile (`< 768px`).
- **Current Milestone:** **Lab 4 — TokTickIT Actions Taken, Dashboards, and Final Regression (Sprint 4)**.

---

## 2. The Engineering Contract (Single Source of Truth)

Before making any modifications or writing code, **always read and adhere to the Lab 4 engineering contract in `docs/lab-04/` on branch `lab4-staging`**:

1. **[`docs/lab-04/specification.md`](./docs/lab-04/specification.md):**
   - Functional requirements (`FR-01` to `FR-25`).
   - Business rules (`BR-01` to `BR-18`), including Actions Taken parent-child tracking (`BR-01`), performer/ticket owner decoupling (`BR-02`), authoritative performer binding (`BR-03`), active performer & assignee validation (`BR-04`), conditional follow-up note mandate (`BR-05`), field validations (`BR-06`), requester read-only visibility (`BR-07`), chronological ordering (`BR-08`), Ticket Resolution Gate (`BR-09`: $\ge 1$ Action Taken + non-empty `resolutionSummary`), advisory requester resolution (`BR-10`), permitted 8-status transitions (`BR-11`), optimistic concurrency protection (`BR-12`), requester data isolation (`BR-13`), authoritative dashboard calculation (`BR-14`), trend calculation time boundaries at midnight UTC (`BR-15`), legacy ticket backwards compatibility (`BR-16`), form input retention on failure (`BR-17`), and submission idempotency & debounce (`BR-18`).
   - Prisma schema evolution (`ActionTaken` model, relations on `Ticket` and `User`, composite indexes).
   - Database design justifications (decoupled performer foreign key vs ticket owner, and optimistic concurrency via `Ticket.updatedAt`).
   - Idempotent seed rules with realistic tickets across all statuses, priorities, assigned/unassigned owners, tickets with 0, 1, and multiple Actions Taken, and calibrated zero/non-zero dashboard metrics.
   - Acceptance criteria (`AC-01` to `AC-16`) in Given-When-Then format.
   - Definition of Done (DoD) for product completion and course delivery.
2. **[`docs/lab-04/ui-spec.md`](./docs/lab-04/ui-spec.md):**
   - Zen Green visual design tokens (Primary Green `#006B3C`, Secondary `#0B7A46`, Pale `#EAF6EF`, Page `#F5F7F6`, Text `#1C2D27`, Read-only `#F3F6F4`, Amber Internal Note `#FFFBEB` / `#F59E0B`).
   - Badges for roles, priorities, statuses, account status, actions taken (`[ Follow-Up Required ]`, `[ Action Complete ]`), and dashboard trend indicators (`+3 from yesterday`).
   - Application shell and navigation with role-appropriate "Dashboard" active tab.
   - Layout wireframes for IT Staff Dashboard (Section 8.1 & Page 5: 5 KPI cards with trend deltas, My Recent Tickets, and Quick Actions) and Requester Dashboard (Section 8.2 & Page 6: 4 KPI cards, My Recent Tickets, and Quick Actions).
   - Actions Taken section on Ticket Detail (List Mode, Create Mode, View/Edit Mode for staff; read-only for requesters).
   - Ticket status workflow controls & Resolution Gate confirmation modals (`RESOLVED`, `CLOSED`, `REOPENED`, `CANCELLED`), and Optimistic Concurrency Conflict alert dialog (`HTTP 409`).
   - Responsive breakpoints (Desktop $\ge 992\text{px}$, Tablet $768\text{--}991\text{px}$, Mobile $< 768\text{px}$) and the Section 10 Visual/Accessibility Checklist.
3. **[`docs/lab-04/api-spec.md`](./docs/lab-04/api-spec.md):**
   - REST API endpoints, HTTP verbs, and status codes (`200`, `201`, `400`, `401`, `403`, `404`, `409`, `410`, `413`, `415`, `422`, `500`).
   - Role-Based Authorization Matrix across `REQUESTER`, `IT_STAFF`, and `ADMINISTRATOR`.
   - Actions Taken endpoints (`GET /api/tickets/:id/actions-taken`, `POST /api/tickets/:id/actions-taken`, `PATCH /api/actions-taken/:actionId`, `GET /api/actions-taken/:actionId`).
   - Ticket status workflow endpoint (`PATCH /api/staff/tickets/:id/status`) enforcing Resolution Gate (422) and optimistic concurrency checking (409).
   - Role dashboard endpoints (`GET /api/dashboards/requester`, `GET /api/dashboards/staff`, `GET /api/dashboards/admin`).
   - Anti-leakage privacy rule: Cross-requester ticket, attachment, and action queries strictly return HTTP `404 Not Found`.
4. **[`docs/lab-04/tests.md`](./docs/lab-04/tests.md):**
   - Planned test table (`API-01`–`API-23`, `UI-01`–`UI-12`, `E2E-01`–`E2E-04`) including mandatory tests `API-03` and `E2E-02`.
   - Complete Traceability Matrix mapping 100% of Acceptance Criteria (`AC-01`–`AC-16`) to automated test files.
   - Explicit regression test requirements: all 43 existing Lab 2 automated tests in `server/tests/lab-02/` and all Lab 3 test suites must pass against the evolved database.
5. **Architectural Foundations & Constraints:**
   - Architectural contract for the feature-based hybrid directory structure.
   - Thin entry facade constraints: `server/src/app.ts` (< 100 lines) and `client/src/App.tsx` (< 80 lines).
   - Invariant: `core/` infrastructure must never import from `features/`.
   - Backward-compatibility re-export shims preserved in `client/src/components/` and `server/src/auth.ts`.

---

## 3. Strict Scope Boundaries (Out-of-Scope in Lab 4)

Per PDF Section 4.2 and course specifications, **DO NOT invent or implement any of the following features:**
- ❌ **No automatic SLA clocks, escalation engines, on-call scheduling, or breach notifications.**
- ❌ **No email delivery, SMS, LINE, push, or external notification services:** No Nodemailer, SendGrid, magic links, or email delivery of credentials. Initial passwords and resets are set directly in UI / API with `mustChangePassword = true`.
- ❌ **No inventory consumption, spare-parts management, purchasing, or cost accounting for services.**
- ❌ **No time-sheet billing, payroll, hourly wage calculations, or detailed labor-cost calculations.**
- ❌ **No multi-level approval workflows, financial sign-offs, or electronic signatures.**
- ❌ **No advanced business-intelligence tools, custom report builders, OLAP cubes, or export data warehouses.**
- ❌ **No multi-tenant organizations or production-scale cloud operations.**
- ❌ **No MFA, social login, Google OAuth, or SSO.**
- ❌ **No self-registration or public sign-up forms:** User accounts are provisioned exclusively by Administrators.
- ❌ **No user deletion:** Never execute `prisma.user.delete()`. Use deactivation (`isActive = false`) to preserve foreign key integrity with historical tickets, comments, notes, attachments, and actions.
- ❌ **No multiple roles per user:** Users have exactly one role (`REQUESTER`, `IT_STAFF`, or `ADMINISTRATOR`).
- ❌ **No hard deletion:** Attachments must NEVER be deleted with `prisma.attachment.delete()`; they must always be soft-removed (`isRemoved = true`, `removedAt`, `removalReason`).

*(Note: IT Staff "Actions Taken" is now fully **in scope** for Lab 4).*

---

## 4. Git & Engineering Workflow

1. **Branching Strategy:**
   - Base integration branch: `lab4-staging`
   - Feature branches: `feature/lab4-<feature-name>` (e.g. `feature/lab4-actions-taken-foundation`, `feature/lab4-actions-taken-ui`, `feature/lab4-ticket-workflow`, `feature/lab4-role-dashboards`, `feature/lab4-final-hardening`).
   - NEVER commit directly to `main` or `lab4-staging`.
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
# Run all backend API & unit tests (Lab 2 regression + Lab 3 + Lab 4 suites)
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
   - Read the relevant sections of `docs/lab-04/specification.md`, `ui-spec.md`, `api-spec.md`, and `tests.md`.
   - Identify all `FR-xx`, `BR-xx`, and `AC-xx` criteria assigned to the issue.
2. **Step 2: Write Failing Tests First (TDD)**
   - Implement the test cases specified in `docs/lab-04/tests.md` under `server/tests/lab-04/` or `client/tests/lab-04/`.
   - Run `npm test` and verify that the tests fail for the expected reason.
3. **Step 3: Implement Minimal Correct Code**
   - Write only the necessary code in backend and frontend to satisfy the failing tests.
   - Strictly follow the Zen Green tokens (`ui-spec.md`) and API schemas (`api-spec.md`).
   - **Feature-Based Placement:** Add new business logic, controllers, and routes into the designated domain vertical slices under `server/src/features/<slice>/` (e.g. `actions-taken`, `dashboards`, `staff`) and `client/src/features/<slice>/`.
   - **Preserve Entry Facades:** `server/src/app.ts` must only mount routers and middleware (< 100 lines); `client/src/App.tsx` must only mount providers (< 80 lines).
   - **One-Way Inward Dependency Rule:** `core/` infrastructure must NEVER import from `features/`. Dependencies flow strictly inward (`features/` $\rightarrow$ `core/`).
   - **Preserve Re-export Shims:** Never delete or alter existing backward-compatibility shims in `client/src/components/` or `server/src/auth.ts`.
   - **Reuse Shared UI Components:** Use existing primitives in `client/src/components/common/` (`StatusBadge`, `PriorityBadge`, `EyeToggleIcon`) and utilities in `client/src/core/utils/` (`formatFileSize`, `createDragHandlers`) rather than creating duplicate markup or handlers.
4. **Step 4: Verify & Self-Audit**
   - Confirm that all unit, API, and UI tests pass 100%.
   - **Zero Regression Check:** Confirm that all 43 Lab 2 tests under `server/tests/lab-02/` continue to pass 100% without modification, and existing Lab 3 suites pass.
   - Ensure zero TypeScript compiler errors (`npx tsc --noEmit` on both client and server).
   - **Architectural Line Limits Check:** Verify `server/src/app.ts` remains < 100 lines and `client/src/App.tsx` remains < 80 lines.
   - **Dependency Isolation Check:** Verify that `server/src/core/` and `client/src/core/` contain zero imports from `features/`.
   - **Resolution Gate Check:** Verify that transitioning to `RESOLVED` requires $\ge 1$ Action Taken and a non-empty `resolutionSummary` (`BR-09`).
   - **Optimistic Concurrency Check:** Verify that stale `expectedUpdatedAt` returns `HTTP 409 Conflict` (`BR-12`).
   - Check error resilience: form values must remain preserved in UI state when API errors occur (`BR-17`).
   - Check submission debounce: action buttons lock with busy spinner to prevent double submission (`BR-18`).
   - Check multi-tenant isolation: cross-requester access must return **HTTP 404 Not Found**, never `403 Forbidden`.
   - Check admin safety guards: self-deactivation and last active admin deactivation must be rejected with **HTTP 422 Unprocessable Entity**.
5. **Step 5: Summarize Completed Scope**
   - Report the exact Acceptance Criteria (`AC-xx`) and Test IDs (`API-xx`, `UI-xx`, `E2E-xx`) completed.
