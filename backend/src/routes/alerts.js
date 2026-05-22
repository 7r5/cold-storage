// Alerts endpoints
const express = require('express');
const prisma = require('../db');

const router = express.Router();

// GET /api/alerts?onlyActive=true&since=ISO&limit=N
router.get('/', async (req, res) => {
  const onlyActive = req.query.onlyActive === 'true';
  const since = req.query.since ? new Date(req.query.since) : undefined;
  const limit = req.query.limit ? parseInt(req.query.limit, 10) : undefined;
  const alerts = await prisma.alert.findMany({
    where: {
      ...(onlyActive ? { acknowledged: false } : {}),
      ...(since ? { recordedAt: { gte: since } } : {}),
    },
    include: {
      box: {
        select: {
          id: true,
          code: true,
          truckId: true,
          truck: {
            select: {
              plate: true,
              driverName: true,
              driver: { select: { firstName: true, lastName: true } },
            },
          },
        },
      },
      route: { select: { id: true, originName: true, destinationName: true } },
    },
    orderBy: { recordedAt: 'desc' },
    ...(limit ? { take: limit } : {}),
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
