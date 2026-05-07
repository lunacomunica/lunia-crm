import { Router } from 'express';
import db from '../db.js';

const router = Router();

const VALID_STATUSES = ['em_criacao', 'em_revisao', 'aguardando_aprovacao', 'aprovado', 'ajuste_solicitado', 'agendado', 'publicado'];

router.get('/', (req, res) => {
  const tid = req.user.tenant_id;
  const { client_id, status, type } = req.query as Record<string, string>;

  let query = `SELECT cp.*, ac.name as client_name, ac.instagram_handle, u.name as creator_name
    FROM content_pieces cp
    LEFT JOIN agency_clients ac ON cp.agency_client_id = ac.id
    LEFT JOIN users u ON cp.created_by = u.id
    WHERE cp.tenant_id = ?`;
  const params: any[] = [tid];

  if (client_id) { query += ' AND cp.agency_client_id = ?'; params.push(client_id); }
  if (status && status !== 'all') { query += ' AND cp.status = ?'; params.push(status); }
  if (type && type !== 'all') { query += ' AND cp.type = ?'; params.push(type); }

  query += ' ORDER BY cp.scheduled_date ASC, cp.created_at DESC';

  res.json(db.prepare(query).all(...params));
});

router.get('/:id', (req, res) => {
  const piece = db.prepare(`SELECT cp.*, ac.name as client_name, u.name as creator_name
    FROM content_pieces cp
    LEFT JOIN agency_clients ac ON cp.agency_client_id = ac.id
    LEFT JOIN users u ON cp.created_by = u.id
    WHERE cp.id = ? AND cp.tenant_id = ?`).get(req.params.id, req.user.tenant_id) as any;
  if (!piece) return res.status(404).json({ error: 'Conteúdo não encontrado' });

  piece.comments = db.prepare(`SELECT cc.*, u.name as user_name_resolved FROM content_comments cc
    LEFT JOIN users u ON cc.user_id = u.id WHERE cc.content_piece_id = ? ORDER BY cc.created_at ASC`).all(req.params.id);

  res.json(piece);
});

router.post('/', (req, res) => {
  const { agency_client_id, title, type = 'post', caption = '', media_url = '', scheduled_date, objective = '', status = 'em_criacao' } = req.body;
  if (!agency_client_id || !title) return res.status(400).json({ error: 'Cliente e título são obrigatórios' });

  const r = db.prepare(`INSERT INTO content_pieces (tenant_id, agency_client_id, title, type, caption, media_url, scheduled_date, objective, status, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(req.user.tenant_id, agency_client_id, title, type, caption, media_url, scheduled_date || null, objective, status, req.user.id);

  res.status(201).json(db.prepare(`SELECT cp.*, ac.name as client_name FROM content_pieces cp
    LEFT JOIN agency_clients ac ON cp.agency_client_id = ac.id WHERE cp.id = ?`).get(r.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM content_pieces WHERE id = ? AND tenant_id = ?').get(req.params.id, req.user.tenant_id) as any;
  if (!existing) return res.status(404).json({ error: 'Conteúdo não encontrado' });

  const { title, type, caption, media_url, scheduled_date, objective, status } = req.body;
  const newStatus = status && VALID_STATUSES.includes(status) ? status : existing.status;

  db.prepare(`UPDATE content_pieces SET title=?, type=?, caption=?, media_url=?, scheduled_date=?, objective=?, status=?, updated_at=datetime('now') WHERE id=? AND tenant_id=?`).run(
    title ?? existing.title, type ?? existing.type, caption ?? existing.caption,
    media_url ?? existing.media_url, scheduled_date ?? existing.scheduled_date,
    objective ?? existing.objective, newStatus, req.params.id, req.user.tenant_id
  );

  res.json(db.prepare(`SELECT cp.*, ac.name as client_name FROM content_pieces cp
    LEFT JOIN agency_clients ac ON cp.agency_client_id = ac.id WHERE cp.id = ?`).get(req.params.id));
});

router.patch('/:id/status', (req, res) => {
  const { status } = req.body;
  if (!VALID_STATUSES.includes(status)) return res.status(400).json({ error: 'Status inválido' });
  const existing = db.prepare('SELECT * FROM content_pieces WHERE id = ? AND tenant_id = ?').get(req.params.id, req.user.tenant_id);
  if (!existing) return res.status(404).json({ error: 'Conteúdo não encontrado' });
  db.prepare(`UPDATE content_pieces SET status=?, updated_at=datetime('now') WHERE id=?`).run(status, req.params.id);
  res.json({ ok: true, status });
});

router.post('/:id/comments', (req, res) => {
  const { message } = req.body;
  if (!message?.trim()) return res.status(400).json({ error: 'Mensagem obrigatória' });
  const piece = db.prepare('SELECT id FROM content_pieces WHERE id = ? AND tenant_id = ?').get(req.params.id, req.user.tenant_id);
  if (!piece) return res.status(404).json({ error: 'Conteúdo não encontrado' });
  const r = db.prepare('INSERT INTO content_comments (content_piece_id, user_id, user_name, message) VALUES (?, ?, ?, ?)').run(req.params.id, req.user.id, req.user.name, message.trim());
  res.status(201).json(db.prepare('SELECT * FROM content_comments WHERE id = ?').get(r.lastInsertRowid));
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM content_pieces WHERE id = ? AND tenant_id = ?').run(req.params.id, req.user.tenant_id);
  res.json({ ok: true });
});

export default router;
