# Lab 2 — Peer Review Record  (fill this in)

**Author:** Methipat Mansap — 67070501071 — GitHub: @Bobbie-CPE38

**Peer reviewer:** Teerakarn Noiruksa — 67070501062 — GitHub: @RBKarnz

## Pull Requests I authored (reviewed by my partner)
| PR | Branch | Reviewer verdict |
|----|--------|------------------|
| #11 | docs/lab2-specs -> lab2-staging | Approved |
| #17 | feature/lab2-requester-context -> lab2-staging | Approved |
| #18 | feature/lab2-ticket-creation -> lab2-staging | Approved |
| #19 | feature/lab2-my-tickets -> lab2-staging | Approved |
| #20 | feature/lab2-ticket-detail-attachments -> lab2-staging | Approved |
| #21 | feature/lab2-e2e-and-visuals -> lab2-staging | Approved |

### PR #11: `docs: Lab2 specifications and test plans (#10)`
- **Link:** https://github.com/Bobbie-CPE38/TokTickIT/pull/11
- **Reviewer comment I received:**
  ```
  1. specification.md 
  - [x] มีครบ 11 หัวข้อที่บังคับ และระบุได้ชัดเจนตรงตามโจทย์
  - [x] กำหนด Business Rules และ Acceptance Criteria แบบ Given-When-Then ครอบคลุม
  - [x] ออกแบบ Prisma Schema, ความสัมพันธ์ และ Seed data  ได้ถูกต้อง
  2. tests.md
  - [x] ตาราง Planned Tests มีครบทุกระดับตามที่บังคับ (API, UI, E2E)
  - [x] มีการจับคู่ Acceptance Criteria เข้ากับ Test Cases อย่างชัดเจน
  3. ui-spec.md
  - [x] ระบุ Design Tokens และ Component Rules  ตรงตามมาตรฐานของ Lab
  - [x] ระบุ Responsive Layout ชัดเจน
  4. api-spec.md
  - [x] ออกแบบได้ครบ โดยเฉพาะระบบ My Tickets ที่รองรับ Search, Filter, Sort และ Pagination ตามบังคับ
  - [x] ระบุการจำลอง User ผ่าน X-Requester-Id และใช้ HTTP Status Codes ได้เหมาะสม

  ทุกอย่างครบถ้วน สามารถ Merge ได้เลย
  ```
- **How I responded:**
  ```
  Thanks for your wonderful effort in checking my work.
  ```
  - Merge docs/lab2-specs to lab2-staging branch

### PR #17: `feat(requester): implement Development Requester model, seed, and selector (#12)`
- **Link:** https://github.com/Bobbie-CPE38/TokTickIT/pull/17
- **Reviewer comment I received:**
  - รันคำสั่ง npm test ทั้งใน server และ client แล้วไม่แสดง error ใด ๆ
  - ทดสอบรันคำสั่ง npm run prisma:seed ซ้ำหลาย ๆ ครั้ง ระบบทำงานสำเร็จ ข้อมูลไม่ซ้ำ และไม่แสดง Error ใด ๆ
  - ใน Database GUI มีตาราง development_requesters ถูกสร้างขึ้นจริง และมีข้อมูล Seed ครบ 5 คน (Active 4, Inactive 1)
  - ข้อมูลจาก API เส้น /api/requesters/active คืนค่ามาเฉพาะคนที่สถานะ isActive: true เท่านั้น และเรียงลำดับตาม ID ถูกต้อง
  - เปิดหน้าเว็บครั้งแรก ระบบบังคับเลือก Requester โดยปุ่ม Cancel ถูกปิดไม่ให้ใช้งาน
  - เมื่อเลือกชื่อแล้ว ระบบแสดงชื่อที่มุมขวาบนถูกต้อง ทดลองกด F5 ข้อมูลก็ยังไม่หายไป จำค่าลง Local Storage ได้จริง
  - ทดลองกด Switch Requester มีหน้าต่างเด้งขึ้นมาให้เปลี่ยนชื่อได้ และในรอบนี้ปุ่ม Cancel สามารถกดใช้งานได้ปกติ
  - การแสดงผล UI ครบถ้วน: เห็น Loading spinner, Error state แจ้งเตือนตอนลองปิด server และเห็น Empty state เมื่อลบข้อมูลทิ้งหมด
- **How I responded:**
  ```
  Thanks for your effort reviewing my work.
  ```
  - Merge feature/lab2-requester-context to lab2-staging branch

### PR #18: `feat(tickets): implement POST /api/tickets API and Create Ticket UI with Zen Green validation (#13)`
- **Link:** https://github.com/Bobbie-CPE38/TokTickIT/pull/18
- **Reviewer comment I received:**
  - รันคำสั่ง npm test ในฝั่ง server และ client แล้วไม่แสดง error ใด ๆ
  - หากยังไม่เลือก User ระบบจะบังคับให้เลือกก่อน ถึงจะเข้าหน้าสร้างตั๋วได้
  - API มีการตรวจ Validation ถูกต้อง และสร้างรหัส Ticket (`TKT-YYYY-NNNN`) กับสถานะ NEW ให้อัตโนมัติจริง
  - ในหน้า Create Ticket แสดงข้อมูลผู้แจ้งแบบอ่านได้อย่างเดียว (Read-only)
  - ใน Dropdown ของ Category และ Related System ดึงข้อมูลมาจากฐานข้อมูล (API) จริง
  - มีตัวเลขนับจำนวนตัวอักษรแบบ Real-time ทั้งของ Summary และ Description 
  - การทำงานของปุ่มถูกต้อง: ปุ่มบันทึกมีข้อความ Error แจ้งเตือนถ้าข้อมูลไม่ครบ, ปิดไม่ให้กดตอนกำลังโหลด และปุ่มยกเลิกเคลียร์ค่าว่างให้
  - ทดสอบปิดระบบ Server บางตัว ระบบจะแจ้ง Error เตือนที่ด้านบนของฟอร์ม
- **How I responded:**
  ```
  Thanks for your effort as always.
  ```
  - Merge feature/lab2-ticket-creation to lab2-staging branch

### PR #19: `feat(tickets): implement GET /api/tickets endpoint and My Tickets UI with search, filter, and pagination (#14)`
- **Link:** https://github.com/Bobbie-CPE38/TokTickIT/pull/19
- **Reviewer comment I received:**
  - รันคำสั่ง npm test ในฝั่ง server และ client แล้วไม่แสดง error ใด ๆ
  - API GET /api/tickets ทำงานถูกต้อง รองรับการดึงข้อมูลพร้อม Filter, Search และ Pagination ในตัว
  - มีการ Seed ข้อมูลตัวอย่างที่เพียงพอ ทำให้สามารถทดสอบเปลี่ยนหน้าของระบบ Pagination ได้ทันที
  - หน้า UI แสดงสถานะครบถ้วน
  - ทดสอบกับ Requester: ลองเปลี่ยนชื่อ Requester แล้วรายการตั๋วบนหน้าจอจะถูกกรองและดึงเฉพาะของคนที่เลือกเท่านั้น
  - ทดสอบ Pagination: ล็อกอินเป็นคุณ Jennifer หน้าแรกเจอ "Showing 1 to 10 of 18 tickets" พอกดปุ่ม Next > ก็เปลี่ยนไปหน้าที่ 11-18 ได้ถูกต้อง
  - ทดสอบ Search & Filter: ระบบ Search และตัวกรอง (Filter) ทำงานอัปเดตแบบ Real-time และมีปุ่ม Clear Filters ใช้งานได้จริง
  - ทดสอบ Sorting: สามารถคลิกหัวตารางเพื่อ Sorting ได้ถูกต้อง
  - ทดสอบ Mobile View:หน้า My Tickets แสดงผลตารางเรียบร้อย และปรับหน้าจอเป็นรูปแบบ Card ให้อัตโนมัติเมื่อดูผ่านมือถือ
- **How I responded:**
  ```
  Must've spend you a while.
  Thanks for your effort as always!!!
  ```
  - Merge feature/lab2-my-tickets to lab2-staging branch

### PR #20: `feat(ticket-detail & attachments): Ticket Detail view and Attachment upload/download/soft-removal (#15)`
- **Link:** https://github.com/Bobbie-CPE38/TokTickIT/pull/20
- **Reviewer comment I received (Initial review):**
  - รันคำสั่ง npm test ในฝั่ง server และ client แล้วไม่แสดง error ใด ๆ
  - หน้า Ticket Details แสดงผลข้อมูลได้ครบถ้วน และทุกช่องเป็นฟิลด์แบบ Read-only ทั้งหมด
  - ระบบอัปโหลดไฟล์ทำงานได้จริง รองรับการลากวาง (Drag & Drop) และจำกัดการอัปโหลดสูงสุด 5 ไฟล์
  - ระบบดาวน์โหลดไฟล์ (Download Active Attachment) ทำงานถูกต้อง โหลดออกมามีคุณสมบัติเหมือนกับต้นฉบับ
  - ระบบลบไฟล์ (Soft Removal) ทำงานถูกต้อง มี Modal ให้กรอกเหตุผล (บังคับเกิน 3 ตัวอักษรขึ้นไป) ข้อมูลถูกย้ายไปตาราง Removed History และมีดีไซน์ที่ชัดเจน
  - ทดสอบใช้ curl เพื่อโหลดไฟล์ที่ถูกลบไป ระบบป้องกันสมบูรณ์ (ตอบกลับ HTTP 410 Gone)
  - ระบบ Create Ticket Attachment Staging ทำงานถูกต้อง สามารถแนบไฟล์ 1-2 ไฟล์ลงช่อง (Dropzone) ก่อนกดสร้างตั๋ว แสดงรายการพร้อมปุ่มลบ [x] ออกได้ เมื่อ Submit สร้างตั๋ว ข้อมูลจะถูกอัปโหลดพร้อมผูกเข้ากับตั๋ว
  - [ ] ระบบ Security ในหน้าตั๋ว รองรับ User ที่เป็นคนละคนกับระบบล็อกจากรอบก่อนหน้า (URL /tickets/1) ได้อย่างถูกต้อง เพื่อประสบการณ์ใช้งานที่ดีขึ้น เมื่อผู้ใช้อยู่หน้า Ticket Details แล้วกด Switch Requester ระบบควรจะ Redirect กลับไปยังหน้าหลัก (My Tickets) อัตโนมัติ แทนที่จะปล่อยให้หน้าแสดง Error ขึ้นมา
- **How I responded:**
  ```
  > * [ ]  ระบบ Security ในหน้าตั๋ว รองรับ User ที่เป็นคนละคนกับระบบล็อกจากรอบก่อนหน้า (URL /tickets/1) ได้อย่างถูกต้อง เพื่อประสบการณ์ใช้งานที่ดีขึ้น เมื่อผู้ใช้อยู่หน้า Ticket Details แล้วกด Switch Requester ระบบควรจะ Redirect กลับไปยังหน้าหลัก (My Tickets) อัตโนมัติ แทนที่จะปล่อยให้หน้าแสดง Error ขึ้นมา

  Good idea. Working on it.
  ```
  ```
  I've pushed an update for that.
  Please check it out!
  ```
- **Reviewer comment I received (Re-review):**
  Approved.
  - รันคำสั่ง npm test ในฝั่ง server และ client แล้วไม่แสดง error ใด ๆ
  - หน้า Ticket Details แสดงผลข้อมูลได้ครบถ้วน และทุกช่องเป็นฟิลด์แบบ Read-only ทั้งหมด
  - ระบบอัปโหลดไฟล์ทำงานได้จริง รองรับการลากวาง (Drag & Drop) และจำกัดการอัปโหลดสูงสุด 5 ไฟล์
  - ระบบดาวน์โหลดไฟล์ (Download Active Attachment) ทำงานถูกต้อง โหลดออกมามีคุณสมบัติเหมือนกับต้นฉบับ
  - ระบบลบไฟล์ (Soft Removal) ทำงานถูกต้อง มี Modal ให้กรอกเหตุผล (บังคับเกิน 3 ตัวอักษรขึ้นไป) ข้อมูลถูกย้ายไปตาราง Removed History และมีดีไซน์ที่ชัดเจน
  - ทดสอบใช้ curl เพื่อโหลดไฟล์ที่ถูกลบไป ระบบป้องกันสมบูรณ์ (ตอบกลับ HTTP 410 Gone)
  - ระบบ Create Ticket Attachment Staging ทำงานถูกต้อง สามารถแนบไฟล์ 1-2 ไฟล์ลงช่อง (Dropzone) ก่อนกดสร้างตั๋ว แสดงรายการพร้อมปุ่มลบ [x] ออกได้ เมื่อ Submit สร้างตั๋ว ข้อมูลจะถูกอัปโหลดพร้อมผูกเข้ากับตั๋ว
  - [x] ระบบ Security ในหน้าตั๋ว รองรับ User ที่เป็นคนละคนกับระบบล็อกจากรอบก่อนหน้า (URL /tickets/1) ได้อย่างถูกต้อง เมื่อผู้ใช้อยู่หน้า Ticket Details แล้วกด Switch Requester ระบบได้ Redirect กลับไปยังหน้าหลัก (My Tickets) อัตโนมัติเรียบร้อย
- **How I responded:**
  ```
  Thanks! Appreciate your time and effort in reviewing this.
  ```
  - Merge feature/lab2-ticket-detail-attachments to lab2-staging branch

### PR #21: `test(e2e): implement Playwright E2E suite and capture responsive visual screenshots (#12)`
- **Link:** https://github.com/Bobbie-CPE38/TokTickIT/pull/21
- **Reviewer comment I received:**
  - รันคำสั่ง npm run test:e2e ผ่านครบทั้ง 6 test suites บนหน้าจอทั้ง 3 ขนาด (Desktop, Tablet, Mobile)
  - รันคำสั่ง npm test และ npx tsc --noEmit ในฝั่ง server และ client แล้วไม่แสดง error ใด ๆ
  - ทดสอบสร้างตั๋วผ่านหน้า Desktop ล็อกอินเป็น Jennifer Anderson กรอกข้อมูลพร้อมแนบรูป PNG ระบบสามารถสร้างตั๋วขึ้นมาแสดงได้
  - ทดสอบระบบหน้า Ticket Details สามารถกด Download ไฟล์แนบได้ปกติ พอกด Remove Attachment ใส่เหตุผล ข้อมูลจะถูกย้ายไป Removed Attachments History และไม่สามารถโหลดได้อีก
  - ทดสอบหน้าจอมือถือ (Mobile Layout) ย่อขนาดเป็น 375px ในส่วน Header แสดงไอคอนแบบย่อพร้อมกับกล่อง Profile ส่วนหน้าต่างตั๋วแสดงแบบการ์ดซ้อนกันเรียบร้อย ไม่ตกขอบและไม่มีแถบเลื่อนแนวนอน
  - ทดสอบระบบจำกัดสิทธิ์ สำหรับ Acount ด้านบน Profile เป็น David Lee ระบบทำงานถูกต้อง รายการตั๋วของ Jennifer ไม่แสดงขึ้นมาให้กวนใจ
- **How I responded:**
  ```
  Appreciate your effort, as always.
  ```
  - Merge feature/lab2-e2e-and-visuals to lab2-staging branch

## Pull Requests I reviewed for my partner
- **PR: docs: finalize lab 2 engineering specifications, api, ui, and test plans (#17)**
  - **Link:** https://github.com/RBKarnz/TokTickIT/pull/17
  - **My comment (Initial review):**
    ```
    There're several topic missing from these files in docs/lab-02:
    - api-spec.md
    - ui-spec.md
    - tests.md
    - specification.md
    ```
  - **Partner's response:**
    ```
    Thanks Let me double-check those files and fix the missing parts.
    ```
    ```
    All fixed Thank you for the feedback.
    ```
  - **My comment (Re-review):**
    Approved.
    ```
    All checked. Good to go.
    ```
  - **Partner's response:** Merge feature/lab2-specs2 to lab2-staging branch

- **PR: feat: Implement development requester context and selector UI (#25)**
  - **Link:** https://github.com/RBKarnz/TokTickIT/pull/25
  - **My comment:**
    Approved.
    ```
    Correct UI layout, UI states work.

    Good to go.
    ```
  - **Partner's response:**
    ```
    Awesome, thanks for the review.
    ```
    - Merge feature/lab2-requester-context to lab2-staging branch

- **PR: feat: Implement create ticket API and responsive UI (#26)**
  - **Link:** https://github.com/RBKarnz/TokTickIT/pull/26
  - **My comment:**
    Approved.
    ```
    ## Tested
    - [x] Submit form with empty input fields
      - [x] Verify red field-level validation errors appear under each input
      - [x] Verify zero API requests are sent in the network tab
    - [x] Verify Summary and Description length validation
    - [x] Verify created ticket uses the correct format (`TKT-YYYY-XXXXXX`)
    - [x] Verify new ticket appears in the database with the selected `requesterId` and `currentStatus` set to `"NEW"`
    ```
  - **Partner's response:**
    ```
    Awesome, thanks for verifying all the test cases.
    ```
    - Merge feature/lab2-create-ticket to lab2-staging branch

- **PR: feat: Implement My Tickets dashboard with search and date filters (#27)**
  - **Link:** https://github.com/RBKarnz/TokTickIT/pull/27
  - **My comment (Initial review):**
    ```
    I've checked. Everything aligns with acceptance criteria.

    But there's one minor mistake.
    When selected requester > go to switch requester > cancel
    The cancel button doesn't work (and/or not disabled).
    ```
    Inline review comment on `README.md`:
    ```
    It should be either docker-compose or docker compose.
    ```
  - **Partner's response:**
    ```
    Thanks! I'll get the Cancel button fixed right away.
    ```
    Inline response on `README.md`:
    ```
    Fixed as requested.
    ```
    ```
    Fixed! The Cancel button is now working. I also added some seed data and improved the pagination.
    ```
    ```
    Feel free to merge if everything look good.
    ```
  - **My comment (Re-review):**
    Approved.
    ```
    Good work.

    Verified tests:
    - [x] The list displays tickets owned by the currently selected Requester
    - [x] Search, filter, pagination works
    - [x] Responsive UI
    - [x] Failure state
    ```
  - **Partner's response:** Merge feature/lab2-my-tickets to lab2-staging branch

- **PR: feat: Implement Requester Ticket Detail and responsive UI (#28)**
  - **Link:** https://github.com/RBKarnz/TokTickIT/pull/28
  - **My comment:**
    Approved.
    ```
    Verified tests:
    - [x] Correct ticket detail URL `/tickets/<ticket-id>`
    - [x] Access denied when trying to view detail of other requester's tickets
    - [x] In ticket detail, all inputs are read-only, and status/priority badges render beautifully

    Good work.
    Just let me know if you're ready for the merge.
    ```
  - **Partner's response:**
    ```
    Ready! Please go ahead and merge. Thanks.
    ```
    - Merge feature/lab2-ticket-detail to lab2-staging branch

- **PR: feat: Implement attachment management with soft-delete (#29)**
  - **Link:** https://github.com/RBKarnz/TokTickIT/pull/29
  - **My comment (Initial review):**
    ````
    I tried to run `npm test` in client and it fails.

    ```
     ✓ tests/lab-01/App.test.tsx > App > renders the TokTickIT heading
     ❯ tests/lab-01/App.test.tsx > App > shows Online and the seeded categories on success
       × TestingLibraryElementError: Unable to find an accessible element with the role "button" and name /Check System/i
     ❯ tests/lab-01/App.test.tsx > App > shows an Offline error message when the API is unavailable
       × TestingLibraryElementError: Unable to find an accessible element with the role "button" and name /Check System/i
     Test Files  1 failed (1)
          Tests  2 failed | 1 passed (3)
    ```
    ````
    Inline review comment on `client/src/api.ts`:
    ```
    ### Restore Placeholder Tabs on Ticket Detail (ui-spec.md §3.5): 
    The tab bar (Public Comments, Internal Notes, Actions Taken) was dropped when adding the attachment card in commit 5fb5ad2.

    Of course, it makes the UI cleaner removing unnecessary things for now.
    But I think we should follow designed specs, shouldn't we?
    Placeholder Sections: Tabs or sections such as "Public Comments", "Internal Notes", and "Actions Taken" must be visually present but treated as disabled or placeholders for Lab 2.
    ```
    Inline review comment on `client/src/pages/CreateTicketPage.tsx`:
    ```
    ### Handle BR-12 in Create Ticket (specification.md §5): 
    If a user submits a ticket with attachments and an attachment upload fails after the ticket is already created:
    - Current behavior: Catches the error and leaves the form open, which can create a duplicate ticket if the user clicks "Submit" again.
    - Spec requirement: Still navigate to the success state with the ticket number, but show an alert/warning that some files failed to upload and can be retried in the Ticket Detail view.

    BR-12: If ticket creation succeeds but the attachment upload fails, the system must NOT rollback the ticket creation. It should save the ticket, present a warning to the
    ```
  - **Partner's response:**
    ```
    On it! I'll get this fixed right away.
    ```
    ```
    I've pushed the fixes. Could you recheck?
    ```
  - **My comment (Re-review):**
    Approved.
    ```
    Checked. Aligns with specs now.
    ```
    ```
    Good work.
    - [x] Only allow maximum of 5 files
    - [x] Soft remove working properly. (Tested with postman, unable to download soft-removed attachments)
    - [x] Unable to download other requester's attachment from direct API call
    - [x] Aligns with specs

    Let me know if you're ready for the merge!
    ```
  - **Partner's response:**
    ```
    Feel free to merge if everything look good.
    ```
    - Merge feature/lab2-attachment to lab2-staging branch