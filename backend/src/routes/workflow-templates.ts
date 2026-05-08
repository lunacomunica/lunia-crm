import { Router } from 'express';
import db from '../db.js';

const router = Router();

const parse = (row: any) => ({ ...row, stages: JSON.parse(row.stages || '[]') });

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM workflow_templates WHERE tenant_id = ? ORDER BY created_at ASC').all(req.user.tenant_id) as any[];
  res.json(rows.map(parse));
});

router.post('/', (req, res) => {
  const { name, stages } = req.body;
  if (!name) return res.status(400).json({ error: 'Nome obrigatório' });
  const r = db.prepare('INSERT INTO workflow_templates (tenant_id, name, stages) VALUES (?, ?, ?)').run(req.user.tenant_id, name, JSON.stringify(stages || []));
  res.status(201).json(parse(db.prepare('SELECT * FROM workflow_templates WHERE id = ?').get(r.lastInsertRowid) as any));
});

router.put('/:id', (req, res) => {
  const { name, stages } = req.body;
  db.prepare('UPDATE workflow_templates SET name = ?, stages = ? WHERE id = ? AND tenant_id = ?').run(name, JSON.stringify(stages || []), req.params.id, req.user.tenant_id);
  res.json(parse(db.prepare('SELECT * FROM workflow_templates WHERE id = ?').get(req.params.id) as any));
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM workflow_templates WHERE id = ? AND tenant_id = ?').run(req.params.id, req.user.tenant_id);
  res.json({ ok: true });
});

export default router;
