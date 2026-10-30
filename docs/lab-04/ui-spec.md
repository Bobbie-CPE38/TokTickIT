# TokTickIT Zen Green UI Specification (Lab 4)

## 1. Overview and Design System Principles
TokTickIT strictly implements the **Zen Green** design language, emphasizing clarity, professional IT service aesthetics, purposeful visual hierarchy, high contrast, and accessible interaction patterns. Sprint 4 extends the UI foundation established in Labs 2 and 3 to support:
- Role-appropriate operational dashboards for Requesters, IT Staff, and Administrators.
- Parent-child Actions Taken tracking on Ticket Detail (supporting both operational edit modes for IT Staff and transparent read-only audit views for Requesters).
- Strict Ticket status transition controls with Resolution Gate enforcement dialogs.
- Non-destructive optimistic concurrency collision handling.
- Full responsive adaptation across desktop, tablet, and mobile breakpoints.

All screens, components, and interactive states integrate seamlessly into a single, cohesive user experience without presenting conflicting visual styles.

---

## 2. Design Tokens and Visual Language

### 2.1. Color Palette

| Token / Element | Hex Code | Usage & Placement Rules |
|---|---|---|
| **Primary Green** | `#006B3C` | Application header bar, primary CTA buttons (`+ Create Ticket`, `Save Action`, `Confirm Resolution`, `Sign In`), brand accents. |
| **Secondary Green** | `#0B7A46` | Active navigation tabs, interactive links, focus outlines, button hover states. |
| **Pale Green** | `#EAF6EF` | Selected table rows, success callout backgrounds, metric trend badges, container header accents. |
| **Page Background** | `#F5F7F6` | Global page backdrop; clean, neutral, near-white tone. |
| **Surface / Card** | `#FFFFFF` | Main form cards, metric cards, modal dialogs, data tables, and detail panels. |
| **Surface Border** | `#E2E8F0` | Clean structural dividers, card borders, and table gridlines. |
| **Text Primary** | `#1C2D27` | Dark charcoal-green for body text, headers, and high-readability labels (never pure `#000000`). |
| **Text Muted** | `#52665D` | Helper text, secondary timestamps, table column headers, and breadcrumb trails. |
| **Editable Field** | `#FFFFFF` | Background for active inputs, dropdowns, and textareas; border `#D1D5DB`. |
| **Read-Only Field** | `#F3F6F4` | Soft gray-green shading for non-editable ticket fields; border `#E2E8F0`. |
| **Action Taken Card** | `#FFFFFF` | Clean white card surface with `#E2E8F0` border; hover state with `#F8FAF9` tint. |
| **Internal Note Border** | `#F59E0B` | Warm amber border emphasizing private internal operational notes. |
| **Internal Note Background**| `#FFFBEB` | Light amber tint for internal notes panel to clearly differentiate from public comments. |
| **Error Primary** | `#991B1B` | Field validation error text and icons; border `#EF4444`; background `#FEE2E2`. |
| **Warning Primary** | `#B45309` | Warning banners, cautionary alerts, follow-up required badges; background `#FEF3C7`. |
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

#### Actions Taken Badges
```
[ Follow-Up Required ] Text: #B45309 | Background: #FEF3C7 | Border: #FDE68A
[ Action Complete ]     Text: #065F46 | Background: #D1FAE5 | Border: #A7F3D0
```

#### Dashboard Trend Badges
```
[ +3 from yesterday ]   Text: #065F46 | Background: #D1FAE5 (Positive trend / growth)
[ -2 from yesterday ]   Text: #4B5563 | Background: #F3F4F6 (Neutral / reduction)
```

---

### 2.3. Typography and Elevation
- **Font Family:** `Inter`, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif.
- **Font Sizes:**
  - `Display / Stat Number`: 32px (2.0rem), Bold (700), Line-height 1.15
  - `H1`: 24px (1.5rem), Semibold (600), Line-height 1.3
  - `H2`: 20px (1.25rem), Semibold (600), Line-height 1.35
  - `H3`: 16px (1.0rem), Semibold (600), Line-height 1.4
  - `Body`: 14px (0.875rem), Regular (400), Line-height 1.5
  - `Small / Caption`: 12px (0.75rem), Regular (400) or Medium (500), Line-height 1.4
- **Card Shadow:** `0 1px 3px 0 rgba(0, 0, 0, 0.08), 0 1px 2px -1px rgba(0, 0, 0, 0.05)`
- **Hover Shadow:** `0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.06)`
- **Modal & Drawer Shadow:** `0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)`

---

## 3. Component Hierarchy and States

### 3.1. Button Hierarchy
1. **Primary Action (`btn-primary`):**
   - Background: `#006B3C` | Hover: `#00522E` | Text: `#FFFFFF` | Border: None | Height: 38px | Radius: 6px.
   - Usage: `+ Create Ticket`, `+ Record Action Taken`, `Save Action`, `Confirm Resolution`, `Sign In`.
2. **Secondary Action (`btn-secondary`):**
   - Background: `#FFFFFF` | Hover: `#F5F7F6` | Text: `#006B3C` | Border: `1px solid #006B3C` | Radius: 6px.
   - Usage: `Cancel`, `Edit Action`, `View all`, `Refresh`, `Back to Queue`.
3. **Destructive Action (`btn-danger`):**
   - Background: `#FFFFFF` | Hover: `#FEE2E2` | Text: `#DC2626` | Border: `1px solid #EF4444` | Radius: 6px.
   - Usage: `Deactivate User`, `Remove Attachment`, `Cancel Ticket`.
4. **Disabled State:**
   - Background: `#E5E7EB` | Text: `#9CA3AF` | Border: `1px solid #D1D5DB` | Cursor: `not-allowed`.
5. **Busy / Submitting State:**
   - Displays an inline spinning SVG indicator alongside active progress text (e.g., "Saving Action…", "Updating Status…"). Button is locked (`disabled = true`) to prevent multiple clicks.

### 3.2. Form Control States
- **Default:** Background `#FFFFFF`, border `1px solid #D1D5DB`, border-radius `6px`, padding `8px 12px`, text `#1C2D27`.
- **Focus:** Border `#0B7A46`, outline `none`, box-shadow `0 0 0 3px rgba(11, 122, 70, 0.2)`.
- **Invalid / Error:** Border `#EF4444`, box-shadow `0 0 0 3px rgba(239, 68, 68, 0.15)`. Inline error text rendered directly below the input in `#991B1B`.
- **Read-Only:** Shaded background `#F3F6F4`, border `1px solid #E2E8F0`, text `#1C2D27`, cursor `default`.
- **Required Indicator:** Required fields display a red asterisk `<span className="text-danger">*</span>` adjacent to the label.

---

## 4. Application Shell and Role Navigation

```
+---------------------------------------------------------------------------------------------------+
| (o) TokTickIT     [ Dashboard ]    [ My Queue ]    [ + Create Ticket ]       [ Michael Brown v ]  |
|                      (active)                                                | Role: IT Staff  |  |
|                                                                              | Change Password |  |
|                                                                              | Sign Out        |  |
+---------------------------------------------------------------------------------------------------+
```

### 4.1. Navigation Rules by Role
- **Requester:**
  - `[ Dashboard ]` (links to `/` or `/dashboard`)
  - `[ My Tickets ]` (links to `/tickets`)
  - `[ + Create Ticket ]` (links to `/tickets/new`)
- **IT Staff:**
  - `[ Dashboard ]` (links to `/` or `/dashboard`)
  - `[ My Queue ]` (links to `/queue`)
  - `[ + Create Ticket ]` (links to `/tickets/new`)
- **Administrator:**
  - `[ Dashboard ]` (links to `/` or `/dashboard`)
  - `[ Admin ]` (links to `/admin/users` User Management)
- **Active Navigation Tab Indicator:** The currently active nav tab displays a solid `#0B7A46` bottom indicator bar (height 3px), font weight `600`, and secondary green text.

---

## 5. IT Staff Dashboard UI Specification

*(Reference: Handout Section 8.1 and Page 5 Wireframe)*

### 5.1. Wireframe Layout
```
+---------------------------------------------------------------------------------------------------+
| Welcome back, Michael!                                                              [ Refresh ]   |
| Here's what's happening with your queue today.   (Unassigned: 8 | My Actions Recorded: 42)        |
+---------------------------------------------------------------------------------------------------+
| [ New ]          | [ Open ]         | [ In Progress ]  | [ Waiting for Req ] | [ My Assigned ]     |
| 14               | 23               | 18               | 7                   | 16                  |
| +3 from yest.    | -2 from yest.    | -1 from yest.    | +1 from yest.       | +4 from yest.       |
+---------------------------------------------------------------------------------------------------+
| My Recent & Urgent Tickets                  [ View all ] | Quick Actions                          |
| -------------------------------------------------------- | -------------------------------------- |
| TKT-2026-000210   [ URGENT ]           [ In Progress ]   | [ + ] Create Ticket                    |
| Core database server outage           May 12, 08:00 AM   |       Submit a new request             |
|                                                          |                                        |
| TKT-2026-000234                       [ In Progress ]    | [ 🔍 ] Search Tickets                  |
| Laptop battery drains quickly         May 12, 09:14 AM   |        Find tickets in queue           |
|                                                          |                                        |
| TKT-2026-000230                       [ Open ]           | [ 📋 ] My Queue                        |
| Printer keeps showing offline         May 10, 02:40 PM   |        View assigned tickets           |
|                                                          |                                        |
| TKT-2026-000228                       [ In Progress ]    |                                        |
| Outlook freezing intermittently      May 9, 05:22 PM    |                                        |
|                                                          |                                        |
| TKT-2026-000198                       [ Resolved ]       |                                        |
| VPN disconnects randomly              May 8, 04:15 PM    |                                        |
+---------------------------------------------------------------------------------------------------+
```

### 5.2. Metric Cards Specification
1. **Card 1: New**
   - Count: Tickets with status $= \text{NEW}$.
   - Trend: Day-over-day change ($\pm N$).
   - Drill-down click: Navigates to `/queue?status=NEW`.
2. **Card 2: Open**
   - Count: Tickets with status $= \text{OPEN}$.
   - Trend: Day-over-day change ($\pm N$).
   - Drill-down click: Navigates to `/queue?status=OPEN`.
3. **Card 3: In Progress**
   - Count: Tickets with status $= \text{IN_PROGRESS}$.
   - Trend: Day-over-day change ($\pm N$).
   - Drill-down click: Navigates to `/queue?status=IN_PROGRESS`.
4. **Card 4: Waiting for Requester**
   - Count: Tickets with status $= \text{WAITING_FOR_REQUESTER}$.
   - Trend: Day-over-day change ($\pm N$).
   - Drill-down click: Navigates to `/queue?status=WAITING_FOR_REQUESTER`.
5. **Card 5: My Assigned**
   - Count: Active tickets where `ticketOwnerId = currentUser.id`.
   - Trend: Day-over-day change ($\pm N$).
   - Drill-down click: Navigates to `/queue?owner=me`.
6. **Secondary Queue Stats Bar & Actions Metric:**
   - Displays concise operational summary: Unassigned queue count (`unassigned: 8`, clicking links to `/queue?owner=unassigned`) and personal action audit volume (`myActionsCount: 42`).

### 5.3. Recent Tickets & Quick Actions Section
- **Left Column (8/12 grid): "My Recent & Urgent Tickets"**
  - Displays urgent tickets (`itPriority = 'URGENT'`) pinned or badged at the top, followed by up to 5 most recently updated accessible tickets.
  - Each item shows: Ticket Number (clickable link to `/queue/:id`), Priority badge (if High or Urgent), Summary, Status Badge, and Formatted Timestamp.
  - Header has "View all" link pointing to `/queue`.
  - Empty state (if 0 tickets): Displays a subtle icon and "No recent tickets to display."
- **Right Column (4/12 grid): "Quick Actions"**
  - Card with 3 actionable items:
    - `+ Create Ticket` $\rightarrow$ links to `/tickets/new`.
    - `🔍 Search Tickets` $\rightarrow$ links to `/queue?focus=search`.
    - `📋 My Queue` $\rightarrow$ links to `/queue?owner=me`.

---

## 6. Requester Dashboard UI Specification

*(Reference: Handout Section 8.2 and Page 6 Wireframe)*

### 6.1. Wireframe Layout
```
+---------------------------------------------------------------------------------------------------+
| Welcome, Jennifer!                                                                                |
| Here's the latest on your requests.                                                               |
+---------------------------------------------------------------------------------------------------+
| My Open Tickets  | In Progress       | Resolved          | Closed                                 |
| 3                | 2                 | 5                 | 12                                     |
| [ View all ]     | [ View all ]      | [ View all ]      | [ View all ]                           |
+---------------------------------------------------------------------------------------------------+
| My Recent Tickets                           [ View all ] | Quick Actions                          |
| -------------------------------------------------------- | -------------------------------------- |
| TKT-2026-000234                       [ In Progress ]    | [ + ] Create Ticket                    |
| Laptop battery drains quickly         May 12, 09:14 AM   |       Submit a new request             |
|                                                          |                                        |
| TKT-2026-000222                       [ Open ]           | [ 📄 ] View My Tickets                 |
| Request software access               May 11, 02:30 PM   |        Track existing requests         |
|                                                          |                                        |
| TKT-2026-000215           [ Waiting for Requester ]      |                                        |
| Need confirmation on VPN ID           May 10, 04:10 PM   |                                        |
|                                                          |                                        |
| TKT-2026-000205                       [ Resolved ]       |                                        |
| Email not arriving                    May 7, 09:20 PM    |                                        |
|                                                          |                                        |
| TKT-2026-000180                       [ Closed ]         |                                        |
| Password reset request                May 5, 01:15 PM    |                                        |
+---------------------------------------------------------------------------------------------------+
```

### 6.2. Requester Metric Cards & Drill-Down
*(Strictly aligns with the 4-card layout on Handout Page 6 / Section 8.2)*
1. **My Open Tickets:**
   - Count: Owned tickets with active statuses ($\in \{\text{NEW}, \text{OPEN}, \text{IN\_PROGRESS}, \text{WAITING\_FOR\_REQUESTER}, \text{REOPENED}\}$).
   - "View all" links to `/tickets?filter=open`.
2. **In Progress:**
   - Count: Owned tickets with status $= \text{IN_PROGRESS}$.
   - "View all" links to `/tickets?status=IN_PROGRESS`.
3. **Resolved:**
   - Count: Owned tickets with status $= \text{RESOLVED}$.
   - "View all" links to `/tickets?status=RESOLVED`.
4. **Closed:**
   - Count: Owned tickets with status $= \text{CLOSED}$.
   - "View all" links to `/tickets?status=CLOSED`.

**Attention-Required Handling:** To preserve Handout Section 4.6 expectations (*"Tickets waiting for the Requester"*) without breaking the 4-card wireframe layout, tickets with `currentStatus = 'WAITING_FOR_REQUESTER'` are highlighted in the "My Recent Tickets" list with an amber `[ Waiting for Requester ]` badge and an attention callout icon, providing immediate visibility to items requiring customer action.

### 6.3. Requester Quick Actions
- `+ Create Ticket` $\rightarrow$ links to `/tickets/new`.
- `📄 View My Tickets` $\rightarrow$ links to `/tickets`.

---

## 7. Actions Taken UI on Ticket Detail

*(Reference: Handout Section 8.3)*

### 7.1. Placement and Layout
Actions Taken is rendered as a dedicated major panel on Ticket Detail (`/queue/:id` for IT Staff, `/tickets/:id` for Requesters), positioned below ticket metadata and above discussion/notes.

```
+---------------------------------------------------------------------------------------------------+
| Actions Taken (2)                                                      [ + Record Action Taken ]  |
+---------------------------------------------------------------------------------------------------+
|  [ Action Card / Row 1 ]                                                                          |
|  Date/Time: May 12, 2026 10:15 AM    | Performed by: Sarah Johnson (IT Staff)  [ Edit ]           |
|  Description: Ran hardware diagnostic on laptop battery cells.                                    |
|  Result: Cell #2 degraded below 40% capacity. Ordered replacement battery.                        |
|  Status: [ Follow-Up Required ]                                                                   |
|  Follow-Up Note: Install replacement battery pack upon delivery (ETA May 14).                      |
|  Attachment Notes: Battery_health_report.pdf attached in attachments section.                     |
+---------------------------------------------------------------------------------------------------+
|  [ Action Card / Row 2 ]                                                                          |
|  Date/Time: May 11, 2026 03:30 PM    | Performed by: Michael Brown (IT Staff)  [ Edit ]           |
|  Description: Verified AC power adapter output with multimeter.                                   |
|  Result: Charger output is stable at 65W, issue isolated to internal pack.                        |
|  Status: [ Action Complete ]                                                                      |
+---------------------------------------------------------------------------------------------------+
```

### 7.2. Modes of Operation

#### 1. List Mode
- Chronological list of action cards/rows.
- Displays: Action Date/Time, Performed by user name & badge, Description, Result, Follow-Up badge, Follow-up Note (rendered with alert background if required), Attachment Notes.
- For IT Staff/Admin: Displays an "Edit" button per row.
- For Requester: Pure read-only view. The "+ Record Action Taken" and "Edit" buttons are completely omitted.

#### 2. Create Mode ("+ Record Action Taken")
- Clicking "+ Record Action Taken" reveals the creation form card:
  - **Action Date/Time:** `<input type="datetime-local">` (defaults to current date and time).
  - **Description `<textarea>`:** Required ($\ge 3$ characters), placeholder: "Describe the concrete technical step taken...".
  - **Result `<textarea>`:** Required ($\ge 3$ characters), placeholder: "Describe the outcome or finding...".
  - **Follow-Up Required? `<input type="checkbox">`:** Checkbox labeled "Follow-up required?".
  - **Follow-up Note `<textarea>`:** Conditionally revealed and required when Follow-Up Required is checked (minimum 3 characters, maximum 1000 characters). The UI enforces `maxLength={1000}` with an accessible live character counter (`{count} / 1000 characters`) directly below the input and an inline warning when nearing the ceiling, preventing accidental HTTP 422 rejections. Inline helper: "Specify next steps or pending deliveries (up to 1000 characters)."
  - **Attachment Notes `<input type="text">`:** Optional, placeholder: "e.g. diagnostic_log.txt or screenshot.png" (max 500 characters).
  - **Action Buttons:** "Save Action" (primary green, busy spinner when submitting) and "Cancel" (secondary button).

#### 3. Edit Mode
- Clicking "Edit" on an action card transforms that card into an editable form pre-populated with existing values.
- Form inputs adhere to identical constraints as Create Mode (including `maxLength={1000}` and live character counter for `followUpNote`).
- "Save Changes" updates the record via `PATCH /api/actions-taken/:actionId`.
- "Cancel" restores the card to List Mode without saving.

---

## 8. Ticket Workflow, Resolution Feedback & Modals

*(Reference: Handout Section 8.4)*

### 8.1. Permitted Transitions Controller
The Status dropdown on `/queue/:id` dynamically shows only permitted next statuses based on the Ticket's `currentStatus`:
- If `NEW`: `OPEN`, `IN_PROGRESS`, `CANCELLED`.
- If `OPEN`: `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `CANCELLED`.
- If `IN_PROGRESS`: `WAITING_FOR_REQUESTER`, `RESOLVED`, `CANCELLED`.
- If `WAITING_FOR_REQUESTER`: `IN_PROGRESS`, `RESOLVED`, `CANCELLED`.
- If `RESOLVED`: `CLOSED`, `REOPENED`.
- If `REOPENED`: `IN_PROGRESS`, `RESOLVED`, `CANCELLED`.
- If `CLOSED`: `REOPENED` (requires staff confirmation).
- If `CANCELLED`: Disabled (terminal).

### 8.2. Confirmation Modals

#### 1. Resolution Confirmation Modal (`RESOLVED`)
- **Resolution Gate Validation:**
  - When the modal opens, it checks whether the ticket has at least one recorded Action Taken (`actionsTaken.length \ge 1`).
  - **If 0 Actions Taken exist:** An alert banner displays:
    ```
    ⚠️ Resolution Gate
    At least one Action Taken must be recorded before this ticket can be resolved.
    ```
    The "Confirm Resolution" button is **disabled**, preventing submission.
  - **If Actions Taken exist:** Renders a required textarea:
    - Label: `Resolution Summary *`
    - Helper: `Explain the root cause and resolution applied (minimum 5 characters).`
    - "Confirm Resolution" button enabled once valid input is entered.

#### 2. Closure Confirmation Modal (`CLOSED`)
- Informs staff that the ticket will be marked Closed.
- Pre-fills the existing `resolutionSummary` and allows optional amendments.

#### 3. Reopening Confirmation Modal (`REOPENED`)
- Prompts for a mandatory Reopening Rationale explaining why the closed/resolved issue has recurred.

#### 4. Cancellation Confirmation Modal (`CANCELLED`)
- Displays a strong cautionary warning that cancellation is permanent and terminal.

### 8.3. Optimistic Concurrency Conflict Modal
If an IT Staff user attempts to save a status change or edit while another user has concurrently updated the ticket, the backend returns HTTP `409 Conflict`.
The UI displays the Concurrency Alert Dialog:
```
+-----------------------------------------------------------------------------------+
| ⚠️ Stale Record Detected                                                          |
| This ticket has been updated by another team member since you loaded the page.    |
| To prevent overwriting their work, please reload the ticket.                      |
|                                                                                   |
| [ Keep My Drafts & Refresh ]                                      [ Dismiss ]     |
+-----------------------------------------------------------------------------------+
```
Clicking "Keep My Drafts & Refresh" re-fetches the ticket data while keeping any unsubmitted comments, notes, or action drafts intact in form state.

---

## 9. Responsive Layouts and Viewport Adaptations

### 9.1. Desktop Viewport ($\ge 992\text{ px}$)
- Header displays complete brand, horizontal navigation tabs, and user profile dropdown.
- **Requester Dashboard Grid:** The 4 KPI cards render in a balanced single-row 4-column grid (`col-lg-3`, 25% width each).
- **IT Staff Dashboard Grid:** The 5 KPI cards render in a responsive 5-column flex container or grid layout (`col-lg-2-4` or `flex: 1 1 0` with 12px gap).
- Bottom dashboard area renders two side-by-side columns: 8/12 grid (`col-lg-8`) for "My Recent Tickets", 4/12 grid (`col-lg-4`) for "Quick Actions".
- Actions Taken cards display full horizontal metadata (date, performer, badges) alongside action text.

### 9.2. Tablet Viewport ($768\text{ px} - 991\text{ px}$)
- **Requester Dashboard Grid:** The 4 KPI cards adapt into a clean, symmetrical 2x2 grid (`col-md-6 mb-3`) preventing horizontal squishing or orphan cards.
- **IT Staff Dashboard Grid:** The 5 KPI cards wrap into a 3-card top row and 2-card centered bottom row (`col-md-4 mb-3` and `col-md-6 mb-3`).
- Recent Tickets and Quick Actions stack vertically (`col-12`) with full-width cards and tap-friendly touch targets.
- Actions Taken form fields adapt comfortably to a 2-column grid (`col-md-6`).

### 9.3. Mobile Viewport ($< 768\text{ px}$)
- Zero horizontal scrolling (`overflow-x: hidden`).
- Navigation tabs collapse or wrap into accessible mobile menu.
- **Requester Dashboard Grid:** KPI cards render in a 2-column compact grid (`col-6 g-2 mb-2`) or stacked single-column (`col-12 mb-2`), ensuring clear typography and no clipped numbers.
- **IT Staff Dashboard Grid:** KPI cards stack cleanly in a 2-column or 1-column layout.
- "My Recent Tickets" list transforms into stacked cards with clear badge placement.
- Actions Taken items render as stacked vertical cards.
- All interactive touch targets (buttons, links, form inputs) measure $\ge 44\text{ px}$ in height.

---

## 10. Visual and Accessibility Checklist

| Category | Verification Item | Standard / Expected Behavior | Verified |
|---|---|---|:---:|
| **Design Consistency** | Zen Green Token Fidelity | Header `#006B3C`, Active nav `#0B7A46`, Page `#F5F7F6`, Body text `#1C2D27`. | [x] |
| **Design Consistency** | Component Styling | Consistent borders (`#E2E8F0`), radius (`6px`), and button styles across all screens. | [x] |
| **Dashboards** | Clear Greeting & Context | Role-appropriate greeting ("Welcome back, Michael!" / "Welcome, Jennifer!"). | [x] |
| **Dashboards** | Authoritative KPI Cards | Big numbers (32px), clear labels, day-over-day trends, and working drill-down links. | [x] |
| **Dashboards** | Quick Action Shortcuts | Distinct icon shortcuts pointing to ticket creation, search, and queue. | [x] |
| **Actions Taken** | Form Validation Feedback | Follow-up note required when checkbox enabled; inline error placement below field. | [x] |
| **Actions Taken** | Performer Visibility | Clear attribution to performing IT Staff member, independent of ticket owner. | [x] |
| **Actions Taken** | Requester Transparency | Requesters see clean read-only audit log; create/edit buttons completely absent. | [x] |
| **Editable / Read-Only**| Visual Distinction | Editable inputs have `#FFFFFF` bg; read-only ticket fields have `#F3F6F4` shaded bg. | [x] |
| **Workflow Modals** | Resolution Gate Blocking | Zero actions taken blocks resolution with clear warning banner and disabled button. | [x] |
| **Workflow Modals** | Concurrency Dialog | HTTP 409 Conflict triggers non-destructive reload dialog preserving user drafts. | [x] |
| **Accessibility** | Focus Rings & Keyboard | Visible 3px green focus outline (`rgba(11, 122, 70, 0.2)`) on all interactive controls. | [x] |
| **Accessibility** | Semantic Markup | Heading hierarchy `h1` $\rightarrow$ `h2` $\rightarrow$ `h3`; proper `aria-labels` on icon buttons. | [x] |
| **Accessibility** | Touch Target Size | All interactive touch targets $\ge 44\text{ px}$ on mobile viewports. | [x] |
| **Responsiveness** | Zero Horizontal Overflow | Clean fluid layout across Desktop, Tablet, and Mobile with no clipped controls. | [x] |
| **Hardening** | Double-Click Guard | Buttons disabled with spinner during active network submission. | [x] |
