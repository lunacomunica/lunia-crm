import { Router } from 'express';
import db from '../db.js';

const router = Router();

const STAGES = ['novo', 'contato', 'proposta', 'negociacao', 'fechado', 'perdido'];

/* ── Dashboard ────────────────────────────────────────────────────────────── */
router.get('/:clientId/dashboard', (req, res) => {
  const cid = Number(req.params.clientId);

  const contacts = db.prepare(`
    SELECT
      COUNT(*) as total,
      COUNT(CASE WHEN stage = 'novo' THEN 1 END) as novos,
      COUNT(CASE WHEN stage = 'fechado' THEN 1 END) as fechados,
      COUNT(CASE WHEN stage = 'perdido' THEN 1 END) as perdidos,
      COUNT(CASE WHEN stage NOT IN ('fechado','perdido') THEN 1 END) as ativos,
      COUNT(CASE WHEN source != 'manual' THEN 1 END) as from_marketing
    FROM client_contacts WHERE agency_client_id = ?
  `).get(cid) as any;

  const deals = db.prepare(`
    SELECT
      COUNT(*) as total,
      COALESCE(SUM(value), 0) as pipeline_total,
      COALESCE(SUM(CASE WHEN stage = 'fechado' THEN value ELSE 0 END), 0) as won,
      COALESCE(SUM(CASE WHEN stage NOT IN ('fechado','perdido') THEN value * probability / 100.0 ELSE 0 END), 0) as forecast,
      COUNT(CASE WHEN stage = 'fechado' THEN 1 END) as won_count,
      COUNT(CASE WHEN stage = 'perdido' THEN 1 END) as lost_count
    FROM client_deals WHERE agency_client_id = ?
  `).get(cid) as any;

  const byStage = STAGES.map(stage => {
    const row = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(value),0) as value
      FROM client_deals WHERE agency_client_id = ? AND stage = ?
    `).get(cid, stage) as any;
    return { stage, count: row.count, value: row.value };
  });

  const convRate = (contacts.total - contacts.novos) > 0
    ? (contacts.fechados / contacts.total) * 100 : 0;

  res.json({ contacts, deals, byStage, convRate });
});

/* ── Contacts ─────────────────────────────────────────────────────────────── */
router.get('/:clientId/contacts', (req, res) => {
  const { stage } = req.query as Record<string, string>;
  let q = `SELECT cc.*, c.name as campaign_name FROM client_contacts cc
    LEFT JOIN campaigns c ON c.id = cc.campaign_id
    WHERE cc.agency_client_id = ?`;
  const params: any[] = [Number(req.params.clientId)];
  if (stage) { q += ' AND cc.stage = ?'; params.push(stage); }
  q += ' ORDER BY cc.created_at DESC';
  res.json(db.prepare(q).all(...params));
});

router.post('/:clientId/contacts', (req, res) => {
  const cid = Number(req.params.clientId);
  const { name, email, phone, source, campaign_id, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'Nome obrigatório' });
  const r = db.prepare(`
    INSERT INTO client_contacts (agency_client_id, name, email, phone, source, campaign_id, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(cid, name, email || null, phone || null, source || 'manual', campaign_id || null, notes || null);
  res.status(201).json(db.prepare('SELECT * FROM client_contacts WHERE id = ?').get(r.lastInsertRowid));
});

router.put('/:clientId/contacts/:id', (req, res) => {
  const { name, email, phone, source, stage, notes } = req.body;
  db.prepare(`UPDATE client_contacts SET name=?, email=?, phone=?, source=?, stage=?, notes=?, updated_at=datetime('now') WHERE id=? AND agency_client_id=?`)
    .run(name, email || null, phone || null, source || 'manual', stage || 'novo', notes || null, Number(req.params.id), Number(req.params.clientId));
  res.json(db.prepare('SELECT * FROM client_contacts WHERE id = ?').get(Number(req.params.id)));
});

router.delete('/:clientId/contacts/:id', (req, res) => {
  db.prepare('DELETE FROM client_contacts WHERE id = ? AND agency_client_id = ?').run(Number(req.params.id), Number(req.params.clientId));
  res.json({ ok: true });
});

/* ── Deals ────────────────────────────────────────────────────────────────── */
router.get('/:clientId/deals', (req, res) => {
  const deals = db.prepare(`
    SELECT d.*, cc.name as contact_name, cc.phone as contact_phone
    FROM client_deals d
    LEFT JOIN client_contacts cc ON cc.id = d.client_contact_id
    WHERE d.agency_client_id = ?
    ORDER BY CASE d.stage WHEN 'fechado' THEN 6 WHEN 'perdido' THEN 7 ELSE 0 END, d.value DESC
  `).all(Number(req.params.clientId));
  res.json(deals);
});

router.post('/:clientId/deals', (req, res) => {
  const cid = Number(req.params.clientId);
  const { title, value, stage, probability, expected_close_date, notes, client_contact_id } = req.body;
  if (!title) return res.status(400).json({ error: 'Título obrigatório' });
  const r = db.prepare(`
    INSERT INTO client_deals (agency_client_id, client_contact_id, title, value, stage, probability, expected_close_date, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(cid, client_contact_id || null, title, value || 0, stage || 'novo', probability || 20, expected_close_date || null, notes || null);
  res.status(201).json(db.prepare(`
    SELECT d.*, cc.name as contact_name FROM client_deals d
    LEFT JOIN client_contacts cc ON cc.id = d.client_contact_id WHERE d.id = ?
  `).get(r.lastInsertRowid));
});

router.put('/:clientId/deals/:id', (req, res) => {
  const { title, value, stage, probability, expected_close_date, notes, client_contact_id } = req.body;
  db.prepare(`UPDATE client_deals SET title=?, value=?, stage=?, probability=?, expected_close_date=?, notes=?, client_contact_id=?, updated_at=datetime('now') WHERE id=? AND agency_client_id=?`)
    .run(title, value || 0, stage || 'novo', probability || 20, expected_close_date || null, notes || null, client_contact_id || null, Number(req.params.id), Number(req.params.clientId));
  res.json(db.prepare(`
    SELECT d.*, cc.name as contact_name FROM client_deals d
    LEFT JOIN client_contacts cc ON cc.id = d.client_contact_id WHERE d.id = ?
  `).get(Number(req.params.id)));
});

router.delete('/:clientId/deals/:id', (req, res) => {
  db.prepare('DELETE FROM client_deals WHERE id = ? AND agency_client_id = ?').run(Number(req.params.id), Number(req.params.clientId));
  res.json({ ok: true });
});

export default router;
