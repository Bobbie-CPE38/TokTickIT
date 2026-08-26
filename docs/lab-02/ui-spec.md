# TokTickIT Zen Green UI Specification (Lab 2)

## 1. Overview and Design System Principles
TokTickIT utilizes the **Zen Green** design language, emphasizing clarity, professional aesthetics, restrained elevation, high visual contrast, and purpose-driven color application. This specification defines all UI conventions, tokens, screen layouts, responsive behaviors, component states, and accessibility standards for the Requester Ticketing MVP in Lab 2.

---

## 2. Design Tokens and Visual Language

### 2.1. Color Palette

| Token / Element | Hex Code | Usage & Placement Rules |
|---|---|---|
| **Primary Green** | `#006B3C` | Application header, primary CTA buttons (`+ Create Ticket`, `Submit Ticket`), prominent headings. |
| **Secondary Green** | `#0B7A46` | Active navigation tabs, interactive links, focus outlines, button hover states. |
| **Pale Green** | `#EAF6EF` | Selected table rows, success callout backgrounds, badge backgrounds, subtle container headers. |
| **Page Background** | `#F5F7F6` | Global page backdrop; clean, near-white neutral tone. |
| **Surface / Card** | `#FFFFFF` | Form containers, modal dialogs, ticket table, and detail inspection panels. |
| **Surface Border** | `#E2E8F0` | Subtle, clean borders for cards, dividers, and tables. |
| **Text Primary** | `#1C2D27` | Dark charcoal-green for body text, headers, and high-readability labels (never pure `#000000`). |
| **Text Muted** | `#52665D` | Secondary descriptions, timestamps, table column headers, and helper text. |
| **Editable Field** | `#FFFFFF` | Background for active inputs, dropdowns, and textareas; border `#D1D5DB`. |
| **Read-Only Field** | `#F3F6F4` | Soft gray-green shading for non-editable ticket details (distinct from white editable inputs). |
| **Error Primary** | `#991B1B` | Field validation error text and icons; border `#EF4444`; background `#FEE2E2`. |
| **Warning Primary** | `#B45309` | Warning banners, cautionary alerts, Medium priority badges; background `#FEF3C7`. |
| **Success Primary** | `#065F46` | Success alerts, submission confirmation banners, Low priority badges; background `#D1FAE5`. |

### 2.2. Badge and Status Palette

```
[ New ]         Text: #1E40AF | Background: #DBEAFE | Border: #93C5FD
[ Open ]        Text: #0D9488 | Background: #CCFBF1 | Border: #5EEAD4
[ In Progress ] Text: #0B7A46 | Background: #EAF6EF | Border: #A7F3D0
[ Pending ]     Text: #D97706 | Background: #FEF3C7 | Border: #FDE68A
[ Resolved ]    Text: #059669 | Background: #D1FAE5 | Border: #6EE7B7
[ Closed ]      Text: #4B5563 | Background: #F3F4F6 | Border: #D1D5DB

[ Low ]         Text: #059669 | Background: #D1FAE5 | Border: #A7F3D0
[ Medium ]      Text: #D97706 | Background: #FEF3C7 | Border: #FDE68A
[ High ]        Text: #DC2626 | Background: #FEE2E2 | Border: #FCA5A5
[ Urgent ]      Text: #991B1B | Background: #FCA5A5 | Border: #F87171
```

### 2.3. Typography and Elevation
- **Font Family:** `Inter`, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif.
- **Font Sizes:**
  - `H1`: 24px (1.5rem), Semibold (600), Line-height 1.3
  - `H2`: 20px (1.25rem), Semibold (600), Line-height 1.35
  - `H3`: 16px (1.0rem), Semibold (600), Line-height 1.4
  - `Body`: 14px (0.875rem), Regular (400), Line-height 1.5
  - `Small / Caption`: 12px (0.75rem), Regular (400) or Medium (500), Line-height 1.4
- **Card Shadow:** `0 1px 3px 0 rgba(0, 0, 0, 0.08), 0 1px 2px -1px rgba(0, 0, 0, 0.05)`
- **Modal Shadow:** `0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)`

---

## 3. Component Hierarchy and States

### 3.1. Button Hierarchy
1. **Primary Button:**
   - Background: `#006B3C` | Hover: `#00522E` | Text: `#FFFFFF` | Border: None | Height: 38px | Radius: 6px.
   - Usage: Primary actions (`+ Create Ticket`, `Submit Ticket`, `Continue`).
2. **Secondary Button:**
   - Background: `#FFFFFF` | Hover: `#F5F7F6` | Text: `#006B3C` | Border: 1px solid `#006B3C` | Radius: 6px.
   - Usage: `Clear Filters`, `Cancel`, `Download`.
3. **Destructive Button:**
   - Background: `#FFFFFF` | Hover: `#FEE2E2` | Text: `#DC2626` | Border: 1px solid `#EF4444` | Radius: 6px.
   - Usage: `Remove Attachment`.
4. **Disabled State:**
   - Background: `#E5E7EB` | Text: `#9CA3AF` | Border: 1px solid `#D1D5DB` | Cursor: `not-allowed`.
5. **Busy / Submitting State:**
   - Replaces icon/text with an animated spinning loader SVG + "Submitting…" text.
   - Button is locked (`disabled = true`) to prevent double clicks.

### 3.2. Form Control States
- **Default:** White background (`#FFFFFF`), border `1px solid #D1D5DB`, border radius `6px`, padding `8px 12px`, text `#1C2D27`.
- **Focus:** Border color `#0B7A46`, box-shadow `0 0 0 3px rgba(11, 122, 70, 0.2)`.
- **Invalid / Error:** Border color `#EF4444`, box-shadow `0 0 0 3px rgba(239, 68, 68, 0.15)`. Error text rendered directly beneath the input in `#991B1B`.
- **Read-Only / Disabled:** Shaded gray-green background (`#F3F6F4`), border `1px solid #E2E8F0`, text `#1C2D27`, cursor `default`.
- **Required Indicator:** Required fields display a red asterisk `<span className="text-red-500">*</span>` immediately after the label text.

---

## 4. Application Shell and Navigation

```
+-----------------------------------------------------------------------------------------------+
| (o) TokTickIT        [ My Tickets ]    [ + Create Ticket ]          [ Profile: Jennifer A. v ] |
+-----------------------------------------------------------------------------------------------+
```

### 4.1. Navigation Bar
- **App Brand:** Left-aligned logo mark with bold title `TokTickIT`.
- **Primary Nav Links:**
  - `My Tickets`: Active link underlined or highlighted with `#0B7A46`.
  - `+ Create Ticket`: Distinct action link.
- **User Identity & Selector Dropdown:**
  - Right-aligned profile badge displaying current Development Requester's name and department.
  - Clicking opens a menu with:
    - Current identity details (Name, Email, Dept).
    - "Switch Requester" action button to trigger requester selection modal.
- **Mobile Responsive Behavior (< 768px):**
  - Navigation links collapse into a hamburger menu or bottom bar.
  - Active requester name is always accessible.

---

## 5. Screen Layouts and Behaviors

### 5.1. Development Requester Selection Screen / Modal
- **Purpose:** Provide a simulated login/identity selector for Lab 2 development and testing.
- **Header:** User Avatar Icon + Title "Select Development Requester".
- **Notice Callout (Pale Green / Warning Amber):**
  > *“Select a Development Requester to test requester-specific ticket behavior. This is not a login screen. Authentication and role-based access will be introduced in Lab 3.”*
- **Form Controls:**
  - Dropdown select populated with active requesters fetched from `GET /api/requesters/active`. Format: `{Name} ({Department}) - {Email}`.
  - Helper note: *"Only active development requesters are shown."*
- **Actions:**
  - `Continue` (Primary Green button).
  - `Cancel` (Secondary button, enabled only if a requester is already selected).
- **States:**
  - *Loading:* Skeleton dropdown or centered spinner.
  - *Empty:* "No active development requesters found in database. Please run seed script."
  - *API Error:* Red alert banner with "Unable to load requesters" and a "Retry" button.

---

### 5.2. Create Ticket Screen (`/tickets/new`)

```
+-----------------------------------------------------------------------------------------------+
| My Tickets > Create Ticket                                                                    |
|                                                                                               |
|  Create New IT Support Ticket                                                                 |
|  Describe your issue and attach supporting evidence for the IT team.                         |
|                                                                                               |
|  +-----------------------------------------------------------------------------------------+  |
|  | Requester Name [ Jennifer Anderson                ]  Ticket Date [ Aug 25, 2026 11:15 PM ] |  |
|  +-----------------------------------------------------------------------------------------+  |
|                                                                                               |
|  Category *                          Related System *                                         |
|  [ Hardware                        v ]  [ Corporate Laptop                               v ]  |
|                                                                                               |
|  Requested Priority *                                                                         |
|  ( ) Low      (*) Medium      ( ) High      ( ) Urgent                                        |
|                                                                                               |
|  Summary * (5-150 characters)                                                                 |
|  [ Laptop battery drains quickly after latest OS update                                    ]  |
|  102/150 characters                                                                           |
|                                                                                               |
|  Description * (10-2000 characters)                                                           |
|  +-----------------------------------------------------------------------------------------+  |
|  | The battery drops from 100% to 15% in less than 45 minutes even with low screen           |  |
|  | brightness and no heavy apps running. Started right after yesterday's patch.            |  |
|  +-----------------------------------------------------------------------------------------+  |
|  168/2000 characters                                                                          |
|                                                                                               |
|  Supporting Attachments (Optional, max 5 files, 5 MB each, JPG, PNG, WEBP, PDF)               |
|  +-----------------------------------------------------------------------------------------+  |
|  |  [+] Drag & drop files here or [Browse Files]                                           |  |
|  +-----------------------------------------------------------------------------------------+  |
|  * battery-report.pdf (1.2 MB) [x]     * battery-stats.png (450 KB) [x]                      |
|                                                                                               |
|  [ Cancel ]                                                            [ Submit Ticket -> ]   |
+-----------------------------------------------------------------------------------------------+
```

#### Detailed Element Specifications:
1. **Requester Header Block:**
   - Requester name and current timestamp displayed in read-only styled cards (`#F3F6F4`).
2. **Category & System Selectors:**
   - Populated from `GET /api/categories` and `GET /api/related-systems`.
   - Placeholder option: *"Select Category"*, *"Select Related System"*.
3. **Requested Priority:**
   - Radio pill buttons or styled segment control: `Low` (Green), `Medium` (Amber), `High` (Red), `Urgent` (Dark Red). Default: `Medium`.
4. **Summary Input:**
   - Single-line text input with live character counter (`X / 150`).
5. **Description Textarea:**
   - Multi-line textarea (min-height 120px, vertically resizable) with live character counter (`X / 2000`).
6. **Attachment Dropzone:**
   - Dashed border (`2px dashed #006B3C`), upload icon, file picker button.
   - Client-side validation for type (`.jpg, .jpeg, .png, .webp, .pdf`) and size (`<= 5MB`).
   - Selected file pills display filename, formatted size (e.g. `1.2 MB`), and a delete `[x]` button.
7. **Form Validation Feedback:**
   - Red border around invalid inputs.
   - Explicit field-level error messages directly under inputs (e.g., *"Summary must be at least 5 characters"*).
8. **Failure & Retention State:**
   - If server returns 500 or network drops, a persistent top error alert appears (`#FEE2E2` / `#991B1B`): *"Submission failed: [Reason]. Your form data has been preserved."*
   - All input values and selected attachments remain intact in the form.
9. **Success State:**
   - Modal or confirmation screen: Large Green Checkmark, *"Ticket Created Successfully"*, *"Official Ticket Number: TKT-2026-000101"*.
   - Actions: `[ View Ticket Details ]` and `[ Back to My Tickets ]`.

---

### 5.3. My Tickets Screen Layout (`/tickets`)

```
+-----------------------------------------------------------------------------------------------+
| My Tickets                                                      [ Clear Filters ] [ + Create Ticket ]
| View and track all of your IT support requests.                                               |
|                                                                                               |
| +-------------------------------------------------------------------------------------------+ |
| | [Q Search by ticket number or summary... ] [ Category v ] [ Priority v ] [ Status v ]    | |
| +-------------------------------------------------------------------------------------------+ |
|                                                                                               |
| Ticket No. ^  Created Date ^  Summary            Category   Req. Priority  IT Priority Status  |
| --------------------------------------------------------------------------------------------- |
| TKT-2026-001  Aug 25, 2026    Battery drains...  Hardware   [ Medium ]     [ Medium ]  [ New ] |
| TKT-2026-002  Aug 24, 2026    VPN connection...  Network    [ High ]       [ High ]    [ Open ]|
| TKT-2026-003  Aug 20, 2026    LEB2 grade imp...  Software   [ Low ]        [ Low ]     [ Res. ]|
|                                                                                               |
| Showing 1 to 3 of 3 tickets                                              [ < Prev ] [ 1 ] [ Next > ] |
+-----------------------------------------------------------------------------------------------+
```

#### Responsive Desktop Table (≥ 992px):
- Clean table with subtle zebra striping or pale green row hover (`#EAF6EF`).
- Column headers: `Ticket No.`, `Created Date`, `Summary`, `Category`, `Requested Priority`, `IT Priority`, `Current Status`, `Ticket Owner`, `Last Updated`.
- Clicking a row navigates to the Ticket Detail screen.

#### Responsive Mobile Ticket Cards (< 768px):
- Table transforms into stacked white cards.
- Card Header: `Ticket No.` (Bold Green) + `Status Badge` (Right aligned).
- Card Body: `Summary` (1-2 lines truncated), `Category` tag, `Requested Priority Badge`.
- Card Footer: `Created Date` + Chevron arrow `>` indicator.

#### Filter & Search Controls:
- **Search Input:** Text field with magnifying glass icon and clear `(x)` button. Debounced 300ms.
- **Filter Dropdowns:** Category, Requested Priority, IT Priority, Current Status.
- **Clear Filters:** Resets all filters and search query in a single click.

#### List States:
- **Loading State:** Shimmer skeleton rows matching table columns.
- **Empty State (No tickets in database for this requester):**
  - Illustration / Icon, *"No support tickets yet."*, Subtext: *"Need help with hardware, software, or network? Create your first ticket."*, Primary button: `+ Create Ticket`.
- **No Results State (Filter/search returned 0 matches):**
  - Search icon, *"No tickets match your filter criteria."*, Primary button: `Clear Filters`.
- **Error State:**
  - Red alert card with *"Unable to load tickets from server."* and a `Retry` button.

---

### 5.4. Requester Ticket Detail Screen Layout (`/tickets/:id`)

```
+-----------------------------------------------------------------------------------------------+
| My Tickets > Ticket Details                                             [ <- Back to My Tickets ]
|                                                                                               |
| Ticket No.              Ticket Date              Category            Related System           |
| [ TKT-2026-000101   ]   [ Aug 25, 2026 11:15 ]   [ Hardware      ]   [ Corporate Laptop     ] |
|                                                                                               |
| Requester               Requested Priority       IT Priority         Current Status           |
| [ Jennifer Anderson ]   [ Medium (Amber)     ]   [ Medium (Amber)]   [ New (Blue)           ] |
|                                                                                               |
| Ticket Owner                                                                                  |
| [ Unassigned                                                                                ] |
|                                                                                               |
| Summary                                                                                       |
| [ Laptop battery drains quickly after latest OS update                                      ] |
|                                                                                               |
| Description                                                                                   |
| +-------------------------------------------------------------------------------------------+ |
| | The battery drops from 100% to 15% in less than 45 minutes even with low screen           | |
| | brightness and no heavy apps running. Started right after yesterday's patch.              | |
| +-------------------------------------------------------------------------------------------+ |
|                                                                                               |
| Resolution Summary                                                                            |
| [ No resolution summary available yet.                                                      ] |
|                                                                                               |
| ============================================================================================= |
| Attachments (2 Active / 1 Removed)                                                            |
|                                                                                               |
| [Active Attachments]                                                                          |
| * battery-report.pdf  (1.2 MB)  Uploaded Aug 25, 2026     [ Download ]  [ Remove Attachment ] |
| * battery-stats.png   (450 KB)  Uploaded Aug 25, 2026     [ Download ]  [ Remove Attachment ] |
|                                                                                               |
| [+ Add Another Attachment (Drop file here or browse - max 5 active total)                   ] |
|                                                                                               |
| [Removed Attachments History]                                                                 |
| * old-screenshot.png  (320 KB)  [ Removed ] Reason: "Uploaded duplicate file by mistake"     |
|   (Download Disabled)                                                                         |
+-----------------------------------------------------------------------------------------------+
```

#### Attachments Management UI:
1. **Active Files Table:** Displays file icon, `originalFileName`, formatted size, upload timestamp, `[ Download ]` button, and `[ Remove ]` button.
2. **Soft Removal Modal:**
   - Modal Header: "Remove Attachment"
   - Body: *"Are you sure you want to remove **battery-stats.png**? This file will no longer be downloadable."*
   - Required Textarea: *"Reason for removal \*"* (Placeholder: *"e.g. Contains sensitive personal data / uploaded wrong file"*).
   - Actions: `[ Cancel ]` and `[ Confirm Soft Removal ]` (Destructive Red button).
3. **Removed Attachments Section:**
   - Shaded card with gray badge `[ Removed ]`.
   - Displays filename, size, removal date, and the mandatory removal reason.
   - Download/preview buttons are completely removed/disabled.
4. **Add Attachment (Inline):**
   - Active only if current active attachments < 5.
   - Disabled with tooltip *"Maximum 5 active attachments reached"* if 5 active files exist.

---

## 6. Responsive Breakpoint Rules

| Breakpoint | Viewport Width | Layout Behavior & Component Rules |
|---|---|---|
| **Desktop** | `≥ 992px` | • Full multi-column grids (2-column form headers, 4-column detail meta cards).<br>• Full data table with all columns visible.<br>• Content centered with maximum container width of `1140px`. |
| **Tablet** | `768px – 991px` | • 2-column grid collapses to 2 even columns.<br>• Data table scrolls horizontally if needed or condenses secondary columns (Owner/Updated).<br>• Summary and Description retain full container width. |
| **Mobile** | `< 768px` | • All grids stack into a single column (`100% width`).<br>• Data table transforms into vertical Ticket Cards.<br>• Buttons expand to full width or large touch targets (`min 44px` height).<br>• Zero horizontal document scrolling. |

---

## 7. Accessibility (a11y) Rules
- **Color Contrast:** All text must meet WCAG 2.1 AA contrast ratio (≥ 4.5:1 against backgrounds).
- **Keyboard Navigation:** All interactive elements (`<button>`, `<input>`, `<a>`, `<select>`) must be focusable via `Tab` with a visible focus ring (`#0B7A46`).
- **Screen Reader Support:** Form inputs must use explicit `<label htmlFor="...">` attributes. Error messages must link via `aria-describedby`.
- **Non-Color Indicators:** Status and priority badges must always combine text labels with color (never color alone).

---

## 8. Visual Inspection Checklist and Screenshot Paths

Artifact screenshots for submission must be saved under `artifacts/lab-02/screenshots/`:
1. `artifacts/lab-02/screenshots/create-ticket/`
   - `01-create-ticket-desktop.png`: Clean initial Create Ticket screen at 1280px.
   - `02-create-ticket-validation-errors.png`: Field-level validation messages.
   - `03-create-ticket-attachments.png`: Valid and invalid attachment handling.
   - `04-create-ticket-failure-preserved.png`: Preserved form state on API failure.
   - `05-create-ticket-mobile.png`: Create ticket layout at 375px.
2. `artifacts/lab-02/screenshots/my-tickets/`
   - `01-my-tickets-desktop.png`: Data table with badges, sorting, and pagination.
   - `02-my-tickets-filtered.png`: Active search and category filters applied.
   - `03-my-tickets-empty-and-no-results.png`: Empty state and no-results state.
   - `04-my-tickets-mobile-cards.png`: Responsive card layout at 375px.
   - `05-my-tickets-requester-switch.png`: Showing ticket list changing when switching requester.
3. `artifacts/lab-02/screenshots/ticket-detail/`
   - `01-ticket-detail-desktop.png`: Read-only ticket detail with Zen Green styling.
   - `02-ticket-detail-attachments-active.png`: Active attachments with download action.
   - `03-ticket-detail-soft-remove-modal.png`: Soft removal confirmation dialog with reason.
   - `04-ticket-detail-removed-attachments.png`: Soft-removed attachment metadata and blocked download.
   - `05-ticket-detail-mobile.png`: Ticket detail view at 375px.
