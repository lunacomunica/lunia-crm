import { Router } from 'express';
import db from '../db.js';

const router = Router();

router.get('/', (req: any, res) => {
  const { client_id } = req.query;
  if (!client_id) return res.status(400).json({ error: 'client_id required' });
  const rows = db.prepare(
    'SELECT * FROM client_projects WHERE tenant_id=? AND agency_client_id=? ORDER BY created_at DESC'
  ).all(req.user.tenant_id, Number(client_id));
  res.json(rows);
});

router.post('/', (req: any, res) => {
  const { agency_client_id, title, description, status, due_date } = req.body;
  if (!agency_client_id || !title?.trim()) return res.status(400).json({ error: 'agency_client_id e title obrigatórios' });
  const r = db.prepare(
    `INSERT INTO client_projects (tenant_id, agency_client_id, title, description, status, due_date)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(req.user.tenant_id, agency_client_id, title.trim(), description || '', status || 'pendente', due_date || null);
  res.json(db.prepare('SELECT * FROM client_projects WHERE id=?').get(r.lastInsertRowid));
});

router.put('/:id', (req: any, res) => {
  const { title, description, status, due_date } = req.body;
  db.prepare(
    `UPDATE client_projects SET title=?, description=?, status=?, due_date=? WHERE id=? AND tenant_id=?`
  ).run(title, description || '', status, due_date || null, Number(req.params.id), req.user.tenant_id);
  res.json(db.prepare('SELECT * FROM client_projects WHERE id=?').get(Number(req.params.id)));
});

router.delete('/:id', (req: any, res) => {
  db.prepare('DELETE FROM client_projects WHERE id=? AND tenant_id=?').run(Number(req.params.id), req.user.tenant_id);
  res.json({ ok: true });
});

export default router;
