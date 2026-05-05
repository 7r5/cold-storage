# Changelog — ColdTrack / Cold Chain Control

Desarrollado por **7r5 Studios** · [github.com/7r5/cold-storage](https://github.com/7r5/cold-storage)

Todas las versiones notables de este proyecto se documentan aquí.
El formato sigue [Keep a Changelog](https://keepachangelog.com/es/1.1.0/).

---

## [Unreleased] — 2026-05-04

### Added
- Créditos "Desarrollado por 7r5 Studios" + link al repositorio en pantalla Acerca de.
- **PWA**: `manifest.json`, service worker (`sw.js`) y metaetiquetas Apple para instalación como app en Android e iOS.
- Variación de temperatura por hora del día en el simulador (coseno ±5 °C, pico a las 14:00, mínimo a las 02:00) con jitter aleatorio de ±1 °C por tick.
- Botón de atrás de Android: navega dentro de la app; doble pulsación en tabs raíz muestra toast "Presiona atrás de nuevo para salir".
- Botón de atrás en página **Rutas** (faltaba).

### Fixed
- Botón de volver en todas las páginas de "Más" (Ajustes, AcercaDe, Documentación, Ayuda, Bugs): ahora el área clickeable incluye el ícono **y** el título.

---

## [0.1.2] — 2026-05-04

### Added
- `GET /api/auth/me` — endpoint que devuelve el perfil fresco del usuario autenticado.
- `AuthContext` refresca el perfil desde la API al arrancar la app, solucionando que `phone`, `age` y `position` aparecieran vacíos por datos stale en `localStorage`.

---

## [0.1.1] — 2026-05-04

### Added
- La versión de la app (semver + git short hash, ej. `0.1.1+a525160`) se inyecta en build time desde `package.json` vía `__APP_VERSION__` en `vite.config.js`.
- Scripts de release en `frontend/package.json`: `release:patch`, `release:minor`, `release:major`.
- Versión dinámica en pantallas **Más** y **Acerca de** (antes hardcodeada).
- Tarjetas de monitor ordenadas por estado: ACTIVE → PENDING → COMPLETED.
- `CameraLock`: al seleccionar una tarjeta de ruta el mapa sigue al camión (pan sin cambiar zoom). Botón "Desbloquear cámara" para uso manual del mapa.
- Se eliminó el toggle Auto-Zoom del panel de monitoreo.

### Fixed
- Al reiniciar una simulación, las posiciones previas de la ruta se eliminan de la DB (`startRoute` llama `deleteMany`) y el estado `liveRoutes` del cliente se limpia al recibir `route:started`, evitando que el mapa muestre la ruta completa de golpe.
- `seed.js`: el guard de ruta usaba `originName: "San Juan del Río"` pero el registro se guardaba como `"San Juan del Río, Qro"` → se generaba una ruta duplicada en cada deploy.

---

## [0.1.0] — 2026-05-04 *(baseline release)*

### Added — Backend
- API REST con Express 4 + Prisma 5 + PostgreSQL.
- Modelos: `User`, `Driver`, `Truck`, `Box`, `Route`, `Branch`, `Product`, `BoxLoad`, `Position`, `Reading`, `Alert`, `Bug`, `Faq`.
- Simulador en memoria (`engine.js`): interpolación de waypoints, lecturas de temperatura/humedad, alertas automáticas por rango, supresión de duplicados.
- Endpoints: auth (login), trucks, boxes, routes (CRUD + live-history), simulator (start/stop/anomaly), alerts, inventory (branches + loads), bugs, FAQ.
- Auth simplificado con tokens dummy (POC). Middleware `requireAuth` + `requireRoot`.
- Seed idempotente con 2 usuarios, 3 camiones, 4 cajas, 1 ruta, 4 sucursales, 8 FAQs, 3 drivers.
- Socket.IO: eventos `truck:position`, `box:reading`, `alert:new`, `route:started`, `route:stopped`.
- Cobertura de tests ≥ 90% (Jest + Supertest). 71 tests.
- Deploy en Render con health probe `GET /api/health`.

### Added — Frontend
- React 18 + Vite 5 + Tailwind CSS 3 + React-Leaflet 4.
- Pantallas: Home, Monitores, Inventario, Alertas, Más, Login, TruckDetail, Rutas, NuevaRuta, Ajustes, Ayuda, AcercaDe, Documentación, Bugs, Root (solo ROOT).
- Mapa en tiempo real con polilínea por ruta, marcador de camión, ruta planeada (dashed), íconos A/B, modo pantalla completa.
- Página TruckDetail con sparklines de temperatura/humedad, filtros de tiempo (en vivo / hoy / semana / mes).
- Página Inventario: sucursales, cargas activas por caja, sección de productos.
- Página NuevaRuta: geocodificación con Nominatim, trazado de ruta con OSRM, previsualización en mapa.
- Página Bugs: reporte de errores con tabs abiertos/cerrados.
- Página Documentación: referencia de todas las entidades del modelo de datos.
- Página Ayuda: FAQs dinámicas desde la API con acordeón.
- BottomNav con íconos SVG minimalistas.
- Cobertura de tests ≥ 90% (Jest + Testing Library). 98 tests.

### Fixed
- Coordenadas: convención `[lng, lat]` en waypoints, `[lat, lng]` para Leaflet — swap explícito en todos los puntos de conversión.
- Polilíneas de múltiples rutas: clave por `routeId` en lugar de `truckId`, evitando contaminación entre rutas.
- `TruckDetail.jsx`: archivo duplicado (590 líneas en lugar de 287) causaba fallo en build de esbuild.
- Comillas tipográficas en `seed.js` causaban `SyntaxError` en Node 24.

---

## Versiones previas al sistema de releases (historial de desarrollo)

| Fecha | Commit | Descripción |
|---|---|---|
| 2026-05-04 | `e230c19` | Convención de coordenadas documentada en instrucciones |
| 2026-05-04 | `c537c47` | Supresión de alertas duplicadas por caja+tipo |
| 2026-05-04 | `14697de` | Waypoints expandidos a 100 puntos interpolados |
| 2026-05-04 | `226567c` | Modelos Branch, Product, BoxLoad + routeId en Reading |
| 2026-05-04 | `f48246c` | Página TruckDetail con sparklines |
| 2026-05-04 | `ba83535` | Toggle pantalla completa en mapa (compatible iOS Safari) |
| 2026-05-04 | `79255bc` | Página NuevaRuta con Nominatim + OSRM |
| 2026-05-04 | `a336018` | Páginas Docs, Ajustes, Ayuda, AcercaDe; campos de perfil |
| 2026-05-04 | `0d55847` | Página Bugs, confirmación de logout |
| 2026-05-04 | `fba05aa` | Página Inventario; rediseño TruckDetail con filtros |
| 2026-05-04 | `5f2b398` | Rediseño visual: íconos SVG, header azul, bordes suaves |
| 2026-05-03 | `aed24de` | Commit inicial con estructura base del proyecto |
