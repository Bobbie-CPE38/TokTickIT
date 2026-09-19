# TokTickIT Architectural Reconstruction & Refactoring Plan
## Comprehensive Technical Handoff and Migration Strategy for Sprint 3

> **Document Version:** 1.2.0  
> **Target Execution Phase:** Immediate Mid-Sprint 3 Insertion (Between #27 Auth Foundation and #28 Requester Continuity)  
> **Status:** Approved Architectural Blueprint & AI Agent Handoff Protocol (Single GitHub Issue with 5 Internal Phases)  
> **Audience:** Lead Software Engineers, AI Coding Agents, Reviewers, and Course Instructors  

---

> [!IMPORTANT]
> ### Mandatory Handoff Protocol for the Next AI Coding Agent
> If you are an AI coding agent assigned to execute the architectural refactoring described in this document, **you are strictly forbidden from immediately modifying source code**. 
> Before running any file edit or git command, you MUST execute the following preparatory workflow:
> 1. **Read this entire document** thoroughly to understand the design decisions, trade-offs, and immutable constraints.
> 2. **Read [`AGENTS.md`](file:///c:/Users/acer/Desktop/cpe334/TokTickIT/AGENTS.md)** to confirm active repository rules, commit styles, and testing commands.
> 3. **Re-read the approved course specifications** in [`docs/lab-01/`](file:///c:/Users/acer/Desktop/cpe334/TokTickIT/docs/lab-01/), [`docs/lab-02/`](file:///c:/Users/acer/Desktop/cpe334/TokTickIT/docs/lab-02/), and [`docs/lab-03/`](file:///c:/Users/acer/Desktop/cpe334/TokTickIT/docs/lab-03/).
> 4. **Inspect the live codebase** (`server/src/`, `client/src/`, and all test files) to confirm the baseline matches this plan.
> 5. **Confirm current test suite health**: Verify that 100% of backend tests (`50/50` in `server`) and frontend tests (`37/37` in `client`) are green before touching any code.
> 6. **Create or refine a step-by-step implementation plan** in your session's `implementation_plan.md` artifact, mapping your tasks to the 5 staged phases defined in Section 8 under the single reconstruction issue.
> 7. **Only begin coding after the plan is validated against all constraints.**

---

## 1. Executive Summary & Context

TokTickIT is a full-stack IT service desk application developed across seven individual sprints for **KMUTT CPE 334 (Introduction to Software Engineering in the Age of AI Agents)**. The application handles support requests across four IT domains (Account & Access, Hardware, Software, Network) and supports three distinct user roles: **Requester**, **IT Staff**, and **Administrator**.

Through Lab 1 (Hello World starter), Lab 2 (Requester Ticketing MVP), and the completion of **#27** (`feat(auth): implement User data model, JWT authentication, and mandatory password change`), the codebase grew under rapid Test-Driven Development (TDD). While this produced a functionally compliant and 100% test-passing system, it resulted in **organic architectural accretion**:
- **Backend:** A single file, [`server/src/app.ts`](file:///c:/Users/acer/Desktop/cpe334/TokTickIT/server/src/app.ts) (930+ lines), houses nearly all Express routes, controllers, Prisma queries, file I/O, validation, and error formatting.
- **Frontend:** A single root component, [`client/src/App.tsx`](file:///c:/Users/acer/Desktop/cpe334/TokTickIT/client/src/App.tsx) (450+ lines), acts simultaneously as the application entry point, pseudo-router, route guard, layout shell, and view switchboard.

Rather than waiting until all of Lab 3 is completed—which would force upcoming features (#28 through #32) into already bloated files and compound technical debt—**this architectural reconstruction is inserted immediately between #27 and #28**. This provides a clean, modular foundation for all remaining Lab 3 features.

---

## 2. The Architectural Problem Statement

The core problem is not merely that `app.ts` and `App.tsx` have high line counts. High line count is a symptom; the fundamental issues are **violation of the Single Responsibility Principle (SRP), lack of domain isolation, brittle navigation state, and poor maintainability**.

```
CURRENT STATE (Monolithic Accretion)

    ┌─────────────────────────────────────────────────────────────┐
    │                      server/src/app.ts                      │
    │  - Express Setup & Global Middleware                        │
    │  - Health Check & System Status Handlers                    │
    │  - Category & Related System Lookups                        │
    │  - Authentication, Token Issuance & Blocklist Handling      │
    │  - Password Complexity & Change Handlers                    │
    │  - Ticket Creation, Number Generation & Validation          │
    │  - Ticket Querying (Search, Filter, Sort, Pagination)       │
    │  - Ticket Detail Retrieval & Ownership Enforcement          │
    │  - Multer Disk Storage, File Types & Upload Validation      │
    │  - Attachment Download & Soft-Removal Handlers              │
    │  - [Upcoming Lab 3] IT Staff Queue Query Engine             │
    │  - [Upcoming Lab 3] Public Comments & Internal Notes Logic  │
    │  - [Upcoming Lab 3] Admin User CRUD & Role Management       │
    └─────────────────────────────────────────────────────────────┘

    ┌─────────────────────────────────────────────────────────────┐
    │                      client/src/App.tsx                     │
    │  - Root Application Setup & Theme Wrapper                   │
    │  - Ad-hoc View State Machine (useState<AppView>)            │
    │  - Manual Browser History Sync (pushState / popstate)       │
    │  - Route Guarding (Unauthenticated Login Interception)      │
    │  - Password Change Interception Guard                       │
    │  - Top Navbar Rendering & View Dispatch                     │
    │  - View Switchboard (<AppBody> conditional blocks)          │
    │  - Lab 1 Health Check Widget Display                        │
    └─────────────────────────────────────────────────────────────┘
```

### 2.1. Concrete Deficiencies in the Current Backend
1. **Multi-Domain Collision in One File:** Changes to ticket filtering require editing the exact same file as authentication security fixes or attachment upload limits. In team environments or multi-agent workflows, this generates severe merge conflicts.
2. **Conflation of HTTP and Business Logic:** Prisma queries, query sanitization, and business rule validations (such as verifying that only ticket owners or staff can attach files) are embedded directly inside inline route callbacks. They cannot be unit-tested in isolation without spinning up full Supertest HTTP cycles.
3. **Runaway File Growth:** With Lab 3 requiring IT Staff Queue filters, status transition validation matrices, public comments, role-restricted internal notes, and administrator user management, `app.ts` is projected to exceed **1,800 to 2,200 lines** if left unrefactored.

### 2.2. Concrete Deficiencies in the Current Frontend
1. **Brittle Navigation State Synchronization:** Navigation relies on manually pushing browser history via `window.history.pushState` and catching it with a `popstate` event listener inside `App.tsx`. Because `currentView` is held in local React state alongside `window.location.pathname`, slight timing discrepancies during fast transitions or test resets easily desynchronize the UI from the address bar.
2. **Absence of Reusable Layout Shells:** Unauthenticated screens (Login, Change Password) require a clean, centered card on a `#F5F7F6` backdrop without headers. Authenticated screens (Requester Tickets, IT Queue, Admin Console) require the top navigation bar with role-specific tabs and user badges. Currently, this layout toggling is done via ad-hoc boolean conditionals scattered across `Header.tsx` and `AppBody`.
3. **Component File Sprawl:** Components such as `MyTickets.tsx` (825 lines) and `CreateTicket.tsx` (800+ lines) mix UI markup, complex table rendering, mobile card transforms, pagination buttons, modal dialogs, and raw API calls in single files.

---

## 3. Requirements Authority: What Labsheets Mandate vs. Implementation Choices

To ensure the refactoring never violates academic or grading constraints, we cross-referenced the official labsheets (**Lab 1**, **Lab 2**, and **Lab 3**) against the current code.

```
COURSE REQUIREMENTS TAXONOMY

┌──────────────────────────────────────────────┐  ┌──────────────────────────────────────────────┐
│       EXPLICIT LABSHEET REQUIREMENTS         │  │        STUDENT IMPLEMENTATION CHOICES        │
│       (Must NOT Be Altered)                  │  │        (Free to Improve & Refactor)          │
├──────────────────────────────────────────────┤  ├──────────────────────────────────────────────┤
│ • Tech Stack: React, Vite, TS, Bootstrap     │  │ • Monolithic server/src/app.ts               │
│ • Backend: Node.js, Express, TypeScript      │  │ • Monolithic client/src/App.tsx              │
│ • Database: PostgreSQL via Prisma ORM        │  │ • Flat components/ directory                 │
│ • Repository root structure (client, server) │  │ • Inline Prisma queries in Express handlers  │
│ • Frozen test file paths & Supertest tests   │  │ • Absence of Express Routers                 │
│ • REST API endpoints, verbs, schemas, codes  │  │ • Ad-hoc state-based URL sync                │
│ • Zen Green design tokens & UI Wireframes    │  │ • Inlining modal state inside page tables    │
│ • Zero regression on prior lab features      │  │ • Manual status code handling in controllers │
└──────────────────────────────────────────────┘  └──────────────────────────────────────────────┘
```

### 3.1. Explicit Labsheet Requirements (Immutable)
* **Technology & Scope Constraints (Lab 1, Sec 4, p. 6):**
  * Frontend: `React + TypeScript + Vite + Bootstrap`
  * Backend: `Node.js + Express + TypeScript`
  * Database: `PostgreSQL + Prisma`
  * Testing: `Vitest` and `Supertest` (Lab 1–3), `Playwright` for E2E (Lab 2–3)
  * Rule: *"Do not substitute another framework, database, ORM, or UI library."*
* **Required Repository Structure (Lab 1 Sec 8, p. 9; Lab 2 Sec 12, p. 17; Lab 3 Sec 12, p. 15–16):**
  The top-level structure must maintain `client/`, `server/`, `server/prisma/`, `server/src/`, `server/tests/`, `docs/`, `e2e/`, and `artifacts/`.
* **Automated Test Locations & Interfaces (Lab 2 Sec 12, p. 17; Lab 3 Sec 12, p. 16):**
  * `server/tests/lab-01/` (`health.test.ts`, `categories.test.ts`)
  * `server/tests/lab-02/` (`create-ticket.api.test.ts`, `my-tickets.api.test.ts`, `ticket-detail.api.test.ts`, `attachments.api.test.ts`)
  * `server/tests/lab-03/` (`auth.api.test.ts`, `authorization.api.test.ts`, `staff-queue.api.test.ts`, `staff-ticket-detail.api.test.ts`, `comments-notes.api.test.ts`, `users-admin.api.test.ts`)
  * All backend test files import `app` directly: `import { app } from "../../src/app.js";` and pass it to Supertest: `request(app)...`.
  * Client test files import `App` from `../../src/App.js` or individual component exports.
* **External Contracts (Lab 2 Sec 6, p. 7; Lab 3 Sec 6, p. 6; `api-spec.md`):**
  All REST endpoints, parameters, JSON response structures, error shapes (`{ error, details }`), and HTTP statuses (`200`, `201`, `400`, `401`, `403`, `404`, `409`, `410`, `413`, `415`, `422`, `500`) are fixed.
* **Course Learning Outcomes (Lab 2 Sec 2, p. 2; Lab 3 Sec 2, p. 1):**
  * *"design and justify a coherent full-stack solution across frontend, backend, API, and database layers"*
  * *"design reusable and responsive UI components that follow a consistent visual specification"*
  * *"evolve an existing data model and API without breaking the completed Lab 2 increment"*

### 3.2. Implementation Choices (Permitted to Refactor)
* The labsheet requires a `server/src/` directory, but does **not** specify file names or internal folder structure.
* The labsheet requires Express, but does **not** forbid `express.Router()`. In fact, using Express Routers is standard idiomatic Express development.
* The labsheet requires role-aware navigation and responsive UI, but does **not** mandate bundling all view state into `App.tsx`.
* Component breakdown, controller isolation, service extraction, and folder organization are 100% within student engineering discretion.

---

## 4. Architecture Decision Record (ADR)

### ADR-01: Selection of Full-Stack Architecture for TokTickIT

#### Status
**Proposed & Approved for Post-Feature Execution**

#### Context
TokTickIT has outgrown its initial single-file vertical slice. We evaluated five candidate architectural styles to determine the optimal fit for the project's educational context, team workflow, and strict labsheet constraints:
1. **Option 1: Status Quo (Monolithic Files)**
2. **Option 2: Simple Route Splitting (Modular Express)**
3. **Option 3: Strict Layered / N-Tier Architecture (Controllers / Services / Repositories)**
4. **Option 4: Traditional MVC (Model-View-Controller)**
5. **Option 5: Feature-Based Hybrid Architecture (Vertical Domain Slices with Layered Internals)**

#### Comparative Evaluation Matrix

| Criteria | 1. Status Quo | 2. Simple Routes | 3. Strict N-Tier | 4. Traditional MVC | 5. Feature Hybrid |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Separation of Responsibilities** | Very Poor | Moderate | High | Moderate | **Very High** |
| **Domain Cohesion (Locality)** | Poor | Moderate | Low (Scattered) | Low | **Very High** |
| **Testability of Business Logic** | Low | Low | High | Moderate | **High** |
| **Merge Conflict Resistance** | Very Low | Moderate | High | Moderate | **High** |
| **Cognitive Overhead for Students** | High (in file) | Low | Moderate | Low | **Low to Moderate**|
| **Fit with Express + React Stack** | Poor | Good | Moderate | Poor (SPA Mismatch)| **Ideal** |
| **Zero-Regression Safety** | N/A | High | Moderate | Low | **High** |
| **Labsheet & Dependency Compliance**| 100% | 100% | 100% | 100% | **100%** |

#### Why Alternatives Were Rejected
* **Rejection of Option 1 (Status Quo):** Continuing to append code to `app.ts` and `App.tsx` guarantees an unmaintainable codebase exceeding 2,000 lines, with massive PR diffs that obscure logic during peer review.
* **Rejection of Option 2 (Simple Route Splitting):** Moving inline handler callbacks from `app.ts` into three or four route files (e.g. `tickets.routes.ts`) only distributes the monolith into smaller monoliths. Route files would still mix Prisma calls, multer configurations, business rules, and HTTP serialization.
* **Rejection of Option 3 (Strict N-Tier / Technical Layering):** Organizing the backend strictly by technical layer (`server/src/controllers/`, `server/src/services/`, `server/src/repositories/`) scatters a single feature across three or four directories. When a developer works on "Tickets", they must modify four disparate folders. For a project with 5 well-defined domains, this creates unnecessary friction.
* **Rejection of Option 4 (Traditional MVC):** MVC is architecturally mismatched for a decoupled Single-Page Application (SPA). React running in Vite is already the "View". Forcing server-side MVC concepts onto an Express JSON REST API is anachronistic and redundant.

#### Decision: Adopt Option 5 — Feature-Based Hybrid Architecture
We adopt a **Feature-Based Hybrid Architecture** for both backend and frontend:
1. **Top-Level Organization by Business Domain (Vertical Slices):**
   * `auth`: Identity, credentials, password policy, session lifecycle.
   * `tickets`: Creation, queue, status transitions, priority management, detail.
   * `attachments`: Uploads, disk storage, MIME inspection, soft removal.
   * `comments-notes`: Public comments and role-restricted internal notes.
   * `admin`: User administration, activation/deactivation, credential resets.
   * `reference`: Categories, related systems, health checks.
2. **Internal Organization by Layer (Inside Each Feature):**
   * `*.routes.ts`: Route declarations, URL parameters, middleware attachment.
   * `*.controller.ts`: Request payload extraction, validation triggering, HTTP status formatting.
   * `*.service.ts`: Pure business rules, Prisma database queries, transaction boundaries.
3. **Preservation of the Root Facade:**
   * `server/src/app.ts` remains the Express application entry point, mounting feature routers and exporting `app`.
   * `client/src/App.tsx` remains the React root entry point, mounting the layout and routing providers.

---

## 5. Target Architecture Specification

### 5.1. Backend Directory Structure (`server/src/`)

```
server/src/
├── app.ts                         # Application bootstrap & middleware orchestration (~60 lines)
├── index.ts                       # Server entry point (app.listen) - unchanged
├── prisma.ts                      # CompatiblePrismaClient proxy layer - unchanged
│
├── core/                          # Shared cross-cutting infrastructure (Zero dependencies on features)
│   ├── config.ts                  # Environment variables (JWT_SECRET, PORT, UPLOAD_DIR)
│   ├── errors.ts                  # Standardized ApiError classes (BadRequest, Forbidden, etc.)
│   ├── tokens.ts                  # Security primitives: JWT signing/verifying & in-memory blocklist store
│   └── middleware/
│       ├── authenticate.ts        # JWT verification, blocklist check, session identity resolution
│       ├── authorize.ts           # Role-based authorization middleware (requireRole)
│       ├── errorHandler.ts        # Global centralized error formatting middleware
│       └── upload.ts              # Multer configuration, file type filtering, size limits
│
└── features/                      # Domain feature slices (Depend on core; Core never depends on features)
    ├── reference/                 # Refactored from Lab 1 & Lab 2 catalogs
    │   ├── reference.routes.ts    # /api/health, /api/categories, /api/related-systems, /api/requesters/active
    │   ├── reference.controller.ts # Health & catalog handlers
    │   └── reference.service.ts   # Database lookups for active reference lists
    │
    ├── auth/                      # Refactored from #27
    │   ├── auth.routes.ts         # /api/auth endpoints (login, logout, me, change-password)
    │   ├── auth.controller.ts     # HTTP request handling & status code mapping
    │   ├── auth.service.ts        # Password hashing, user credential verification, password updates
    │   └── auth.validation.ts     # Password complexity regex & validation logic
    │
    ├── tickets/                   # Refactored from Lab 2 Requester endpoints
    │   ├── tickets.routes.ts      # /api/tickets endpoints (CRUD, detail, resolve indication)
    │   ├── tickets.controller.ts  # Request parsing & response serialization
    │   ├── tickets.service.ts     # Ticket numbering, ownership checks, query filters
    │   └── tickets.validation.ts  # Summary, description, priority boundary validation
    │
    ├── attachments/               # Refactored from Lab 2 Attachment endpoints
    │   ├── attachments.routes.ts  # /api/tickets/:id/attachments endpoints
    │   ├── attachments.controller.ts # Upload, download, soft-remove HTTP handlers
    │   └── attachments.service.ts # Disk storage, soft removal metadata, permission checks
    │
    ├── staff/                     # Scaffolded / Built in upcoming Lab 3 Issues #29 & #30
    │   ├── staff.routes.ts        # /api/staff/tickets (queue, assignment, priority, status)
    │   ├── staff.controller.ts    # Staff queue query and mutation handlers
    │   └── staff.service.ts       # Queue filtering/sorting and status transition matrix
    │
    ├── comments-notes/            # Scaffolded / Built in upcoming Lab 3 Issues #28 & #30
    │   ├── comments-notes.routes.ts # Public comments & internal notes endpoints
    │   ├── comments-notes.controller.ts # Handlers with role visibility enforcement
    │   └── comments-notes.service.ts # Append-only persistence, author attribution
    │
    └── users/                     # Scaffolded / Built in upcoming Lab 3 Issue #31
        ├── users.routes.ts        # /api/admin/users endpoints
        ├── users.controller.ts    # Admin user management handlers
        └── users.service.ts       # User CRUD, role assignment, admin safety rules
```

#### Strict One-Way Dependency Rule (Core vs. Features)
To prevent circular dependencies, `server/src/core/` serves as foundational infrastructure:
* `core/tokens.ts` encapsulates JWT generation, JWT verification, and the in-memory `tokenBlocklist` Set.
* `core/middleware/authenticate.ts` imports token verification and blocklist checking directly from `core/tokens.ts`.
* `features/auth/auth.service.ts` imports token generation and blocklisting from `core/tokens.ts`.
* **Invariant:** `core/` files NEVER import from `features/`. Dependencies flow strictly inward (`features/` $\rightarrow$ `core/`).

#### Responsibility Allocation in Backend Slices
* **`*.routes.ts` (Routing Layer):** Declares paths, verbs, and connects middleware (`authenticate`, `requireRole`, `upload.single`). Does not access `req.body` directly or invoke Prisma.
* **`*.controller.ts` (HTTP Adapter Layer):** Parses `req.params`, `req.query`, and `req.body`. Calls the appropriate service function. Maps domain outcomes to HTTP status codes (`200`, `201`, `422`, `404`). Does not contain business validation rules.
* **`*.service.ts` (Domain & Data Layer):** Contains pure business logic, database queries via `getPrisma()`, and authorization business rules (e.g. self-deactivation guard `BR-16`). Throws typed `ApiError` instances on violation.

---

### 5.2. Frontend Directory Structure (`client/src/`)

```
client/src/
├── main.tsx                       # React DOM entry point - unchanged
├── App.tsx                        # Root application orchestrator (~50 lines)
├── api.ts                         # Centralized typed API client & error definitions
│
├── core/                          # Cross-cutting frontend infrastructure
│   ├── context/
│   │   ├── AuthContext.tsx        # Authentication state, token sync, session bootstrap
│   │   └── RequesterContext.tsx   # Preserved legacy requester context for isolated tests
│   ├── router/
│   │   ├── RouterContext.tsx      # Zero-dependency navigation context (History API sync)
│   │   ├── RouteGuard.tsx         # Unauthenticated & password-change interceptor guards
│   │   └── RoleGuard.tsx          # Role-based route authorization guards
│   └── theme/
│       └── tokens.ts              # Zen Green design tokens & badge style constants
│
├── layouts/                       # Layout shells
│   ├── AuthLayout.tsx             # Centered #F5F7F6 layout for Login & Password Change
│   └── AppLayout.tsx              # Application shell: Zen Green Header + role tabs + SystemHealthSection
│
├── components/                    # Backward-compatibility re-export shims & shared UI
│   ├── Login.tsx                  # Re-export shim -> features/auth/LoginScreen.js
│   ├── ChangePassword.tsx         # Re-export shim -> features/auth/ChangePasswordScreen.js
│   ├── AttachmentSection.tsx      # Re-export shim -> features/attachments/AttachmentList.js
│   ├── RequesterTicketDetail.tsx  # Re-export shim -> features/tickets/RequesterDetailScreen.js
│   ├── Header.tsx                 # Top navigation bar, role badge, user profile menu
│   └── common/                    # Shared reusable UI primitives
│       ├── StatusBadge.tsx        # Standardized 8-status Zen Green badge component
│       ├── PriorityBadge.tsx      # Standardized 4-priority badge component
│       ├── RoleBadge.tsx          # Standardized 3-role badge component
│       ├── LoadingSpinner.tsx     # Accessible loading indicator
│       └── ConfirmationModal.tsx  # Standardized Zen Green confirmation modal dialog
│
├── context/                       # Backward-compatibility context shims
│   ├── AuthContext.tsx            # Re-export shim -> core/context/AuthContext.js
│   └── RequesterContext.tsx       # Re-export shim -> core/context/RequesterContext.js
│
└── features/                      # Domain feature modules & screens
    ├── reference/                 # Lab 1 system check and reference catalog components
    │   └── SystemHealthSection.tsx # Lab 1 "Check System" widget (required by App.test.tsx)
    │
    ├── auth/                      # Refactored from Issue #2
    │   ├── LoginScreen.tsx        # /login screen component (from Login.tsx)
    │   └── ChangePasswordScreen.tsx # /change-password screen component (from ChangePassword.tsx)
    │
    ├── tickets/                   # Refactored from Lab 2
    │   ├── MyTicketsScreen.tsx    # /tickets (from MyTickets.tsx)
    │   ├── CreateTicketScreen.tsx # /tickets/new (from CreateTicket.tsx)
    │   └── RequesterDetailScreen.tsx # /tickets/:id (from RequesterTicketDetail.tsx)
    │
    ├── attachments/               # Refactored from Lab 2
    │   ├── AttachmentList.tsx     # Attachment list with download & soft-remove controls
    │   └── SoftRemoveModal.tsx    # Soft removal modal requiring 3-255 char reason
    │
    ├── staff/                     # To be implemented in upcoming Lab 3 Issues #29 & #30
    │   ├── StaffQueueScreen.tsx   # /queue (IT Staff shared queue table)
    │   └── StaffDetailScreen.tsx  # /queue/:id (IT Staff detail, notes, status modal)
    │
    └── admin/                     # To be implemented in upcoming Lab 3 Issue #31
        └── UserManagementScreen.tsx # /admin/users (Admin user table & side-drawer modal)
```

#### Backward-Compatibility Re-Export Shims
Frozen automated test files in `client/tests/` import directly from component paths established in Lab 2 and early Lab 3:
* `client/tests/lab-03/Login.test.tsx` imports from `../../src/components/Login.js`
* `client/tests/lab-03/ChangePassword.test.tsx` imports from `../../src/components/ChangePassword.js`
* `client/tests/lab-02/AttachmentSection.test.tsx` imports from `../../src/components/AttachmentSection.js`
* `client/tests/lab-02/RequesterTicketDetail.test.tsx` imports from `../../src/components/RequesterTicketDetail.js` and `../../src/context/RequesterContext.js`

To ensure **100% zero-breakage on existing test imports**, the original file paths under `client/src/components/` and `client/src/context/` will NOT be deleted. Instead, they will act as **thin re-export shims**:
```ts
// client/src/components/Login.tsx
export { Login } from "../features/auth/LoginScreen.js";
export type { LoginProps } from "../features/auth/LoginScreen.js";
```

#### Preservation of the Lab 1 System Health Widget (`App.test.tsx`)
The Lab 1 test suite ([`client/tests/lab-01/App.test.tsx`](file:///c:/Users/acer/Desktop/cpe334/TokTickIT/client/tests/lab-01/App.test.tsx)) mounts `<App />` and tests the "Check System" button, "Status: Online", and catalog category display.
* The `SystemHealthSection` component is preserved in `client/src/features/reference/SystemHealthSection.tsx`.
* It is mounted inside `AppLayout.tsx` (in the footer or reference section) whenever authenticated application screens are rendered, ensuring `client/tests/lab-01/App.test.tsx` continues to pass 3/3 tests seamlessly.

#### The Zero-Dependency Frontend Router Design
Rather than taking the risk of adding `react-router-dom` (which could trigger dependency check warnings or break JSDOM test setups), TokTickIT will use a **clean, typed, zero-dependency History API router**:
* **`RouterContext.tsx`:** Provides `currentPath`, `navigateTo(path)`, and `params` (e.g. `{ id: "101" }`).
* **Synchronous URL Inspection:** Upon initialization, `RouterContext` synchronously reads `window.location.pathname`. This ensures that when Vitest test files call `window.history.pushState({}, "", "/tickets/new")` *before* calling `render(<App />)`, the router immediately resolves the intended path on first render without needing asynchronous tick waiting.
* **Synchronous Redirection:** Route guard redirections (such as unauthenticated requests falling back to `/login`) call `window.history.replaceState({}, "", "/login")` synchronously during mount, guaranteeing `expect(window.location.pathname).toBe("/login")` passes immediately.
* Synchronizes cleanly with browser history events (`popstate`), manual URL changes, and role permission validation.

---

## 6. Compatibility & External Contracts (What Must NOT Change)

The architectural refactoring is strictly an **internal structural transformation**. The external surface of the software must remain bit-for-bit compatible.

```
IMMUTABLE SURFACE CONTRACTS

  ┌────────────────────────────────┐       ┌────────────────────────────────┐
  │      BACKEND CONTRACTS         │       │       FRONTEND CONTRACTS       │
  ├────────────────────────────────┤       ├────────────────────────────────┤
  │ • export const app in app.ts   │       │ • export default App in App.tsx│
  │ • Exact URL paths & verbs      │       │ • Browser URLs (/login, /queue)│
  │ • 100% of HTTP Status Codes    │       │ • Unauthenticated login block  │
  │ • JSON Request & Response keys │       │ • First-login pw interception  │
  │ • Error schema {error,details} │       │ • Role-specific navigation tabs│
  │ • Bearer token header format   │       │ • Zen Green visual tokens      │
  │ • Zero change to frozen tests  │       │ • Form state retention (BR-20) │
  └────────────────────────────────┘       └────────────────────────────────┘
```

### 6.1. Backend Invariants
1. **Root Module Interface:** `server/src/app.ts` must continue to export `app`:
   ```ts
   // server/src/app.ts
   import express from "express";
   export const app = express();
   // Mount feature routers...
   ```
   *Rationale:* Every single backend test (`server/tests/lab-01/`, `server/tests/lab-02/`, `server/tests/lab-03/`) relies on `import { app } from "../../src/app.js"`.
2. **API Endpoint Signatures:** Every endpoint defined in `docs/lab-03/api-spec.md` must retain its exact path, verb, headers, query parameter names, and response shape.
3. **Reference & Catalog Continuity:** In addition to `/api/health`, `/api/categories`, and `/api/related-systems`, the `GET /api/requesters/active` endpoint must be retained in `features/reference/` to guarantee zero regressions for `server/tests/lab-02/requesters.api.test.ts`.
4. **Database Client Proxy:** `server/src/prisma.ts` and its `CompatiblePrismaClient` proxy must remain intact to ensure Lab 2 regression tests (`API-35`) continue to run seamlessly.
5. **Error Payloads:** Validation errors must strictly return `{ "error": "...", "details": [...] }` without leaking stack traces or database internals.
6. **Strict One-Way Core Dependency:** `core/` infrastructure modules must never import from `features/`. All shared security primitives (`tokens.ts`) reside in `core/` so both `authenticate` middleware and `features/auth/` can consume them without circular imports.

### 6.2. Frontend Invariants
1. **Root Component Export:** `client/src/App.tsx` must continue to provide `export default App`.
2. **Component & Context Re-Export Shims (Non-Negotiable):** To prevent breaking frozen test imports in `client/tests/`, the legacy file paths:
   - `client/src/components/Login.tsx`
   - `client/src/components/ChangePassword.tsx`
   - `client/src/components/AttachmentSection.tsx`
   - `client/src/components/RequesterTicketDetail.tsx`
   - `client/src/context/RequesterContext.tsx`
   must remain in place as clean, thin re-export shims that delegate to their new domain feature locations.
3. **Lab 1 System Health Widget Retention:** `SystemHealthSection` must remain rendered in the DOM inside `AppLayout.tsx` whenever the user is authenticated, ensuring `client/tests/lab-01/App.test.tsx` passes all 3 tests without modification.
4. **Routing Behaviors & Synchronous History Contracts:**
   - Unauthenticated requests to any URL strictly render `/login` and synchronously replace history state.
   - `RouterContext` must synchronously inspect `window.location.pathname` upon mount to support test setups that call `window.history.pushState` before `render(<App />)`.
   - Authenticated users with `mustChangePassword: true` strictly render `/change-password`.
   - Authenticated users without required role permissions attempting to access `/admin/users` or `/queue` receive Access Denied / 404 behavior.
5. **Form Preservation (`BR-20`):** Failed form submissions (in login, password change, ticket creation, user management) must preserve input values in component state.

---

## 7. Risk Assessment & Mitigation Strategies

| # | Risk Description | Severity | Likelihood | Concrete Mitigation Strategy |
|---|:---|:---:|:---:|:---|
| **R-01** | **Broken Test Imports**<br>Moving components or context files breaks imports in frozen test suites. | **Critical** | Low | Implement thin re-export shims at all legacy paths (`src/components/Login.tsx`, `AttachmentSection.tsx`, `RequesterTicketDetail.tsx`, `src/context/RequesterContext.tsx`). Never delete legacy import paths. |
| **R-02** | **Lab 2 Regression Failure (`API-35`)**<br>Refactoring ticket, attachment, or catalog routes alters behavior expected by the 43 Lab 2 tests. | **Critical** | Medium | Retain `/api/requesters/active` in reference routes. Run `cd server && npx vitest run tests/lab-02/` before and after every single file migration. Treat any failure as an immediate blocker. |
| **R-03** | **Course Dependency Violation**<br>Introducing `react-router-dom` violates Lab 1 Sec 4 constraint against substitute libraries. | **High** | High | Strictly mandate the **Zero-Dependency History Router**. Do not add any new packages to `package.json`. |
| **R-04** | **Uncoordinated Scope Creep across Slices**<br>Refactoring mixed with new feature work or split across conflicting PRs. | **High** | Medium | Track reconstruction as **one single GitHub Issue** on `feature/lab3-arch-reconstruction`. Execute through 5 strictly sequenced internal milestones. |
| **R-05** | **Over-Engineering & Excessive Abstraction**<br>Creating redundant repository interfaces, DTO mappers, or complex DI containers. | **Medium** | Medium | Adhere strictly to the Feature-Hybrid pattern. Keep services direct and pragmatic (Prisma queries live inside services; no unnecessary repository layer). |
| **R-06** | **Desynchronized Navigation State**<br>Extracted router fails to trigger re-renders on browser back/forward buttons or misses initial path. | **Medium** | Low | Unit-test `RouterContext` with synchronous mount checks and JSDOM `popstate` dispatches before migrating page views. |
| **R-07** | **Circular Dependency between Core and Feature Slices**<br>`core/middleware/authenticate.ts` importing from `features/auth/`. | **High** | Medium | Place token signing, verification, and blocklist state in `core/tokens.ts`. Enforce strict one-way dependency rule (`features` $\rightarrow$ `core`). |
| **R-08** | **Missing Lab 1 Health Check Widget in New Layout**<br>Refactored `AppLayout` omits `SystemHealthSection`, causing `App.test.tsx` to fail. | **Critical** | Medium | Explicitly mount `SystemHealthSection` within `AppLayout` so `client/tests/lab-01/App.test.tsx` continues to pass 100%. |

---

## 8. Staged Migration Strategy: Internal Execution Phases (Single GitHub Issue)

Per project instructions and [`architectural_reconstruction_issue.md`](file:///C:/Users/acer/.gemini/antigravity/brain/30369981-d307-4174-99f5-4e7d4a77bf88/architectural_reconstruction_issue.md), the entire architectural reconstruction is tracked on GitHub as **one single refactoring issue** inserted between Issue #2 and Issue #3.

To avoid a risky "big-bang" rewrite, preserve git clarity, and maintain clean rollback checkpoints, the reconstruction is executed across **five disciplined, sequential internal phases (milestones)**. In accordance with [`AGENTS.md`](file:///c:/Users/acer/Desktop/cpe334/TokTickIT/AGENTS.md), work is carried out on the dedicated feature branch `feature/lab3-arch-reconstruction` (or phased sub-branches following `feature/lab3-arch-phase<N>`):

> [!NOTE]
> ### Mid-Sprint 3 Refactoring Scope Boundary (Positioned between #27 and #28)
> This refactoring phase executes directly on top of completed **#27** (`feat(auth): implement User data model, JWT authentication, and mandatory password change`).
> It refactors the current application footprint:
> - **Backend:** `core/`, `features/reference/`, `features/auth/`, `features/tickets/`, `features/attachments/`
> - **Frontend:** `core/router/`, `layouts/`, `features/auth/`, `features/tickets/`, `features/attachments/`
> 
> Once merged into `lab3-staging`, subsequent Lab 3 features will be built directly inside the newly established feature modules:
> - **#28:** `feat(requester): adapt ticket workflows to authenticated session, add public comments, and resolution indication`
> - **#29:** `feat(staff-queue): implement shared IT Staff Ticket Queue with search, filters, sorting, and pagination`
> - **#30:** `feat(staff-detail): implement IT Staff Ticket Detail, ownership assignment, IT Priority, status progression, attachments, and Internal Notes`
> - **#31:** `feat(admin): implement minimalist User Management screen and administrative safety guards`
> - **#32:** `test(e2e): implement Playwright end-to-end suites, visual responsive verification, and release staging`

```
MIGRATION SEQUENCE & DEPENDENCY GRAPH (Single GitHub Issue)

  Phase 1: Backend Core Infrastructure & Security Primitives
  (Branch / Milestone: feature/lab3-arch-phase1-core)
           │
           ▼
  Phase 2: Backend Route Modularization & Catalogs
  (Branch / Milestone: feature/lab3-arch-phase2-backend)
           │
           ▼
  Phase 3: Frontend Layouts, Router & Health Widget
  (Branch / Milestone: feature/lab3-arch-phase3-router)
           │
           ▼
  Phase 4: Frontend Screen Decomposition & Component Shims
  (Branch / Milestone: feature/lab3-arch-phase4-screens)
           │
           ▼
  Phase 5: Full-Stack Regression Audit & Documentation
  (Branch / Milestone: feature/lab3-arch-phase5-audit)
```

---

### Phase 1 (Milestone 1): `refactor(core): establish backend infrastructure, security primitives, and shared error handling`
* **Target Branch / Milestone:** `feature/lab3-arch-phase1-core` (or sub-step on `feature/lab3-arch-reconstruction`)
* **Scope:**
  * Create `server/src/core/config.ts` (centralizing environment variables like `JWT_SECRET`, `PORT`, `UPLOAD_DIR`).
  * Create `server/src/core/errors.ts` (defining typed `ApiError` subclasses: `BadRequestError`, `UnauthorizedError`, `ForbiddenError`, `NotFoundError`, `UnprocessableEntityError`).
  * Create `server/src/core/tokens.ts` (encapsulating `generateToken`, `verifyToken`, and in-memory `tokenBlocklist` Set to enforce strict one-way dependency from features to core).
  * Create `server/src/core/middleware/errorHandler.ts` (centralized global error formatting middleware).
  * Move upload configuration to `server/src/core/middleware/upload.ts`.
  * Move authentication/authorization middleware to `server/src/core/middleware/authenticate.ts` and `authorize.ts`.
* **Verification:** Run all 50 server tests. Verify 100% pass rate. `app.ts` delegates middleware to `core/`. Zero TypeScript compiler errors.

---

### Phase 2 (Milestone 2): `refactor(backend): modularize Express route handlers into domain feature slices`
* **Target Branch / Milestone:** `feature/lab3-arch-phase2-backend`
* **Scope:**
  * **Step 2.1:** Extract `features/reference/` (`health`, `categories`, `related-systems`, and `requesters/active`). Verify all Lab 1 and Lab 2 catalog tests pass.
  * **Step 2.2:** Extract `features/auth/` (`login`, `logout`, `me`, `change-password`, and password complexity validation). Verify all 7 auth API tests pass.
  * **Step 2.3:** Extract `features/attachments/` (`upload`, `download`, `soft-remove`). Verify all 11 attachment tests pass.
  * **Step 2.4:** Extract `features/tickets/` (`create`, `list`, `detail`, `status`). Verify all ticket creation, listing, and detail tests pass.
  * **Step 2.5:** Scaffold directory skeletons for upcoming feature slices (`staff/`, `comments-notes/`, `users/`).
  * Clean `server/src/app.ts` down to ~60 lines: simply mounts `express.json()`, `cors()`, static uploads, feature routers, and the global `errorHandler`.
* **Verification:**
  * Run `cd server && npm test` (all 50 tests pass).
  * Run `cd server && npx tsc --noEmit` (0 errors).
  * Confirm `server/src/app.ts` is under 100 lines.

---

### Phase 3 (Milestone 3): `refactor(frontend): implement zero-dependency router, layout shells, and health widget`
* **Target Branch / Milestone:** `feature/lab3-arch-phase3-router`
* **Scope:**
  * Create `client/src/core/router/RouterContext.tsx` supporting typed navigation, browser history synchronization, path parameter extraction, and synchronous `window.location.pathname` inspection upon mount.
  * Create `client/src/core/router/RouteGuard.tsx` encapsulating unauthenticated redirection and mandatory password change interception with synchronous `history.replaceState`.
  * Create `client/src/layouts/AuthLayout.tsx` (centered `#F5F7F6` container for Login/Change Password).
  * Create `client/src/layouts/AppLayout.tsx` (top Zen Green navbar with role tabs, main container, and the Lab 1 `SystemHealthSection`).
  * Extract `SystemHealthSection` into `client/src/features/reference/SystemHealthSection.tsx` and integrate it into `AppLayout`.
* **Verification:**
  * Unit test `RouterContext` with mock navigation events.
  * Verify `client/tests/lab-01/App.test.tsx` passes 3/3 tests (Check System button & status display).
  * Verify `client/tests/lab-03/ProtectedRouteGuard.test.tsx` passes 6/6 tests.
  * Verify `tsc --noEmit` exits with 0 errors.

---

### Phase 4 (Milestone 4): `refactor(frontend): decompose monolithic screens and establish backward-compatible component shims`
* **Target Branch / Milestone:** `feature/lab3-arch-phase4-screens`
* **Scope:**
  * Reorganize screens into `client/src/features/`:
    * Implement `features/auth/LoginScreen.tsx` and `ChangePasswordScreen.tsx`.
    * Implement `features/tickets/CreateTicketScreen.tsx`, `MyTicketsScreen.tsx`, and `RequesterDetailScreen.tsx`.
    * Implement `features/attachments/AttachmentList.tsx` and `SoftRemoveModal.tsx`.
  * **Establish Backward-Compatibility Re-Export Shims:**
    * Create `client/src/components/Login.tsx` (re-exporting from `features/auth/LoginScreen`).
    * Create `client/src/components/ChangePassword.tsx` (re-exporting from `features/auth/ChangePasswordScreen`).
    * Create `client/src/components/AttachmentSection.tsx` (re-exporting from `features/attachments/AttachmentList`).
    * Create `client/src/components/RequesterTicketDetail.tsx` (re-exporting from `features/tickets/RequesterDetailScreen`).
    * Preserve `client/src/context/RequesterContext.tsx` (and `AuthContext.tsx` shim).
  * Update `client/src/App.tsx` to ~50 lines, simply rendering `<AuthProvider><AppRouter /></AuthProvider>`.
* **Verification:**
  * Run `cd client && npm test` (all 37 tests pass across all 9 suites).
  * Verify manual navigation across desktop, tablet, and mobile viewports.
  * Confirm `client/src/App.tsx` is under 80 lines.

---

### Phase 5 (Milestone 5): `test(release): full-stack regression verification, typecheck, and architectural handoff`
* **Target Branch / Milestone:** `feature/lab3-arch-phase5-audit` (or final commit on `feature/lab3-arch-reconstruction`)
* **Scope:**
  * Run complete test suite across entire repository (`server` + `client` + `e2e`).
  * Verify all 43 Lab 2 regression tests pass with zero skips or modifications.
  * Run strict typecheck: `tsc --noEmit` on both server and client (0 errors).
  * Perform manual visual checklist audit against `docs/lab-03/ui-spec.md`.
  * Update repository documentation (`README.md`, `docs/`) reflecting the modularized architecture.
* **Verification:** All DoD criteria satisfied. PR opened to `lab3-staging` for peer review.

---

## 9. Comprehensive Testing & Verification Protocol

Every stage of the reconstruction must be validated against a strict test matrix before proceeding to the next phase:

```
AUTOMATED VERIFICATION COMMANDS (Run After Every Stage)

  # 1. Verify backend TypeScript compilation (Zero errors required)
  cd server && npx tsc --noEmit

  # 2. Verify all backend tests (43 Lab 2 regression + all Lab 3 suites)
  cd server && npm test

  # 3. Verify frontend TypeScript compilation (Zero errors required)
  cd client && npx tsc --noEmit

  # 4. Verify all frontend component & UI tests
  cd client && npm test

  # 5. Verify full-stack integration & E2E workflows (Playwright)
  npm run test:e2e
```

### 9.1. Specific Test Baseline to Guard
* **`server/tests/lab-02/` (43 tests - API-35 Regression Suite):**
  * `create-ticket.api.test.ts` (8 tests): Number formatting, priority defaults, category validation.
  * `my-tickets.api.test.ts` (15 tests): Search, filter, multi-column sorting, pagination calculations.
  * `ticket-detail.api.test.ts` (6 tests): Cross-requester 404 anti-leakage isolation.
  * `attachments.api.test.ts` (11 tests): MIME validation, size bounds, soft-removal reason validation.
  * `requesters.api.test.ts` (1 test): Fallback active requester list.
  * **Requirement:** Must continue to pass **without editing a single line of test code**.
* **`server/tests/lab-03/` (7 tests):**
  * `auth.api.test.ts` (7 tests): Login, password complexity, JWT claims, logout blocklist invalidation, inactive account rejection.
* **`client/tests/` (37 tests across 9 test suites):**
  * `ProtectedRouteGuard.test.tsx` (6 tests): Unauthenticated redirect, destination preservation, password change precedence, role validation fallback, popstate guard.
  * `Login.test.tsx` (3 tests): Zen Green card, busy spinner, redirect, form preservation (`BR-20`).
  * `ChangePassword.test.tsx` (3 tests): Live checklist, mismatch validation, API submission.
  * `RequesterSelector.test.tsx` (4 tests): Complete removal of selector modal, removal of header action, bypass prevention via localStorage, normal Lab 3 auth continuity.
  * `CreateTicket.test.tsx` (5 tests), `MyTickets.test.tsx` (5 tests), `AttachmentSection.test.tsx` (5 tests), `RequesterTicketDetail.test.tsx` (3 tests), `App.test.tsx` (3 tests).

---

## 10. Definition of Done (DoD)

The architectural reconstruction phase is officially declared **COMPLETE** if and only if all the following criteria are satisfied:

- [ ] **Architecture Realized:**
  - `server/src/app.ts` is under 100 lines and acts solely as an orchestrator mounting feature routers and error middleware.
  - All backend routes, controllers, and services are encapsulated inside `server/src/features/` and `server/src/core/`.
  - Strict one-way dependency rule is maintained: `server/src/core/` modules have 0 imports from `server/src/features/`.
  - `client/src/App.tsx` is under 80 lines, delegating layout and view routing to `AppRouter` and layout shells.
  - Frontend code is cleanly modularized into `client/src/features/`, `layouts/`, and `components/common/`.
  - Backward-compatibility re-export shims are established and verified at `client/src/components/Login.tsx`, `ChangePassword.tsx`, `AttachmentSection.tsx`, `RequesterTicketDetail.tsx`, and `client/src/context/RequesterContext.tsx`.
  - Lab 1 `SystemHealthSection` is preserved in `AppLayout.tsx` ensuring `client/tests/lab-01/App.test.tsx` passes 3/3 tests.
- [ ] **Zero Contract Breakage:**
  - All REST endpoints, HTTP methods, response bodies, and status codes remain 100% compliant with `docs/lab-03/api-spec.md`.
  - Reference and catalog endpoints (`/api/health`, `/api/categories`, `/api/related-systems`, and `/api/requesters/active`) remain fully functional.
  - All frontend URLs (`/login`, `/change-password`, `/tickets`, `/queue`, `/admin/users`) remain functional in the browser.
  - Unauthenticated users remain strictly blocked from accessing internal routes, with synchronous `/login` replacement.
  - Users with `mustChangePassword: true` remain strictly intercepted on `/change-password`.
- [ ] **Zero Test Regressions:**
  - 100% of all 43 Lab 2 regression tests pass with zero modifications to legacy test files (`API-35`).
  - 100% of all 7 Lab 3 auth API tests pass (`server/tests/lab-03/auth.api.test.ts`).
  - 100% of all 37 client component and routing tests pass (`client/tests/`).
- [ ] **Zero Compiler & Linter Diagnostics:**
  - `cd server && npx tsc --noEmit` exits with code `0`.
  - `cd client && npx tsc --noEmit` exits with code `0`.
- [ ] **Zero Illegal Dependencies:**
  - No new external packages added to `package.json` that violate course guidelines (specifically, no `react-router-dom` or alternative UI/ORM libraries).
- [ ] **Disciplined Git & Documentation Evidence:**
  - The reconstruction is executed under the single refactoring issue on `feature/lab3-arch-reconstruction` (or phased sub-branches) and merged cleanly into `lab3-staging`.
  - `walkthrough.md` and repository `README.md` are updated to document the new architecture for peer reviewers and instructors.

---

## 11. Instructions for the Future AI Coding Agent

When you receive the user instruction to begin this architectural refactoring:

1. **Acknowledge and Validate:**
   State clearly that you have read this document ([`architectural_reconstruction_plan.md`](file:///C:/Users/acer/.gemini/antigravity/brain/30369981-d307-4174-99f5-4e7d4a77bf88/architectural_reconstruction_plan.md)) and verify that your working branch matches `feature/lab3-arch-reconstruction` (or the specific milestone sub-branch).
2. **Execute One Internal Phase at a Time:**
   Do **not** attempt to refactor the entire repository in a single turn. Work strictly within the boundaries of the assigned Phase (Section 8: Phases 1 through 5).
3. **Always Run Pre-Flight & Post-Flight Tests:**
   Before making any change, run `npm test` on both server and client to confirm the baseline. After making changes, run `npm test` and `npx tsc --noEmit` to prove zero regressions before declaring the step complete.
4. **Preserve Facade Exports & Backward-Compatible Shims:**
   - Never remove `export const app` from `server/src/app.ts` or `export default App` from `client/src/App.tsx`.
   - Never delete legacy component files under `client/src/components/` or `client/src/context/`; always keep them as re-export shims pointing to the new feature implementations.
5. **No Shortcuts:**
   Never disable, skip (`it.skip`), or modify frozen test assertions in `server/tests/lab-02/` or `client/tests/` to force tests to pass. Any regression must be resolved within the service, controller, or shim implementation.

