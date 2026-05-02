// Routes endpoints (the planned trips, not Express routes)
const express = require('express');
const prisma = require('../db');

const router = express.Router();

// GET /api/routes  — list all
router.get('/', async (_req, res) => {
  const routes = await prisma.route.findMany({
    include: { truck: { select: { id: true, plate: true } } },
    orderBy: { id: 'asc' },
  });
  res.json(routes);
});

// GET /api/routes/:id
router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const route = await prisma.route.findUnique({
    where: { id },
    include: { truck: true },
  });
  if (!route) return res.status(404).json({ error: 'Ruta no encontrada' });
  res.json(route);
});

module.exports = router;
