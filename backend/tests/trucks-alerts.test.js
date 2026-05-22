// Tests for /api/trucks and /api/alerts
jest.mock('../src/db', () => ({
  truck: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
  position: {
    findMany: jest.fn(),
  },
  alert: {
    findMany: jest.fn(),
    update: jest.fn(),
  },
}));

const request = require('supertest');
const prisma = require('../src/db');
const { createApp } = require('../src/app');
const { encodeToken } = require('../src/utils/token');

const app = createApp();
const authHeader = `Bearer ${encodeToken({ id: 1, role: 'USER' })}`;

// ─── Trucks ──────────────────────────────────────────────────────────────────

describe('GET /api/trucks', () => {
  beforeEach(() => prisma.truck.findMany.mockReset());

  it('200 with truck list', async () => {
    prisma.truck.findMany.mockResolvedValue([
      { id: 1, plate: 'UKG-001', boxes: [] },
    ]);
    const res = await request(app).get('/api/trucks').set('Authorization', authHeader);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].plate).toBe('UKG-001');
  });
});

describe('GET /api/trucks/:id', () => {
  beforeEach(() => prisma.truck.findUnique.mockReset());

  it('404 when truck not found', async () => {
    prisma.truck.findUnique.mockResolvedValue(null);
    const res = await request(app).get('/api/trucks/999').set('Authorization', authHeader);
    expect(res.status).toBe(404);
  });

  it('200 with truck data', async () => {
    prisma.truck.findUnique.mockResolvedValue({
      id: 1, plate: 'UKG-001', boxes: [], positions: [],
    });
    const res = await request(app).get('/api/trucks/1').set('Authorization', authHeader);
    expect(res.status).toBe(200);
    expect(res.body.plate).toBe('UKG-001');
  });
});

describe('GET /api/trucks/:id/positions', () => {
  beforeEach(() => prisma.position.findMany.mockReset());

  it('200 with positions array', async () => {
    prisma.position.findMany.mockResolvedValue([
      { id: 1, lat: 20.5, lng: -100.3, truckId: 1 },
    ]);
    const res = await request(app).get('/api/trucks/1/positions').set('Authorization', authHeader);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });
});

// ─── Alerts ──────────────────────────────────────────────────────────────────

describe('GET /api/alerts', () => {
  beforeEach(() => prisma.alert.findMany.mockReset());

  it('200 returns all alerts', async () => {
    prisma.alert.findMany.mockResolvedValue([
      { id: 1, type: 'TEMP', acknowledged: false, routeId: 1,
        box: { id: 1, code: 'BOX-A', truckId: 1, truck: { plate: 'ABC-001', driverName: 'Juan', driver: null } },
        route: { id: 1, originName: 'CDMX', destinationName: 'Qro' } },
    ]);
    const res = await request(app).get('/api/alerts').set('Authorization', authHeader);
    expect(res.status).toBe(200);
    expect(res.body[0].type).toBe('TEMP');
    expect(res.body[0].routeId).toBe(1);
  });

  it('200 with onlyActive=true filter', async () => {
    prisma.alert.findMany.mockResolvedValue([]);
    const res = await request(app)
      .get('/api/alerts?onlyActive=true')
      .set('Authorization', authHeader);
    expect(res.status).toBe(200);
    const call = prisma.alert.findMany.mock.calls[0][0];
    expect(call.where).toEqual({ acknowledged: false });
  });
});

describe('POST /api/alerts/:id/ack', () => {
  beforeEach(() => prisma.alert.update.mockReset());

  it('200 marks alert acknowledged', async () => {
    prisma.alert.update.mockResolvedValue({ id: 3, acknowledged: true });
    const res = await request(app)
      .post('/api/alerts/3/ack')
      .set('Authorization', authHeader);
    expect(res.status).toBe(200);
    expect(res.body.acknowledged).toBe(true);
  });
});
