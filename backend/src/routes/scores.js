// Easter egg leaderboard — public, no auth required
const express = require('express');
const router = express.Router();
const prisma = require('../db');

// GET /api/scores — top 10 all-time
router.get('/', async (_req, res, next) => {
  try {
    const scores = await prisma.gameScore.findMany({
      orderBy: { score: 'desc' },
      take: 10,
      select: { id: true, name: true, score: true, createdAt: true },
    });
    res.json(scores);
  } catch (err) {
    next(err);
  }
});

// POST /api/scores — submit a score
router.post('/', async (req, res, next) => {
  const { name, score } = req.body;
  const parsedScore = parseInt(score, 10);

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'Nombre requerido' });
  }
  if (isNaN(parsedScore) || parsedScore <= 0) {
    return res.status(400).json({ error: 'Puntuación inválida' });
  }

  try {
    const entry = await prisma.gameScore.create({
      data: { name: name.trim().slice(0, 20), score: parsedScore },
      select: { id: true, name: true, score: true, createdAt: true },
    });
    res.status(201).json(entry);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
