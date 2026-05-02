// HTTP control endpoints for the simulator. ROOT only.
const express = require('express');
const { requireAuth, requireRoot } = require('../middleware/auth');
const engine = require('../simulator/engine');

const router = express.Router();

router.use(requireAuth, requireRoot);

// GET /api/simulator/status — list active simulations
router.get('/status', (_req, res) => {
  res.json({ active: engine.getActive() });
});

// POST /api/simulator/start  { routeId }
router.post('/start', async (req, res) => {
  try {
    const routeId = parseInt(req.body.routeId, 10);
    const route = await engine.startRoute(routeId);
    res.json({ ok: true, routeId: route.id, truckId: route.truckId });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// POST /api/simulator/stop  { truckId }
router.post('/stop', async (req, res) => {
  try {
    const truckId = parseInt(req.body.truckId, 10);
    await engine.stopRoute(truckId, 'COMPLETED');
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// POST /api/simulator/anomaly  { truckId, tempOffset?, humOffset? }
router.post('/anomaly', (req, res) => {
  try {
    const truckId = parseInt(req.body.truckId, 10);
    engine.setForcedOffset(truckId, {
      tempOffset: req.body.tempOffset,
      humOffset: req.body.humOffset,
    });
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// POST /api/simulator/clear  { truckId } — remove forced anomalies
router.post('/clear', (req, res) => {
  try {
    const truckId = parseInt(req.body.truckId, 10);
    engine.clearForcedOffsets(truckId);
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

module.exports = router;
