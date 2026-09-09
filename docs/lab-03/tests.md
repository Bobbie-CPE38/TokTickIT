# Lab 3 Test Plan and Traceability Matrix

## 1. Testing Strategy

The quality engineering process for Sprint 3 follows strict **Test-Driven Development (TDD)** and **Specification-Driven Development (Spec DD)**. Every functional requirement, business rule, and acceptance criterion defined in `docs/lab-03/specification.md` is covered by automated test suites created prior to and alongside implementation.

### 1.1. Testing Levels and Frameworks
- **Backend API & Integration Tests:** Vitest + Supertest verifying Express routing, JWT authentication, bcrypt password hashing, role-based authorization guards, Prisma ORM queries, status transition validation, and Administrator safety rules.
- **Frontend Component & State Tests:** Vitest + React Testing Library + `@testing-library/user-event` testing login interactions, password strength feedback, role-specific navigation, IT Queue filtering and sorting, IT Ticket Detail editing, public/internal notes rendering, and user management dialogs.
- **End-to-End (E2E) Workflow Tests:** Playwright testing end-to-end user journeys (Authentication -> First Login Password Change -> IT Staff Queue Workflow -> Requester Resolution Indication -> Administrator User Management) across Desktop, Tablet, and Mobile viewports.
- **Visual & Responsive Audits:** Viewport assertions verifying zero horizontal overflow, touch target sizing (≥ 44px), and adherence to the Zen Green color tokens.

### 1.2. Test Directory and File Organization
```
server/tests/lab-03/
├── auth.api.test.ts
├── authorization.api.test.ts
├── staff-queue.api.test.ts
├── staff-ticket-detail.api.test.ts
├── comments-notes.api.test.ts
└── users-admin.api.test.ts

client/tests/lab-03/
├── Login.test.tsx
├── ChangePassword.test.tsx
├── StaffTicketQueue.test.tsx
├── StaffTicketDetail.test.tsx
├── UserManagement.test.tsx
└── RequesterRegression.test.tsx

e2e/lab-03/
├── authentication.spec.ts
├── first-login.spec.ts
├── staff-ticket-flow.spec.ts
└── user-administration.spec.ts
```

---

## 2. Planned Automated Tests

| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final Status |
|---|---|---|---|---|---|---|
| **API-01** | API | AC-01, BR-01 | Valid user authentication | HTTP 200; JWT token issued; safe user profile (id, name, email, role) returned | `server/tests/lab-03/auth.api.test.ts` | Pass |
| **API-02** | API | AC-06, BR-01 | Authentication with invalid password | HTTP 401 Unauthorized; safe error message ("Invalid email or password. Please try again.") | `server/tests/lab-03/auth.api.test.ts` | Pass |
| **API-03** | API | AC-05, BR-01 | Authentication attempt on deactivated account (`isActive = false`) | HTTP 403 Forbidden; safe error ("Account is inactive. Please contact your system administrator.") | `server/tests/lab-03/auth.api.test.ts` | Pass |
| **API-04** | API | AC-02, BR-02 | Login response flags `mustChangePassword = true` for initial password | HTTP 200 with `mustChangePassword: true` in user payload and JWT claims | `server/tests/lab-03/auth.api.test.ts` | Pass |
| **API-05** | API | AC-07, BR-07 | Password change with weak password (< 8 chars, missing special char) | HTTP 422 Unprocessable Entity with complexity details; password unchanged | `server/tests/lab-03/auth.api.test.ts` | Pass |
| **API-06** | API | AC-07, BR-07 | Password change with compliant password | HTTP 200; bcrypt hash updated in database; `mustChangePassword` set to `false` | `server/tests/lab-03/auth.api.test.ts` | Pass |
| **API-07** | API | AC-08, BR-08 | User logout revokes session | HTTP 200; subsequent requests with the same token return HTTP 401 Unauthorized | `server/tests/lab-03/auth.api.test.ts` | Pass |
| **API-08** | API | AC-04, BR-04 | Requester requests Internal Notes (`GET /api/tickets/:id/notes`) | HTTP 403 Forbidden; no note data returned | `server/tests/lab-03/comments-notes.api.test.ts` | Pass |
| **API-09** | API | AC-03, BR-03 | Requester ticket creation resolves `requesterId` from session | HTTP 201; ticket persisted with `requesterId` matching JWT user ID regardless of body | `server/tests/lab-03/authorization.api.test.ts` | Pass |
| **API-10** | API | AC-03, BR-03 | Requester A attempts to fetch ticket belonging to Requester B | HTTP 404 Not Found; zero data leaked | `server/tests/lab-03/authorization.api.test.ts` | Pass |
| **API-11** | API | AC-25, FR-09 | Requester attempts to access IT Staff queue (`GET /api/staff/tickets`) | HTTP 403 Forbidden | `server/tests/lab-03/authorization.api.test.ts` | Pass |
| **API-12** | API | AC-25, FR-09 | Non-Administrators (Requester & IT Staff) access Admin API (`/api/admin/users`) | HTTP 403 Forbidden for both Requester and IT Staff | `server/tests/lab-03/authorization.api.test.ts` | Pass |
| **API-13** | API | AC-09, FR-16 | IT Staff retrieves single ticket detail with relations (`GET /api/staff/tickets/:id`)| HTTP 200; returns ticket with requester, owner, comments, notes, attachments | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Pass |
| **API-14** | API | AC-10, FR-15 | IT Staff retrieves shared queue with search and status filter | HTTP 200; returns matching tickets and accurate pagination metadata | `server/tests/lab-03/staff-queue.api.test.ts` | Pass |
| **API-15** | API | AC-10, FR-15 | Invalid queue query parameters validation (invalid enum, negative page) | HTTP 400 Bad Request with descriptive validation details | `server/tests/lab-03/staff-queue.api.test.ts` | Pass |
| **API-16** | API | AC-11, BR-10 | IT Staff claims unassigned ticket | HTTP 200; `ticketOwnerId` updated to claiming IT Staff user | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Pass |
| **API-17** | API | AC-11, BR-10 | Assign ticket to inactive user or non-staff user | HTTP 422 Unprocessable Entity; rejection of invalid assignee | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Pass |
| **API-18** | API | AC-12, BR-11 | IT Staff updates `itPriority` independently from `requestedPriority` | HTTP 200; `itPriority` updated; `requestedPriority` remains intact | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Pass |
| **API-19** | API | AC-13, BR-14 | IT Staff transitions status `NEW` -> `IN_PROGRESS` | HTTP 200; status updated | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Pass |
| **API-20** | API | AC-13, BR-14 | Disallowed status transition (e.g., `NEW` -> `CLOSED`) | HTTP 422 Unprocessable Entity; status transition rejected | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Pass |
| **API-21** | API | AC-13, BR-15 | Transitioning to `RESOLVED` without `resolutionSummary` | HTTP 422 Unprocessable Entity; mandatory resolution summary required | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Pass |
| **API-22** | API | AC-16, BR-05 | Requester indicates problem appears resolved | HTTP 200; `isRequesterResolved = true`; `currentStatus` not altered | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Pass |
| **API-23** | API | AC-14, BR-12 | Requester and IT Staff post Public Comments | HTTP 201; comment saved with author bound to auth user; readable by all roles | `server/tests/lab-03/comments-notes.api.test.ts` | Pass |
| **API-24** | API | AC-15, BR-04 | IT Staff creates and reads Internal Notes | HTTP 201 / 200; internal notes created and accessible to IT Staff and Admin | `server/tests/lab-03/comments-notes.api.test.ts` | Pass |
| **API-25** | API | BR-13 | Empty or whitespace-only comment/note submission | HTTP 422 Unprocessable Entity; rejected before database write | `server/tests/lab-03/comments-notes.api.test.ts` | Pass |
| **API-26** | API | AC-17, FR-12 | Authenticated Requester attachment upload, download, and soft-remove | HTTP 201 on upload; HTTP 200 on download; HTTP 200 on soft-remove with reason | `server/tests/lab-03/authorization.api.test.ts` | Pass |
| **API-27** | API | AC-18, FR-12 | Cross-requester attachment download blocked | HTTP 404 Not Found without leaking attachment existence | `server/tests/lab-03/authorization.api.test.ts` | Pass |
| **API-28** | API | AC-19, FR-22 | Admin retrieves user list with search and role filter | HTTP 200; returns matching users without password hashes | `server/tests/lab-03/users-admin.api.test.ts` | Pass |
| **API-29** | API | AC-19, BR-19 | Admin creates new user with initial password | HTTP 201; user created with `mustChangePassword = true`; password hashed | `server/tests/lab-03/users-admin.api.test.ts` | Pass |
| **API-30** | API | AC-20, FR-25 | Admin updates user account details (name, email, role, active) | HTTP 200; user details updated and persisted in database | `server/tests/lab-03/users-admin.api.test.ts` | Pass |
| **API-31** | API | AC-22, BR-09 | Admin creates or updates user with duplicate email | HTTP 409 Conflict; duplicate email rejected | `server/tests/lab-03/users-admin.api.test.ts` | Pass |
| **API-32** | API | AC-23, BR-16 | Admin attempts to deactivate own account | HTTP 422 Unprocessable Entity; self-deactivation blocked | `server/tests/lab-03/users-admin.api.test.ts` | Pass |
| **API-33** | API | AC-24, BR-17 | Admin attempts to deactivate the last remaining active Administrator | HTTP 422 Unprocessable Entity; last active admin deactivation blocked | `server/tests/lab-03/users-admin.api.test.ts` | Pass |
| **API-34** | API | AC-21, FR-26 | Admin resets user initial password | HTTP 200; `mustChangePassword = true`; temporary password active | `server/tests/lab-03/users-admin.api.test.ts` | Pass |
| **API-35** | API | AC-26, FR-12 | Lab 2 database migration verification | HTTP 200; pre-existing tickets remain correctly linked to migrated users | `server/tests/lab-03/authorization.api.test.ts` | Pass |
| **UI-01** | UI | AC-01, AC-06 | LoginForm submission, busy spinner, and error rendering | Renders spinner while busy; shows safe error banner on failure; redirects on success | `client/tests/lab-03/Login.test.tsx` | Pass |
| **UI-02** | UI | AC-05 | Inactive account login error display | Displays specific safe message: "Account is inactive. Please contact your system administrator." | `client/tests/lab-03/Login.test.tsx` | Pass |
| **UI-03** | UI | AC-02, AC-07 | ChangePassword form live complexity checklist | Visual checkmarks dynamically toggle to green when criteria are satisfied | `client/tests/lab-03/ChangePassword.test.tsx` | Pass |
| **UI-04** | UI | FR-08 | Navigation shell displays role-appropriate links | Requester sees My Tickets; Staff sees My Queue; Admin sees Admin link | `client/tests/lab-03/RequesterRegression.test.tsx` | Pass |
| **UI-05** | UI | AC-10, FR-15 | StaffTicketQueue table search, filter, and pagination | Debounced search updates rows; status filter restricts items; pagination switches pages | `client/tests/lab-03/StaffTicketQueue.test.tsx` | Pass |
| **UI-06** | UI | AC-11, AC-12 | StaffTicketDetail ownership and IT Priority controls | Updating owner or IT Priority calls API and updates badge display | `client/tests/lab-03/StaffTicketDetail.test.tsx` | Pass |
| **UI-07** | UI | AC-13, BR-15 | StaffTicketDetail status transition modal & resolution input | Requires resolution summary when picking Resolved; blocks submit if empty | `client/tests/lab-03/StaffTicketDetail.test.tsx` | Pass |
| **UI-08** | UI | AC-14, AC-15 | Comments & Notes visual distinction | Public comments render with green accent; Internal notes render with amber alert banner | `client/tests/lab-03/StaffTicketDetail.test.tsx` | Pass |
| **UI-09** | UI | AC-16, BR-05 | RequesterTicketDetail "Problem Appears Resolved" banner | Displays banner and confirmation modal; sets flag and updates UI state | `client/tests/lab-03/RequesterRegression.test.tsx` | Pass |
| **UI-10** | UI | AC-19, FR-23 | UserManagement user search and role filter dropdown | Typing in search filters rows; role select updates displayed list | `client/tests/lab-03/UserManagement.test.tsx` | Pass |
| **UI-11** | UI | AC-23, BR-16 | UserManagement disables self-deactivation button | Deactivate button is disabled with tooltip when editing the logged-in administrator | `client/tests/lab-03/UserManagement.test.tsx` | Pass |
| **UI-12** | UI | BR-20 | Form state preservation on API failure across all screens | Inputs retain entered text when network or server error occurs | `client/tests/lab-03/UserManagement.test.tsx` | Pass |
| **E2E-01** | E2E | AC-01, AC-08 | Authentication & Logout Workflow: Login -> App Shell -> Session Storage -> Logout -> Guarded | Verifies full authentication lifecycle across desktop, tablet, and mobile viewports | `e2e/lab-03/authentication.spec.ts` | Pass |
| **E2E-02** | E2E | AC-02, AC-07 | Initial password login and change: Initial password login -> Enforced redirect -> Save new pass -> Main app | Normal app opens only after valid change meeting complexity requirements | `e2e/lab-03/first-login.spec.ts` | Pass |
| **E2E-03** | E2E | AC-10, AC-11, AC-14, AC-15 | IT Staff Operational Workflow: Open Queue -> Filter -> Open Detail -> Claim -> Set Priority -> Internal Note -> Public Comment | Complete staff lifecycle verified | `e2e/lab-03/staff-ticket-flow.spec.ts` | Pass |
| **E2E-04** | E2E | AC-19, AC-20, AC-23, AC-24 | Administrator User Management: Search users -> Create user -> Edit user -> Reset password -> Prevent self-deactivation | All administrative functions and safety guards verified | `e2e/lab-03/user-administration.spec.ts` | Pass |

---

## 3. Acceptance-Criterion Traceability Matrix

| Acceptance Criterion | Planned Automated Test IDs | Automated Test Files |
|---|---|---|
| **AC-01** (Valid Authentication & Token Issuance) | `API-01`, `UI-01`, `E2E-01` | `server/tests/lab-03/auth.api.test.ts`<br>`client/tests/lab-03/Login.test.tsx`<br>`e2e/lab-03/authentication.spec.ts` |
| **AC-02** (Mandatory First-Login Password Change Guard) | `API-04`, `UI-03`, `E2E-02` | `server/tests/lab-03/auth.api.test.ts`<br>`client/tests/lab-03/ChangePassword.test.tsx`<br>`e2e/lab-03/first-login.spec.ts` |
| **AC-03** (Requester Identity Binding & Isolation) | `API-09`, `API-10` | `server/tests/lab-03/authorization.api.test.ts` |
| **AC-04** (Internal Notes Protection from Requesters) | `API-08` | `server/tests/lab-03/comments-notes.api.test.ts` |
| **AC-05** (Inactive Account Login Blocking) | `API-03`, `UI-02` | `server/tests/lab-03/auth.api.test.ts`<br>`client/tests/lab-03/Login.test.tsx` |
| **AC-06** (Invalid Credentials Safe Feedback) | `API-02`, `UI-01` | `server/tests/lab-03/auth.api.test.ts`<br>`client/tests/lab-03/Login.test.tsx` |
| **AC-07** (Password Complexity Validation) | `API-05`, `API-06`, `UI-03`, `E2E-02` | `server/tests/lab-03/auth.api.test.ts`<br>`client/tests/lab-03/ChangePassword.test.tsx`<br>`e2e/lab-03/first-login.spec.ts` |
| **AC-08** (Logout Session Invalidation) | `API-07`, `E2E-01` | `server/tests/lab-03/auth.api.test.ts`<br>`e2e/lab-03/authentication.spec.ts` |
| **AC-09** (IT Staff Single Ticket Detail Retrieval) | `API-13`, `UI-06` | `server/tests/lab-03/staff-ticket-detail.api.test.ts`<br>`client/tests/lab-03/StaffTicketDetail.test.tsx` |
| **AC-10** (Shared IT Queue Filtering & Search) | `API-14`, `API-15`, `UI-05`, `E2E-03` | `server/tests/lab-03/staff-queue.api.test.ts`<br>`client/tests/lab-03/StaffTicketQueue.test.tsx`<br>`e2e/lab-03/staff-ticket-flow.spec.ts` |
| **AC-11** (Ticket Ownership Claiming & Reassignment) | `API-16`, `API-17`, `UI-06`, `E2E-03` | `server/tests/lab-03/staff-ticket-detail.api.test.ts`<br>`client/tests/lab-03/StaffTicketDetail.test.tsx`<br>`e2e/lab-03/staff-ticket-flow.spec.ts` |
| **AC-12** (Decoupled IT Priority Modification) | `API-18`, `UI-06`, `E2E-03` | `server/tests/lab-03/staff-ticket-detail.api.test.ts`<br>`client/tests/lab-03/StaffTicketDetail.test.tsx`<br>`e2e/lab-03/staff-ticket-flow.spec.ts` |
| **AC-13** (Permitted Status Transition Enforcement) | `API-19`, `API-20`, `API-21`, `UI-07` | `server/tests/lab-03/staff-ticket-detail.api.test.ts`<br>`client/tests/lab-03/StaffTicketDetail.test.tsx` |
| **AC-14** (Public Comments Collaboration) | `API-23`, `UI-08`, `E2E-03` | `server/tests/lab-03/comments-notes.api.test.ts`<br>`client/tests/lab-03/StaffTicketDetail.test.tsx`<br>`e2e/lab-03/staff-ticket-flow.spec.ts` |
| **AC-15** (Internal Notes Operational Recording) | `API-24`, `UI-08`, `E2E-03` | `server/tests/lab-03/comments-notes.api.test.ts`<br>`client/tests/lab-03/StaffTicketDetail.test.tsx`<br>`e2e/lab-03/staff-ticket-flow.spec.ts` |
| **AC-16** (Requester Resolution Indication) | `API-22`, `UI-09` | `server/tests/lab-03/staff-ticket-detail.api.test.ts`<br>`client/tests/lab-03/RequesterRegression.test.tsx` |
| **AC-17** (Requester Attachment Continuation) | `API-26` | `server/tests/lab-03/authorization.api.test.ts` |
| **AC-18** (Attachment Multi-Tenant Isolation) | `API-27` | `server/tests/lab-03/authorization.api.test.ts` |
| **AC-19** (Administrator User Creation & Initial Password)| `API-28`, `API-29`, `UI-10`, `E2E-04`| `server/tests/lab-03/users-admin.api.test.ts`<br>`client/tests/lab-03/UserManagement.test.tsx`<br>`e2e/lab-03/user-administration.spec.ts` |
| **AC-20** (Administrator User Account Editing) | `API-30`, `UI-10`, `E2E-04` | `server/tests/lab-03/users-admin.api.test.ts`<br>`client/tests/lab-03/UserManagement.test.tsx`<br>`e2e/lab-03/user-administration.spec.ts` |
| **AC-21** (Administrator Initial Password Reset) | `API-34`, `UI-10`, `E2E-04` | `server/tests/lab-03/users-admin.api.test.ts`<br>`client/tests/lab-03/UserManagement.test.tsx`<br>`e2e/lab-03/user-administration.spec.ts` |
| **AC-22** (Duplicate Email Rejection) | `API-31` | `server/tests/lab-03/users-admin.api.test.ts` |
| **AC-23** (Administrator Self-Deactivation Guard) | `API-32`, `UI-11`, `E2E-04` | `server/tests/lab-03/users-admin.api.test.ts`<br>`client/tests/lab-03/UserManagement.test.tsx`<br>`e2e/lab-03/user-administration.spec.ts` |
| **AC-24** (Last Active Administrator Guard) | `API-33`, `E2E-04` | `server/tests/lab-03/users-admin.api.test.ts`<br>`e2e/lab-03/user-administration.spec.ts` |
| **AC-25** (Role-Based Endpoint Protection) | `API-11`, `API-12` | `server/tests/lab-03/authorization.api.test.ts` |
| **AC-26** (Lab 2 Database Migration Integrity) | `API-35` | `server/tests/lab-03/authorization.api.test.ts` |

---

## 4. Responsive and Visual Design Checklist

- [x] **Desktop Viewport (≥ 992px):**
  - Application shell displays full brand mark, role-specific navigation links, and user profile badge.
  - IT Staff Queue displays full 8-column table without horizontal clipping.
  - IT Staff Ticket Detail renders 4-column metadata grid, full-width discussion threads, and distinct notes panel.
  - Admin User Management renders table with quick-action Edit buttons and sliding modal drawer.
- [x] **Tablet Viewport (768px – 991px):**
  - IT Queue retains full search and filter functionality with condensed column paddings.
  - Form grids collapse gracefully to 2 columns.
  - Discussion inputs and action buttons adapt comfortably.
- [x] **Mobile Viewport (< 768px):**
  - Zero horizontal page scrolling (`overflow-x: hidden`).
  - Queue data table transforms into stacked ticket cards with visible status/priority badges.
  - Admin user management switches to stacked user cards with action buttons.
  - All interactive touch targets (buttons, dropdown triggers, pagination items) measure at least 44px in height.
- [x] **Zen Green Style & Accessibility Compliance:**
  - Header background matches `#006B3C`.
  - Body text uses charcoal-green (`#1C2D27`) with contrast ratio > 4.5:1.
  - Read-only fields styled with `#F3F6F4` background; editable controls use white `#FFFFFF`.
  - Internal notes container uses distinct amber warning styling (`#FFFBEB` background, `#F59E0B` border).
  - Required form fields marked with red asterisk `*`.

---

## 5. Development and Test Execution Commands

### 5.1. Database Migration & Idempotent Seed
```bash
# Start database container
docker compose up -d

# Execute Prisma migration for Lab 3 schema evolution
cd server
npx prisma migrate dev --name lab3_auth_roles_ticketing

# Seed database with idempotency verification
npm run prisma:seed
```

### 5.2. Running Automated Test Suites
```bash
# Run all backend unit, integration, and API tests
cd server
npm test

# Run specific Lab 3 API test suites
npx vitest run tests/lab-03/auth.api.test.ts
npx vitest run tests/lab-03/authorization.api.test.ts
npx vitest run tests/lab-03/staff-queue.api.test.ts
npx vitest run tests/lab-03/staff-ticket-detail.api.test.ts
npx vitest run tests/lab-03/comments-notes.api.test.ts
npx vitest run tests/lab-03/users-admin.api.test.ts

# Run all frontend React component tests
cd client
npm test

# Run specific Lab 3 UI test suites
npx vitest run tests/lab-03/Login.test.tsx
npx vitest run tests/lab-03/ChangePassword.test.tsx
npx vitest run tests/lab-03/StaffTicketQueue.test.tsx
npx vitest run tests/lab-03/StaffTicketDetail.test.tsx
npx vitest run tests/lab-03/UserManagement.test.tsx

# Run Playwright E2E suites across viewports (from repository root)
npm run test:e2e
```

### 5.3. Code Quality & TypeScript Compilation
```bash
# Check TypeScript types across backend and frontend
cd server && npx tsc --noEmit
cd client && npx tsc --noEmit
```
