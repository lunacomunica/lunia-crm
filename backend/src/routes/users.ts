import { Router } from 'express';
import db from '../db.js';
import bcrypt from 'bcryptjs';

const router = Router();

router.get('/', (req, res) => {
  const users = db.prepare(`
    SELECT u.id, u.name, u.email, u.role, u.job_title, u.agency_client_id, u.created_at,
      ac.name as agency_client_name
    FROM users u
    LEFT JOIN agency_clients ac ON u.agency_client_id = ac.id
    WHERE u.tenant_id = ?
  `).all(req.user.tenant_id);
  res.json(users);
});

router.post('/', (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'superadmin') return res.status(403).json({ error: 'Apenas admins podem criar usuários' });
  const { name, email, password, role = 'user', agency_client_id, job_title } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
  if (role === 'client' && !agency_client_id) return res.status(400).json({ error: 'Selecione o cliente para este acesso' });
  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (exists) return res.status(400).json({ error: 'E-mail já cadastrado' });
  const hash = bcrypt.hashSync(password, 10);
  const r = db.prepare('INSERT INTO users (tenant_id, name, email, password_hash, role, agency_client_id, job_title) VALUES (?, ?, ?, ?, ?, ?, ?)').run(req.user.tenant_id, name, email, hash, role, agency_client_id || null, job_title || null);
  res.json({ id: r.lastInsertRowid, name, email, role, agency_client_id: agency_client_id || null, job_title: job_title || null });
});

router.put('/:id', (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'superadmin') return res.status(403).json({ error: 'Apenas admins podem editar usuários' });
  const { name, email, role, password, agency_client_id, job_title } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE id = ? AND tenant_id = ?').get(req.params.id, req.user.tenant_id) as any;
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
  const newName = name || user.name;
  const newEmail = email || user.email;
  const newRole = role || user.role;
  const newHash = password ? bcrypt.hashSync(password, 10) : user.password_hash;
  const newClientId = agency_client_id !== undefined ? (agency_client_id || null) : user.agency_client_id;
  const newJobTitle = job_title !== undefined ? (job_title || null) : user.job_title;
  db.prepare('UPDATE users SET name=?, email=?, role=?, password_hash=?, agency_client_id=?, job_title=? WHERE id=? AND tenant_id=?').run(newName, newEmail, newRole, newHash, newClientId, newJobTitle, req.params.id, req.user.tenant_id);
  res.json({ id: req.params.id, name: newName, email: newEmail, role: newRole, agency_client_id: newClientId, job_title: newJobTitle });
});

router.delete('/:id', (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'superadmin') return res.status(403).json({ error: 'Apenas admins podem remover usuários' });
  if (Number(req.params.id) === req.user.id) return res.status(400).json({ error: 'Você não pode remover sua própria conta' });
  db.prepare('DELETE FROM users WHERE id = ? AND tenant_id = ?').run(req.params.id, req.user.tenant_id);
  res.json({ ok: true });
});

export default router;
