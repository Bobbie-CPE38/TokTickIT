# TokTickIT

TokTickIT is an IT service desk application for Account and Access, Hardware, Software, and Network requests.

---

## Prerequisites

- **Node.js**: v18+
- **Docker & Docker Compose**: (Recommended for PostgreSQL & Database UI) or a local PostgreSQL instance

---

## Quick Start

### 1. Start Database & Web UI (Docker)

Start the PostgreSQL database and Adminer database management UI:

```bash
docker compose up -d
```

- **PostgreSQL**: `localhost:5432` (User: `toktickit`, Pass: `toktickit`, DB: `toktickit`)
- **Adminer UI**: [http://localhost:8080](http://localhost:8080) *(System: PostgreSQL, Server: `postgres` or `localhost`)*

---

### 2. Backend Setup

```bash
cd server
cp .env.example .env
# Edit .env if you need custom DATABASE_URL or PORT

npm install
npx prisma migrate dev
npm run prisma:seed
npm run dev
```

The backend server will run on `http://localhost:3000`.

---

### 3. Frontend Setup

```bash
cd client
cp .env.example .env
# Edit .env if your API URL differs from http://localhost:3000

npm install
npm run dev
```

The frontend will run on the Vite dev server (typically `http://localhost:5173`).

---

## Running Tests

### Backend Tests
```bash
cd server
npm test
```

### Frontend Tests
```bash
cd client
npm test
```

### End-to-End Tests (Playwright)
```bash
# From the repository root, with the database migrated and seeded
npm install
npx playwright install chromium
npm run test:e2e
```

- Playwright starts the API (`:3000`) and client (`:5173`) automatically, or reuses ones already running.
- Suites live in `e2e/lab-02`, `e2e/lab-03`, and `e2e/lab-04`; each Lab 4 suite runs on the `desktop` (1280px), `tablet` (768px), and `mobile` (375px) projects.
- Each Lab 4 test re-runs `npm run prisma:seed` first, so the suites can be run repeatedly.
- If the API runs on another port, set `E2E_API_URL` (e.g. `E2E_API_URL=http://localhost:3001`) and start the client with a matching `VITE_API_URL`.
- Evidence screenshots are written to `artifacts/lab-04/screenshots/` (`staff-dashboard/`, `requester-dashboard/`, `admin-dashboard/`, `actions-taken/`, `ticket-workflow/`), one file per viewport.

---

## Demo Accounts (seed data)

| Role | Email | Password |
|---|---|---|
| Requester | `jennifer.anderson@kmutt.ac.th` | `Password123!` |
| Requester | `david.lee@kmutt.ac.th` | `Password123!` |
| IT Staff | `staff.michael@toktickit.com` | `Password123!` |
| IT Staff | `staff.sarah@toktickit.com` | `Password123!` |
| Administrator | `admin@toktickit.com` | `AdminPass123!` |
| Inactive IT Staff (login rejected) | `kpatel@toktickit.com` | `Password123!` |

Suggested demo path: sign in as Michael → **Dashboard** → open a ticket → **Actions Taken** tab → record an action → change status to **Resolved** with a summary. Then sign in as Jennifer to view the read-only Actions Taken log and her dashboard.

---

## Migrations and Recovery

- Apply pending migrations without prompts (CI / fresh clone): `npx prisma migrate deploy` (in `server`).
- The seed is idempotent: re-running `npm run prisma:seed` restores the demo users, tickets, and advisory flags to the documented state. It replaces **all** Actions Taken with the seeded set, so do not run it against data you want to keep.
- Rolling back the Lab 4 schema: `DROP TABLE IF EXISTS actions_taken CASCADE;` restores the Lab 3 schema without touching ticket history (see `docs/lab-04/specification.md` §7). For a disposable local database, `npx prisma migrate reset` rebuilds and re-seeds from scratch.

---

## Useful Commands

| Task | Command | Directory |
|---|---|---|
| Start DB containers | `docker compose up -d` | Root |
| Stop DB containers | `docker compose down` | Root |
| Run Prisma migrations | `npx prisma migrate dev` | `server` |
| Run Prisma seed | `npm run prisma:seed` | `server` |
| Open Prisma Studio | `npx prisma studio` | `server` |