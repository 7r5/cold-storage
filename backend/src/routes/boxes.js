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

// GET /api/boxes/:id/readings?limit=50
router.get('/:id/readings', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const limit = Math.min(parseInt(req.query.limit || '50', 10), 500);
  const readings = await prisma.reading.findMany({
    where: { boxId: id },
    orderBy: { recordedAt: 'desc' },
    take: limit,
  });
  res.json(readings.reverse());
});

module.exports = router;
