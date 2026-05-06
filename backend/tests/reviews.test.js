// Tests for /api/reviews
jest.mock('../src/db', () => ({
  review: {
    findMany: jest.fn(),
    create: jest.fn(),
  },
}));

const request = require('supertest');
const prisma = require('../src/db');
const { createApp } = require('../src/app');
const { encodeToken } = require('../src/utils/token');

const app = createApp();
const authHeader = `Bearer ${encodeToken({ id: 1, role: 'USER' })}`;

describe('GET /api/reviews', () => {
  beforeEach(() => prisma.review.findMany.mockReset());

  it('401 without auth', async () => {
    const res = await request(app).get('/api/reviews');
    expect(res.status).toBe(401);
  });

  it('200 returns review list', async () => {
    prisma.review.findMany.mockResolvedValue([
      { id: 1, rating: 5, comment: 'Excelente', username: 'max', createdAt: new Date().toISOString() },
    ]);
    const res = await request(app).get('/api/reviews').set('Authorization', authHeader);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].rating).toBe(5);
  });

  it('200 returns empty list', async () => {
    prisma.review.findMany.mockResolvedValue([]);
    const res = await request(app).get('/api/reviews').set('Authorization', authHeader);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });
});

describe('POST /api/reviews', () => {
  beforeEach(() => prisma.review.create.mockReset());

  it('401 without auth', async () => {
    const res = await request(app).post('/api/reviews').send({ rating: 4 });
    expect(res.status).toBe(401);
  });

  it('400 when rating missing', async () => {
    const res = await request(app)
      .post('/api/reviews')
      .set('Authorization', authHeader)
      .send({ comment: 'Buena app' });
    expect(res.status).toBe(400);
  });

  it('400 when rating out of range (0)', async () => {
    const res = await request(app)
      .post('/api/reviews')
      .set('Authorization', authHeader)
      .send({ rating: 0 });
    expect(res.status).toBe(400);
  });

  it('400 when rating out of range (6)', async () => {
    const res = await request(app)
      .post('/api/reviews')
      .set('Authorization', authHeader)
      .send({ rating: 6 });
    expect(res.status).toBe(400);
  });

  it('201 creates review with comment', async () => {
    prisma.review.create.mockResolvedValue({
      id: 1, rating: 4, comment: 'Muy buena', username: null, createdAt: new Date().toISOString(),
    });
    const res = await request(app)
      .post('/api/reviews')
      .set('Authorization', authHeader)
      .send({ rating: 4, comment: 'Muy buena' });
    expect(res.status).toBe(201);
    expect(res.body.rating).toBe(4);
  });

  it('201 creates review without comment', async () => {
    prisma.review.create.mockResolvedValue({
      id: 2, rating: 3, comment: null, username: null, createdAt: new Date().toISOString(),
    });
    const res = await request(app)
      .post('/api/reviews')
      .set('Authorization', authHeader)
      .send({ rating: 3 });
    expect(res.status).toBe(201);
  });

  it('truncates comment to 500 chars', async () => {
    const longComment = 'a'.repeat(600);
    prisma.review.create.mockResolvedValue({
      id: 3, rating: 2, comment: longComment.slice(0, 500), username: null, createdAt: new Date().toISOString(),
    });
    await request(app)
      .post('/api/reviews')
      .set('Authorization', authHeader)
      .send({ rating: 2, comment: longComment });
    const call = prisma.review.create.mock.calls[0][0];
    expect(call.data.comment.length).toBeLessThanOrEqual(500);
  });
});
