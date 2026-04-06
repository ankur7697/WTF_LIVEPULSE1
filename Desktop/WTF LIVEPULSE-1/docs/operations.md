# Operations

## Docker Quick Start

```bash
cd "/Users/ankursharma/Desktop/WTF LIVEPULSE-1"
docker compose up
```

Ports:

- Frontend: `http://localhost:3000`
- Backend health: `http://localhost:3001/healthz`
- Backend API base: `http://localhost:3001/api`

## Restart

```bash
docker compose restart
```

Use this when the containers are already running and you want them to restart without recreating volumes.

## Stop

```bash
docker compose down
```

Use `docker compose down -v` if you also want to delete the Postgres volume and reseed from scratch on the next start.

## Local Development

Backend:

```bash
cd backend
npm install
npm start
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

## Test Commands

Backend:

```bash
cd backend
npm test
```

Frontend:

```bash
cd frontend
npx playwright install
npm run test:e2e
```

## Environment Variables

Backend:

- `DATABASE_URL`
- `PORT`
- `NODE_ENV`

Frontend:

- `VITE_USE_MOCKS`
- `VITE_API_BASE`

## Troubleshooting

- If `docker compose exec` says the service is not running, start the stack first with `docker compose up -d`.
- If port `3000` or `3001` is already in use, stop the conflicting process or adjust the compose mapping.
- If the browser shows stale UI assets, hard refresh the page or clear site data for `localhost:3000`.

