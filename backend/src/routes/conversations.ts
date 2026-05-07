import { Router } from 'express';
import db from '../db.js';

const router = Router();

router.get('/', (req, res) => {
  const { platform } = req.query as Record<string, string>;

  let query = `
    SELECT cv.*, c.name as contact_name, c.phone as contact_phone, c.avatar_url,
      (SELECT content FROM messages WHERE conversation_id = cv.id ORDER BY timestamp DESC LIMIT 1) as last_message,
      (SELECT timestamp FROM messages WHERE conversation_id = cv.id ORDER BY timestamp DESC LIMIT 1) as last_message_time
    FROM conversations cv
    LEFT JOIN contacts c ON cv.contact_id = c.id WHERE 1=1
  `;
  const params: any[] = [];

  if (platform && platform !== 'all') { query += ' AND cv.platform = ?'; params.push(platform); }
  query += ' ORDER BY cv.last_message_at DESC';

  res.json(db.prepare(query).all(...params));
});

router.get('/:id/messages', (req, res) => {
  res.json(db.prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY timestamp ASC').all(req.params.id));
});

router.post('/:id/messages', (req, res) => {
  const { content } = req.body;
  const conv = db.prepare('SELECT * FROM conversations WHERE id = ?').get(req.params.id);
  if (!conv) return res.status(404).json({ error: 'Conversa não encontrada' });

  const result = db.prepare(`
    INSERT INTO messages (conversation_id, content, direction, status) VALUES (?, ?, 'outbound', 'sent')
  `).run(req.params.id, content);

  db.prepare("UPDATE conversations SET last_message_at=datetime('now'), unread_count=0 WHERE id=?").run(req.params.id);

  res.status(201).json(db.prepare('SELECT * FROM messages WHERE id = ?').get(result.lastInsertRowid));
});

router.patch('/:id/read', (req, res) => {
  db.prepare('UPDATE conversations SET unread_count=0 WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

export default router;
