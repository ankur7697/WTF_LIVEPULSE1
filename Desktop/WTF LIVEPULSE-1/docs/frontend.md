# Frontend

## Application Structure

The frontend is a React application built around a shared dashboard context.

Main files:

- `src/App.jsx` - routes between the dashboard, analytics, and anomalies views
- `src/store/DashboardContext.jsx` - global state, bootstrap flow, live updates, and actions
- `src/hooks/` - thin wrappers around the shared dashboard state
- `src/pages/` - screen-level containers
- `src/components/` - reusable panels and UI elements
- `src/mocks/mockRuntime.js` - test-time runtime used by Playwright

## Views

### Dashboard

Shows:

- selected gym name and city
- current occupancy
- today's revenue
- active anomaly count
- live activity feed
- simulator controls
- a compact anomaly preview for the selected gym

### Analytics

Shows:

- heatmap chart
- revenue breakdown by plan
- new vs renewal ratio
- churn risk panel
- cross-gym revenue ranking
- date range selector

### Anomalies

Shows:

- unresolved anomalies
- warning and critical severity states
- dismiss action for warning anomalies
- confirmation prompt before dismissal
- unread anomaly count in the navigation badge

## Live State Model

The dashboard context keeps the following data in memory:

- list of gyms
- selected gym snapshot
- analytics payload
- anomalies list
- cross-gym revenue ranking
- activity feed
- summary metrics
- simulator state
- websocket connection state
- toast queue

Live WebSocket events update that shared state so the nav badge, feed, summary cards, and selected gym panel stay in sync.

## API Switching

`src/lib/api.js` decides whether the frontend uses the live backend or the mock runtime.

Environment variables:

- `VITE_USE_MOCKS=true` - use the local mock runtime
- `VITE_API_BASE=/api` - prefix for live REST requests

The Playwright config uses mocks so the browser tests are deterministic and do not require the backend service in that test run.

## Visual System

- Dark command-center layout
- Summary cards and pills for quick scanning
- Badge on the anomalies tab when unresolved anomalies exist
- Toasts for anomaly detection
- Live status dot in the brand header

