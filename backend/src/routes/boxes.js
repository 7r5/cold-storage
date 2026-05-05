// Boxes + sensor readings endpoints
const express = require('express');
const prisma = require('../db');

const router = express.Router();

// GET /api/boxes  — all boxes (with truck plate)
router.get('/', async (_req, res) => {
  const boxes = await prisma.box.findMany({
    include: { truck: { select: { id: true, plate: true } } },
    orderBy: { id: 'asc' },
  });
  res.json(boxes);
});

// GET /api/boxes/:id/readings?limit=50&since=ISO_DATE
// since = optional ISO datetime filter (for day/week/month views)
router.get('/:id/readings', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const limit = Math.min(parseInt(req.query.limit || '50', 10), 2000);
  const since = req.query.since ? new Date(req.query.since) : undefined;

  const where = { boxId: id };
  if (since && !isNaN(since)) where.recordedAt = { gte: since };

  const readings = await prisma.reading.findMany({
    where,
    orderBy: { recordedAt: 'desc' },
    take: limit,
  });
  res.json(readings.reverse());
});

// GET /api/boxes/inventory
// Returns all routes with their loads (products per box), grouped for the inventory page.
router.get('/inventory', async (_req, res) => {
  try {
    const routes = await prisma.route.findMany({
      include: {
        truck: { select: { id: true, plate: true, driverName: true } },
        originBranch: { select: { id: true, name: true, city: true, type: true } },
        destinationBranch: { select: { id: true, name: true, city: true, type: true } },
        loads: {
          include: {
            product: true,
            box: { select: { id: true, code: true } },
          },
        },
      },
      orderBy: { id: 'desc' },
    });
    res.json(routes);
  } catch (error) {
    console.error('Error al obtener inventario:', error);
    res.status(500).json({ error: 'Error al obtener inventario' });
  }
});

module.exports = router;
