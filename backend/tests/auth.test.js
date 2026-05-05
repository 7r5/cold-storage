// HTTP test for /api/auth/login. Mocks Prisma so no DB is needed.
jest.mock('../src/db', () => ({
  user: {
    findUnique: jest.fn(),
  },
}));

const request = require('supertest');
const prisma = require('../src/db');
const { createApp } = require('../src/app');

const app = createApp();

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    prisma.user.findUnique.mockReset();
  });

  it('400 when missing fields', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.status).toBe(400);
  });

  it('401 when user not found', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'x', password: 'y' });
    expect(res.status).toBe(401);
  });

  it('401 when password mismatch', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 1, username: 'admin', password: 'admin', role: 'USER',
    });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'wrong' });
    expect(res.status).toBe(401);
  });

  it('200 with token on success', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 1, username: 'admin', password: 'admin', role: 'USER',
      firstName: 'Admin', lastName: 'Test', phone: null, age: null, position: null,
    });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user).toMatchObject({ id: 1, username: 'admin', role: 'USER', firstName: 'Admin' });
  });
});
