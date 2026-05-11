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

  const lastApproved = db.prepare(`
    SELECT title, scheduled_date, updated_at FROM content_pieces
    WHERE agency_client_id = ? AND status IN ('aprovado','agendado','publicado')
    ORDER BY updated_at DESC LIMIT 1
  `).get(cid) as any;

  const nextBatch = db.prepare(`
    SELECT fb.name, fb.month, fb.year,
      COUNT(cp.id) as total,
      COUNT(CASE WHEN cp.status = 'aguardando_aprovacao' THEN 1 END) as pending
    FROM feed_batches fb
    LEFT JOIN content_pieces cp ON cp.batch_id = fb.id
    WHERE fb.agency_client_id = ?
      AND (fb.year > strftime('%Y','now') OR (fb.year = CAST(strftime('%Y','now') AS INTEGER) AND fb.month >= CAST(strftime('%m','now') AS INTEGER)))
    GROUP BY fb.id ORDER BY fb.year, fb.month LIMIT 1
  `).get(cid) as any;

  const pendingPieces = db.prepare(`
    SELECT id, title, type, scheduled_date FROM content_pieces
    WHERE agency_client_id = ? AND status = 'aguardando_aprovacao'
    ORDER BY updated_at DESC LIMIT 10
  `).all(cid) as any[];

  const lastAgencyUpdate = db.prepare(`
    SELECT title, status, updated_at FROM content_pieces
    WHERE agency_client_id = ?
    ORDER BY updated_at DESC LIMIT 1
  `).get(cid) as any;

  res.json({ posts, campaigns, roas, cpl, lastApproved, nextBatch, pendingPieces, lastAgencyUpdate });
});

/* ── Goals ────────────────────────────────────────────────────────────────── */
router.get('/:clientId/goals', (req, res) => {
  const goals = db.prepare('SELECT * FROM client_goals WHERE agency_client_id = ? ORDER BY id').all(Number(req.params.clientId));
  res.json(goals);
});

router.put('/:clientId/goals', (req, res) => {
  const cid = Number(req.params.clientId);
  const { goals } = req.body as { goals: { metric: string; label: string; target: number; unit: string; icon: string; current_value?: number }[] };
  if (!Array.isArray(goals)) return res.status(400).json({ error: 'goals must be an array' });

  db.prepare('DELETE FROM client_goals WHERE agency_client_id = ?').run(cid);
  const ins = db.prepare('INSERT INTO client_goals (agency_client_id, metric, label, target, unit, icon, current_value, due_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  for (const g of goals) ins.run(cid, g.metric, g.label, g.target, g.unit || '', g.icon || 'target', g.current_value ?? 0, (g as any).due_date ?? null);

  res.json(db.prepare('SELECT * FROM client_goals WHERE agency_client_id = ? ORDER BY id').all(cid));
});

router.patch('/:clientId/goals/:id/value', (req, res) => {
  const { current_value } = req.body;
  db.prepare("UPDATE client_goals SET current_value = ?, updated_at = datetime('now') WHERE id = ? AND agency_client_id = ?")
    .run(Number(current_value) || 0, req.params.id, req.params.clientId);
  res.json(db.prepare('SELECT * FROM client_goals WHERE id = ?').get(req.params.id));
});

/* ── Positioning ──────────────────────────────────────────────────────────── */
router.get('/:clientId/positioning', (req, res) => {
  const row = db.prepare('SELECT * FROM client_positioning WHERE agency_client_id = ?').get(Number(req.params.clientId)) as any;
  if (!row) return res.json({ agency_client_id: Number(req.params.clientId), icp: '', promise: '', differentials: '[]', cases: '[]', mission: '' });
  res.json(row);
});

router.put('/:clientId/positioning', (req, res) => {
  const cid = Number(req.params.clientId);
  const {
    icp, promise, differentials, cases, mission,
    sobre, historia, promessa_completa, promessa_curta,
    transformacao_narrativa, transformacao_procedencia,
    diferencial_1, diferencial_2, diferencial_3,
    icp_quem_e, icp_quem_nao_e, icp_psicologico,
    crencas_tentou, crencas_nao_acredita,
    desejos_secretos, desejos_aspiracional,
    dores_profundas, dores_travando,
    objecoes_desculpas, objecoes_medos,
  } = req.body;
  db.prepare(`
    INSERT INTO client_positioning (
      agency_client_id, icp, promise, differentials, cases, mission,
      sobre, historia, promessa_completa, promessa_curta,
      transformacao_narrativa, transformacao_procedencia,
      diferencial_1, diferencial_2, diferencial_3,
      icp_quem_e, icp_quem_nao_e, icp_psicologico,
      crencas_tentou, crencas_nao_acredita,
      desejos_secretos, desejos_aspiracional,
      dores_profundas, dores_travando,
      objecoes_desculpas, objecoes_medos
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(agency_client_id) DO UPDATE SET
      icp=excluded.icp, promise=excluded.promise,
      differentials=excluded.differentials, cases=excluded.cases, mission=excluded.mission,
      sobre=excluded.sobre, historia=excluded.historia,
      promessa_completa=excluded.promessa_completa, promessa_curta=excluded.promessa_curta,
      transformacao_narrativa=excluded.transformacao_narrativa,
      transformacao_procedencia=excluded.transformacao_procedencia,
      diferencial_1=excluded.diferencial_1, diferencial_2=excluded.diferencial_2, diferencial_3=excluded.diferencial_3,
      icp_quem_e=excluded.icp_quem_e, icp_quem_nao_e=excluded.icp_quem_nao_e, icp_psicologico=excluded.icp_psicologico,
      crencas_tentou=excluded.crencas_tentou, crencas_nao_acredita=excluded.crencas_nao_acredita,
      desejos_secretos=excluded.desejos_secretos, desejos_aspiracional=excluded.desejos_aspiracional,
      dores_profundas=excluded.dores_profundas, dores_travando=excluded.dores_travando,
      objecoes_desculpas=excluded.objecoes_desculpas, objecoes_medos=excluded.objecoes_medos,
      updated_at=datetime('now')
  `).run(
    cid, icp||'', promise||'', JSON.stringify(differentials||[]), JSON.stringify(cases||[]), mission||'',
    sobre||'', historia||'', promessa_completa||'', promessa_curta||'',
    transformacao_narrativa||'', transformacao_procedencia||'',
    diferencial_1||'', diferencial_2||'', diferencial_3||'',
    icp_quem_e||'', icp_quem_nao_e||'', icp_psicologico||'',
    crencas_tentou||'', crencas_nao_acredita||'',
    desejos_secretos||'', desejos_aspiracional||'',
    dores_profundas||'', dores_travando||'',
    objecoes_desculpas||'', objecoes_medos||'',
  );
  res.json(db.prepare('SELECT * FROM client_positioning WHERE agency_client_id = ?').get(cid));
});

/* ── Client Products ──────────────────────────────────────────────────────── */
router.get('/:clientId/products', (req, res) => {
  const rows = db.prepare('SELECT * FROM client_products WHERE agency_client_id = ? ORDER BY offer_type, name').all(Number(req.params.clientId));
  res.json(rows);
});

router.post('/:clientId/products', (req, res) => {
  const cid = Number(req.params.clientId);
  const { name, price = 0, unit = 'un', category = '', offer_type = 'alicerce', active = 1, target_audience = '', promise = '', deliverables = '' } = req.body;
  if (!name) return res.status(400).json({ error: 'Nome é obrigatório' });
  const r = db.prepare(`
    INSERT INTO client_products (agency_client_id, name, price, unit, category, offer_type, active, target_audience, promise, deliverables)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(cid, name, price, unit, category, offer_type, active ? 1 : 0, target_audience, promise, deliverables);
  res.status(201).json(db.prepare('SELECT * FROM client_products WHERE id = ?').get(r.lastInsertRowid));
});

router.put('/:clientId/products/:id', (req, res) => {
  const { name, price, unit, category, offer_type, active, target_audience, promise, deliverables } = req.body;
  const existing = db.prepare('SELECT * FROM client_products WHERE id = ? AND agency_client_id = ?').get(req.params.id, req.params.clientId) as any;
  if (!existing) return res.status(404).json({ error: 'Produto não encontrado' });
  db.prepare(`
    UPDATE client_products SET name=?, price=?, unit=?, category=?, offer_type=?, active=?, target_audience=?, promise=?, deliverables=?, updated_at=datetime('now')
    WHERE id=? AND agency_client_id=?
  `).run(
    name ?? existing.name, price ?? existing.price, unit ?? existing.unit,
    category ?? existing.category, offer_type ?? existing.offer_type,
    active !== undefined ? (active ? 1 : 0) : existing.active,
    target_audience ?? existing.target_audience, promise ?? existing.promise,
    deliverables ?? existing.deliverables, req.params.id, req.params.clientId
  );
  res.json(db.prepare('SELECT * FROM client_products WHERE id = ?').get(req.params.id));
});

router.delete('/:clientId/products/:id', (req, res) => {
  db.prepare('DELETE FROM client_products WHERE id = ? AND agency_client_id = ?').run(req.params.id, req.params.clientId);
  res.json({ ok: true });
});

export default router;
