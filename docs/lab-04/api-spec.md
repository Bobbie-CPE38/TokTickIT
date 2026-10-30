# TokTickIT REST API Specification (Lab 4)

## 1. Overview and Global Conventions
This specification defines the complete REST API contract for the TokTickIT platform in Lab 4, extending previous sprints to incorporate parent-child **Actions Taken**, strict **Ticket Status Transitions & Resolution Gate**, **Optimistic Concurrency Protection**, and role-appropriate **Operational Dashboards**.

All endpoints are relative to the `/api` prefix.

### 1.1. Base URL & Protocol
- **Base URL:** `http://localhost:3000/api`
- **Protocol:** HTTP/1.1 or HTTP/2
- **Data Format:** Standard payloads use `application/json; charset=utf-8`. File uploads use `multipart/form-data`.
- **Authentication:** Stateless JSON Web Token (JWT) transmitted via the standard header:
  ```http
  Authorization: Bearer <jwt-token>
  ```
  JWTs expire after 8 hours. Tokens carry claims: `{ id, email, role, mustChangePassword }`.
- **CORS:** Restricted to trusted frontend origin (`http://localhost:5173`) with allowed methods `GET, POST, PATCH, OPTIONS`.

### 1.2. Role-Based Authorization Matrix

| Endpoint Group / Action | `REQUESTER` | `IT_STAFF` | `ADMINISTRATOR` |
|---|---|---|---|
| `POST /api/auth/login`, `POST /api/auth/logout` | Allowed | Allowed | Allowed |
| `GET /api/auth/me`, `POST /api/auth/change-password` | Allowed | Allowed | Allowed |
| `GET /api/categories`, `GET /api/related-systems` | Allowed | Allowed | Allowed |
| `POST /api/tickets` (Create Ticket) | Allowed | Allowed | Forbidden (403) |
| `GET /api/tickets` (My Tickets) | Allowed (Own only) | Forbidden (403) | Forbidden (403) |
| `GET /api/tickets/:id` (Requester Ticket Detail) | Allowed (Own only; 404 if not owned) | Forbidden (403) | Forbidden (403) |
| `PATCH /api/tickets/:id/resolve-indication` | Allowed (Own only) | Forbidden (403) | Forbidden (403) |
| `POST /api/tickets/:id/attachments` (Upload) | Allowed (Own only) | Allowed | Allowed |
| `GET /api/attachments/:id/download` (Download) | Allowed (Own only) | Allowed | Allowed |
| `PATCH /api/attachments/:id/soft-remove` (Remove) | Allowed (Own only) | Allowed | Allowed |
| `GET /api/staff/tickets` (Queue) | Forbidden (403) | Allowed | Allowed |
| `GET /api/staff/tickets/:id` (Staff Detail) | Forbidden (403) | Allowed | Allowed |
| `PATCH /api/staff/tickets/:id/assignment` | Forbidden (403) | Allowed | Allowed |
| `PATCH /api/staff/tickets/:id/priority` | Forbidden (403) | Allowed | Allowed |
| `PATCH /api/staff/tickets/:id/status` (Workflow & Gate) | Forbidden (403) | Allowed | Allowed |
| `GET /api/tickets/:id/comments` | Allowed (Own only) | Allowed | Allowed |
| `POST /api/tickets/:id/comments` | Allowed (Own only) | Allowed | Allowed |
| `GET /api/tickets/:id/notes` | Forbidden (403) | Allowed | Allowed |
| `POST /api/tickets/:id/notes` | Forbidden (403) | Allowed | Allowed |
| `GET /api/tickets/:id/actions-taken` | Allowed (Own only; 404 if not owned) | Allowed | Allowed |
| `POST /api/tickets/:id/actions-taken` | Forbidden (403) | Allowed | Allowed |
| `PATCH /api/actions-taken/:actionId` | Forbidden (403) | Allowed | Allowed |
| `GET /api/actions-taken/:actionId` | Allowed (Own only; 404 if not owned) | Allowed | Allowed |
| `GET /api/dashboards/requester` | Allowed (Own only) | Forbidden (403) | Forbidden (403) |
| `GET /api/dashboards/staff` | Forbidden (403) | Allowed | Allowed |
| `GET /api/dashboards/admin` | Forbidden (403) | Forbidden (403) | Allowed |
| `GET /api/admin/users`, `POST /api/admin/users` | Forbidden (403) | Forbidden (403) | Allowed |
| `PATCH /api/admin/users/:id` | Forbidden (403) | Forbidden (403) | Allowed |
| `POST /api/admin/users/:id/reset-password` | Forbidden (403) | Forbidden (403) | Allowed |

*Anti-Leakage Privacy Rule: When a Requester queries a Ticket, Attachment, or Action Taken belonging to another user, the API responds with `404 Not Found` rather than `403 Forbidden` to prevent resource existence enumeration.*

---

### 1.3. Standard Error Response Shape
All error responses adhere to a consistent JSON format:
```json
{
  "error": "Short human-readable error description",
  "details": [
    "Specific field validation error or constraint explanation (optional)"
  ]
}
```

### 1.4. HTTP Status Code Conventions
- `200 OK`: Request succeeded.
- `201 Created`: Resource successfully created.
- `400 Bad Request`: Malformed JSON or invalid query/path parameters.
- `401 Unauthorized`: Missing, expired, or invalid JWT token.
- `403 Forbidden`: Authenticated user lacks role permissions.
- `404 Not Found`: Resource does not exist (or masked for cross-requester privacy).
- `409 Conflict`: Concurrency conflict (stale `expectedUpdatedAt`) or unique constraint violation.
- `410 Gone`: Attachment soft-removed.
- `413 Payload Too Large`: Upload exceeds 5 MB limit.
- `415 Unsupported Media Type`: Unsupported MIME type.
- `422 Unprocessable Entity`: Semantic validation failure (e.g. Resolution Gate failed, missing follow-up note, invalid status transition, self-deactivation).
- `500 Internal Server Error`: Unexpected server error.

---

## 2. Actions Taken Endpoints

### 2.1. List Actions Taken for Ticket
- **Path:** `GET /api/tickets/:id/actions-taken`
- **Description:** Retrieves all recorded Actions Taken for a specific ticket, ordered chronologically ascending by `actionDateTime`.
- **Authorization:** 
  - `REQUESTER`: Permitted only if the ticket was submitted by the authenticated user (`requesterId = req.user.id`). Returns `404 Not Found` if not owned.
  - `IT_STAFF`, `ADMINISTRATOR`: Permitted on any ticket.
- **Path Parameters:**
  - `id` (integer, required): Target Ticket ID.
- **Response `200 OK`:**
  ```json
  [
    {
      "id": 101,
      "ticketId": 12,
      "actionDateTime": "2026-05-12T10:15:00.000Z",
      "description": "Ran hardware diagnostic on laptop battery cells.",
      "result": "Cell #2 degraded below 40% capacity. Ordered replacement battery.",
      "performedByUserId": 2,
      "performedBy": {
        "id": 2,
        "name": "Sarah Johnson",
        "email": "staff.sarah@toktickit.com",
        "role": "IT_STAFF"
      },
      "isFollowUpRequired": true,
      "followUpNote": "Install replacement battery pack upon delivery (ETA May 14).",
      "attachmentNotes": "Battery_health_report.pdf attached in attachments section.",
      "createdAt": "2026-05-12T10:15:30.000Z",
      "updatedAt": "2026-05-12T10:15:30.000Z"
    }
  ]
  ```
- **Error Responses:**
  - `401 Unauthorized`: Missing or invalid token.
  - `404 Not Found`: Ticket does not exist or belongs to another requester.

---

### 2.2. Create Action Taken
- **Path:** `POST /api/tickets/:id/actions-taken`
- **Description:** Records a new technical Action Taken under the specified ticket.
- **Authorization:** `IT_STAFF`, `ADMINISTRATOR`. (Requesters receive `403 Forbidden`).
- **Path Parameters:**
  - `id` (integer, required): Target Ticket ID.
- **Request Body:**
  ```json
  {
    "actionDateTime": "2026-05-12T10:15:00.000Z",
    "description": "Ran hardware diagnostic on laptop battery cells.",
    "result": "Cell #2 degraded below 40% capacity. Ordered replacement battery.",
    "isFollowUpRequired": true,
    "followUpNote": "Install replacement battery pack upon delivery (ETA May 14).",
    "attachmentNotes": "Battery_health_report.pdf"
  }
  ```
  *Field Requirements:*
  - `actionDateTime`: Optional ISO 8601 string; defaults to current server timestamp if omitted. Cannot be set more than 24 hours into the future.
  - `description`: Required string, 3 to 2,000 characters.
  - `result`: Required string, 3 to 2,000 characters.
  - `isFollowUpRequired`: Boolean, defaults to `false`.
  - `followUpNote`: Required string (3 to 1,000 characters) if `isFollowUpRequired = true`. If `isFollowUpRequired = false`, optional and coerced to `null`.
  - `attachmentNotes`: Optional string, up to 500 characters.
  - *Note:* `performedByUserId` is automatically bound to `req.user.id`. Any value sent in request body is ignored.
- **Response `201 Created`:** Returns the newly created `ActionTaken` object with loaded `performedBy` user details.
- **Error Responses:**
  - `400 Bad Request`: Malformed JSON or invalid types.
  - `401 Unauthorized`: Missing or invalid token.
  - `403 Forbidden`: Authenticated user is a Requester or inactive staff.
  - `404 Not Found`: Ticket does not exist.
  - `422 Unprocessable Entity`: Validation failure (e.g. `isFollowUpRequired = true` but `followUpNote` is empty, description under 3 characters, `actionDateTime` more than 24 hours in the future, or performing user is inactive).

---

### 2.3. Update Action Taken
- **Path:** `PATCH /api/actions-taken/:actionId`
- **Description:** Updates fields of an existing Action Taken record.
- **Authorization:** `IT_STAFF`, `ADMINISTRATOR`.
- **Path Parameters:**
  - `actionId` (integer, required): ID of Action Taken record.
- **Request Body:** Partial update fields (`actionDateTime`, `description`, `result`, `isFollowUpRequired`, `followUpNote`, `attachmentNotes`).
- **Response `200 OK`:** Returns the updated `ActionTaken` object.
- **Error Responses:**
  - `401 Unauthorized`: Missing/invalid token.
  - `403 Forbidden`: Requester role.
  - `404 Not Found`: Action Taken record not found.
  - `422 Unprocessable Entity`: Invalid fields or follow-up note missing when `isFollowUpRequired = true`.

---

### 2.4. Retrieve Single Action Taken
- **Path:** `GET /api/actions-taken/:actionId`
- **Description:** Retrieves details of a specific Action Taken record.
- **Authorization:** `REQUESTER` (owned ticket only; 404 if not owned), `IT_STAFF`, `ADMINISTRATOR`.
- **Response `200 OK`:** Action Taken object.

---

## 3. Ticket Status Workflow, Concurrency & Resolution Gate

### 3.1. Update Ticket Status (with Resolution Gate & Concurrency Check)
- **Path:** `PATCH /api/staff/tickets/:id/status`
- **Description:** Transitions a Ticket's status in accordance with the permitted transition matrix, enforcing the Resolution Gate on `RESOLVED` and optimistic concurrency checking.
- **Authorization:** `IT_STAFF`, `ADMINISTRATOR`.
- **Path Parameters:**
  - `id` (integer, required): Target Ticket ID.
- **Request Body:**
  ```json
  {
    "status": "RESOLVED",
    "resolutionSummary": "Replaced faulty battery cell pack and recalibrated charging controller. System passed full diagnostic cycle.",
    "expectedUpdatedAt": "2026-05-12T09:14:00.000Z"
  }
  ```
  *Field Requirements:*
  - `status` (or `currentStatus`): Required enum (`NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CLOSED`, `REOPENED`, `CANCELLED`). *Note on Backwards Compatibility:* To prevent breaking changes with existing Lab 3 test suites, the backend accepts both `status` and `currentStatus` interchangeably (normalizing `status ?? currentStatus`).
  - `resolutionSummary`: Required when transitioning to `RESOLVED` (string, 5 to 1,000 characters). Preserved when transitioning to `CLOSED`.
  - `expectedUpdatedAt`: Optional ISO 8601 string. If supplied, the backend compares this against the Ticket's current database `updatedAt`.
- **Concurrency Conflict Behavior (Section 6.1):**
  If `expectedUpdatedAt` is provided and does not match the database `ticket.updatedAt.toISOString()`, the request is aborted and responds with:
  ```json
  // HTTP 409 Conflict
  {
    "error": "Conflict: Ticket has been modified by another user. Please refresh and review latest changes.",
    "details": [
      "Stale record detected. Current updatedAt is 2026-05-12T10:15:30.000Z but expected was 2026-05-12T09:14:00.000Z."
    ]
  }
  ```
- **Resolution Gate Enforcement:**
  If `status = RESOLVED`:
  1. Checks if ticket has at least one Action Taken (`actionsTaken.length \ge 1`). If zero actions exist, the request is rejected:
     ```json
     // HTTP 422 Unprocessable Entity
     {
       "error": "Resolution Gate Failed: At least one Action Taken must be recorded before resolving a ticket.",
       "details": [
         "Ticket has 0 recorded Actions Taken. Record technical actions before marking as Resolved."
       ]
     }
     ```
  2. Checks if `resolutionSummary` contains $\ge 5$ characters. If missing or insufficient:
     ```json
     // HTTP 422 Unprocessable Entity
     {
       "error": "Validation Error: resolutionSummary is required when resolving a ticket (minimum 5 characters).",
       "details": [
         "resolutionSummary must be at least 5 characters in length."
       ]
     }
     ```
- **Permitted Transition Enforcement:**
  If the status jump violates the state transition matrix (e.g. `NEW` $\rightarrow$ `CLOSED` or transitions out of `CANCELLED`), returns HTTP `422 Unprocessable Entity`.
- **Response `200 OK`:**
  ```json
  {
    "id": 12,
    "ticketNumber": "TKT-2026-000234",
    "summary": "Laptop battery drains quickly",
    "currentStatus": "RESOLVED",
    "resolutionSummary": "Replaced faulty battery cell pack and recalibrated charging controller. System passed full diagnostic cycle.",
    "isRequesterResolved": true,
    "itPriority": "HIGH",
    "ticketOwnerId": 2,
    "updatedAt": "2026-05-12T11:00:00.000Z"
  }
  ```

---

### 3.2. Update Ticket Assignment (with Concurrency Check)
- **Path:** `PATCH /api/staff/tickets/:id/assignment`
- **Description:** Claims ticket ownership or reassigns ticket ownership to any active IT Staff member or Administrator. Enforces active assignee validation and optimistic concurrency checking.
- **Authorization:** `IT_STAFF`, `ADMINISTRATOR`. (Requesters receive `403 Forbidden`).
- **Path Parameters:**
  - `id` (integer, required): Target Ticket ID.
- **Request Body:**
  ```json
  {
    "ticketOwnerId": 2,
    "expectedUpdatedAt": "2026-05-12T09:14:00.000Z"
  }
  ```
  *Field Requirements:*
  - `ticketOwnerId`: Integer or null (null unassigns the ticket). Must reference an active user with role `IT_STAFF` or `ADMINISTRATOR`.
  - `expectedUpdatedAt`: Optional ISO 8601 string. If supplied, the backend compares this against the Ticket's current database `updatedAt`.
- **Concurrency Conflict Behavior (Section 6.1):**
  If `expectedUpdatedAt` is provided and does not match `ticket.updatedAt.toISOString()`, the operation is aborted:
  ```json
  // HTTP 409 Conflict
  {
    "error": "Conflict: Ticket has been modified by another user. Please refresh and review latest changes.",
    "details": [
      "Stale record detected. Current updatedAt is 2026-05-12T10:15:30.000Z but expected was 2026-05-12T09:14:00.000Z."
    ]
  }
  ```
- **Validation Errors:**
  - `422 Unprocessable Entity`: If `ticketOwnerId` references an inactive user (`isActive = false`) or a user with role `REQUESTER`:
    ```json
    {
      "error": "Invalid ticket owner assignment.",
      "details": [
        "Ticket owner must be an active user with IT_STAFF or ADMINISTRATOR role."
      ]
    }
    ```
- **Response `200 OK`:**
  ```json
  {
    "id": 12,
    "ticketNumber": "TKT-2026-000234",
    "summary": "Laptop battery drains quickly",
    "currentStatus": "IN_PROGRESS",
    "itPriority": "HIGH",
    "ticketOwnerId": 2,
    "ticketOwner": {
      "id": 2,
      "name": "Sarah Johnson",
      "email": "staff.sarah@toktickit.com",
      "role": "IT_STAFF"
    },
    "updatedAt": "2026-05-12T10:30:00.000Z"
  }
  ```

---

### 3.3. Update Ticket IT Priority (with Concurrency Check)
- **Path:** `PATCH /api/staff/tickets/:id/priority`
- **Description:** Updates the ticket's `itPriority` independently of the Requester's original `requestedPriority`. Enforces optimistic concurrency checking.
- **Authorization:** `IT_STAFF`, `ADMINISTRATOR`. (Requesters receive `403 Forbidden`).
- **Path Parameters:**
  - `id` (integer, required): Target Ticket ID.
- **Request Body:**
  ```json
  {
    "itPriority": "URGENT",
    "expectedUpdatedAt": "2026-05-12T09:14:00.000Z"
  }
  ```
  *Field Requirements:*
  - `itPriority`: Required enum (`LOW`, `MEDIUM`, `HIGH`, `URGENT`).
  - `expectedUpdatedAt`: Optional ISO 8601 string. If supplied, compared against database `ticket.updatedAt`.
- **Concurrency Conflict Behavior (Section 6.1):**
  If `expectedUpdatedAt` does not match database `updatedAt`, responds with `HTTP 409 Conflict`.
- **Validation Errors:**
  - `422 Unprocessable Entity`: If `itPriority` is not a valid enum value:
    ```json
    {
      "error": "Invalid IT Priority value.",
      "details": [
        "itPriority must be one of: LOW, MEDIUM, HIGH, URGENT."
      ]
    }
    ```
- **Response `200 OK`:**
  ```json
  {
    "id": 12,
    "ticketNumber": "TKT-2026-000234",
    "summary": "Laptop battery drains quickly",
    "requestedPriority": "MEDIUM",
    "itPriority": "URGENT",
    "currentStatus": "IN_PROGRESS",
    "ticketOwnerId": 2,
    "updatedAt": "2026-05-12T10:35:00.000Z"
  }
  ```

---

## 4. Role-Appropriate Dashboard Endpoints

### 4.1. Requester Dashboard
- **Path:** `GET /api/dashboards/requester`
- **Description:** Returns concise operational metrics and recent tickets owned by the authenticated Requester. Strictly isolated to `requesterId = req.user.id`.
- **Authorization:** `REQUESTER`. (Staff/Admin receive `403 Forbidden`).
- **Response `200 OK`:**
  ```json
  {
    "metrics": {
      "myOpenTickets": 3,
      "waitingForRequester": 1,
      "inProgress": 2,
      "resolved": 5,
      "closed": 12
    },
    "recentTickets": [
      {
        "id": 12,
        "ticketNumber": "TKT-2026-000234",
        "summary": "Laptop battery drains quickly",
        "currentStatus": "IN_PROGRESS",
        "requestedPriority": "HIGH",
        "category": { "name": "Hardware" },
        "updatedAt": "2026-05-12T09:14:00.000Z"
      },
      {
        "id": 11,
        "ticketNumber": "TKT-2026-000222",
        "summary": "Request software access",
        "currentStatus": "OPEN",
        "requestedPriority": "MEDIUM",
        "category": { "name": "Software" },
        "updatedAt": "2026-05-11T14:30:00.000Z"
      }
    ]
  }
  ```
  *Calculation Rules:*
  - `myOpenTickets`: Tickets where `requesterId = req.user.id` AND `currentStatus \in ['NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'REOPENED']`.
  - `waitingForRequester`: Tickets where `requesterId = req.user.id` AND `currentStatus = 'WAITING_FOR_REQUESTER'` (identifies attention-required requests awaiting requester input).
  - `inProgress`: Tickets where `requesterId = req.user.id` AND `currentStatus = 'IN_PROGRESS'`.
  - `resolved`: Tickets where `requesterId = req.user.id` AND `currentStatus = 'RESOLVED'`.
  - `closed`: Tickets where `requesterId = req.user.id` AND `currentStatus = 'CLOSED'`.
  - `recentTickets`: Up to 5 most recently updated tickets owned by user, sorted by `updatedAt DESC`.
  - *Drill-Down Query Parameter Contract:* To support one-click drill-down navigation from the Requester Dashboard "My Open Tickets" metric card, `GET /api/tickets` explicitly accepts `filter=open`, returning tickets matching all active statuses (`NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `REOPENED`).

---

### 4.2. IT Staff Dashboard
- **Path:** `GET /api/dashboards/staff`
- **Description:** Returns concise operational queue metrics, day-over-day trends, urgent tickets, user actions count, and recent accessible tickets for IT Staff and Administrators.
- **Authorization:** `IT_STAFF`, `ADMINISTRATOR`. (Requesters receive `403 Forbidden`).
- **Response `200 OK`:**
  ```json
  {
    "metrics": {
      "new": 14,
      "open": 23,
      "inProgress": 18,
      "waitingForRequester": 7,
      "myAssigned": 16,
      "unassigned": 8,
      "myActionsCount": 42
    },
    "trends": {
      "newDelta": 3,
      "openDelta": -2,
      "inProgressDelta": -1,
      "waitingForRequesterDelta": 1,
      "myAssignedDelta": 4
    },
    "urgentTickets": [
      {
        "id": 9,
        "ticketNumber": "TKT-2026-000210",
        "summary": "Core database server outage",
        "currentStatus": "IN_PROGRESS",
        "itPriority": "URGENT",
        "ticketOwner": {
          "id": 2,
          "name": "Michael Brown"
        },
        "updatedAt": "2026-05-12T08:00:00.000Z"
      }
    ],
    "recentTickets": [
      {
        "id": 12,
        "ticketNumber": "TKT-2026-000234",
        "summary": "Laptop battery drains quickly",
        "currentStatus": "IN_PROGRESS",
        "itPriority": "HIGH",
        "ticketOwner": {
          "id": 2,
          "name": "Michael Brown"
        },
        "updatedAt": "2026-05-12T09:14:00.000Z"
      }
    ]
  }
  ```
  *Calculation Rules:*
  - `new`: All tickets where `currentStatus = 'NEW'`.
  - `open`: All tickets where `currentStatus = 'OPEN'`.
  - `inProgress`: All tickets where `currentStatus = 'IN_PROGRESS'`.
  - `waitingForRequester`: All tickets where `currentStatus = 'WAITING_FOR_REQUESTER'`.
  - `myAssigned`: All tickets where `ticketOwnerId = req.user.id` AND `currentStatus \notin ['CLOSED', 'CANCELLED']`.
  - `unassigned`: All active tickets where `ticketOwnerId IS NULL` AND `currentStatus \notin ['CLOSED', 'CANCELLED']`.
  - `myActionsCount`: Total count of Actions Taken recorded across all tickets where `performedByUserId = req.user.id`.
  - `trends`: Calculated by comparing live count against the count at 00:00:00 UTC (07:00:00 ICT) of the current calendar day, providing an authoritative and reproducible baseline for automated tests and demonstrations.
  - `urgentTickets`: Up to 5 most recently updated active tickets with `itPriority = 'URGENT'` and `currentStatus \notin ['CLOSED', 'CANCELLED']`.

---

### 4.3. Administrator Dashboard
- **Path:** `GET /api/dashboards/admin`
- **Description:** Returns operational queue metrics alongside system user-account governance statistics.
- **Authorization:** `ADMINISTRATOR`. (Requesters and IT Staff receive `403 Forbidden`).
- **Response `200 OK`:**
  ```json
  {
    "operationalMetrics": {
      "new": 14,
      "open": 23,
      "inProgress": 18,
      "waitingForRequester": 7,
      "myAssigned": 16,
      "unassigned": 8,
      "myActionsCount": 42
    },
    "trends": {
      "newDelta": 3,
      "openDelta": -2,
      "inProgressDelta": -1,
      "waitingForRequesterDelta": 1,
      "myAssignedDelta": 4
    },
    "urgentTickets": [ ... ],
    "userStats": {
      "totalUsers": 25,
      "activeUsers": 23,
      "inactiveUsers": 2,
      "requesterCount": 18,
      "staffCount": 5,
      "adminCount": 2
    },
    "recentTickets": [ ... ]
  }
  ```

---

## 5. Summary of Continued Lab 2 & 3 Endpoints

| Group | Method | Path | Summary | Authorization |
|---|---|---|---|---|
| **Auth** | `POST` | `/api/auth/login` | Email/password login | Public |
| | `POST` | `/api/auth/logout` | Session invalidation | Authenticated |
| | `GET` | `/api/auth/me` | Current user profile & role | Authenticated |
| | `POST` | `/api/auth/change-password` | Update user password | Authenticated |
| **Reference** | `GET` | `/api/categories` | Active ticket categories | Authenticated |
| | `GET` | `/api/related-systems` | Active related systems | Authenticated |
| **Tickets** | `POST` | `/api/tickets` | Create ticket (bound to auth user) | `REQUESTER`, `IT_STAFF` |
| | `GET` | `/api/tickets` | My Tickets list (supports `filter=open` and `status` query filters) | `REQUESTER` (own) |
| | `GET` | `/api/tickets/:id` | Ticket detail | `REQUESTER` (own) |
| | `PATCH` | `/api/tickets/:id/resolve-indication`| Advisory problem resolved flag | `REQUESTER` (own) |
| **Attachments** | `POST` | `/api/tickets/:id/attachments` | Upload attachment ($\le 5\text{ MB}$) | Permitted roles |
| | `GET` | `/api/attachments/:id/download` | Download attachment | Permitted roles |
| | `PATCH` | `/api/attachments/:id/soft-remove` | Soft-remove with mandatory reason | Permitted roles |
| **Staff Queue** | `GET` | `/api/staff/tickets` | Search/filter/paginate queue | `IT_STAFF`, `ADMIN` |
| | `GET` | `/api/staff/tickets/:id` | Full staff ticket detail | `IT_STAFF`, `ADMIN` |
| | `PATCH` | `/api/staff/tickets/:id/assignment` | Claim or reassign ticket owner (supports optimistic concurrency via `expectedUpdatedAt`) | `IT_STAFF`, `ADMIN` |
| | `PATCH` | `/api/staff/tickets/:id/priority` | Update IT priority (supports optimistic concurrency via `expectedUpdatedAt`) | `IT_STAFF`, `ADMIN` |
| **Discussions** | `GET` | `/api/tickets/:id/comments` | Retrieve public comments | Permitted roles |
| | `POST` | `/api/tickets/:id/comments` | Create public comment | Permitted roles |
| | `GET` | `/api/tickets/:id/notes` | Retrieve internal notes | `IT_STAFF`, `ADMIN` |
| | `POST` | `/api/tickets/:id/notes` | Create internal note | `IT_STAFF`, `ADMIN` |
| **Admin Users** | `GET` | `/api/admin/users` | List users with search/filter | `ADMINISTRATOR` |
| | `POST` | `/api/admin/users` | Create user with initial password | `ADMINISTRATOR` |
| | `PATCH` | `/api/admin/users/:id` | Update user profile/activation | `ADMINISTRATOR` |
| | `POST` | `/api/admin/users/:id/reset-password`| Set new initial password | `ADMINISTRATOR` |
