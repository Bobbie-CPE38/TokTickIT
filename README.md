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

---

## Useful Commands

| Task | Command | Directory |
|---|---|---|
| Start DB containers | `docker compose up -d` | Root |
| Stop DB containers | `docker compose down` | Root |
| Run Prisma migrations | `npx prisma migrate dev` | `server` |
| Run Prisma seed | `npm run prisma:seed` | `server` |
| Open Prisma Studio | `npx prisma studio` | `server` |