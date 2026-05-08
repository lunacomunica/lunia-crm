import { Router } from 'express';
import db from '../db.js';

const router = Router();

/* ── Summary (flywheel data) ──────────────────────────────────────────────── */
router.get('/:clientId/summary', (req, res) => {
  const cid = Number(req.params.clientId);

  const posts = db.prepare(`
    SELECT
      COUNT(*) as total,
      COUNT(CASE WHEN status = 'publicado' THEN 1 END) as published,
      COUNT(CASE WHEN status IN ('publicado','agendado') AND strftime('%Y-%m', COALESCE(scheduled_date, created_at)) = strftime('%Y-%m', 'now') THEN 1 END) as published_month,
      COUNT(CASE WHEN status = 'aguardando_aprovacao' THEN 1 END) as pending_approval,
      COUNT(CASE WHEN status = 'ajuste_solicitado' THEN 1 END) as needs_adjustment
    FROM content_pieces WHERE agency_client_id = ?
  `).get(cid) as any;

  const campaigns = db.prepare(`
    SELECT
      COUNT(*) as total,
      COUNT(CASE WHEN status = 'ativa' THEN 1 END) as active,
      COALESCE(SUM(impressions), 0) as reach,
      COALESCE(SUM(clicks), 0) as clicks,
      COALESCE(SUM(conversions), 0) as leads,
      COALESCE(SUM(spent), 0) as spent,
      COALESCE(SUM(revenue), 0) as revenue
    FROM campaigns WHERE agency_client_id = ?
  `).get(cid) as any;

  const roas = campaigns.spent > 0 ? (campaigns.revenue / campaigns.spent) : 0;
  const cpl = campaigns.leads > 0 ? (campaigns.spent / campaigns.leads) : 0;

  res.json({ posts, campaigns, roas, cpl });
});

/* ── Goals ────────────────────────────────────────────────────────────────── */
router.get('/:clientId/goals', (req, res) => {
  const goals = db.prepare('SELECT * FROM client_goals WHERE agency_client_id = ? ORDER BY id').all(Number(req.params.clientId));
  res.json(goals);
});

router.put('/:clientId/goals', (req, res) => {
  const cid = Number(req.params.clientId);
  const { goals } = req.body as { goals: { metric: string; label: string; target: number; unit: string; icon: string }[] };
  if (!Array.isArray(goals)) return res.status(400).json({ error: 'goals must be an array' });

  db.prepare('DELETE FROM client_goals WHERE agency_client_id = ?').run(cid);
  const ins = db.prepare('INSERT INTO client_goals (agency_client_id, metric, label, target, unit, icon) VALUES (?, ?, ?, ?, ?, ?)');
  for (const g of goals) ins.run(cid, g.metric, g.label, g.target, g.unit || '', g.icon || 'target');

  res.json(db.prepare('SELECT * FROM client_goals WHERE agency_client_id = ? ORDER BY id').all(cid));
});

/* ── Positioning ──────────────────────────────────────────────────────────── */
router.get('/:clientId/positioning', (req, res) => {
  const row = db.prepare('SELECT * FROM client_positioning WHERE agency_client_id = ?').get(Number(req.params.clientId)) as any;
  if (!row) return res.json({ agency_client_id: Number(req.params.clientId), icp: '', promise: '', differentials: '[]', cases: '[]', mission: '' });
  res.json(row);
});

router.put('/:clientId/positioning', (req, res) => {
  const cid = Number(req.params.clientId);
  const { icp, promise, differentials, cases, mission } = req.body;
  db.prepare(`
    INSERT INTO client_positioning (agency_client_id, icp, promise, differentials, cases, mission)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(agency_client_id) DO UPDATE SET
      icp = excluded.icp, promise = excluded.promise,
      differentials = excluded.differentials, cases = excluded.cases,
      mission = excluded.mission, updated_at = datetime('now')
  `).run(cid, icp || '', promise || '', JSON.stringify(differentials || []), JSON.stringify(cases || []), mission || '');
  res.json(db.prepare('SELECT * FROM client_positioning WHERE agency_client_id = ?').get(cid));
});

export default router;
