# WTF LivePulse

WTF LivePulse is a real-time operations dashboard for a multi-gym business. It combines PostgreSQL, Node.js, React, WebSockets, and Docker Compose to show live occupancy, revenue, anomalies, analytics, and simulator-driven activity.

## What Is In This Repo

- `backend/` - Express API, PostgreSQL store, simulator, anomaly detection, WebSocket hub, and test suites
- `frontend/` - React dashboard, analytics pages, anomaly workflow, and Playwright tests
- `benchmarks/` - SQL for the required query benchmarks plus captured `EXPLAIN` outputs
- `docs/` - Detailed documentation for setup, architecture, database, API, frontend, testing, and benchmarks

## Current Artifacts

- Backend coverage report: [`backend/coverage/lcov-report/index.html`](./backend/coverage/lcov-report/index.html)
- Benchmark outputs: [`benchmarks/screenshots/`](./benchmarks/screenshots)

## Quick Start

Prerequisite:
- Docker Desktop or another Docker engine

Run the stack:

```bash
docker compose up
```

Then open:

- UI: `http://localhost:3000`
- Backend health: `http://localhost:3001/healthz`

If you only need a restart:

```bash
docker compose restart
```

If you want to stop everything:

```bash
docker compose down
```

If you want a full reset of the database:

```bash
docker compose down -v
docker compose up
```

## Documentation

- Start here: [`docs/README.md`](./docs/README.md)
- Product overview: [`docs/overview.md`](./docs/overview.md)
- Architecture: [`docs/architecture.md`](./docs/architecture.md)
- Database design: [`docs/database.md`](./docs/database.md)
- API reference: [`docs/api.md`](./docs/api.md)
- Frontend structure: [`docs/frontend.md`](./docs/frontend.md)
- Operations and commands: [`docs/operations.md`](./docs/operations.md)
- Testing and coverage: [`docs/testing.md`](./docs/testing.md)
- Query benchmarks: [`docs/benchmarks.md`](./docs/benchmarks.md)
- Known limitations: [`docs/limitations.md`](./docs/limitations.md)

## AI Tools Used

- OpenAI Codex / ChatGPT were used to scaffold the repository, implement the backend and frontend, add tests, generate benchmark outputs, and write documentation.

