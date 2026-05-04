// In-memory simulation engine.
// - Advances trucks along their route waypoints (linear interpolation).
// - Generates periodic temperature/humidity readings for each box.
// - Persists positions/readings/alerts in Postgres.
// - Emits events via Socket.IO so connected clients update live.

const prisma = require('../db');

// Tunables
const TICK_MS = 5000;            // emit positions/readings every 5s
const ROUTE_DURATION_MS = 60_000; // 60s to traverse a route (demo speed)

// State per trucking session
// Map<truckId, { routeId, startedAt, durationMs, waypoints, intervalId,
//                forcedTempOffset, forcedHumOffset }>
const activeTrucks = new Map();

let io = null;

function setIo(socketIo) {
  io = socketIo;
}

function emit(event, payload) {
  if (io) io.emit(event, payload);
}

// Linear interpolation along an array of waypoints based on progress 0..1
function interpolate(waypoints, progress) {
  if (progress <= 0) return waypoints[0];
  if (progress >= 1) return waypoints[waypoints.length - 1];
  const segments = waypoints.length - 1;
  const scaled = progress * segments;
  const idx = Math.floor(scaled);
  const t = scaled - idx;
  // If wayponts contain 3 coordinates, ignore the zoom for interpolation
  const [lngtemp, lattemp] = waypoints[idx];
  // in case the order is lat,lng instead of lng,lat, detect it and swap accordingly
  if (lngtemp > lattemp) {
      const [lng1, lat1] = waypoints[idx];
      const [lng2, lat2] = waypoints[idx + 1];
  }else{
    const [lat1, lng1] = waypoints[idx];
    const [lat2, lng2] = waypoints[idx + 1];
  }
  return [lat1 + (lat2 - lat1) * t, lng1 + (lng2 - lng1) * t];
}

// Generate a noisy reading around the box target range
function generateReading(box, forcedTempOffset = 0, forcedHumOffset = 0) {
  const tempMid = (box.targetTempMin + box.targetTempMax) / 2;
  const humMid = (box.targetHumMin + box.targetHumMax) / 2;
  const noiseT = (Math.random() - 0.5) * 0.6;
  const noiseH = (Math.random() - 0.5) * 2;
  return {
    temperature: +(tempMid + noiseT + forcedTempOffset).toFixed(2),
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

async function tick(truckId) {
  const session = activeTrucks.get(truckId);
  if (!session) return;

  const elapsed = Date.now() - session.startedAt;
  const progress = Math.min(elapsed / session.durationMs, 1);
  const [lat, lng] = interpolate(session.waypoints, progress);

  // Persist + emit position
  await prisma.position.create({ data: { truckId, lat, lng } });
  emit('truck:position', { truckId, lat, lng, progress });

  // Readings for every box of the truck
  const boxes = await prisma.box.findMany({ where: { truckId } });
  for (const box of boxes) {
    const r = generateReading(box, session.forcedTempOffset, session.forcedHumOffset);
    const saved = await prisma.reading.create({
      data: { boxId: box.id, temperature: r.temperature, humidity: r.humidity },
    });
    emit('box:reading', {
      boxId: box.id,
      truckId,
      temperature: saved.temperature,
      humidity: saved.humidity,
      recordedAt: saved.recordedAt,
    });

    // Check alerts
    const newAlerts = checkAlert(box, r);
    for (const a of newAlerts) {
      const created = await prisma.alert.create({
        data: { boxId: box.id, ...a },
      });
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
  if (progress >= 1) {
    await stopRoute(truckId, 'COMPLETED');
  }
}

async function startRoute(routeId) {
  const route = await prisma.route.findUnique({ where: { id: routeId } });
  if (!route) throw new Error('Ruta no encontrada');
  if (activeTrucks.has(route.truckId)) {
    throw new Error('El camión ya tiene una ruta activa');
  }

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
    intervalId: null,
  };
  session.intervalId = setInterval(() => {
    tick(route.truckId).catch((e) => console.error('tick error', e));
  }, TICK_MS);
  activeTrucks.set(route.truckId, session);

  emit('route:started', { routeId, truckId: route.truckId });
  return route;
}

async function stopRoute(truckId, finalStatus = 'COMPLETED') {
  const session = activeTrucks.get(truckId);
  if (!session) return;
  clearInterval(session.intervalId);
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
