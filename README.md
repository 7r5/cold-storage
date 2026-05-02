# Cold Chain Control

POC for monitoring refrigerated trucks: GPS route tracking + per-box temperature
and humidity readings. Mobile-first web app, deployed on Render as two services.

> Codebase in English. UI strings in Spanish.

## Repo layout

```
cold-chain-control/
├── backend/      # Node + Express + Socket.IO + Prisma (PostgreSQL)
└── frontend/     # React + Vite + Tailwind (mobile-first)
```

The two folders are deployed as **independent Render services** (a Web Service
for the backend and a Static Site for the frontend) but live in the same repo
to make local development easier. See `render.yaml`.

## Local development

### 1. PostgreSQL

You need a PostgreSQL instance. Easiest options:
- A free Render PostgreSQL (recommended for parity with prod).
- A local docker container: `docker run --name ccc-pg -e POSTGRES_PASSWORD=pg -p 5432:5432 -d postgres:16`.

### 2. Backend

```bash
cd backend
cp .env.example .env       # edit DATABASE_URL
npm install
npm run db:push            # apply prisma schema
npm run db:seed            # insert dummy data (admin/admin, root/root, ...)
npm run dev                # http://localhost:4000
```

### 3. Frontend

```bash
cd frontend
cp .env.example .env       # edit VITE_API_URL
npm install
npm run dev                # http://localhost:5173
```

## Default credentials (dummy)

| user   | password | role  | notes                          |
|--------|----------|-------|--------------------------------|
| admin  | admin    | USER  | regular dashboard              |
| root   | root     | ROOT  | sees the simulation panel      |

## Live demo simulation

Login as `root` → menu **Más** → **Panel de simulación** (`/root`). From there
you can start/stop routes and inject temperature/humidity alerts. All connected
clients receive the events in real time via Socket.IO.

## Tests

```bash
cd backend && npm test
cd frontend && npm test
```

## Deploy on Render

See `render.yaml`. Two services + one PostgreSQL DB:

1. `cold-chain-control-db` — PostgreSQL (free).
2. `cold-chain-control-api` — Web Service (Node), root dir `backend/`.
3. `cold-chain-control-web` — Static Site, root dir `frontend/`.

Set `VITE_API_URL` on the static site to the public URL of the API service.
