import { Router } from 'express';
import db from '../db.js';

const router = Router();

// List ideas for a client
router.get('/', (req: any, res) => {
  const { client_id } = req.query;
  if (!client_id) return res.status(400).json({ error: 'client_id required' });
  const rows = db.prepare(
    'SELECT * FROM content_ideas WHERE tenant_id=? AND agency_client_id=? ORDER BY created_at DESC'
  ).all(req.user.tenant_id, Number(client_id));
  res.json(rows);
});

// Submit a new idea (client or agency)
router.post('/', (req: any, res) => {
  const { agency_client_id, title, description, reference_url } = req.body;
  if (!agency_client_id || !title?.trim()) return res.status(400).json({ error: 'agency_client_id e title obrigatórios' });
  const r = db.prepare(
    `INSERT INTO content_ideas (tenant_id, agency_client_id, title, description, reference_url, status)
     VALUES (?, ?, ?, ?, ?, 'nova')`
  ).run(req.user.tenant_id, agency_client_id, title.trim(), description || '', reference_url || '');
  res.json(db.prepare('SELECT * FROM content_ideas WHERE id=?').get(r.lastInsertRowid));
});

// Update status (agency only)
router.patch('/:id/status', (req: any, res) => {
  const { status } = req.body;
  db.prepare('UPDATE content_ideas SET status=? WHERE id=? AND tenant_id=?')
    .run(status, Number(req.params.id), req.user.tenant_id);
  res.json(db.prepare('SELECT * FROM content_ideas WHERE id=?').get(Number(req.params.id)));
});

// Delete idea
router.delete('/:id', (req: any, res) => {
  db.prepare('DELETE FROM content_ideas WHERE id=? AND tenant_id=?').run(Number(req.params.id), req.user.tenant_id);
  res.json({ ok: true });
});

export default router;
