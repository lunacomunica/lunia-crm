import { Router } from 'express';
import db from '../db.js';

const router = Router();

router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM workflow_templates WHERE tenant_id = ? ORDER BY created_at ASC').all(req.user.tenant_id));
});

router.post('/', (req, res) => {
  const { name, stages } = req.body;
  if (!name) return res.status(400).json({ error: 'Nome obrigatório' });
  const r = db.prepare('INSERT INTO workflow_templates (tenant_id, name, stages) VALUES (?, ?, ?)').run(req.user.tenant_id, name, JSON.stringify(stages || []));
  res.status(201).json(db.prepare('SELECT * FROM workflow_templates WHERE id = ?').get(r.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const { name, stages } = req.body;
  db.prepare('UPDATE workflow_templates SET name = ?, stages = ? WHERE id = ? AND tenant_id = ?').run(name, JSON.stringify(stages || []), req.params.id, req.user.tenant_id);
  res.json(db.prepare('SELECT * FROM workflow_templates WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM workflow_templates WHERE id = ? AND tenant_id = ?').run(req.params.id, req.user.tenant_id);
  res.json({ ok: true });
});

export default router;
