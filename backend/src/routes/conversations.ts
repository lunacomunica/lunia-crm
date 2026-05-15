import { Router } from 'express';
import db from '../db.js';
import https from 'https';

const router = Router();

router.get('/', (req, res) => {
  const tid = req.user.tenant_id;
  const { platform, agency_client_id } = req.query as Record<string, string>;

  let query = `
    SELECT cv.*, c.name as contact_name, c.phone as contact_phone, c.avatar_url,
      ac.name as agency_client_name, ac.logo as agency_client_logo,
      (SELECT content FROM messages WHERE conversation_id = cv.id ORDER BY timestamp DESC LIMIT 1) as last_message,
      (SELECT timestamp FROM messages WHERE conversation_id = cv.id ORDER BY timestamp DESC LIMIT 1) as last_message_time
    FROM conversations cv
    LEFT JOIN contacts c ON cv.contact_id = c.id
    LEFT JOIN agency_clients ac ON cv.agency_client_id = ac.id
    WHERE cv.tenant_id = ?
  `;
  const params: any[] = [tid];

  if (platform && platform !== 'all') { query += ' AND cv.platform = ?'; params.push(platform); }
  if (agency_client_id && agency_client_id !== 'all') { query += ' AND cv.agency_client_id = ?'; params.push(agency_client_id); }
  query += ' ORDER BY cv.last_message_at DESC';

  res.json(db.prepare(query).all(...params));
});

router.get('/:id/messages', (req, res) => {
  const conv = db.prepare('SELECT id FROM conversations WHERE id = ? AND tenant_id = ?').get(req.params.id, req.user.tenant_id);
  if (!conv) return res.status(404).json({ error: 'Conversa não encontrada' });
  res.json(db.prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY timestamp ASC').all(req.params.id));
});

router.post('/:id/messages', (req, res) => {
  const { content } = req.body;
  const conv = db.prepare('SELECT * FROM conversations WHERE id = ? AND tenant_id = ?').get(req.params.id, req.user.tenant_id);
  if (!conv) return res.status(404).json({ error: 'Conversa não encontrada' });

  const result = db.prepare(`
    INSERT INTO messages (conversation_id, content, direction, status) VALUES (?, ?, 'outbound', 'sent')
  `).run(req.params.id, content);

  db.prepare("UPDATE conversations SET last_message_at=datetime('now'), unread_count=0 WHERE id=?").run(req.params.id);

  res.status(201).json(db.prepare('SELECT * FROM messages WHERE id = ?').get(result.lastInsertRowid));
});

router.patch('/:id/read', (req, res) => {
  db.prepare('UPDATE conversations SET unread_count=0 WHERE id=? AND tenant_id=?').run(req.params.id, req.user.tenant_id);
  res.json({ success: true });
});

// Send Instagram reply (DM or comment)
router.post('/:id/ig-reply', async (req, res) => {
  const conv = db.prepare('SELECT cv.*, ac.instagram_token, ac.instagram_user_id FROM conversations cv LEFT JOIN agency_clients ac ON cv.agency_client_id = ac.id WHERE cv.id=? AND cv.tenant_id=?').get(req.params.id, req.user.tenant_id) as any;
  if (!conv) return res.status(404).json({ error: 'Conversa não encontrada' });

  const { recipient_id, text } = req.body as { recipient_id: string; text: string };
  const token = conv.instagram_token;
  if (!token) return res.status(400).json({ error: 'Cliente sem token Instagram. Reconecte via OAuth.' });

  try {
    let apiUrl: string;
    if (conv.conv_type === 'comment') {
      // Reply to comment — extract original comment external_id
      const lastMsg = db.prepare('SELECT external_id FROM messages WHERE conversation_id=? AND direction=? ORDER BY timestamp DESC LIMIT 1').get(conv.id, 'inbound') as any;
      apiUrl = `https://graph.facebook.com/v19.0/${lastMsg?.external_id}/replies`;
    } else {
      apiUrl = `https://graph.facebook.com/v19.0/me/messages`;
    }

    const payload = conv.conv_type === 'comment'
      ? JSON.stringify({ message: text, access_token: token })
      : JSON.stringify({ recipient: { id: recipient_id }, message: { text }, access_token: token });

    const result = await new Promise<any>((resolve, reject) => {
      const url = new URL(apiUrl);
      const options = { hostname: url.hostname, path: url.pathname + url.search, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } };
      const r = https.request(options, resp => {
        let d = ''; resp.on('data', c => { d += c; }); resp.on('end', () => { try { resolve(JSON.parse(d)); } catch { reject(new Error('parse')); } });
      });
      r.on('error', reject); r.write(payload); r.end();
    });

    if (result.error) return res.status(400).json({ error: result.error.message });

    const saved = db.prepare(`INSERT INTO messages (conversation_id, content, direction, external_id, status) VALUES (?, ?, 'outbound', ?, 'sent')`).run(conv.id, text, result.id || result.message_id || null);
    db.prepare("UPDATE conversations SET last_message_at=datetime('now'), unread_count=0 WHERE id=?").run(conv.id);
    res.status(201).json(db.prepare('SELECT * FROM messages WHERE id=?').get(saved.lastInsertRowid));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
