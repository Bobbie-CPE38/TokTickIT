# Lab 3 Sprint Engineering Specification

## 1. Sprint Goal
Deliver an enterprise-grade authentication, role-based authorization, operational IT Staff ticketing, and user administration increment using the Zen Green design system. This increment replaces the temporary Development Requester selector with secure email/password authentication, mandatory first-login password changes, a shared IT Staff Ticket Queue with search/filter/sort/pagination capabilities, comprehensive IT Staff Ticket Detail management (ticket ownership assignment, IT Priority modification, permitted status transitions with required confirmations, append-only Public Comments, and role-restricted Internal Notes), Requester issue resolution indication, and a minimalist Administrator User Management console with robust safety controls, all while ensuring 100% regression compatibility for completed Lab 2 Requester workflows.

---

## 2. Stakeholder Request Interpretation
The organization has outgrown the simulated Development Requester selector and requires production-grade user identities, access controls, and operational workflows. 

Key expectations:
- **Authentication & Credential Governance:** Secure login with email and password, automatic session invalidation on logout, and mandatory password changes for users provisioned with initial temporary passwords before accessing the main application.
- **Role-Based Access & Isolation:** Three mutually exclusive roles (Requester, IT Staff, Administrator). The backend must enforce role boundaries and resource ownership on every protected endpoint; hiding UI controls is strictly insufficient.
- **Requester Continuity:** Requesters must seamlessly retain all Lab 2 ticket creation, tracking, and attachment capabilities, now tied to their authenticated identity, while gaining the ability to participate in Public Comments and signal when a reported incident appears resolved.
- **Operational IT Staff Workflow:** IT Staff need a shared Ticket Queue to discover, filter, and prioritize tickets, open Ticket Detail, claim or reassign ticket ownership, adjust IT Priority, record private Internal Notes (hidden from Requesters), communicate via Public Comments, and progress tickets through formal lifecycle status transitions. IT Staff retain sole responsibility for formally resolving or closing tickets.
- **Minimalist Administrator User Management:** Administrators require a dedicated, streamlined user administration interface to search/filter users, create new accounts with assigned roles and initial passwords, update user details and activation status, and reset initial passwords, backed by strict safety rules preventing self-deactivation, system lockout of the last active Administrator, and duplicate emails.
- **Zen Green Design System Continuity:** Maintain strict fidelity to the established Zen Green visual language, design tokens, responsive breakpoints, and reusable UI components.

---

## 3. Scope

### 3.1. Included Scope
1. **Authentication & Session Management:**
   - Secure credential verification (email and hashed passwords using bcrypt with 10 salt rounds).
   - Session or token-based authentication via JWT in `Authorization: Bearer <token>` header with 8-hour expiration and safe logout blocklist invalidation.
   - Architectural CSRF mitigation by decoupling credentials from browser ambient cookies.
   - Mandatory first-login password change interceptor for accounts flagged with initial passwords (`mustChangePassword = true`).
   - Current authenticated user retrieval endpoint (`GET /api/auth/me`).
   - Inactive account access blocking with safe failure messages.
2. **Role-Based Navigation & Authorization:**
   - Role-specific navigation shells for Requester, IT Staff, and Administrator.
   - Strict server-side enforcement of role permissions and data ownership on all endpoints.
3. **Database Migration & Evolution:**
   - Evolution of Lab 2 `DevelopmentRequester` model to a unified `User` model with role support, preserving existing Category, Related System, Ticket, and Attachment data.
   - Explicit renaming and migration of `Attachment.uploadedByRequesterId` to `Attachment.uploadedByUserId` referencing `User(id)`.
   - New database models for `PublicComment` and `InternalNote`.
   - Updated `Ticket` model with `ticketOwnerId`, `itPriority`, and full 8-status `TicketStatus` lifecycle enum (`NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CLOSED`, `REOPENED`, `CANCELLED`).
   - Comprehensive idempotent seed script covering all roles, active/inactive accounts, realistic tickets, comments, and notes with harmonized `@toktickit.com` credentials.
4. **Requester Increment & Regression Protection:**
   - Seamless continuation of Lab 2 Create Ticket (`/tickets/new`), My Tickets (`/tickets`), and Ticket Detail (`/tickets/:id`).
   - Removal of Development Requester selector and "Change Requester" action.
   - Public Comments thread on Ticket Detail allowing Requesters to post and read comments.
   - "Problem Appears Resolved" indication allowing Requesters to signal issue resolution.
   - Full continuation of attachment upload (max 5 MB, max 5 active), download, and soft removal with mandatory audit reason under authenticated user context.
5. **IT Staff Ticketing Workflow:**
   - Shared IT Staff Ticket Queue with keyword search, multi-criteria filtering (Category, IT Priority, Status, Owner), dynamic sorting, and pagination.
   - IT Staff Ticket Detail inspection and management view with full relation loading.
   - Prominent alert banner displaying Requester's "Problem Appears Resolved" signal.
   - Ticket ownership claiming and reassignment to active IT Staff or Administrator.
   - IT Priority adjustments (`LOW`, `MEDIUM`, `HIGH`, `URGENT`).
   - Permitted ticket status transitions according to the approved state transition matrix, with required confirmation dialogs for resolution, closure, and cancellation.
   - Public Comments communication with Requesters.
   - Secure, private Internal Notes (strictly restricted to IT Staff and Administrators).
6. **Minimalist Administrator User Management:**
   - User listing displaying Name, Email, Role, Status, and Edit action.
   - User search by name or email, with an optional role filter.
   - User creation with name, email, one permitted role, activation state, and initial password with `mustChangePassword = true`.
   - User editing (name, email, role, activation state).
   - Setting a new initial password that requires a password change upon next login.
   - Administrator safety protections: self-deactivation prevention, last active administrator protection, duplicate email prevention, and deactivation in place of deletion.
7. **Zen Green UI & Responsive Delivery:**
   - Application shell with authenticated user badge and role indicator.
   - Responsive layouts optimized across Desktop (≥ 992px), Tablet (768–991px), and Mobile (< 768px).

### 3.2. Explicitly Excluded Scope (Out of Scope for Lab 3)
1. **Advanced Identity & Auth Features:**
   - Email invitations, automated password-reset emails, magic links, or email delivery of credentials.
   - Multi-factor authentication (MFA), social login (OAuth/Google), and Single Sign-On (SSO).
   - Self-registration, public sign-up, and Requester-created accounts.
   - Multiple roles assigned to a single user (users possess exactly one role).
   - User deletion, bulk user operations, import/export, and account audit history.
   - Extended user profile management (departments, phone numbers, avatars, organizational hierarchies).
   - Account unlocking or automated administrator approval workflows.
2. **IT Staff Advanced Automation & Collaboration:**
   - "Actions Taken" by IT Staff (deferred to Lab 4).
   - Formal SLA calculations, automated escalation timers, and external email/webhook notifications.
   - Advanced analytics dashboards and KPI reports beyond simple queue item counts.
3. **Advanced User Listing Features:**
   - Mandatory pagination for user administration (simple scrollable/clean list).
   - Multi-column sorting and simultaneous multiple filter combinations on user management.
4. **Infrastructure & Multi-Tenancy:**
   - Multi-tenant organization boundaries, department partitioning, and customer administration.
   - Production cloud deployment, Kubernetes, or multi-region infrastructure setups.

---

## 4. Functional Requirements

### 4.1. Authentication & Session Management
- **FR-01 (User Authentication):** The system must authenticate active users using a valid email address and password against bcrypt password hashes.
- **FR-02 (Authentication Feedback):** The system must display safe, non-revealing error feedback for invalid credentials or inactive accounts without disclosing whether the email exists.
- **FR-03 (Mandatory Password Change):** When a user with `mustChangePassword = true` authenticates successfully, the application must intercept navigation and mandate a password change before permitting access to standard application views.
- **FR-04 (Password Complexity Enforcement):** The password change interface and backend must enforce password strength: minimum 8 characters, containing uppercase, lowercase, numeric, and special characters.
- **FR-05 (Current Authenticated User Context):** The backend must expose an endpoint (`GET /api/auth/me`) returning the identity and permitted role of the authenticated session.
- **FR-06 (User Logout):** The application must provide a logout action in the header that terminates the authenticated session on the backend, clears client credentials, and redirects to the login screen.
- **FR-07 (Protected Route Guard):** Direct browser navigation or API calls to protected destinations without an active authenticated session must be redirected to `/login` or rejected with HTTP 401 Unauthorized.

### 4.2. Role-Based Navigation & Access Control
- **FR-08 (Role-Specific Navigation Shell):** The application shell must dynamically render navigation items matching the user's single permitted role:
  - *Requester:* "My Tickets", "+ Create Ticket"
  - *IT Staff:* "My Queue", "+ Create Ticket"
  - *Administrator:* "Admin" (User Management)
- **FR-09 (Server-Side Authorization Enforcement):** The backend must enforce role boundaries on all endpoints regardless of frontend state. Requests from unauthorized roles must be rejected with HTTP 403 Forbidden.
- **FR-10 (Requester Ownership Scope):** Requesters can only access, view, list, or submit tickets and attachments associated with their own authenticated user ID. Access to another user's ticket must return HTTP 404 Not Found to avoid disclosing ticket existence.

### 4.3. Requester Ticket Workflow & Regression
- **FR-11 (Requester Identity Binding):** Upon ticket creation, the backend must assign the authenticated user's ID as `requesterId`, completely ignoring any client-provided requester identifier.
- **FR-12 (Lab 2 Functional Continuation):** Requesters must retain full capabilities to create tickets, search/filter their "My Tickets" list, view ticket details, download active attachments, upload additional attachments (max 5 active), and soft-remove attachments with mandatory reasons under the authenticated `User` model.
- **FR-13 (Public Commenting by Requester):** A Requester can post Public Comments on their owned tickets and view all existing Public Comments.
- **FR-14 (Problem Appears Resolved Action):** A Requester can indicate on their owned ticket that the problem appears resolved (`isRequesterResolved = true`), updating the ticket's resolution indicator while leaving formal status progression to IT Staff.

### 4.4. IT Staff Shared Ticket Queue & Detail Operations
- **FR-15 (Shared Queue Retrieval):** IT Staff and Administrators can retrieve the shared ticket queue with server-side keyword search (ticket number, summary), multi-field filtering (Category, IT Priority, Status, Owner), sorting, and pagination.
- **FR-16 (IT Staff Ticket Detail Inspection):** IT Staff and Administrators can open any ticket from the queue to inspect full ticket information, attachments, public comments, internal notes, and requester resolution signals (`GET /api/staff/tickets/:id`).
- **FR-17 (Ticket Ownership Claim & Reassignment):** IT Staff and Administrators can claim an unassigned ticket or reassign ticket ownership to any active IT Staff or Administrator.
- **FR-18 (IT Priority Management):** IT Staff and Administrators can modify the ticket's `itPriority` independently of the Requester's original `requestedPriority`.
- **FR-19 (Permitted Status Transitions & Confirmations):** IT Staff and Administrators can update ticket status strictly following the approved status transition matrix, triggering mandatory confirmation dialogs for resolution, closure, and cancellation.
- **FR-20 (Internal Notes Management):** IT Staff and Administrators can create and view append-only private Internal Notes on any ticket. Internal notes must never be accessible to Requesters.
- **FR-21 (IT Staff Public Commenting):** IT Staff and Administrators can post Public Comments to communicate directly with the Requester.

### 4.5. Minimalist Administrator User Management
- **FR-22 (User List Retrieval):** Administrators can view a complete list of users displaying Name, Email, Role, Account Status, and an Edit action, with search by name/email and role filtering.
- **FR-23 (User Search & Role Filter):** Administrators can search the user list by name or email substring and filter by role (`REQUESTER`, `IT_STAFF`, `ADMINISTRATOR`).
- **FR-24 (User Creation):** Administrators can create a new user by specifying Name, Email, exactly one permitted Role, initial Activation State, and an Initial Password. The created account must have `mustChangePassword = true`.
- **FR-25 (User Account Editing):** Administrators can edit an existing user's Name, Email, Role, and Activation State via `PATCH /api/admin/users/:id`.
- **FR-26 (Initial Password Reset):** Administrators can set a new initial password for any user via `POST /api/admin/users/:id/reset-password`, automatically resetting their flag to `mustChangePassword = true`.
- **FR-27 (Administrator Safety Guards):** The system must prevent an Administrator from deactivating their own account, prevent the deactivation or role modification of the last remaining active Administrator, and reject duplicate email addresses.

---

## 5. Business Rules

| Rule ID | Rule Title | Detailed Business Rule Statement |
|---|---|---|
| **BR-01** | **Active User Authentication Only** | Only users with `isActive = true` and matching hashed password credentials may successfully authenticate. Inactive users must be rejected with a generic, safe failure message ("Account is inactive. Please contact your system administrator.") without revealing password validity. |
| **BR-02** | **Mandatory First-Login Password Change** | A user marked with `mustChangePassword = true` cannot access any standard application view or operational API until a new password meeting complexity requirements is saved. |
| **BR-03** | **Authoritative Server Identity** | The authenticated user session, established via verified credentials, strictly determines user identity and role for all operations. Any `requesterId` or `userId` supplied in client request bodies or headers is ignored for identity resolution. |
| **BR-04** | **Comment & Note Visibility Boundary** | Public Comments are visible to Requesters, IT Staff, and Administrators. Internal Notes are strictly confidential to IT Staff and Administrators; any access attempt by a Requester must return HTTP 403 Forbidden without leaking note content or count. |
| **BR-05** | **Separation of Resolution Authority** | A Requester may flag that a reported incident "Appears Resolved" (`isRequesterResolved = true`), but cannot formally transition a ticket's `currentStatus` to `RESOLVED` or `CLOSED`. Only IT Staff or Administrators may formally resolve or close a ticket. |
| **BR-06** | **Single Permitted Role** | Every user in the system is assigned exactly one role: `REQUESTER`, `IT_STAFF`, or `ADMINISTRATOR`. Role combinations or multi-role inheritance are strictly prohibited. |
| **BR-07** | **Password Complexity Policy** | Passwords must be at least 8 characters in length and contain at least one uppercase letter, one lowercase letter, one numeric digit, and one special character (e.g. `!@#$%^&*()_+-=[]{}|;:,.<>?`). Passwords must never be stored in plaintext and must be hashed using bcrypt (minimum 10 salt rounds). |
| **BR-08** | **Session Invalidation on Logout** | Logging out must immediately invalidate the server-side authentication state and clear client-side credentials. Reusing an invalidated token or session cookie must return HTTP 401 Unauthorized. |
| **BR-09** | **Unique Email Constraint** | User email addresses must be unique across the entire application (case-insensitive). Creating or updating a user with an email already in use by another user must be rejected with HTTP 409 Conflict. |
| **BR-10** | **Ticket Ownership Assignment Rules** | Each Ticket may have zero or one primary `ticketOwnerId`. Only active users possessing the `IT_STAFF` or `ADMINISTRATOR` role may be assigned as ticket owner. Assigning an inactive user or a user with the `REQUESTER` role is rejected with HTTP 422 Unprocessable Entity. |
| **BR-11** | **IT Priority Decoupling** | Upon ticket creation, `itPriority` is automatically initialized with the Requester's `requestedPriority`. Subsequent modifications to `itPriority` can only be performed by IT Staff or Administrators. |
| **BR-12** | **Append-Only Communication Records** | Public Comments and Internal Notes are strictly append-only. No user (including Administrators) can edit or delete an existing comment or note. The backend automatically binds `authorId = currentUser.id` and `createdAt = now()`. |
| **BR-13** | **Comment & Note Content Validation** | Public Comments and Internal Notes must contain between 1 and 2,000 characters after whitespace trimming. Empty or whitespace-only submissions must be rejected with HTTP 422 Unprocessable Entity. Output must be sanitized to prevent Cross-Site Scripting (XSS). |
| **BR-14** | **Permitted Status Transitions & Confirmations** | Ticket status changes must follow the authorized lifecycle rules: <br>• `NEW` → `OPEN`, `IN_PROGRESS`, `CANCELLED`<br>• `OPEN` → `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `CANCELLED`<br>• `IN_PROGRESS` → `WAITING_FOR_REQUESTER`, `RESOLVED`, `CANCELLED`<br>• `WAITING_FOR_REQUESTER` → `IN_PROGRESS`, `RESOLVED`, `CANCELLED`<br>• `RESOLVED` → `CLOSED`, `REOPENED`<br>• `REOPENED` → `IN_PROGRESS`, `RESOLVED`, `CANCELLED`<br>• `CLOSED` → `REOPENED` (permitted exclusively for IT Staff and Administrators with confirmation dialog and rationale; otherwise terminal)<br>• `CANCELLED` → Terminal (no transitions permitted)<br>Only IT Staff and Administrators may execute status transitions. Direct jumps outside this matrix must be rejected with HTTP 422. <br>**Required Confirmations:** Progressing a ticket to `CANCELLED`, `CLOSED`, `RESOLVED`, or `REOPENED` explicitly mandates a confirmation modal in the UI. Transitioning to `RESOLVED` requires a non-empty `resolutionSummary`. |
| **BR-15** | **Resolution Summary Requirement** | Transitioning a ticket to `RESOLVED` requires a non-empty `resolutionSummary` (minimum 5 characters, maximum 1,000 characters) explaining the resolution. Transitioning from `RESOLVED` to `CLOSED` automatically retains the existing `resolutionSummary` stored on the ticket if not re-submitted, and optionally allows IT Staff to update it in the closure confirmation modal. |
| **BR-16** | **Self-Deactivation Protection** | An Administrator cannot deactivate their own user account or change their own role away from `ADMINISTRATOR`. Such attempts must be rejected with HTTP 422 Unprocessable Entity. |
| **BR-17** | **Last Active Administrator Protection** | The system must prevent deactivating or reassigning the role of the last remaining active Administrator in the database. Any action that would reduce the active Administrator count to zero must be rejected with HTTP 422 Unprocessable Entity. |
| **BR-18** | **Account Deactivation Over Deletion** | User accounts are never physically deleted from the database (`User.delete` is disabled). Inactive accounts (`isActive = false`) are preserved to maintain foreign key integrity with historical tickets, comments, notes, and attachments. |
| **BR-19** | **Initial Password Flagging** | Whenever an Administrator creates a new user or resets a user's initial password, the account must be saved with `mustChangePassword = true`. |
| **BR-20** | **Form State Retention on API Failure** | When form submissions fail on any screen (Login, Password Change, Create User, Edit User, Post Comment, Note, or Status Change), all entered input values must remain intact in the UI controls to prevent data loss. |
| **BR-21** | **Current User Context & Active Session Validation** | `GET /api/auth/me` resolves identity from the verified session/token. If an account has been deactivated (`isActive = false`) after token issuance, subsequent API requests must be rejected immediately with HTTP 403 Forbidden. |
| **BR-22** | **Lab 2 Functional Regression Integrity** | All completed Lab 2 ticket submission, category/system listing, attachment upload, download, and soft-remove capabilities must continue functioning identically under the authenticated `User` model without the mock Development Requester selector. |
| **BR-23** | **IT Staff & Administrator Attachment Management** | IT Staff and Administrators may upload attachments (diagnostics, logs, screenshots, patches up to 5 MB, max 5 active) to any ticket they are managing in the IT Staff queue. The backend binds `uploadedByUserId = currentUser.id` and enforces identical MIME type, file size, and soft-removal policies. |

---

## 6. UI Specification Summary
The TokTickIT interface strictly adheres to the Zen Green design system documented in `docs/lab-03/ui-spec.md`.

### 6.1. Primary Color Tokens & Visual Principles
- **Primary Green (`#006B3C`):** Application header banner, primary CTA buttons (`Sign In`, `Continue`, `Save User`, `+ Create Ticket`).
- **Secondary Green (`#0B7A46`):** Active navigation tabs, focus rings, interactive links, button hover states.
- **Pale Green (`#EAF6EF`):** Selected table rows, success alerts, and subtle panel accents.
- **Page Background (`#F5F7F6`):** Global neutral application backdrop.
- **Card / Surface (`#FFFFFF`):** Container background with subtle borders (`#E2E8F0`).
- **Editable Controls (`#FFFFFF`):** Active text inputs, selects, and textareas with `#D1D5DB` borders.
- **Read-Only Controls (`#F3F6F4`):** Distinct soft gray-green background with `#E2E8F0` borders for non-editable ticket fields.
- **Internal Notes Accent (`#FFFBEB` background, `#F59E0B` border):** Warm amber callout styling visually separating private notes from public comments.
- **Typography:** Charcoal-green `#1C2D27` body text (never `#000000`) and `#52665D` muted labels.

### 6.2. Screen Structure and Role-Based Modes
1. **Login Screen (`/login`):** Centered card layout featuring email and password inputs with password visibility toggling, inline error placement, busy spinner on submit, and safe failure messaging.
2. **Mandatory Password Change Screen (`/change-password`):** Modal-style interceptor displaying current password, new password, and confirmation inputs, alongside a live visual checklist for password complexity requirements.
3. **Requester Screens (`/tickets`, `/tickets/new`, `/tickets/:id`):** 
   - Preserves all Lab 2 ticket submission and search/filter list functionality without the mock selector.
   - Ticket Detail adds an append-only Public Comments thread, full attachment operations, and a prominent "Problem Appears Resolved" banner.
4. **IT Staff Ticket Queue (`/queue`):** Comprehensive table with search bar, filter drawers (Category, IT Priority, Status, Owner), column sorting, responsive card view on mobile, and pagination controls.
5. **IT Staff Ticket Detail (`/queue/:id`):** Split layout featuring editable operational controls (Owner assignment, IT Priority, Status transitions with confirmation dialogs), prominent "Problem Appears Resolved" indicator banner, read-only issue details, file attachments, visually distinct Public Comments (green accent), and role-restricted Internal Notes (amber accent with security banner).
6. **Administrator User Management (`/admin/users`):** Clean administrative table showing Name, Email, Role badge, Status badge, and Edit button; keyword search by name/email; role filter dropdown; and a sliding side-drawer / modal for user creation, editing, activation toggling, and initial password resets.

---

## 7. Data Changes (Database Increment)

### 7.1. Prisma Schema Evolution (`server/prisma/schema.prisma`)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  REQUESTER
  IT_STAFF
  ADMINISTRATOR
}

enum Priority {
  LOW
  MEDIUM
  HIGH
  URGENT
}

enum TicketStatus {
  NEW
  OPEN
  IN_PROGRESS
  WAITING_FOR_REQUESTER
  RESOLVED
  CLOSED
  REOPENED
  CANCELLED
}

model User {
  id                 Int              @id @default(autoincrement())
  email              String           @unique
  passwordHash       String
  name               String
  role               Role             @default(REQUESTER)
  isActive           Boolean          @default(true)
  mustChangePassword Boolean          @default(false)
  createdAt          DateTime         @default(now())
  updatedAt          DateTime         @updatedAt

  // Relationships
  submittedTickets   Ticket[]         @relation("RequesterTickets")
  assignedTickets    Ticket[]         @relation("AssignedStaffTickets")
  uploadedAttachments Attachment[]    @relation("UserAttachments")
  publicComments     PublicComment[]  @relation("UserPublicComments")
  internalNotes      InternalNote[]   @relation("UserInternalNotes")

  @@index([role, isActive])
  @@map("users")
}

model Category {
  id        Int       @id @default(autoincrement())
  name      String    @unique
  isActive  Boolean   @default(true)
  createdAt DateTime  @default(now())
  tickets   Ticket[]

  @@map("categories")
}

model RelatedSystem {
  id        Int       @id @default(autoincrement())
  name      String    @unique
  isActive  Boolean   @default(true)
  createdAt DateTime  @default(now())
  tickets   Ticket[]

  @@map("related_systems")
}

model Ticket {
  id                  Int              @id @default(autoincrement())
  ticketNumber        String           @unique // e.g. TKT-2026-000101
  summary             String
  description         String
  requestedPriority   Priority         @default(MEDIUM)
  itPriority          Priority         @default(MEDIUM)
  currentStatus       TicketStatus     @default(NEW)
  resolutionSummary   String?
  isRequesterResolved Boolean          @default(false)

  requesterId         Int
  requester           User             @relation("RequesterTickets", fields: [requesterId], references: [id], onDelete: Restrict)

  ticketOwnerId       Int?
  ticketOwner         User?            @relation("AssignedStaffTickets", fields: [ticketOwnerId], references: [id], onDelete: SetNull)

  categoryId          Int
  category            Category         @relation(fields: [categoryId], references: [id], onDelete: Restrict)

  relatedSystemId     Int
  relatedSystem       RelatedSystem    @relation(fields: [relatedSystemId], references: [id], onDelete: Restrict)

  attachments         Attachment[]
  publicComments      PublicComment[]
  internalNotes       InternalNote[]

  createdAt           DateTime         @default(now())
  updatedAt           DateTime         @updatedAt

  @@index([requesterId, createdAt])
  @@index([ticketOwnerId, currentStatus])
  @@index([currentStatus])
  @@index([itPriority])
  @@map("tickets")
}

model Attachment {
  id                    Int       @id @default(autoincrement())
  ticketId              Int
  ticket                Ticket    @relation(fields: [ticketId], references: [id], onDelete: Cascade)

  originalFileName      String
  storageKey            String    @unique
  fileSize              Int
  mimeType              String

  uploadedByUserId      Int
  uploadedBy            User      @relation("UserAttachments", fields: [uploadedByUserId], references: [id], onDelete: Restrict)

  isRemoved             Boolean   @default(false)
  removedAt             DateTime?
  removalReason         String?

  createdAt             DateTime  @default(now())

  @@index([ticketId, isRemoved])
  @@map("attachments")
}

model PublicComment {
  id        Int       @id @default(autoincrement())
  ticketId  Int
  ticket    Ticket    @relation(fields: [ticketId], references: [id], onDelete: Cascade)

  authorId  Int
  author    User      @relation("UserPublicComments", fields: [authorId], references: [id], onDelete: Restrict)

  content   String
  createdAt DateTime  @default(now())

  @@index([ticketId, createdAt])
  @@map("public_comments")
}

model InternalNote {
  id        Int       @id @default(autoincrement())
  ticketId  Int
  ticket    Ticket    @relation(fields: [ticketId], references: [id], onDelete: Cascade)

  authorId  Int
  author    User      @relation("UserInternalNotes", fields: [authorId], references: [id], onDelete: Restrict)

  content   String
  createdAt DateTime  @default(now())

  @@index([ticketId, createdAt])
  @@map("internal_notes")
}
```

### 7.2. Database Migration Strategy from Lab 2
1. **Table Migration & Consolidation:** The `development_requesters` table is migrated to the new `users` table. Existing columns (`id`, `name`, `email`, `isActive`, `createdAt`, `updatedAt`) are preserved.
2. **Column Additions to `users`:**
   - Add `passwordHash VARCHAR(255) NOT NULL`.
   - Add `role VARCHAR(50) NOT NULL DEFAULT 'REQUESTER'`.
   - Add `mustChangePassword BOOLEAN NOT NULL DEFAULT false`.
3. **Data Preservation & Role Mapping (Zero-Regression Guarantee):** To guarantee 100% backward compatibility and prevent regression failures across the 43 existing automated test suites in `server/tests/lab-02/` (which hardcode queries for `@kmutt.ac.th` emails such as `jennifer.anderson@kmutt.ac.th` and rely on `david.lee@kmutt.ac.th` as a Requester for isolation testing), all 5 original Lab 2 users are migrated to the `User` model with role **`REQUESTER`** and retain their original `@kmutt.ac.th` email addresses:
   - `Jennifer Anderson` (`jennifer.anderson@kmutt.ac.th`) $\rightarrow$ Role: `REQUESTER`, Password: `Password123!`, `mustChangePassword: false`
   - `David Lee` (`david.lee@kmutt.ac.th`) $\rightarrow$ Role: `REQUESTER`, Password: `Password123!`, `mustChangePassword: false`
   - `Sarah Johnson` (`sarah.johnson@kmutt.ac.th`) $\rightarrow$ Role: `REQUESTER`, Password: `Password123!`, `mustChangePassword: false`
   - `Michael Brown` (`michael.brown@kmutt.ac.th`) $\rightarrow$ Role: `REQUESTER`, Password: `Password123!`, `mustChangePassword: false`
   - `Alex Inactive` (`alex.inactive@kmutt.ac.th`) $\rightarrow$ Role: `REQUESTER`, `isActive: false`, Password: `Password123!`
   Dedicated accounts with `@toktickit.com` domains are provisioned for `IT_STAFF` and `ADMINISTRATOR` roles.
4. **Ticket & Attachment Schema Evolution:**
   - Foreign key `requesterId` in `tickets` is rebound to `users(id)`.
   - In `attachments`, column `uploadedByRequesterId` is renamed to `uploadedByUserId` referencing `users(id)`.
   - Add `ticketOwnerId INT NULL REFERENCES users(id) ON DELETE SET NULL`.
   - Add `isRequesterResolved BOOLEAN NOT NULL DEFAULT false`.
   - **PostgreSQL Enum Migration Strategy:** Renaming `PENDING` to `WAITING_FOR_REQUESTER` in PostgreSQL cannot be performed automatically by Prisma schema diffing without dropping or rebuilding types, which would fail or corrupt historical tickets. A custom SQL migration file (`server/prisma/migrations/..._evolve_ticket_status/migration.sql`) must be executed using:
     ```sql
     -- Step 1: Safely rename legacy PENDING enum value to WAITING_FOR_REQUESTER
     ALTER TYPE "TicketStatus" RENAME VALUE 'PENDING' TO 'WAITING_FOR_REQUESTER';

     -- Step 2: Add new status values to the enum
     ALTER TYPE "TicketStatus" ADD VALUE IF NOT EXISTS 'REOPENED';
     ALTER TYPE "TicketStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';
     ```
5. **New Communication Tables:** Create `public_comments` and `internal_notes` tables with indexes on `[ticketId, createdAt]`.
6. **Removal of Development Selector State:** Client-side local storage keys for mock requesters (`mockRequesterId`) are permanently deprecated and removed.

### 7.3. Idempotent Seed Data (`server/prisma/seed.ts`)
The seed script uses `upsert` operations ensuring repeated runs produce identical database states.
- **Requester Accounts (4 Active, 1 Inactive - Preserved from Lab 2):**
  1. `jennifer.anderson@kmutt.ac.th` (Active, Jennifer Anderson, Role: `REQUESTER`, Password: `Password123!`, `mustChangePassword: false`)
  2. `david.lee@kmutt.ac.th` (Active, David Lee, Role: `REQUESTER`, Password: `Password123!`, `mustChangePassword: false`)
  3. `sarah.johnson@kmutt.ac.th` (Active, Sarah Johnson, Role: `REQUESTER`, Password: `Password123!`, `mustChangePassword: false`)
  4. `michael.brown@kmutt.ac.th` (Active, Michael Brown, Role: `REQUESTER`, Password: `Password123!`, `mustChangePassword: false`)
  5. `alex.inactive@kmutt.ac.th` (Inactive, Alex Inactive, Role: `REQUESTER`, `isActive: false`, Password: `Password123!`)
  6. `firstlogin.requester@toktickit.com` (Active, FirstLogin Requester, Role: `REQUESTER`, Password: `InitialPass123!`, `mustChangePassword: true` - for testing first login)
- **IT Staff Accounts (3 Active, 1 Inactive - Dedicated Operational Accounts):**
  1. `staff.michael@toktickit.com` (Active, IT Staff, Michael Brown, Role: `IT_STAFF`, Password: `Password123!`, `mustChangePassword: false`)
  2. `staff.sarah@toktickit.com` (Active, IT Staff, Sarah Johnson, Role: `IT_STAFF`, Password: `Password123!`, `mustChangePassword: false`)
  3. `staff.david@toktickit.com` (Active, IT Staff, David Lee, Role: `IT_STAFF`, Password: `InitialPass123!`, `mustChangePassword: true` - for testing first login)
  4. `kpatel@toktickit.com` (Inactive, IT Staff, Kevin Patel, Role: `IT_STAFF`, `isActive: false`, Password: `Password123!`)
- **Administrator Accounts (1 Active):**
  1. `admin@toktickit.com` (Active, Administrator, John Smith, Role: `ADMINISTRATOR`, Password: `AdminPass123!`, `mustChangePassword: false`)
- **Categories & Systems:** Retains Lab 2's 4 active categories and 7 related systems.
- **Realistic Ticket Distribution:** Seed at least 10 realistic tickets distributed across Requesters and covering **all 8 statuses** (`NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CLOSED`, `REOPENED`, `CANCELLED`), priorities, and assigned ownership (`staff.michael@toktickit.com` or unassigned).
- **Public Comments & Internal Notes:** Seed realistic comments and internal notes on assigned tickets illustrating communication threads.

---

## 8. API Contract Summary
Full schemas, parameters, and error formats are specified in `docs/lab-03/api-spec.md`.

| Method | Endpoint | Description | Role Authorization |
|---|---|---|---|
| `POST` | `/api/auth/login` | Authenticate with email/password; issue session/token | Public |
| `POST` | `/api/auth/logout` | Terminate session and invalidate client token | Authenticated |
| `GET` | `/api/auth/me` | Retrieve profile and role of current user | Authenticated |
| `POST` | `/api/auth/change-password` | Mandatory or voluntary password update | Authenticated (`mustChangePassword` supported) |
| `GET` | `/api/categories` | List active ticket categories | Authenticated |
| `GET` | `/api/related-systems` | List active related systems | Authenticated |
| `POST` | `/api/tickets` | Create a new ticket (requester extracted from auth session) | `REQUESTER` |
| `GET` | `/api/tickets` | List tickets owned by authenticated Requester | `REQUESTER` |
| `GET` | `/api/tickets/:id` | Retrieve single owned ticket detail (404 if not owned) | `REQUESTER` (owner only) |
| `PATCH` | `/api/tickets/:id/resolve-indication`| Requester indicates problem appears resolved | `REQUESTER` (owner only) |
| `POST` | `/api/tickets/:id/attachments` | Upload attachment to ticket | `REQUESTER` (owner), `IT_STAFF`, `ADMINISTRATOR` |
| `GET` | `/api/attachments/:id/download`| Download active attachment | `REQUESTER` (owner), `IT_STAFF`, `ADMINISTRATOR` |
| `PATCH` | `/api/attachments/:id/soft-remove`| Soft-remove attachment with mandatory reason | `REQUESTER` (owner), `IT_STAFF`, `ADMINISTRATOR` |
| `GET` | `/api/staff/tickets` | Retrieve shared IT ticket queue (search, filter, sort, page) | `IT_STAFF`, `ADMINISTRATOR` |
| `GET` | `/api/staff/tickets/:id` | Retrieve single ticket detail with relations for IT ops | `IT_STAFF`, `ADMINISTRATOR` |
| `PATCH` | `/api/staff/tickets/:id/assignment`| Claim or reassign ticket ownership | `IT_STAFF`, `ADMINISTRATOR` |
| `PATCH` | `/api/staff/tickets/:id/priority`| Update ticket IT Priority | `IT_STAFF`, `ADMINISTRATOR` |
| `PATCH` | `/api/staff/tickets/:id/status`| Update ticket status according to transition matrix | `IT_STAFF`, `ADMINISTRATOR` |
| `GET` | `/api/tickets/:id/comments` | Retrieve all public comments for a ticket | `REQUESTER` (owner), `IT_STAFF`, `ADMINISTRATOR` |
| `POST` | `/api/tickets/:id/comments` | Post a new public comment to a ticket | `REQUESTER` (owner), `IT_STAFF`, `ADMINISTRATOR` |
| `GET` | `/api/tickets/:id/notes` | Retrieve private internal notes for a ticket | `IT_STAFF`, `ADMINISTRATOR` (strictly forbidden to Requester) |
| `POST` | `/api/tickets/:id/notes` | Create a new internal note on a ticket | `IT_STAFF`, `ADMINISTRATOR` (strictly forbidden to Requester) |
| `GET` | `/api/admin/users` | List users with search by name/email and role filter | `ADMINISTRATOR` |
| `POST` | `/api/admin/users` | Create a user with role and initial password | `ADMINISTRATOR` |
| `PATCH` | `/api/admin/users/:id` | Update user name, email, role, and activation status | `ADMINISTRATOR` |
| `POST` | `/api/admin/users/:id/reset-password`| Set new initial password requiring change at next login | `ADMINISTRATOR` |

---

## 9. Acceptance Criteria

- **AC-01 (Valid Authentication & Token Issuance):**
  - *Given* an active user with valid credentials,
  - *When* the user submits the login form,
  - *Then* the backend establishes authenticated access, returns HTTP 200 with a JWT token and permitted user identity and role, and redirects to the role's default view.

- **AC-02 (Mandatory First-Login Password Change Guard):**
  - *Given* a user who must change the initial password (`mustChangePassword = true`),
  - *When* login succeeds,
  - *Then* normal application screens remain unavailable until a valid new password meeting complexity rules is saved.

- **AC-03 (Password Complexity Validation):**
  - *Given* a user on the change password screen,
  - *When* the user submits a password under 8 characters or missing uppercase/lowercase/numbers/special characters,
  - *Then* submission is rejected with field-level validation feedback, and the database password hash remains unchanged.

- **AC-04 (Inactive Account Login Blocking):**
  - *Given* a user account with `isActive = false`,
  - *When* the user attempts to log in with correct credentials,
  - *Then* authentication is rejected with HTTP 403 Forbidden and the safe error message "Account is inactive. Please contact your system administrator."

- **AC-05 (Invalid Credentials Safe Feedback):**
  - *Given* an incorrect email address or invalid password,
  - *When* the user attempts login,
  - *Then* the system responds with HTTP 401 Unauthorized and displays "Invalid email or password. Please try again." without disclosing account existence.

- **AC-06 (Logout Session Termination):**
  - *Given* an authenticated user session,
  - *When* the user clicks "Sign Out",
  - *Then* the backend terminates the session, client authentication tokens are cleared, and navigating back redirects to `/login`.

- **AC-07 (Requester Identity Binding):**
  - *Given* an authenticated Requester session,
  - *When* the user submits a new ticket or requests ticket lists,
  - *Then* the backend automatically resolves ownership from the authenticated session and completely ignores any client-supplied `requesterId`.

- **AC-08 (Requester Ticket Isolation):**
  - *Given* Requester A and Requester B,
  - *When* Requester A attempts to fetch or modify a ticket belonging to Requester B,
  - *Then* the backend rejects the request with HTTP 404 Not Found and discloses zero ticket metadata.

- **AC-09 (Internal Notes Protection from Requesters):**
  - *Given* an authenticated Requester account,
  - *When* the client attempts to access `GET /api/tickets/:id/notes` or `POST /api/tickets/:id/notes`,
  - *Then* the operation is rejected with HTTP 403 Forbidden without disclosing whether internal notes exist.

- **AC-10 (Shared IT Queue Filtering & Search):**
  - *Given* an authenticated IT Staff user on the Ticket Queue,
  - *When* the user filters by `Status = OPEN` and searches for keyword "network",
  - *Then* the queue updates dynamically to display only matching tickets with correct pagination metadata.

- **AC-11 (Ticket Ownership Claiming & Reassignment):**
  - *Given* an unassigned ticket in the IT queue,
  - *When* an active IT Staff user claims the ticket or an Administrator reassigns it to another active staff member,
  - *Then* `ticketOwnerId` is updated in the database, and the queue/detail reflects the new owner.

- **AC-12 (Decoupled IT Priority Modification):**
  - *Given* an open ticket with `requestedPriority = MEDIUM`,
  - *When* an IT Staff user updates the IT Priority to `URGENT`,
  - *Then* `itPriority` is updated in the database while `requestedPriority` remains `MEDIUM`.

- **AC-13 (Permitted Ticket Status Transition Enforcement):**
  - *Given* a ticket in the IT Staff queue,
  - *When* an IT Staff user transitions status following permitted paths (`NEW` → `IN_PROGRESS`, `RESOLVED` → `CLOSED`, or `CLOSED` → `REOPENED`),
  - *Then* the transition succeeds with appropriate confirmation; but attempting a direct transition from `NEW` to `CLOSED` is rejected with HTTP 422 Unprocessable Entity. Transitioning to `RESOLVED` requires a non-empty `resolutionSummary`, which is preserved upon subsequent transition to `CLOSED`. Reopening a closed ticket requires IT Staff or Administrator authorization and a confirmation dialog.

- **AC-14 (Public Comments Collaboration):**
  - *Given* an open ticket,
  - *When* a Requester or IT Staff posts a valid Public Comment,
  - *Then* the comment is persisted with `authorId` bound to the authenticated user, and renders chronologically for all permitted roles.

- **AC-15 (Internal Notes Operational Recording):**
  - *Given* an IT Staff user viewing a ticket,
  - *When* the staff user submits an Internal Note,
  - *Then* the note is persisted and displayed with distinct internal warning styling, visible only to IT Staff and Administrators.

- **AC-16 (Requester Resolution Indication):**
  - *Given* an in-progress ticket owned by the active Requester,
  - *When* the Requester clicks "Problem Appears Resolved",
  - *Then* `isRequesterResolved` is set to `true`, a banner notifies IT Staff that the requester considers the issue solved, while the formal `currentStatus` remains unchanged until staff acts.

- **AC-17 (Administrator User Creation & Initial Password):**
  - *Given* an authenticated Administrator,
  - *When* the Administrator creates a user with email, name, role `IT_STAFF`, and initial password,
  - *Then* the user is saved with `mustChangePassword = true` and can authenticate using the initial credentials.

- **AC-18 (Duplicate Email Rejection):**
  - *Given* an existing user with email `david.lee@toktickit.com`,
  - *When* an Administrator attempts to create another user with that same email,
  - *Then* the operation is rejected with HTTP 409 Conflict and an inline validation error is shown.

- **AC-19 (Administrator Self-Deactivation Guard):**
  - *Given* an authenticated Administrator editing user accounts,
  - *When* the Administrator attempts to deactivate their own account,
  - *Then* the UI disables the action and the backend rejects the request with HTTP 422 Unprocessable Entity.

- **AC-20 (Last Active Administrator Guard):**
  - *Given* exactly one active Administrator in the system,
  - *When* an update attempts to deactivate that Administrator or change their role,
  - *Then* the backend rejects the request with HTTP 422 Unprocessable Entity with a clear explanatory error message.

- **AC-21 (Role-Based Endpoint Protection):**
  - *Given* an authenticated Requester or IT Staff member,
  - *When* the user attempts to access an endpoint outside their permitted role (e.g., Requester accessing `/api/admin/users` or `/api/staff/tickets`; IT Staff accessing `/api/admin/users`),
  - *Then* the backend returns HTTP 403 Forbidden.

- **AC-22 (Administrator User Account Editing):**
  - *Given* an authenticated Administrator,
  - *When* updating an existing user’s name, email, role, or active status via `PATCH /api/admin/users/:id`,
  - *Then* changes are persisted and immediately reflected in user queries.

- **AC-23 (Administrator Initial Password Reset):**
  - *Given* an authenticated Administrator,
  - *When* resetting a user's initial password via `POST /api/admin/users/:id/reset-password`,
  - *Then* the password hash updates, `mustChangePassword` is set to `true`, and the user is forced to change their password upon their next login.

- **AC-24 (IT Staff Single Ticket Detail Retrieval):**
  - *Given* an authenticated IT Staff or Administrator user,
  - *When* accessing `GET /api/staff/tickets/:id`,
  - *Then* the backend returns the full ticket record including requester profile, owner, category, system, active attachments, public comments, and internal notes.

- **AC-25 (Requester Attachment Continuation & Isolation):**
  - *Given* an authenticated Requester,
  - *When* uploading an attachment (`POST /api/tickets/:id/attachments`), downloading (`GET /api/attachments/:id/download`), or soft-removing (`PATCH /api/attachments/:id/soft-remove`),
  - *Then* operations succeed on owned tickets, and cross-requester access attempts return HTTP 404 Not Found without leaking attachment metadata.

---

## 10. Definition of Done (DoD)

### 10.1. Product Completion DoD
1. **Scope Integrity:** All functional capabilities in Section 3.1 are implemented adhering to this specification and the Zen Green theme without invoking out-of-scope items.
2. **Acceptance Verification:** All 25 Acceptance Criteria (AC-01 through AC-25) pass with demonstrable automated test proof.
3. **Automated Test Quality:**
   - Vitest backend integration tests pass with 100% success rate across all test suites (`auth.api.test.ts`, `authorization.api.test.ts`, `staff-queue.api.test.ts`, `staff-ticket-detail.api.test.ts`, `comments-notes.api.test.ts`, `users-admin.api.test.ts`).
   - Vitest frontend component tests pass with 100% success rate across all client suites (`Login.test.tsx`, `ChangePassword.test.tsx`, `StaffTicketQueue.test.tsx`, `StaffTicketDetail.test.tsx`, `UserManagement.test.tsx`).
   - Playwright E2E suites pass across desktop, tablet, and mobile viewports (`authentication.spec.ts`, `first-login.spec.ts`, `staff-ticket-flow.spec.ts`, `user-administration.spec.ts`).
   - Zero skipped or artificially mocked tests.
4. **Data Model Integrity:** Database migrations execute cleanly via Prisma, preserving existing Lab 2 ticket and attachment data, column renames execute cleanly, and the idempotent seed script (`npm run prisma:seed`) runs reliably.
5. **Code Quality:** Zero TypeScript compiler errors (`npx tsc --noEmit` on both server and client), clean ESLint logs, and no exposed credentials in repository code.
6. **Error & State Resilience:** Form inputs remain preserved upon any network or validation failure; direct API access is strictly validated server-side.

### 10.2. Course Delivery DoD
1. Git engineering workflow followed with feature branches merged into `lab3-staging` and integrated into `main`.
2. GitHub Project Kanban board maintained with all Lab 3 user stories and tasks moved to `Done`.
3. Rendered documentation artifacts (`specification.md`, `ui-spec.md`, `api-spec.md`, `tests.md`) maintained in `docs/lab-03/`.
4. High-resolution screenshots captured across desktop, tablet, and mobile breakpoints for all required screens in `artifacts/lab-03/screenshots/`.
5. Concise submission PDF compiled adhering to the mandatory "Answer Part 1" through "Answer Part 9" format.

---

## 11. Assumptions and Decisions

1. **Authentication Token & CSRF Strategy:** JWTs (JSON Web Tokens) with an 8-hour expiry are issued upon authentication. The token contains `{ id, email, role, mustChangePassword }` and is signed with `JWT_SECRET`. The client stores the token in memory/session and transmits it exclusively via the `Authorization: Bearer <token>` HTTP header. This header-based strategy naturally eliminates ambient cookie-based CSRF vulnerabilities.
2. **Password Hashing Standard:** bcrypt with 10 salt rounds is selected for password hashing, balancing security against login response times.
3. **Status Progression Decoupling:** Requesters are restricted to setting `isRequesterResolved = true` as an advisory flag; formal ticket resolution requires an IT Staff member to confirm and supply a `resolutionSummary`.
4. **Append-Only Communication:** Comments and notes cannot be updated or deleted to maintain strict audit integrity.
5. **Administrator UI Scope vs. API Authority:** Per Section 4.3 of the handout, Administrator and IT Staff responsibilities remain conceptually separate in the UI shell (Admins manage user accounts; IT Staff manage tickets). Administrators possess backend API authorization for ticket queue endpoints (and can be assigned as ticket owners per Section 4.5), but the Admin UI application shell intentionally provides only the User Management interface to maintain clean role boundaries.
6. **Initial Password UI Decision:** While the handout wireframe mockup displays a "Send password reset email" checkbox, Section 4.2 of the handout explicitly excludes email delivery and password reset services. Therefore, the application implements a direct input for the Administrator to set an Initial Password with `mustChangePassword = true` enforced upon first login.
7. **IT Staff & Administrator Attachment Upload Capability (Option B):** While the minimum PDF requirements in Section 4.3 emphasize Requester attachment submission and Section 8.4 specifies viewing "existing Attachments", the specification intentionally extends `POST /api/tickets/:id/attachments` to IT Staff and Administrators. This enables support personnel to attach diagnostic logs, screenshots of fixes, or vendor guides directly to tickets they are troubleshooting in the queue, ensuring operational flexibility.
8. **Ticket Reopening Lifecycle (`CLOSED -> REOPENED`):** Per Section 4.5 of the handout, students are tasked with defining the transition matrix. To provide operational realism for cases where a resolved and closed problem resurfaces, `CLOSED -> REOPENED` is supported exclusively for IT Staff and Administrators with a mandatory confirmation dialog and reason, avoiding the need for users to submit redundant duplicate tickets.
9. **Dual-Domain Seed Strategy for Zero Test Regression:** To guarantee that all 43 automated regression tests from Lab 2 (`server/tests/lab-02/`) pass without modification, the 5 original Lab 2 users retain their `@kmutt.ac.th` emails and `REQUESTER` role. New operational staff and administrator accounts are seeded under `@toktickit.com`, perfectly satisfying both the Lab 2 regression test requirements and the Lab 3 UI mockup conventions.
