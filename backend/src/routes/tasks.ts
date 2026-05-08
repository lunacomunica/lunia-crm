import { Router } from 'express';
import db from '../db.js';

const router = Router();

/* ── List ─────────────────────────────────────────────────────────────── */
router.get('/', (req, res) => {
  const { assigned_to, status, client_id, due } = req.query as Record<string, string>;
  const tid = req.user.tenant_id;

  let q = `
    SELECT t.*,
      u.name   as assigned_name,
      u.avatar as assigned_avatar,
      u.job_title as assigned_job_title,
      ac.name  as client_name,
      cp.title  as content_title,
      cp.media_url as content_media_url,
      cp.caption   as content_caption,
      cp.type      as content_type,
      cp.status    as content_status,
      c.name   as campaign_name,
      (SELECT started_at FROM task_sessions WHERE task_id = t.id AND ended_at IS NULL LIMIT 1) as session_started_at
    FROM tasks t
    LEFT JOIN users u ON u.id = t.assigned_to
    LEFT JOIN agency_clients ac ON ac.id = t.agency_client_id
    LEFT JOIN content_pieces cp ON cp.id = t.content_piece_id
    LEFT JOIN campaigns c ON c.id = t.campaign_id
    WHERE t.tenant_id = ?
  `;
  const params: any[] = [tid];

  // team/client see only their own tasks
  const effectiveUser = (req.user.role === 'team' || req.user.role === 'user')
    ? req.user.id : null;
  if (effectiveUser) { q += ' AND t.assigned_to = ?'; params.push(effectiveUser); }
  else if (assigned_to) { q += ' AND t.assigned_to = ?'; params.push(assigned_to); }

  if (status) { q += ' AND t.status = ?'; params.push(status); }
  if (client_id) { q += ' AND t.agency_client_id = ?'; params.push(client_id); }

  if (due === 'today') {
    q += " AND date(t.due_date) = date('now')";
  } else if (due === 'week') {
    q += " AND date(t.due_date) BETWEEN date('now') AND date('now', '+7 days')";
  }

  q += " ORDER BY CASE t.priority WHEN 'urgente' THEN 1 WHEN 'alta' THEN 2 WHEN 'media' THEN 3 ELSE 4 END, t.due_date ASC, t.created_at DESC";

  res.json(db.prepare(q).all(...params));
});

/* ── Create ───────────────────────────────────────────────────────────── */
router.post('/', (req, res) => {
  const { title, description, assigned_to, content_piece_id, campaign_id, agency_client_id, priority, stage, due_date, estimated_minutes } = req.body;
  if (!title) return res.status(400).json({ error: 'Título obrigatório' });

  const r = db.prepare(`
    INSERT INTO tasks (tenant_id, title, description, assigned_to, created_by, content_piece_id, campaign_id, agency_client_id, priority, stage, due_date, estimated_minutes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(req.user.tenant_id, title, description || null, assigned_to || null, req.user.id, content_piece_id || null, campaign_id || null, agency_client_id || null, priority || 'media', stage || 'geral', due_date || null, estimated_minutes || null);

  const task = db.prepare(`
    SELECT t.*, u.name as assigned_name, ac.name as client_name, cp.title as content_title, c.name as campaign_name
    FROM tasks t
    LEFT JOIN users u ON u.id = t.assigned_to
    LEFT JOIN agency_clients ac ON ac.id = t.agency_client_id
    LEFT JOIN content_pieces cp ON cp.id = t.content_piece_id
    LEFT JOIN campaigns c ON c.id = t.campaign_id
    WHERE t.id = ?
  `).get(r.lastInsertRowid);

  res.status(201).json(task);
});

/* ── Update ───────────────────────────────────────────────────────────── */
router.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  const { title, description, assigned_to, priority, due_date, estimated_minutes, agency_client_id } = req.body;

  db.prepare(`
    UPDATE tasks SET title=?, description=?, assigned_to=?, priority=?, due_date=?, estimated_minutes=?, agency_client_id=?, updated_at=datetime('now')
    WHERE id = ? AND tenant_id = ?
  `).run(title, description || null, assigned_to || null, priority || 'media', due_date || null, estimated_minutes || null, agency_client_id || null, id, req.user.tenant_id);

  const task = db.prepare(`
    SELECT t.*, u.name as assigned_name, ac.name as client_name, cp.title as content_title, c.name as campaign_name
    FROM tasks t
    LEFT JOIN users u ON u.id = t.assigned_to
    LEFT JOIN agency_clients ac ON ac.id = t.agency_client_id
    LEFT JOIN content_pieces cp ON cp.id = t.content_piece_id
    LEFT JOIN campaigns c ON c.id = t.campaign_id
    WHERE t.id = ?
  `).get(id);

  res.json(task);
});

/* ── Delete ───────────────────────────────────────────────────────────── */
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM tasks WHERE id = ? AND tenant_id = ?').run(Number(req.params.id), req.user.tenant_id);
  res.json({ ok: true });
});

/* ── Start timer ──────────────────────────────────────────────────────── */
router.post('/:id/start', (req, res) => {
  const id = Number(req.params.id);
  const task = db.prepare('SELECT * FROM tasks WHERE id = ? AND tenant_id = ?').get(id, req.user.tenant_id) as any;
  if (!task) return res.status(404).json({ error: 'Tarefa não encontrada' });
  if (task.status === 'concluida') return res.status(400).json({ error: 'Tarefa já concluída' });

  // Close any open session for this user on other tasks
  const openSession = db.prepare('SELECT * FROM task_sessions WHERE task_id = ? AND ended_at IS NULL').get(id) as any;
  if (openSession) return res.status(400).json({ error: 'Timer já está rodando' });

  db.prepare("INSERT INTO task_sessions (task_id, user_id, started_at) VALUES (?, ?, datetime('now'))").run(id, req.user.id);
  db.prepare("UPDATE tasks SET status = 'em_andamento', started_at = COALESCE(started_at, datetime('now')), updated_at = datetime('now') WHERE id = ?").run(id);

  res.json({ ok: true });
});

/* ── Pause timer ──────────────────────────────────────────────────────── */
router.post('/:id/pause', (req, res) => {
  const id = Number(req.params.id);
  const session = db.prepare('SELECT * FROM task_sessions WHERE task_id = ? AND ended_at IS NULL').get(id) as any;
  if (!session) return res.status(400).json({ error: 'Nenhum timer ativo' });

  const minutes = Math.round((Date.now() - new Date(session.started_at).getTime()) / 60000);
  db.prepare("UPDATE task_sessions SET ended_at = datetime('now'), minutes = ? WHERE id = ?").run(minutes, session.id);
  db.prepare("UPDATE tasks SET status = 'pausada', total_minutes = total_minutes + ?, updated_at = datetime('now') WHERE id = ?").run(minutes, id);

  res.json({ ok: true, minutes });
});

/* ── Complete ─────────────────────────────────────────────────────────── */
router.post('/:id/complete', (req, res) => {
  const id = Number(req.params.id);
  const { next_assigned_to, next_stage, next_title } = req.body;

  const session = db.prepare('SELECT * FROM task_sessions WHERE task_id = ? AND ended_at IS NULL').get(id) as any;
  let extraMinutes = 0;
  if (session) {
    extraMinutes = Math.round((Date.now() - new Date(session.started_at).getTime()) / 60000);
    db.prepare("UPDATE task_sessions SET ended_at = datetime('now'), minutes = ? WHERE id = ?").run(extraMinutes, session.id);
  }

  db.prepare("UPDATE tasks SET status = 'concluida', completed_at = datetime('now'), total_minutes = total_minutes + ?, updated_at = datetime('now') WHERE id = ?").run(extraMinutes, id);

  let nextTask = null;
  if (next_assigned_to) {
    const current = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as any;
    if (current) {
      const r = db.prepare(`
        INSERT INTO tasks (tenant_id, title, description, assigned_to, created_by, content_piece_id, campaign_id, agency_client_id, priority, due_date, stage, parent_task_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        current.tenant_id,
        next_title || current.title,
        current.description,
        next_assigned_to,
        req.user.id,
        current.content_piece_id,
        current.campaign_id,
        current.agency_client_id,
        current.priority,
        current.due_date,
        next_stage || 'geral',
        id
      );
      nextTask = db.prepare('SELECT t.*, u.name as assigned_name FROM tasks t LEFT JOIN users u ON u.id = t.assigned_to WHERE t.id = ?').get(r.lastInsertRowid);
    }
  }

  res.json({ ok: true, nextTask });
});

/* ── Sessions (history) ───────────────────────────────────────────────── */
router.get('/:id/sessions', (req, res) => {
  const sessions = db.prepare('SELECT * FROM task_sessions WHERE task_id = ? ORDER BY started_at DESC').all(Number(req.params.id));
  res.json(sessions);
});

/* ── Comments ─────────────────────────────────────────────────────────── */
router.get('/:id/comments', (req, res) => {
  const comments = db.prepare(`
    SELECT tc.*, u.name as user_name, u.avatar as user_avatar
    FROM task_comments tc
    LEFT JOIN users u ON u.id = tc.user_id
    WHERE tc.task_id = ?
    ORDER BY tc.created_at ASC
  `).all(Number(req.params.id));
  res.json(comments);
});

router.post('/:id/comments', (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'Conteúdo obrigatório' });
  const r = db.prepare(`INSERT INTO task_comments (task_id, user_id, content) VALUES (?, ?, ?)`).run(Number(req.params.id), req.user.id, content);
  const comment = db.prepare(`
    SELECT tc.*, u.name as user_name, u.avatar as user_avatar
    FROM task_comments tc LEFT JOIN users u ON u.id = tc.user_id WHERE tc.id = ?
  `).get(r.lastInsertRowid);
  res.status(201).json(comment);
});

export default router;
