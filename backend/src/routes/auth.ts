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
    { id: user.id, tenant_id: user.tenant_id, email: user.email, name: user.name, role: user.role, agency_client_id: user.agency_client_id || null },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, tenant: tenant?.name, client_id: user.agency_client_id || null } });
});

router.get('/me', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT id, name, email, role, avatar, tenant_id, agency_client_id FROM users WHERE id = ?').get(req.user.id) as any;
  const tenant = db.prepare('SELECT name, slug FROM tenants WHERE id = ?').get(req.user.tenant_id) as any;
  const companyRows = db.prepare("SELECT key, value FROM settings WHERE tenant_id = ? AND key LIKE 'company_%'").all(req.user.tenant_id) as any[];
  const company: Record<string, string> = {};
  for (const row of companyRows) company[row.key.replace('company_', '')] = row.value;
  res.json({ ...user, tenant: tenant?.name, company, client_id: user.agency_client_id || null });
});

router.put('/profile', authMiddleware, (req, res) => {
  try {
    const { name, email, password, avatar, company } = req.body as any;

    const updates: string[] = [];
    const values: any[] = [];
    if (name) { updates.push('name = ?'); values.push(name); }
    if (email) { updates.push('email = ?'); values.push(email); }
    if (avatar !== undefined) { updates.push('avatar = ?'); values.push(avatar || null); }
    if (password) { updates.push('password_hash = ?'); values.push(bcrypt.hashSync(password, 10)); }
    if (updates.length) {
      values.push(req.user.id);
      db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    }

    if (company && typeof company === 'object') {
      const upsert = db.prepare('INSERT OR REPLACE INTO settings (tenant_id, key, value) VALUES (?, ?, ?)');
      db.transaction(() => {
        for (const [k, v] of Object.entries(company)) {
          if (v !== undefined) upsert.run(req.user.tenant_id, `company_${k}`, v);
        }
      })();
    }

    const updated = db.prepare('SELECT id, name, email, role, avatar FROM users WHERE id = ?').get(req.user.id) as any;
    const tenant = db.prepare('SELECT name FROM tenants WHERE id = ?').get(req.user.tenant_id) as any;
    res.json({ ...updated, tenant: tenant?.name });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Erro ao salvar perfil' });
  }
});

export default router;
