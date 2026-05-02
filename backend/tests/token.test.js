// Token utilities — pure logic, no DB
const { encodeToken, decodeToken } = require('../src/utils/token');

describe('token utils', () => {
  it('round-trips id and role', () => {
    const token = encodeToken({ id: 7, role: 'ROOT' });
    const decoded = decodeToken(token);
    expect(decoded.id).toBe(7);
    expect(decoded.role).toBe('ROOT');
    expect(typeof decoded.issuedAt).toBe('number');
  });

  it('returns null on garbage input', () => {
    expect(decodeToken('not-base64-!!!')).toBeNull();
    expect(decodeToken('')).toBeNull();
  });
});
