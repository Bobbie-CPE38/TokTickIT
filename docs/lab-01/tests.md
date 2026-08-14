# Lab 1 — Test Plan and Evidence

All test files live under server/tests/lab-01/ and client/tests/lab-01/.

| # | Tool | Test | Result |
|---|------|------|--------|
| 1 | Supertest | GET /api/health returns 200, status=ok | Passed |
| 2 | Supertest | GET /api/categories returns 4 seeded categories in id order | Passed |
| 3 | Vitest | Heading renders | Passed |
| 4 | Vitest | Success state shows Online + category list | Passed |
| 5 | Vitest | Error state shows Offline + message | Passed |

Paste your passing terminal output / screenshot below.

### Backend Tests (`server`)

```bash
> toktickit-server@1.0.0 test
> vitest run


 RUN  v2.1.9 C:/Users/acer/Desktop/CPE334/Lab1/TokTickIT/server

 ✓ tests/lab-01/categories.test.ts (1)
 ✓ tests/lab-01/health.test.ts (1)

 Test Files  2 passed (2)
      Tests  2 passed (2)
   Start at  23:27:53
   Duration  1.56s (transform 144ms, setup 0ms, collect 1.02s, tests 199ms, environment 1ms, prepare 533ms)
```

### Frontend Tests (`client`)

```bash
> toktickit-client@1.0.0 test
> vitest run


 RUN  v2.1.9 C:/Users/acer/Desktop/CPE334/Lab1/TokTickIT/client

 ✓ tests/lab-01/App.test.tsx (3)
   ✓ App (3)
     ✓ renders the TokTickIT heading
     ✓ shows Online and the seeded categories on success
     ✓ shows an Offline error message when the API is unavailable

 Test Files  1 passed (1)
      Tests  3 passed (3)
   Start at  23:28:18
   Duration  3.24s (transform 158ms, setup 248ms, collect 416ms, tests 275ms, environment 1.35s, prepare 294ms)
```