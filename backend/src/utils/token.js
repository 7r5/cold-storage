// Dummy unsigned token: base64("userId:role:issuedAt").
// POC only — DO NOT use in production.

function encodeToken(user) {
  const payload = `${user.id}:${user.role}:${Date.now()}`;
  return Buffer.from(payload, 'utf8').toString('base64');
}

function decodeToken(token) {
  try {
    const raw = Buffer.from(token, 'base64').toString('utf8');
    const [idStr, role, issuedAt] = raw.split(':');
    const id = parseInt(idStr, 10);
    if (!id || !role || !issuedAt) return null;
    return { id, role, issuedAt: parseInt(issuedAt, 10) };
  } catch {
    return null;
  }
}

module.exports = { encodeToken, decodeToken };
