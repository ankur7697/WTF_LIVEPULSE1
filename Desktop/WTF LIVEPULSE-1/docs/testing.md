# Testing and Coverage

## Backend Tests

Location:

- [`backend/tests/unit/services.test.js`](../backend/tests/unit/services.test.js)
- [`backend/tests/integration/api.test.js`](../backend/tests/integration/api.test.js)

Coverage:

- anomaly rules
- simulator timing rules
- churn-risk helpers
- REST routes
- simulator routes
- dismiss flow
- member lookup route

Run locally:

```bash
cd backend
npm install
npm test
```

Current result from this workspace:

- `28/28` tests passing
- coverage report generated in [`backend/coverage/`](../backend/coverage)

## Frontend E2E Tests

Location:

- [`frontend/tests/dashboard.spec.js`](../frontend/tests/dashboard.spec.js)
- [`frontend/tests/anomaly.spec.js`](../frontend/tests/anomaly.spec.js)

These tests run against the mock runtime defined in [`frontend/src/mocks/mockRuntime.js`](../frontend/src/mocks/mockRuntime.js).

Run locally:

```bash
cd frontend
npm install
npx playwright install
npm run test:e2e
```

## Why The E2E Suite Uses Mocks

- The mock runtime makes the browser tests deterministic.
- It keeps the UI test independent from Docker and PostgreSQL in this environment.
- It still exercises the actual React screens, state transitions, and dismiss/simulator interactions.

## Coverage Report

The backend Jest command is configured with coverage output in `backend/package.json`.

Report location:

- [`backend/coverage/lcov-report/index.html`](../backend/coverage/lcov-report/index.html)

Raw coverage artifact:

- [`backend/coverage/lcov.info`](../backend/coverage/lcov.info)

