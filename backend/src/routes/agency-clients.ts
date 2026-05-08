import { Router } from 'express';
import db from '../db.js';

const router = Router();

/* ── Production overview ─────────────────────────────────────────────── */
router.get('/production', (req, res) => {
  const rows = db.prepare(`
    SELECT
      ac.id, ac.name, ac.segment, ac.instagram_handle, ac.logo, ac.active,
      COUNT(DISTINCT cp.id)                                                              AS total_pieces,
      SUM(CASE WHEN cp.status = 'em_criacao'           THEN 1 ELSE 0 END)              AS em_criacao,
      SUM(CASE WHEN cp.status = 'em_revisao'           THEN 1 ELSE 0 END)              AS em_revisao,
      SUM(CASE WHEN cp.status = 'aguardando_aprovacao' THEN 1 ELSE 0 END)              AS aguardando_aprovacao,
      SUM(CASE WHEN cp.status = 'ajuste_solicitado'    THEN 1 ELSE 0 END)              AS ajuste_solicitado,
      SUM(CASE WHEN cp.status = 'aprovado'             THEN 1 ELSE 0 END)              AS aprovado,
      SUM(CASE WHEN cp.status = 'agendado'             THEN 1 ELSE 0 END)              AS agendado,
      SUM(CASE WHEN cp.status = 'publicado' AND cp.updated_at >= date('now','start of month') THEN 1 ELSE 0 END) AS publicado_mes,
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
    SELECT ac.*, COUNT(cp.id) as content_count,
      SUM(CASE WHEN cp.status = 'aguardando_aprovacao' THEN 1 ELSE 0 END) as pending_approvals
    FROM agency_clients ac
    LEFT JOIN content_pieces cp ON cp.agency_client_id = ac.id
    WHERE ac.tenant_id = ?
    GROUP BY ac.id ORDER BY ac.name
  `).all(req.user.tenant_id);
  res.json(clients);
});

router.get('/:id', (req, res) => {
  const client = db.prepare('SELECT * FROM agency_clients WHERE id = ? AND tenant_id = ?').get(req.params.id, req.user.tenant_id);
  if (!client) return res.status(404).json({ error: 'Cliente não encontrado' });
  res.json(client);
});

router.post('/', (req, res) => {
  if (req.user.role === 'team') return res.status(403).json({ error: 'Sem permissão' });
  const { name, segment = '', contact_name = '', contact_email = '', instagram_handle = '', logo = '' } = req.body;
  if (!name) return res.status(400).json({ error: 'Nome é obrigatório' });
  const r = db.prepare(`INSERT INTO agency_clients (tenant_id, name, segment, contact_name, contact_email, instagram_handle, logo) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(req.user.tenant_id, name, segment, contact_name, contact_email, instagram_handle, logo);
  res.status(201).json(db.prepare('SELECT * FROM agency_clients WHERE id = ?').get(r.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  if (req.user.role === 'team') return res.status(403).json({ error: 'Sem permissão' });
  const existing = db.prepare('SELECT * FROM agency_clients WHERE id = ? AND tenant_id = ?').get(req.params.id, req.user.tenant_id) as any;
  if (!existing) return res.status(404).json({ error: 'Cliente não encontrado' });
  const { name, segment, contact_name, contact_email, instagram_handle, logo, active } = req.body;
  db.prepare(`UPDATE agency_clients SET name=?, segment=?, contact_name=?, contact_email=?, instagram_handle=?, logo=?, active=?, updated_at=datetime('now') WHERE id=? AND tenant_id=?`).run(
    name ?? existing.name, segment ?? existing.segment, contact_name ?? existing.contact_name,
    contact_email ?? existing.contact_email, instagram_handle ?? existing.instagram_handle,
    logo ?? existing.logo, active !== undefined ? (active ? 1 : 0) : existing.active,
    req.params.id, req.user.tenant_id
  );
  res.json(db.prepare('SELECT * FROM agency_clients WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  if (req.user.role !== 'owner') return res.status(403).json({ error: 'Apenas admins podem remover clientes' });
  db.prepare('DELETE FROM agency_clients WHERE id = ? AND tenant_id = ?').run(req.params.id, req.user.tenant_id);
  res.json({ ok: true });
});

export default router;
