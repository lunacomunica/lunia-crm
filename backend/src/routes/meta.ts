import { Router } from 'express';
import db from '../db.js';

const router = Router();

// Webhook verification
router.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const verifyToken =
    (db.prepare("SELECT value FROM settings WHERE key='meta_verify_token'").get() as any)?.value ||
    process.env.META_VERIFY_TOKEN ||
    'lunia_webhook_token';

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('✅ Webhook verificado pela Meta');
    res.send(challenge);
  } else {
    res.status(403).json({ error: 'Verificação falhou' });
  }
});

// Webhook receiver
router.post('/webhook', (req, res) => {
  res.sendStatus(200);

  const body = req.body;
  if (!body?.object) return;

  for (const entry of body.entry || []) {
    for (const change of entry.changes || []) {
      // WhatsApp messages
      if (change.field === 'messages') {
        const msgs = change.value?.messages || [];
        const contacts = change.value?.contacts || [];

        for (const msg of msgs) {
          const from = msg.from;
          const waContact = contacts.find((c: any) => c.wa_id === from);
          const contactName = waContact?.profile?.name || from;

          let contact = db.prepare('SELECT * FROM contacts WHERE external_id = ? OR phone = ?').get(from, `+${from}`) as any;
          if (!contact) {
            const r = db.prepare(`INSERT INTO contacts (name, phone, source, external_id) VALUES (?, ?, 'whatsapp', ?)`).run(contactName, `+${from}`, from);
            contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(r.lastInsertRowid);
          }

          let conv = db.prepare('SELECT * FROM conversations WHERE external_id = ?').get(from) as any;
          if (!conv) {
            const r = db.prepare(`INSERT INTO conversations (contact_id, platform, external_id) VALUES (?, 'whatsapp', ?)`).run(contact.id, from);
            conv = db.prepare('SELECT * FROM conversations WHERE id = ?').get(r.lastInsertRowid);
          }

          const content = msg.text?.body || msg.caption || '[mídia]';
          db.prepare(`INSERT INTO messages (conversation_id, content, direction, external_id) VALUES (?, ?, 'inbound', ?)`).run(conv.id, content, msg.id);
          db.prepare("UPDATE conversations SET last_message_at=datetime('now'), unread_count=unread_count+1 WHERE id=?").run(conv.id);
          console.log(`📱 WhatsApp de ${contactName}: ${content}`);
        }
      }

      // Instagram Lead Ads
      if (change.field === 'leadgen') {
        const { leadgen_id, form_id, ad_id } = change.value || {};
        if (leadgen_id) {
          try {
            db.prepare(`INSERT OR IGNORE INTO instagram_leads (form_id, lead_id, ad_id, data) VALUES (?, ?, ?, '{}')`).run(form_id, leadgen_id, ad_id);
            console.log(`📊 Novo lead do Instagram Ads: ${leadgen_id}`);
          } catch (_) {}
        }
      }
    }
  }
});

// GET Instagram leads
router.get('/instagram-leads', (_req, res) => {
  const leads = db.prepare(`
    SELECT il.*, c.name as contact_name FROM instagram_leads il
    LEFT JOIN contacts c ON il.contact_id = c.id
    ORDER BY il.created_at DESC
  `).all() as any[];

  res.json(leads.map(l => ({ ...l, data: JSON.parse(l.data || '{}') })));
});

// Convert lead to contact
router.post('/instagram-leads/:id/convert', (req, res) => {
  const lead = db.prepare('SELECT * FROM instagram_leads WHERE id = ?').get(req.params.id) as any;
  if (!lead) return res.status(404).json({ error: 'Lead não encontrado' });

  const data = JSON.parse(lead.data || '{}');
  const result = db.prepare(`INSERT INTO contacts (name, email, phone, source) VALUES (?, ?, ?, 'ads')`).run(
    data.name || 'Lead de Anúncio', data.email || null, data.phone || null
  );

  db.prepare('UPDATE instagram_leads SET contact_id=? WHERE id=?').run(result.lastInsertRowid, req.params.id);
  res.json(db.prepare('SELECT * FROM contacts WHERE id = ?').get(result.lastInsertRowid));
});

export default router;
