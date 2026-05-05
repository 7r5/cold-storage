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

// Produce alerts when readings are out of range
function checkAlert(box, reading) {
  const alerts = [];
  if (reading.temperature < box.targetTempMin || reading.temperature > box.targetTempMax) {
    alerts.push({
      type: 'TEMP',
      severity: 'WARNING',
      message: `Temperatura fuera de rango (${reading.temperature} °C)`,
    });
  }
  if (reading.humidity < box.targetHumMin || reading.humidity > box.targetHumMax) {
    alerts.push({
      type: 'HUM',
      severity: 'WARNING',
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

  // Load all open (unacknowledged) alerts for this truck's boxes in one query.
  // Used to suppress duplicate alerts: only one open alert per box+type at a time.
  const openAlerts = await prisma.alert.findMany({
    where: { box: { truckId }, acknowledged: false },
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
    // Once the user acknowledges it, the next out-of-range reading will fire a new one.
    const newAlerts = checkAlert(box, r);
    for (const a of newAlerts) {
      const key = `${box.id}:${a.type}`;
      if (openAlertKeys.has(key)) continue;
      const created = await prisma.alert.create({
        data: { boxId: box.id, ...a },
      });
      openAlertKeys.add(key); // prevent duplicates within the same tick
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
  getActive,
  shutdown,
  // exported for tests
  _internal: { interpolate, generateReading, checkAlert },
};
