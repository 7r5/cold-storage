// Tests for /api/branches and /api/simulator
jest.mock('../src/db', () => ({
  branch: {
    findMany: jest.fn(),
  },
}));

// Stub engine so no real DB/timers fire
jest.mock('../src/simulator/engine', () => ({
  getActive: jest.fn(() => []),
  startRoute: jest.fn(),
  stopRoute: jest.fn(),
  setForcedOffset: jest.fn(),
  clearForcedOffsets: jest.fn(),
  setIo: jest.fn(),
  _internal: {
    interpolate: jest.fn(),
    generateReading: jest.fn(),
    checkAlert: jest.fn(),
  },
}));

const request = require('supertest');
const prisma = require('../src/db');
const engine = require('../src/simulator/engine');
const { createApp } = require('../src/app');
const { encodeToken } = require('../src/utils/token');

const app = createApp();
const userToken = `Bearer ${encodeToken({ id: 1, role: 'USER' })}`;
const rootToken = `Bearer ${encodeToken({ id: 2, role: 'ROOT' })}`;

// ─── Branches ────────────────────────────────────────────────────────────────

describe('GET /api/branches', () => {
  beforeEach(() => prisma.branch.findMany.mockReset());

  it('401 without auth', async () => {
    const res = await request(app).get('/api/branches');
    expect(res.status).toBe(401);
  });

  it('200 returns branch list', async () => {
    prisma.branch.findMany.mockResolvedValue([
      { id: 1, name: 'Farmacia Central', city: 'Querétaro', type: 'PHARMACY' },
    ]);
    const res = await request(app).get('/api/branches').set('Authorization', userToken);
    expect(res.status).toBe(200);
    expect(res.body[0].name).toBe('Farmacia Central');
  });

  it('500 on DB error', async () => {
    prisma.branch.findMany.mockRejectedValue(new Error('fail'));
    const res = await request(app).get('/api/branches').set('Authorization', userToken);
    expect(res.status).toBe(500);
  });
});

// ─── Simulator (ROOT only) ───────────────────────────────────────────────────

describe('GET /api/simulator/status', () => {
  it('401 without auth', async () => {
    const res = await request(app).get('/api/simulator/status');
    expect(res.status).toBe(401);
  });

  it('403 for non-ROOT user', async () => {
    const res = await request(app)
      .get('/api/simulator/status')
      .set('Authorization', userToken);
    expect(res.status).toBe(403);
  });

  it('200 returns active simulations', async () => {
    engine.getActive.mockReturnValue([{ truckId: 1 }]);
    const res = await request(app)
      .get('/api/simulator/status')
      .set('Authorization', rootToken);
    expect(res.status).toBe(200);
    expect(res.body.active).toHaveLength(1);
  });
});

describe('POST /api/simulator/start', () => {
  beforeEach(() => engine.startRoute.mockReset());

  it('200 starts a route', async () => {
    engine.startRoute.mockResolvedValue({ id: 3, truckId: 1 });
    const res = await request(app)
      .post('/api/simulator/start')
      .set('Authorization', rootToken)
      .send({ routeId: 3 });
    expect(res.status).toBe(200);
    expect(res.body.routeId).toBe(3);
  });

  it('400 when engine throws', async () => {
    engine.startRoute.mockRejectedValue(new Error('Ruta no encontrada'));
    const res = await request(app)
      .post('/api/simulator/start')
      .set('Authorization', rootToken)
      .send({ routeId: 99 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/ruta no encontrada/i);
  });
});

describe('POST /api/simulator/stop', () => {
  beforeEach(() => engine.stopRoute.mockReset());

  it('200 stops a running truck', async () => {
    engine.stopRoute.mockResolvedValue();
    const res = await request(app)
      .post('/api/simulator/stop')
      .set('Authorization', rootToken)
      .send({ truckId: 1 });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('400 when engine throws', async () => {
    engine.stopRoute.mockRejectedValue(new Error('No activo'));
    const res = await request(app)
      .post('/api/simulator/stop')
      .set('Authorization', rootToken)
      .send({ truckId: 99 });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/simulator/anomaly', () => {
  it('200 sets forced offset', async () => {
    const res = await request(app)
      .post('/api/simulator/anomaly')
      .set('Authorization', rootToken)
      .send({ truckId: 1, tempOffset: 5 });
    expect(res.status).toBe(200);
    expect(engine.setForcedOffset).toHaveBeenCalledWith(1, { tempOffset: 5, humOffset: undefined });
  });
});

describe('POST /api/simulator/clear', () => {
  it('200 clears forced offset', async () => {
    const res = await request(app)
      .post('/api/simulator/clear')
      .set('Authorization', rootToken)
      .send({ truckId: 1 });
    expect(res.status).toBe(200);
    expect(engine.clearForcedOffsets).toHaveBeenCalledWith(1);
  });
});
