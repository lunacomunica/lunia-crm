import { Router } from 'express';
import db from '../db.js';

const router = Router();

router.get('/', (req, res) => {
  const { client_id, status, platform } = req.query as Record<string, string>;
  let q = `
    SELECT c.*,
      ac.name as client_name,
      (SELECT COUNT(*) FROM campaign_creatives cc WHERE cc.campaign_id = c.id) as creative_count,
      COALESCE((SELECT SUM(cc.spend) FROM campaign_creatives cc WHERE cc.campaign_id = c.id), 0) as spent,
      COALESCE((SELECT SUM(cc.impressions) FROM campaign_creatives cc WHERE cc.campaign_id = c.id), 0) as impressions,
      COALESCE((SELECT SUM(cc.clicks) FROM campaign_creatives cc WHERE cc.campaign_id = c.id), 0) as clicks,
      COALESCE((SELECT SUM(cc.conversions) FROM campaign_creatives cc WHERE cc.campaign_id = c.id), 0) as conversions
    FROM campaigns c
    LEFT JOIN agency_clients ac ON c.agency_client_id = ac.id
    WHERE c.tenant_id = ?
  `;
  const params: any[] = [req.user.tenant_id];
  const forcedClientId = req.user.role === 'client' ? req.user.agency_client_id : null;
  const effectiveClientId = forcedClientId ?? (client_id || null);
  if (effectiveClientId) { q += ' AND c.agency_client_id = ?'; params.push(effectiveClientId); }
  if (status) { q += ' AND c.status = ?'; params.push(status); }
  if (platform) { q += ' AND c.platform = ?'; params.push(platform); }
  q += ' ORDER BY c.created_at DESC';
  res.json(db.prepare(q).all(...params));
});

router.get('/:id', (req, res) => {
  const campaign = db.prepare(`
    SELECT c.*, ac.name as client_name
    FROM campaigns c
    LEFT JOIN agency_clients ac ON c.agency_client_id = ac.id
    WHERE c.id = ? AND c.tenant_id = ?
  `).get(req.params.id, req.user.tenant_id) as any;
  if (!campaign) return res.status(404).json({ error: 'Campanha não encontrada' });
  campaign.creatives = db.prepare('SELECT * FROM campaign_creatives WHERE campaign_id = ? ORDER BY created_at ASC').all(req.params.id);
  res.json(campaign);
});

router.post('/', (req, res) => {
  const { agency_client_id, name, platform = 'meta', status = 'rascunho', objective = 'trafego',
    budget = 0, spent = 0, revenue = 0, impressions = 0, clicks = 0, conversions = 0,
    target_audience, utm_link, start_date, end_date, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'Nome é obrigatório' });
  const r = db.prepare(`
    INSERT INTO campaigns (tenant_id, agency_client_id, name, platform, status, objective, budget, spent, revenue, impressions, clicks, conversions, target_audience, utm_link, start_date, end_date, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(req.user.tenant_id, agency_client_id || null, name, platform, status, objective, budget, spent, revenue, impressions, clicks, conversions, target_audience || null, utm_link || null, start_date || null, end_date || null, notes || null);
  const campaign = db.prepare('SELECT c.*, ac.name as client_name FROM campaigns c LEFT JOIN agency_clients ac ON c.agency_client_id = ac.id WHERE c.id = ?').get(r.lastInsertRowid) as any;
  campaign.creatives = [];
  res.status(201).json(campaign);
});

router.put('/:id', (req, res) => {
  const { name, platform, status, objective, budget, spent, revenue, impressions, clicks, conversions, target_audience, utm_link, start_date, end_date, notes, agency_client_id } = req.body;
  db.prepare(`
    UPDATE campaigns SET name=?, platform=?, status=?, objective=?, budget=?, spent=?, revenue=?, impressions=?, clicks=?, conversions=?, target_audience=?, utm_link=?, start_date=?, end_date=?, notes=?, agency_client_id=?, updated_at=datetime('now')
    WHERE id=? AND tenant_id=?
  `).run(name, platform, status, objective, budget, spent, revenue, impressions, clicks, conversions, target_audience || null, utm_link || null, start_date || null, end_date || null, notes || null, agency_client_id || null, req.params.id, req.user.tenant_id);
  const campaign = db.prepare('SELECT c.*, ac.name as client_name FROM campaigns c LEFT JOIN agency_clients ac ON c.agency_client_id = ac.id WHERE c.id = ?').get(req.params.id) as any;
  campaign.creatives = db.prepare('SELECT * FROM campaign_creatives WHERE campaign_id = ? ORDER BY created_at ASC').all(req.params.id);
  res.json(campaign);
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM campaigns WHERE id=? AND tenant_id=?').run(req.params.id, req.user.tenant_id);
  res.json({ ok: true });
});

// Creatives
router.post('/:id/creatives', (req, res) => {
  const { title, type = 'image', media_url, headline, description, cta, status = 'ativo',
    impressions = 0, clicks = 0, conversions = 0, spend = 0, utm_link } = req.body;
  if (!title) return res.status(400).json({ error: 'Título é obrigatório' });
  const r = db.prepare(`
    INSERT INTO campaign_creatives (campaign_id, title, type, media_url, headline, description, cta, status, impressions, clicks, conversions, spend, utm_link)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(req.params.id, title, type, media_url || null, headline || null, description || null, cta || null, status, impressions, clicks, conversions, spend, utm_link || null);
  res.status(201).json(db.prepare('SELECT * FROM campaign_creatives WHERE id=?').get(r.lastInsertRowid));
});

router.put('/:id/creatives/:cid', (req, res) => {
  const { title, type, media_url, headline, description, cta, status, impressions, clicks, conversions, spend, utm_link } = req.body;
  db.prepare(`
    UPDATE campaign_creatives SET title=?, type=?, media_url=?, headline=?, description=?, cta=?, status=?, impressions=?, clicks=?, conversions=?, spend=?, utm_link=?
    WHERE id=? AND campaign_id=?
  `).run(title, type, media_url || null, headline || null, description || null, cta || null, status, impressions, clicks, conversions, spend, utm_link || null, req.params.cid, req.params.id);
  res.json(db.prepare('SELECT * FROM campaign_creatives WHERE id=?').get(req.params.cid));
});

router.delete('/:id/creatives/:cid', (req, res) => {
  db.prepare('DELETE FROM campaign_creatives WHERE id=? AND campaign_id=?').run(req.params.cid, req.params.id);
  res.json({ ok: true });
});

export default router;
