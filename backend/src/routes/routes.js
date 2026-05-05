// Routes endpoints (planned trips and live telemetry history)
const express = require('express');
const prisma = require('../db');

const router = express.Router();

/**
 * GET /api/routes/live-history
 * Returns today's recorded positions grouped by routeId.
 * Keying by routeId (not truckId) prevents mixing points from different
 * routes of the same truck, which would cause wrong polylines on the map.
 */
router.get('/live-history', async (_req, res) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const positions = await prisma.position.findMany({
      where: {
        recordedAt: { gte: todayStart },
        routeId: { not: null },
      },
      orderBy: { recordedAt: 'asc' },
    });

    // Group by routeId so each route gets its own ordered array of [lat, lng]
    const history = positions.reduce((acc, pos) => {
      const rid = String(pos.routeId);
      if (!acc[rid]) acc[rid] = [];
      acc[rid].push([pos.lat, pos.lng]);
      return acc;
    }, {});

    res.json(history);
  } catch (error) {
    console.error("Error al recuperar el historial de posiciones:", error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// --- ENDPOINTS DE ADMINISTRACIÓN ---

/**
 * GET /api/routes
 * Lista todos los viajes planeados
 */
router.get('/', async (_req, res) => {
  try {
    const routes = await prisma.route.findMany({
      include: {
        truck: {
          select: {
            id: true,
            plate: true,
            boxes: {
              select: {
                id: true,
                code: true,
                targetTempMin: true,
                targetTempMax: true,
                targetHumMin: true,
                targetHumMax: true,
                alerts: {
                  where: { acknowledged: false },
                  select: { id: true, type: true, severity: true, message: true },
                },
              },
            },
          },
        },
      },
      orderBy: { id: 'asc' },
    });
    res.json(routes);
  } catch (error) {
    res.status(500).json({ error: 'Error al listar rutas planeadas' });
  }
});

/**
 * GET /api/routes/:id
 * Detalle de una ruta específica
 */
router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

  try {
    const route = await prisma.route.findUnique({
      where: { id },
      include: { truck: true },
    });

    if (!route) return res.status(404).json({ error: 'Ruta no encontrada' });
    res.json(route);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener el detalle de la ruta' });
  }
});

/**
 * POST /api/routes
 * Creates a new planned route with a truck assignment and waypoints.
 * Waypoints must be an array of [lng, lat] pairs (GeoJSON order).
 */
router.post('/', async (req, res) => {
  const { truckId, originName, destinationName, waypoints } = req.body;

  if (!truckId || !originName || !destinationName || !waypoints) {
    return res.status(400).json({ error: 'Faltan campos obligatorios: truckId, originName, destinationName, waypoints' });
  }

  const tid = parseInt(truckId, 10);
  if (isNaN(tid)) return res.status(400).json({ error: 'truckId debe ser un número' });

  if (
    !Array.isArray(waypoints) ||
    waypoints.length < 2 ||
    !waypoints.every((p) => Array.isArray(p) && p.length === 2 && waypoints.every(() => true))
  ) {
    return res.status(400).json({ error: 'waypoints debe ser un array de al menos 2 pares [lng, lat]' });
  }

  try {
    const truck = await prisma.truck.findUnique({ where: { id: tid } });
    if (!truck) return res.status(404).json({ error: 'Camión no encontrado' });

    const route = await prisma.route.create({
      data: {
        truckId: tid,
        originName: String(originName).trim(),
        destinationName: String(destinationName).trim(),
        waypoints,
        status: 'PENDING',
      },
      include: { truck: { select: { id: true, plate: true } } },
    });

    res.status(201).json(route);
  } catch (error) {
    console.error('Error al crear ruta:', error);
    res.status(500).json({ error: 'Error al crear la ruta' });
  }
});

/**
 * DELETE /api/routes/:id
 * Deletes a route. Only PENDING routes can be deleted.
 */
router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

  try {
    const route = await prisma.route.findUnique({ where: { id } });
    if (!route) return res.status(404).json({ error: 'Ruta no encontrada' });
    if (route.status !== 'PENDING') {
      return res.status(409).json({ error: 'Solo se pueden eliminar rutas en estado PENDING' });
    }

    await prisma.route.delete({ where: { id } });
    res.status(204).end();
  } catch (error) {
    console.error('Error al eliminar ruta:', error);
    res.status(500).json({ error: 'Error al eliminar la ruta' });
  }
});

module.exports = router;