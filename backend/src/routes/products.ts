import { Router } from 'express';
import db from '../db.js';

const router = Router();

router.get('/', (req, res) => {
  const products = db.prepare('SELECT * FROM products WHERE tenant_id = ? ORDER BY category, name').all(req.user.tenant_id);
  res.json(products);
});

router.post('/', (req, res) => {
  const { name, description = '', price = 0, unit = 'un', category = '', active = 1 } = req.body;
  if (!name) return res.status(400).json({ error: 'Nome é obrigatório' });
  const r = db.prepare(`INSERT INTO products (tenant_id, name, description, price, unit, category, active) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(req.user.tenant_id, name, description, price, unit, category, active ? 1 : 0);
  res.status(201).json(db.prepare('SELECT * FROM products WHERE id = ?').get(r.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const { name, description, price, unit, category, active } = req.body;
  const existing = db.prepare('SELECT * FROM products WHERE id = ? AND tenant_id = ?').get(req.params.id, req.user.tenant_id) as any;
  if (!existing) return res.status(404).json({ error: 'Produto não encontrado' });
  db.prepare(`UPDATE products SET name=?, description=?, price=?, unit=?, category=?, active=?, updated_at=datetime('now') WHERE id=? AND tenant_id=?`).run(
    name ?? existing.name, description ?? existing.description, price ?? existing.price,
    unit ?? existing.unit, category ?? existing.category, active !== undefined ? (active ? 1 : 0) : existing.active,
    req.params.id, req.user.tenant_id
  );
  res.json(db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM products WHERE id = ? AND tenant_id = ?').run(req.params.id, req.user.tenant_id);
  res.json({ ok: true });
});

export default router;
