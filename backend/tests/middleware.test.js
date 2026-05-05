// Auth middleware — requireAuth and requireRoot
jest.mock('../src/db', () => ({}));

const { encodeToken } = require('../src/utils/token');
const { requireAuth, requireRoot } = require('../src/middleware/auth');

function mockRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

describe('requireAuth', () => {
  it('401 when no Authorization header', () => {
    const req = { headers: {} };
    const res = mockRes();
    const next = jest.fn();
    requireAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('401 when token is malformed', () => {
    const req = { headers: { authorization: 'Bearer !!!garbage!!!' } };
    const res = mockRes();
    const next = jest.fn();
    requireAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('calls next and attaches req.user with a valid token', () => {
    const token = encodeToken({ id: 5, role: 'USER' });
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = mockRes();
    const next = jest.fn();
    requireAuth(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.user).toMatchObject({ id: 5, role: 'USER' });
  });

  it('401 when header does not start with Bearer', () => {
    const req = { headers: { authorization: 'Basic abc123' } };
    const res = mockRes();
    const next = jest.fn();
    requireAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });
});

describe('requireRoot', () => {
  it('403 when user is not ROOT', () => {
    const req = { user: { id: 1, role: 'USER' } };
    const res = mockRes();
    const next = jest.fn();
    requireRoot(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('403 when req.user is missing', () => {
    const req = {};
    const res = mockRes();
    const next = jest.fn();
    requireRoot(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('calls next when user is ROOT', () => {
    const req = { user: { id: 2, role: 'ROOT' } };
    const res = mockRes();
    const next = jest.fn();
    requireRoot(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
