# API Reference

Base backend URL:

```text
http://localhost:3001
```

## Health

- `GET /healthz`
  - Returns `{ "ok": true }`

## Gyms

- `GET /api/gyms`
  - Returns the list of gyms
- `GET /api/gyms/:id/live`
  - Returns the live snapshot for one gym
  - Validates UUID format
  - Returns `404` if the gym does not exist
- `GET /api/gyms/:id/analytics?dateRange=7d|30d|90d`
  - Returns heatmap, revenue breakdown, churn risk, and member mix data
  - Validates the gym id and date range

## Members

- `GET /api/members?gym_id=<uuid>`
  - Returns members for one gym
  - Requires `gym_id`
  - Returns `400` if the query parameter is missing or invalid

## Anomalies

- `GET /api/anomalies?gym_id=<uuid>&severity=warning|critical`
  - Returns anomalies filtered by gym or severity
- `PATCH /api/anomalies/:id/dismiss`
  - Dismisses a warning anomaly
  - Critical anomalies stay protected
  - Broadcasts `ANOMALY_RESOLVED` over WebSocket

## Analytics

- `GET /api/analytics/cross-gym?dateRange=7d|30d|90d`
  - Returns revenue ranking across all gyms
  - Defaults to `30d` when the query is omitted

## Simulator

- `POST /api/simulator/start`
  - Starts the simulator
  - Accepts `speed` or `speedMultiplier`
  - Valid values are `1`, `5`, and `10`
- `POST /api/simulator/stop`
  - Pauses the simulator
- `POST /api/simulator/reset`
  - Resets live state back to baseline

## WebSocket

- `WS /ws`
  - Sends an initial `CONNECTED` message when the client attaches
  - Broadcasts live events for:
    - `CHECKIN_EVENT`
    - `CHECKOUT_EVENT`
    - `PAYMENT_EVENT`
    - `ANOMALY_DETECTED`
    - `ANOMALY_RESOLVED`

## Error Handling

- Invalid UUIDs return `400`
- Invalid date ranges return `400`
- Invalid severity filters return `400`
- Missing gyms return `404`
- The server responds with JSON error bodies through the shared error handler in `src/utils/http.js`

