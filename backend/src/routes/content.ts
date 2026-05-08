import { Router } from 'express';
import db from '../db.js';

const router = Router();

const VALID_STATUSES = ['em_criacao', 'em_revisao', 'aguardando_aprovacao', 'aprovado', 'ajuste_solicitado', 'agendado', 'publicado'];
const MONTHS_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

// ── Feed Batches ────────────────────────────────────────────────────────────

router.get('/batches', (req, res) => {
  const tid = req.user.tenant_id;
  const { client_id } = req.query as Record<string, string>;
  let q = `
    SELECT fb.*, ac.name as client_name,
      COUNT(cp.id) as post_count,
      SUM(CASE WHEN cp.status IN ('aprovado','publicado') THEN 1 ELSE 0 END) as approved_count
    FROM feed_batches fb
    LEFT JOIN agency_clients ac ON fb.agency_client_id = ac.id
    LEFT JOIN content_pieces cp ON cp.batch_id = fb.id
    WHERE fb.tenant_id = ?`;
  const params: any[] = [tid];
  if (client_id) { q += ' AND fb.agency_client_id = ?'; params.push(client_id); }
  q += ' GROUP BY fb.id ORDER BY fb.agency_client_id, fb.order_num';
  res.json(db.prepare(q).all(...params));
});

router.post('/batches', (req, res) => {
  const { agency_client_id, month, year } = req.body;
  if (!agency_client_id || !month || !year) return res.status(400).json({ error: 'Campos obrigatórios' });
  const orderNum = ((db.prepare('SELECT COUNT(*) as c FROM feed_batches WHERE tenant_id=? AND agency_client_id=?').get(req.user.tenant_id, agency_client_id) as any).c as number) + 1;
  const name = `${String(orderNum).padStart(2, '0')} | Feed ${MONTHS_PT[Number(month) - 1]}`;
  const r = db.prepare('INSERT INTO feed_batches (tenant_id, agency_client_id, name, month, year, order_num) VALUES (?, ?, ?, ?, ?, ?)')
    .run(req.user.tenant_id, agency_client_id, name, month, year, orderNum);
  res.status(201).json(db.prepare('SELECT fb.*, ac.name as client_name FROM feed_batches fb LEFT JOIN agency_clients ac ON fb.agency_client_id = ac.id WHERE fb.id=?').get(r.lastInsertRowid));
});

router.delete('/batches/:id', (req, res) => {
  db.prepare('DELETE FROM feed_batches WHERE id=? AND tenant_id=?').run(req.params.id, req.user.tenant_id);
  res.json({ ok: true });
});

// ── Content Pieces ──────────────────────────────────────────────────────────

router.get('/', (req, res) => {
  const tid = req.user.tenant_id;
  const { client_id, status, type, batch_id } = req.query as Record<string, string>;

  let query = `SELECT cp.*, ac.name as client_name, ac.instagram_handle, u.name as creator_name
    FROM content_pieces cp
    LEFT JOIN agency_clients ac ON cp.agency_client_id = ac.id
    LEFT JOIN users u ON cp.created_by = u.id
    WHERE cp.tenant_id = ?`;
  const params: any[] = [tid];

  // client role can only see their own client's content
  const forcedClientId = req.user.role === 'client' ? req.user.agency_client_id : null;
  const effectiveClientId = forcedClientId ?? (client_id || null);
  if (effectiveClientId) { query += ' AND cp.agency_client_id = ?'; params.push(effectiveClientId); }
  if (status && status !== 'all') { query += ' AND cp.status = ?'; params.push(status); }
  if (type && type !== 'all') { query += ' AND cp.type = ?'; params.push(type); }
  if (batch_id) { query += ' AND cp.batch_id = ?'; params.push(batch_id); }

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
  const { agency_client_id, title, type = 'post', caption = '', media_url = '', scheduled_date, objective = '', status = 'em_criacao', batch_id } = req.body;
  if (!agency_client_id || !title) return res.status(400).json({ error: 'Cliente e título são obrigatórios' });

  const r = db.prepare(`INSERT INTO content_pieces (tenant_id, agency_client_id, title, type, caption, media_url, scheduled_date, objective, status, batch_id, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(req.user.tenant_id, agency_client_id, title, type, caption, media_url, scheduled_date || null, objective, status, batch_id || null, req.user.id);

  res.status(201).json(db.prepare(`SELECT cp.*, ac.name as client_name FROM content_pieces cp
    LEFT JOIN agency_clients ac ON cp.agency_client_id = ac.id WHERE cp.id = ?`).get(r.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM content_pieces WHERE id = ? AND tenant_id = ?').get(req.params.id, req.user.tenant_id) as any;
  if (!existing) return res.status(404).json({ error: 'Conteúdo não encontrado' });

  const { title, type, caption, media_url, scheduled_date, objective, status, batch_id } = req.body;
  const newStatus = status && VALID_STATUSES.includes(status) ? status : existing.status;

  db.prepare(`UPDATE content_pieces SET title=?, type=?, caption=?, media_url=?, scheduled_date=?, objective=?, status=?, batch_id=?, updated_at=datetime('now') WHERE id=? AND tenant_id=?`).run(
    title ?? existing.title, type ?? existing.type, caption ?? existing.caption,
    media_url ?? existing.media_url, scheduled_date ?? existing.scheduled_date,
    objective ?? existing.objective, newStatus, batch_id !== undefined ? batch_id : existing.batch_id,
    req.params.id, req.user.tenant_id
  );

  res.json(db.prepare(`SELECT cp.*, ac.name as client_name FROM content_pieces cp
    LEFT JOIN agency_clients ac ON cp.agency_client_id = ac.id WHERE cp.id = ?`).get(req.params.id));
});

router.patch('/:id/status', (req, res) => {
  const { status, comment } = req.body;
  if (!VALID_STATUSES.includes(status)) return res.status(400).json({ error: 'Status inválido' });
  const existing = db.prepare(`SELECT cp.*, ac.name as client_name FROM content_pieces cp
    LEFT JOIN agency_clients ac ON cp.agency_client_id = ac.id
    WHERE cp.id = ? AND cp.tenant_id = ?`).get(req.params.id, req.user.tenant_id) as any;
  if (!existing) return res.status(404).json({ error: 'Conteúdo não encontrado' });

  db.prepare(`UPDATE content_pieces SET status=?, updated_at=datetime('now') WHERE id=?`).run(status, req.params.id);

  if (comment?.trim()) {
    db.prepare('INSERT INTO content_comments (content_piece_id, user_id, user_name, message) VALUES (?, ?, ?, ?)').run(req.params.id, req.user.id, req.user.name, comment.trim());
  }

  if (status === 'aprovado' || status === 'ajuste_solicitado') {
    const label = status === 'aprovado' ? 'Aprovado' : 'Ajuste solicitado';
    const body = status === 'ajuste_solicitado' && comment ? comment : existing.title;
    db.prepare('INSERT INTO notifications (tenant_id, type, title, body, meta) VALUES (?, ?, ?, ?, ?)').run(
      req.user.tenant_id, status,
      `${label}: ${existing.client_name}`,
      body,
      JSON.stringify({ content_id: req.params.id, client_id: existing.agency_client_id, client_name: existing.client_name })
    );

    // Auto-create task when client requests adjustment
    if (status === 'ajuste_solicitado') {
      db.prepare(`
        INSERT INTO tasks (tenant_id, title, description, content_piece_id, agency_client_id, priority, created_by)
        VALUES (?, ?, ?, ?, ?, 'alta', ?)
      `).run(
        req.user.tenant_id,
        `Ajuste: ${existing.title}`,
        comment || null,
        existing.id,
        existing.agency_client_id,
        req.user.id
      );
    }
  }

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
