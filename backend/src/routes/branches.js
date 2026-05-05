// Branch endpoints
const express = require('express');
const prisma = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const STOCK_INCLUDE = {
  stock: {
    orderBy: { product: { name: 'asc' } },
    include: { product: { select: { id: true, sku: true, name: true, category: true } } },
  },
};

// GET /api/branches — list all branches with their stock
router.get('/', requireAuth, async (_req, res) => {
  try {
    const branches = await prisma.branch.findMany({
      orderBy: { name: 'asc' },
      include: STOCK_INCLUDE,
    });
    res.json(branches);
  } catch {
    res.status(500).json({ error: 'Error al obtener sucursales' });
  }
});

// GET /api/branches/:id/stock — stock for a single branch
router.get('/:id/stock', requireAuth, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'ID invalido' });
  try {
    const branch = await prisma.branch.findUnique({
      where: { id },
      include: STOCK_INCLUDE,
    });
    if (!branch) return res.status(404).json({ error: 'Sucursal no encontrada' });
    res.json(branch.stock);
  } catch {
    res.status(500).json({ error: 'Error al obtener inventario de sucursal' });
  }
});

module.exports = router;
