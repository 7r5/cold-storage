// Build the Express app (no .listen here, so it's testable)
const express = require('express');
const cors = require('cors');

const config = require('./config');

const authRoutes = require('./routes/auth');
const trucksRoutes = require('./routes/trucks');
const boxesRoutes = require('./routes/boxes');
const routesRoutes = require('./routes/routes');
const alertsRoutes = require('./routes/alerts');
const simulatorRoutes = require('./routes/simulator');
const bugsRoutes = require('./routes/bugs');
const { requireAuth } = require('./middleware/auth');

function createApp() {
  const app = express();

  app.use(cors({ origin: config.corsOrigins, credentials: true }));
  app.use(express.json());

  // Health probe (used by Render)
  app.get('/api/health', (_req, res) => res.json({ ok: true }));

  // Public
  app.use('/api/auth', authRoutes);

  // Protected
  app.use('/api/trucks', requireAuth, trucksRoutes);
  app.use('/api/boxes', requireAuth, boxesRoutes);
  app.use('/api/routes', requireAuth, routesRoutes);
  app.use('/api/alerts', requireAuth, alertsRoutes);
  app.use('/api/bugs', bugsRoutes); // auth handled per-route inside
  app.use('/api/simulator', simulatorRoutes); // its own auth chain inside

  // 404
  app.use((_req, res) => res.status(404).json({ error: 'No encontrado' }));

  // Centralized error handler
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: 'Error interno' });
  });

  return app;
}

module.exports = { createApp };
