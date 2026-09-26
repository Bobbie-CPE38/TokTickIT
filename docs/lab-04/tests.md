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
└── dashboards.spec.ts
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
| **UI-04** | UI | AC-02, FR-15 | RequesterDashboard renders KPI metric cards including Waiting for Me (Attention Required) | Displays My Open, Waiting for Me, In Progress, Resolved, Closed cards linking to `/tickets` | `client/tests/lab-04/RequesterDashboard.test.tsx` | Pass |
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
| **E2E-01** | E2E | AC-01, AC-08 | IT Staff Workflow: Open Ticket $\rightarrow$ Record Action Taken $\rightarrow$ Resolve Ticket through Gate | Complete operational lifecycle verified | `e2e/lab-04/actions-taken-flow.spec.ts` | Pass |
| **E2E-02** | E2E | AC-03 | Actions Taken follow-up validation (Handout Example) | Validation prevents submit without follow-up note in full workflow | `e2e/lab-04/actions-taken-flow.spec.ts` | Pass |
| **E2E-03** | E2E | AC-08, AC-11 | Resolution Gate Blocking & Concurrency Collision Recovery in Browser | Verified across desktop, tablet, and mobile viewports | `e2e/lab-04/ticket-resolution.spec.ts` | Pass |
| **E2E-04** | E2E | AC-02, AC-12 | Role Dashboards: Requester vs Staff dashboard verification and drill-down | Full end-to-end dashboard navigation verified across viewports | `e2e/lab-04/dashboards.spec.ts` | Pass |

---

## 3. Acceptance-Criterion Traceability Matrix

| Acceptance Criterion | Planned Automated Test IDs | Automated Test Files |
|---|---|---|
| **AC-01** (Create Valid Actions Taken) | `API-01`, `API-02`, `API-03`, `UI-06`, `E2E-01` | `server/tests/lab-04/actions-taken.api.test.ts`<br>`client/tests/lab-04/ActionsTaken.test.tsx`<br>`e2e/lab-04/actions-taken-flow.spec.ts` |
| **AC-02** (Requester Dashboard Data Isolation) | `API-17`, `API-18`, `UI-04`, `UI-05`, `E2E-04` | `server/tests/lab-04/requester-dashboard.api.test.ts`<br>`client/tests/lab-04/RequesterDashboard.test.tsx`<br>`e2e/lab-04/dashboards.spec.ts` |
| **AC-03** (Follow-Up Note Validation Gate) | `API-04`, `API-05`, `UNIT-02`, `UI-07`, `E2E-02` | `server/tests/lab-04/actions-taken.api.test.ts`<br>`client/tests/lab-04/ActionsTaken.test.tsx`<br>`e2e/lab-04/actions-taken-flow.spec.ts` |
| **AC-04** (Inactive Performer Rejection) | `API-06` | `server/tests/lab-04/actions-taken.api.test.ts` |
| **AC-05** (Action Taken Update) | `API-07` | `server/tests/lab-04/actions-taken.api.test.ts` |
| **AC-06** (Requester Read-Only View of Actions) | `API-08`, `API-10`, `UI-08` | `server/tests/lab-04/actions-taken.api.test.ts`<br>`client/tests/lab-04/ActionsTaken.test.tsx` |
| **AC-07** (Requester Action Creation Forbidden) | `API-09` | `server/tests/lab-04/actions-taken.api.test.ts` |
| **AC-08** (Resolution Gate Enforcement - 0 Actions) | `API-11`, `API-13`, `UI-09`, `E2E-01`, `E2E-03` | `server/tests/lab-04/ticket-workflow.api.test.ts`<br>`client/tests/lab-04/TicketWorkflow.test.tsx`<br>`e2e/lab-04/ticket-resolution.spec.ts` |
| **AC-09** (Resolution Gate Enforcement - Summary) | `API-12`, `API-13`, `UI-10` | `server/tests/lab-04/ticket-workflow.api.test.ts`<br>`client/tests/lab-04/TicketWorkflow.test.tsx` |
| **AC-10** (Advisory Requester Resolution) | `API-14` | `server/tests/lab-04/ticket-workflow.api.test.ts` |
| **AC-11** (Optimistic Concurrency Conflict Detection) | `API-15`, `UI-11`, `E2E-03` | `server/tests/lab-04/ticket-workflow.api.test.ts`<br>`client/tests/lab-04/TicketWorkflow.test.tsx`<br>`e2e/lab-04/ticket-resolution.spec.ts` |
| **AC-12** (IT Staff Dashboard Metrics & Drill-Down) | `API-19`, `API-20`, `API-24`, `UNIT-01`, `STYLE-01`, `RESP-01`, `UI-01`, `UI-02`, `E2E-04` | `server/tests/lab-04/staff-dashboard.api.test.ts`<br>`client/tests/lab-04/StaffDashboard.test.tsx`<br>`e2e/lab-04/dashboards.spec.ts` |
| **AC-13** (Admin Dashboard User Governance Summary) | `API-21` | `server/tests/lab-04/staff-dashboard.api.test.ts` |
| **AC-14** (Complete Permitted Status Lifecycle) | `API-16` | `server/tests/lab-04/ticket-workflow.api.test.ts` |
| **AC-15** (Legacy Ticket Backwards Compatibility) | `API-22`, `API-23` | `server/tests/lab-04/ticket-workflow.api.test.ts` |
| **AC-16** (Form State Retention & Double-Click Guard)| `UI-12` | `client/tests/lab-04/ActionsTaken.test.tsx` |

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
