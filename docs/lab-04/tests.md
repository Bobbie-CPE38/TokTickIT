# Lab 4 Test Plan and Traceability Matrix

## 1. Testing Strategy

The quality engineering process for Sprint 4 follows rigorous **Test-Driven Development (TDD)** and **Specification-Driven Development (Spec DD)**. Every functional requirement, business rule, and acceptance criterion defined in `docs/lab-04/specification.md` is verified through automated test suites implemented before and alongside application code.

### 1.1. Testing Levels and Frameworks
- **Backend API & Integration Tests:** Vitest + Supertest testing Express routers, Prisma queries, JWT authentication, role guards, Actions Taken CRUD, resolution gate logic, optimistic concurrency checks, and dashboard aggregations.
- **Frontend Component & State Tests:** Vitest + React Testing Library + `@testing-library/user-event` testing IT Staff and Requester dashboard rendering, KPI metric drill-down links, Actions Taken list/create/edit modes, conditional follow-up note validation, resolution confirmation modals, and safe failure states.
- **End-to-End (E2E) Workflow Tests:** Playwright verifying multi-role user journeys (Staff records action $\rightarrow$ Resolves ticket through gate; Requester inspects actions on owned ticket $\rightarrow$ Flags advisory resolved; Concurrency collision alert) across Desktop, Tablet, and Mobile viewports.
- **Regression Suite Guarantee:** Explicit verification that 100% of previous automated tests (all 43 Lab 2 tests in `server/tests/lab-02/` and all Lab 3 test suites) pass without modification.

### 1.2. Test Directory and File Organization
```
server/tests/lab-04/
├── actions-taken.api.test.ts
├── ticket-workflow.api.test.ts
├── requester-dashboard.api.test.ts
└── staff-dashboard.api.test.ts

client/tests/lab-04/
├── StaffDashboard.test.tsx
├── RequesterDashboard.test.tsx
├── ActionsTaken.test.tsx
└── TicketWorkflow.test.tsx

e2e/lab-04/
├── actions-taken-flow.spec.ts
├── ticket-resolution.spec.ts
├── dashboards.spec.ts
├── hardening.spec.ts
└── support.ts            (shared helpers: login, API/DB lookups, overflow & touch-target checks, screenshots)
```

---

## 2. Planned Automated Tests

| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final Status |
|---|---|---|---|---|---|:---:|
| **API-01** | API | AC-01, BR-01 | Create Action Taken under ticket by IT Staff | HTTP 201 Created; action linked to target ticket; creator auto-assigned | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |
| **API-02** | API | AC-01, BR-02 | Action Taken performed by staff member different from ticket owner | HTTP 201 Created; `performedByUserId` matches actor, `ticketOwnerId` unchanged | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |
| **API-03** | API | AC-01, FR-01 | Create a valid Actions Taken (Handout Example) | Created under the correct Ticket and actor | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |
| **API-04** | API | AC-03, BR-05 | Create Action Taken with `isFollowUpRequired = true` but empty `followUpNote` | HTTP 422 Unprocessable Entity; rejection detailing missing follow-up note | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |
| **API-05** | API | AC-03, BR-05 | Create Action Taken with valid follow-up note ($\ge 3$ characters) | HTTP 201 Created; `isFollowUpRequired: true` and note saved | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |
| **API-06** | API | AC-04, BR-04 | Deactivated IT Staff user attempts to record Action Taken | HTTP 403 Forbidden or 422; inactive user blocked from recording work | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |
| **API-07** | API | AC-05, FR-03 | Update existing Action Taken via `PATCH /api/actions-taken/:actionId` | HTTP 200 OK; updated fields persisted; `updatedAt` refreshed | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |
| **API-08** | API | AC-06, BR-07 | Requester fetches Actions Taken for owned ticket (`GET /api/tickets/:id/actions-taken`) | HTTP 200 OK; returns array of actions with performer details | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |
| **API-09** | API | AC-07, BR-07 | Requester attempts to create Action Taken (`POST /api/tickets/:id/actions-taken`) | HTTP 403 Forbidden; Requesters cannot record actions | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |
| **API-10** | API | AC-06, BR-07 | Requester queries Actions Taken on another user's ticket | HTTP 404 Not Found; zero data leaked | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |
| **API-11** | API | AC-08, BR-09 | Transition ticket to `RESOLVED` with zero recorded Actions Taken | HTTP 422 Unprocessable Entity ("At least one Action Taken must be recorded") | `server/tests/lab-04/ticket-workflow.api.test.ts` | Pass |
| **API-12** | API | AC-09, BR-09 | Transition ticket to `RESOLVED` with Actions Taken but missing `resolutionSummary` | HTTP 422 Unprocessable Entity ("resolutionSummary is required") | `server/tests/lab-04/ticket-workflow.api.test.ts` | Pass |
| **API-13** | API | AC-08, AC-09 | Transition ticket to `RESOLVED` with Actions Taken AND valid `resolutionSummary` | HTTP 200 OK; status updated to `RESOLVED`, summary saved | `server/tests/lab-04/ticket-workflow.api.test.ts` | Pass |
| **API-14** | API | AC-10, BR-10 | Requester flags "Problem Appears Resolved" (`PATCH /api/tickets/:id/resolve-indication`) | HTTP 200 OK; `isRequesterResolved = true`; `currentStatus` unchanged | `server/tests/lab-04/ticket-workflow.api.test.ts` | Pass |
| **API-15** | API | AC-11, BR-12 | Concurrency check: status update with stale `expectedUpdatedAt` | HTTP 409 Conflict; returns current authoritative ticket state | `server/tests/lab-04/ticket-workflow.api.test.ts` | Pass |
| **API-16** | API | AC-14, BR-11 | Complete 8-status transition validation (`NEW` $\rightarrow$ `OPEN` $\rightarrow$ `IN_PROGRESS`, etc.) | HTTP 200 OK for permitted transitions; HTTP 422 for illegal jumps (e.g. `NEW` $\rightarrow$ `CLOSED`) | `server/tests/lab-04/ticket-workflow.api.test.ts` | Pass |
| **API-17** | API | AC-02, BR-13 | Requester Dashboard metrics retrieval (`GET /api/dashboards/requester`) | HTTP 200 OK; accurate counts strictly scoped to requester, including `waitingForRequester` attention-required | `server/tests/lab-04/requester-dashboard.api.test.ts` | Pass |
| **API-18** | API | AC-02, FR-16 | Requester Dashboard recent tickets ordering and limit | HTTP 200 OK; returns up to 5 most recently updated owned tickets | `server/tests/lab-04/requester-dashboard.api.test.ts` | Pass |
| **API-19** | API | AC-12, FR-18 | IT Staff Dashboard metrics retrieval (`GET /api/dashboards/staff`) | HTTP 200 OK; accurate counts for New, Open, In Progress, Waiting, My Assigned, Unassigned, myActionsCount, and urgentTickets | `server/tests/lab-04/staff-dashboard.api.test.ts` | Pass |
| **API-20** | API | AC-12, BR-15 | IT Staff Dashboard day-over-day trend delta calculations | HTTP 200 OK; returns correct $\pm N$ trends relative to midnight 00:00:00 UTC | `server/tests/lab-04/staff-dashboard.api.test.ts` | Pass |
| **API-21** | API | AC-13, FR-21 | Administrator Dashboard retrieval (`GET /api/dashboards/admin`) | HTTP 200 OK; returns operational queue metrics + user statistics | `server/tests/lab-04/staff-dashboard.api.test.ts` | Pass |
| **API-22** | API | AC-15, BR-16 | Legacy ticket compatibility: tickets with 0 Actions Taken handled gracefully | HTTP 200 OK; ticket details return empty actions array `[]`; dashboard counts include ticket | `server/tests/lab-04/ticket-workflow.api.test.ts` | Pass |
| **API-23** | API | FR-24 | Final regression check: all 43 Lab 2 regression tests pass against migrated schema | HTTP 200 OK; 100% pass rate in `server/tests/lab-02/` | `server/tests/lab-02/*.test.ts` | Pass |
| **API-24** | Perf-Smoke | AC-12, DoD-05 | Performance smoke test: dashboard aggregation and queue retrieval latency under baseline load | Response latency < 200ms; authoritative queries execute within performance budget | `server/tests/lab-04/staff-dashboard.api.test.ts` | Pass |
| **UI-01** | UI | AC-12, FR-18 | StaffDashboard KPI cards render correct metrics and trend badges | Metric cards display big numbers, correct labels, and green/gray trend badges | `client/tests/lab-04/StaffDashboard.test.tsx` | Pass |
| **UI-02** | UI | AC-12, FR-20 | StaffDashboard KPI card click triggers drill-down navigation to `/queue` | Clicking "New (14)" navigates to `/queue?status=NEW`; "My Assigned" navigates to `/queue?owner=me` | `client/tests/lab-04/StaffDashboard.test.tsx` | Pass |
| **UI-03** | UI | FR-19 | StaffDashboard Quick Actions links | Clicking "+ Create Ticket" opens creation; "Search Tickets" navigates to `/queue` | `client/tests/lab-04/StaffDashboard.test.tsx` | Pass |
| **UI-04** | UI | AC-02, FR-15 | RequesterDashboard renders the 4 KPI metric cards and surfaces Attention Required tickets | Displays My Open Tickets, In Progress, Resolved, Closed cards linking to filtered `/tickets`; `waitingForRequester` shown as an attention callout and badge (ui-spec 6.2) | `client/tests/lab-04/RequesterDashboard.test.tsx` | Pass |
| **UI-05** | UI | AC-02, FR-16 | RequesterDashboard recent tickets list and empty state | Displays list of recent tickets; renders clean empty message when 0 tickets exist | `client/tests/lab-04/RequesterDashboard.test.tsx` | Pass |
| **UI-06** | UI | AC-01, FR-01 | ActionsTaken section renders list mode and toggles create mode | Clicking "+ Record Action Taken" renders form with Date, Description, Result, Follow-up | `client/tests/lab-04/ActionsTaken.test.tsx` | Pass |
| **UI-07** | UI | AC-03, BR-05 | ActionsTaken conditional follow-up note field reveal and validation | Toggling "Follow-up required?" checkbox reveals required note textarea; blocks submit if empty | `client/tests/lab-04/ActionsTaken.test.tsx` | Pass |
| **UI-08** | UI | AC-06, BR-07 | ActionsTaken in Requester mode renders read-only view | Displays action cards with details; "+ Record Action Taken" and "Edit" buttons are absent | `client/tests/lab-04/ActionsTaken.test.tsx` | Pass |
| **UI-09** | UI | AC-08, BR-09 | TicketWorkflow Resolution Gate: 0 Actions Taken disables resolution | Modal displays warning banner ("At least one Action Taken must be recorded"); confirm button disabled | `client/tests/lab-04/TicketWorkflow.test.tsx` | Pass |
| **UI-10** | UI | AC-09, BR-09 | TicketWorkflow Resolution Gate: Requires non-empty resolution summary | Validation message shown if summary is empty or $< 5$ characters | `client/tests/lab-04/TicketWorkflow.test.tsx` | Pass |
| **UI-11** | UI | AC-11, BR-12 | TicketWorkflow Concurrency conflict dialog | Receiving HTTP 409 displays Stale Record Dialog with "Keep My Drafts & Refresh" action | `client/tests/lab-04/TicketWorkflow.test.tsx` | Pass |
| **UI-12** | UI | AC-16, BR-17 | Form input preservation on API failure across all screens | Inputs retain entered text when network error or 422 occurs | `client/tests/lab-04/ActionsTaken.test.tsx` | Pass |
| **UNIT-01** | Unit | AC-12, BR-15 | Day-over-day trend delta calculation helper unit test | Computes correct $\pm N$ deltas relative to 00:00:00 UTC (07:00:00 ICT) baseline | `server/tests/lab-04/staff-dashboard.api.test.ts` | Pass |
| **UNIT-02** | Unit | AC-03, BR-05 | Conditional follow-up note validation and sanitization unit test | Validates 3-1000 chars when true, coerces to null when false | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |
| **STYLE-01** | UI style | DoD-01, AC-12 | Zen Green tokens and badge color contrast verification | Status and priority badges match designated Zen Green palette and contrast ratios | `client/tests/lab-04/StaffDashboard.test.tsx` | Pass |
| **RESP-01** | Responsive | DoD-03, AC-12 | Responsive layout verification across desktop, tablet, and mobile viewports | Dashboard cards stack responsively; touch targets measure $\ge 44\text{ px}$; zero horizontal scroll | `e2e/lab-04/dashboards.spec.ts` | Pass |
| **E2E-01** | E2E | AC-01, AC-08, AC-14 | IT Staff workflow: open an unassigned NEW ticket from the queue $\rightarrow$ assign to self $\rightarrow$ NEW $\rightarrow$ OPEN $\rightarrow$ IN_PROGRESS $\rightarrow$ record Action Taken with attachment notes $\rightarrow$ RESOLVED with summary $\rightarrow$ CLOSED | Each step succeeds; only permitted options shown; requester API returns CLOSED + summary | `e2e/lab-04/actions-taken-flow.spec.ts` | Pass |
| **E2E-02** | E2E | AC-03, BR-05, BR-06 | Actions Taken follow-up validation (Handout Example): short description rejected; follow-up checked with empty / 2-char note blocked inline (`aria-invalid`, error below field) with zero POSTs; valid note saves once | `[ Follow-Up Required ]` badge and note shown; exactly 1 POST | `e2e/lab-04/actions-taken-flow.spec.ts` | Pass |
| **E2E-03** | E2E | AC-08, AC-09, AC-10, AC-11 | Part A: Resolution Gate blocks a 0-action ticket (UI alert + disabled confirm; API bypass returns 422); summary $\ge 5$ chars after recording an action. Part B: Requester "Mark as Resolved" is advisory (banner for staff, status unchanged, staff status API 403 for requester). Part C: stale `expectedUpdatedAt` raises the Stale Record dialog; "Keep My Drafts & Refresh" keeps the draft comment and loads the new priority | Verified on desktop, tablet, and mobile | `e2e/lab-04/ticket-resolution.spec.ts` | Pass |
| **E2E-04** | E2E | AC-02, AC-12, AC-13, BR-13, BR-14 | Role dashboards: requester, staff, and admin KPI cards equal the API **and a direct Prisma count**; card counts equal drill-down list totals; drill-down URLs and filters; recent-ticket rows open Ticket Detail; Quick Actions; ownership protection (403 / route redirect); keyboard focus ring and Enter activation | All dashboards accurate and navigable on every viewport | `e2e/lab-04/dashboards.spec.ts` | Pass |
| **E2E-05** | E2E | AC-05, BR-02, BR-08 | Two IT Staff record actions on one ticket out of order; list is chronological with each performer shown; Edit $\rightarrow$ Cancel sends no PATCH; Edit $\rightarrow$ Save Changes persists and keeps the original performer; order survives reload | Stable ordering, correct attribution | `e2e/lab-04/actions-taken-flow.spec.ts` | Pass |
| **E2E-06** | E2E | AC-06, AC-07, BR-07, BR-13 | Requester views the owned ticket's Actions Taken read-only (no Record/Edit, no Internal Notes); API POST/PATCH 403; another requester's ticket returns 404 | Read-only transparency, backend-enforced | `e2e/lab-04/actions-taken-flow.spec.ts` | Pass |
| **E2E-07** | E2E | AC-04, BR-04 | Inactive IT Staff absent from the owner dropdown; assignment API returns 422; inactive login returns 403 | Inactive assignee/performer rejected | `e2e/lab-04/actions-taken-flow.spec.ts` | Pass |
| **E2E-08** | E2E | AC-16, BR-17, BR-18 | Action form: HTTP 500 shows an alert and keeps every field; slow save shows disabled "Saving Action..." with spinner; repeated clicks send one POST | Inputs retained; single record created | `e2e/lab-04/actions-taken-flow.spec.ts` | Pass |
| **E2E-09** | E2E | AC-14, BR-11 | Status control options for all 8 statuses match ui-spec 8.1 (CANCELLED disabled); API rejects NEW $\rightarrow$ CLOSED with 422 | Only permitted transitions offered and accepted | `e2e/lab-04/ticket-resolution.spec.ts` | Pass |
| **E2E-10** | E2E | AC-14 | Cancel modal (terminal warning, control disabled afterwards), Reopen modal with rationale, Close modal pre-filled with the resolution summary | Each modal completes its transition | `e2e/lab-04/ticket-resolution.spec.ts` | Pass |
| **E2E-11** | E2E | BR-07, BR-13 | Append-only history: posting a comment / internal note appends (count +1) with no Edit/Delete/Remove controls on history; requester sees the comment but not the internal note; requester notes API 403 | Append-only, role-appropriate visibility | `e2e/lab-04/ticket-resolution.spec.ts` | Pass |
| **E2E-12** | E2E | AC-12, FR-18 | "My Actions Recorded" increases by exactly 1 after the current user records an action (another staff member's action is not counted) and Refresh | Current-user Actions Taken metric accurate | `e2e/lab-04/dashboards.spec.ts` | Pass |
| **E2E-13** | E2E | AC-02, AC-12 | Dashboard loading spinner, empty state (zero cards + empty message), forbidden (403 message), safe failure (500 / network error alert) with Retry recovery, for staff and requester | Every state renders clear, non-technical feedback | `e2e/lab-04/dashboards.spec.ts` | Pass |
| **HARD-01** | E2E | AC-16, BR-17, BR-18 | Staff public comment and internal note: HTTP 500 keeps the text; retry shows a disabled button with spinner; one record appended | Inputs retained; no duplicates | `e2e/lab-04/hardening.spec.ts` | Pass |
| **HARD-02** | E2E | AC-09, BR-17, BR-18 | Resolution modal: HTTP 500 keeps the summary and shows the error in the dialog; retry locks "Confirm" with spinner | Summary retained; one successful transition | `e2e/lab-04/hardening.spec.ts` | Pass |
| **HARD-03** | E2E | AC-10, BR-17 | Requester comment keeps text on failure; advisory-resolve dialog (`aria-modal`) shows the error and does not flip the banner | Safe failure on requester screens | `e2e/lab-04/hardening.spec.ts` | Pass |
| **HARD-04** | A11y / Style | DoD-01, DoD-03 | Read-only metadata `#F3F6F4` vs white editable controls; dialogs expose role, accessible name, and `aria-modal`; Zen Green focus ring on controls; 44px mobile touch targets | Visual distinction and accessible modals | `e2e/lab-04/hardening.spec.ts` | Pass |
| **HARD-05** | Regression | FR-24, DoD-03 | Every major Requester, IT Staff, and Admin screen (dashboards, My Tickets, Create Ticket, Ticket Detail, Queue, Staff Detail tabs, User Management) renders with zero console errors, no placeholder text (`TODO`, `undefined`, `NaN`, lorem ipsum), and zero horizontal overflow | Clean, polished screens on all viewports | `e2e/lab-04/hardening.spec.ts` | Pass |
| **HARD-06** | E2E / UI | FR-24, DoD-03 | Unknown URL (e.g. `/hehehe`) shows a "Page not found" view instead of My Tickets; "Go to home" returns to the role's home view; route parser maps unknown paths to `not-found` (Issue #58) | Not Found view; no silent redirect | `e2e/lab-04/hardening.spec.ts`<br>`client/tests/lab-04/RouteFallback.test.tsx` | Pass |
| **HARD-07** | E2E | FR-16, FR-19 | Dashboard recent-ticket rows: clicking anywhere on the row opens the ticket (staff and requester); pointer cursor; Enter on the row link still works (Issue #58) | Whole row is clickable; keyboard unchanged | `e2e/lab-04/hardening.spec.ts` | Pass |
| **HARD-08** | Style | DoD-01 | Record/Edit Action Taken form: green border `#0B7A46` with 8px outer radius and 7px header radius, so the header no longer covers the border at the top corners (Issue #58) | Even border on all corners and viewports | `e2e/lab-04/hardening.spec.ts` | Pass |
| **REG-E2E** | Regression | FR-24, AC-15 | All Lab 2 and Lab 3 Playwright suites (requester ticket flow, authentication, first login, staff ticket flow, user administration, visual screenshots) | 100% pass against the Lab 4 schema | `e2e/lab-02/*.spec.ts`, `e2e/lab-03/*.spec.ts` | Pass |
---

## 3. Acceptance-Criterion Traceability Matrix

| Acceptance Criterion | Planned Automated Test IDs | Automated Test Files |
|---|---|---|
| **AC-01** (Create Valid Actions Taken) | `API-01`, `API-02`, `API-03`, `UI-06`, `E2E-01` | `server/tests/lab-04/actions-taken.api.test.ts`<br>`client/tests/lab-04/ActionsTaken.test.tsx`<br>`e2e/lab-04/actions-taken-flow.spec.ts` |
| **AC-02** (Requester Dashboard Data Isolation) | `API-17`, `API-18`, `UI-04`, `UI-05`, `E2E-04`, `E2E-13` | `server/tests/lab-04/requester-dashboard.api.test.ts`<br>`client/tests/lab-04/RequesterDashboard.test.tsx`<br>`e2e/lab-04/dashboards.spec.ts` |
| **AC-03** (Follow-Up Note Validation Gate) | `API-04`, `API-05`, `UNIT-02`, `UI-07`, `E2E-02` | `server/tests/lab-04/actions-taken.api.test.ts`<br>`client/tests/lab-04/ActionsTaken.test.tsx`<br>`e2e/lab-04/actions-taken-flow.spec.ts` |
| **AC-04** (Inactive Performer Rejection) | `API-06`, `E2E-07` | `server/tests/lab-04/actions-taken.api.test.ts`<br>`e2e/lab-04/actions-taken-flow.spec.ts` |
| **AC-05** (Action Taken Update) | `API-07`, `E2E-05` | `server/tests/lab-04/actions-taken.api.test.ts`<br>`e2e/lab-04/actions-taken-flow.spec.ts` |
| **AC-06** (Requester Read-Only View of Actions) | `API-08`, `API-10`, `UI-08`, `E2E-06` | `server/tests/lab-04/actions-taken.api.test.ts`<br>`client/tests/lab-04/ActionsTaken.test.tsx`<br>`e2e/lab-04/actions-taken-flow.spec.ts` |
| **AC-07** (Requester Action Creation Forbidden) | `API-09`, `E2E-06` | `server/tests/lab-04/actions-taken.api.test.ts`<br>`e2e/lab-04/actions-taken-flow.spec.ts` |
| **AC-08** (Resolution Gate Enforcement - 0 Actions) | `API-11`, `API-13`, `UI-09`, `E2E-01`, `E2E-03` | `server/tests/lab-04/ticket-workflow.api.test.ts`<br>`client/tests/lab-04/TicketWorkflow.test.tsx`<br>`e2e/lab-04/actions-taken-flow.spec.ts`<br>`e2e/lab-04/ticket-resolution.spec.ts` |
| **AC-09** (Resolution Gate Enforcement - Summary) | `API-12`, `API-13`, `UI-10`, `E2E-03`, `HARD-02` | `server/tests/lab-04/ticket-workflow.api.test.ts`<br>`client/tests/lab-04/TicketWorkflow.test.tsx`<br>`e2e/lab-04/ticket-resolution.spec.ts`<br>`e2e/lab-04/hardening.spec.ts` |
| **AC-10** (Advisory Requester Resolution) | `API-14`, `E2E-03`, `HARD-03` | `server/tests/lab-04/ticket-workflow.api.test.ts`<br>`e2e/lab-04/ticket-resolution.spec.ts`<br>`e2e/lab-04/hardening.spec.ts` |
| **AC-11** (Optimistic Concurrency Conflict Detection) | `API-15`, `UI-11`, `E2E-03` | `server/tests/lab-04/ticket-workflow.api.test.ts`<br>`client/tests/lab-04/TicketWorkflow.test.tsx`<br>`e2e/lab-04/ticket-resolution.spec.ts` |
| **AC-12** (IT Staff Dashboard Metrics & Drill-Down) | `API-19`, `API-20`, `API-24`, `UNIT-01`, `STYLE-01`, `RESP-01`, `UI-01`, `UI-02`, `E2E-04`, `E2E-12`, `E2E-13` | `server/tests/lab-04/staff-dashboard.api.test.ts`<br>`client/tests/lab-04/StaffDashboard.test.tsx`<br>`e2e/lab-04/dashboards.spec.ts` |
| **AC-13** (Admin Dashboard User Governance Summary) | `API-21`, `E2E-04` | `server/tests/lab-04/staff-dashboard.api.test.ts`<br>`e2e/lab-04/dashboards.spec.ts` |
| **AC-14** (Complete Permitted Status Lifecycle) | `API-16`, `E2E-01`, `E2E-09`, `E2E-10` | `server/tests/lab-04/ticket-workflow.api.test.ts`<br>`e2e/lab-04/actions-taken-flow.spec.ts`<br>`e2e/lab-04/ticket-resolution.spec.ts` |
| **AC-15** (Legacy Ticket Backwards Compatibility) | `API-22`, `API-23`, `REG-E2E` | `server/tests/lab-04/ticket-workflow.api.test.ts`<br>`e2e/lab-02/*.spec.ts`, `e2e/lab-03/*.spec.ts` |
| **AC-16** (Form State Retention & Double-Click Guard)| `UI-12`, `E2E-08`, `HARD-01`, `HARD-02`, `HARD-03` | `client/tests/lab-04/ActionsTaken.test.tsx`<br>`e2e/lab-04/actions-taken-flow.spec.ts`<br>`e2e/lab-04/hardening.spec.ts` |

*Note on Part 6 Rubric Traceability Alignment:*
In accordance with Handout Section 14 (Part 6), the test suite demonstrates the full Ticket Detail lifecycle:
- Ticket Assignment & Inactive-Assignee Rejection: Verified via `staff-ticket-detail.api.test.ts` (`API-14`, `API-15`) and `StaffTicketDetail.test.tsx`.
- Ticket Status Transition, Completion (Resolution Gate), and Cancellation: Verified via `ticket-workflow.api.test.ts` (`API-11`, `API-13`, `API-16`), `TicketWorkflow.test.tsx`, and `ticket-resolution.spec.ts`.
- Actions Taken List, Create, Edit, Validation, and Execution States: Verified via `actions-taken.api.test.ts` (`API-01` through `API-10`), `ActionsTaken.test.tsx` (`UI-06`, `UI-07`, `UI-08`), and `actions-taken-flow.spec.ts`.

---

## 4. Responsive and Visual Design Checklist

- [x] **Desktop Viewport ($\ge 992\text{ px}$):**
  - Application header displays brand mark, role-specific navigation ("Dashboard", "My Queue" / "My Tickets"), and profile menu.
  - IT Staff Dashboard displays 5-column metric card grid, side-by-side recent tickets and quick actions.
  - Ticket Detail displays metadata panel, full-width Actions Taken table/cards, discussion thread, and internal notes.
- [x] **Tablet Viewport ($768\text{ px} - 991\text{ px}$):**
  - Dashboards wrap metric cards cleanly into balanced multi-row grids.
  - Quick action buttons remain easily tap-accessible with distinct icons.
  - Form dialogs resize to fit viewport without horizontal scrolling.
- [x] **Mobile Viewport ($< 768\text{ px}$):**
  - Zero horizontal overflow (`overflow-x: hidden`).
  - Metric cards stack in 2-column or 1-column layouts.
  - Actions Taken items render as stacked cards with visible badges.
  - Interactive touch targets measure at least 44px in height.
- [x] **Zen Green Style & Accessibility Compliance:**
  - Strict compliance with Zen Green tokens: `#006B3C`, `#0B7A46`, `#EAF6EF`, `#F5F7F6`.
  - Contrast ratios exceed WCAG AA ($\ge 4.5:1$).
  - Visible focus rings (`rgba(11, 122, 70, 0.2)`) on all interactive inputs and buttons.
  - Semantic heading hierarchy (`h1`, `h2`, `h3`) and `aria-labels` on all icon controls.

---

## 5. Test Execution Commands

```bash
# Database (once): start PostgreSQL, apply migrations, seed
docker compose up -d
cd server && npx prisma migrate deploy && npm run prisma:seed

# Backend unit, API, and regression suites (Lab 1-4)
cd server && npm test

# Frontend component suites (Lab 1-4)
cd client && npm test

# End-to-end suites (Lab 2-4) on desktop, tablet, and mobile projects; writes evidence screenshots
npm run test:e2e

# Only the Lab 4 end-to-end suites
npx playwright test e2e/lab-04

# Type checks (zero errors required)
cd server && npx tsc --noEmit
cd client && npx tsc --noEmit
```

If the API is not on port 3000, export `E2E_API_URL` (for example `http://localhost:3001`) and start the client with a matching `VITE_API_URL`. Every Lab 4 E2E test re-seeds the database first, so the suites can be repeated.

---

## 6. Handout Section 14 Evidence Map (Parts 5-9)

Each item the handout asks to be demonstrated maps to an automated test and, where visual, to a screenshot in `artifacts/lab-04/screenshots/<folder>/<name>-<desktop|tablet|mobile>.png`.

### Part 5 - Working IT Staff Dashboard UI
| Required evidence | Test | Screenshot |
|---|---|---|
| Approved operational metrics with trend badges | `E2E-04` (AC-12) | `staff-dashboard/01-staff-dashboard` |
| Current-user Actions Taken (`My Actions Recorded`) | `E2E-04`, `E2E-12` | `staff-dashboard/01-staff-dashboard` |
| Recent or urgent tickets (urgent pinned first, rows open detail) | `E2E-04` | `staff-dashboard/01-staff-dashboard` |
| Accurate counts; metrics match database queries | `E2E-04` (UI = API = direct Prisma `count`; card = queue total) | - |
| Drill-down behavior (`status=NEW`, `owner=me`, `owner=unassigned`, detail) | `E2E-04`, `UI-02` | - |
| Loading, empty, forbidden, safe-failure (+ Retry) | `E2E-13` | `staff-dashboard/02-loading`, `03-empty`, `05-forbidden`, `04-safe-failure` |
| Responsive behavior | `E2E-04` on desktop/tablet/mobile, `RESP-01` | all `staff-dashboard/*` per viewport |

### Part 6 - Working Actions Taken UI
| Required evidence | Test | Screenshot |
|---|---|---|
| List | `E2E-01`, `E2E-05` | `actions-taken/01-list-mode` |
| Create | `E2E-01` | `actions-taken/02-create-mode` |
| Assign (ticket owner) | `E2E-01` | - |
| Edit (save and cancel) | `E2E-05` | `actions-taken/06-edit-mode` |
| Status transition, complete (resolve/close), cancel | `E2E-01`, `E2E-10` | `ticket-workflow/02-resolution-modal-summary`, `06-cancel-modal`, `08-closure-modal` |
| Validation (description, follow-up note) | `E2E-02` | `actions-taken/03-follow-up-validation`, `04-follow-up-required-card` |
| Inactive-assignee rejection | `E2E-07` | - |
| Role restrictions (requester read-only, 403/404) | `E2E-06` | `actions-taken/07-requester-read-only` |
| Safe failures (input retained, single submit) | `E2E-08` | `actions-taken/08-safe-failure-retained-input` |
| Different Actions Taken on one ticket (different performers) | `E2E-05`, `E2E-06` | `actions-taken/05-multiple-performers` |
| Responsive behavior | all of the above on desktop/tablet/mobile | all `actions-taken/*` per viewport |

### Part 7 - Working Ticket Workflow
| Required evidence | Test | Screenshot |
|---|---|---|
| Permitted transitions only (all 8 statuses) | `E2E-09`, `E2E-01` | - |
| Resolution Gate | `E2E-03` Part A | `ticket-workflow/01-resolution-gate-blocked`, `02-resolution-modal-summary` |
| Advisory requester resolution | `E2E-03` Part B | `ticket-workflow/03-requester-advisory-resolved`, `04-staff-advisory-banner` |
| Concurrency conflict handling | `E2E-03` Part C | `ticket-workflow/05-concurrency-conflict-dialog` |
| Stable ordering | `E2E-05` | `actions-taken/05-multiple-performers` |
| Append-only behavior | `E2E-11` | - |
| Role-appropriate visibility | `E2E-06`, `E2E-11` | `actions-taken/07-requester-read-only` |

### Part 8 - Requester Dashboard and Final Regression
| Required evidence | Test | Screenshot |
|---|---|---|
| Requester-owned metrics (match database) | `E2E-04` (AC-02) | `requester-dashboard/01-requester-dashboard` |
| Recent and attention-required tickets | `E2E-04` | `requester-dashboard/01-requester-dashboard` |
| Drill-down | `E2E-04` | - |
| Ownership protection | `E2E-04`, `E2E-06` | - |
| Empty and safe-failure states | `E2E-13` | `requester-dashboard/02-empty`, `03-safe-failure` |
| Regression: authentication, My Tickets, Ticket Detail, Attachments, Public Comments, IT Staff functions, Internal Notes, Administrator user management | `REG-E2E`, `HARD-05`, `API-23`, all Lab 2/3 server and client suites | `artifacts/lab-02/`, `artifacts/lab-03/` |

### Part 9 - Zen Green UI, Responsive, Accessibility, Final Polish
| Checklist item | Test |
|---|---|
| Design consistency / Zen Green tokens | `STYLE-01`, `HARD-04` |
| Dashboards | `E2E-04`, `E2E-13` |
| Actions Taken | `E2E-01`, `E2E-02`, `E2E-05` |
| Editable vs read-only fields | `HARD-04` |
| Validation placement (inline, below field, `aria-invalid`) | `E2E-02` |
| Keyboard focus (visible ring, Enter activates) | `E2E-04`, `HARD-04` |
| Clipping / overlap / 44px touch targets | `expectMobileTouchTargets` in `E2E-01`, `E2E-04`, `E2E-05`, `HARD-04` (mobile project) |
| Horizontal overflow | `expectNoHorizontalOverflow` in every Lab 4 E2E test, `HARD-05` |
| Accessible modal dialogs (role, name, `aria-modal`) | `E2E-03`, `E2E-10`, `HARD-03`, `HARD-04` |
| No console errors or placeholder text | `HARD-05` |

---

## 7. Evidence Screenshot Inventory

Generated by `npm run test:e2e` into `artifacts/lab-04/screenshots/`, one image per viewport (`-desktop`, `-tablet`, `-mobile`):

| Folder | Screens |
|---|---|
| `staff-dashboard/` | `01-staff-dashboard`, `02-loading`, `03-empty`, `04-safe-failure`, `05-forbidden` |
| `requester-dashboard/` | `01-requester-dashboard`, `02-empty`, `03-safe-failure` |
| `admin-dashboard/` | `01-admin-dashboard` |
| `actions-taken/` | `01-list-mode`, `02-create-mode`, `03-follow-up-validation`, `04-follow-up-required-card`, `05-multiple-performers`, `06-edit-mode`, `07-requester-read-only`, `08-safe-failure-retained-input`, `09-requester-ticket-detail` |
| `ticket-workflow/` | `01-resolution-gate-blocked`, `02-resolution-modal-summary`, `03-requester-advisory-resolved`, `04-staff-advisory-banner`, `05-concurrency-conflict-dialog`, `06-cancel-modal`, `07-reopen-modal`, `08-closure-modal`, `09-modal-safe-failure` |

---

## 8. Defects Found and Fixed During Final Hardening (Issue #48)

| Defect | Fix |
|---|---|
| Mobile touch targets below 44px on Ticket Detail (status/owner/priority selects, Actions Taken Save/Cancel/Edit, header profile button) | Global mobile rule in `client/index.html`: buttons, inputs, and selects are at least 44px tall below 768px |
| Bootstrap blue focus ring on inputs and selects instead of the Zen Green ring (ui-spec 10) | Higher-specificity Zen Green focus ring in `client/index.html` |
| Staff Post Comment, Save Internal Note, and status-modal Confirm buttons locked without a busy spinner (BR-18) | Spinner added while submitting (`StaffDetailScreen.tsx`); requester Confirm resolution likewise (`RequesterDetailScreen.tsx`) |
| Status, Stale Record, and requester resolve dialogs had no accessible name; requester dialog lacked `aria-modal` | `aria-labelledby` on all three; `aria-modal="true"` on the requester dialog |
| Follow-up note error not linked to its field | `aria-invalid` and `aria-describedby="followUpNote-error"` on the textarea (`ActionTakenForm.tsx`) |
| Re-seeding left `isRequesterResolved` set from earlier demos, so the advisory prompt never reappeared | Seed resets `isRequesterResolved = false` on the demo tickets |
| E2E suites hard-coded `http://localhost:3000` | `E2E_API_URL` override in `e2e/lab-03/first-login.spec.ts` and the Lab 4 suites |
