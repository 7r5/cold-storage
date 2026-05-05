---
applyTo: "backend/**"
description: "Guidelines for the Cold Chain Control backend (Express + Prisma + Socket.IO)."
---

# Backend instructions — Cold Chain Control API

## Project context (POC)
- This is a **proof of concept built to study JavaScript / Node / Prisma / Socket.IO**. Not every piece needs to behave like a real-world production system.
- Even so, **use current/idiomatic technologies and patterns** — modern Express, Prisma, async/await, Jest, etc. Don't ship code that would be considered legacy today.
- Auth is intentionally simplified: tokens are **dummy strings without encryption/signing** (`src/utils/token.js`). Their only job is to enable browser sessions and to gate protected endpoints. Do **not** replace this with real JWT/bcrypt unless the user asks.
- **Sensor data is not real.** All temperature/humidity readings and truck GPS positions are produced by the in-process simulator at `src/simulator/engine.js` and broadcast via Socket.IO. There is no physical hardware, no MQTT broker, and no external IoT integration. New "readings" must originate from the simulator, never from route handlers or the seed.
- The app is **deployed to Render** (`render.yaml` at repo root). Keep `src/index.js` honoring `process.env.PORT` and `/api/health` working — Render uses it as the health probe.

## Files that require explicit user confirmation before editing
Even though all data is dummy, ask the user before modifying:
- `backend/prisma/schema.prisma`
- `backend/prisma/seed.js`
- `backend/src/config.js` (env wiring)
- `render.yaml` (deploy config)
- Any `.env*` file

## Stack & layout
- Node.js + Express 4 (CommonJS, `require`/`module.exports`).
- PostgreSQL via Prisma 5 (`backend/prisma/schema.prisma`).
- Real-time via Socket.IO (`backend/src/sockets/`).
- Domain simulator in `backend/src/simulator/engine.js`.
- Tests with Jest + Supertest in `backend/tests/**/*.test.js`.
- Entry point: `src/index.js` boots; `src/app.js` exports `createApp()` (no `.listen`) so it stays testable.

## Language conventions
- **All code, identifiers, comments, commit messages, logs and DB column/table names are in English.**
- Prisma models in `PascalCase`, table/column mapping in `snake_case` via `@map`/`@@map` (already used — keep that style).
- API JSON keys: `camelCase`.
- User-facing error strings returned to the API (`error: '...'`) may stay in Spanish (frontend is in Spanish) — keep them short and consistent with existing routes.

## Known pitfalls (lessons learned from real deploy failures)
- **Never use curly/typographic quotes (`“` `”` `‘` `’`) inside JavaScript string literals** in seed files or any `.js` file. Node treats them as unexpected identifiers and throws a `SyntaxError` at startup. Always use straight ASCII quotes (`'` or `"`).
  - *Root cause*: `seed.js` FAQ answers contained `“Simular ruta”` inside a double-quoted string → `SyntaxError: Unexpected identifier 'ruta'` on Node 24 during Render build.
- **Validate seed files parse cleanly before pushing**: run `node --check prisma/seed.js` before every commit that touches the seed.

## Code style
- Format with **Prettier** (project default config). Run it before committing; do not hand-format.
- Prefer small, pure functions. Keep route handlers thin; push logic into helpers/services.
- Never put `app.listen` in `app.js`. Always export `createApp()` so tests can mount with Supertest.
- Use `async/await` with `try/catch`; forward unknown errors via `next(err)` to the central error handler in `app.js`.
- Validate inputs at the boundary (route handler). Reject early with `400` and a clear `error` message.
- Use `requireAuth` / role middleware from `src/middleware/auth.js` for all protected routes (already wired in `app.js`).
- Read configuration only from `src/config.js` (which reads `process.env`). Do not call `process.env.*` from random files.
- Never log secrets, tokens, passwords or full request bodies that may contain credentials.

## Prisma & DB
- Schema changes: edit `prisma/schema.prisma`, then `npm run db:generate` and `npm run db:push`.
- Always specify `onDelete` behavior explicitly for relations (see existing `Box.truck` cascade).
- Use `select` / `include` deliberately — do not return whole rows when only a subset is needed (avoid leaking fields like `password`).
- Never interpolate user input into raw SQL. Use Prisma query API; if `$queryRaw` is unavoidable, use the tagged template form.
- Keep enums in `schema.prisma` in sync with any constants used in routes/sockets.

## Auth & security (OWASP-aware)
- POC reminder: passwords are stored plain and tokens are dummy (`src/utils/token.js`) — by design, only to enable browser sessions and protect endpoints. Do **not** swap this out for real auth without being asked.
- Even so:
  - Always check `requireAuth` on any new protected route.
  - Validate role with the existing role guard before exposing ROOT-only endpoints.
  - Whitelist CORS origins via `config.corsOrigins`. Never use `cors({ origin: '*' })` with `credentials: true`.
  - Sanitize/validate all numeric IDs with `Number(...)` + `Number.isInteger` checks before passing to Prisma.
  - Return `404` for "not found or not yours" to avoid resource enumeration.

## Coordinate convention
- `Route.waypoints` (Json field in DB) stores coordinates as **`[lng, lat]`** (GeoJSON / Mapbox order). This matches the external data source and must not be changed.
- `Position` table columns are named `lat` and `lng` as separate `Float` fields and store values in their natural meaning (`lat ≈ 20`, `lng ≈ -100` for Mexico).
- `engine.js` `interpolate()` receives `[lng, lat]` waypoints and returns `[lat, lng]` — keep this swap in place.
- Socket event `truck:position` emits `{ lat, lng }` in natural order (lat ≈ 20, lng ≈ -100).
- Never add runtime heuristics to detect coordinate order — if the convention changes, update the data and the swap in `interpolate()` explicitly.

## Sockets & simulator
- Socket auth must reuse the same token verification as HTTP (`src/utils/token.js`).
- The simulator (`src/simulator/engine.js`) is the single source of truth for synthetic readings/positions. Don't generate readings from route handlers.
- Emit events with stable, documented names; payloads in `camelCase`. When changing an event, update the frontend `src/api/socket.js` in the same change.

## README
- **Whenever new routes, models, or significant features are generated, update `README.md` in the same response**: add the new entity to the data model table, document any new endpoints or commands, and append a `Changelog` entry with the date.

## Tests (Jest + Supertest)
- **Every time new code is generated — a route, middleware, utility, or Prisma helper — write the corresponding tests in `backend/tests/` in the same response. Do not defer tests to a follow-up step.**
- Use `createApp()` + `supertest(app)` — do not bind a real port in tests.
- Keep tests deterministic: mock `Date.now` / timers when asserting on the simulator engine; mock Prisma client when asserting on routes (no real DB in unit tests).
- Cover at minimum: happy path, auth failure (401), validation failure (400), not-found (404).
- **Minimum coverage target: 90%** (lines, statements, functions & branches) on changed files. Don't lower the bar to make a PR pass.
- After writing tests, confirm they pass by running `npm test --runInBand` and include the result summary in the response.
- Run with `npm test` from `backend/`. Tests must pass before considering a change done.

## When adding a feature, the checklist is
1. Update `schema.prisma` (if needed) + `db:generate` + `db:push`.
2. Add/extend route in `src/routes/*.js`, mount it in `src/app.js` behind `requireAuth`.
3. If real-time, add the socket event in `src/sockets/` and document the payload.
4. Add Jest tests in `backend/tests/`.
5. If a config/env var was added, document it in `backend/README` or `render.yaml`.
