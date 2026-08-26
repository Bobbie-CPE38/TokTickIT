# TokTickIT REST API Specification (Lab 2)

## 1. Overview and Global Conventions

This document specifies the REST API contract for the TokTickIT Requester Ticketing MVP (Lab 2). All endpoints are prefixed with `/api`.

### 1.1. Base URL & Protocol
- **Base URL:** `http://localhost:3000/api`
- **Protocol:** HTTP/1.1 or HTTP/2
- **Data Format:** `application/json` (except file upload endpoints which use `multipart/form-data` and file download endpoints which return binary streams).

### 1.2. Requester Context & Identity (`X-Requester-Id`)
To simulate user ownership before real authentication is introduced in Lab 3, every client request that creates, reads, or modifies requester-scoped resources must include the active Requester ID in the custom HTTP header:
```http
X-Requester-Id: 1
```
- If `X-Requester-Id` is missing on a protected endpoint, the API responds with `401 Unauthorized`.
- If `X-Requester-Id` references a non-existent or inactive requester, the API responds with `403 Forbidden`.

### 1.3. Standard Error Response Shape
All error responses adhere to a consistent, safe JSON structure:
```json
{
  "error": "Short human-readable error description",
  "details": [
    "Specific field validation error or constraint explanation (optional)"
  ]
}
```
*Note: Internal stack traces, raw SQL queries, and database driver errors are masked from client responses.*

### 1.4. HTTP Status Code Conventions
- `200 OK`: Request succeeded.
- `201 Created`: Resource successfully created.
- `400 Bad Request`: Malformed JSON or invalid query/path parameters.
- `401 Unauthorized`: Missing `X-Requester-Id` header.
- `403 Forbidden`: Access denied (e.g. attempting to access or modify another Requester's ticket or attachment; or inactive requester).
- `404 Not Found`: Resource does not exist.
- `410 Gone`: Resource existed but has been soft-removed (e.g. attempting to download a soft-removed attachment).
- `413 Payload Too Large`: Uploaded file exceeds the 5 MB limit.
- `415 Unsupported Media Type`: Uploaded file MIME type is not permitted.
- `422 Unprocessable Entity`: Semantic validation failed (e.g. Summary < 5 chars, active attachments limit > 5).
- `500 Internal Server Error`: Unexpected server-side failure.

---

## 2. Reference Data & Development Context Endpoints

### 2.1. Health Check
- **Path:** `GET /api/health`
- **Description:** Verifies server availability.
- **Headers:** None required.
- **Response `200 OK`:**
  ```json
  {
    "status": "ok",
    "service": "TokTickIT API"
  }
  ```

---

### 2.2. List Active Development Requesters
- **Path:** `GET /api/requesters/active`
- **Description:** Returns all active Development Requesters for the simulated login dropdown. Inactive requesters (`isActive = false`) are excluded.
- **Headers:** None required.
- **Response `200 OK`:**
  ```json
  [
    {
      "id": 1,
      "name": "Jennifer Anderson",
      "email": "jennifer.anderson@kmutt.ac.th",
      "department": "Computer Engineering"
    },
    {
      "id": 2,
      "name": "David Lee",
      "email": "david.lee@kmutt.ac.th",
      "department": "Information Technology"
    },
    {
      "id": 3,
      "name": "Sarah Johnson",
      "email": "sarah.johnson@kmutt.ac.th",
      "department": "Digital Media"
    },
    {
      "id": 4,
      "name": "Michael Brown",
      "email": "michael.brown@kmutt.ac.th",
      "department": "Electrical Engineering"
    }
  ]
  ```
- **Error Responses:** `500 Internal Server Error`

---

### 2.3. List Active Categories
- **Path:** `GET /api/categories`
- **Description:** Returns all active ticket categories ordered by ID.
- **Headers:** None required.
- **Response `200 OK`:**
  ```json
  [
    { "id": 1, "name": "Account and Access" },
    { "id": 2, "name": "Hardware" },
    { "id": 3, "name": "Software" },
    { "id": 4, "name": "Network" }
  ]
  ```
- **Error Responses:** `500 Internal Server Error`

---

### 2.4. List Active Related Systems
- **Path:** `GET /api/related-systems`
- **Description:** Returns all active related systems/services ordered by name.
- **Headers:** None required.
- **Response `200 OK`:**
  ```json
  [
    { "id": 1, "name": "Campus Wi-Fi" },
    { "id": 2, "name": "Corporate Laptop" },
    { "id": 3, "name": "Email" },
    { "id": 4, "name": "Grade Submission App" },
    { "id": 5, "name": "LEB2 App" },
    { "id": 6, "name": "Printer" },
    { "id": 7, "name": "VPN" }
  ]
  ```
- **Error Responses:** `500 Internal Server Error`

---

## 3. Ticket Management Endpoints

### 3.1. Create Ticket
- **Path:** `POST /api/tickets`
- **Description:** Creates a new support ticket for the active requester. Backend automatically assigns a unique `ticketNumber` (`TKT-YYYY-NNNNNN`), sets status to `NEW`, sets IT Priority to `MEDIUM`, and timestamps.
- **Headers:**
  - `Content-Type: application/json`
  - `X-Requester-Id: <number>` (Required)

#### Request Body Schema:
| Field | Type | Required | Validation Constraints |
|---|---|---|---|
| `categoryId` | `number` (integer) | Yes | Must match an active Category ID. |
| `relatedSystemId` | `number` (integer) | Yes | Must match an active RelatedSystem ID. |
| `requestedPriority` | `string` (enum) | Yes | One of: `"LOW"`, `"MEDIUM"`, `"HIGH"`, `"URGENT"`. Default: `"MEDIUM"`. |
| `summary` | `string` | Yes | 5 to 150 characters after whitespace trimming. |
| `description` | `string` | Yes | 10 to 2000 characters after whitespace trimming. |

#### Request Example:
```json
{
  "categoryId": 2,
  "relatedSystemId": 2,
  "requestedPriority": "MEDIUM",
  "summary": "Laptop battery drains quickly after latest OS update",
  "description": "The battery drops from 100% to 15% in less than 45 minutes even with low screen brightness and no heavy apps running. Started right after yesterday's patch."
}
```

#### Response `201 Created`:
```json
{
  "id": 101,
  "ticketNumber": "TKT-2026-000101",
  "summary": "Laptop battery drains quickly after latest OS update",
  "description": "The battery drops from 100% to 15% in less than 45 minutes even with low screen brightness and no heavy apps running. Started right after yesterday's patch.",
  "requestedPriority": "MEDIUM",
  "itPriority": "MEDIUM",
  "currentStatus": "NEW",
  "ticketOwner": null,
  "resolutionSummary": null,
  "requesterId": 1,
  "categoryId": 2,
  "category": { "id": 2, "name": "Hardware" },
  "relatedSystemId": 2,
  "relatedSystem": { "id": 2, "name": "Corporate Laptop" },
  "createdAt": "2026-08-25T23:30:00.000Z",
  "updatedAt": "2026-08-25T23:30:00.000Z"
}
```

#### Error Responses:
- **`400 Bad Request` / `422 Unprocessable Entity`:**
  ```json
  {
    "error": "Validation failed",
    "details": [
      "Summary must be between 5 and 150 characters",
      "Invalid categoryId provided"
    ]
  }
  ```
- **`401 Unauthorized`:** Missing `X-Requester-Id` header.
- **`403 Forbidden`:** Requester is inactive.

---

### 3.2. List Requester Tickets (Search, Filter, Sort, Paginate)
- **Path:** `GET /api/tickets`
- **Description:** Retrieves paginated tickets owned strictly by the active requester. Supports multi-field filtering, full-text search, and sorting.
- **Headers:**
  - `X-Requester-Id: <number>` (Required)

#### Query Parameters:
| Parameter | Type | Default | Description |
|---|---|---|---|
| `page` | `integer` | `1` | 1-based page index. |
| `pageSize` | `integer` | `10` | Number of records per page (max `50`). |
| `search` | `string` | `""` | Case-insensitive substring match against `ticketNumber` or `summary`. |
| `categoryId` | `integer` | (optional) | Filter by Category ID. |
| `requestedPriority` | `string` | (optional) | Filter by Requested Priority (`LOW`, `MEDIUM`, `HIGH`, `URGENT`). |
| `itPriority` | `string` | (optional) | Filter by IT Priority (`LOW`, `MEDIUM`, `HIGH`, `URGENT`). |
| `status` | `string` | (optional) | Filter by Current Status (`NEW`, `OPEN`, `IN_PROGRESS`, `PENDING`, `RESOLVED`, `CLOSED`). |
| `sortBy` | `string` | `"createdAt"` | Sort field: `"createdAt"`, `"updatedAt"`, `"ticketNumber"`, `"requestedPriority"`. |
| `sortOrder` | `string` | `"desc"` | Sort direction: `"asc"` or `"desc"`. |

#### Request Example:
```http
GET /api/tickets?page=1&pageSize=10&search=battery&categoryId=2&sortBy=createdAt&sortOrder=desc
X-Requester-Id: 1
```

#### Response `200 OK`:
```json
{
  "data": [
    {
      "id": 101,
      "ticketNumber": "TKT-2026-000101",
      "summary": "Laptop battery drains quickly after latest OS update",
      "requestedPriority": "MEDIUM",
      "itPriority": "MEDIUM",
      "currentStatus": "NEW",
      "ticketOwner": null,
      "categoryId": 2,
      "categoryName": "Hardware",
      "relatedSystemId": 2,
      "relatedSystemName": "Corporate Laptop",
      "attachmentCount": 2,
      "createdAt": "2026-08-25T23:30:00.000Z",
      "updatedAt": "2026-08-25T23:30:00.000Z"
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

#### Error Responses:
- **`400 Bad Request`:** Invalid query parameters (e.g. `page=0` or invalid enum).
- **`401 Unauthorized`:** Missing `X-Requester-Id` header.

---

### 3.3. Get Single Ticket Detail
- **Path:** `GET /api/tickets/:id`
- **Description:** Retrieves full ticket metadata and associated attachments for a single ticket. Enforces ownership: only returns data if `ticket.requesterId == X-Requester-Id`.
- **Headers:**
  - `X-Requester-Id: <number>` (Required)

#### Response `200 OK`:
```json
{
  "id": 101,
  "ticketNumber": "TKT-2026-000101",
  "summary": "Laptop battery drains quickly after latest OS update",
  "description": "The battery drops from 100% to 15% in less than 45 minutes even with low screen brightness and no heavy apps running. Started right after yesterday's patch.",
  "requestedPriority": "MEDIUM",
  "itPriority": "MEDIUM",
  "currentStatus": "NEW",
  "ticketOwner": null,
  "resolutionSummary": null,
  "requesterId": 1,
  "requester": {
    "id": 1,
    "name": "Jennifer Anderson",
    "email": "jennifer.anderson@kmutt.ac.th",
    "department": "Computer Engineering"
  },
  "categoryId": 2,
  "category": { "id": 2, "name": "Hardware" },
  "relatedSystemId": 2,
  "relatedSystem": { "id": 2, "name": "Corporate Laptop" },
  "attachments": [
    {
      "id": 501,
      "originalFileName": "battery-report.pdf",
      "fileSize": 1258291,
      "mimeType": "application/pdf",
      "isRemoved": false,
      "removedAt": null,
      "removalReason": null,
      "createdAt": "2026-08-25T23:32:00.000Z"
    },
    {
      "id": 502,
      "originalFileName": "old-screenshot.png",
      "fileSize": 460800,
      "mimeType": "image/png",
      "isRemoved": true,
      "removedAt": "2026-08-25T23:35:00.000Z",
      "removalReason": "Uploaded duplicate file by mistake",
      "createdAt": "2026-08-25T23:32:00.000Z"
    }
  ],
  "createdAt": "2026-08-25T23:30:00.000Z",
  "updatedAt": "2026-08-25T23:35:00.000Z"
}
```

#### Error Responses:
- **`401 Unauthorized`:** Missing `X-Requester-Id`.
- **`403 Forbidden` / `404 Not Found`:** Ticket belongs to another Requester or does not exist. (Returns generic `404 Not Found` or `403 Forbidden` with `"Access denied"`).

---

## 4. Attachment Management Endpoints

### 4.1. Upload Attachment to Ticket
- **Path:** `POST /api/tickets/:id/attachments`
- **Description:** Uploads a supporting file to an existing ticket owned by the requester.
- **Headers:**
  - `Content-Type: multipart/form-data`
  - `X-Requester-Id: <number>` (Required)
- **Form Data:**
  - `file`: Binary file data.

#### Validation Constraints:
1. **Ownership:** Requester must own `ticketId = :id`.
2. **MIME Type:** Must be one of `image/jpeg`, `image/png`, `image/webp`, `application/pdf`.
3. **Size Limit:** Max 5 MB (5,242,880 bytes).
4. **Active Limit:** Active attachments count for this ticket must be `< 5`.

#### Response `201 Created`:
```json
{
  "id": 503,
  "ticketId": 101,
  "originalFileName": "battery-stats.png",
  "fileSize": 460800,
  "mimeType": "image/png",
  "isRemoved": false,
  "createdAt": "2026-08-25T23:40:00.000Z"
}
```

#### Error Responses:
- **`403 Forbidden`:** Requester does not own this ticket.
- **`413 Payload Too Large`:** File exceeds 5 MB.
- **`415 Unsupported Media Type`:** File type is not permitted.
- **`422 Unprocessable Entity`:** Ticket already has 5 active attachments.

---

### 4.2. Download Active Attachment
- **Path:** `GET /api/attachments/:id/download`
- **Description:** Streams the raw binary content of an active attachment file.
- **Headers:**
  - `X-Requester-Id: <number>` (Required)
- **Response `200 OK`:**
  - `Content-Type: <mimeType>`
  - `Content-Disposition: attachment; filename="<originalFileName>"`
  - `Content-Length: <fileSize>`
  - Binary payload.

#### Error Responses:
- **`401 Unauthorized`:** Missing `X-Requester-Id`.
- **`403 Forbidden`:** Requester does not own the associated ticket.
- **`404 Not Found`:** Attachment ID does not exist.
- **`410 Gone` (or `403 Forbidden`):**
  ```json
  {
    "error": "Attachment has been removed and is no longer available for download."
  }
  ```

---

### 4.3. Soft-Remove Attachment
- **Path:** `PATCH /api/attachments/:id/soft-remove`
- **Description:** Marks an attachment as removed, records `removedAt` and stores the mandatory audit reason. Does not delete file metadata or database row.
- **Headers:**
  - `Content-Type: application/json`
  - `X-Requester-Id: <number>` (Required)

#### Request Body Schema:
```json
{
  "removalReason": "Uploaded incorrect log file"
}
```
*Validation: `removalReason` is required and must be between 3 and 255 characters.*

#### Response `200 OK`:
```json
{
  "id": 501,
  "ticketId": 101,
  "originalFileName": "battery-report.pdf",
  "isRemoved": true,
  "removedAt": "2026-08-25T23:45:00.000Z",
  "removalReason": "Uploaded incorrect log file"
}
```

#### Error Responses:
- **`400 Bad Request` / `422 Unprocessable Entity`:** Missing or invalid `removalReason`.
- **`403 Forbidden`:** Requester does not own the ticket containing this attachment.
- **`404 Not Found`:** Attachment ID does not exist.
- **`409 Conflict`:** Attachment is already soft-removed.
