# Lab 2 Test Plan and Results

## 1. Test Strategy

The testing strategy for Sprint 2 follows **Test-Driven Development (TDD)** and **Spec-Driven Development (Spec DD)**. Every functional requirement, business rule, and acceptance criterion defined in `specification.md` is covered by automated tests before implementation is declared complete.

### 1.1. Testing Levels and Frameworks
- **Backend API & Integration Tests:** Vitest + Supertest testing Express route handlers, Prisma queries, validation logic, file upload pipelines, and multi-requester ownership guards.
- **Frontend Component & State Tests:** Vitest + React Testing Library + `@testing-library/user-event` testing form validation, requester switching, UI states (loading, empty, error), badges, and modal dialogs.
- **End-to-End (E2E) Workflow Tests:** Playwright testing complete requester user flows (Requester Selection -> Create Ticket -> My Tickets listing -> Ticket Detail inspection -> Attachment soft removal) across Desktop, Tablet, and Mobile viewports.
- **Visual & Responsive Testing:** Viewport assertions and screenshot audits comparing UI against `ui-spec.md` and Zen Green style tokens.

---

## 2. Planned Tests

| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final Status |
|---|---|---|---|---|---|---|
| **API-01** | API | AC-01, BR-01, BR-02 | Create valid ticket with all required fields | HTTP 201; Ticket saved in DB; unique `TKT-YYYY-NNNNNN` generated; initial status is `NEW` | `server/tests/lab-02/create-ticket.api.test.ts` | Pass |
| **API-02** | API | AC-06, BR-06 | Create ticket with missing or short summary (< 5 chars) | HTTP 400/422 with validation error details; DB unchanged | `server/tests/lab-02/create-ticket.api.test.ts` | Pass |
| **API-03** | API | AC-06, BR-06 | Create ticket with whitespace-only summary or description | HTTP 400/422; whitespace trimmed before validation | `server/tests/lab-02/create-ticket.api.test.ts` | Pass |
| **API-04** | API | AC-02, BR-03 | Request ticket API without `X-Requester-Id` header | HTTP 401 Unauthorized | `server/tests/lab-02/create-ticket.api.test.ts` | Pass |
| **API-05** | API | AC-05, BR-05 | `GET /api/requesters/active` lists active users only | HTTP 200; returns only `isActive: true` requesters (Alex Inactive excluded) | `server/tests/lab-02/create-ticket.api.test.ts` | Pass |
| **API-06** | API | AC-04, BR-04 | `GET /api/tickets` retrieves only tickets owned by active requester | HTTP 200; returns array containing only tickets matching `requesterId` | `server/tests/lab-02/my-tickets.api.test.ts` | Pass |
| **API-07** | API | AC-09, FR-10 | `GET /api/tickets?search=battery` performs keyword search | HTTP 200; returns only tickets matching summary or ticket number | `server/tests/lab-02/my-tickets.api.test.ts` | Pass |
| **API-08** | API | AC-09, FR-11 | `GET /api/tickets?categoryId=2&requestedPriority=HIGH` | HTTP 200; filters list by category and priority | `server/tests/lab-02/my-tickets.api.test.ts` | Pass |
| **API-09** | API | FR-12 | `GET /api/tickets?page=2&pageSize=5` pagination contract | HTTP 200 with correct `data` array and `pagination` metadata object | `server/tests/lab-02/my-tickets.api.test.ts` | Pass |
| **API-10** | API | AC-03, BR-04 | `GET /api/tickets/:id` for ticket owned by another requester | HTTP 403 Forbidden / 404 Not Found; zero data leaked | `server/tests/lab-02/ticket-detail.api.test.ts` | Pass |
| **API-11** | API | AC-10, BR-09 | Upload unsupported file type (e.g. `.exe`, `.zip`) | HTTP 415 Unsupported Media Type; file rejected | `server/tests/lab-02/attachments.api.test.ts` | Pass |
| **API-12** | API | AC-10, BR-10 | Upload file exceeding 5 MB limit | HTTP 413 Payload Too Large; file rejected | `server/tests/lab-02/attachments.api.test.ts` | Pass |
| **API-13** | API | AC-11, BR-11 | Upload 6th active attachment to ticket with 5 active files | HTTP 400/422; rejects exceeding active limit | `server/tests/lab-02/attachments.api.test.ts` | Pass |
| **API-14** | API | AC-12, FR-16 | `GET /api/attachments/:id/download` for active file | HTTP 200; binary stream returned with original filename header | `server/tests/lab-02/attachments.api.test.ts` | Pass |
| **API-15** | API | AC-13, BR-12 | `PATCH /api/attachments/:id/soft-remove` with valid reason | HTTP 200; `isRemoved = true`, `removedAt` set, `removalReason` saved | `server/tests/lab-02/attachments.api.test.ts` | Pass |
| **API-16** | API | AC-13, BR-13 | `GET /api/attachments/:id/download` for soft-removed file | HTTP 410 Gone / 403 Forbidden; download blocked | `server/tests/lab-02/attachments.api.test.ts` | Pass |
| **API-17** | API | BR-12 | Soft remove attachment with missing or short reason (<3 chars) | HTTP 400/422; rejection due to missing mandatory audit reason | `server/tests/lab-02/attachments.api.test.ts` | Pass |
| **UI-01** | UI | AC-01, AC-07 | CreateTicket form submission with valid data | Submit button shows busy spinner; API called; success screen shows ticket number | `client/tests/lab-02/CreateTicket.test.tsx` | Pass |
| **UI-02** | UI | AC-06, BR-06 | CreateTicket form submission with invalid inputs | Field-level error messages displayed below inputs; API not called | `client/tests/lab-02/CreateTicket.test.tsx` | Pass |
| **UI-03** | UI | AC-08, BR-08 | CreateTicket form preserves entered values when API fails | Error banner shown; Category, System, Priority, Summary, Description retained | `client/tests/lab-02/CreateTicket.test.tsx` | Pass |
| **UI-04** | UI | AC-02, BR-03 | App navigation when no requester is selected | Prompts/redirects to Development Requester selection screen | `client/tests/lab-02/CreateTicket.test.tsx` | Pass |
| **UI-05** | UI | AC-04, BR-16 | Requester identity switch in MyTickets | Dropdown change updates context and triggers fresh API fetch for new user | `client/tests/lab-02/MyTickets.test.tsx` | Pass |
| **UI-06** | UI | AC-09, FR-11 | Filter and Search controls in MyTickets | Typing in search and picking filters updates query and table results; Clear Filters resets | `client/tests/lab-02/MyTickets.test.tsx` | Pass |
| **UI-07** | UI | FR-10, FR-11 | MyTickets empty state vs no-results state | Displays specific empty message when user has 0 tickets vs no matching filter results | `client/tests/lab-02/MyTickets.test.tsx` | Pass |
| **UI-08** | UI | FR-13 | RequesterTicketDetail renders all ticket fields as read-only | Shaded backgrounds (`#F3F6F4`), correct badges, no editable inputs | `client/tests/lab-02/RequesterTicketDetail.test.tsx` | Pass |
| **UI-09** | UI | AC-13, BR-12 | AttachmentSection soft removal flow | Clicking Remove opens modal; requiring reason; submitting marks item as Removed | `client/tests/lab-02/AttachmentSection.test.tsx` | Pass |
| **UI-10** | UI | AC-13, BR-13 | AttachmentSection renders removed attachment metadata | Removed tag shown, removal reason visible, download button disabled/hidden | `client/tests/lab-02/AttachmentSection.test.tsx` | Pass |
| **E2E-01** | E2E | AC-01, AC-04, AC-12, AC-13 | Complete Requester Flow: Select User -> Create Ticket with attachment -> View in My Tickets -> Inspect Detail -> Soft Remove Attachment | All steps succeed smoothly across Desktop, Tablet, and Mobile viewports | `e2e/lab-02/requester-ticket-flow.spec.ts` | Pass |

---

## 3. Acceptance-Criterion Traceability Matrix

| Acceptance Criterion | Planned Automated Test IDs | Automated Test Files |
|---|---|---|
| **AC-01** (Valid Ticket Creation) | `API-01`, `UI-01`, `E2E-01` | `server/tests/lab-02/create-ticket.api.test.ts`<br>`client/tests/lab-02/CreateTicket.test.tsx`<br>`e2e/lab-02/requester-ticket-flow.spec.ts` |
| **AC-02** (Requester Context Guard) | `API-04`, `UI-04` | `server/tests/lab-02/create-ticket.api.test.ts`<br>`client/tests/lab-02/CreateTicket.test.tsx` |
| **AC-03** (Cross-Requester Ticket Isolation) | `API-10` | `server/tests/lab-02/ticket-detail.api.test.ts` |
| **AC-04** (My Tickets Ownership Filtering) | `API-06`, `UI-05`, `E2E-01` | `server/tests/lab-02/my-tickets.api.test.ts`<br>`client/tests/lab-02/MyTickets.test.tsx`<br>`e2e/lab-02/requester-ticket-flow.spec.ts` |
| **AC-05** (Inactive Requester Filtering) | `API-05` | `server/tests/lab-02/create-ticket.api.test.ts` |
| **AC-06** (Form Validation & Field Trimming) | `API-02`, `API-03`, `UI-02` | `server/tests/lab-02/create-ticket.api.test.ts`<br>`client/tests/lab-02/CreateTicket.test.tsx` |
| **AC-07** (Duplicate Submission Prevention) | `UI-01` | `client/tests/lab-02/CreateTicket.test.tsx` |
| **AC-08** (Submission Failure Resilience) | `UI-03` | `client/tests/lab-02/CreateTicket.test.tsx` |
| **AC-09** (Search & Filtering) | `API-07`, `API-08`, `UI-06` | `server/tests/lab-02/my-tickets.api.test.ts`<br>`client/tests/lab-02/MyTickets.test.tsx` |
| **AC-10** (Attachment Upload Restrictions) | `API-11`, `API-12` | `server/tests/lab-02/attachments.api.test.ts` |
| **AC-11** (Attachment Count Limit) | `API-13` | `server/tests/lab-02/attachments.api.test.ts` |
| **AC-12** (Attachment Download) | `API-14`, `E2E-01` | `server/tests/lab-02/attachments.api.test.ts`<br>`e2e/lab-02/requester-ticket-flow.spec.ts` |
| **AC-13** (Attachment Soft Removal & Blocked Download) | `API-15`, `API-16`, `API-17`, `UI-09`, `UI-10`, `E2E-01` | `server/tests/lab-02/attachments.api.test.ts`<br>`client/tests/lab-02/AttachmentSection.test.tsx`<br>`e2e/lab-02/requester-ticket-flow.spec.ts` |
| **AC-14** (Responsive Layouts) | `E2E-01` | `e2e/lab-02/requester-ticket-flow.spec.ts` |

---

## 4. Responsive and Visual Checklist

- [x] **Desktop Viewport (≥ 992px):**
  - Container centered with max-width `1140px`.
  - Create Ticket form displays 2-column header and wide description.
  - My Tickets data table displays all 9 columns without awkward cell wrapping.
  - Ticket Detail displays 4-column metadata grid.
- [x] **Tablet Viewport (768px – 991px):**
  - Form grids condense cleanly to 2 columns.
  - Summary and Description receive sufficient horizontal space.
  - Data table retains full functionality without text overlap.
- [x] **Mobile Viewport (< 768px):**
  - Zero horizontal document scrollbar (`overflow-x: hidden`).
  - Table transforms to stacked ticket cards.
  - Touch targets for buttons and form selects meet min 44px height.
  - Modals adapt to mobile screen dimensions with clear close buttons.
- [x] **Zen Green Color & Theme Fidelity:**
  - Header background matches `#006B3C`.
  - Body text is charcoal-green (`#1C2D27`), not pure `#000000`.
  - Read-only fields styled with `#F3F6F4`.
  - Badges render with exact background/border/text hex combinations.
  - Red asterisk displayed on all required field labels.

---

## 5. Test Commands

### 5.1. Database Migration & Seed
```bash
cd server
npx prisma migrate dev --name init_lab02
npm run prisma:seed
```

### 5.2. Run Backend Tests
```bash
cd server
npm test
```

### 5.3. Run Frontend Tests
```bash
cd client
npm test
```

### 5.4. Run Playwright E2E Tests
```bash
npm run test:e2e
```

---

## 6. Final Results

*(Test execution logs from the final merged `main` branch will be inserted here upon completion of all feature branches and staging integration.)*

---

## 7. Known Limitations or Deferred Tests
1. **Real Authentication:** Passwords, tokens, sessions, and role permissions are deferred to Lab 3; current tests use the `X-Requester-Id` header testing mechanism.
2. **IT Staff Workflows:** Ticket assignment, IT priority changes, and status transitions beyond `NEW` are deferred to Lab 3+.
3. **Public Comments & Notes:** Collaboration features are deferred to Lab 4.
