// Bug report endpoints — report and track UI bugs
const express = require('express');
const prisma = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/bugs
 * Returns all bugs ordered by creation date (newest first).
 */
router.get('/', requireAuth, async (_req, res) => {
  try {
    const bugs = await prisma.bug.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(bugs);
  } catch {
    res.status(500).json({ error: 'Error al obtener bugs' });
  }
});

/**
 * POST /api/bugs
 * Creates a new bug report. Body: { title, location, expected, actual }
 */
router.post('/', requireAuth, async (req, res) => {
  const { title, location, expected, actual } = req.body || {};
  if (!title || !location || !expected || !actual) {
    return res.status(400).json({ error: 'Campos requeridos: title, location, expected, actual' });
  }

  try {
    const bug = await prisma.bug.create({
      data: {
        title: String(title).trim(),
        location: String(location).trim(),
        expected: String(expected).trim(),
        actual: String(actual).trim(),
        reportedBy: req.user?.username ?? null,
      },
    });
    res.status(201).json(bug);
  } catch {
    res.status(500).json({ error: 'Error al crear bug' });
  }
});

/**
 * PATCH /api/bugs/:id/status
 * Updates bug status. Body: { status: 'OPEN' | 'IN_PROGRESS' | 'CLOSED' }
 */
router.patch('/:id/status', requireAuth, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

  const VALID = ['OPEN', 'IN_PROGRESS', 'CLOSED'];
  const { status } = req.body || {};
  if (!VALID.includes(status)) {
    return res.status(400).json({ error: `status debe ser uno de: ${VALID.join(', ')}` });
  }

  try {
    const bug = await prisma.bug.update({ where: { id }, data: { status } });
    res.json(bug);
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Bug no encontrado' });
    res.status(500).json({ error: 'Error al actualizar estado' });
  }
});

module.exports = router;
