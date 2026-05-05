# Cold Chain Control

POC for monitoring refrigerated trucks: GPS route tracking + per-box temperature
and humidity readings. Mobile-first web app, deployed on Render as two services.

> Codebase in English. UI strings in Spanish.

## Repo layout

```
cold-chain-control/
├── backend/      # Node + Express + Socket.IO + Prisma (PostgreSQL)
│   ├── prisma/   # schema.prisma + seed.js
│   ├── src/
│   │   ├── middleware/   # requireAuth, requireRoot
│   │   ├── routes/       # alerts, auth, boxes, routes, simulator, trucks
│   │   ├── simulator/    # engine.js (in-process GPS/sensor simulator)
│   │   ├── sockets/      # Socket.IO event wiring
│   │   └── utils/        # token helpers
│   └── tests/            # Jest + Supertest unit tests
└── frontend/     # React + Vite + Tailwind (mobile-first)
    └── src/
        ├── api/          # client.js (HTTP), socket.js (Socket.IO)
        ├── auth/         # AuthContext.jsx
        ├── components/   # BottomNav, Layout, ProtectedRoute
        ├── pages/        # Alerts, Ayuda, Bugs, Home, Inventory, Login, More, …
        └── test/         # Jest setup, globals, mocks
```

The two folders are deployed as **independent Render services** (a Web Service
for the backend and a Static Site for the frontend) but live in the same repo
to make local development easier. See `render.yaml`.

## Data model

```
User          – app accounts (dummy auth, role USER | ROOT)
Driver        – professional driver assigned to a truck (licenseNumber unique)
Truck         – refrigerated truck, optionally linked to a Driver
Box           – refrigerated container mounted on a truck
Route         – planned/active trip from an origin branch to a destination branch
Branch        – physical location (warehouse, pharmacy, hospital, distribution center)
Product       – pharmaceutical product (SKU, category)
BoxLoad       – product loaded into a box for a specific route
Position      – GPS point recorded during a route
Reading       – temperature/humidity sensor reading from a box
Alert         – out-of-range sensor alert (TEMP | HUM, WARNING | CRITICAL)
Bug           – in-app bug report (status: OPEN | IN_PROGRESS | CLOSED)
Faq           – FAQ entry displayed on the Help (Ayuda) page
```

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
npm run db:generate        # generate Prisma client
npm run db:push            # apply schema to DB
npm run db:seed            # insert dummy data
npm run dev                # http://localhost:4000
```

### 3. Frontend

```bash
cd frontend
cp .env.example .env       # edit VITE_API_URL=http://localhost:4000
npm install
npm run dev                # http://localhost:5173
```

## Default credentials (dummy)

| user  | password | role | notes                          |
|-------|----------|------|--------------------------------|
| max   | max      | USER | regular dashboard              |
| yahel | yahel    | ROOT | sees the simulation panel      |

## Live demo simulation

Login as `yahel` → menu **Más** → **Panel de simulación** (`/root`). From there
you can start/stop routes and inject temperature/humidity alerts. All connected
clients receive the events in real time via Socket.IO.

## Tests

```bash
# Backend — Jest + Supertest (71 tests, ≥92% coverage)
cd backend && npm test

# Backend with coverage report
cd backend && npm test -- --coverage

# Frontend — Jest + Testing Library (67 tests, ≥94% statements)
cd frontend && npm test

# Frontend with coverage report
cd frontend && npm test -- --coverage --forceExit
```

Coverage thresholds are enforced in CI:

| Layer    | Statements | Functions | Branches | Lines |
|----------|-----------|-----------|----------|-------|
| Backend  | 90 %      | 90 %      | 90 %     | 90 %  |
| Frontend | 90 %      | 90 %      | 90 %     | 90 %  |

## Changelog — 2026-05-04

### New DB entities
- **`Driver`** — professional driver with `firstName`, `lastName`, `licenseNumber` (unique), `phone`. Linked to `Truck` via optional FK (`driverId`). `Truck.driverName` (string) is kept for display compatibility; `Driver` is the structured record.
- **`Faq`** — FAQ entry (`question`, `answer`, `category`, `sortOrder`) seeded from the same questions shown in the Ayuda page.

### Unit test suite (new)
Backend tests added in `backend/tests/`:
- `middleware.test.js` — `requireAuth` and `requireRoot` guards.
- `trucks-alerts.test.js` — `GET /api/trucks`, `GET /api/trucks/:id`, truck positions, alerts list, `POST /api/alerts/:id/ack`.
- `routes-bugs.test.js` — full CRUD for routes (`live-history`, list, get, create, delete) and bugs endpoints.
- `boxes.test.js` — inventory endpoint, readings with filters, 2 000-row cap.
- `branches-simulator.test.js` — branches listing and all simulator control endpoints.

Frontend tests added in `frontend/src/`:
- `api/client.test.js` — request helper, auth headers, error handling.
- `auth/AuthContext.test.jsx` — login, logout, session restore, error state.
- `components/ProtectedRoute.test.jsx` — redirect when unauthenticated, role gating.
- `pages/Alerts.test.jsx`, `Home.test.jsx`, `Inventory.test.jsx`, `Rutas.test.jsx`, `Bugs.test.jsx` — data display, user interactions, empty/loading/error states.
- `pages/static-pages.test.jsx` — AcercaDe, Ayuda (FAQ toggle), Documentación (section expand).
- `pages/ajustes-more.test.jsx` — Ajustes profile display, More nav links, simulator access, logout modal.

### Copilot instructions updated
- `backend.instructions.md` and `frontend.instructions.md` now require:
  - Tests written **in the same response** as any new code (no deferred test steps).
  - Coverage targets raised to **80 %** statements/functions/lines, **70 %** branches.
  - README updated whenever new features or entities are added.

## Deploy on Render

See `render.yaml`. Two services + one PostgreSQL DB:

1. `cold-chain-control-db` — PostgreSQL (free).
2. `cold-chain-control-api` — Web Service (Node), root dir `backend/`.
3. `cold-chain-control-web` — Static Site, root dir `frontend/`.

Set `VITE_API_URL` on the static site to the public URL of the API service.
