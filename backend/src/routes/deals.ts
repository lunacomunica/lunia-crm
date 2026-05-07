import { Router } from 'express';
import db from '../db.js';

const router = Router();

router.get('/', (req, res) => {
  const { stage } = req.query as Record<string, string>;

  let query = `
    SELECT d.*, c.name as contact_name, c.email as contact_email, c.phone as contact_phone
    FROM deals d LEFT JOIN contacts c ON d.contact_id = c.id WHERE 1=1
  `;
  const params: any[] = [];

  if (stage && stage !== 'all') { query += ' AND d.stage = ?'; params.push(stage); }
  query += ' ORDER BY d.updated_at DESC';

  res.json(db.prepare(query).all(...params));
});

router.get('/:id', (req, res) => {
  const deal = db.prepare(`
    SELECT d.*, c.name as contact_name FROM deals d
    LEFT JOIN contacts c ON d.contact_id = c.id WHERE d.id = ?
  `).get(req.params.id);
  if (!deal) return res.status(404).json({ error: 'Deal não encontrado' });
  res.json(deal);
});

router.post('/', (req, res) => {
  const { contact_id, title, value = 0, stage = 'prospecting', probability = 20, expected_close_date, notes = '' } = req.body;
  const result = db.prepare(`
    INSERT INTO deals (contact_id, title, value, stage, probability, expected_close_date, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(contact_id, title, value, stage, probability, expected_close_date || null, notes);

  db.prepare('INSERT INTO activities (contact_id, deal_id, type, description) VALUES (?, ?, ?, ?)').run(
    contact_id, result.lastInsertRowid, 'note', `Deal criado: ${title}`
  );

  res.status(201).json(db.prepare(`
    SELECT d.*, c.name as contact_name FROM deals d
    LEFT JOIN contacts c ON d.contact_id = c.id WHERE d.id = ?
  `).get(result.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const { contact_id, title, value, stage, probability, expected_close_date, notes } = req.body;
  const existing = db.prepare('SELECT stage, contact_id FROM deals WHERE id = ?').get(req.params.id) as any;

  db.prepare(`
    UPDATE deals SET contact_id=?, title=?, value=?, stage=?, probability=?, expected_close_date=?, notes=?, updated_at=datetime('now') WHERE id=?
  `).run(contact_id, title, value, stage, probability, expected_close_date || null, notes, req.params.id);

  if (existing?.stage !== stage) {
    db.prepare('INSERT INTO activities (contact_id, deal_id, type, description) VALUES (?, ?, ?, ?)').run(
      existing?.contact_id, req.params.id, 'stage_change', `Deal movido para ${stage}`
    );
  }

  res.json(db.prepare(`
    SELECT d.*, c.name as contact_name FROM deals d
    LEFT JOIN contacts c ON d.contact_id = c.id WHERE d.id = ?
  `).get(req.params.id));
});

router.patch('/:id/stage', (req, res) => {
  const { stage } = req.body;
  const existing = db.prepare('SELECT * FROM deals WHERE id = ?').get(req.params.id) as any;
  if (!existing) return res.status(404).json({ error: 'Deal não encontrado' });

  db.prepare("UPDATE deals SET stage=?, updated_at=datetime('now') WHERE id=?").run(stage, req.params.id);
  db.prepare('INSERT INTO activities (contact_id, deal_id, type, description) VALUES (?, ?, ?, ?)').run(
    existing.contact_id, req.params.id, 'stage_change', `Deal movido para ${stage}`
  );

  res.json({ success: true, stage });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM deals WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

export default router;
