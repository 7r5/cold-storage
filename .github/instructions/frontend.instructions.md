---
applyTo: "frontend/**"
description: "Guidelines for the Cold Chain Control web app (React + Vite + Tailwind)."
---

# Frontend instructions — Cold Chain Control Web

## Project context (POC)
- This is a **proof of concept built to study JavaScript / React / Vite**. Not every flow needs to behave like a real-world production app.
- Still, **use current/idiomatic technologies**: React 18 hooks, Vite, modern ES modules, Testing Library. No legacy patterns.
- Auth is intentionally simplified: the backend issues **dummy tokens without encryption** just so the browser can hold a session and protected endpoints can be gated. Treat them as opaque strings; store via the existing `AuthContext`. Don't introduce real JWT handling, refresh-token flows, or crypto in the client unless asked.
- **Sensor data is not real.** All temperature/humidity readings and truck positions shown in the UI come from a backend simulator (`backend/src/simulator/engine.js`) pushed over Socket.IO. The frontend should treat these payloads as the only source of truth for live data — do not fake values in the client and do not call any external IoT/maps-tracking API.
- The app is **deployed to Render** alongside the backend (`render.yaml` at repo root). Keep build output compatible with `vite build` / `vite preview`.

## Files that require explicit user confirmation before editing
- `frontend/vite.config.js`
- `frontend/jest.config.cjs`, `frontend/babel.config.cjs`
- `frontend/tailwind.config.js`, `frontend/postcss.config.js`
- `frontend/package.json` (deps/scripts)
- `render.yaml`
- Any `.env*` file

## Stack & layout
- React 18 + Vite 5, ES modules (`"type": "module"`).
- Routing: `react-router-dom` v6 (see `src/App.jsx`).
- Styling: Tailwind CSS 3 (`tailwind.config.js`, `src/styles/index.css`).
- Maps: `leaflet` + `react-leaflet`.
- Real-time: `socket.io-client` (`src/api/socket.js`).
- HTTP: `src/api/client.js`.
- Auth context: `src/auth/AuthContext.jsx`; route guard: `src/components/ProtectedRoute.jsx`.
- Tests: Jest + Testing Library + jsdom, in `src/__tests__/**/*.test.jsx` (config in `jest.config.cjs`, setup in `src/test/setup.js`).

## Language conventions (important)
- **UI text shown to the user is in Spanish** (labels, buttons, errors, empty states, toasts).
- **Code is in English**: identifiers, file names, props, state, hooks, helpers, comments, commit messages, JSDoc.
- **URL paths are in Spanish** to match the existing routes (`/monitores`, `/inventario`, `/alertas`, `/mas`, `/root`). Keep that convention; don't rename to English.
- Keep Spanish strings inline for now (no i18n framework). If a string is reused in 3+ places, extract to a small `const` in the same module — do not introduce a translations library without asking.
- Never embed secrets or tokens in source.

## React / code style
- Format with **Prettier** (project default config). Run it before committing; do not hand-format.
- Functional components + hooks only. No class components.
- One component per file, file name in `PascalCase.jsx` matching the default export.
- Keep components small; extract subcomponents when JSX exceeds ~150 lines or has 2+ responsibilities.
- Side effects only inside `useEffect`; always clean up subscriptions, intervals, and socket listeners in the cleanup function.
- Lists must have stable `key` props (use IDs from the API, not array indices).
- Derive state — don't duplicate it. Prefer `useMemo` over storing computed values in `useState`.
- Avoid prop drilling beyond 2 levels: lift to context (`AuthContext` pattern) or a small custom hook.

## Coordinate convention
- `Route.waypoints` from the API arrive as **`[lng, lat]`** arrays (GeoJSON order, matches the external data source).
  - Always swap to `[lat, lng]` before passing to react-leaflet: `route.waypoints.map(([lng, lat]) => [lat, lng])`.
- Socket event `truck:position` sends `{ lat, lng }` already in Leaflet order — use as-is: `[lat, lng]`.
- `GET /api/routes/live-history` returns `{ [truckId]: [[lat, lng], ...] }` — already in Leaflet order.
- Never add runtime coordinate-order detection. If a value seems wrong, check the source convention and apply an explicit swap.

## Data layer
- All HTTP calls go through `src/api/client.js`. Don't `fetch` from components directly.
- All socket usage goes through `src/api/socket.js`. Components subscribe in `useEffect` and unsubscribe on unmount.
- Treat backend payloads as untrusted shapes: guard with optional chaining and sensible defaults.
- API keys are `camelCase` (matches backend). DB-style `snake_case` should never appear in the frontend.

## Routing & auth
- New protected pages: wrap with `<ProtectedRoute>` inside the `Layout` route in `App.jsx`.
- ROOT-only pages: wrap with `<ProtectedRoute requireRole="ROOT">` (see `/root`).
- Use `Navigate` for redirects, not `window.location`.

## Styling
- Tailwind utility-first. No inline `style={{...}}` unless dynamic (e.g., map markers).
- Use semantic HTML (`<button>`, `<nav>`, `<main>`, `<label>` + `htmlFor`) — needed for accessibility and for Testing Library queries.
- Mobile-first: the app uses `BottomNav`; ensure new screens render correctly on small viewports.

## Accessibility
- Every interactive element must be keyboard-reachable.
- Inputs need associated `<label>` (Spanish text).
- Icons-only buttons need `aria-label` (in Spanish).

## Tests (Jest + Testing Library)
- New page or non-trivial component requires a test in `src/__tests__/`.
- Query by accessible role/label/text (Spanish). Avoid `getByTestId` unless nothing else works.
- Use `userEvent` over `fireEvent` for interactions.
- Mock `src/api/client.js` and `src/api/socket.js` — never hit a real backend in tests.
- Wrap components that use routing/context with the matching providers (see existing `Login.test.jsx`, `BottomNav.test.jsx`).
- **Minimum coverage target: 70%** (lines & branches) on changed files. Don't lower the bar to make a PR pass.
- Run with `npm test` from `frontend/`. Tests must pass before considering a change done.

## Security (OWASP-aware)
- Never `dangerouslySetInnerHTML` with user/API content.
- Treat anything from `localStorage` / API as untrusted; validate before rendering as URL/href (`javascript:` scheme is forbidden).
- Don't log tokens or passwords.

## When adding a feature, the checklist is
1. Add/extend the page or component (English code, Spanish UI text).
2. Centralize HTTP/socket calls in `src/api/`.
3. Add the route in `src/App.jsx` with the right `ProtectedRoute` wrapper.
4. Add a test in `src/__tests__/` mocking the API layer.
5. Verify on a mobile viewport (BottomNav layout).
