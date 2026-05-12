import { Router } from 'express';
import db from '../db.js';
import https from 'https';

const router = Router();

function httpsGet(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch { reject(new Error('JSON parse failed')); }
      });
    }).on('error', reject);
  });
}

// Generate Meta OAuth URL for a specific agency client
router.get('/auth', (req, res) => {
  const clientId = req.query.client_id as string;
  if (!clientId) return res.status(400).json({ error: 'client_id obrigatório' });

  const appId = process.env.META_APP_ID;
  const redirectUri = process.env.META_REDIRECT_URI || 'https://app.lunacomunica.com/api/meta/callback';
  if (!appId) return res.status(500).json({ error: 'META_APP_ID não configurado' });

  const state = Buffer.from(`${req.user.tenant_id}:${clientId}`).toString('base64');
  const scopes = 'pages_show_list,pages_read_engagement,instagram_business_basic,instagram_business_content_publish,instagram_business_manage_insights';
  const url = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}&state=${state}&response_type=code`;
  res.json({ url });
});

// Return IG connection status for a client
router.get('/instagram-status/:clientId', (req, res) => {
  const client = db.prepare('SELECT instagram_user_id, instagram_token_expires FROM agency_clients WHERE id=? AND tenant_id=?')
    .get(req.params.clientId, req.user.tenant_id) as any;
  if (!client) return res.status(404).json({ error: 'Cliente não encontrado' });
  res.json({
    connected: !!client.instagram_user_id,
    instagram_user_id: client.instagram_user_id || null,
    expires_at: client.instagram_token_expires || null,
  });
});

// Test Instagram token for a client
router.get('/test-instagram/:clientId', async (req, res) => {
  const client = db.prepare('SELECT instagram_token, instagram_user_id FROM agency_clients WHERE id=? AND tenant_id=?')
    .get(req.params.clientId, req.user.tenant_id) as any;
  if (!client?.instagram_token) return res.status(400).json({ success: false, message: 'Nenhum token configurado' });
  try {
    const data = await httpsGet(`https://graph.facebook.com/v19.0/me?access_token=${client.instagram_token}&fields=name,id`);
    if (data.error) return res.json({ success: false, message: data.error.message });
    res.json({ success: true, message: `Conectado como ${data.name || data.id}` });
  } catch (e: any) {
    res.json({ success: false, message: e.message });
  }
});

// Disconnect IG for a client
router.delete('/instagram-status/:clientId', (req, res) => {
  db.prepare("UPDATE agency_clients SET instagram_token=NULL, instagram_user_id=NULL, instagram_token_expires=NULL WHERE id=? AND tenant_id=?")
    .run(req.params.clientId, req.user.tenant_id);
  res.json({ ok: true });
});

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
