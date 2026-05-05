# Changelog — ColdTrack / Cold Chain Control

Desarrollado por **7r5 Studios** · [github.com/7r5/cold-storage](https://github.com/7r5/cold-storage)

Todas las versiones notables de este proyecto se documentan aquí.
El formato sigue [Keep a Changelog](https://keepachangelog.com/es/1.1.0/).

---
## [0.3.4] — 2026-05-05

### Added
- Monitores: animación del marcador a 60 fps via `requestAnimationFrame` + `marker.setLatLng()` — movimiento completamente fluido entre ticks GPS.
- Home: barra de progreso en tiempo real para rutas activas (origen → XX% → destino), actualizada por socket.
- Home: badge de alerta ámbar por camión, nombre del conductor como texto principal, chips de resumen en 3 columnas.
- Alertas historial: gráfica por hora muestra solo hoy (00:00 a hora actual); gráfica por fecha muestra hoy + 7 días reales.

### Fixed
- Monitores: label de estado ahora dice "En Tránsito" / "Inactivo" (eliminado Pendiente/Finalizado).
- Monitores: escucha `route:stopped` para actualizar tarjetas en tiempo real sin recargar.
- Splash screen: fondo blanco para que el logo no se mezcle con fondo oscuro.

### Docs
- Documentación: añadidas entidades Driver, BranchStock, Bug, Faq; rangos actualizados; flujo de simulación corregido; eventos Socket.IO documentados.

---
## [0.3.2] — 2026-05-05

### Fixed
- `TruckDetail`: etiqueta `<p>` faltante en el tile de Temperatura (causaba error de sintaxis JSX).
- `TruckDetail`: color de temperatura en tabla de historial actualizado a `violet-600` para consistencia.

### Changed
- Rangos de cajas actualizados en seed upsert (`-25`/`-13` °C · `58`/`82` % HR) — se aplican en cada deploy.
- Alertas: gráficas de barras cambiadas a azul (`blue-600`/`cyan-600`); chip de conteo de temperatura usa `violet-600`. Rojo ahora reservado solo para severidad CRITICAL y badge de alertas activas.
- Alertas historial: gráfica "por hora" muestra solo el dia de hoy de 00:00 hasta la hora actual; gráfica "por dia" muestra hoy + 7 dias anteriores con fechas reales (ej. "5 may").- Home: rediseño de tarjetas de camión — nombre del conductor como texto principal, placa/modelo/estado en fila secundaria, badge de alerta ámbar, barra de progreso en tiempo real para rutas activas (origen→destino con porcentaje). Chips de resumen a 3 columnas.
- Monitores: labels de estado simplificados a "En Tránsito" / "Inactivo" (eliminados Pendiente y Finalizado).
- Monitores: movimiento del marcador de camión suavizado — interpolación a 60fps con ease-in-out via `requestAnimationFrame` + `marker.setLatLng()` directo a Leaflet (sin re-renders de React).
- Documentación: añadidas entidades Driver, BranchStock, Bug, Faq; rangos de caja actualizados; flujo de simulación corregido (1s GPS, variación por hora, 60fps marker); nuevos eventos Socket.IO documentados.
- Splash screen: fondo cambiado de oscuro (`#0f172a`) a blanco para que el logo se mezcle correctamente.### Fixed (Monitores)
- Tarjetas de ruta ahora escuchan `route:stopped` via socket → status cambia a "Finalizado" en tiempo real sin recargar.
- Secciones de cajas (temp/hum) solo se muestran cuando `status === ACTIVE`; en Pendiente y Finalizado se ocultan correctamente.
- Label de estado ahora muestra tres valores: "En Tránsito" / "Finalizado" / "Pendiente".
- Al finalizar una ruta, las lecturas en vivo de sus cajas se limpian del estado local.- `render.yaml`: `npm install` → `npm ci` en los 3 servicios; `buildFilter.paths` para evitar redeploys innecesarios; `autoDeploy: false` en Prisma Studio.

---

## [0.3.1] — 2026-05-05

### Added
- `TruckDetail`: gráficas `SensorChart` (línea con banda de rango aceptable) y `AggregateChart` (barras).
- `TruckDetail`: vista por hora / día / mes con selector de agregación por caja.
- `TruckDetail`: estadísticas min·avg·max en cada sección de sensor.
- Modelo `BranchStock` en Prisma + seed con 25 registros distribuidos en 4 sucursales.
- `GET /api/branches` incluye stock con producto anidado; `GET /api/branches/:id/stock`.
- Inventario — pestaña Sucursales: acordeón `BranchCard` con productos agrupados por categoría.
- Alertas — pestaña Historial: gráficas de barras por hora del día y día de la semana, chips de resumen, lista de últimas 20 alertas.
- `GET /api/alerts` acepta `?onlyActive`, `?since=ISO`, `?limit=N`.

### Changed
- Temperatura usa `violet-600` en estado normal (antes `blue-600`) — el rojo queda reservado para alertas reales.
- GPS tick reducido a 1 segundo (antes 5 s) → 120 puntos por ruta, polilínea más suave.
- Rangos de caja ampliados a `-25`/`-13` °C para reducir alertas espurias.
- Flag `naturalAlertFired` en simulador: máximo 1 alerta natural por ciclo de ruta.

### Fixed
- Prisma Studio en Render: proxy `studio-proxy.js` resuelve el bind a `0.0.0.0`.

---

## [0.3.0] — 2026-05-05

### Added
- Splash screen en HTML (`index.html`) con `logo.jpeg`, fondo `#0f172a`, fade de 400 ms a 1.2 s.
- `manifest.json` unificado: solo `favicon.png` como icono PWA con `purpose: "any maskable"`.
- `__CHANGELOG__` inyectado en build time desde `CHANGELOG.md` vía `vite.config.js`.

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
