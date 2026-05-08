import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware, (req, res, next) => {
  if (req.user.role !== 'owner') return res.status(403).json({ error: 'Acesso negado' });
  next();
});

router.get('/tenants', (_req, res) => {
  const tenants = db.prepare(`
    SELECT
      t.*,
      (SELECT COUNT(*) FROM users WHERE tenant_id = t.id) as user_count,
      (SELECT COUNT(*) FROM contacts WHERE tenant_id = t.id) as contact_count,
      (SELECT name  FROM users WHERE tenant_id = t.id AND role = 'owner' ORDER BY id LIMIT 1) as admin_name,
      (SELECT email FROM users WHERE tenant_id = t.id AND role = 'owner' ORDER BY id LIMIT 1) as admin_email
    FROM tenants t
    ORDER BY t.created_at DESC
  `).all();
  res.json(tenants);
});

router.post('/tenants', (req, res) => {
  const { name, admin_name, admin_email, admin_password } = req.body as Record<string, string>;

  if (!name || !admin_name || !admin_email || !admin_password) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
  }

  const slug = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  if (db.prepare('SELECT id FROM tenants WHERE slug = ?').get(slug)) {
    return res.status(400).json({ error: 'Já existe um workspace com esse nome' });
  }
  if (db.prepare('SELECT id FROM users WHERE email = ?').get(admin_email)) {
    return res.status(400).json({ error: 'Email já está em uso' });
  }

  const passwordHash = bcrypt.hashSync(admin_password, 10);

  const result = db.transaction(() => {
    const { lastInsertRowid: tenantId } = db.prepare('INSERT INTO tenants (name, slug) VALUES (?, ?)').run(name, slug);
    db.prepare('INSERT INTO users (tenant_id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)').run(tenantId, admin_name, admin_email, passwordHash, 'owner');
    return db.prepare(`
      SELECT t.*,
        (SELECT COUNT(*) FROM users WHERE tenant_id = t.id) as user_count,
        (SELECT COUNT(*) FROM contacts WHERE tenant_id = t.id) as contact_count,
        (SELECT name  FROM users WHERE tenant_id = t.id AND role = 'owner' ORDER BY id LIMIT 1) as admin_name,
        (SELECT email FROM users WHERE tenant_id = t.id AND role = 'owner' ORDER BY id LIMIT 1) as admin_email
      FROM tenants t WHERE t.id = ?
    `).get(tenantId);
  })();

  res.status(201).json(result);
});

router.delete('/tenants/:id', (req, res) => {
  const id = Number(req.params.id);
  if (id === 1) return res.status(400).json({ error: 'Não é possível excluir o workspace principal' });
  db.prepare('DELETE FROM tenants WHERE id = ?').run(id);
  res.json({ ok: true });
});

// Limpa todos os dados do tenant 1, mantendo apenas o superadmin
router.post('/reset-tenant', (req, res) => {
  const tid = req.user.tenant_id;
  db.transaction(() => {
    db.prepare('DELETE FROM task_sessions WHERE task_id IN (SELECT id FROM tasks WHERE tenant_id = ?)').run(tid);
    db.prepare('DELETE FROM tasks WHERE tenant_id = ?').run(tid);
    db.prepare('DELETE FROM campaign_creatives WHERE campaign_id IN (SELECT id FROM campaigns WHERE tenant_id = ?)').run(tid);
    db.prepare('DELETE FROM campaigns WHERE tenant_id = ?').run(tid);
    db.prepare('DELETE FROM content_pieces WHERE tenant_id = ?').run(tid);
    db.prepare('DELETE FROM feed_batches WHERE tenant_id = ?').run(tid);
    db.prepare('DELETE FROM agency_clients WHERE tenant_id = ?').run(tid);
    db.prepare('DELETE FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE tenant_id = ?)').run(tid);
    db.prepare('DELETE FROM conversations WHERE tenant_id = ?').run(tid);
    db.prepare('DELETE FROM activities WHERE tenant_id = ?').run(tid);
    db.prepare('DELETE FROM instagram_leads WHERE tenant_id = ?').run(tid);
    db.prepare('DELETE FROM deals WHERE tenant_id = ?').run(tid);
    db.prepare('DELETE FROM contacts WHERE tenant_id = ?').run(tid);
    db.prepare("DELETE FROM users WHERE tenant_id = ? AND role != 'owner'").run(tid);
  })();
  res.json({ ok: true });
});

export default router;
