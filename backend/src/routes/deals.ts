import { Router } from 'express';
import db from '../db.js';

const router = Router();

router.get('/', (req, res) => {
  const tid = req.user.tenant_id;
  const { stage } = req.query as Record<string, string>;

  let query = `
    SELECT d.*, c.name as contact_name, c.email as contact_email, c.phone as contact_phone
    FROM deals d LEFT JOIN contacts c ON d.contact_id = c.id WHERE d.tenant_id = ?
  `;
  const params: any[] = [tid];

  if (stage && stage !== 'all') { query += ' AND d.stage = ?'; params.push(stage); }
  query += ' ORDER BY d.updated_at DESC';

  res.json(db.prepare(query).all(...params));
});

router.get('/:id', (req, res) => {
  const deal = db.prepare(`
    SELECT d.*, c.name as contact_name FROM deals d
    LEFT JOIN contacts c ON d.contact_id = c.id WHERE d.id = ? AND d.tenant_id = ?
  `).get(req.params.id, req.user.tenant_id);
  if (!deal) return res.status(404).json({ error: 'Deal não encontrado' });
  res.json(deal);
});

router.post('/', (req, res) => {
  const tid = req.user.tenant_id;
  const { contact_id, title, value = 0, stage = 'prospecting', probability = 20, expected_close_date, notes = '' } = req.body;
  const result = db.prepare(`
    INSERT INTO deals (tenant_id, contact_id, title, value, stage, probability, expected_close_date, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(tid, contact_id, title, value, stage, probability, expected_close_date || null, notes);

  db.prepare('INSERT INTO activities (tenant_id, contact_id, deal_id, type, description) VALUES (?, ?, ?, ?, ?)').run(
    tid, contact_id, result.lastInsertRowid, 'note', `Deal criado: ${title}`
  );

  res.status(201).json(db.prepare(`
    SELECT d.*, c.name as contact_name FROM deals d
    LEFT JOIN contacts c ON d.contact_id = c.id WHERE d.id = ?
  `).get(result.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const tid = req.user.tenant_id;
  const { contact_id, title, value, stage, probability, expected_close_date, notes } = req.body;
  const existing = db.prepare('SELECT stage, contact_id FROM deals WHERE id = ? AND tenant_id = ?').get(req.params.id, tid) as any;
  if (!existing) return res.status(404).json({ error: 'Deal não encontrado' });

  db.prepare(`
    UPDATE deals SET contact_id=?, title=?, value=?, stage=?, probability=?, expected_close_date=?, notes=?, updated_at=datetime('now')
    WHERE id=? AND tenant_id=?
  `).run(contact_id, title, value, stage, probability, expected_close_date || null, notes, req.params.id, tid);

  if (existing.stage !== stage) {
    db.prepare('INSERT INTO activities (tenant_id, contact_id, deal_id, type, description) VALUES (?, ?, ?, ?, ?)').run(
      tid, existing.contact_id, req.params.id, 'stage_change', `Deal movido para ${stage}`
    );
  }

  res.json(db.prepare(`
    SELECT d.*, c.name as contact_name FROM deals d
    LEFT JOIN contacts c ON d.contact_id = c.id WHERE d.id = ?
  `).get(req.params.id));
});

router.patch('/:id/stage', (req, res) => {
  const tid = req.user.tenant_id;
  const { stage } = req.body;
  const existing = db.prepare('SELECT * FROM deals WHERE id = ? AND tenant_id = ?').get(req.params.id, tid) as any;
  if (!existing) return res.status(404).json({ error: 'Deal não encontrado' });

  db.prepare("UPDATE deals SET stage=?, updated_at=datetime('now') WHERE id=? AND tenant_id=?").run(stage, req.params.id, tid);
  db.prepare('INSERT INTO activities (tenant_id, contact_id, deal_id, type, description) VALUES (?, ?, ?, ?, ?)').run(
    tid, existing.contact_id, req.params.id, 'stage_change', `Deal movido para ${stage}`
  );

  res.json({ success: true, stage });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM deals WHERE id = ? AND tenant_id = ?').run(req.params.id, req.user.tenant_id);
  res.json({ success: true });
});

export default router;
