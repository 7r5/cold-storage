// Routes endpoints (planned trips and live telemetry history)
const express = require('express');
const prisma = require('../db');

const router = express.Router();

/**
 * GET /api/routes/live-history 
 * Recupera las posiciones de todos los camiones generadas hoy.
 * Esto evita que el mapa se limpie al recargar la página o navegar.
 */
router.get('/live-history', async (_req, res) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const positions = await prisma.position.findMany({
      where: {
        // CAMBIO: Usamos recordedAt en lugar de createdAt
        recordedAt: {
          gte: todayStart,
        },
      },
      orderBy: { 
        recordedAt: 'asc' // CAMBIO: También aquí para el orden
      },
    });

    const history = positions.reduce((acc, pos) => {
      const tid = String(pos.truckId);
      if (!acc[tid]) acc[tid] = [];
      acc[tid].push([pos.lat, pos.lng]); 
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

module.exports = router;