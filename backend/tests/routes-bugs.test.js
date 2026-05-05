// Tests for /api/routes and /api/bugs
jest.mock('../src/db', () => ({
  position: {
    findMany: jest.fn(),
  },
  route: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  },
  truck: {
    findUnique: jest.fn(),
  },
  bug: {
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
}));

const request = require('supertest');
const prisma = require('../src/db');
const { createApp } = require('../src/app');
const { encodeToken } = require('../src/utils/token');

const app = createApp();
const userToken = `Bearer ${encodeToken({ id: 1, role: 'USER', username: 'max' })}`;
const rootToken = `Bearer ${encodeToken({ id: 2, role: 'ROOT', username: 'root' })}`;

// ─── Routes ──────────────────────────────────────────────────────────────────

describe('GET /api/routes/live-history', () => {
  beforeEach(() => prisma.position.findMany.mockReset());

  it('200 returns grouped history by routeId', async () => {
    prisma.position.findMany.mockResolvedValue([
      { routeId: 10, lat: 20.5, lng: -100.3 },
      { routeId: 10, lat: 20.6, lng: -100.4 },
      { routeId: 11, lat: 21.0, lng: -100.0 },
    ]);
    const res = await request(app)
      .get('/api/routes/live-history')
      .set('Authorization', userToken);
    expect(res.status).toBe(200);
    expect(res.body['10']).toHaveLength(2);
    expect(res.body['11']).toHaveLength(1);
  });

  it('200 returns empty object when no positions', async () => {
    prisma.position.findMany.mockResolvedValue([]);
    const res = await request(app)
      .get('/api/routes/live-history')
      .set('Authorization', userToken);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({});
  });
});

describe('GET /api/routes', () => {
  beforeEach(() => prisma.route.findMany.mockReset());

  it('200 returns route list', async () => {
    prisma.route.findMany.mockResolvedValue([
      { id: 1, status: 'PENDING', truck: { id: 1, plate: 'UKG-001', boxes: [] } },
    ]);
    const res = await request(app).get('/api/routes').set('Authorization', userToken);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });
});

describe('GET /api/routes/:id', () => {
  beforeEach(() => prisma.route.findUnique.mockReset());

  it('400 when id is not a number', async () => {
    const res = await request(app).get('/api/routes/abc').set('Authorization', userToken);
    expect(res.status).toBe(400);
  });

  it('404 when route not found', async () => {
    prisma.route.findUnique.mockResolvedValue(null);
    const res = await request(app).get('/api/routes/999').set('Authorization', userToken);
    expect(res.status).toBe(404);
  });

  it('200 returns route detail', async () => {
    prisma.route.findUnique.mockResolvedValue({
      id: 1, status: 'PENDING', truck: { id: 1, plate: 'UKG-001' },
    });
    const res = await request(app).get('/api/routes/1').set('Authorization', userToken);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(1);
  });
});

describe('POST /api/routes', () => {
  beforeEach(() => {
    prisma.truck.findUnique.mockReset();
    prisma.route.create.mockReset();
  });

  const valid = {
    truckId: 1,
    originName: 'Querétaro',
    destinationName: 'San Juan del Río',
    waypoints: [[-100.3, 20.5], [-100.1, 20.8]],
  };

  it('400 when missing required fields', async () => {
    const res = await request(app)
      .post('/api/routes')
      .set('Authorization', userToken)
      .send({ truckId: 1 });
    expect(res.status).toBe(400);
  });

  it('400 when truckId is not a number', async () => {
    const res = await request(app)
      .post('/api/routes')
      .set('Authorization', userToken)
      .send({ ...valid, truckId: 'abc' });
    expect(res.status).toBe(400);
  });

  it('400 when waypoints is not an array', async () => {
    const res = await request(app)
      .post('/api/routes')
      .set('Authorization', userToken)
      .send({ ...valid, waypoints: 'wrong' });
    expect(res.status).toBe(400);
  });

  it('400 when waypoints has fewer than 2 points', async () => {
    const res = await request(app)
      .post('/api/routes')
      .set('Authorization', userToken)
      .send({ ...valid, waypoints: [[-100.3, 20.5]] });
    expect(res.status).toBe(400);
  });

  it('404 when truck not found', async () => {
    prisma.truck.findUnique.mockResolvedValue(null);
    const res = await request(app)
      .post('/api/routes')
      .set('Authorization', userToken)
      .send(valid);
    expect(res.status).toBe(404);
  });

  it('201 creates route successfully', async () => {
    prisma.truck.findUnique.mockResolvedValue({ id: 1, plate: 'UKG-001' });
    prisma.route.create.mockResolvedValue({
      id: 5, status: 'PENDING', truck: { id: 1, plate: 'UKG-001' },
    });
    const res = await request(app)
      .post('/api/routes')
      .set('Authorization', userToken)
      .send(valid);
    expect(res.status).toBe(201);
    expect(res.body.id).toBe(5);
  });
});

describe('DELETE /api/routes/:id', () => {
  beforeEach(() => {
    prisma.route.findUnique.mockReset();
    prisma.route.delete.mockReset();
  });

  it('400 when id is not a number', async () => {
    const res = await request(app)
      .delete('/api/routes/nope')
      .set('Authorization', userToken);
    expect(res.status).toBe(400);
  });

  it('404 when route not found', async () => {
    prisma.route.findUnique.mockResolvedValue(null);
    const res = await request(app)
      .delete('/api/routes/99')
      .set('Authorization', userToken);
    expect(res.status).toBe(404);
  });

  it('409 when route is not PENDING', async () => {
    prisma.route.findUnique.mockResolvedValue({ id: 1, status: 'ACTIVE' });
    const res = await request(app)
      .delete('/api/routes/1')
      .set('Authorization', userToken);
    expect(res.status).toBe(409);
  });

  it('200 deletes PENDING route', async () => {
    prisma.route.findUnique.mockResolvedValue({ id: 1, status: 'PENDING' });
    prisma.route.delete.mockResolvedValue({ id: 1 });
    const res = await request(app)
      .delete('/api/routes/1')
      .set('Authorization', userToken);
    expect(res.status).toBe(204);
  });
});

// ─── Bugs ────────────────────────────────────────────────────────────────────

describe('GET /api/bugs', () => {
  beforeEach(() => prisma.bug.findMany.mockReset());

  it('401 without auth', async () => {
    const res = await request(app).get('/api/bugs');
    expect(res.status).toBe(401);
  });

  it('200 returns bug list', async () => {
    prisma.bug.findMany.mockResolvedValue([
      { id: 1, title: 'Map crash', status: 'OPEN' },
    ]);
    const res = await request(app).get('/api/bugs').set('Authorization', userToken);
    expect(res.status).toBe(200);
    expect(res.body[0].title).toBe('Map crash');
  });
});

describe('POST /api/bugs', () => {
  beforeEach(() => prisma.bug.create.mockReset());

  const valid = {
    title: 'Crash on load',
    location: 'Home',
    expected: 'Page loads',
    actual: 'White screen',
  };

  it('400 when missing fields', async () => {
    const res = await request(app)
      .post('/api/bugs')
      .set('Authorization', userToken)
      .send({ title: 'only title' });
    expect(res.status).toBe(400);
  });

  it('201 creates bug', async () => {
    prisma.bug.create.mockResolvedValue({ id: 1, ...valid, status: 'OPEN' });
    const res = await request(app)
      .post('/api/bugs')
      .set('Authorization', userToken)
      .send(valid);
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('OPEN');
  });
});

describe('PATCH /api/bugs/:id/status', () => {
  beforeEach(() => prisma.bug.update.mockReset());

  it('400 when id is not a number', async () => {
    const res = await request(app)
      .patch('/api/bugs/abc/status')
      .set('Authorization', userToken)
      .send({ status: 'CLOSED' });
    expect(res.status).toBe(400);
  });

  it('400 when status is invalid', async () => {
    const res = await request(app)
      .patch('/api/bugs/1/status')
      .set('Authorization', userToken)
      .send({ status: 'INVALID' });
    expect(res.status).toBe(400);
  });

  it('200 updates status', async () => {
    prisma.bug.update.mockResolvedValue({ id: 1, status: 'IN_PROGRESS' });
    const res = await request(app)
      .patch('/api/bugs/1/status')
      .set('Authorization', userToken)
      .send({ status: 'IN_PROGRESS' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('IN_PROGRESS');
  });
});
