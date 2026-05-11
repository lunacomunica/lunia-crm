import { Router } from 'express';
import db from '../db.js';

const router = Router();

const DEFAULT_CATEGORIES = [
  { label: 'Retrabalho — Copy',               color: '#f87171', is_rework: 1, sort_order: 1 },
  { label: 'Retrabalho — Design',             color: '#fb923c', is_rework: 1, sort_order: 2 },
  { label: 'Retrabalho — Edição',             color: '#facc15', is_rework: 1, sort_order: 3 },
  { label: 'Retrabalho — Revisão',            color: '#a78bfa', is_rework: 1, sort_order: 4 },
  { label: 'Retrabalho — Briefing incompleto',color: '#f59e0b', is_rework: 1, sort_order: 5 },
  { label: 'Retrabalho — Pedido do cliente',  color: '#60a5fa', is_rework: 1, sort_order: 6 },
];

function ensureDefaults(tenantId: number) {
  const count = (db.prepare('SELECT COUNT(*) as n FROM task_categories WHERE tenant_id = ?').get(tenantId) as any).n;
  if (count === 0) {
    const ins = db.prepare('INSERT INTO task_categories (tenant_id, label, color, is_rework, sort_order) VALUES (?, ?, ?, ?, ?)');
    for (const c of DEFAULT_CATEGORIES) ins.run(tenantId, c.label, c.color, c.is_rework, c.sort_order);
  }
}

router.get('/', (req, res) => {
  const tid = req.user.tenant_id;
  ensureDefaults(tid);
  const rows = db.prepare('SELECT * FROM task_categories WHERE tenant_id = ? ORDER BY sort_order, id').all(tid);
  res.json(rows);
});

router.post('/', (req, res) => {
  const { label, color, is_rework, sort_order } = req.body;
  if (!label?.trim()) return res.status(400).json({ error: 'Label obrigatório' });
  const maxOrder = (db.prepare('SELECT MAX(sort_order) as m FROM task_categories WHERE tenant_id = ?').get(req.user.tenant_id) as any)?.m ?? 0;
  const r = db.prepare(
    'INSERT INTO task_categories (tenant_id, label, color, is_rework, sort_order) VALUES (?, ?, ?, ?, ?)'
  ).run(req.user.tenant_id, label.trim(), color || '#94a3b8', is_rework ? 1 : 0, sort_order ?? maxOrder + 1);
  res.status(201).json(db.prepare('SELECT * FROM task_categories WHERE id = ?').get(r.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const { label, color, is_rework, sort_order } = req.body;
  const existing = db.prepare('SELECT * FROM task_categories WHERE id = ? AND tenant_id = ?').get(Number(req.params.id), req.user.tenant_id) as any;
  if (!existing) return res.status(404).json({ error: 'Categoria não encontrada' });
  db.prepare('UPDATE task_categories SET label=?, color=?, is_rework=?, sort_order=? WHERE id=?').run(
    label?.trim() ?? existing.label,
    color ?? existing.color,
    is_rework !== undefined ? (is_rework ? 1 : 0) : existing.is_rework,
    sort_order ?? existing.sort_order,
    Number(req.params.id)
  );
  res.json(db.prepare('SELECT * FROM task_categories WHERE id = ?').get(Number(req.params.id)));
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM task_categories WHERE id = ? AND tenant_id = ?').run(Number(req.params.id), req.user.tenant_id);
  res.json({ ok: true });
});

export default router;
