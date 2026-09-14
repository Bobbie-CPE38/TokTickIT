# GitHub Issue: Architectural Reconstruction

## Issue Title
```text
refactor(arch): reconstruct full-stack architecture for separation of concerns, maintainability, and feature scalability
```

---

## Issue Description

### Problem / Motivation

TokTickIT has evolved through Lab 1 (starter catalog), Lab 2 (Requester Ticketing MVP), and the completion of **#27** (`feat(auth): implement User data model, JWT authentication, and mandatory password change`). While the application is 100% functionally compliant and passes all automated tests (50 backend tests, 37 frontend tests), the architecture has grown through **rapid organic accretion**:

1. **Monolithic Backend (`server/src/app.ts` — 930+ lines):**
   - Accumulates multiple disparate responsibilities in a single file: Express instantiation, CORS/JSON middleware, Multer storage configuration, authentication route handlers, JWT token issuance/revocation blocklist, password complexity validation, ticket creation/numbering, ticket filtering/sorting/pagination, attachment streaming and soft-removal, and system health checks.
   - Business logic, Prisma queries, and HTTP serialization are tightly coupled inside inline route callbacks, preventing independent unit testing without spinning up full Supertest HTTP requests.

2. **Monolithic Frontend (`client/src/App.tsx` — 450+ lines):**
   - Accumulates multiple responsibilities in a single root component: application bootstrap, manual browser History API manipulation (`pushState` / `popstate`), route guarding (unauthenticated login interception and password change enforcement), top navigation bar state dispatch, view switchboard rendering (`AppBody`), and modal coordination.
   - Lacks dedicated layout shells (e.g. distinguishing the centered, unauthenticated `#F5F7F6` login backdrop from the authenticated top-navigation shell).

#### Positioning in Sprint 3 Sequence
This refactoring issue is inserted into the Lab 3 implementation sequence immediately between **#27** (completed) and **#28** (upcoming):
- Completed: **#27** `feat(auth): implement User data model, JWT authentication, and mandatory password change`
- **[CURRENT RECONSTRUCTION ISSUE]** `refactor(arch): reconstruct full-stack architecture for separation of concerns, maintainability, and feature scalability`
- Upcoming: **#28** `feat(requester): adapt ticket workflows to authenticated session, add public comments, and resolution indication`
- Upcoming: **#29** `feat(staff-queue): implement shared IT Staff Ticket Queue with search, filters, sorting, and pagination`
- Upcoming: **#30** `feat(staff-detail): implement IT Staff Ticket Detail, ownership assignment, IT Priority, status progression, attachments, and Internal Notes`
- Upcoming: **#31** `feat(admin): implement minimalist User Management screen and administrative safety guards`
- Upcoming: **#32** `test(e2e): implement Playwright end-to-end suites, visual responsive verification, and release staging`

#### Why Continuing This Monolithic Structure is a Critical Risk
Five major Lab 3 operational features remain to be implemented (#28 through #32). If we proceed without refactoring now, every new feature will be appended directly into `app.ts` and `App.tsx`, driving `app.ts` past **2,500 lines** and `App.tsx` past **1,000 lines**. This will cause:
- **High-risk blast radius:** Edits to ticket queue logic will touch the exact same file as authentication or attachment streaming, increasing the likelihood of regression.
- **Severe merge conflicts:** Parallel work or multi-agent contributions will collide on the same monolithic files.
- **Compounding refactoring cost:** Refactoring after Lab 3 is complete will be significantly more complex and risky than refactoring now while the feature footprint is clean (~12 endpoints, 5 views).

---

### Goal

1. **Establish a Clean, Proportionate Architecture:** Modularize the codebase into well-defined domains and layers with clear separation of responsibilities.
2. **Improve Maintainability & Extensibility:** Ensure upcoming Lab 3 features (#28 through #32) can be implemented in isolated modules without touching existing stable code.
3. **Enhance Testability:** Enable business logic, query filters, and validation rules to be tested independently from HTTP routing.
4. **Avoid Over-Engineering:** Keep the design pragmatic and proportionate to the size of TokTickIT. Do **not** introduce heavy enterprise abstractions (e.g., complex DI frameworks, excessive DAO/DTO layers, or multiple layers of indirection).
5. **Zero Behavior & Test Regressions:** Maintain 100% green tests across all existing suites (50 backend tests, 37 frontend tests) and zero TypeScript diagnostics.

---

### Scope & Internal Execution Phases (Single GitHub Issue)

In accordance with `AGENTS.md`, this reconstruction is carried out under this **single GitHub Issue** on branch `feature/lab3-arch-reconstruction` (or phased sub-branches `feature/lab3-arch-phase<N>`), executed across **five disciplined, sequential internal phases**:

#### Phase 1: `refactor(core): establish backend infrastructure, security primitives, and shared error handling`
- Create `server/src/core/config.ts` (centralizing environment variables).
- Create `server/src/core/errors.ts` (defining typed `ApiError` subclasses: `BadRequestError`, `UnauthorizedError`, `ForbiddenError`, `NotFoundError`, `UnprocessableEntityError`).
- Create `server/src/core/tokens.ts` (encapsulating `generateToken`, `verifyToken`, and in-memory `tokenBlocklist` Set to enforce strict one-way dependency from features to core).
- Create `server/src/core/middleware/errorHandler.ts` (centralized global error formatting middleware).
- Move upload configuration to `server/src/core/middleware/upload.ts`.
- Move authentication/authorization middleware to `server/src/core/middleware/authenticate.ts` and `authorize.ts`.

#### Phase 2: `refactor(backend): modularize Express route handlers into domain feature slices`
- Extract `features/reference/` (`health`, `categories`, `related-systems`, and `requesters/active`).
- Extract `features/auth/` (`login`, `logout`, `me`, `change-password`, password complexity validation).
- Extract `features/attachments/` (`upload`, `download`, `soft-remove`).
- Extract `features/tickets/` (`create`, `list`, `detail`, `status`).
- Scaffold directory skeletons for upcoming feature slices (`staff/`, `comments-notes/`, `users/`).
- Reduce `server/src/app.ts` to ~60 lines: simply mounts global middleware, feature routers, static uploads, and error handler.

#### Phase 3: `refactor(frontend): implement zero-dependency router, layout shells, and health widget`
- Create `client/src/core/router/RouterContext.tsx` supporting typed navigation, browser history synchronization, path parameter extraction, and synchronous `window.location.pathname` inspection upon mount.
- Create `client/src/core/router/RouteGuard.tsx` encapsulating unauthenticated redirection and mandatory password change interception with synchronous `history.replaceState`.
- Create `client/src/layouts/AuthLayout.tsx` (centered `#F5F7F6` container for Login/Change Password).
- Create `client/src/layouts/AppLayout.tsx` (top Zen Green navbar with role tabs, main container, and the Lab 1 `SystemHealthSection`).
- Extract `SystemHealthSection` into `client/src/features/reference/SystemHealthSection.tsx` and integrate it into `AppLayout`.

#### Phase 4: `refactor(frontend): decompose monolithic screens and establish backward-compatible component shims`
- Reorganize screens into `client/src/features/`:
  - `features/auth/LoginScreen.tsx` and `ChangePasswordScreen.tsx`.
  - `features/tickets/CreateTicketScreen.tsx`, `MyTicketsScreen.tsx`, and `RequesterDetailScreen.tsx`.
  - `features/attachments/AttachmentList.tsx` and `SoftRemoveModal.tsx`.
- **Establish Backward-Compatibility Re-Export Shims:**
  - Create `client/src/components/Login.tsx` (re-exporting from `features/auth/LoginScreen`).
  - Create `client/src/components/ChangePassword.tsx` (re-exporting from `features/auth/ChangePasswordScreen`).
  - Create `client/src/components/AttachmentSection.tsx` (re-exporting from `features/attachments/AttachmentList`).
  - Create `client/src/components/RequesterTicketDetail.tsx` (re-exporting from `features/tickets/RequesterDetailScreen`).
  - Preserve `client/src/context/RequesterContext.tsx` (and `AuthContext.tsx` shim).
- Update `client/src/App.tsx` to ~50 lines, simply rendering `<AuthProvider><AppRouter /></AuthProvider>`.

#### Phase 5: `test(release): full-stack regression verification, typecheck, and architectural handoff`
- Run complete test suite across entire repository (`server` + `client` + `e2e`).
- Verify all 43 Lab 2 regression tests pass with zero skips or modifications (`API-35`).
- Run strict typecheck: `tsc --noEmit` on both server and client (0 errors).
- Perform visual checklist audit against `docs/lab-03/ui-spec.md`.
- Update documentation (`README.md`, `walkthrough.md`) reflecting the modular architecture.

---

### Architecture Decision & Evaluation

| Candidate Style | Evaluation & Trade-Off Analysis | Suitability for TokTickIT |
| :--- | :--- | :---: |
| **1. Status Quo (Monolithic Files)** | Fails separation of concerns. Causes 2,500+ line files as Lab 3 features are added. | ❌ Rejected |
| **2. Simple Route Splitting** | Splits `app.ts` into a few files, but retains inline Prisma queries and business logic inside handlers. Only creates smaller monoliths. | ❌ Insufficient |
| **3. Traditional MVC** | Server-side MVC is designed for server-rendered HTML. TokTickIT is a decoupled Single-Page Application (SPA) with a JSON REST API and React frontend; forcing server-side Views onto JSON APIs is anachronistic. | ❌ Mismatched |
| **4. Strict N-Tier / Technical Layering** | Organizes strictly by technical type (`controllers/`, `services/`, `repositories/`). A single domain (e.g. Tickets) is scattered across 4 disparate folders, creating high friction for feature development. | ⚠️ Sub-optimal |
| **5. Feature-Based Hybrid Architecture** | Organizes top-level code by business domain slices (`reference/`, `auth/`, `tickets/`, `attachments/`, and upcoming `staff/`, `comments-notes/`, `users/`), with clean internal layers (`routes`, `controller`, `service`). Retains a thin root facade (`app.ts` / `App.tsx`). | ✅ **Recommended** |

#### Principles for the Final Architectural Choice:
- **Domain Locality:** Code that changes together for a feature lives together.
- **Pragmatic Layering:** Use controllers for HTTP parsing and services for Prisma queries and business rules. Avoid creating unnecessary repository abstractions on top of Prisma.
- **Strict One-Way Dependency:** `core/` infrastructure never imports from `features/`. Dependencies flow strictly inward (`features/` $\rightarrow$ `core/`).
- **Zero New Disallowed Dependencies:** The routing abstraction must use standard browser History API / React Context without installing `react-router-dom`, preserving strict compliance with course rules (`AGENTS.md` and Lab 1 Sec 4).

---

### Compatibility Invariants (Strict Non-Negotiables)

The refactoring is strictly an internal structural transformation. The external surface of the system must remain bit-for-bit identical:

1. **Backend API Contracts (`docs/lab-03/api-spec.md`):**
   - All endpoint URLs, HTTP verbs, request payloads, response bodies, and HTTP status codes (`200`, `201`, `400`, `401`, `403`, `404`, `409`, `410`, `413`, `415`, `422`, `500`) must remain exact.
   - Reference catalogs (`/api/health`, `/api/categories`, `/api/related-systems`, `/api/requesters/active`) must be fully preserved.
   - Standardized error format `{ error: string, details?: string[] }` must be preserved.
   - `Authorization: Bearer <token>` header handling and session resolution must remain unchanged.
2. **Frontend Workflows & URLs (`docs/lab-03/ui-spec.md`):**
   - Browser URLs (`/login`, `/change-password`, `/tickets`, `/tickets/new`, `/tickets/:id`, `/queue`, `/admin/users`) must remain functional.
   - Unauthenticated users attempting to access protected routes must be redirected to `/login` without rendering protected content (`AC-01`).
   - Users with `mustChangePassword: true` must be strictly intercepted on `/change-password`.
   - `SystemHealthSection` must remain mounted inside `AppLayout` so `client/tests/lab-01/App.test.tsx` passes 3/3 tests.
   - Intended destination restoration and role validation fallback must remain functional.
   - Form input state must be preserved across validation/API failures (`BR-20`).
3. **Automated Test Integrity & Backward-Compatible Shims:**
   - **Zero regressions on all 43 Lab 2 tests (`server/tests/lab-02/`):** Must pass 100% without modifying a single line of frozen test code (`API-35`).
   - **Zero regressions on auth tests (`server/tests/lab-03/auth.api.test.ts`):** All 7 auth API tests must pass.
   - **Zero regressions on client tests (`client/tests/`):** All 37 tests across 9 suites must pass.
   - Legacy component and context imports (`src/components/Login.js`, `ChangePassword.js`, `AttachmentSection.js`, `RequesterTicketDetail.js`, `src/context/RequesterContext.js`) must be preserved via re-export shims.
   - `server/src/app.ts` must export `app` (`export const app = express();`) for Supertest compatibility.
   - `client/src/App.tsx` must export `App` (`export default App;`).
4. **Technology Stack Rules:**
   - Zero additions of disallowed external libraries (no `react-router-dom`, no alternative ORMs/frameworks).
   - Strict TypeScript type safety with zero compiler errors (`npx tsc --noEmit` on both client and server).

---

### Definition of Done (DoD)

- [ ] **Architecture Implemented:**
  - `server/src/app.ts` is reduced to an orchestrator (~60–100 lines) mounting domain routers and error middleware.
  - Backend code is organized into `server/src/core/` and domain feature modules (`server/src/features/`).
  - Strict one-way dependency rule is verified: `server/src/core/` modules have 0 imports from `server/src/features/`.
  - `client/src/App.tsx` is reduced to an orchestrator (~50–80 lines), delegating rendering to layout shells and domain screens.
  - Frontend code is organized into `client/src/layouts/`, `client/src/features/`, and `client/src/core/`.
  - Backward-compatibility re-export shims are established and verified at `client/src/components/Login.tsx`, `ChangePassword.tsx`, `AttachmentSection.tsx`, `RequesterTicketDetail.tsx`, and `client/src/context/RequesterContext.tsx`.
  - Lab 1 `SystemHealthSection` is preserved in `AppLayout.tsx` ensuring `client/tests/lab-01/App.test.tsx` passes 3/3 tests.
  - Directory structure and module skeletons for upcoming Lab 3 features (`staff/`, `comments-notes/`, `users/`) are prepared.
- [ ] **100% Backward Compatibility:**
  - All REST endpoints, schemas, headers, and status codes match `docs/lab-03/api-spec.md`.
  - Reference and catalog endpoints (`/api/health`, `/api/categories`, `/api/related-systems`, and `/api/requesters/active`) remain active.
  - All protected route guards, destination restorations, and password-change interceptions function identically.
  - Development Requester selector and Change Requester actions remain completely removed.
- [ ] **Automated Test Verification:**
  - `cd server && npm test` passes 50/50 tests (43 Lab 2 regression + 7 Lab 3 auth).
  - `cd client && npm test` passes 37/37 tests across all 9 test suites.
- [ ] **Type Safety:**
  - `cd server && npx tsc --noEmit` passes with 0 errors.
  - `cd client && npx tsc --noEmit` passes with 0 errors.
- [ ] **Zero Unauthorized Dependencies:**
  - No disallowed packages added to `package.json`.
- [ ] **Documentation & Branch Hygiene:**
  - Reconstruction is executed on `feature/lab3-arch-reconstruction` (or `feature/lab3-arch-phase<N>`) per `AGENTS.md`.
  - Updated `walkthrough.md` and `README.md` detailing the newly modularized architecture, import paths, and verification results.
