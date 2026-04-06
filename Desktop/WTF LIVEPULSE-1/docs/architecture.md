# Architecture

## High-Level Flow

```text
Browser -> React app -> REST API / WebSocket -> Node.js backend -> PostgreSQL
                       -> mock runtime for Playwright tests
```

## Runtime Services

The Docker Compose stack uses three services:

- `db` - PostgreSQL 15 with migration scripts mounted into the init directory
- `backend` - Express server, WebSocket hub, anomaly detector, simulator controller, and data access layer
- `frontend` - Nginx-served production build of the React app

## Backend Startup Flow

When the backend starts, it:

1. Creates the PostgreSQL store
2. Ensures the seed data exists
3. Builds the Express app
4. Attaches the HTTP server and WebSocket hub
5. Starts the simulator controller
6. Starts the anomaly detector loop
7. Starts the materialized view refresh job

The backend entry point is [`backend/src/app.js`](../backend/src/app.js).

## Backend Layers

- `src/createApp.js` wires routes and error handling
- `src/routes/` contains the REST endpoints
- `src/store/` contains the PostgreSQL store and the in-memory test store
- `src/services/` contains business rules for anomalies, stats, and simulation
- `src/jobs/` contains background loops for anomalies, simulation, and materialized view refresh
- `src/websocket/server.js` provides the live event hub at `/ws`

## Frontend Layers

- `src/store/DashboardContext.jsx` owns client state, bootstrapping, and live event handling
- `src/hooks/` exposes small hooks around the shared dashboard state
- `src/pages/` contains the dashboard, analytics, and anomalies screens
- `src/components/` contains the panels, charts, feed, simulator controls, tables, and toast UI
- `src/lib/api.js` switches between the live API and the mock runtime using `VITE_USE_MOCKS`
- `src/mocks/mockRuntime.js` powers the Playwright tests

## Design Decisions

- PostgreSQL is the source of truth because the app needs transactional writes and fast analytical reads.
- The hottest reads are backed by targeted B-tree and BRIN indexes.
- The hourly heatmap uses a materialized view because the grouped aggregate is expensive to recompute on every render.
- The frontend keeps shared state in a single dashboard context so live updates, tabs, toasts, and cross-page state stay in sync.
- The E2E test suite uses a mock runtime so the UI can be exercised without depending on a live backend in the browser test environment.

