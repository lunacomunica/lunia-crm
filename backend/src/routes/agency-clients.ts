import { Router } from 'express';
import db from '../db.js';

const router = Router();

/* ── Production overview ─────────────────────────────────────────────── */
router.get('/production', (req, res) => {
  const rows = db.prepare(`
    SELECT
      ac.id, ac.name, ac.segment, ac.instagram_handle, ac.logo, ac.active,
      COUNT(DISTINCT cp.id)                                                              AS total_pieces,
      COUNT(DISTINCT CASE WHEN cp.status = 'em_criacao'           THEN cp.id END)      AS em_criacao,
      COUNT(DISTINCT CASE WHEN cp.status = 'em_revisao'           THEN cp.id END)      AS em_revisao,
      COUNT(DISTINCT CASE WHEN cp.status = 'aguardando_aprovacao' THEN cp.id END)      AS aguardando_aprovacao,
      COUNT(DISTINCT CASE WHEN cp.status = 'ajuste_solicitado'    THEN cp.id END)      AS ajuste_solicitado,
      COUNT(DISTINCT CASE WHEN cp.status = 'aprovado'             THEN cp.id END)      AS aprovado,
      COUNT(DISTINCT CASE WHEN cp.status = 'agendado'             THEN cp.id END)      AS agendado,
      COUNT(DISTINCT CASE WHEN cp.status = 'publicado' AND cp.updated_at >= date('now','start of month') THEN cp.id END) AS publicado_mes,
      COUNT(DISTINCT CASE WHEN t.status NOT IN ('concluida') THEN t.id END)            AS tarefas_abertas,
      COUNT(DISTINCT CASE WHEN t.status NOT IN ('concluida') AND t.due_date < date('now') THEN t.id END) AS tarefas_atrasadas,
      MAX(cp.updated_at)                                                                AS ultima_atualizacao
    FROM agency_clients ac
    LEFT JOIN content_pieces cp ON cp.agency_client_id = ac.id AND cp.tenant_id = ac.tenant_id
    LEFT JOIN tasks t ON t.agency_client_id = ac.id AND t.tenant_id = ac.tenant_id
    WHERE ac.tenant_id = ? AND ac.active = 1
    GROUP BY ac.id
    ORDER BY ajuste_solicitado DESC, aguardando_aprovacao DESC, ac.name ASC
  `).all(req.user.tenant_id);
  res.json(rows);
});

router.get('/', (req, res) => {
  const clients = db.prepare(`
    SELECT ac.*,
      COUNT(cp.id) as content_count,
      SUM(CASE WHEN cp.status = 'aguardando_aprovacao' THEN 1 ELSE 0 END) as pending_approvals,
      (SELECT name FROM feed_batches WHERE agency_client_id = ac.id AND tenant_id = ac.tenant_id ORDER BY year DESC, month DESC LIMIT 1) as current_feed_name,
      (SELECT COUNT(*) FROM content_pieces WHERE batch_id = (SELECT id FROM feed_batches WHERE agency_client_id = ac.id AND tenant_id = ac.tenant_id ORDER BY year DESC, month DESC LIMIT 1)) as current_feed_posts
    FROM agency_clients ac
    LEFT JOIN content_pieces cp ON cp.agency_client_id = ac.id
    WHERE ac.tenant_id = ?
    GROUP BY ac.id ORDER BY ac.name
  `).all(req.user.tenant_id);
  res.json(clients);
});

router.get('/:id', (req, res) => {
  const client = db.prepare(`
    SELECT ac.*,
      u.name  as owner_name,
      u.avatar as owner_avatar,
      u.job_title as owner_job_title
    FROM agency_clients ac
    LEFT JOIN users u ON u.tenant_id = ac.tenant_id AND u.role = 'owner'
    WHERE ac.id = ? AND ac.tenant_id = ?
    ORDER BY u.id ASC LIMIT 1
  `).get(req.params.id, req.user.tenant_id);
  if (!client) return res.status(404).json({ error: 'Cliente não encontrado' });
  res.json(client);
});

router.post('/', (req, res) => {
  if (req.user.role === 'team') return res.status(403).json({ error: 'Sem permissão' });
  const { name, segment = '', contact_name = '', contact_email = '', instagram_handle = '', logo = '', squad = null } = req.body;
  if (!name) return res.status(400).json({ error: 'Nome é obrigatório' });
  const r = db.prepare(`INSERT INTO agency_clients (tenant_id, name, segment, contact_name, contact_email, instagram_handle, logo, squad) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(req.user.tenant_id, name, segment, contact_name, contact_email, instagram_handle, logo, squad);
  res.status(201).json(db.prepare('SELECT * FROM agency_clients WHERE id = ?').get(r.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  if (req.user.role === 'team') return res.status(403).json({ error: 'Sem permissão' });
  const existing = db.prepare('SELECT * FROM agency_clients WHERE id = ? AND tenant_id = ?').get(req.params.id, req.user.tenant_id) as any;
  if (!existing) return res.status(404).json({ error: 'Cliente não encontrado' });
  const { name, segment, contact_name, contact_email, instagram_handle, logo, active, squad } = req.body;
  db.prepare(`UPDATE agency_clients SET name=?, segment=?, contact_name=?, contact_email=?, instagram_handle=?, logo=?, active=?, squad=?, updated_at=datetime('now') WHERE id=? AND tenant_id=?`).run(
    name ?? existing.name, segment ?? existing.segment, contact_name ?? existing.contact_name,
    contact_email ?? existing.contact_email, instagram_handle ?? existing.instagram_handle,
    logo ?? existing.logo, active !== undefined ? (active ? 1 : 0) : existing.active,
    squad !== undefined ? (squad || null) : existing.squad,
    req.params.id, req.user.tenant_id
  );
  res.json(db.prepare('SELECT * FROM agency_clients WHERE id = ?').get(req.params.id));
});

router.patch('/:id/integration', (req, res) => {
  if (req.user.role === 'team') return res.status(403).json({ error: 'Sem permissão' });
  const existing = db.prepare('SELECT * FROM agency_clients WHERE id=? AND tenant_id=?').get(req.params.id, req.user.tenant_id) as any;
  if (!existing) return res.status(404).json({ error: 'Cliente não encontrado' });
  const { instagram_user_id, meta_ads_account_id } = req.body;
  db.prepare("UPDATE agency_clients SET instagram_user_id=?, meta_ads_account_id=?, updated_at=datetime('now') WHERE id=? AND tenant_id=?")
    .run(instagram_user_id ?? existing.instagram_user_id, meta_ads_account_id ?? existing.meta_ads_account_id, req.params.id, req.user.tenant_id);
  res.json({ ok: true });
});

router.patch('/:id/modules', (req, res) => {
  if (req.user.role === 'team') return res.status(403).json({ error: 'Sem permissão' });
  const { modules } = req.body;
  db.prepare("UPDATE agency_clients SET modules=?, updated_at=datetime('now') WHERE id=? AND tenant_id=?").run(JSON.stringify(modules), req.params.id, req.user.tenant_id);
  res.json({ ok: true });
});

router.patch('/:id/ceo-message', (req, res) => {
  if (req.user.role === 'team') return res.status(403).json({ error: 'Sem permissão' });
  const { ceo_message } = req.body;
  db.prepare("UPDATE agency_clients SET ceo_message=?, updated_at=datetime('now') WHERE id=? AND tenant_id=?").run(ceo_message ?? null, req.params.id, req.user.tenant_id);
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  if (req.user.role !== 'owner') return res.status(403).json({ error: 'Apenas admins podem remover clientes' });
  db.prepare('DELETE FROM agency_clients WHERE id = ? AND tenant_id = ?').run(req.params.id, req.user.tenant_id);
  res.json({ ok: true });
});

export default router;
