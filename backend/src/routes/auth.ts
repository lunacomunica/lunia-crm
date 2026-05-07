import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db.js';
import { authMiddleware, JWT_SECRET } from '../middleware/auth.js';

const router = Router();

router.post('/login', (req, res) => {
  const { email, password } = req.body as { email: string; password: string };
  if (!email || !password) {
    return res.status(400).json({ error: 'Email e senha são obrigatórios' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Email ou senha incorretos' });
  }

  const tenant = db.prepare('SELECT * FROM tenants WHERE id = ?').get(user.tenant_id) as any;

  const token = jwt.sign(
    { id: user.id, tenant_id: user.tenant_id, email: user.email, name: user.name, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, tenant: tenant?.name } });
});

router.get('/me', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT id, name, email, role, tenant_id FROM users WHERE id = ?').get(req.user.id) as any;
  const tenant = db.prepare('SELECT name, slug FROM tenants WHERE id = ?').get(req.user.tenant_id) as any;
  res.json({ ...user, tenant: tenant?.name });
});

export default router;
