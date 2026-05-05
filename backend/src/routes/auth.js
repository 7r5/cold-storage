// POST /api/auth/login  — dummy login (plain password compare)
const express = require('express');
const prisma = require('../db');
const { encodeToken } = require('../utils/token');

const router = express.Router();

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

module.exports = router;
