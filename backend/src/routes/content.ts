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
  q += ' GROUP BY fb.id ORDER BY fb.agency_client_id, fb.year, fb.month';
  res.json(db.prepare(q).all(...params));
});

router.post('/batches', (req, res) => {
  const { agency_client_id, month, year } = req.body;
  if (!agency_client_id || !month || !year) return res.status(400).json({ error: 'Campos obrigatórios' });
  const shortYear = String(year).slice(-2);
  const name = `Feed ${MONTHS_PT[Number(month) - 1]}/${shortYear}`;
  const r = db.prepare('INSERT INTO feed_batches (tenant_id, agency_client_id, name, month, year, order_num) VALUES (?, ?, ?, ?, ?, ?)')
    .run(req.user.tenant_id, agency_client_id, name, month, year, 0);
  res.status(201).json(db.prepare('SELECT fb.*, ac.name as client_name FROM feed_batches fb LEFT JOIN agency_clients ac ON fb.agency_client_id = ac.id WHERE fb.id=?').get(r.lastInsertRowid));
});

router.delete('/batches/:id', (req, res) => {
  const bid = req.params.id;
  const tid = req.user.tenant_id;
  // Delete tasks linked to content pieces in this batch
  db.prepare(`DELETE FROM tasks WHERE content_piece_id IN (SELECT id FROM content_pieces WHERE batch_id = ? AND tenant_id = ?)`).run(bid, tid);
  // Delete content pieces in this batch
  db.prepare('DELETE FROM content_pieces WHERE batch_id = ? AND tenant_id = ?').run(bid, tid);
  // Delete the batch itself
  db.prepare('DELETE FROM feed_batches WHERE id = ? AND tenant_id = ?').run(bid, tid);
  res.json({ ok: true });
});

// ── Production overview (all batches with workflow status) ───────────────────
router.get('/batches/production', (req, res) => {
  const rows = db.prepare(`
    SELECT
      fb.id, fb.name, fb.month, fb.year, fb.agency_client_id,
      fb.default_template_id,
      wt.name as template_name,
      ac.name as client_name, ac.logo as client_logo,
      COUNT(DISTINCT cp.id) as post_count,
      COUNT(DISTINCT t.id) as task_count,
      SUM(CASE WHEN t.status = 'concluida' THEN 1 ELSE 0 END) as tasks_done,
      SUM(CASE WHEN t.status != 'concluida' THEN 1 ELSE 0 END) as tasks_open
    FROM feed_batches fb
    LEFT JOIN agency_clients ac ON ac.id = fb.agency_client_id
    LEFT JOIN workflow_templates wt ON wt.id = fb.default_template_id
    LEFT JOIN content_pieces cp ON cp.batch_id = fb.id AND cp.tenant_id = fb.tenant_id
    LEFT JOIN tasks t ON t.content_piece_id = cp.id
      AND t.stage IN ('copy','design','edicao','revisao')
      AND t.tenant_id = fb.tenant_id
    WHERE fb.tenant_id = ?
    GROUP BY fb.id
    ORDER BY ac.name ASC, fb.year DESC, fb.month DESC
  `).all(req.user.tenant_id);
  res.json(rows);
});

// ── Bulk create feeds for multiple clients ───────────────────────────────────
router.post('/batches/bulk-create', (req, res) => {
  const { clients, month, year, default_template_id } = req.body as {
    clients: { id: number; post_count?: number }[]; month: number; year: number; default_template_id?: number;
  };
  if (!clients?.length || !month || !year) return res.status(400).json({ error: 'clients, month e year obrigatórios' });

  const MONTHS_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

  // Load template stages once if needed
  let templateStages: any[] | null = null;
  if (default_template_id) {
    const tpl = db.prepare('SELECT stages FROM workflow_templates WHERE id = ? AND tenant_id = ?').get(default_template_id, req.user.tenant_id) as any;
    if (tpl) { try { templateStages = JSON.parse(tpl.stages); } catch {} }
  }

  const batchDueDate = new Date(Number(year), Number(month), 0).toISOString().slice(0, 10);

  const created: any[] = [];
  const skipped: number[] = [];

  for (const client of clients) {
    const clientId = client.id;
    const postCount = client.post_count || 0;
    const existing = db.prepare('SELECT id FROM feed_batches WHERE tenant_id=? AND agency_client_id=? AND month=? AND year=?').get(req.user.tenant_id, clientId, month, year) as any;
    if (existing) { skipped.push(clientId); continue; }
    const orderNum = ((db.prepare('SELECT COUNT(*) as c FROM feed_batches WHERE tenant_id=? AND agency_client_id=?').get(req.user.tenant_id, clientId) as any).c as number) + 1;
    const name = `${String(orderNum).padStart(2, '0')} | Feed ${MONTHS_PT[Number(month) - 1]}`;
    const batchResult = db.prepare('INSERT INTO feed_batches (tenant_id, agency_client_id, name, month, year, order_num, default_template_id) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(req.user.tenant_id, clientId, name, month, year, orderNum, default_template_id || null);
    const batchId = batchResult.lastInsertRowid as number;

    // Create posts
    const postsCreated: number[] = [];
    for (let i = 1; i <= postCount; i++) {
      const postTitle = `Post ${i}`;
      const postResult = db.prepare(`INSERT INTO content_pieces (tenant_id, agency_client_id, title, type, status, batch_id, created_by) VALUES (?, ?, ?, 'estatico', 'em_criacao', ?, ?)`)
        .run(req.user.tenant_id, clientId, postTitle, batchId, req.user.id);
      postsCreated.push(postResult.lastInsertRowid as number);

      // Auto-apply template
      if (templateStages) {
        for (const s of templateStages) {
          if (!s.active) continue;
          db.prepare(`INSERT INTO tasks (tenant_id, title, assigned_to, created_by, content_piece_id, agency_client_id, priority, stage, status, due_date) VALUES (?, ?, ?, ?, ?, ?, 'alta', ?, 'a_fazer', ?)`)
            .run(req.user.tenant_id, `${s.label}: ${postTitle}`, s.assigned_to || null, req.user.id, postsCreated[postsCreated.length - 1], clientId, s.stage, s.due_date || batchDueDate);
        }
      }
    }

    created.push({ id: batchId, agency_client_id: clientId, name, posts_created: postsCreated.length });
  }
  res.json({ created, skipped });
});

// ── Bulk workflow (apply to multiple batches) ────────────────────────────────
router.post('/batches/bulk-workflow', (req, res) => {
  const { batch_ids, stages, template_id } = req.body as {
    batch_ids: number[];
    stages: { stage: string; label: string; active: boolean; assigned_to?: number; due_date?: string }[];
    template_id?: number;
  };
  if (!batch_ids?.length || !stages?.length) return res.status(400).json({ error: 'batch_ids e stages obrigatórios' });

  let created = 0;
  for (const batchId of batch_ids) {
    const batch = db.prepare('SELECT * FROM feed_batches WHERE id = ? AND tenant_id = ?').get(batchId, req.user.tenant_id) as any;
    if (!batch) continue;
    // Set default template on the feed so future posts auto-inherit it
    if (template_id) {
      db.prepare('UPDATE feed_batches SET default_template_id = ? WHERE id = ? AND tenant_id = ?').run(template_id, batchId, req.user.tenant_id);
    }
    const fallbackDue = new Date(Number(batch.year), Number(batch.month), 0).toISOString().slice(0, 10);
    const posts = db.prepare('SELECT * FROM content_pieces WHERE batch_id = ? AND tenant_id = ?').all(batchId, req.user.tenant_id) as any[];
    for (const post of posts) {
      for (const s of stages) {
        if (!s.active) continue;
        const exists = db.prepare('SELECT id FROM tasks WHERE content_piece_id = ? AND stage = ? AND tenant_id = ?').get(post.id, s.stage, req.user.tenant_id);
        if (exists) continue;
        db.prepare(`INSERT INTO tasks (tenant_id, title, assigned_to, created_by, content_piece_id, agency_client_id, priority, stage, status, due_date) VALUES (?, ?, ?, ?, ?, ?, 'alta', ?, 'a_fazer', ?)`).run(
          req.user.tenant_id,
          `${s.label}: ${post.title}`,
          s.assigned_to || null,
          req.user.id,
          post.id,
          post.agency_client_id,
          s.stage,
          s.due_date || fallbackDue
        );
        created++;
      }
    }
  }
  res.json({ created });
});

router.post('/batches/:id/workflow', (req, res) => {
  const batch = db.prepare('SELECT * FROM feed_batches WHERE id = ? AND tenant_id = ?').get(req.params.id, req.user.tenant_id) as any;
  if (!batch) return res.status(404).json({ error: 'Feed não encontrado' });

  const posts = db.prepare('SELECT * FROM content_pieces WHERE batch_id = ? AND tenant_id = ?').all(req.params.id, req.user.tenant_id) as any[];
  const { stages } = req.body as { stages: { stage: string; label: string; active: boolean; assigned_to?: number; due_date?: string }[] };

  let created = 0;
  for (const post of posts) {
    for (const s of stages) {
      if (!s.active) continue;
      const exists = db.prepare('SELECT id FROM tasks WHERE content_piece_id = ? AND stage = ? AND tenant_id = ?').get(post.id, s.stage, req.user.tenant_id);
      if (exists) continue;
      db.prepare(`INSERT INTO tasks (tenant_id, title, assigned_to, created_by, content_piece_id, agency_client_id, priority, stage, status, due_date) VALUES (?, ?, ?, ?, ?, ?, 'alta', ?, 'a_fazer', ?)`).run(
        req.user.tenant_id,
        `${s.label}: ${post.title}`,
        s.assigned_to || null,
        req.user.id,
        post.id,
        post.agency_client_id,
        s.stage,
        s.due_date || null
      );
      created++;
    }
  }
  res.json({ created, posts: posts.length });
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

  const newPostId = r.lastInsertRowid as number;

  // Auto-apply template if feed has one
  if (batch_id) {
    const batch = db.prepare(`
      SELECT fb.default_template_id, fb.month, fb.year, wt.stages as template_stages
      FROM feed_batches fb
      LEFT JOIN workflow_templates wt ON wt.id = fb.default_template_id
      WHERE fb.id = ? AND fb.tenant_id = ?
    `).get(batch_id, req.user.tenant_id) as any;

    if (batch?.default_template_id && batch?.template_stages) {
      try {
        const stages = JSON.parse(batch.template_stages);
        const fallbackDue = new Date(Number(batch.year), Number(batch.month), 0).toISOString().slice(0, 10);
        for (const s of stages) {
          if (!s.active) continue;
          db.prepare(`INSERT INTO tasks (tenant_id, title, assigned_to, created_by, content_piece_id, agency_client_id, priority, stage, status, due_date) VALUES (?, ?, ?, ?, ?, ?, 'alta', ?, 'a_fazer', ?)`).run(
            req.user.tenant_id,
            `${s.label}: ${title}`,
            s.assigned_to || null,
            req.user.id,
            newPostId,
            agency_client_id,
            s.stage,
            s.due_date || fallbackDue
          );
        }
      } catch {}
    }
  }

  res.status(201).json(db.prepare(`SELECT cp.*, ac.name as client_name FROM content_pieces cp
    LEFT JOIN agency_clients ac ON cp.agency_client_id = ac.id WHERE cp.id = ?`).get(newPostId));
});

router.get('/:id/tasks', (req, res) => {
  const piece = db.prepare('SELECT id FROM content_pieces WHERE id = ? AND tenant_id = ?').get(req.params.id, req.user.tenant_id);
  if (!piece) return res.status(404).json({ error: 'Post não encontrado' });
  const tasks = db.prepare(`
    SELECT t.*, u.name as assignee_name
    FROM tasks t
    LEFT JOIN users u ON t.assigned_to = u.id
    WHERE t.content_piece_id = ? AND t.tenant_id = ?
    ORDER BY
      CASE t.stage WHEN 'copy' THEN 1 WHEN 'design' THEN 2 WHEN 'edicao' THEN 3 WHEN 'revisao' THEN 4 ELSE 5 END,
      t.created_at ASC
  `).all(req.params.id, req.user.tenant_id);
  res.json(tasks);
});

router.post('/:id/workflow', (req, res) => {
  const piece = db.prepare('SELECT * FROM content_pieces WHERE id = ? AND tenant_id = ?').get(req.params.id, req.user.tenant_id) as any;
  if (!piece) return res.status(404).json({ error: 'Post não encontrado' });
  const { stages } = req.body as { stages: { stage: string; label: string; active: boolean; assigned_to?: number; due_date?: string }[] };
  let created = 0;
  for (const s of stages) {
    if (!s.active) continue;
    const exists = db.prepare('SELECT id FROM tasks WHERE content_piece_id = ? AND stage = ? AND tenant_id = ?').get(piece.id, s.stage, req.user.tenant_id);
    if (exists) continue;
    db.prepare(`INSERT INTO tasks (tenant_id, title, assigned_to, created_by, content_piece_id, agency_client_id, priority, stage, status, due_date) VALUES (?, ?, ?, ?, ?, ?, 'alta', ?, 'a_fazer', ?)`).run(
      req.user.tenant_id,
      `${s.label}: ${piece.title}`,
      s.assigned_to || null,
      req.user.id,
      piece.id,
      piece.agency_client_id,
      s.stage,
      s.due_date || null
    );
    created++;
  }
  const tasks = db.prepare(`
    SELECT t.*, u.name as assignee_name
    FROM tasks t LEFT JOIN users u ON t.assigned_to = u.id
    WHERE t.content_piece_id = ? AND t.tenant_id = ?
      AND t.stage IN ('copy','design','edicao','revisao')
    ORDER BY CASE t.stage WHEN 'copy' THEN 1 WHEN 'design' THEN 2 WHEN 'edicao' THEN 3 WHEN 'revisao' THEN 4 END
  `).all(piece.id, req.user.tenant_id);
  res.json({ created, tasks });
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM content_pieces WHERE id = ? AND tenant_id = ?').get(req.params.id, req.user.tenant_id) as any;
  if (!existing) return res.status(404).json({ error: 'Conteúdo não encontrado' });

  const { title, type, caption, media_url, scheduled_date, scheduled_time, objective, status, batch_id, copy_text, media_files, copy_hook, copy_cta, post_references } = req.body;
  const newStatus = status && VALID_STATUSES.includes(status) ? status : existing.status;

  db.prepare(`UPDATE content_pieces SET title=?, type=?, caption=?, media_url=?, scheduled_date=?, scheduled_time=?, objective=?, status=?, batch_id=?, copy_text=?, media_files=?, copy_hook=?, copy_cta=?, post_references=?, updated_at=datetime('now') WHERE id=? AND tenant_id=?`).run(
    title ?? existing.title, type ?? existing.type, caption ?? existing.caption,
    media_url ?? existing.media_url, scheduled_date ?? existing.scheduled_date,
    scheduled_time !== undefined ? (scheduled_time || null) : existing.scheduled_time,
    objective ?? existing.objective, newStatus, batch_id !== undefined ? batch_id : existing.batch_id,
    copy_text ?? existing.copy_text,
    media_files !== undefined ? media_files : (existing.media_files ?? '[]'),
    copy_hook ?? existing.copy_hook ?? '',
    copy_cta ?? existing.copy_cta ?? '',
    post_references !== undefined ? post_references : (existing.post_references ?? '[]'),
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

/* ── Bulk delete by status (admin cleanup) ───────────────────────────────── */
router.delete('/bulk-by-status', (req, res) => {
  const { status, agency_client_id } = req.body as { status: string; agency_client_id?: number };
  if (!status) return res.status(400).json({ error: 'status é obrigatório' });
  let sql = 'DELETE FROM content_pieces WHERE tenant_id = ? AND status = ?';
  const params: any[] = [req.user.tenant_id, status];
  if (agency_client_id) { sql += ' AND agency_client_id = ?'; params.push(agency_client_id); }
  const r = db.prepare(sql).run(...params);
  res.json({ deleted: r.changes });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM content_pieces WHERE id = ? AND tenant_id = ?').run(req.params.id, req.user.tenant_id);
  res.json({ ok: true });
});

export default router;
