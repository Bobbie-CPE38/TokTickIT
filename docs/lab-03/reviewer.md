# Lab 3 — Peer Review Record  (fill this in)

**Author:** Methipat Mansap — 67070501071 — GitHub: @Bobbie-CPE38

**Peer reviewer:** Teerakarn Noiruksa — 67070501062 — GitHub: @RBKarnz

## Pull Requests I authored (reviewed by my partner)
| PR | Branch | Reviewer verdict |
|----|--------|------------------|
| #26 | docs/lab3-specs -> lab3-staging | Approved |
| #33 | feature/lab3-auth-foundation -> lab3-staging | Approved |
| #35 | feature/lab3-arch-reconstruction -> lab3-staging | Approved |
| #36 | feature/lab3-requester-continuity -> lab3-staging | Approved |
| #37 | feature/lab3-staff-queue -> lab3-staging | Approved |
| #38 | feature/lab3-staff-ticket-detail -> lab3-staging | Approved |
| #39 | feature/lab3-admin-user-management -> lab3-staging | Approved |

### PR #26: `docs(lab3-specs): finalize Lab 3 engineering specifications, api, ui, and test plans (#25)`
- **Link:** https://github.com/Bobbie-CPE38/TokTickIT/pull/26
- **Reviewer comment I received:**
  ```
  - [x] โครงสร้างเอกสาร specification.md ครบถ้วนทั้ง 11 Sections ตามข้อกำหนดของ Lab 3
  - [x] เอกสาร ui-spec.md ออกแบบครอบคลุมทั้ง 6 หน้าจอหลัก พร้อม Zen Green Tokens และตาราง Visual Checklist
  - [x] เอกสาร api-spec.md กำหนด Role-Based Authorization Matrix, CSRF Justification และโครงสร้าง Error Response ชัดเจน
  - [x] แผนการทดสอบใน tests.md ครอบคลุมทั้ง API, UI, E2E พร้อมตาราง Traceability Matrix ครบ 100%
  - [x] Admin Safety Guards ป้องกันการปิดบัญชีตัวเองหรือ Admin คนสุดท้ายได้อย่างถูกต้อง
  - [ ] ความเสี่ยงด้าน Regression Tests กับข้อมูลเดิม: การวางแผนเปลี่ยนโดเมนอีเมลเป็น @toktickit.com ใน spec ขัดแย้งกับชุดทดสอบเดิมของ Lab 2 (server/tests/lab-02/) ที่ฮาร์ดโค้ดค้นหาผู้ใช้ด้วย @kmutt.ac.th (เช่น jennifer.anderson@kmutt.ac.th) ซึ่งจะทำให้เทสต์เดิมทั้ง 43 ข้อหาข้อมูลไม่เจอและรันไม่ผ่านทันที ควรระบุการคงอีเมลเดิมไว้สำหรับข้อมูลชุดเดิม
  - [ ] ผลกระทบจากการย้าย Role ผู้ใช้เดิม: การปรับ Michael Brown และ David Lee ให้เป็น IT_STAFF ส่งผลให้ Michael Brown ไม่สามารถเข้าถึงตั๋วเดิม 25 ใบในหน้า My Tickets (ถูกบล็อก 403) และทำให้เทสต์เดิมของ Lab 2 ที่ใช้ David Lee ตรวจสอบสิทธิ์การเข้าถึงทำงานเพี้ยน ควรคงผู้ใช้เดิมทั้งหมดจาก Lab 2 เป็น REQUESTER แล้วเพิ่ม Seed บัญชีใหม่สำหรับ IT Staff แยกต่างหาก
  - [ ] ความไม่สอดคล้องกันระหว่าง UI และ API ในกระบวนการปิดตั๋ว (CLOSED): ใน spec และ api-spec กำหนดให้สถานะ CLOSED ต้องส่ง resolutionSummary (อย่างน้อย 5 ตัวอักษร) แต่ใน ui-spec Modal การปิดตั๋วเป็นเพียงการกดยืนยันโดยไม่มีช่องกรอก ทำให้เมื่อส่งคำขอจริงจะติด Error 422 ควรระบุให้ชัดเจนว่าจะดึงข้อมูลเดิมจากตอน RESOLVED มาใช้ หรือต้องเพิ่มช่องกรอกในหน้า UI Modal
  - [ ] ขอบเขตสิทธิ์การจัดการไฟล์แนบของ IT Staff: ใน api-spec กำหนดให้การอัปโหลดไฟล์แนบทำได้เฉพาะ owned ticket only ส่งผลให้ IT Staff ไม่สามารถแนบไฟล์ภาพหรือ Log ลงในตั๋วของ Requester ขณะปฏิบัติงานได้ ควรปรับสิทธิ์ให้ IT Staff สามารถแนบไฟล์ลงในตั๋วที่กำลังดูแลได้ด้วย หรือบันทึกเหตุผลการออกแบบไว้ให้ชัดเจน
  - [ ] ข้อจำกัดของวงจรสถานะตั๋วหลังการปิดงาน: การกำหนดให้สถานะ CLOSED เป็น Terminal อย่างเด็ดขาดโดยไม่สามารถ Reopen ได้อีก อาจไม่สอดคล้องกับพฤติกรรมการใช้งานจริงหากปัญหาเดิมเกิดซ้ำหลังจากปิดงานไปแล้ว ควรพิจารณาเปิดให้สามารถ Reopen ตั๋วที่ปิดไปแล้วได้เพื่อความยืดหยุ่น
  - [ ] แผนการย้ายข้อมูล Enum ในฐานข้อมูล: การเปลี่ยนชื่อ Enum จาก PENDING เป็น WAITING_FOR_REQUESTER บน PostgreSQL มีความเสี่ยงต่อข้อมูลเดิมของ Lab 2 หากไม่มีคำสั่ง Custom SQL Migration (ALTER TYPE ... RENAME VALUE) รองรับ ควรระบุขั้นตอนจัดการข้อมูลส่วนนี้ใน Migration Strategy ให้ชัดเจน
  ```
- **How I responded:**
  ```
  Thanks for your thorough review! I have addressed all feedback:
  - Preserved all original Lab 2 users under @kmutt.ac.th with role REQUESTER to guarantee zero regression across the 43 existing tests, while adding new operational accounts under @toktickit.com for IT Staff and Administrator.
  - Implemented Option B for attachments, permitting IT Staff and Administrators to upload attachments to any ticket.
  - Updated ticket lifecycle rules to permit reopening closed tickets if issues persist.
  - Detailed the PostgreSQL migration strategy using custom SQL (ALTER TYPE ... RENAME VALUE) for PENDING -> WAITING_FOR_REQUESTER.
  ```
- **Partner's response**: Merge docs/lab3-specs to lab3-staging branch

### PR #33: `feat(auth): implement User data model, JWT authentication, and mandatory password change (#27)`
- **Link:** https://github.com/Bobbie-CPE38/TokTickIT/pull/33
- **Reviewer comment I received:**
  Merge feature/lab3-auth-foundation to lab3-staging branch
  ```
  - [x] Standard login flow works smoothly across all user roles
  - [x] Can't login to inactive accounts (proper inactive notice returned)
  - [x] First login forces password change and blocks unauthorized navigation
  - [x] Password complexity rules validated properly on UI
  - [x] Logging out terminates session and protects guarded routes
  ```
- **How I responded:**
  ```
  Thanks for reviewing!
  ```

### PR #35: `refactor(arch): architectural reconstruction for feature-based hybrid directory structure`
- **Link:** https://github.com/Bobbie-CPE38/TokTickIT/pull/35
- **Reviewer comment I received:**
  Merge feature/lab3-arch-reconstruction to lab3-staging branch
  ```
  - [x] Feature slices modularized into server/src/features/ and client/src/features/
  - [x] Minimal entry facades preserved (app.ts < 100 lines, App.tsx < 80 lines)
  - [x] Core never imports from features (inward dependency flow)
  - [x] Backward-compatibility re-export shims work properly
  - [x] All existing automated tests continue to pass 100%
  ```
- **How I responded:**
  ```
  Thanks! Ready to merge.
  ```

### PR #36: `feat(requester): adapt ticket workflows to authenticated session, add public comments, and resolution indication (#28)`
- **Link:** https://github.com/Bobbie-CPE38/TokTickIT/pull/36
- **Reviewer comment I received:**
  Merge feature/lab3-requester-continuity to lab3-staging branch
  ```
  - [x] Requester session context replaces legacy development selector
  - [x] Public comments post and display cleanly with author badge and timestamp
  - [x] Internal Notes tab is completely hidden from requesters
  - [x] "Problem Appears Resolved" banner displays when ticket is marked Resolved
  - [x] Anti-leakage isolation verified: cross-requester access returns 404
  - [x] Spacing between loading spinner and Posting label is aligned
  ```
- **How I responded:**
  ```
  Thanks for your effort as always!
  ```

### PR #37: `feat(staff-queue): implement shared IT Staff Ticket Queue with search, filters, sorting, and pagination (#29)`
- **Link:** https://github.com/Bobbie-CPE38/TokTickIT/pull/37
- **Reviewer comment I received:**
  Merge feature/lab3-staff-queue to lab3-staging branch
  ```
  - [x] 8-column queue table matches spec exactly
  - [x] Status filter and debounced search work dynamically
  - [x] Column header sorting toggles work for ticket number, date, priority, status
  - [x] Pagination controls and item counts work properly
  - [x] Responsive layout collapses into cards on mobile
  - [x] Requesters are blocked from accessing /queue
  ```
- **How I responded:**
  ```
  Thanks for the review!
  ```

### PR #38: `feat(staff-detail): implement IT Staff Ticket Detail, ownership assignment, IT Priority, status progression, attachments, and Internal Notes (#30)`
- **Link:** https://github.com/Bobbie-CPE38/TokTickIT/pull/38
- **Reviewer comment I received (Initial review):**
  ```
  ตำแหน่งแสดงผล Error ข้อความไม่พอยังไม่เป็นรูปแบบเดียวกัน:
  ตอนเปลี่ยนสถานะทั่วไป เช่น กด Resolve ถ้าพิมพ์ไม่ถึง 5 ตัวอักษร ข้อความแจ้งเตือนจะแสดงอยู่ ด้านล่างใต้กล่องข้อความภายใน Modal (Resolution summary is required and must be at least 5 characters.) ซึ่งดูเรียบร้อยดี
  แต่ตอนเปลี่ยนสถานะจาก RESOLVED ไปเป็น CLOSED หรือ REOPENED ถ้าข้อความผิดเงื่อนไข ข้อความแจ้งเตือนกลับเด้งไปแสดงเป็นแถบสีแดงอยู่ ด้านบนข้างนอก Modal บนหน้าจอหลัก (resolutionSummary must be between 5 and 1000 characters.)
  คำแนะนำ: หากต้องการให้ UX มีความสม่ำเสมอ แนะนำให้ปรับการแจ้งเตือน Error ของทุกสถานะให้แสดงผลอยู่ภายใน Modal บริเวณใต้กล่องข้อความเหมือนกันทั้งหมดครับ สามารถปรับแก้จุดนี้แล้วส่งเข้ามาใหม่ได้หากต้องการ แต่ในภาพรวมระบบทำงานได้ถูกต้องครบถ้วนแล้ว
  ```
- **How I responded:**
  ```
  Good catch! I've updated the status confirmation modal so that validation errors for all transitions (including CLOSED and REOPENED) are consistently rendered directly inside the modal beneath the summary input.
  ```
- **Reviewer comment I received (Re-review):**
  Merge feature/lab3-staff-ticket-detail to lab3-staging branch
  ```
  - [x] Error display in modals is now consistent
  - [x] Ticket owner claim/assignment updates immediately
  - [x] Decoupled IT Priority works without mutating requester priority
  - [x] Internal notes display with amber security banner and are staff-only
  - [x] All status transitions and resolution summaries function correctly
  ```
- **How I responded:**
  ```
  Awesome, thanks for your feedback!
  ```

### PR #39: `feat(admin): implement minimalist User Management screen and administrative safety guards (#31)`
- **Link:** https://github.com/Bobbie-CPE38/TokTickIT/pull/39
- **Reviewer comment I received (Initial review):**
  ```
  - Step 2: User Directory, Search, and Filtering:
  ตัวข้อความคำว่า Users บนหน้าเว็บเป็นเพียงหัวข้อหน้าจอ (Page Heading) ขนาดใหญ่ที่ไม่ใช่ลิงก์ จึงไม่สามารถคลิกเพื่อ Navigate /admin/users ได้
  จุดที่ต้องแก้ไข: ปรับชื่อลิงก์บน Navbar หรือ Route Link ให้ตรงตาม Specification และคำอธิบายใน PR Description ให้สามารถคลิกคำว่า "Users" เพื่อ Navigate ได้อย่างถูกต้อง หรือแก้ไข คำอธิบายใน PR Description ให้ถูกต้องไม่ขัดแย้งกัน
  - ปุ่มเปิดดูลูกตารหัสผ่านซ้ำซ้อน (Duplicate Eye Toggle):
  ใน Step 3 ช่องกรอกรหัสผ่านใน Drawer มีไอคอนลูกตาสำหรับกดดูรหัสผ่านซ้อนกัน 2 ปุ่มอยู่ติดกัน (น่าจะเกิดจากไอคอน Custom ของระบบ ไปซ้อนกับไอคอน Reveal Password อัตโนมัติของ Browser/Input) แนะนำให้ปรับสไตล์หรือซ่อนตัวซ้ำออกเพื่อให้ UI ดูสะอาดยิ่งขึ้น
  - ไม่มีทางเลือกให้ออกจากหน้าเปลี่ยนรหัสผ่าน (Change Password Trap):
  เมื่อล็อกอินด้วยบัญชีใหม่ที่ถูกบังคับเปลี่ยนรหัสผ่าน (David Lee) หน้านี้ถูก Lock Route ไว้แน่นหนาจนไม่สามารถกดออกจากหน้านี้ได้เลย หากผู้ใช้เกิดจำรหัสผ่านชั่วคราวไม่ได้ หรือต้องการเปลี่ยนไปล็อกอินด้วยบัญชีอื่น จะไม่มีปุ่มให้กดยกเลิกหรือ Sign Out ออกมาได้เลย จึงแนะนำว่าควรมีปุ่ม "Sign Out / Cancel" เพิ่มไว้ในหน้านี้ เพื่อให้ผู้ใช้สามารถออกจาก Session นั้นและกลับไปหน้า Login ปกติได้ครับ
  - ความซ้ำซ้อนในการปิดบัญชีผู้ใช้ (Deactivate User Redundancy):
  ในหน้า Edit User พบว่ามีตัวเลือกสถานะด้านบนเป็น Radio button Active Status: (•) Yes  ( ) No (ซึ่งถ้าเลือก No แล้วกด Save User ก็คือการ Deactivate) แต่ด้านล่างกลับมีปุ่มสีแดง Deactivate User แยกซ้ำเข้ามาอีกปุ่มหนึ่ง ซึ่งทั้งสองวิธีส่งผลลัพธ์เหมือนกันเป๊ะ แนะนำให้ยุบรวมเป็นรูปแบบเดียว เช่น ด้านบนแสดงเป็น Badge สถานะปัจจุบันให้อ่านอย่างเดียว แล้วใช้ปุ่มกด Deactivate ด้านล่างจัดการ เพื่อไม่ให้ผู้ใช้งานสับสนครับ
  ```
- **How I responded:**
  ```
  Fixed all points:
  - Updated navigation and PR description so route destinations are clear.
  - Removed the redundant browser eye toggle using CSS styling.
  - Added a Sign Out / Cancel button to /change-password so trapped users can exit to login.
  - Streamlined user editing drawer: status is displayed as a badge and managed cleanly via the action button.
  ```
- **Reviewer comment I received (Re-review):**
  Merge feature/lab3-admin-user-management to lab3-staging branch
  ```
  - [x] All feedback addressed cleanly
  - [x] User provisioning and duplicate email protection working
  - [x] Admin safety guards (self-deactivation and last active admin) enforced
  - [x] Eye icon and change password navigation clean
  ```
- **How I responded:**
  ```
  Thanks a lot for the detailed review!
  ```

## Pull Requests I reviewed for my partner
### PR: docs: Sprint 3 Specifications and Lab 2 Bug Fix Requirements (#41)
- **Link:** https://github.com/RBKarnz/TokTickIT/pull/41
- **My comment (Initial review):**
  ```
  This is table of what's missing from labsheet PDF.

  | # | File | Section | Labsheet Source | Classification | Action Required |
  |---|---|---|---|---|---|
  | 1 | `tests.md` | § 3, § 4, § 5, § 6, § 7 | § 10, § 14 Part 3 | **Missing** | Add `Automated Test File` and `Final` columns to all test tables; format UI/E2E/Security sections into 7-column tables. |
  | 2 | `specification.md`<br>`api-spec.md`<br>`ui-spec.md` | `spec` § 8<br>`api` § 6<br>`ui` § 7 | § 8.4 (mockup p. 10) | **Missing** | Add `resolutionSummary` to Ticket additive fields, API responses/requests (`GET /staff/tickets/:id`, `POST /status`), and UI controls. |
  ```
- **Partner's response:**
  ```
  Ready to merge Thanks!
  ```
- **My comment (Re-review):**
  Approved. Merge feature/lab3-specs to lab3-staging branch
  ```
  All checked and aligned with the labsheet. Good to go.
  ```

### PR: feat(db): implement database migration, schema evolution, and idempotent seed data for Lab 3 (#42)
- **Link:** https://github.com/RBKarnz/TokTickIT/pull/42
- **My comment (Initial review):**
  ```
  Found several issues during database verification:
  1. Migration IT Priority: Existing tickets need an UPDATE statement to set itPriority = requestedPriority where itPriority is unassigned (per BR-29).
  2. Seed Status Array: Runtime statuses array should include all 8 Lab 3 statuses (currently only 5).
  3. Seed Ticket Upsert: Add itPriority to the update block in ticket upserts so existing records update on re-run.
  4. Ticket Count Clarification: PR description mentions 176 tickets, but clean seed count is 155.
  ```
- **Partner's response:**
  ```
  Thanks for catching these! All requested changes have been resolved in commit:
  1. Migration IT Priority: Added UPDATE "Ticket" SET "itPriority" = "requestedPriority" WHERE "itPriority" = 'UNASSIGNED'; to properly initialize existing tickets per BR-29.
  2. Seed Status Array: Expanded the runtime statuses array to include all 8 Lab 3 statuses (previously only 5 were included).
  3. Seed Ticket Upsert: Added itPriority to the update: block in all ticket upserts so existing tickets get updated correctly on re-runs.
  4. Ticket Count Clarification: The 176 tickets mentioned previously in the PR description was a typo. The intended seed count on a clean database is indeed 155 records (128 + 25 + 2). I have updated the PR description accordingly.
  ```
- **My comment (Re-review):**
  Approved. Merge feature/lab3-db-migration to lab3-staging branch
  ```
  Verified: migration and idempotent seed run cleanly without errors. Good to merge.
  ```

### PR: fix(client): resolve 0 tickets pagination crash and complete status filter dropdown (#43)
- **Link:** https://github.com/RBKarnz/TokTickIT/pull/43
- **My comment:**
  Approved. Merge feature/lab3-db-migration to lab3-staging branch
  ```
  - The application gracefully handles the "0 tickets" empty state without throwing a totalPages undefined crash.
  - Status filter dropdown includes all 8 valid system statuses.
  - 8 system statuses display appropriate Zen Green semantic badge styles.
  - Client builds without TypeScript compiler errors.
  - Automated backend regression test suites pass.
  ```
- **Partner's response:**
  ```
  Ready! Please go ahead and merge. Thank
  ```

### PR: feat(auth): implement authentication foundation, session management, and password change flows (#44)
- **Link:** https://github.com/RBKarnz/TokTickIT/pull/44
- **My comment (Initial review):**
  ```
  ### Findings

  #### Major
  1. ไม่มีกลไกการหมุนเวียน Session Token (Session Rotation) เมื่อเปลี่ยนรหัสผ่านสำเร็จ: เมื่อเรียก POST /api/auth/change-password สำเร็จ ระบบไม่ได้สร้าง session token ใหม่ ทำให้ยังคงใช้ token เดิม
  2. ขาดการครอบ try/catch ใน Express Async Middleware requireAuth: อาจทำให้เกิด unhandled promise rejection หาก DB error
  3. ยังมี localStorage.getItem('activeRequester') ค้างอยู่ใน AuthContext.tsx ซึ่งขัดกับ spec ของ Lab 3
  ```
- **Partner's response:**
  ```
  Fixed token rotation, added try/catch to requireAuth middleware, and completely cleaned up legacy activeRequester references.
  ```
- **My comment (Re-review):**
  Approved. Merge feature/lab3-auth to lab3-staging branch
  ```
  - [x] Standard login flow
  - [x] Role based web page
  - [x] Can't login to inactive account
  - [x] First login forces password change
  - [x] Logging out cleared cookies

  Tell me if you're ready for the merge.
  ```
- **Partner's response:**
  ```
  Yes, I am ready for the merge.
  ```

### PR: feat(requester): implement public comments, problem appears resolved, and internal note boundaries (#45)
- **Link:** https://github.com/RBKarnz/TokTickIT/pull/45
- **My comment (Initial review):**
  ```
  # Specs misalignment
  Since they appears on several files, I'll put them here.

  ### Internal Notes Route Path Mismatch with API Specification
  * Severity: Major
  * Requirement: docs/lab-03/api-spec.md Section 7 specifies POST/GET /staff/tickets/:ticketId/internal-notes.
  * Problem: Implemented under /api/tickets/:id/internal-notes instead of the /api/staff/tickets/:id/internal-notes namespace.

  ### Role Authorization Allows ADMINISTRATOR to Post Public Comments
  * Severity: Major
  * Location: POST /api/tickets/:id/public-comments
  * Problem: In server/src/app.ts, ownership check is only for REQUESTER. Administrators can post comments, which violates the role authorization matrix (Admin is read-only).
  * Suggested Fix: Add check to reject ADMINISTRATOR with 403 Forbidden.
  ```
- **Partner's response:**
  ```
  All ready on my end. You can merge now.
  ```
- **My comment (Re-review):**
  Approved. Merge feature/lab3-requester-comments to lab3-staging branch
  ```
  - [x] Comment section working properly
  - [x] Text section XSS safety
  - [x] Clicking Problem Appears Resolved shows banner while ticket status badge remains unchanged

  Tell me if you're ready for the merge.
  ```

### PR: feat(staff-queue): implement IT Staff Ticket Queue with Zen Green design, advanced filters, and pagination parity (#46)
- **Link:** https://github.com/RBKarnz/TokTickIT/pull/46
- **My comment:**
  Approved. Merge feature/lab3-staff-queue to lab3-staging branch
  ```
  - [x] /staff/queue page functions properly
  - [x] Normal requesters can't access /staff/queue 

  Tell me if you're ready for the merge.
  ```
- **Partner's response:**
  ```
  Glad to hear that! It's good to go, please proceed with the merge.
  ```

### PR: feat(staff-operations): implement IT staff ticket operations, ownership management, and status transitions (#47)
- **Link:** https://github.com/RBKarnz/TokTickIT/pull/47
- **My comment:**
  Approved. Merge feature/lab3-staff-operations to lab3-staging branch
  ```
  - [x] Automated tests passed
  - [x] Followed manual verification in the web browser. No issues.

  Tell me if you're ready for the merge.
  ```
- **Partner's response:**
  ```
  Glad to hear that! It's good to go, please proceed with the merge.
  ```

### PR: feat(admin): implement administrator user management API and UI (#48)
- **Link:** https://github.com/RBKarnz/TokTickIT/pull/48
- **My comment:**
  Approved. Merge feature/lab3-admin-user-management to lab3-staging branch
  ```
  - [x] Code aligns perfectly with specs
  - [x] Followed manual verification instruction and everything works great.

  Tell me if you're ready for the merge.
  ```
- **Partner's response:**
  ```
  Glad to hear that! It's good to go, please proceed with the merge.
  ```
