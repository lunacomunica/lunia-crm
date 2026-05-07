import { Router } from 'express';
import db from '../db.js';

const router = Router();

router.get('/', (req, res) => {
  const tid = req.user.tenant_id;
  const { search, source, status, limit = '100', offset = '0' } = req.query as Record<string, string>;

  let query = `SELECT c.*, r.name as referred_by_name FROM contacts c LEFT JOIN contacts r ON c.referred_by_id = r.id WHERE c.tenant_id = ?`;
  const params: any[] = [tid];

  if (search) {
    query += ' AND (c.name LIKE ? OR c.email LIKE ? OR c.phone LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s, s);
  }
  if (source && source !== 'all') { query += ' AND c.source = ?'; params.push(source); }
  if (status && status !== 'all') { query += ' AND c.status = ?'; params.push(status); }

  query += ' ORDER BY c.created_at DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), Number(offset));

  const contacts = db.prepare(query).all(...params);
  const total = (db.prepare('SELECT COUNT(*) as count FROM contacts WHERE tenant_id = ?').get(tid) as any).count;

  res.json({ contacts, total });
});

router.get('/:id', (req, res) => {
  const contact = db.prepare('SELECT * FROM contacts WHERE id = ? AND tenant_id = ?').get(req.params.id, req.user.tenant_id);
  if (!contact) return res.status(404).json({ error: 'Contato não encontrado' });
  res.json(contact);
});

router.post('/', (req, res) => {
  const tid = req.user.tenant_id;
  const { name, email, phone, source = 'manual', status = 'lead', tags = '[]', notes = '', external_id, referred_by_id } = req.body;
  const result = db.prepare(`
    INSERT INTO contacts (tenant_id, name, email, phone, source, status, tags, notes, external_id, referred_by_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(tid, name, email, phone, source, status, tags, notes, external_id || null, referred_by_id || null);

  db.prepare('INSERT INTO activities (tenant_id, contact_id, type, description) VALUES (?, ?, ?, ?)').run(
    tid, result.lastInsertRowid, 'note', `Contato criado via ${source}`
  );

  res.status(201).json(db.prepare('SELECT * FROM contacts WHERE id = ?').get(result.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const { name, email, phone, source, status, tags, notes, referred_by_id } = req.body;
  db.prepare(`
    UPDATE contacts SET name=?, email=?, phone=?, source=?, status=?, tags=?, notes=?, referred_by_id=?, updated_at=datetime('now')
    WHERE id=? AND tenant_id=?
  `).run(name, email, phone, source, status, tags, notes, referred_by_id || null, req.params.id, req.user.tenant_id);

  res.json(db.prepare('SELECT * FROM contacts WHERE id = ?').get(req.params.id));
});

router.delete('/bulk', (req, res) => {
  const { ids } = req.body as { ids: number[] };
  if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'ids required' });
  const placeholders = ids.map(() => '?').join(',');
  db.prepare(`DELETE FROM contacts WHERE tenant_id = ? AND id IN (${placeholders})`).run(req.user.tenant_id, ...ids);
  res.json({ deleted: ids.length });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM contacts WHERE id = ? AND tenant_id = ?').run(req.params.id, req.user.tenant_id);
  res.json({ success: true });
});

export default router;
