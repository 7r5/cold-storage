// Reviews endpoints — app ratings + comments
const express = require('express');
const prisma = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/reviews — latest 50 reviews
router.get('/', requireAuth, async (_req, res) => {
  try {
    const reviews = await prisma.review.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json(reviews);
  } catch (e) {
    res.status(500).json({ error: 'Error al obtener reseñas' });
  }
});

// POST /api/reviews — submit a review { rating, comment? }
router.post('/', requireAuth, async (req, res) => {
  const rating = parseInt(req.body.rating, 10);
  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'rating debe ser un número entre 1 y 5' });
  }
  const comment = req.body.comment ? String(req.body.comment).slice(0, 500) : null;
  try {
    const review = await prisma.review.create({
      data: { rating, comment, username: req.user?.username ?? null },
    });
    res.status(201).json(review);
  } catch (e) {
    res.status(500).json({ error: 'Error al crear reseña' });
  }
});

module.exports = router;
