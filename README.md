# TokTickIT
TokTickIT is an IT service desk application for Account and Access, Hardware, Software, and Network requests.

## Prerequisites
- Node.js (v18+)
- PostgreSQL database running locally

## Quick Start

### 1. Backend Setup
```bash
cd server
cp .env.example .env
# Edit .env and update DATABASE_URL with your local PostgreSQL credentials

npm install
npx prisma db push
npm run dev
```

### 2. Frontend Setup
```bash
cd client
cp .env.example .env
# Edit .env to set API endpoints or app keys if required

npm install
npm run dev
```

### 3. Running Tests
#### Frontend test
```bash
cd client && npm test
```
#### Backend tests
```bash
cd server && npm test
```

### 4. Verify Project Foundation
#### Start backend: 
```bash
cd server && npm run dev
```
#### Start frontend: 
```bash
cd client && npm run dev
```
#### Run test suites:
```bash
npm test
```
 inside both `client` and `server` folders.