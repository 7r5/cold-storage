// Branch endpoints
const express = require('express');
const prisma = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/branches — list all branches
router.get('/', requireAuth, async (_req, res) => {
  try {
    const branches = await prisma.branch.findMany({ orderBy: { name: 'asc' } });
    res.json(branches);
  } catch {
    res.status(500).json({ error: 'Error al obtener sucursales' });
  }
});

module.exports = router;
