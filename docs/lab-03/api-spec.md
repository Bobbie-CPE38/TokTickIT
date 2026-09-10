# TokTickIT REST API Specification (Lab 3)

## 1. Overview and Global Conventions

This specification defines the complete REST API contract for the TokTickIT Authentication, Role-Based Authorization, IT Staff Ticketing, and Administrator User Management platform (Lab 3). All endpoints are relative to the `/api` prefix.

### 1.1. Base URL & Communication Protocol
- **Base URL:** `http://localhost:3000/api`
- **Protocol:** HTTP/1.1 or HTTP/2
- **Data Format:** Standard payloads use `application/json; charset=utf-8`. File uploads use `multipart/form-data`. Binary downloads stream native MIME payloads.

### 1.2. Authentication, Session Architecture, and CSRF Considerations
Lab 3 fully deprecates the temporary `X-Requester-Id` header introduced in Lab 2. All protected endpoints authenticate incoming requests using standard JSON Web Tokens (JWT) passed in the `Authorization` header:

```http
Authorization: Bearer <jwt-token>
```

#### Authentication Architecture Decisions:
1. **Password Hashing:** Passwords are never stored in plaintext. They are salted and hashed using **bcrypt** with a cost factor of **10**.
2. **Token Structure:** The issued JWT payload contains:
   ```json
   {
     "id": 1,
     "email": "janderson@toktickit.com",
     "role": "REQUESTER",
     "mustChangePassword": false,
     "iat": 1747123200,
     "exp": 1747152000
   }
   ```
3. **Token Expiration:** JWT tokens expire after **8 hours** (`exp = 28800 seconds`).
4. **Session Invalidation on Logout:** Calling `POST /api/auth/logout` adds the JWT token ID/signature to a server-side invalidation blocklist until its natural expiration, immediately revoking client access.
5. **CSRF Considerations & Architectural Justification:**
   - The application adopts a stateless Bearer token authentication model transmitted through the custom `Authorization: Bearer <token>` HTTP header, completely avoiding ambient browser session cookies.
   - Standard web browsers do **not** attach custom HTTP headers to cross-origin requests automatically. Because third-party cross-site requests cannot submit the `Authorization` header without explicit client-side JavaScript cooperation, traditional Cross-Site Request Forgery (CSRF) attack vectors are structurally prevented.
   - Cross-Origin Resource Sharing (CORS) is strictly restricted to trusted frontend origins (`http://localhost:5173`) with allowed methods `GET, POST, PATCH, OPTIONS` and allowed headers `Content-Type, Authorization`.
6. **Secret Security:** The token signing secret `JWT_SECRET` is loaded from server environment variables and is never exposed in client bundles or committed to source repositories.

---

### 1.3. Role-Based Authorization Matrix

| Endpoint Group | `REQUESTER` | `IT_STAFF` | `ADMINISTRATOR` |
|---|---|---|---|
| `POST /api/auth/login`, `POST /api/auth/logout` | Allowed | Allowed | Allowed |
| `GET /api/auth/me`, `POST /api/auth/change-password` | Allowed | Allowed | Allowed |
| `GET /api/categories`, `GET /api/related-systems` | Allowed | Allowed | Allowed |
| `POST /api/tickets` (Create Ticket) | Allowed | Allowed | Forbidden (403) |
| `GET /api/tickets` (My Tickets) | Allowed (Own only) | Forbidden (403) | Forbidden (403) |
| `GET /api/tickets/:id` (Requester Detail) | Allowed (Own only; 404 if not owned) | Forbidden (403) | Forbidden (403) |
| `PATCH /api/tickets/:id/resolve-indication` | Allowed (Own only) | Forbidden (403) | Forbidden (403) |
| `POST /api/tickets/:id/attachments` (Upload) | Allowed (Own only) | Allowed | Allowed |
| `GET /api/attachments/:id/download` (Download) | Allowed (Own only) | Allowed | Allowed |
| `PATCH /api/attachments/:id/soft-remove` (Remove) | Allowed (Own only) | Allowed | Allowed |
| `GET /api/staff/tickets` (Queue) | Forbidden (403) | Allowed | Allowed |
| `GET /api/staff/tickets/:id` (Staff Detail) | Forbidden (403) | Allowed | Allowed |
| `PATCH /api/staff/tickets/:id/assignment` | Forbidden (403) | Allowed | Allowed |
| `PATCH /api/staff/tickets/:id/priority` | Forbidden (403) | Allowed | Allowed |
| `PATCH /api/staff/tickets/:id/status` | Forbidden (403) | Allowed | Allowed |
| `GET /api/tickets/:id/comments` | Allowed (Own only) | Allowed | Allowed |
| `POST /api/tickets/:id/comments` | Allowed (Own only) | Allowed | Allowed |
| `GET /api/tickets/:id/notes` | Forbidden (403) | Allowed | Allowed |
| `POST /api/tickets/:id/notes` | Forbidden (403) | Allowed | Allowed |
| `GET /api/admin/users`, `POST /api/admin/users` | Forbidden (403) | Forbidden (403) | Allowed |
| `PATCH /api/admin/users/:id` | Forbidden (403) | Forbidden (403) | Allowed |
| `POST /api/admin/users/:id/reset-password` | Forbidden (403) | Forbidden (403) | Allowed |

*Note on Information Leakage Prevention: When a Requester attempts to access a Ticket or Attachment owned by another user, the API responds with `404 Not Found` rather than `403 Forbidden` to prevent probing or enumeration of existing resources.*

---

### 1.4. Standard Error Response Shape
All error responses adhere to a consistent, safe JSON structure that never exposes internal database schemas, stack traces, or raw driver errors:

```json
{
  "error": "Short human-readable error description",
  "details": [
    "Specific field validation error or constraint explanation (optional)"
  ]
}
```

### 1.5. HTTP Status Code Conventions
- `200 OK`: Request succeeded.
- `201 Created`: Resource successfully created.
- `400 Bad Request`: Malformed JSON, missing required body parameters, or invalid query/path parameters.
- `401 Unauthorized`: Missing, expired, or invalid authentication token.
- `403 Forbidden`: Authenticated user lacks role permissions to access or execute the requested operation.
- `404 Not Found`: Resource does not exist (or cross-user resource masked for privacy).
- `409 Conflict`: Unique constraint violation (e.g., duplicate email address).
- `410 Gone`: Attachment has been soft-removed.
- `413 Payload Too Large`: Uploaded file exceeds the 5 MB limit.
- `415 Unsupported Media Type`: Uploaded file MIME type is not permitted.
- `422 Unprocessable Entity`: Semantic validation failed (e.g., password complexity unmet, invalid status transition, empty comment, or self-deactivation attempt).
- `500 Internal Server Error`: Unexpected server error.

---

## 2. Authentication & Credential Endpoints

### 2.1. User Login
- **Path:** `POST /api/auth/login`
- **Description:** Authenticates active users with email and password, issuing a signed JWT token.
- **Authorization:** Public
- **Request Body:**
  ```json
  {
    "email": "janderson@toktickit.com",
    "password": "Password123!"
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "email": "janderson@toktickit.com",
      "name": "Jennifer Anderson",
      "role": "REQUESTER",
      "isActive": true,
      "mustChangePassword": false
    }
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: Missing email or password.
  - `401 Unauthorized`: Invalid credentials (`{"error": "Invalid email or password. Please try again."}`).
  - `403 Forbidden`: Account deactivated (`{"error": "Account is inactive. Please contact your system administrator."}`).

---

### 2.2. User Logout
- **Path:** `POST /api/auth/logout`
- **Description:** Terminates the current session and revokes the active token.
- **Authorization:** Bearer token required
- **Request Body:** None
- **Response `200 OK`:**
  ```json
  {
    "message": "Logged out successfully"
  }
  ```
- **Error Responses:**
  - `401 Unauthorized`: Missing or invalid token.

---

### 2.3. Current User Context
- **Path:** `GET /api/auth/me`
- **Description:** Returns the authenticated user's current identity and profile. If account was deactivated after token issuance, rejects with HTTP 403 Forbidden per BR-21.
- **Authorization:** Bearer token required
- **Response `200 OK`:**
  ```json
  {
    "id": 1,
    "email": "janderson@toktickit.com",
    "name": "Jennifer Anderson",
    "role": "REQUESTER",
    "isActive": true,
    "mustChangePassword": false
  }
  ```
- **Error Responses:**
  - `401 Unauthorized`: Missing or expired token.
  - `403 Forbidden`: User account is deactivated.

---

### 2.4. Change Password
- **Path:** `POST /api/auth/change-password`
- **Description:** Changes user password. Mandatory for users with `mustChangePassword = true`.
- **Authorization:** Bearer token required
- **Request Body:**
  ```json
  {
    "currentPassword": "InitialPass123!",
    "newPassword": "NewSecurePassword456!",
    "confirmPassword": "NewSecurePassword456!"
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "message": "Password changed successfully"
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: Passwords do not match.
  - `401 Unauthorized`: Incorrect current password.
  - `422 Unprocessable Entity`: New password does not meet complexity rules (`{"error": "Password does not meet complexity requirements", "details": ["Must be at least 8 characters", "Must include upper and lower case letters", "Must include a number and special character"]}`).

---

## 3. Requester Ticket & Attachment Endpoints (Authenticated Continuation)

### 3.1. Create Ticket
- **Path:** `POST /api/tickets`
- **Description:** Creates a ticket owned by the authenticated user.
- **Authorization:** `REQUESTER` or `IT_STAFF`
- **Request Body:**
  ```json
  {
    "categoryId": 1,
    "relatedSystemId": 2,
    "requestedPriority": "HIGH",
    "summary": "Cannot connect to campus VPN from home",
    "description": "Whenever I attempt to launch the VPN client, it hangs on handshake..."
  }
  ```
- **Response `201 Created`:**
  ```json
  {
    "id": 105,
    "ticketNumber": "TKT-2026-000105",
    "summary": "Cannot connect to campus VPN from home",
    "description": "Whenever I attempt to launch the VPN client, it hangs on handshake...",
    "requestedPriority": "HIGH",
    "itPriority": "HIGH",
    "currentStatus": "NEW",
    "ticketOwner": null,
    "resolutionSummary": null,
    "isRequesterResolved": false,
    "requesterId": 1,
    "createdAt": "2026-05-13T09:14:00.000Z",
    "updatedAt": "2026-05-13T09:14:00.000Z"
  }
  ```

---

### 3.2. List Requester Tickets ("My Tickets")
- **Path:** `GET /api/tickets`
- **Description:** Retrieves paginated tickets owned strictly by the authenticated user.
- **Authorization:** `REQUESTER`
- **Query Parameters:** `search`, `categoryId`, `requestedPriority`, `itPriority`, `status`, `page`, `pageSize`, `sortBy`, `sortOrder`.
- **Response `200 OK`:**
  ```json
  {
    "data": [
      {
        "id": 105,
        "ticketNumber": "TKT-2026-000105",
        "summary": "Cannot connect to campus VPN from home",
        "requestedPriority": "HIGH",
        "itPriority": "HIGH",
        "currentStatus": "NEW",
        "category": { "id": 1, "name": "Network" },
        "createdAt": "2026-05-13T09:14:00.000Z"
      }
    ],
    "pagination": {
      "total": 1,
      "page": 1,
      "pageSize": 10,
      "totalPages": 1
    }
  }
  ```

---

### 3.3. Get Requester Ticket Detail
- **Path:** `GET /api/tickets/:id`
- **Description:** Retrieves full ticket details owned by the authenticated Requester.
- **Authorization:** `REQUESTER` (strictly owned tickets only)
- **Response `200 OK`:** Full ticket object including category, relatedSystem, active/removed attachments, public comments, and `isRequesterResolved`.
- **Error Responses:**
  - `404 Not Found`: Ticket does not exist or belongs to another user (`{"error": "Ticket not found"}`). Prevents probing or leaking ticket existence.

---

### 3.4. Indicate Problem Appears Resolved
- **Path:** `PATCH /api/tickets/:id/resolve-indication`
- **Description:** Allows Requester to indicate that their issue appears resolved without formally transitioning ticket status.
- **Authorization:** `REQUESTER` (strictly owned tickets only)
- **Request Body:** None
- **Response `200 OK`:**
  ```json
  {
    "id": 105,
    "ticketNumber": "TKT-2026-000105",
    "isRequesterResolved": true,
    "updatedAt": "2026-05-13T10:30:00.000Z"
  }
  ```

---

### 3.5. Attachment Continuation Endpoints

#### 3.5.1. Upload Attachment
- **Path:** `POST /api/tickets/:id/attachments`
- **Description:** Uploads an attachment to a ticket under the authenticated user session. Requesters may upload to owned tickets; IT Staff and Administrators may upload to any ticket in the system to attach logs, screenshots, or diagnostics.
- **Authorization:** `REQUESTER` (owned ticket only), `IT_STAFF` (all tickets), `ADMINISTRATOR` (all tickets)
- **Content-Type:** `multipart/form-data`
- **Form Field:** `file` (binary stream)
- **Validation Rules:**
  - Permitted MIME types: `image/jpeg`, `image/png`, `image/webp`, `application/pdf`.
  - Max file size: 5 MB (5,242,880 bytes).
  - Max active attachments per ticket: 5.
- **Response `201 Created`:**
  ```json
  {
    "id": 14,
    "ticketId": 105,
    "originalFileName": "vpn_error.png",
    "fileSize": 245100,
    "mimeType": "image/png",
    "isRemoved": false,
    "uploadedByUserId": 1,
    "createdAt": "2026-05-13T09:15:00.000Z"
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: Missing file payload.
  - `401 Unauthorized`: Missing or invalid token.
  - `404 Not Found`: Ticket does not exist (or cross-requester resource masked for privacy).
  - `413 Payload Too Large`: File exceeds 5 MB limit.
  - `415 Unsupported Media Type`: File format not permitted.
  - `422 Unprocessable Entity`: Ticket already has 5 active attachments.

#### 3.5.2. Download Attachment
- **Path:** `GET /api/attachments/:id/download`
- **Description:** Streams binary file payload with original filename header.
- **Authorization:** `REQUESTER` (if owner of parent ticket), `IT_STAFF`, `ADMINISTRATOR`
- **Response `200 OK`:** Binary stream with response headers:
  - `Content-Disposition: attachment; filename="vpn_error.png"`
  - `Content-Type: image/png`
- **Error Responses:**
  - `401 Unauthorized`: Missing or invalid token.
  - `404 Not Found`: Attachment does not exist or user lacks permission to parent ticket.
  - `410 Gone`: Attachment has been soft-removed (`{"error": "Attachment has been removed"}`).

#### 3.5.3. Soft-Remove Attachment
- **Path:** `PATCH /api/attachments/:id/soft-remove`
- **Description:** Soft-removes an attachment with mandatory audit reason.
- **Authorization:** `REQUESTER` (if owner of parent ticket), `IT_STAFF`, `ADMINISTRATOR`
- **Request Body:**
  ```json
  {
    "removalReason": "Uploaded incorrect log file with sensitive credentials"
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "id": 14,
    "ticketId": 105,
    "originalFileName": "vpn_error.png",
    "isRemoved": true,
    "removedAt": "2026-05-13T09:30:00.000Z",
    "removalReason": "Uploaded incorrect log file with sensitive credentials"
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: Missing `removalReason`.
  - `401 Unauthorized`: Missing or invalid token.
  - `404 Not Found`: Attachment does not exist or unauthorized.
  - `422 Unprocessable Entity`: `removalReason` shorter than 3 characters or whitespace-only.

---

## 4. IT Staff Ticket Queue & Operations Endpoints

### 4.1. Retrieve IT Staff Ticket Queue
- **Path:** `GET /api/staff/tickets`
- **Description:** Retrieves tickets across all users with multi-column filtering, keyword search, sorting, and pagination.
- **Authorization:** `IT_STAFF`, `ADMINISTRATOR`
- **Query Parameters:**
  - `search` (optional string): Substring match against `ticketNumber` or `summary`.
  - `status` (optional TicketStatus enum): `NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CLOSED`, `REOPENED`, `CANCELLED`.
  - `categoryId` (optional integer): Filter by Category ID.
  - `requestedPriority` (optional Priority enum): `LOW`, `MEDIUM`, `HIGH`, `URGENT`.
  - `itPriority` (optional Priority enum): `LOW`, `MEDIUM`, `HIGH`, `URGENT`.
  - `ticketOwnerId` (optional string): Specific user ID integer or string `"unassigned"`.
  - `sortBy` (optional string): `createdAt`, `updatedAt`, `ticketNumber`, `itPriority`, `status`. Default: `createdAt`.
  - `sortOrder` (optional string): `asc`, `desc`. Default: `desc`.
  - `page` (optional integer): Page number. Default: `1`.
  - `pageSize` (optional integer): Records per page. Default: `10`, maximum: `50`.

#### Behavior for Invalid Query Parameters:
1. **Invalid Enum Parameters (`status`, `requestedPriority`, `itPriority`):**
   - Returns **`400 Bad Request`** with error details: `{"error": "Invalid query parameter", "details": ["Value 'INVALID_VAL' is not a valid status enum"]}`.
2. **Invalid Numerical Parameters (`page`, `pageSize`):**
   - Negative, zero, or non-integer values for `page` or `pageSize` are sanitized by falling back to safe defaults (`page = 1`, `pageSize = 10`).
   - `pageSize` values exceeding `50` are automatically clamped to `50`.
3. **Unrecognized `sortBy` Field:**
   - Falls back safely to default sort ordering (`createdAt` descending).

- **Response `200 OK`:**
  ```json
  {
    "data": [
      {
        "id": 105,
        "ticketNumber": "TKT-2026-000105",
        "summary": "Cannot connect to campus VPN from home",
        "category": { "id": 1, "name": "Network" },
        "requestedPriority": "HIGH",
        "itPriority": "HIGH",
        "currentStatus": "IN_PROGRESS",
        "ticketOwner": {
          "id": 2,
          "name": "Michael Brown",
          "email": "mbrown@toktickit.com"
        },
        "isRequesterResolved": false,
        "createdAt": "2026-05-13T09:14:00.000Z",
        "updatedAt": "2026-05-13T10:00:00.000Z"
      }
    ],
    "pagination": {
      "total": 87,
      "page": 1,
      "pageSize": 10,
      "totalPages": 9
    }
  }
  ```

---

### 4.2. Retrieve Ticket for IT Staff Operations
- **Path:** `GET /api/staff/tickets/:id`
- **Description:** Retrieves full operational ticket details, including Requester profile, attachments, public comments, internal notes, and requester resolution flag.
- **Authorization:** `IT_STAFF`, `ADMINISTRATOR`
- **Response `200 OK`:** Full ticket record with nested requester, owner, category, system, comments, notes, and attachments.
- **Error Responses:**
  - `404 Not Found`: Ticket does not exist.

---

### 4.3. Claim or Reassign Ticket Ownership
- **Path:** `PATCH /api/staff/tickets/:id/assignment`
- **Description:** Assigns or unassigns ticket ownership to an active IT Staff or Administrator.
- **Authorization:** `IT_STAFF`, `ADMINISTRATOR`
- **Request Body:**
  ```json
  {
    "ticketOwnerId": 2
  }
  ```
  *(Pass `null` to unassign the ticket).*
- **Response `200 OK`:**
  ```json
  {
    "id": 105,
    "ticketNumber": "TKT-2026-000105",
    "ticketOwnerId": 2,
    "ticketOwner": {
      "id": 2,
      "name": "Michael Brown",
      "email": "mbrown@toktickit.com"
    },
    "updatedAt": "2026-05-13T10:15:00.000Z"
  }
  ```
- **Error Responses:**
  - `422 Unprocessable Entity`: Target user is inactive or not an IT Staff / Administrator.

---

### 4.4. Update IT Priority
- **Path:** `PATCH /api/staff/tickets/:id/priority`
- **Description:** Updates the ticket's operational IT Priority independently from Requester priority.
- **Authorization:** `IT_STAFF`, `ADMINISTRATOR`
- **Request Body:**
  ```json
  {
    "itPriority": "URGENT"
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "id": 105,
    "ticketNumber": "TKT-2026-000105",
    "requestedPriority": "HIGH",
    "itPriority": "URGENT",
    "updatedAt": "2026-05-13T10:20:00.000Z"
  }
  ```

---

### 4.5. Update Ticket Status
- **Path:** `PATCH /api/staff/tickets/:id/status`
- **Description:** Progresses ticket status strictly according to the approved state transition matrix:
  - `NEW` → `OPEN`, `IN_PROGRESS`, `CANCELLED`
  - `OPEN` → `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `CANCELLED`
  - `IN_PROGRESS` → `WAITING_FOR_REQUESTER`, `RESOLVED`, `CANCELLED`
  - `WAITING_FOR_REQUESTER` → `IN_PROGRESS`, `RESOLVED`, `CANCELLED`
  - `RESOLVED` → `CLOSED`, `REOPENED`
  - `REOPENED` → `IN_PROGRESS`, `RESOLVED`, `CANCELLED`
  - `CLOSED` → `REOPENED` (permitted exclusively for `IT_STAFF` and `ADMINISTRATOR` with confirmation and rationale; otherwise terminal)
  - `CANCELLED` → Terminal (no transitions permitted)
- **Authorization:** `IT_STAFF`, `ADMINISTRATOR`
- **Request Body:**
  ```json
  {
    "currentStatus": "RESOLVED",
    "resolutionSummary": "Reconfigured client IPsec routing policy."
  }
  ```
  *(Note on `resolutionSummary`: Mandatory with 5–1,000 characters when transitioning to `RESOLVED`. When transitioning from `RESOLVED` to `CLOSED`, `resolutionSummary` is optional; if omitted, the backend automatically preserves the existing summary on the ticket. If provided, it updates the summary).*
- **Response `200 OK`:**
  ```json
  {
    "id": 105,
    "ticketNumber": "TKT-2026-000105",
    "currentStatus": "RESOLVED",
    "resolutionSummary": "Reconfigured client IPsec routing policy.",
    "updatedAt": "2026-05-13T10:45:00.000Z"
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: Invalid status value.
  - `401 Unauthorized`: Missing or invalid token.
  - `403 Forbidden`: Authenticated user lacks `IT_STAFF` or `ADMINISTRATOR` role.
  - `404 Not Found`: Ticket does not exist.
  - `422 Unprocessable Entity`: Invalid status transition or missing mandatory `resolutionSummary` when transitioning to `RESOLVED`.

---

## 5. Comments and Internal Notes Endpoints

### 5.1. Retrieve Public Comments
- **Path:** `GET /api/tickets/:id/comments`
- **Description:** Retrieves all public comments posted on a ticket.
- **Authorization:** `REQUESTER` (if ticket owner), `IT_STAFF`, `ADMINISTRATOR`
- **Response `200 OK`:**
  ```json
  [
    {
      "id": 1,
      "ticketId": 105,
      "content": "We are investigating the issue on your device.",
      "createdAt": "2026-05-13T10:30:00.000Z",
      "author": {
        "id": 2,
        "name": "Michael Brown",
        "role": "IT_STAFF"
      }
    }
  ]
  ```

---

### 5.2. Post Public Comment
- **Path:** `POST /api/tickets/:id/comments`
- **Description:** Appends a new public comment to the ticket discussion.
- **Authorization:** `REQUESTER` (if ticket owner), `IT_STAFF`, `ADMINISTRATOR`
- **Request Body:**
  ```json
  {
    "content": "Thank you for the prompt update!"
  }
  ```
- **Response `201 Created`:**
  ```json
  {
    "id": 2,
    "ticketId": 105,
    "content": "Thank you for the prompt update!",
    "createdAt": "2026-05-13T10:35:00.000Z",
    "author": {
      "id": 1,
      "name": "Jennifer Anderson",
      "role": "REQUESTER"
    }
  }
  ```
- **Error Responses:**
  - `422 Unprocessable Entity`: Content empty, whitespace-only, or exceeding 2,000 characters.

---

### 5.3. Retrieve Internal Notes
- **Path:** `GET /api/tickets/:id/notes`
- **Description:** Retrieves private internal operational notes. Strictly prohibited for Requesters.
- **Authorization:** `IT_STAFF`, `ADMINISTRATOR` (Requesters receive `403 Forbidden`)
- **Response `200 OK`:**
  ```json
  [
    {
      "id": 1,
      "ticketId": 105,
      "content": "Root cause is firewall profile blocking port 500 UDP.",
      "createdAt": "2026-05-13T10:25:00.000Z",
      "author": {
        "id": 2,
        "name": "Michael Brown",
        "role": "IT_STAFF"
      }
    }
  ]
  ```
- **Error Responses:**
  - `403 Forbidden`: Authenticated user is a `REQUESTER`.

---

### 5.4. Create Internal Note
- **Path:** `POST /api/tickets/:id/notes`
- **Description:** Records a private internal note on the ticket.
- **Authorization:** `IT_STAFF`, `ADMINISTRATOR` (Requesters receive `403 Forbidden`)
- **Request Body:**
  ```json
  {
    "content": "Assigned ticket to Tier 2 network engineer."
  }
  ```
- **Response `201 Created`:**
  ```json
  {
    "id": 2,
    "ticketId": 105,
    "content": "Assigned ticket to Tier 2 network engineer.",
    "createdAt": "2026-05-13T10:40:00.000Z",
    "author": {
      "id": 2,
      "name": "Michael Brown",
      "role": "IT_STAFF"
    }
  }
  ```
- **Error Responses:**
  - `403 Forbidden`: Authenticated user is a `REQUESTER`.
  - `422 Unprocessable Entity`: Content empty, whitespace-only, or exceeding 2,000 characters.

---

## 6. Administrator User Management Endpoints

### 6.1. Retrieve User List
- **Path:** `GET /api/admin/users`
- **Description:** Retrieves all users with search and role filtering.
- **Authorization:** `ADMINISTRATOR` (Requesters and IT Staff receive `403 Forbidden`)
- **Query Parameters:**
  - `search` (optional string): Substring match on `name` or `email`.
  - `role` (optional Role enum): Filter by `REQUESTER`, `IT_STAFF`, or `ADMINISTRATOR`.
- **Response `200 OK`:**
  ```json
  [
    {
      "id": 1,
      "name": "Jennifer Anderson",
      "email": "janderson@toktickit.com",
      "role": "REQUESTER",
      "isActive": true,
      "mustChangePassword": false,
      "createdAt": "2026-05-01T00:00:00.000Z"
    },
    {
      "id": 2,
      "name": "Michael Brown",
      "email": "mbrown@toktickit.com",
      "role": "IT_STAFF",
      "isActive": true,
      "mustChangePassword": false,
      "createdAt": "2026-05-01T00:00:00.000Z"
    }
  ]
  ```

---

### 6.2. Create User
- **Path:** `POST /api/admin/users`
- **Description:** Provisions a new user account with exactly one role and an initial password.
- **Authorization:** `ADMINISTRATOR`
- **Request Body:**
  ```json
  {
    "name": "Alex Thompson",
    "email": "alex.thompson@toktickit.com",
    "role": "IT_STAFF",
    "isActive": true,
    "initialPassword": "TempPassword123!"
  }
  ```
- **Response `201 Created`:**
  ```json
  {
    "id": 12,
    "name": "Alex Thompson",
    "email": "alex.thompson@toktickit.com",
    "role": "IT_STAFF",
    "isActive": true,
    "mustChangePassword": true,
    "createdAt": "2026-05-13T11:00:00.000Z"
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: Missing required fields.
  - `409 Conflict`: Email already exists (`{"error": "An account with this email address already exists"}`).
  - `422 Unprocessable Entity`: Invalid role or initial password fails complexity.

---

### 6.3. Update User Account
- **Path:** `PATCH /api/admin/users/:id`
- **Description:** Updates user details, role, and activation status.
- **Authorization:** `ADMINISTRATOR`
- **Request Body:**
  ```json
  {
    "name": "Alex Thompson Updated",
    "email": "alex.thompson@toktickit.com",
    "role": "IT_STAFF",
    "isActive": false
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "id": 12,
    "name": "Alex Thompson Updated",
    "email": "alex.thompson@toktickit.com",
    "role": "IT_STAFF",
    "isActive": false,
    "mustChangePassword": true,
    "updatedAt": "2026-05-13T11:15:00.000Z"
  }
  ```
- **Error Responses:**
  - `409 Conflict`: New email matches another user's email.
  - `422 Unprocessable Entity`: Self-deactivation attempted (`{"error": "You cannot deactivate your own account"}`).
  - `422 Unprocessable Entity`: Deactivation of last active administrator attempted (`{"error": "Cannot deactivate the last remaining active Administrator"}`).

---

### 6.4. Reset Initial Password
- **Path:** `POST /api/admin/users/:id/reset-password`
- **Description:** Sets a new initial password for a user, flagging `mustChangePassword = true`.
- **Authorization:** `ADMINISTRATOR`
- **Request Body:**
  ```json
  {
    "initialPassword": "ResetTemp123!"
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "message": "Initial password reset successfully",
    "userId": 12,
    "mustChangePassword": true
  }
  ```
- **Error Responses:**
  - `404 Not Found`: User does not exist.
  - `422 Unprocessable Entity`: Initial password fails complexity.
