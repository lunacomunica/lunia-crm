import { Router } from 'express';
import db from '../db.js';

const router = Router();

// Webhook verification (public — no auth)
router.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const verifyToken =
    (db.prepare("SELECT value FROM settings WHERE key='meta_verify_token' LIMIT 1").get() as any)?.value ||
    process.env.META_VERIFY_TOKEN || 'lunia_webhook_token';

  if (mode === 'subscribe' && token === verifyToken) {
    res.send(challenge);
  } else {
    res.status(403).json({ error: 'Verificação falhou' });
  }
});

// Webhook receiver (public — no auth, Meta sends events here)
router.post('/webhook', (req, res) => {
  res.sendStatus(200);
  const body = req.body;
  if (!body?.object) return;

  // Use tenant_id=1 for webhook events (can be extended with per-tenant verify tokens)
  const tid = 1;

  for (const entry of body.entry || []) {
    for (const change of entry.changes || []) {
      if (change.field === 'messages') {
        const msgs = change.value?.messages || [];
        const contacts = change.value?.contacts || [];

        for (const msg of msgs) {
          const from = msg.from;
          const name = contacts.find((c: any) => c.wa_id === from)?.profile?.name || from;

          let contact = db.prepare('SELECT * FROM contacts WHERE tenant_id=? AND (external_id=? OR phone=?)').get(tid, from, `+${from}`) as any;
          if (!contact) {
            const r = db.prepare(`INSERT INTO contacts (tenant_id, name, phone, source, external_id) VALUES (?, ?, ?, 'whatsapp', ?)`).run(tid, name, `+${from}`, from);
            contact = db.prepare('SELECT * FROM contacts WHERE id=?').get(r.lastInsertRowid);
          }

          let conv = db.prepare('SELECT * FROM conversations WHERE tenant_id=? AND external_id=?').get(tid, from) as any;
          if (!conv) {
            const r = db.prepare(`INSERT INTO conversations (tenant_id, contact_id, platform, external_id) VALUES (?, ?, 'whatsapp', ?)`).run(tid, contact.id, from);
            conv = db.prepare('SELECT * FROM conversations WHERE id=?').get(r.lastInsertRowid);
          }

          const content = msg.text?.body || msg.caption || '[mídia]';
          db.prepare(`INSERT INTO messages (conversation_id, content, direction, external_id) VALUES (?, ?, 'inbound', ?)`).run(conv.id, content, msg.id);
          db.prepare("UPDATE conversations SET last_message_at=datetime('now'), unread_count=unread_count+1 WHERE id=?").run(conv.id);
        }
      }

      if (change.field === 'leadgen') {
        const { leadgen_id, form_id, ad_id } = change.value || {};
        if (leadgen_id) {
          try { db.prepare(`INSERT OR IGNORE INTO instagram_leads (tenant_id, form_id, lead_id, ad_id, data) VALUES (?, ?, ?, ?, '{}')`).run(1, form_id, leadgen_id, ad_id); } catch {}
        }
      }
    }
  }
});

router.get('/instagram-leads', (req, res) => {
  const leads = db.prepare(`
    SELECT il.*, c.name as contact_name FROM instagram_leads il
    LEFT JOIN contacts c ON il.contact_id = c.id
    WHERE il.tenant_id=? ORDER BY il.created_at DESC
  `).all(req.user.tenant_id) as any[];
  res.json(leads.map(l => ({ ...l, data: JSON.parse(l.data || '{}') })));
});

router.delete('/instagram-leads/:id', (req, res) => {
  const tid = req.user.tenant_id;
  const lead = db.prepare('SELECT id FROM instagram_leads WHERE id=? AND tenant_id=?').get(req.params.id, tid);
  if (!lead) return res.status(404).json({ error: 'Lead não encontrado' });
  db.prepare('DELETE FROM instagram_leads WHERE id=? AND tenant_id=?').run(req.params.id, tid);
  res.json({ ok: true });
});

router.post('/instagram-leads/:id/convert', (req, res) => {
  const tid = req.user.tenant_id;
  const lead = db.prepare('SELECT * FROM instagram_leads WHERE id=? AND tenant_id=?').get(req.params.id, tid) as any;
  if (!lead) return res.status(404).json({ error: 'Lead não encontrado' });

  const data = JSON.parse(lead.data || '{}');
  const result = db.prepare(`INSERT INTO contacts (tenant_id, name, email, phone, source) VALUES (?, ?, ?, ?, 'ads')`).run(
    tid, data.name || 'Lead de Anúncio', data.email || null, data.phone || null
  );
  db.prepare('UPDATE instagram_leads SET contact_id=? WHERE id=?').run(result.lastInsertRowid, req.params.id);
  res.json(db.prepare('SELECT * FROM contacts WHERE id=?').get(result.lastInsertRowid));
});

export default router;
