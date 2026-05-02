// Trucks + their boxes endpoints
const express = require('express');
const prisma = require('../db');

const router = express.Router();

// GET /api/trucks  — list all trucks with boxes
router.get('/', async (_req, res) => {
  const trucks = await prisma.truck.findMany({
    include: { boxes: true },
    orderBy: { id: 'asc' },
  });
  res.json(trucks);
});

// GET /api/trucks/:id  — single truck with boxes + last position
router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const truck = await prisma.truck.findUnique({
    where: { id },
    include: {
      boxes: true,
      positions: { orderBy: { recordedAt: 'desc' }, take: 1 },
    },
  });
  if (!truck) return res.status(404).json({ error: 'Camión no encontrado' });
  res.json(truck);
});

// GET /api/trucks/:id/positions  — full GPS track
router.get('/:id/positions', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const positions = await prisma.position.findMany({
    where: { truckId: id },
    orderBy: { recordedAt: 'asc' },
  });
  res.json(positions);
});

module.exports = router;
