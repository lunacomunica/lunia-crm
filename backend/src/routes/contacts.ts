import { Router } from 'express';
import db from '../db.js';

const router = Router();

router.get('/', (req, res) => {
  const { search, source, status, limit = '100', offset = '0' } = req.query as Record<string, string>;

  let query = 'SELECT * FROM contacts WHERE 1=1';
  const params: any[] = [];

  if (search) {
    query += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s, s);
  }
  if (source && source !== 'all') { query += ' AND source = ?'; params.push(source); }
  if (status && status !== 'all') { query += ' AND status = ?'; params.push(status); }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), Number(offset));

  const contacts = db.prepare(query).all(...params);
  const total = (db.prepare('SELECT COUNT(*) as count FROM contacts').get() as any).count;

  res.json({ contacts, total });
});

router.get('/:id', (req, res) => {
  const contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(req.params.id);
  if (!contact) return res.status(404).json({ error: 'Contato não encontrado' });
  res.json(contact);
});

router.post('/', (req, res) => {
  const { name, email, phone, source = 'manual', status = 'lead', tags = '[]', notes = '', external_id } = req.body;
  const result = db.prepare(`
    INSERT INTO contacts (name, email, phone, source, status, tags, notes, external_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(name, email, phone, source, status, tags, notes, external_id || null);

  db.prepare('INSERT INTO activities (contact_id, type, description) VALUES (?, ?, ?)').run(
    result.lastInsertRowid, 'note', `Contato criado via ${source}`
  );

  res.status(201).json(db.prepare('SELECT * FROM contacts WHERE id = ?').get(result.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const { name, email, phone, source, status, tags, notes } = req.body;
  db.prepare(`
    UPDATE contacts SET name=?, email=?, phone=?, source=?, status=?, tags=?, notes=?, updated_at=datetime('now') WHERE id=?
  `).run(name, email, phone, source, status, tags, notes, req.params.id);

  res.json(db.prepare('SELECT * FROM contacts WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM contacts WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

export default router;
