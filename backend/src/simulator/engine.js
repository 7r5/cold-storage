// engine.js
// In-memory simulation engine.
// - Advances trucks along their route waypoints (linear interpolation).
// - Generates periodic temperature/humidity readings for each box.
// - Persists positions/readings/alerts in Postgres.
// - Emits events via Socket.IO so connected clients update live.

const prisma = require('../db');

// Tunables
const POSITION_TICK_MS = 1000;    // emit GPS position every 1s (smooth polyline)
const READING_TICK_MS = 5000;     // emit sensor readings every 5s (DB-friendly)
const ROUTE_DURATION_MS = 120_000; // 120s to traverse a route (demo speed)

// State per trucking session
const activeTrucks = new Map();

let io = null;

function setIo(socketIo) {
  io = socketIo;
}

function emit(event, payload) {
  if (io) io.emit(event, payload);
}

/**
 * INTERPOLACIÓN CORREGIDA
 * Recibe waypoints como vienen de tu DB/Copy-paste: [longitud, latitud]
 * Retorna siempre un arreglo [latitud, longitud] para consistencia en el guardado.
 */
function interpolate(waypoints, progress) {
  if (!waypoints || waypoints.length === 0) return [0, 0];
  
  // Caso: Inicio de la ruta
  if (progress <= 0) {
    const [lng, lat] = waypoints[0];
    return [lat, lng]; 
  }

  // Caso: Fin de la ruta (Corrige el error de inversión al final)
  if (progress >= 1) {
    const [lng, lat] = waypoints[waypoints.length - 1];
    return [lat, lng]; 
  }

  const segments = waypoints.length - 1;
  const scaledProgress = progress * segments;
  const idx = Math.floor(scaledProgress);
  const t = scaledProgress - idx;

  // Extraemos los puntos del copy-paste [lng, lat]
  const [lng1, lat1] = waypoints[idx];
  const [lng2, lat2] = waypoints[idx + 1];

  // Cálculo de la posición intermedia
  const interLat = lat1 + (lat2 - lat1) * t;
  const interLng = lng1 + (lng2 - lng1) * t;

  // Retornamos [Latitud, Longitud] para que la desestructuración en tick() sea correcta
  return [interLat, interLng]; 
}

// Generate a noisy reading around the box target range
/**
 * Returns a temperature offset based on the hour of the day:
 *   - Peaks at +5 °C around 14:00 (warmest part of the day)
 *   - Dips to -5 °C around 02:00 (coldest part of the night)
 * Uses a cosine curve: offset = -5 * cos(2π * (hour - 2) / 24)
 */
function timeOfDayOffset() {
  const hour = new Date().getHours() + new Date().getMinutes() / 60;
  const base = -5 * Math.cos((2 * Math.PI * (hour - 2)) / 24);
  const jitter = (Math.random() - 0.5) * 2; // ±1 °C random variation
  return +(base + jitter).toFixed(2);
}

function generateReading(box, forcedTempOffset = 0, forcedHumOffset = 0) {
  const tempMid = (box.targetTempMin + box.targetTempMax) / 2;
  const humMid = (box.targetHumMin + box.targetHumMax) / 2;
  const noiseT = (Math.random() - 0.5) * 0.6;
  const noiseH = (Math.random() - 0.5) * 2;
  return {
    temperature: +(tempMid + noiseT + timeOfDayOffset() + forcedTempOffset).toFixed(2),
    humidity: +(humMid + noiseH + forcedHumOffset).toFixed(2),
  };
}

// Produce alerts when readings are out of range.
// Severity: CRITICAL when deviation ≥ 5 °C (temp) or ≥ 10 % (hum); otherwise WARNING.
function checkAlert(box, reading) {
  const alerts = [];
  const tempDev =
    reading.temperature < box.targetTempMin
      ? box.targetTempMin - reading.temperature
      : reading.temperature > box.targetTempMax
        ? reading.temperature - box.targetTempMax
        : 0;
  if (tempDev > 0) {
    alerts.push({
      type: 'TEMP',
      severity: tempDev >= 5 ? 'CRITICAL' : 'WARNING',
      message: `Temperatura fuera de rango (${reading.temperature} °C)`,
    });
  }
  const humDev =
    reading.humidity < box.targetHumMin
      ? box.targetHumMin - reading.humidity
      : reading.humidity > box.targetHumMax
        ? reading.humidity - box.targetHumMax
        : 0;
  if (humDev > 0) {
    alerts.push({
      type: 'HUM',
      severity: humDev >= 10 ? 'CRITICAL' : 'WARNING',
      message: `Humedad fuera de rango (${reading.humidity} %)`,
    });
  }
  return alerts;
}

async function positionTick(truckId) {
  const session = activeTrucks.get(truckId);
  if (!session) return;

  const elapsed = Date.now() - session.startedAt;
  const progress = Math.min(elapsed / session.durationMs, 1);
  const [lat, lng] = interpolate(session.waypoints, progress);

  await prisma.position.create({ data: { truckId, routeId: session.routeId, lat, lng } });
  emit('truck:position', { truckId, routeId: session.routeId, lat, lng, progress });

  if (progress >= 1) {
    await stopRoute(truckId, 'COMPLETED');
  }
}

async function tick(truckId) {
  const session = activeTrucks.get(truckId);
  if (!session) return;

  const elapsed = Date.now() - session.startedAt;
  const progress = Math.min(elapsed / session.durationMs, 1);
  
  // Aquí recibimos [lat, lng] gracias a la corrección en interpolate
  const [lat, lng] = interpolate(session.waypoints, progress);

  // Position is handled by positionTick; here we only process readings/alerts.

  // Readings for every box of the truck
  const boxes = await prisma.box.findMany({ where: { truckId } });

  // Load open (unacknowledged) alerts scoped to THIS route.
  // Deduplication is per (boxId, type, routeId) — not truck-wide.
  // This prevents alerts from previous routes of the same truck bleeding in.
  const openAlerts = await prisma.alert.findMany({
    where: { routeId: session.routeId, acknowledged: false },
    select: { boxId: true, type: true },
  });
  const openAlertKeys = new Set(openAlerts.map((a) => `${a.boxId}:${a.type}`));

  for (const box of boxes) {
    const r = generateReading(box, session.forcedTempOffset, session.forcedHumOffset);
    const saved = await prisma.reading.create({
      data: { boxId: box.id, routeId: session.routeId, temperature: r.temperature, humidity: r.humidity },
    });
    emit('box:reading', {
      boxId: box.id,
      truckId,
      temperature: saved.temperature,
      humidity: saved.humidity,
      recordedAt: saved.recordedAt,
    });

    // Only create a new alert if no open alert of the same type exists for this box.
    // Natural readings (no forced offset): cap at 1 alert per route to avoid spam.
    // Forced offsets from the simulator panel bypass the cap entirely.
    const isForced = session.forcedTempOffset !== 0 || session.forcedHumOffset !== 0;
    const newAlerts = checkAlert(box, r);
    for (const a of newAlerts) {
      const key = `${box.id}:${a.type}`;
      if (openAlertKeys.has(key)) continue;
      if (!isForced && session.naturalAlertFired) continue;
      const created = await prisma.alert.create({
        data: { boxId: box.id, routeId: session.routeId, ...a },
      });
      openAlertKeys.add(key); // prevent duplicates within the same tick
      if (!isForced) session.naturalAlertFired = true;
      emit('alert:new', {
        id: created.id,
        boxId: box.id,
        truckId,
        type: created.type,
        severity: created.severity,
        message: created.message,
        recordedAt: created.recordedAt,
      });
    }
  }

  // Finish if route done
  if (progress >= 1) return; // stopRoute already called by positionTick
}

async function startRoute(routeId) {
  const route = await prisma.route.findUnique({ where: { id: routeId } });
  if (!route) throw new Error('Ruta no encontrada');
  if (activeTrucks.has(route.truckId)) {
    throw new Error('El camión ya tiene una ruta activa');
  }

  // Clear stale positions from previous runs so the map always builds
  // the polyline progressively from scratch (prevents "full route on load").
  await prisma.position.deleteMany({ where: { routeId } });

  await prisma.route.update({
    where: { id: routeId },
    data: { status: 'ACTIVE', startedAt: new Date() },
  });
  await prisma.truck.update({
    where: { id: route.truckId },
    data: { status: 'ON_ROUTE' },
  });

  const session = {
    routeId,
    startedAt: Date.now(),
    durationMs: ROUTE_DURATION_MS,
    waypoints: route.waypoints,
    forcedTempOffset: 0,
    forcedHumOffset: 0,
    naturalAlertFired: false, // cap: at most 1 natural alert per route lifecycle
    positionIntervalId: null,
    readingIntervalId: null,
  };
  session.positionIntervalId = setInterval(() => {
    positionTick(route.truckId).catch((e) => console.error('positionTick error', e));
  }, POSITION_TICK_MS);
  session.readingIntervalId = setInterval(() => {
    tick(route.truckId).catch((e) => console.error('tick error', e));
  }, READING_TICK_MS);
  activeTrucks.set(route.truckId, session);

  emit('route:started', { routeId, truckId: route.truckId });
  return route;
}

async function stopRoute(truckId, finalStatus = 'COMPLETED') {
  const session = activeTrucks.get(truckId);
  if (!session) return;
  clearInterval(session.positionIntervalId);
  clearInterval(session.readingIntervalId);
  activeTrucks.delete(truckId);

  await prisma.route.update({
    where: { id: session.routeId },
    data: { status: finalStatus, finishedAt: new Date() },
  });
  await prisma.truck.update({
    where: { id: truckId },
    data: { status: 'IDLE' },
  });

  emit('route:stopped', { routeId: session.routeId, truckId, status: finalStatus });
}

// Inject a forced anomaly until cleared
function setForcedOffset(truckId, { tempOffset, humOffset }) {
  const session = activeTrucks.get(truckId);
  if (!session) throw new Error('El camión no está en ruta');
  if (typeof tempOffset === 'number') session.forcedTempOffset = tempOffset;
  if (typeof humOffset === 'number') session.forcedHumOffset = humOffset;
  emit('simulator:offset', {
    truckId,
    tempOffset: session.forcedTempOffset,
    humOffset: session.forcedHumOffset,
  });
}

function clearForcedOffsets(truckId) {
  setForcedOffset(truckId, { tempOffset: 0, humOffset: 0 });
}

// Temporarily apply a forced offset and auto-reset after durationMs (default 10 s)
function triggerSpike(truckId, { tempOffset = 0, humOffset = 0, durationMs = 10000 }) {
  setForcedOffset(truckId, { tempOffset, humOffset });
  setTimeout(() => {
    try { clearForcedOffsets(truckId); } catch (_) {}
  }, durationMs);
}

function getActive() {
  return Array.from(activeTrucks.entries()).map(([truckId, s]) => ({
    truckId,
    routeId: s.routeId,
    startedAt: s.startedAt,
    forcedTempOffset: s.forcedTempOffset,
    forcedHumOffset: s.forcedHumOffset,
  }));
}

// Stop everything (used in tests)
function shutdown() {
  for (const [truckId] of activeTrucks) {
    const session = activeTrucks.get(truckId);
    clearInterval(session.intervalId);
  }
  activeTrucks.clear();
}

module.exports = {
  setIo,
  startRoute,
  stopRoute,
  setForcedOffset,
  clearForcedOffsets,
  triggerSpike,
  getActive,
  shutdown,
  // exported for tests
  _internal: { interpolate, generateReading, checkAlert },
};
