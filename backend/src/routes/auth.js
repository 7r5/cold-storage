// POST /api/auth/login  — dummy login (plain password compare)
const express = require('express');
const prisma = require('../db');
const { encodeToken } = require('../utils/token');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const USER_SELECT = {
  id: true, username: true, role: true,
  firstName: true, lastName: true,
  phone: true, age: true, position: true,
};

router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña son obligatorios' });
  }

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  const token = encodeToken(user);
  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      age: user.age,
      position: user.position,
    },
  });
});

// GET /api/auth/me — returns fresh profile for the authenticated user
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: USER_SELECT,
    });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(user);
  } catch (e) {
    res.status(500).json({ error: 'Error al obtener perfil' });
  }
});

module.exports = router;
