// Tests for Easter egg leaderboard — GET /api/scores, POST /api/scores
jest.mock('../src/db', () => ({
  gameScore: {
    findMany: jest.fn(),
    create: jest.fn(),
  },
}));

const request = require('supertest');
const prisma = require('../src/db');
const { createApp } = require('../src/app');

const app = createApp();

const MOCK_SCORES = [
  { id: 1, name: 'Alice', score: 120, createdAt: new Date() },
  { id: 2, name: 'Bob',   score: 80,  createdAt: new Date() },
];

describe('GET /api/scores', () => {
  beforeEach(() => prisma.gameScore.findMany.mockReset());

  it('200 — returns array', async () => {
    prisma.gameScore.findMany.mockResolvedValue(MOCK_SCORES);
    const res = await request(app).get('/api/scores');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].name).toBe('Alice');
  });

  it('200 — returns empty array when no scores', async () => {
    prisma.gameScore.findMany.mockResolvedValue([]);
    const res = await request(app).get('/api/scores');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('500 — propagates DB error', async () => {
    prisma.gameScore.findMany.mockRejectedValue(new Error('db fail'));
    const res = await request(app).get('/api/scores');
    expect(res.status).toBe(500);
  });
});

describe('POST /api/scores', () => {
  beforeEach(() => prisma.gameScore.create.mockReset());

  it('400 — missing name', async () => {
    const res = await request(app).post('/api/scores').send({ score: 50 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/nombre/i);
  });

  it('400 — empty name', async () => {
    const res = await request(app).post('/api/scores').send({ name: '   ', score: 50 });
    expect(res.status).toBe(400);
  });

  it('400 — missing score', async () => {
    const res = await request(app).post('/api/scores').send({ name: 'Alice' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/puntuaci/i);
  });

  it('400 — score = 0', async () => {
    const res = await request(app).post('/api/scores').send({ name: 'Alice', score: 0 });
    expect(res.status).toBe(400);
  });

  it('400 — negative score', async () => {
    const res = await request(app).post('/api/scores').send({ name: 'Alice', score: -5 });
    expect(res.status).toBe(400);
  });

  it('201 — creates entry and returns it', async () => {
    const created = { id: 1, name: 'Alice', score: 99, createdAt: new Date() };
    prisma.gameScore.create.mockResolvedValue(created);
    const res = await request(app).post('/api/scores').send({ name: 'Alice', score: 99 });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Alice');
    expect(res.body.score).toBe(99);
  });

  it('201 — trims name to 20 chars', async () => {
    const longName = 'A'.repeat(30);
    const created = { id: 2, name: longName.slice(0, 20), score: 10, createdAt: new Date() };
    prisma.gameScore.create.mockResolvedValue(created);
    const res = await request(app).post('/api/scores').send({ name: longName, score: 10 });
    expect(res.status).toBe(201);
    expect(prisma.gameScore.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: longName.trim().slice(0, 20) }),
      })
    );
  });

  it('500 — propagates DB error', async () => {
    prisma.gameScore.create.mockRejectedValue(new Error('db fail'));
    const res = await request(app).post('/api/scores').send({ name: 'Alice', score: 10 });
    expect(res.status).toBe(500);
  });
});
