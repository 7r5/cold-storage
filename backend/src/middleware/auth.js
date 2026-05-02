// Auth middleware: reads Bearer token, attaches req.user
const { decodeToken } = require('../utils/token');

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  const decoded = token ? decodeToken(token) : null;
  if (!decoded) {
    return res.status(401).json({ error: 'No autorizado' });
  }
  req.user = decoded;
  next();
}

// Restrict route to ROOT users only
function requireRoot(req, res, next) {
  if (!req.user || req.user.role !== 'ROOT') {
    return res.status(403).json({ error: 'Permisos insuficientes' });
  }
  next();
}

module.exports = { requireAuth, requireRoot };
