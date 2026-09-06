# Lab 2 Sprint Engineering Specification

## 1. Sprint Goal
Deliver a robust, responsive, and professional Requester-facing IT Ticketing MVP using the Zen Green design system. This increment enables employees to select a simulated Development Requester identity, submit IT support tickets with categories, related systems, priorities, descriptions, and attachments, track their submitted tickets in a paginated and filterable "My Tickets" list, inspect ticket details, and manage attachments with soft-removal rules and strict ownership isolation.

---

## 2. Stakeholder Request Interpretation
The IT department requires a self-service ticketing portal for university and corporate users (Requesters) to report IT incidents and service requests (such as hardware malfunctions, network outages, LEB2 app issues, or account access problems). The solution must provide an intuitive, responsive interface adhering to the Zen Green visual language.

Key expectations:
- **Requester Identity Context:** Prior to the introduction of full authentication in Lab 3, provide a Development Requester selector to switch between active seeded users and verify multi-tenant data isolation.
- **Ticket Submission:** Requesters must be able to categorize issues, link them to specific affected systems (e.g., Campus Wi-Fi, VPN, LEB2 App), set requested priority, describe the issue, and attach supporting documentation or screenshots (up to 5 MB per file, max 5 active attachments).
- **Ticket Tracking & Discovery:** Requesters must be able to view their own tickets in a dedicated list, search by ticket number or keyword, filter by category/priority/status, sort by various fields, and paginate through results.
- **Detail Inspection & Attachment Management:** Requesters must be able to inspect their ticket details in read-only mode, download active attachments, add new attachments, and soft-remove existing attachments with a mandatory removal reason.
- **Data Integrity & Security:** Prevent any Requester from viewing, listing, or modifying tickets and attachments owned by other Requesters.

---

## 3. Scope

### 3.1. Included Scope
1. **Development Requester Context:**
   - Database model and seed data for active and inactive Development Requesters.
   - Development Requester selection screen and persistent session switching.
   - Header identity display with quick "Change Requester" action.
2. **Ticket Creation Flow:**
   - Dynamic loading of active Categories and Related Systems from PostgreSQL.
   - Complete input validation (lengths, required fields, allowed values, whitespace trimming).
   - Multi-file attachment upload (JPG, PNG, WEBP, PDF up to 5 MB per file, max 5 active files).
   - System generation of unique Ticket Numbers (`TKT-YYYY-NNNNNN`), initial status `New`, and creation timestamps.
   - Resilient submission handling (busy button states, preserved form data on failure).
3. **My Tickets List & Management:**
   - Strict ownership-scoped ticket retrieval.
   - Server-side search across ticket number and summary.
   - Multi-field filtering (Category, Requested Priority, IT Priority, Current Status).
   - Dynamic sorting (Ticket Number, Created Date, Last Updated, Priority) and pagination.
   - Responsive representation (Desktop multi-column table, Mobile responsive cards).
   - Loading skeletons, empty states, and no-results feedback with filter reset.
4. **Requester Ticket Detail & Attachment Lifecycle:**
   - Read-only inspection of ticket header, metadata, summary, and description.
   - Attachment list displaying active attachments with metadata (name, size, type, upload date).
   - Attachment download and preview for active files.
   - Attachment addition to existing tickets (respecting the 5 active attachments cap).
   - Attachment soft removal requiring confirmation and mandatory reason text.
   - Display of soft-removed attachment metadata while strictly blocking download/preview.
5. **Zen Green UI System & Responsive Design:**
   - Consistent typography, spacing, color tokens, and badge hierarchy.
   - Full responsiveness across Desktop (≥ 992px), Tablet (768–991px), and Mobile (< 768px).

### 3.2. Excluded Scope (Deferred to Future Labs)
1. **Authentication & Security:** Real user login/logout, password hashing, JWT/session management, registration, and RBAC authorization (Deferred to Lab 3).
2. **IT Staff Workflow:** IT Staff dashboard, queue management, ticket assignment/claiming, changing IT Priority, and status transitions (In Progress, Resolved, Closed) (Deferred to Lab 3+).
3. **Collaboration & Work Tracking:** Public comments, internal staff notes, and actions taken (Deferred to Lab 4).
4. **Ticket Lifecycle Post-Creation:** Resolution confirmation by Requester, ticket reopening, closing, or cancellation (Deferred to Lab 4).
5. **Administration:** Admin management of users, departments, categories, and system catalogs.

---

## 4. Functional Requirements

- **FR-01 (Requester Selection):** The system must allow users to select an active Development Requester from a dropdown loaded dynamically from the database. Inactive requesters must not be selectable.
- **FR-02 (Requester Context Persistence):** The application must persist the active requester selection in client state/storage and pass it with every API request via the `X-Requester-Id` header.
- **FR-03 (Requester Switching):** The user can change the active Requester at any time from the app header. Changing the Requester must immediately reset and reload all ticket queries and views.
- **FR-04 (Reference Data Retrieval):** The system must fetch active Categories and Related Systems from the backend for ticket creation and filtering.
- **FR-05 (Ticket Creation):** A Requester can submit a ticket by providing Category, Related System, Requested Priority, Summary, Description, and optional initial attachments.
- **FR-06 (System Ticket Generation):** Upon ticket creation, the backend must assign a globally unique Ticket Number (format: `TKT-YYYY-NNNNNN`), set `currentStatus = "NEW"`, set `createdAt` timestamp, and link the ticket to the current `requesterId`.
- **FR-07 (Input Validation & Trimming):** The frontend and backend must validate all fields. Summary (5–150 chars) and Description (10–2000 chars) must be trimmed before validation and storage.
- **FR-08 (Submission Failure Resilience):** If ticket submission fails (validation or network error), the form must remain populated with entered values, display descriptive error messages, and allow immediate retry.
- **FR-09 (My Tickets Retrieval):** The system must list only tickets owned by the currently selected Requester.
- **FR-10 (Ticket Search):** The ticket list must support keyword search matching ticket numbers (case-insensitive substring) or summary text.
- **FR-11 (Ticket Filtering):** The ticket list must support filtering by Category, Requested Priority, IT Priority, and Current Status, with a single-click "Clear Filters" action.
- **FR-12 (Ticket Sorting & Pagination):** The ticket list must support sorting by `createdAt`, `ticketNumber`, or `updatedAt` (ascending/descending) with configurable pagination (default 10 items per page).
- **FR-13 (Ticket Detail Inspection):** A Requester can view all fields of an owned ticket in read-only mode.
- **FR-14 (Ownership Enforcement):** Direct access (via API or URL) to a ticket or attachment owned by another Requester must be rejected with HTTP 403 Forbidden (or 404 Not Found) with no sensitive data leaked.
- **FR-15 (Attachment Upload):** A Requester can upload files of permitted MIME types (JPEG, PNG, WEBP, PDF) up to 5 MB per file, provided the active attachment count does not exceed 5 per ticket.
- **FR-16 (Attachment Download):** A Requester can download any active attachment associated with their owned ticket.
- **FR-17 (Attachment Soft Removal):** A Requester can soft-remove an attachment from their owned ticket. The system must prompt for confirmation and require a removal reason (3–255 characters).
- **FR-18 (Soft-Removed Display & Access Control):** Soft-removed attachments must display metadata and removal reason with a "Removed" tag in the UI, but file download/preview requests must be blocked with HTTP 403/410.

---

## 5. Business Rules

| Rule ID | Rule Title | Detailed Business Rule Statement |
|---|---|---|
| **BR-01** | **Unique Ticket Number** | The official Ticket Number is generated exclusively by the backend and must be globally unique across all tickets. Format: `TKT-YYYY-NNNNNN` (e.g., `TKT-2026-000101`), where `YYYY` is the current year and `NNNNNN` is a sequential zero-padded integer or cryptographically unique sequence. |
| **BR-02** | **Initial Ticket Status** | Every new Ticket must be initialized with `currentStatus = "NEW"`. Requesters have no ability to select or modify ticket status during or after creation. |
| **BR-03** | **Development Requester Testing Context** | Lab 2 uses a Development Requester selector instead of login. The selected identity is for testing and simulation only and must not be treated as secure authentication. |
| **BR-04** | **Strict Requester Data Isolation** | A Requester can only list, view, search, filter, and modify tickets and attachments that they own (`requesterId == currentRequesterId`). Any cross-requester access attempt must return `403 Forbidden` (or `404 Not Found`) and disclose zero ticket data. |
| **BR-05** | **Inactive Requester Exclusion** | Inactive Development Requesters (`isActive = false`) must not appear in the Development Requester selection dropdown and cannot initiate ticket creation. |
| **BR-06** | **Required Fields & Constraints** | All ticket creation fields are mandatory except attachments: <br>• **Category:** Must exist in DB and be active.<br>• **Related System:** Must exist in DB and be active.<br>• **Requested Priority:** Enum (`LOW`, `MEDIUM`, `HIGH`, `URGENT`). Default: `MEDIUM`.<br>• **Summary:** String, 5–150 characters after trimming whitespace.<br>• **Description:** String, 10–2000 characters after trimming whitespace. |
| **BR-07** | **Duplicate Submission Prevention** | The UI must disable the submission button and display a loading/busy indicator immediately upon form submit. The backend must enforce request deduplication where applicable. |
| **BR-08** | **Form Data Retention on Failure** | When a ticket or attachment submission fails due to client or server errors, the entered form fields (Category, System, Priority, Summary, Description) must remain preserved in the UI to avoid data loss. |
| **BR-09** | **Permitted Attachment Types** | Only files with MIME types `image/jpeg`, `image/png`, `image/webp`, and `application/pdf` (extensions: `.jpg`, `.jpeg`, `.png`, `.webp`, `.pdf`) are permitted. All other file types must be rejected with HTTP 415 Unsupported Media Type. |
| **BR-10** | **Attachment File Size Limit** | The maximum allowable size for an individual attachment file is 5 MB (5,242,880 bytes). Files exceeding this limit must be rejected with HTTP 413 Payload Too Large. |
| **BR-11** | **Active Attachment Count Limit** | A ticket may have at most 5 active (`isRemoved = false`) attachments at any given time. Upload attempts that would exceed 5 active attachments must be rejected with HTTP 400/422. |
| **BR-12** | **Soft Removal with Audit Reason** | Attachments are never physically deleted from the database. Soft removal updates `isRemoved = true`, records `removedAt = now()`, and requires a non-empty `removalReason` (3–255 characters). |
| **BR-13** | **Blocked Access to Removed Files** | Files marked as soft-removed cannot be downloaded or previewed via the API or UI. Attempting to download a removed file returns HTTP 403 Forbidden or HTTP 410 Gone. |
| **BR-14** | **Safe Attachment Storage & Naming** | Uploaded files must be stored on disk using a safe generated storage key (e.g. `UUID-timestamp.ext`) to prevent path traversal, filename collisions, and malicious code execution, while preserving the user's `originalFileName` in database metadata. |
| **BR-15** | **Read-Only IT Priority & Assignment** | IT Priority (default: `MEDIUM`) and Ticket Owner (default: `Unassigned` / `null`) are IT staff fields and are strictly read-only for Requesters. |
| **BR-16** | **Session Switching Immediate Invalidation** | Switching the Development Requester in the UI immediately invalidates cached ticket lists, resets search/filter states, and re-executes all data queries under the new requester context. |
| **BR-17** | **Evolution to Lab 3 Authentication** | The `requesterId` foreign key on tickets and attachments directly maps to the user identity model so that replacing the mock selector with JWT/session authentication in Lab 3 requires zero schema modifications to the `Ticket` or `Attachment` tables. |

---

## 6. UI Specification Summary
The UI strictly implements the **Zen Green Theme** and responsive guidelines defined in `docs/lab-02/ui-spec.md`.

### 6.1. Primary Color Tokens
- **Primary Green (`#006B3C`):** Header bar, primary action buttons (`Create Ticket`, `Submit Ticket`), strong emphasis.
- **Secondary Green (`#0B7A46`):** Active navigation tabs, focus accents, interactive links, button hover states.
- **Pale Green (`#EAF6EF`):** Selected table rows, success alert backgrounds, subtle card headers.
- **Page Background (`#F5F7F6`):** Clean, near-white neutral background.
- **Card / Surface (`#FFFFFF`):** White cards with subtle border (`#E2E8F0`) and soft elevation shadow.
- **Typography:** Dark charcoal-green text (`#1C2D27`) with high contrast ratios exceeding WCAG AA.
- **Alert Colors:** Dark Red (`#991B1B`, bg `#FEE2E2`) for errors; Amber (`#B45309`, bg `#FEF3C7`) for warnings; Forest Green (`#065F46`, bg `#D1FAE5`) for success.

### 6.2. Key Screens & Responsive Layouts
1. **Development Requester Selection:**
   - Dedicated modal or top-level selector card with banner: *"Select a Development Requester to test requester-specific ticket behavior. This is not a login screen. Authentication and role-based access will be introduced in Lab 3."*
   - Dynamic select dropdown with active users; "Continue" button.
2. **Create Ticket Screen (`/tickets/new`):**
   - 2-column desktop grid / 1-column mobile stack.
   - Header block: Requester Name (read-only), Ticket Date (auto-populated).
   - Form fields: Category select, Related System select, Requested Priority pill selector, Summary input, Description textarea.
   - Attachment dropzone with file preview, size badge, and remove file button before submission.
   - Clear validation feedback immediately below each invalid control.
   - Action bar: Primary "Submit Ticket" button (with spinner when busy), Secondary "Cancel" button.
3. **My Tickets Screen (`/tickets`):**
   - Top action bar: Page Title, "Clear Filters", and "+ Create Ticket" primary button.
   - Filter bar: Search input (by ticket number or summary), Category select, Priority select, Status select.
   - Desktop view: Responsive data table with sortable columns and status/priority badges.
   - Mobile view: Card list showing Ticket No, Summary, Badges, Date, and arrow action.
   - Pagination bar: "Showing X to Y of Z tickets", Page numbers, Prev/Next buttons.
   - Meaningful Empty State ("No tickets yet") and No-Results State ("No tickets match your filters").
4. **Requester Ticket Detail Screen (`/tickets/:id`):**
   - Breadcrumb navigation: `My Tickets > Ticket Details` and `← Back to My Tickets` button.
   - Read-only details card with grid layout for metadata and clean typography for summary/description.
   - Attachments section with active files table/list (download button, soft remove button with modal).
   - Soft-removed attachments audit list with reason displayed and download disabled.
   - Quick "Add Attachment" dropzone for existing tickets.

---

## 7. Data Changes (Database Increment)

### 7.1. Database Schema (PostgreSQL + Prisma)
The schema expands from Lab 1 to introduce `DevelopmentRequester`, `RelatedSystem`, `Ticket`, and `Attachment` while preserving `Category`.

```prisma
// server/prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
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
  PENDING
  RESOLVED
  CLOSED
}

model DevelopmentRequester {
  id         Int          @id @default(autoincrement())
  name       String
  email      String       @unique
  department String
  isActive   Boolean      @default(true)
  createdAt  DateTime     @default(now())
  updatedAt  DateTime     @updatedAt
  tickets    Ticket[]
  attachments Attachment[]

  @@map("development_requesters")
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
  id                Int                  @id @default(autoincrement())
  ticketNumber      String               @unique // e.g. TKT-2026-000101
  summary           String
  description       String
  requestedPriority Priority             @default(MEDIUM)
  itPriority        Priority             @default(MEDIUM)
  currentStatus     TicketStatus         @default(NEW)
  ticketOwner       String?              // IT staff assignee name (read-only for requesters)
  resolutionSummary String?              // Read-only for requesters
  
  requesterId       Int
  requester         DevelopmentRequester @relation(fields: [requesterId], references: [id], onDelete: Restrict)
  
  categoryId        Int
  category          Category             @relation(fields: [categoryId], references: [id], onDelete: Restrict)
  
  relatedSystemId   Int
  relatedSystem     RelatedSystem        @relation(fields: [relatedSystemId], references: [id], onDelete: Restrict)
  
  attachments       Attachment[]
  
  createdAt         DateTime             @default(now())
  updatedAt         DateTime             @updatedAt

  @@index([requesterId, createdAt])
  @@index([currentStatus])
  @@index([categoryId])
  @@map("tickets")
}

model Attachment {
  id                     Int                  @id @default(autoincrement())
  ticketId               Int
  ticket                 Ticket               @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  
  originalFileName       String
  storageKey             String               @unique // Safe filename on disk
  fileSize               Int                  // In bytes
  mimeType               String               // e.g. application/pdf, image/png
  
  uploadedByRequesterId  Int
  uploadedBy             DevelopmentRequester @relation(fields: [uploadedByRequesterId], references: [id], onDelete: Restrict)
  
  isRemoved              Boolean              @default(false)
  removedAt              DateTime?
  removalReason          String?
  
  createdAt              DateTime             @default(now())

  @@index([ticketId, isRemoved])
  @@map("attachments")
}
```

### 7.2. Database Design Justifications
1. **Composite Index `@@index([requesterId, createdAt])`:** In "My Tickets", every query is filtered by `requesterId` and sorted by `createdAt DESC`. This compound index avoids full table scans and ensures fast response times.
2. **Soft Removal Fields (`isRemoved`, `removedAt`, `removalReason`):** Instead of deleting records, soft removal retains audit history for compliance and troubleshooting while `@@index([ticketId, isRemoved])` optimizes fetching active files.
3. **Foreign Key Integrity with `onDelete: Restrict`:** Prevents accidental deletion of users or categories that are referenced by existing historical tickets.
4. **Seamless Lab 3 Transition:** `DevelopmentRequester` uses the exact field contract needed for `User` in Lab 3, allowing easy migration or model aliasing without breaking relations.

### 7.3. Required Seed Data (Idempotent)
- **4 Categories:** `Account and Access`, `Hardware`, `Software`, `Network`.
- **7 Related Systems:** `Email`, `Campus Wi-Fi`, `VPN`, `LEB2 App`, `Grade Submission App`, `Printer`, `Corporate Laptop`.
- **4 Active Development Requesters:**
  1. `Jennifer Anderson` (`jennifer.anderson@kmutt.ac.th`, Dept: Computer Engineering)
  2. `David Lee` (`david.lee@kmutt.ac.th`, Dept: Information Technology)
  3. `Sarah Johnson` (`sarah.johnson@kmutt.ac.th`, Dept: Digital Media)
  4. `Michael Brown` (`michael.brown@kmutt.ac.th`, Dept: Electrical Engineering)
- **1 Inactive Development Requester:**
  1. `Alex Inactive` (`alex.inactive@kmutt.ac.th`, Dept: Alumni Relations, `isActive: false`)
- **Seeded Historical Tickets:** Multiple tickets distributed between Jennifer Anderson and David Lee to verify multi-user isolation, pagination, and filtering out of the box.

---

## 8. API Contract Summary
Detailed endpoints are specified in `docs/lab-02/api-spec.md`.

| Method | Endpoint | Description | Auth / Context |
|---|---|---|---|
| `GET` | `/api/requesters/active` | Retrieve all active Development Requesters | Public |
| `GET` | `/api/categories` | Retrieve active Ticket Categories | Public |
| `GET` | `/api/related-systems` | Retrieve active Related Systems | Public |
| `POST` | `/api/tickets` | Create a new Ticket for the active Requester | `X-Requester-Id` header |
| `GET` | `/api/tickets` | Retrieve paginated, filtered, searched tickets owned by Requester | `X-Requester-Id` header |
| `GET` | `/api/tickets/:id` | Retrieve single owned Ticket details with attachments | `X-Requester-Id` header |
| `POST` | `/api/tickets/:id/attachments` | Upload attachment file to owned ticket | `X-Requester-Id` header |
| `GET` | `/api/attachments/:id/download` | Download active attachment file | `X-Requester-Id` header |
| `PATCH` | `/api/attachments/:id/soft-remove` | Soft-remove attachment with mandatory reason | `X-Requester-Id` header |

---

## 9. Acceptance Criteria

- **AC-01 (Valid Ticket Creation):**
  - *Given* a selected active Development Requester and valid form inputs (Category, Related System, Priority, Summary, Description),
  - *When* the Requester submits the Create Ticket form,
  - *Then* a new Ticket is persisted in the database with status `NEW`, a unique `TKT-YYYY-NNNNNN` Ticket Number is generated, and the user is navigated to the success view / ticket details showing the generated number.

- **AC-02 (Requester Context Guard):**
  - *Given* no Development Requester has been selected in the session,
  - *When* the user attempts to navigate to Create Ticket or My Tickets,
  - *Then* the application redirects to / displays the Development Requester Selection screen.

- **AC-03 (Cross-Requester Ticket Isolation):**
  - *Given* Requester B is currently selected,
  - *When* Requester B requests a Ticket Detail or list belonging to Requester A via URL or API,
  - *Then* the backend responds with HTTP 403 Forbidden (or 404) and no ticket information belonging to Requester A is revealed.

- **AC-04 (My Tickets Ownership Filtering):**
  - *Given* Requester A has 5 tickets and Requester B has 3 tickets in the database,
  - *When* Requester A views the My Tickets screen,
  - *Then* exactly Requester A's 5 tickets are displayed, and switching the active Requester to Requester B immediately refreshes the list to show only Requester B's 3 tickets.

- **AC-05 (Inactive Requester Filtering):**
  - *Given* active and inactive requesters exist in the database,
  - *When* the user views the Development Requester selector dropdown,
  - *Then* only active requesters are shown, and the inactive requester (`Alex Inactive`) is excluded.

- **AC-06 (Form Validation & Field Trimming):**
  - *Given* a ticket submission with a summary shorter than 5 characters or containing only whitespace,
  - *When* the form is submitted,
  - *Then* submission is blocked, field-level error messages appear immediately below the invalid fields, and no backend record is created.

- **AC-07 (Duplicate Submission Prevention):**
  - *Given* a valid ticket form,
  - *When* the user clicks the "Submit Ticket" button,
  - *Then* the button immediately enters a disabled busy state with a spinner until the API responds.

- **AC-08 (Submission Failure Resilience):**
  - *Given* form values entered on the Create Ticket screen,
  - *When* the backend returns a 500 error or network disconnect occurs,
  - *Then* a friendly error alert is displayed, and all entered field values remain preserved in the form controls.

- **AC-09 (Search & Filtering):**
  - *Given* a list of tickets for the active Requester,
  - *When* the user enters a search term or selects Category/Priority/Status filters,
  - *Then* the list updates to display only matching tickets, and clicking "Clear Filters" restores the complete list.

- **AC-10 (Attachment Upload Restrictions):**
  - *Given* a file with an unsupported format (e.g., `.exe` or `.zip`) or exceeding 5 MB,
  - *When* the user attempts to upload it,
  - *Then* the upload is rejected with a clear error message and not saved to disk or DB.

- **AC-11 (Attachment Count Limit):**
  - *Given* a ticket that already has 5 active attachments,
  - *When* the user attempts to upload a 6th attachment,
  - *Then* the upload is rejected with an error stating the maximum active attachment limit (5) has been reached.

- **AC-12 (Attachment Download):**
  - *Given* an active attachment on an owned ticket,
  - *When* the Requester clicks Download,
  - *Then* the file is downloaded with its original filename and correct MIME type.

- **AC-13 (Attachment Soft Removal & Blocked Download):**
  - *Given* an active attachment on an owned ticket,
  - *When* the Requester confirms soft removal with a valid reason (e.g., "Uploaded wrong screenshot"),
  - *Then* the attachment is marked as removed, the removal reason is displayed, and direct download links for that attachment are disabled and return HTTP 403/410.

- **AC-14 (Responsive Layouts):**
  - *Given* the application viewed across desktop (1280px), tablet (768px), and mobile (375px) viewports,
  - *Then* all components adapt smoothly without horizontal page scrolling, text clipping, or broken controls.

---

## 10. Definition of Done (DoD)

### 10.1. Product Completion DoD
1. **Scope Delivery:** All features in Section 3.1 are implemented according to this specification and the Zen Green theme.
2. **Acceptance Criteria Verification:** All acceptance criteria (AC-01 through AC-14) pass with demonstrable evidence.
3. **Automated Test Coverage:**
   - All planned Unit, API, and UI component tests pass with 100% success rate.
   - All tests pass via `npm test` in both `server/` and `client/` directories.
   - Playwright E2E tests pass for the end-to-end requester workflow.
   - No tests are skipped, commented out, or mocked inappropriately.
4. **Data Integrity:** Database migrations execute cleanly, and the seed script is fully idempotent (`npm run prisma:seed`).
5. **Code Quality & Linter:** Zero TypeScript compiler errors (`tsc --noEmit`), zero ESLint errors, and clean console logs.
6. **Documentation:** `specification.md`, `ui-spec.md`, `api-spec.md`, and `tests.md` are completely filled and aligned with actual implementation.

### 10.2. Course Delivery DoD
1. Git feature branch workflow followed with staging branch integration (`lab2-staging` merged into `main`).
2. GitHub Project Kanban board updated with all sprint issues moved to `Done`.
3. Rendered markdown artifacts and required visual screenshots captured at desktop, tablet, and mobile breakpoints.
4. Single PDF report compiled adhering to the required "Answer Part 1" through "Answer Part 9" format.

---

## 11. Assumptions and Decisions

1. **Ticket Number Format:** The format `TKT-YYYY-NNNNNN` is chosen to provide a clean, standardized, and easily searchable ticket reference. The sequential part is derived from an atomic sequence or database autoincrement ID padded to 6 digits.
2. **Attachment Storage Strategy in Development:** For Lab 2 development, uploaded files are stored locally in `server/uploads/` with UUID-based storage filenames. In production, this can be swapped with S3/cloud storage without altering database models.
3. **Temporary Auth Mechanism:** The `X-Requester-Id` request header is chosen as the mechanism to transmit the simulated session context from frontend to backend. It provides a clean boundary that will be seamlessly swapped with `Authorization: Bearer <token>` in Lab 3.
4. **Error Masking:** Database error details and internal stack traces are logged on the server but masked from API responses, returning user-friendly messages and standard HTTP status codes.
