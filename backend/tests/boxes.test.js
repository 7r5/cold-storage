// Tests for /api/boxes
jest.mock('../src/db', () => ({
  box: {
    findMany: jest.fn(),
  },
  reading: {
    findMany: jest.fn(),
  },
  route: {
    findMany: jest.fn(),
  },
}));

const request = require('supertest');
const prisma = require('../src/db');
const { createApp } = require('../src/app');
const { encodeToken } = require('../src/utils/token');

const app = createApp();
const authHeader = `Bearer ${encodeToken({ id: 1, role: 'USER' })}`;

describe('GET /api/boxes', () => {
  beforeEach(() => prisma.box.findMany.mockReset());

  it('200 returns all boxes', async () => {
    prisma.box.findMany.mockResolvedValue([
      { id: 1, code: 'BOX-A', truck: { id: 1, plate: 'UKG-001' } },
    ]);
    const res = await request(app).get('/api/boxes').set('Authorization', authHeader);
    expect(res.status).toBe(200);
    expect(res.body[0].code).toBe('BOX-A');
  });
});

describe('GET /api/boxes/:id/readings', () => {
  beforeEach(() => prisma.reading.findMany.mockReset());

  it('200 returns readings in ascending order', async () => {
    prisma.reading.findMany.mockResolvedValue([
      { id: 2, temperature: -19, humidity: 70 },
      { id: 1, temperature: -18, humidity: 72 },
    ]);
    const res = await request(app)
      .get('/api/boxes/1/readings')
      .set('Authorization', authHeader);
    expect(res.status).toBe(200);
    // reversed by the endpoint
    expect(res.body[0].id).toBe(1);
    expect(res.body[1].id).toBe(2);
  });

  it('respects limit query param', async () => {
    prisma.reading.findMany.mockResolvedValue([]);
    await request(app)
      .get('/api/boxes/1/readings?limit=10')
      .set('Authorization', authHeader);
    const call = prisma.reading.findMany.mock.calls[0][0];
    expect(call.take).toBe(10);
  });

  it('caps limit at 2000', async () => {
    prisma.reading.findMany.mockResolvedValue([]);
    await request(app)
      .get('/api/boxes/1/readings?limit=9999')
      .set('Authorization', authHeader);
    const call = prisma.reading.findMany.mock.calls[0][0];
    expect(call.take).toBe(2000);
  });

  it('applies since filter when provided', async () => {
    prisma.reading.findMany.mockResolvedValue([]);
    const since = '2025-01-01T00:00:00.000Z';
    await request(app)
      .get(`/api/boxes/1/readings?since=${since}`)
      .set('Authorization', authHeader);
    const call = prisma.reading.findMany.mock.calls[0][0];
    expect(call.where.recordedAt).toBeDefined();
  });
});

describe('GET /api/boxes/inventory', () => {
  beforeEach(() => prisma.route.findMany.mockReset());

  it('200 returns inventory grouped by route', async () => {
    prisma.route.findMany.mockResolvedValue([
      {
        id: 1,
        status: 'ACTIVE',
        truck: { id: 1, plate: 'UKG-001', driverName: 'Juan' },
        originBranch: null,
        destinationBranch: null,
        loads: [],
      },
    ]);
    const res = await request(app)
      .get('/api/boxes/inventory')
      .set('Authorization', authHeader);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  it('500 on DB error', async () => {
    prisma.route.findMany.mockRejectedValue(new Error('DB down'));
    const res = await request(app)
      .get('/api/boxes/inventory')
      .set('Authorization', authHeader);
    expect(res.status).toBe(500);
  });
});
