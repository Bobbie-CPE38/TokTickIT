# TokTickIT Zen Green UI Specification (Lab 3)

## 1. Overview and Design System Principles
TokTickIT strictly implements the **Zen Green** design language, emphasizing clarity, professional IT service aesthetics, purposeful visual hierarchy, high contrast, and accessible interaction patterns. Sprint 3 extends the UI foundation established in Lab 2 to support real user authentication, mandatory first-login password changes, a shared IT Staff Ticket Queue, an operational IT Staff Ticket Detail view, public/internal communication separation, and a minimalist Administrator User Management console.

All screens, components, and interactive states must integrate seamlessly into a single, cohesive user experience without presenting conflicting visual styles.

---

## 2. Design Tokens and Visual Language

### 2.1. Color Palette

| Token / Element | Hex Code | Usage & Placement Rules |
|---|---|---|
| **Primary Green** | `#006B3C` | Application header bar, primary CTA buttons (`Sign In`, `Continue`, `Save User`, `+ Create Ticket`), brand accents. |
| **Secondary Green** | `#0B7A46` | Active navigation tabs, interactive links, focus outlines, button hover states. |
| **Pale Green** | `#EAF6EF` | Selected table rows, success callout backgrounds, badge backgrounds, subtle container headers. |
| **Page Background** | `#F5F7F6` | Global page backdrop; clean, neutral, near-white tone. |
| **Surface / Card** | `#FFFFFF` | Main form cards, modal dialogs, slide-over drawers, data tables, and detail panels. |
| **Surface Border** | `#E2E8F0` | Clean structural dividers, card borders, and table gridlines. |
| **Text Primary** | `#1C2D27` | Dark charcoal-green for body text, headers, and high-readability labels (never pure `#000000`). |
| **Text Muted** | `#52665D` | Helper text, secondary timestamps, table column headers, and breadcrumb trails. |
| **Editable Field** | `#FFFFFF` | Background for active inputs, dropdowns, and textareas; border `#D1D5DB`. |
| **Read-Only Field** | `#F3F6F4` | Soft gray-green shading for non-editable ticket fields; border `#E2E8F0`. |
| **Internal Note Border** | `#F59E0B` | Warm amber border emphasizing private internal operational notes. |
| **Internal Note Background**| `#FFFBEB` | Light amber tint for internal notes panel to clearly differentiate from public comments. |
| **Error Primary** | `#991B1B` | Field validation error text and icons; border `#EF4444`; background `#FEE2E2`. |
| **Warning Primary** | `#B45309` | Warning banners, cautionary alerts, Medium priority badges; background `#FEF3C7`. |
| **Success Primary** | `#065F46` | Success alerts, submission confirmation banners, Low priority badges; background `#D1FAE5`. |

---

### 2.2. Badge Palette

#### Role Badges
```
[ Requester ]     Text: #1E40AF | Background: #DBEAFE | Border: #93C5FD
[ IT Staff ]      Text: #0B7A46 | Background: #EAF6EF | Border: #A7F3D0
[ Administrator ] Text: #6D28D9 | Background: #EDE9FE | Border: #DDD6FE
```

#### Ticket Status Badges
```
[ New ]                    Text: #1E40AF | Background: #DBEAFE | Border: #93C5FD
[ Open ]                   Text: #0D9488 | Background: #CCFBF1 | Border: #5EEAD4
[ In Progress ]            Text: #0B7A46 | Background: #EAF6EF | Border: #A7F3D0
[ Waiting for Requester ]  Text: #D97706 | Background: #FEF3C7 | Border: #FDE68A
[ Resolved ]               Text: #059669 | Background: #D1FAE5 | Border: #6EE7B7
[ Closed ]                 Text: #4B5563 | Background: #F3F4F6 | Border: #D1D5DB
[ Reopened ]               Text: #C026D3 | Background: #FAE8FF | Border: #F5D0FE
[ Cancelled ]              Text: #6B7280 | Background: #F3F4F6 | Border: #E5E7EB
```

#### Ticket Priority Badges
```
[ Low ]      Text: #059669 | Background: #D1FAE5 | Border: #A7F3D0
[ Medium ]   Text: #D97706 | Background: #FEF3C7 | Border: #FDE68A
[ High ]     Text: #DC2626 | Background: #FEE2E2 | Border: #FCA5A5
[ Urgent ]   Text: #991B1B | Background: #FCA5A5 | Border: #F87171
```

#### User Account Status Badges
```
[ Active ]   Text: #059669 | Background: #D1FAE5 | Border: #6EE7B7
[ Inactive ] Text: #DC2626 | Background: #FEE2E2 | Border: #FCA5A5
```

---

### 2.3. Typography and Elevation
- **Font Family:** `Inter`, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif.
- **Font Sizes:**
  - `H1`: 24px (1.5rem), Semibold (600), Line-height 1.3
  - `H2`: 20px (1.25rem), Semibold (600), Line-height 1.35
  - `H3`: 16px (1.0rem), Semibold (600), Line-height 1.4
  - `Body`: 14px (0.875rem), Regular (400), Line-height 1.5
  - `Small / Caption`: 12px (0.75rem), Regular (400) or Medium (500), Line-height 1.4
- **Card Shadow:** `0 1px 3px 0 rgba(0, 0, 0, 0.08), 0 1px 2px -1px rgba(0, 0, 0, 0.05)`
- **Modal & Drawer Shadow:** `0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)`

---

## 3. Component Hierarchy and States

### 3.1. Button Hierarchy
1. **Primary Action (`btn-primary`):**
   - Background: `#006B3C` | Hover: `#00522E` | Text: `#FFFFFF` | Border: None | Height: 38px | Radius: 6px.
   - Usage: `Sign In`, `Continue`, `Save User`, `+ Create Ticket`, `Claim Ticket`, `Post Comment`.
2. **Secondary Action (`btn-secondary`):**
   - Background: `#FFFFFF` | Hover: `#F5F7F6` | Text: `#006B3C` | Border: `1px solid #006B3C` | Radius: 6px.
   - Usage: `Clear Filters`, `Cancel`, `Back to Queue`, `Download`.
3. **Destructive Action (`btn-danger`):**
   - Background: `#FFFFFF` | Hover: `#FEE2E2` | Text: `#DC2626` | Border: `1px solid #EF4444` | Radius: 6px.
   - Usage: `Deactivate User`, `Remove Attachment`.
4. **Disabled State:**
   - Background: `#E5E7EB` | Text: `#9CA3AF` | Border: `1px solid #D1D5DB` | Cursor: `not-allowed`.
5. **Busy / Submitting State:**
   - Displays an inline spinning SVG indicator alongside active progress text (e.g., "Signing In…", "Saving…"). Button is locked (`disabled = true`) to prevent multiple clicks.

### 3.2. Form Control States
- **Default:** Background `#FFFFFF`, border `1px solid #D1D5DB`, border-radius `6px`, padding `8px 12px`, text `#1C2D27`.
- **Focus:** Border `#0B7A46`, outline `none`, box-shadow `0 0 0 3px rgba(11, 122, 70, 0.2)`.
- **Invalid / Error:** Border `#EF4444`, box-shadow `0 0 0 3px rgba(239, 68, 68, 0.15)`. Inline error text rendered directly below the input in `#991B1B`.
- **Read-Only:** Shaded background `#F3F6F4`, border `1px solid #E2E8F0`, text `#1C2D27`, cursor `default`.
- **Required Indicator:** Required fields display a red asterisk `<span className="text-red-500">*</span>` immediately adjacent to the label.

---

## 4. Application Shell and Navigation

```
+-----------------------------------------------------------------------------------------------+
| (o) TokTickIT        [ My Queue ]    [ + Create Ticket ]                 [ Michael Brown v ]  |
|                                                                          | Role: IT Staff  |  |
|                                                                          | Change Password |  |
|                                                                          | Sign Out        |  |
+-----------------------------------------------------------------------------------------------+
```

### 4.1. Header Bar Conventions
- **Branding:** Left-aligned TokTickIT logo with white/green branding text.
- **Role-Aware Navigation Tabs:**
  - **Requester Navigation:**
    - `My Tickets` (`/tickets`)
    - `+ Create Ticket` (`/tickets/new`)
  - **IT Staff Navigation:**
    - `My Queue` (`/queue`)
    - `+ Create Ticket` (`/tickets/new`)
  - **Administrator Navigation:**
    - `Admin` (`/admin/users`)
- **User Profile Dropdown (Top-Right):**
  - Displays authenticated user's full name alongside their Role badge.
  - Dropdown options:
    - User details overview (Email, Role).
    - `Change Password` (navigates to `/change-password`).
    - `Sign Out` (calls logout endpoint, clears state, redirects to `/login`).

---

## 5. Screen Wireframes and Interaction Specifications

### 5.1. Screen 1: Login Screen (`/login`)

```
+--------------------------------------------------------------------+
|                           (o) TokTickIT                            |
|                                                                    |
|    +----------------------------------------------------------+    |
|    |  Sign in to your account                                 |    |
|    |                                                          |    |
|    |  Email address *                                         |    |
|    |  [ janderson@toktickit.com                             ] |    |
|    |                                                          |    |
|    |  Password *                                              |    |
|    |  [ **********                                      (o) ] |    |
|    |                                                          |    |
|    |  (!) Invalid email or password. Please try again.        |    |
|    |                                                          |    |
|    |  [                     Sign In                         ] |    |
|    |                                                          |    |
|    |  Forgot your password? (Contact your administrator)      |    |
|    +----------------------------------------------------------+    |
+--------------------------------------------------------------------+
```

#### Functional & Visual Rules:
- **Card Placement:** Centered horizontally and vertically in viewport against `#F5F7F6` backdrop; card width `420px`.
- **Controls:**
  - `Email address`: Standard text input with email validation regex.
  - `Password`: Masked input with right-aligned toggle icon to show/hide plaintext.
  - `Sign In`: Full-width Primary Button. When clicked, transitions to busy spinner with "Signing In…".
- **Error Feedback:**
  - Invalid credentials show safe error banner in `#991B1B` on `#FEE2E2` background: *"Invalid email or password. Please try again."*
  - Inactive user attempt shows safe alert: *"Account is inactive. Please contact your system administrator."*
  - Input field values remain preserved on failure so user does not have to retype their email.

---

### 5.2. Screen 2: Mandatory Change Password Screen (`/change-password`)

```
+--------------------------------------------------------------------+
|                           (o) TokTickIT                            |
|                                                                    |
|    +----------------------------------------------------------+    |
|    |  Change Your Password                                    |    |
|    |  You must change your password to continue.              |    |
|    |                                                          |    |
|    |  Current (temporary) password *                          |    |
|    |  [ ******                                          (o) ] |    |
|    |                                                          |    |
|    |  New password *                                          |    |
|    |  [ **********                                      (o) ] |    |
|    |                                                          |    |
|    |  Confirm new password *                                  |    |
|    |  [ **********                                      (o) ] |    |
|    |                                                          |    |
|    |  Password must:                                          |    |
|    |  [v] Be at least 8 characters                            |    |
|    |  [v] Include upper and lower case letters                |    |
|    |  [v] Include a number and a special character            |    |
|    |                                                          |    |
|    |  [                     Continue                        ] |    |
|    +----------------------------------------------------------+    |
+--------------------------------------------------------------------+
```

#### Functional & Visual Rules:
- **Interceptor Guard:** Rendered immediately after authentication when `mustChangePassword = true`. Standard application navigation header is hidden or locked.
- **Interactive Checklist:**
  - The three criteria update live in green (`#059669`) with checkmark `✓` when satisfied, or muted gray (`#52665D`) with circle `○` when unmet.
- **Confirmation Match:** If "Confirm new password" does not match "New password", an inline validation error displays: *"Passwords do not match."*
- **Action:** Clicking "Continue" sends `POST /api/auth/change-password`. Upon success, sets `mustChangePassword = false` in session and transitions into the main application.

---

### 5.3. Screen 3: Requester Ticket Detail & Public Comments (`/tickets/:id`)

```
+-----------------------------------------------------------------------------------------------+
| My Tickets > Ticket Detail                                              [<- Back to My Tickets]
|                                                                                               |
| [ Ticket No: TKT-2026-001234 ]  [ Status: In Progress ]  [ Priority: High ]                   |
|                                                                                               |
| +-------------------------------------------------------------------------------------------+ |
| | (!) Problem appears resolved?                                     [ Mark as Resolved ]    | |
| | Let IT know if this issue has been fixed for you.                                         | |
| +-------------------------------------------------------------------------------------------+ |
|                                                                                               |
| Category: Hardware             Related System: Corporate Laptop    Created: May 12, 2026      |
| Summary: Laptop battery drains quickly                                                        |
| Description: My laptop battery drains much faster than usual even when idle...                |
|                                                                                               |
| --------------------------------------------------------------------------------------------- |
| [ Public Comments (3) ]   [ Attachments (2) ]                                                 |
|                                                                                               |
| +-------------------------------------------------------------------------------------------+ |
| | Add Public Comment                                                                        | |
| | [ Type your comment here...                                                             ] | |
| |                                                                        [ Post Comment ]   | |
| +-------------------------------------------------------------------------------------------+ |
|                                                                                               |
| (JA) Jennifer Anderson [ Requester ]                                       May 13, 2026 11:45 AM|
|      Thank you for the update. Please let me know if you need any additional information.   |
|                                                                                               |
| (MB) Michael Brown [ IT Staff ]                                            May 13, 2026 10:30 AM|
|      We are investigating the issue on your device. We'll update you shortly.               |
+-----------------------------------------------------------------------------------------------+
```

#### Functional & Visual Rules:
- **Resolution Indicator Banner:** If `isRequesterResolved = false` and ticket status is `OPEN`, `IN_PROGRESS`, or `WAITING_FOR_REQUESTER`, display a pale green prompt card with button: `Mark as Resolved`. Clicking displays confirmation modal, sets `isRequesterResolved = true`, and updates banner to *"You marked this problem as resolved. IT Staff will confirm and close the ticket."*
- **Public Comments Tab:**
  - Displays chronological discussion entries with author initials avatar, full name, role badge, and human-formatted timestamp.
  - New comment form includes character counter (`0 / 2000`) and "Post Comment" button with busy spinner.
- **Isolation Protection:** Requesters have zero visual controls for Internal Notes or IT assignment.

---

### 5.4. Screen 4: IT Staff Ticket Queue (`/queue`)

```
+-----------------------------------------------------------------------------------------------+
| (o) TokTickIT        [ My Queue ]    [ + Create Ticket ]                 [ Michael Brown v ]  |
+-----------------------------------------------------------------------------------------------+
|                                                                                               |
| [ Q Search by ticket number or summary...              ]                     [ = Filters v ]  |
|                                                                                               |
| Showing 1 to 10 of 87 tickets                                                                 |
| +-------------------------------------------------------------------------------------------+ |
| | Ticket No ^ | Created Date | Summary           | Category | Req. Prio | IT Prio | Status | Owner       |
| +-------------------------------------------------------------------------------------------+ |
| | TKT-001234  | May 13 09:14 | Battery drains    | Hardware | [Medium]  | [Medium]| [In Prog]| Michael B.  |
| | TKT-001233  | May 12 08:02 | Cannot connect VPN| Network  | [High]    | [High]  | [Open]   | Sarah J.    |
| | TKT-001232  | May 11 04:45 | Email not syncing | Software | [Medium]  | [Medium]| [Wait Req| David L.    |
| | TKT-001231  | May 11 11:30 | New employee setup| Access   | [Low]     | [Low]   | [Resolved Jennifer A.  |
| | TKT-001230  | May 10 02:10 | Printer offline   | Hardware | [Medium]  | [Low]   | [Open]   | Unassigned  |
| +-------------------------------------------------------------------------------------------+ |
|                                                                                               |
|                                  [ < Previous ] [ 1 ] [ 2 ] [ 3 ] ... [ 9 ] [ Next > ]        |
+-----------------------------------------------------------------------------------------------+
```

#### Functional & Visual Rules:
- **Search Bar:** Real-time debounce (300ms) or submit-on-enter search matching Ticket Number or Summary substring.
- **Filter Dropdown Drawer:** Expandable panel allowing selection of:
  - `Category` (All, Hardware, Software, Network, Account and Access)
  - `IT Priority` (All, Low, Medium, High, Urgent)
  - `Status` (All, New, Open, In Progress, Waiting for Requester, Resolved, Closed, Reopened, Cancelled)
  - `Ownership` (All, My Assigned Tickets, Unassigned, Specific IT Staff)
- **Table Columns & Sorting:** Clickable headers for `Ticket No`, `Created Date`, `IT Priority`, and `Status` toggle sort direction (`asc`/`desc`).
- **Row Interaction:** Clicking anywhere on a table row navigates directly to the IT Staff Ticket Detail (`/queue/:id`).
- **Mobile Responsive Transformation:** At viewports `< 768px`, table transforms into stacked cards displaying Ticket No, Summary, Badges, and Owner.

---

### 5.5. Screen 5: IT Staff Ticket Detail (`/queue/:id`)

```
+-----------------------------------------------------------------------------------------------+
| My Queue > Ticket Detail                                                  [ <- Back to Queue ]|
|                                                                                               |
| +-------------------------------------------------------------------------------------------+ |
| | Ticket No: TKT-2026-001234         Category: Hardware           Related System: Corp Laptop| |
| | Requester: Jennifer Anderson       Req. Priority: [ Medium ]     Current Status:           | |
| |                                                                 [ In Progress         v ] | |
| | Ticket Owner:                      IT Priority:                                           | |
| | [ Michael Brown (IT Support) v ]   [ Medium             v ]                               | |
| +-------------------------------------------------------------------------------------------+ |
|                                                                                               |
| Summary:                                                                                      |
| [ Laptop battery drains quickly                                                            ]  |
|                                                                                               |
| Description:                                                                                  |
| [ My laptop battery is draining much faster than usual even when the system is idle.       ]  |
|                                                                                               |
| Resolution Summary: (Required when resolving or closing)                                      |
| [ Add resolution summary (visible to requester)...                                         ]  |
|                                                                                               |
| --------------------------------------------------------------------------------------------- |
| [ Public Comments (3) ]   [ (!) Internal Notes (2) ]   [ Attachments (2) ]                    |
|                                                                                               |
| +-------------------------------------------------------------------------------------------+ |
| | (!) Internal Notes are visible ONLY to IT Staff and Administrators.                       | |
| | [ Add internal operational note...                                                      ] | |
| |                                                                   [ Save Internal Note ]  | |
| +-------------------------------------------------------------------------------------------+ |
|                                                                                               |
| [MB] Michael Brown [ IT Staff ]                                            May 13, 2026 10:45 AM|
|      Battery health report indicates cycle count 850. Ordering replacement part.             |
+-----------------------------------------------------------------------------------------------+
```

#### Functional & Visual Rules:
- **Editable Operational Fields:**
  - `Ticket Owner`: Dropdown with option to "Claim Ticket" or assign to any active IT Staff / Administrator.
  - `IT Priority`: Dropdown selector (`Low`, `Medium`, `High`, `Urgent`).
  - `Current Status`: Dropdown showing only valid permitted transitions based on the current state.
- **Resolution Summary Requirement:** When status is changed to `Resolved` or `Closed`, the `Resolution Summary` input is highlighted as required; saving without at least 5 characters is blocked.
- **Tabs:**
  - `Public Comments`: Shared communication with Requester.
  - `Internal Notes`: Emphasized with warm amber border (`#F59E0B`), amber tint (`#FFFBEB`), and warning badge to prevent accidental public disclosure of confidential notes.
  - `Attachments`: View, download active files, soft-remove files.

---

### 5.6. Screen 6: Administrator User Management (`/admin/users`)

```
+-----------------------------------------------------------------------------------------------+
| (o) TokTickIT        [ Admin ]                                            [ John Smith v ]    |
+-----------------------------------------------------------------------------------------------+
|                                                                                               |
| Users                                                                       [ + Create User ] |
|                                                                                               |
| [ Q Search users by name or email...                 ]                       [ = Filters v ]  |
|                                                                                               |
| +-------------------------------------------------------------------------------------------+ |
| | Name ^                 | Email                      | Role             | Status   | Action| |
| +-------------------------------------------------------------------------------------------+ |
| | Jennifer Anderson      | janderson@toktickit.com    | [ Requester ]    | [Active] | [Edit]| |
| | Michael Brown          | mbrown@toktickit.com       | [ IT Staff ]     | [Active] | [Edit]| |
| | Sarah Johnson          | sjohnson@toktickit.com     | [ IT Staff ]     | [Active] | [Edit]| |
| | David Lee              | dlee@toktickit.com         | [ IT Staff ]     | [Active] | [Edit]| |
| | Kevin Patel            | kpatel@toktickit.com       | [ IT Staff ]     | [Inactiv]| [Edit]| |
| | John Smith             | admin@toktickit.com        | [ Administrator] | [Active] | [Edit]| |
| +-------------------------------------------------------------------------------------------+ |
|                                                                                               |
+-----------------------------------------------------------------------------------------------+
```

#### User Creation / Edit Side-Drawer Modal:

```
+---------------------------------------------------------------+
| Create New User / Edit User                               [X] |
|                                                               |
| Full Name *                                                   |
| [ Alex Thompson                                             ] |
|                                                               |
| Email Address *                                               |
| [ alex.thompson@toktickit.com                               ] |
|                                                               |
| Role *                                                        |
| [ IT Staff                                                v ] |
|                                                               |
| Active Status                                                 |
| [ (o) Yes ]   [ ( ) No ]                                      |
|                                                               |
| Initial Password                                              |
| [ TempPass123!                                            (o) ]
| [x] User must change password on first login                  |
|                                                               |
| ------------------------------------------------------------- |
| [                     Save User                             ] |
|                                                               |
| [                  Deactivate User                          ] |
|                                                               |
| [                       Cancel                              ] |
+---------------------------------------------------------------+
```

#### Functional & Visual Rules:
- **List Interaction:** Search input filters rows by Name or Email. Role filter dropdown (`All`, `Requester`, `IT Staff`, `Administrator`).
- **Safety Guards:**
  - When editing own administrator account: "Active Status" toggle is disabled, and "Deactivate User" button is disabled with tooltip: *"You cannot deactivate your own account."*
  - When editing the last remaining active Administrator: Role dropdown does not allow changing to non-admin, and Deactivation is disabled with tooltip: *"System requires at least one active Administrator."*
  - Duplicate email error renders directly under the Email field in `#991B1B`.
  - No user deletion action is provided in the UI.

---

## 6. Component States and Feedback System

### 6.1. Visual Feedback States
- **Loading / Skeleton State:** Data tables and detail cards display shimmering placeholder skeletons (`bg-gray-200 animate-pulse`) during API requests.
- **Empty State:** Clean card illustration with message: *"No tickets found"* and secondary prompt.
- **No-Results State:** When search/filter yields zero results, displays: *"No items match your active filters"* with a convenient `[ Clear Filters ]` button.
- **Forbidden State (403):** Displays Zen Green error screen: *"Access Denied — You do not have permission to view this resource"* with a button to return home.
- **Not Found State (404):** Displays *"Resource Not Found — The requested ticket or user does not exist."*

---

## 7. Responsive Breakpoints and Touch Targets

| Viewport | Range | Layout Adaptations |
|---|---|---|
| **Desktop** | `≥ 992px` | Multi-column table layout, full side-drawer on Admin screen, 4-column metadata grid on Ticket Detail. |
| **Tablet** | `768px – 991px` | 2-column detail grid, responsive table with scroll or selective column condensation, modal overlays. |
| **Mobile** | `< 768px` | Single-column stacked cards instead of tables, full-screen drawers/modals, bottom-docked action bars. |

- **Touch Targets:** All clickable interactive elements (buttons, dropdown triggers, pagination links) have a minimum height of **44px** on mobile viewports.
- **Horizontal Overflow:** Strict `overflow-x: hidden` on viewport roots to prevent horizontal document scrollbars.

---

## 8. Accessibility Standards (WCAG 2.1 AA)
1. **Contrast Ratio:** Text-to-background contrast ratio exceeds 4.5:1 for normal text (`#1C2D27` on `#FFFFFF` has contrast > 11:1).
2. **Keyboard Navigation:** Full tab indexing across all form fields, custom toggles, drawers, and modal dialogs. Modals trap keyboard focus and dismiss on `Escape`.
3. **Form Labels:** Every input control links explicitly to a `<label>` element with a unique `id` and `htmlFor`.
4. **Color Independence:** Status and priority values are communicated via clear text labels in addition to badge background colors.
