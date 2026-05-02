// Alerts endpoints
const express = require('express');
const prisma = require('../db');

const router = express.Router();

// GET /api/alerts?onlyActive=true
router.get('/', async (req, res) => {
  const onlyActive = req.query.onlyActive === 'true';
  const alerts = await prisma.alert.findMany({
    where: onlyActive ? { acknowledged: false } : undefined,
    include: { box: { select: { id: true, code: true, truckId: true } } },
    orderBy: { recordedAt: 'desc' },
  });
  res.json(alerts);
});

// POST /api/alerts/:id/ack  — mark as acknowledged
router.post('/:id/ack', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const updated = await prisma.alert.update({
    where: { id },
    data: { acknowledged: true },
  });
  res.json(updated);
});

module.exports = router;
