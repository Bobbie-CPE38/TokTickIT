# Lab 4 Sprint Engineering Specification

## 1. Sprint Goal
Complete the core TokTickIT service-desk operational workflow by implementing parent-child Actions Taken tracking for IT Staff, enforcing strict Ticket lifecycle status transitions and resolution gate rules, providing role-appropriate operational dashboards for Requesters, IT Staff, and Administrators under the Zen Green design system, and hardening the entire application across security, concurrency, accessibility, and 100% regression compatibility with Labs 1 through 3.

---

## 2. Stakeholder Request Interpretation
The organization has established secure user authentication, role-based access, and direct Requester/IT Staff communication. However, the service desk still lacks a structured mechanism to plan, execute, and audit concrete technical interventions under each Ticket. Furthermore, users lack a high-level operational starting point summarizing open work, attention-required items, and recent activity.

Key stakeholder expectations for Sprint 4:
- **Parent-Child Work Tracking (Actions Taken):** IT Staff require an appendable, auditable record of actual technical actions performed under each Ticket. Each action record must capture Action Date/Time, Action Description, Result, Performed by (auto-bound to authenticated user), Follow-Up Required toggle, Follow-up Note (conditionally mandatory when follow-up is flagged), and Attachment Notes (identifying relevant diagnostic files or screenshots).
- **Separation of Ticket Ownership and Action Execution:** A Ticket retains one primary Ticket Owner responsible for overall coordination, but multiple different IT Staff members and Administrators may take actions and record them in Actions Taken.
- **Enforced Ticket Status Progression & Resolution Gate:** Tickets must progress through an authorized 8-status lifecycle (`NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CLOSED`, `REOPENED`, `CANCELLED`). Resolving a Ticket requires formal IT Staff review, a valid resolution summary, and verified completion of at least one Action Taken. The Requester's "Problem Appears Resolved" indication remains purely advisory.
- **Role-Appropriate Operational Dashboards:** 
  - *Requesters* require a personal dashboard summarizing their active tickets, items waiting for their response, recently resolved requests, and quick links to submit or view tickets.
  - *IT Staff* require an operational dashboard summarizing unassigned tickets, personal assignments, status/priority distributions, day-over-day operational trends, recently updated tickets, and quick-action queue links.
  - *Administrators* require a comprehensive dashboard combining IT queue operational metrics with concise user-account governance metrics.
- **Concurrency & Safe Failure Hardening:** The system must detect and safely handle concurrent or stale updates (optimistic concurrency checking), preserve user form data on recoverable failures, prevent duplicate submissions from rapid clicks, and maintain 100% regression compatibility with all Lab 1–3 endpoints and automated test suites.
- **Zen Green Aesthetic & Accessibility Polish:** Maintain complete visual consistency with the Zen Green design tokens, provide responsive layouts across desktop, tablet, and mobile, ensure touch targets measure $\ge 44\text{ px}$, and eliminate horizontal overflow.

---

## 3. Scope

### 3.1. Included Scope
1. **Actions Taken Data Model & Workflow:**
   - Database model `ActionTaken` related to `Ticket` (one-to-many) and `User` (performer).
   - Creation of Actions Taken with Action Date/Time, Description, Result, auto-bound Performed By, Follow-Up Required flag, conditional Follow-up Note, and optional Attachment Notes.
   - Updating/editing existing Actions Taken by permitted IT Staff and Administrators.
   - Transparent read-only display of Actions Taken to authenticated Requesters on their owned tickets.
   - Support for multiple Actions Taken performed by different IT Staff members on a single ticket, independent of the Ticket Owner.
   - Validation rejecting inactive staff assignees or performers.
2. **Ticket Status Lifecycle & Resolution Gate Enforcement:**
   - Formal enforcement of the complete 8-status state machine: `NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CLOSED`, `REOPENED`, and `CANCELLED`.
   - Backend-enforced Resolution Gate: A Ticket can only be transitioned to `RESOLVED` if it has at least one recorded `ActionTaken` and a non-empty `resolutionSummary` ($\ge 5$ characters).
   - Advisory Requester resolution flag (`isRequesterResolved = true`) preserved as an operational signal without directly altering `currentStatus`.
   - IT Staff and Administrator confirmation dialogs for `RESOLVED`, `CLOSED`, `REOPENED`, and `CANCELLED` transitions.
   - Terminal state enforcement for `CANCELLED`. Reopening of `CLOSED` tickets restricted to IT Staff and Administrators with mandatory rationale.
3. **Optimistic Concurrency & Conflict Protection:**
   - Stale-update and concurrent modification detection using ticket timestamp/version comparison (`updatedAt`).
   - Rejection of conflicting concurrent status transitions or modifications with HTTP `409 Conflict`.
   - UI conflict notification guiding the user to refresh and inspect the latest authoritative state without losing unsaved drafts.
4. **Role-Appropriate Operational Dashboards:**
   - **Requester Dashboard (`/` or `/dashboard` for Requesters):**
     - Metrics: Total Open Tickets, In Progress Tickets, Resolved Tickets, Closed Tickets.
     - My Recent Tickets list (up to 5 most recently updated owned tickets) with status badges and timestamps.
     - Quick Action cards: "+ Create Ticket" and "View My Tickets".
     - Deep-linking / drill-down to filtered views in `/tickets`.
     - Strict backend ownership filtering (zero data leakage from other requesters).
   - **IT Staff Dashboard (`/` or `/dashboard` for IT Staff):**
     - Operational Metric Cards: New, Open, In Progress, Waiting for Requester, My Assigned.
     - Day-over-day trend indicators ($\pm N$ from yesterday 00:00:00 UTC).
     - My Recent Tickets list with status badges, priority badges, and timestamps.
     - Quick Action cards: "+ Create Ticket", "Search Tickets" (focuses queue search), and "My Queue".
     - Drill-down navigation directly linking metric cards to `/queue` with appropriate query filters (`status`, `owner`).
   - **Administrator Dashboard (`/` or `/dashboard` for Administrators):**
     - Operational metrics identical to IT Staff dashboard.
     - User account governance summary: Total Users, Active Users, Inactive Users, Requesters, IT Staff, Administrators.
5. **Database Migration, Backfill, and Seed Data:**
   - Prisma migration adding the `actions_taken` table, foreign keys, and indexes.
   - Safe migration preserving 100% of historical tickets, users, comments, notes, and attachments from Labs 2 and 3.
   - Legacy ticket compatibility: tickets with 0 Actions Taken remain fully operable; dashboard queries handle zero-action tickets seamlessly.
   - Idempotent seed data with realistic tickets across all statuses, priorities, assigned/unassigned owners, tickets with 0, 1, and multiple Actions Taken, and accounts configured for zero and non-zero dashboard metrics.
6. **Application Hardening & Regression Continuity:**
   - Form input state preservation on recoverable API failures.
   - Prevention of duplicate submissions via button disablement and loading spinners.
   - Elimination of console errors, broken links, and incomplete UI controls.
   - 100% pass rate across all existing Lab 2 and Lab 3 automated test suites.
   - Responsive layouts across Desktop ($\ge 992\text{ px}$), Tablet ($768\text{--}991\text{ px}$), and Mobile ($< 768\text{ px}$).

### 3.2. Explicitly Excluded Scope (Out of Scope for Lab 4)
Per Section 4.2 of the Lab 4 handout, the following capabilities are strictly out of scope:
1. **Automated Notification & SLA Engines:**
   - Automatic SLA clocks, escalation engines, on-call scheduling, and breach notifications.
   - Email delivery, SMS, LINE, web push, or external notification services.
2. **Resource, Inventory & Financial Accounting:**
   - Inventory consumption, spare-parts management, purchasing, or cost accounting for services.
   - Time-sheet billing, payroll, hourly wage calculations, or detailed labor-cost calculations.
3. **Advanced Workflow & Approvals:**
   - Multi-level approval workflows, financial sign-offs, and electronic cryptographic signatures.
4. **Analytics Warehousing & Custom BI:**
   - Advanced business-intelligence platforms, custom ad-hoc report builders, OLAP cubes, or export data warehouses.
5. **Multi-Tenancy & Enterprise Cloud:**
   - Multi-tenant organizational data partitioning, cross-organization routing, or production-scale multi-region cloud deployment.
6. **Unapproved Product Features:**
   - Any feature or extension not explicitly authorized by this Sprint 4 engineering contract.

---

## 4. Functional Requirements

### 4.1. Actions Taken
- **FR-01 (Create Action Taken):** The system must allow active IT Staff and Administrators to record an Action Taken on any accessible Ticket. The record must include Action Date/Time (defaults to current timestamp if omitted), Action Description, Result, Performed By (automatically bound to the authenticated user), Follow-Up Required (boolean), Follow-up Note (conditionally mandatory if Follow-Up Required is true), and optional Attachment Notes.
- **FR-02 (Action Taken Performer Decoupling):** The system must allow any active IT Staff member or Administrator to record an Action Taken on a Ticket, regardless of whether that user is the assigned Ticket Owner.
- **FR-03 (Edit Action Taken):** The system must allow active IT Staff and Administrators to update the Description, Result, Follow-Up Required flag, Follow-up Note, and Attachment Notes of an existing Action Taken.
- **FR-04 (Requester Actions Taken Visibility):** Authenticated Requesters must be able to view all Actions Taken recorded on tickets they own in a clean, read-only interface. Requesters are strictly prohibited from creating, editing, or deleting Actions Taken.
- **FR-05 (Inactive Performer / Assignee Rejection):** The system must reject recording or updating an Action Taken if the performing user is inactive (`isActive = false`). When assigning or reassigning a Ticket's owner (`ticketOwnerId`), the system must reject assigning to inactive or non-staff users with HTTP `422 Unprocessable Entity`.
- **FR-06 (Action Taken Chronological Ordering):** Actions Taken must be retrieved and rendered in stable chronological order (oldest to newest by `actionDateTime` / `createdAt`) to preserve the historical audit trail.

### 4.2. Ticket Status Lifecycle & Resolution Gate
- **FR-07 (Complete Status Lifecycle Enforcement):** The backend must strictly enforce valid ticket transitions across the 8 statuses: `NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CLOSED`, `REOPENED`, and `CANCELLED`.
- **FR-08 (Resolution Gate):** The system must reject transitioning a Ticket to `RESOLVED` unless:
  1. The Ticket has at least one recorded `ActionTaken` (`actionsTaken.length > 0`).
  2. A non-empty `resolutionSummary` ($\ge 5$ characters, $\le 1,000$ characters) is supplied.
  Requests failing either condition must be rejected with HTTP `422 Unprocessable Entity`.
- **FR-09 (Advisory Requester Resolution):** The system must allow a Requester to signal that a problem appears resolved (`isRequesterResolved = true`), but this action must NOT modify the Ticket's `currentStatus`.
- **FR-10 (Resolution Summary Retention on Closure):** Transitioning a Ticket from `RESOLVED` to `CLOSED` must preserve the established `resolutionSummary`, allowing optional amendments in the closure confirmation modal.
- **FR-11 (Closed Ticket Reopening Rationale):** Transitioning a Ticket from `CLOSED` to `REOPENED` can only be performed by IT Staff or Administrators, requiring a confirmation step and an explanatory rationale recorded in ticket audit history or comments.
- **FR-12 (Terminal Cancelled State):** A Ticket with `currentStatus = CANCELLED` is terminal. No subsequent transitions are permitted.

### 4.3. Concurrency & Collision Protection
- **FR-13 (Optimistic Concurrency Detection):** When updating a Ticket's status, assignment, or priority, the client must submit the Ticket's known timestamp (`expectedUpdatedAt`). If the database `updatedAt` is newer than `expectedUpdatedAt`, the backend must reject the request with HTTP `409 Conflict`.
- **FR-14 (Safe Concurrency UI Feedback):** Upon receiving HTTP `409 Conflict`, the UI must display a non-destructive alert informing the user that the Ticket was modified by another user, offering a one-click action to refresh the latest authoritative state while preserving unsaved comment/note drafts.

### 4.4. Role-Appropriate Dashboards
- **FR-15 (Requester Dashboard Metrics):** The backend must provide a concise metrics endpoint for Requesters calculating:
  - `myOpenTickets`: Count of owned tickets with status $\in \{\text{NEW}, \text{OPEN}, \text{IN\_PROGRESS}, \text{WAITING\_FOR\_REQUESTER}, \text{REOPENED}\}$.
  - `waitingForRequester`: Count of owned tickets with status $= \text{WAITING\_FOR\_REQUESTER}$ ("Attention Required" items awaiting Requester reply).
  - `inProgress`: Count of owned tickets with status $= \text{IN\_PROGRESS}$.
  - `resolved`: Count of owned tickets with status $= \text{RESOLVED}$.
  - `closed`: Count of owned tickets with status $= \text{CLOSED}$.
- **FR-16 (Requester Recent Tickets):** The Requester Dashboard must return up to 5 most recently updated tickets owned by the authenticated Requester, with ticket number, summary, status badge, priority badge, and formatted date.
- **FR-17 (Requester Drill-Down Links):** Clicking any metric card on the Requester Dashboard must navigate the user to `/tickets` pre-filtered by the corresponding status parameter (`filter=open`, `status=WAITING_FOR_REQUESTER`, `status=IN_PROGRESS`, `status=RESOLVED`, `status=CLOSED`).
- **FR-18 (IT Staff Dashboard Operational Metrics):** The backend must provide an operational metrics endpoint for IT Staff calculating:
  - `new`: Count of all tickets with status $= \text{NEW}$.
  - `open`: Count of all tickets with status $= \text{OPEN}$.
  - `inProgress`: Count of all tickets with status $= \text{IN\_PROGRESS}$.
  - `waitingForRequester`: Count of all tickets with status $= \text{WAITING\_FOR\_REQUESTER}$.
  - `myAssigned`: Count of tickets where `ticketOwnerId = currentUser.id` and status $\notin \{\text{CLOSED}, \text{CANCELLED}\}$.
  - `unassigned`: Count of active tickets where `ticketOwnerId IS NULL` and status $\notin \{\text{CLOSED}, \text{CANCELLED}\}$.
  - `myActionsCount`: Total count of Actions Taken performed by the authenticated staff user (`performedByUserId = currentUser.id`).
  - Day-over-day deltas ($\pm N$) comparing current metric values against counts at 00:00:00 UTC of the previous calendar day.
- **FR-19 (IT Staff Recent & Urgent Tickets & Quick Actions):** The IT Staff Dashboard must return up to 5 most recently updated accessible tickets, prioritized urgent tickets (`itPriority = 'URGENT'`), and the user's recent Actions Taken, alongside quick-action shortcuts for "+ Create Ticket", "Search Tickets" (linking to `/queue` with search parameter), and "My Queue" (linking to `/queue?owner=me`).
- **FR-20 (IT Staff Drill-Down Links):** Clicking any metric card on the IT Staff Dashboard must navigate to `/queue` with appropriate query parameters (`status=NEW`, `status=OPEN`, `status=IN_PROGRESS`, `status=WAITING_FOR_REQUESTER`, `owner=me`, `owner=unassigned`).
- **FR-21 (Administrator Dashboard Governance Extension):** The Administrator Dashboard must provide all operational metrics from the IT Staff Dashboard, plus a concise user-governance summary: total users, active users, inactive users, requesters count, staff count, and administrator count.

### 4.5. Application Hardening & Regression
- **FR-22 (Form Input Preservation):** On all form submissions (Actions Taken, status change dialogs, comments, notes, ticket creation), if an API or network error occurs, all user-entered inputs must remain intact in UI state.
- **FR-23 (Double-Submission Prevention):** Action buttons must be immediately disabled with an active loading spinner upon submission until the API responds.
- **FR-24 (Regression Strategy & Test Suite Evolution):** All 43 automated regression tests in `server/tests/lab-02/` must continue to pass with 100% success against the evolved schema without modification. For Lab 3 test suites in `server/tests/lab-03/`, tests verifying ticket resolution (e.g. `API-17` in `staff-ticket-detail.api.test.ts`) are evolved in Sprint 4 to record an `ActionTaken` prior to resolution to adhere to the mandatory Resolution Gate contract (`FR-08`, `BR-09`).
- **FR-25 (Legacy Ticket Compatibility):** The system must cleanly handle historical tickets created in Labs 2 and 3 that have zero Actions Taken.

---

## 5. Business Rules

| Rule ID | Rule Title | Detailed Business Rule Statement |
|---|---|---|
| **BR-01** | **Single Ticket Association** | An `ActionTaken` record belongs to exactly one `Ticket`. It cannot be shared across multiple tickets or reassigned to a different ticket. |
| **BR-02** | **Independent Action Performer & Ticket Assignment** | The `TicketOwner` coordinates the Ticket as a whole (assigned via `ticketOwnerId` to an active IT Staff or Administrator), but an `ActionTaken` may be performed and recorded by any active IT Staff member or Administrator, independent of ticket ownership. |
| **BR-03** | **Authoritative Performer Binding** | Upon `ActionTaken` creation, the backend automatically binds `performedByUserId = req.user.id`. Any performer identifier supplied in the client request body is ignored. |
| **BR-04** | **Active Performer & Assignee Validation** | Actions Taken can only be created or updated by users with `isActive = true` and role $\in \{\text{IT\_STAFF}, \text{ADMINISTRATOR}\}$. Assigning or reassigning a ticket to an inactive or non-staff user is strictly rejected with HTTP `422 Unprocessable Entity`. Deactivated staff accounts or Requesters attempting to create/update Actions Taken are rejected with HTTP `403 Forbidden` or HTTP `422 Unprocessable Entity`. |
| **BR-05** | **Conditional Follow-up Note Mandate** | If `isFollowUpRequired = true`, the `followUpNote` field is strictly mandatory and must contain between 3 and 1,000 characters after whitespace trimming. If `isFollowUpRequired = false`, `followUpNote` is optional and coerced to `null` by the backend. Submissions violating this rule must be rejected with HTTP `422 Unprocessable Entity`. |
| **BR-06** | **Action Taken Field Validations** | • `description`: Required, 3 to 2,000 characters.<br>• `result`: Required, 3 to 2,000 characters.<br>• `attachmentNotes`: Optional, up to 500 characters.<br>• `actionDateTime`: ISO 8601 timestamp, cannot be set more than 24 hours into the future. |
| **BR-07** | **Requester Read-Only Action Visibility** | Requesters can view all Actions Taken recorded on tickets they own. Requesters are strictly prohibited from creating, updating, or soft-removing Actions Taken; any write attempt by a Requester returns HTTP `403 Forbidden`. Requests for tickets not owned by the Requester return HTTP `404 Not Found`. |
| **BR-08** | **Action Taken Chronological Integrity & Append-Only Audit Trail** | Actions Taken are ordered chronologically by `actionDateTime` (or `createdAt`) ascending. Updates to an Action Taken update `updatedAt` but preserve the original `id`, `ticketId`, `performedByUserId`, and `createdAt`. **Append-Only & Deletion Prohibition:** Actions Taken records are strictly append-only. The system intentionally omits and prohibits hard and soft deletion (`DELETE /api/actions-taken/:actionId` is not provided) for all roles, including Administrators. This architectural guarantee preserves a complete, tamper-proof historical audit trail of technical interventions per Handout Part 7 (*"append-only behavior"*). |
| **BR-09** | **Ticket Resolution Gate** | A Ticket cannot be transitioned to `RESOLVED` unless:<br>1. The Ticket contains at least one recorded `ActionTaken` record (`actionsTaken.length \ge 1`).<br>2. A non-empty `resolutionSummary` ($\ge 5$ and $\le 1,000$ characters) is provided.<br>Any attempt to transition to `RESOLVED` without satisfying both conditions is rejected with HTTP `422 Unprocessable Entity`. |
| **BR-10** | **Advisory Requester Resolution Indication** | A Requester signaling "Problem Appears Resolved" (`isRequesterResolved = true`) provides an advisory banner to IT Staff. This indicator does NOT alter the Ticket's `currentStatus` or bypass the formal Resolution Gate. |
| **BR-11** | **Permitted Status Transition Matrix** | Status transitions must follow the authorized state machine:<br>• `NEW` $\rightarrow$ `OPEN`, `IN_PROGRESS`, `CANCELLED`<br>• `OPEN` $\rightarrow$ `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `CANCELLED`<br>• `IN_PROGRESS` $\rightarrow$ `WAITING_FOR_REQUESTER`, `RESOLVED`, `CANCELLED`<br>• `WAITING_FOR_REQUESTER` $\rightarrow$ `IN_PROGRESS`, `RESOLVED`, `CANCELLED`<br>• `RESOLVED` $\rightarrow$ `CLOSED`, `REOPENED`<br>• `REOPENED` $\rightarrow$ `IN_PROGRESS`, `RESOLVED`, `CANCELLED`<br>• `CLOSED` $\rightarrow$ `REOPENED` (IT Staff/Admin only; requires confirmation and rationale)<br>• `CANCELLED` $\rightarrow$ Terminal (no transitions permitted)<br>Unauthorized transitions are rejected with HTTP `422 Unprocessable Entity`. |
| **BR-12** | **Optimistic Concurrency Protection** | Updating a Ticket's status, assignment, or priority requires matching the client's `expectedUpdatedAt` against the database `updatedAt`. If the database timestamp is newer, the request must fail with HTTP `409 Conflict`. The client must refresh the ticket before retrying. |
| **BR-13** | **Requester Data Isolation & Attention-Required Scope** | All Requester Dashboard metrics and ticket lists must be queried exclusively with `WHERE requesterId = currentUser.id`. Accessing metrics of other users is impossible, and querying another user's ticket returns HTTP `404 Not Found`. Attention-required tickets waiting for requester input (`WAITING_FOR_REQUESTER`) are explicitly calculated and isolated to the authenticated requester. |
| **BR-14** | **Authoritative Dashboard Calculation** | All dashboard metrics (including `unassigned` tickets and `myActionsCount` for staff) and day-over-day trends must be calculated on the backend directly from the PostgreSQL database using authoritative timestamps and SQL aggregations. Frontend clients must never calculate metrics from paginated ticket subsets. |
| **BR-15** | **Trend Calculation Time Boundaries** | Trend deltas ($\pm N$ from yesterday) on the IT Staff Dashboard compare the current live count against the count of matching records created or updated prior to 00:00:00 UTC (07:00:00 ICT) of the current calendar day. |
| **BR-16** | **Legacy Ticket Backwards Compatibility** | Historical tickets with zero Actions Taken remain valid and operable. Status progression for legacy tickets requires recording at least one Action Taken prior to resolution. Dashboard counts include legacy tickets seamlessly. |
| **BR-17** | **Form Input Retention on Failure** | UI forms (Action Taken modal/inline, status transition modal, comments, notes) must retain all user input when an API call fails with validation (`422`), conflict (`409`), or network errors (`500`). |
| **BR-18** | **Submission Idempotency & Debounce** | UI action buttons must lock and display a busy spinner during pending network requests to prevent duplicate submissions or race conditions. |

---

## 6. UI Specification Summary
The UI strictly implements the Zen Green design tokens documented in `docs/lab-04/ui-spec.md`.

### 6.1. Visual Language & Tokens Summary
- **Primary Green (`#006B3C`):** Header bar, primary buttons (`Save Action`, `+ Create Ticket`, `Confirm Resolution`).
- **Secondary Green (`#0B7A46`):** Active nav indicator, focused input outlines, interactive links.
- **Pale Green (`#EAF6EF`):** Table row selection, success banners, active tab highlight.
- **Page Background (`#F5F7F6`):** Neutral global background.
- **Surface (`#FFFFFF`):** Cards, tables, modal dialogs, drawer panels.
- **Read-Only Controls (`#F3F6F4`):** Shaded background for non-editable ticket fields.
- **Action Taken Callout:** Neutral surface `#FFFFFF` with `#E2E8F0` border; follow-up required badge in warning amber (`#D97706` text, `#FEF3C7` background).
- **Internal Notes Callout:** `#FFFBEB` background with `#F59E0B` amber border.

### 6.2. Key Screens and Modes
1. **IT Staff Dashboard (`/` or `/dashboard`):**
   - Header with greeting: "Welcome back, {Name}! Here's what's happening with your queue today." + Refresh button.
   - 5 KPI metric cards: **New**, **Open**, **In Progress**, **Waiting for Requester**, **My Assigned**, displaying count and trend badge (e.g., `+3 from yesterday`).
   - Split view: Left side displays "My Recent Tickets" (top 5 updated tickets with ticket number, summary, status badge, formatted time); Right side displays "Quick Actions" (`+ Create Ticket`, `🔍 Search Tickets`, `📋 My Queue`).
   - Every metric card links directly to `/queue` with pre-applied filter.
2. **Requester Dashboard (`/` or `/dashboard`):**
   - Header with greeting: "Welcome, {Name}! Here's the latest on your requests."
   - 4 KPI metric cards: **My Open Tickets**, **In Progress**, **Resolved**, **Closed**, with "View all" links to `/tickets`.
   - Split view: Left side displays "My Recent Tickets"; Right side displays "Quick Actions" (`+ Create Ticket`, `📄 View My Tickets`).
   - Strict ownership isolation.
3. **Actions Taken on Ticket Detail (`/queue/:id` and `/tickets/:id`):**
   - **IT Staff Mode (`/queue/:id`):**
     - Renders an "Actions Taken" section with summary count.
     - "+ Record Action Taken" button toggling Create Mode form: Action Date/Time (default now), Description, Result, Follow-Up Required toggle, Follow-up Note (conditionally visible/required), Attachment Notes.
     - Each existing action card/row displays full details and an "Edit" button opening View/Edit Mode.
   - **Requester Mode (`/tickets/:id`):**
     - Clean, read-only audit list of Actions Taken showing Date/Time, Description, Result, Performed by, and Follow-Up indicator. Create/Edit controls are completely hidden.
4. **Resolution Gate Feedback on Ticket Detail:**
   - Status dropdown allows picking `RESOLVED`.
   - When selected, confirmation modal checks for recorded Actions Taken. If none exist, an inline alert informs: *"Resolution Gate: At least one Action Taken must be recorded before resolving this ticket."* and the confirmation button is disabled.
   - If Actions Taken exist, prompts for mandatory `resolutionSummary` ($\ge 5$ characters).

---

## 7. Data Changes (Database Increment)

### 7.1. Prisma Schema Evolution (`server/prisma/schema.prisma`)

```prisma
model ActionTaken {
  id                 Int       @id @default(autoincrement())
  ticketId           Int
  ticket             Ticket    @relation(fields: [ticketId], references: [id], onDelete: Cascade)

  actionDateTime     DateTime  @default(now())
  description        String    @db.Text
  result             String    @db.Text

  performedByUserId  Int
  performedBy        User      @relation("UserPerformedActions", fields: [performedByUserId], references: [id], onDelete: Restrict)

  isFollowUpRequired Boolean   @default(false)
  followUpNote       String?   @db.Text
  attachmentNotes    String?   @db.Text

  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt

  @@index([ticketId, actionDateTime])
  @@index([performedByUserId])
  @@map("actions_taken")
}
```

The `User` and `Ticket` models are updated to include reciprocal relations:
- `User.performedActions: ActionTaken[] @relation("UserPerformedActions")`
- `Ticket.actionsTaken: ActionTaken[]`

### 7.2. Database Design Justifications (Mandatory Handout Section 5.1)
1. **Justification 1 — Decoupled Performer Foreign Key vs. Ticket Owner:** 
   In IT service desks, incident troubleshooting is collaborative. While a ticket has a single coordinating `ticketOwnerId`, specialized team members (e.g., network engineers, database administrators) frequently execute individual interventions. Creating an explicit `performedByUserId` foreign key on `ActionTaken` directly referencing `User(id)` decouples the actor who performed the work from the overall Ticket Owner. This satisfies business rule **BR-02**, enables accurate per-engineer accountability, and preserves foreign key integrity without altering the primary ticket assignment.
2. **Justification 2 — Optimistic Concurrency via `Ticket.updatedAt`:**
   In a multi-agent or multi-staff concurrent environment, two IT Staff members might simultaneously attempt to resolve or update the same ticket. Rather than using heavyweight database row locks (`SELECT ... FOR UPDATE`), which can introduce latency and deadlocks, TokTickIT uses lightweight optimistic concurrency control via the existing `@updatedAt` timestamp on `Ticket`. Status updates require client verification of `expectedUpdatedAt`. If another user committed a change in the interim, the update is safely aborted with HTTP `409 Conflict`, guaranteeing that workflow transitions are strictly sequential and never silently overwritten.

### 7.3. Migration & Backfill Strategy
1. **Migration Execution:** Run `npx prisma migrate dev --name add_actions_taken` to generate and apply the migration creating table `actions_taken` and corresponding foreign keys and composite indexes.
2. **Backfill & Historical Data Preservation:** All historical `users`, `tickets`, `categories`, `related_systems`, `attachments`, `public_comments`, and `internal_notes` remain untouched. Legacy tickets have 0 `ActionTaken` rows. The application supports tickets with zero Actions Taken natively, displaying a friendly empty state on Ticket Detail and treating them as valid open/closed tickets in dashboard metrics.
3. **Rollback & Recovery Plan:** If rollback is required, dropping the `actions_taken` table via `DROP TABLE IF EXISTS actions_taken CASCADE;` completely restores the database to the exact Lab 3 schema without affecting historical ticket records.

### 7.4. Idempotent Seed Data (`server/prisma/seed.ts`)
The seed script uses deterministic `upsert` operations ensuring repeated execution produces an identical database state:
- **Accounts:**
  - Preserves all 5 Lab 2 Requester accounts (`jennifer.anderson@kmutt.ac.th`, etc.).
  - Preserves IT Staff accounts (`staff.michael@toktickit.com`, `staff.sarah@toktickit.com`, `staff.david@toktickit.com`, `kpatel@toktickit.com` [inactive]).
  - Preserves Admin account (`admin@toktickit.com`).
- **Tickets & Actions Taken Distribution:**
  - Seeds realistic tickets across all 8 statuses and 4 priorities.
  - **Zero Actions Taken:** Seed at least 2 tickets with 0 Actions Taken (demonstrates legacy tickets and resolution gate blocking).
  - **Single Action Taken:** Seed at least 3 tickets with 1 Action Taken.
  - **Multiple Actions Taken:** Seed at least 3 tickets with 2+ Actions Taken performed by different IT Staff members (e.g., Action 1 by Sarah, Action 2 by Michael on a ticket owned by Michael).
  - **Follow-Up Tickets:** Seed actions with `isFollowUpRequired = true` and comprehensive `followUpNote`.
  - **Dashboard Metric Calibration:** Seed distribution ensures predictable, verifiable counts on IT Staff, Requester, and Administrator dashboards (including accounts with non-zero metrics and clean accounts with zero metrics).

---

## 8. API Contract Summary
Full request/response schemas, validation rules, and error codes are detailed in `docs/lab-04/api-spec.md`.

| Method | Endpoint | Description | Permitted Roles |
|---|---|---|---|
| `GET` | `/api/tickets/:id/actions-taken` | List all Actions Taken for a ticket (chronological) | `REQUESTER` (owned), `IT_STAFF`, `ADMINISTRATOR` |
| `POST` | `/api/tickets/:id/actions-taken` | Record a new Action Taken under a ticket | `IT_STAFF`, `ADMINISTRATOR` |
| `PATCH` | `/api/actions-taken/:actionId` | Update an existing Action Taken record | `IT_STAFF`, `ADMINISTRATOR` |
| `GET` | `/api/actions-taken/:actionId` | Retrieve single Action Taken details | `REQUESTER` (owned), `IT_STAFF`, `ADMINISTRATOR` |
| `PATCH` | `/api/staff/tickets/:id/status` | Update status (with Concurrency & Resolution Gate) | `IT_STAFF`, `ADMINISTRATOR` |
| `GET` | `/api/dashboards/requester` | Retrieve personal Requester dashboard metrics & recent tickets | `REQUESTER` |
| `GET` | `/api/dashboards/staff` | Retrieve operational IT Staff metrics, trends & recent tickets | `IT_STAFF`, `ADMINISTRATOR` |
| `GET` | `/api/dashboards/admin` | Retrieve IT queue operational metrics + user account stats | `ADMINISTRATOR` |

---

## 9. Acceptance Criteria

- **AC-01 (Create Valid Actions Taken):**
  - *Given* a permitted IT Staff user and valid data,
  - *When* an Actions Taken is created,
  - *Then* it is saved under the correct Ticket with the authenticated creator (`performedByUserId`) and approved ticket assignee (`ticketOwnerId`), returning HTTP `201 Created`.
- **AC-02 (Requester Dashboard Data Isolation & Attention-Required Metrics):**
  - *Given* an authenticated Requester,
  - *When* dashboard data is retrieved via `GET /api/dashboards/requester`,
  - *Then* only metrics (including total open tickets, attention-required tickets waiting for requester, in progress, resolved, closed) and recent tickets owned by that Requester are returned, with zero leakage of other requesters' tickets.
- **AC-03 (Follow-Up Note Validation Gate):**
  - *Given* an IT Staff user submitting an Action Taken,
  - *When* `isFollowUpRequired` is set to `true` but `followUpNote` is empty or missing,
  - *Then* the backend rejects the submission with HTTP `422 Unprocessable Entity`, and the UI displays an inline validation error while preserving entered fields.
- **AC-04 (Inactive Performer Rejection):**
  - *Given* a deactivated user account (`isActive = false`),
  - *When* a request attempts to record or update an Action Taken,
  - *Then* the operation is rejected with HTTP `403 Forbidden` or `422 Unprocessable Entity`.
- **AC-05 (Action Taken Update):**
  - *Given* an existing Action Taken record,
  - *When* an authorized IT Staff user edits the description, result, or follow-up note via `PATCH /api/actions-taken/:actionId`,
  - *Then* the changes are persisted, `updatedAt` is refreshed, and HTTP `200 OK` is returned.
- **AC-06 (Requester Read-Only View of Actions Taken):**
  - *Given* an authenticated Requester viewing their owned Ticket Detail,
  - *When* the Actions Taken section loads,
  - *Then* all Actions Taken items are visible with timestamps, performer names, results, and notes, but create/edit controls are absent.
- **AC-07 (Requester Action Creation Forbidden):**
  - *Given* an authenticated Requester,
  - *When* attempting to call `POST /api/tickets/:id/actions-taken`,
  - *Then* the backend rejects the call with HTTP `403 Forbidden`.
- **AC-08 (Resolution Gate Enforcement - Zero Actions Taken):**
  - *Given* a Ticket with zero recorded Actions Taken,
  - *When* an IT Staff user attempts to transition status to `RESOLVED`,
  - *Then* the transition is blocked by the UI and rejected by the backend with HTTP `422 Unprocessable Entity` ("At least one Action Taken must be recorded before resolution").
- **AC-09 (Resolution Gate Enforcement - Missing Resolution Summary):**
  - *Given* a Ticket with recorded Actions Taken,
  - *When* an IT Staff user transitions status to `RESOLVED` without a `resolutionSummary`,
  - *Then* the backend rejects the transition with HTTP `422 Unprocessable Entity`.
- **AC-10 (Advisory Requester Resolution Does Not Change Status):**
  - *Given* an open ticket owned by the authenticated Requester,
  - *When* the Requester flags "Problem Appears Resolved",
  - *Then* `isRequesterResolved` is set to `true`, an advisory banner appears for staff, but `currentStatus` remains unchanged.
- **AC-11 (Optimistic Concurrency Conflict Detection):**
  - *Given* a Ticket currently at version timestamp $T_1$,
  - *When* User A submits a status update with `expectedUpdatedAt = T_0` ($T_0 < T_1$),
  - *Then* the backend aborts the update with HTTP `409 Conflict`, and the UI displays a conflict dialog prompting the user to refresh.
- **AC-12 (IT Staff Dashboard Metrics, Current-User Actions & Drill-Down):**
  - *Given* an authenticated IT Staff user,
  - *When* viewing the IT Staff Dashboard,
  - *Then* accurate counts for New, Open, In Progress, Waiting for Requester, My Assigned, Unassigned, and current user's Actions Taken count (`myActionsCount`) are displayed with trend badges, urgent tickets are accessible, and clicking any card navigates to `/queue` with the corresponding query filter.
- **AC-13 (Admin Dashboard User Governance Summary):**
  - *Given* an authenticated Administrator,
  - *When* viewing the Administrator Dashboard,
  - *Then* the dashboard displays the full operational queue metrics alongside total user, active user, staff, and admin counts.
- **AC-14 (Complete Permitted Status Lifecycle):**
  - *Given* a Ticket in the IT queue,
  - *When* transitioning through authorized paths (`NEW` $\rightarrow$ `OPEN` $\rightarrow$ `IN_PROGRESS` $\rightarrow$ `RESOLVED` $\rightarrow$ `CLOSED` $\rightarrow$ `REOPENED`),
  - *Then* all valid transitions succeed with appropriate confirmation dialogs, while invalid transitions (e.g. `NEW` $\rightarrow$ `CLOSED`) are rejected with HTTP `422`.
- **AC-15 (Legacy Ticket Backwards Compatibility):**
  - *Given* legacy tickets from Labs 2 and 3 without Actions Taken,
  - *When* accessed by Requesters or IT Staff,
  - *Then* they render cleanly with empty Actions Taken states and remain fully operable.
- **AC-16 (Form State Retention & Double-Click Guard):**
  - *Given* any form submission in the application,
  - *When* an API error occurs,
  - *Then* entered form values are preserved in the input controls, and rapid double-clicking is prevented by active submission locks.

---

## 10. Definition of Done (DoD)

### 10.1. Product Completion DoD
1. **Scope Delivery:** All capabilities in Section 3.1 are implemented according to this specification and the Zen Green design system.
2. **Acceptance Criteria Verification:** All 16 Acceptance Criteria (AC-01 through AC-16) pass with 100% automated test proof.
3. **Automated Test Quality:**
   - Vitest backend integration test suites (`actions-taken.api.test.ts`, `ticket-workflow.api.test.ts`, `requester-dashboard.api.test.ts`, `staff-dashboard.api.test.ts`) pass with 100% success rate.
   - Vitest frontend component test suites (`StaffDashboard.test.tsx`, `RequesterDashboard.test.tsx`, `ActionsTaken.test.tsx`, `TicketWorkflow.test.tsx`) pass with 100% success rate.
   - Playwright E2E suites (`actions-taken-flow.spec.ts`, `ticket-resolution.spec.ts`, `dashboards.spec.ts`) pass across desktop, tablet, and mobile viewports.
   - Zero test regressions: All 43 Lab 2 tests in `server/tests/lab-02/` and all Lab 3 tests continue to pass.
4. **Data Integrity & Migrations:** Prisma migration applies cleanly, idempotent seed script executes safely repeatedly, and foreign key cascades/restrictions behave correctly.
5. **Code & Build Quality:** Zero TypeScript compiler errors (`npx tsc --noEmit` on server and client), clean build (`npm run build`), no console errors or unhandled promise rejections.
6. **Resilience & Security:** Forms preserve input on errors; role boundaries enforced server-side; cross-requester probing strictly returns HTTP 404.

### 10.2. Course Delivery DoD
1. Git engineering workflow followed with feature branches merged into `lab4-staging` and integrated into `main`.
2. GitHub Project / Kanban board updated with all Lab 4 issues moved to `Done`.
3. Complete rendered documentation files maintained under `docs/lab-04/` (`specification.md`, `ui-spec.md`, `api-spec.md`, `tests.md`).
4. High-resolution screenshots captured across desktop, tablet, and mobile viewports in `artifacts/lab-04/screenshots/`.
5. Concise submission PDF prepared adhering to the mandatory "Answer Part 1" through "Answer Part 9" format.

---

## 11. Assumptions and Decisions

1. **Dashboard Route & View Architecture:** 
   *Decision:* The application root (`/`) dynamically renders the role-appropriate dashboard: Requesters see the Requester Dashboard, IT Staff see the IT Staff Dashboard, and Administrators see the Administrator Dashboard. In the application header, a new "Dashboard" navigation tab is added for all authenticated roles, with clear active-tab highlighting.
2. **Actions Taken Visibility by Requesters:**
   *Decision:* Requesters are granted read-only visibility to Actions Taken on their owned tickets. Unlike Internal Notes (which remain strictly confidential to IT Staff), Actions Taken represent transparent operational work done on the user's issue (e.g. "Replaced HDMI cable", "Patched display drivers"), enhancing customer trust and communication.
3. **Resolution Gate Enforcement Rules:**
   *Decision:* Transitioning to `RESOLVED` requires both: (1) `actionsTaken.length \ge 1` and (2) a non-empty `resolutionSummary` ($\ge 5$ characters). If an IT Staff member attempts to resolve a ticket with 0 actions, the backend returns HTTP `422 Unprocessable Entity` and the UI confirmation modal blocks the action with a clear explanatory alert.
4. **Optimistic Concurrency Strategy:**
   *Decision:* Ticket status, assignment, and priority updates accept an optional `expectedUpdatedAt` field. If supplied, the backend compares this with `ticket.updatedAt`. If mismatched, HTTP `409 Conflict` is returned. If omitted (for backward compatibility with legacy scripts), the update proceeds.
5. **Trend Calculation Time Window:**
   *Decision:* Day-over-day deltas ($\pm N$ from yesterday) compare live counts against counts at 00:00:00 UTC (07:00:00 ICT) of the current calendar day, providing an objective, reproducible reference boundary for automated tests and demonstrations.
6. **Administrator Dashboard Structure:**
   *Decision:* Administrators possess full operational IT Staff capabilities and governance authority. Rather than duplicating screens, the Admin Dashboard presents the operational IT queue metric cards alongside a clean user-governance summary card (Total, Active, Inactive, Staff, Admin counts).
7. **Reconciliation of Part 6 Grading Rubric Terminology:**
   *Decision:* Section 14 (Part 6) of the grading rubric requires: *"Demonstrate list, create, assign, edit, status transition, complete, cancel, validation, inactive-assignee rejection, role restrictions, safe failures, and responsive behavior. Show different Actions Taken on one Ticket."* The system architecture reconciles these terms through the cohesive Ticket Detail view:
   - **Ticket Assignment & Inactive Rejection:** Handled by ticket coordination (`ticketOwnerId` update via `PATCH /api/staff/tickets/:id/assignment`), which validates and rejects inactive users.
   - **Status Transition, Complete, and Cancel:** Handled by the Ticket lifecycle machine via `PATCH /api/staff/tickets/:id/status`, where a ticket is completed through the Resolution Gate (`RESOLVED` $\rightarrow$ `CLOSED`) or aborted via `CANCELLED`.
   - **Action Taken List, Create, Edit, Validation & Execution States:** Handled via `/api/tickets/:id/actions-taken`, where individual actions capture performed work, validate non-empty results and conditional follow-up notes, and visually reflect execution states (`[ Follow-Up Required ]` vs `[ Completed ]`).
8. **Operational Metrics Selection ("by status or IT Priority"):**
   *Decision:* Handout Section 4.6 permits grouping metrics "by status or IT Priority". TokTickIT implements the 5 primary status/owner KPI cards (`NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `My Assigned`) in strict alignment with the Section 8.1 wireframe, supplemented by an `urgentTickets` feed and queue priority filters to highlight emergency tickets.
9. **Lab 3 Test Suite Evolution vs. Lab 2 Zero-Modification Regression:**
   *Decision:* Sprint 4 introduces the Resolution Gate (`BR-09`), which requires at least one `ActionTaken` before a ticket can be transitioned to `RESOLVED`. Zero-modification regression is strictly guaranteed for all 43 Lab 2 tests (`server/tests/lab-02/`). For Lab 3 workflow tests (`server/tests/lab-03/staff-ticket-detail.api.test.ts`), test setups that progress tickets to `RESOLVED` are evolved to record an `ActionTaken` prior to calling resolution, reflecting standard TDD contract evolution.
10. **Append-Only Action Taken and Intentional Omission of DELETE Operations:**
    *Decision:* To satisfy Handout Part 7 (*"Demonstrate permitted Ticket transitions, stable ordering, append-only behavior, and role-appropriate visibility"*), the `ActionTaken` domain model and REST API intentionally omit any deletion capability (`DELETE`). Once an action is recorded, it permanently remains part of the ticket's technical history. Updates (`PATCH`) are permitted exclusively for active IT Staff and Administrators to refine descriptions or complete follow-ups, with timestamps automatically tracked via `updatedAt`. This architectural decision prevents accidental data loss or intentional tampering with historical diagnostic records.
