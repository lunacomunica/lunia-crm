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
  const scopes = 'instagram_business_basic,instagram_content_publish,instagram_manage_insights,instagram_manage_comments,pages_show_list,pages_read_engagement';
  const url = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}&state=${state}&response_type=code`;
  res.json({ url });
});

function getAgencyToken(tenantId: number): string | null {
  return (db.prepare("SELECT value FROM settings WHERE tenant_id=? AND key='meta_user_token'").get(tenantId) as any)?.value || null;
}

// Agency Meta token status
router.get('/agency-token', (req, res) => {
  const token = getAgencyToken(req.user.tenant_id);
  const expires = (db.prepare("SELECT value FROM settings WHERE tenant_id=? AND key='meta_user_token_expires'").get(req.user.tenant_id) as any)?.value || null;
  res.json({ connected: !!token, expires_at: expires });
});

// Save agency token manually
router.post('/agency-token', async (req, res) => {
  const { token } = req.body as { token: string };
  if (!token) return res.status(400).json({ error: 'token obrigatório' });
  const upsert = db.prepare('INSERT OR REPLACE INTO settings (tenant_id, key, value) VALUES (?, ?, ?)');
  upsert.run(req.user.tenant_id, 'meta_user_token', token);
  // Try to get expiry info from token itself
  try {
    const info = await httpsGet(`https://graph.facebook.com/v19.0/me?fields=name&access_token=${token}`);
    if (info.error) return res.status(400).json({ error: info.error.message });
    res.json({ ok: true, name: info.name });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// List all Instagram Business accounts (uses agency token)
router.get('/ig-accounts', async (req, res) => {
  const token = getAgencyToken(req.user.tenant_id);
  if (!token) return res.status(400).json({ error: 'Token da agência não configurado' });

  try {
    const pages = await httpsGet(`https://graph.facebook.com/v19.0/me/accounts?fields=id,name,instagram_business_account&access_token=${token}`);
    if (pages.error) return res.status(400).json({ error: pages.error.message });

    const accounts: any[] = [];
    for (const page of pages.data || []) {
      if (!page.instagram_business_account?.id) continue;
      const igId = page.instagram_business_account.id;
      try {
        const profile = await httpsGet(`https://graph.facebook.com/v19.0/${igId}?fields=id,name,username,profile_picture_url,followers_count&access_token=${token}`);
        accounts.push({
          ig_user_id: igId,
          name: profile.name || profile.username || page.name,
          username: profile.username,
          profile_picture_url: profile.profile_picture_url,
          followers_count: profile.followers_count,
          page_name: page.name,
        });
      } catch {}
    }
    res.json(accounts);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
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

// Account insights + recent media for a client
router.get('/insights/:clientId', async (req, res) => {
  const token = getAgencyToken(req.user.tenant_id);
  if (!token) return res.status(400).json({ error: 'Token da agência não configurado' });

  const client = db.prepare('SELECT instagram_user_id FROM agency_clients WHERE id=? AND tenant_id=?')
    .get(req.params.clientId, req.user.tenant_id) as any;
  if (!client?.instagram_user_id) return res.status(400).json({ error: 'Conta do Instagram não configurada para este cliente' });

  const igId = client.instagram_user_id;

  try {
    const since = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);
    const until = Math.floor(Date.now() / 1000);

    const [profile, media] = await Promise.all([
      httpsGet(`https://graph.facebook.com/v19.0/${igId}?fields=followers_count,media_count,name,biography,profile_picture_url&access_token=${token}`),
      httpsGet(`https://graph.facebook.com/v19.0/${igId}/media?fields=id,caption,media_type,media_url,thumbnail_url,timestamp,like_count,comments_count,permalink&limit=24&access_token=${token}`),
    ]);

    // Account insights
    let accountInsights: any = {};
    try {
      const ins = await httpsGet(`https://graph.facebook.com/v19.0/${igId}/insights?metric=reach,impressions,profile_views&period=day&since=${since}&until=${until}&access_token=${token}`);
      for (const m of ins.data || []) {
        const total = (m.values || []).reduce((s: number, v: any) => s + (v.value || 0), 0);
        accountInsights[m.name] = total;
      }
    } catch {}

    if (profile.error) return res.status(400).json({ error: profile.error.message });
    res.json({ profile, accountInsights, media: media.data || [] });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Individual media insights
router.get('/media-insights/:clientId/:mediaId', async (req, res) => {
  const token = getAgencyToken(req.user.tenant_id);
  if (!token) return res.status(400).json({ error: 'Token da agência não configurado' });

  try {
    const basic = await httpsGet(`https://graph.facebook.com/v19.0/${req.params.mediaId}?fields=id,media_type,like_count,comments_count,timestamp,permalink,caption,thumbnail_url,media_url&access_token=${token}`);
    let insights: any = {};
    try {
      const isVideo = basic.media_type === 'VIDEO' || basic.media_type === 'REELS';
      const metric = isVideo
        ? 'impressions,reach,plays,saved,shares,likes,comments,total_interactions,ig_reels_avg_watch_time,ig_reels_video_view_total_time'
        : 'impressions,reach,saved,shares,likes,comments,total_interactions,profile_visits,follows';
      const ins = await httpsGet(`https://graph.facebook.com/v19.0/${req.params.mediaId}/insights?metric=${metric}&period=lifetime&access_token=${token}`);
      for (const m of ins.data || []) insights[m.name] = m.values?.[0]?.value ?? m.value ?? 0;
    } catch (e1) {
      // Fallback to legacy metrics
      try {
        const metric2 = basic.media_type === 'VIDEO' ? 'impressions,reach,plays,saved,shares' : 'impressions,reach,saved,shares,engagement';
        const ins2 = await httpsGet(`https://graph.facebook.com/v19.0/${req.params.mediaId}/insights?metric=${metric2}&access_token=${token}`);
        for (const m of ins2.data || []) insights[m.name] = m.values?.[0]?.value ?? m.value ?? 0;
      } catch {}
    }
    // Fill likes/comments from basic if insights doesn't have them
    if (!insights.likes) insights.likes = basic.like_count ?? 0;
    if (!insights.comments) insights.comments = basic.comments_count ?? 0;

    // Fetch comments list
    let commentsList: any[] = [];
    try {
      const commentsRes = await httpsGet(`https://graph.facebook.com/v19.0/${req.params.mediaId}/comments?fields=id,text,timestamp,username,like_count,replies{id,text,timestamp,username}&limit=30&access_token=${token}`);
      commentsList = commentsRes.data || [];
    } catch {}

    res.json({ ...basic, insights, comments_list: commentsList });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Test agency token
router.get('/test-instagram/:clientId', async (req, res) => {
  const token = getAgencyToken(req.user.tenant_id);
  if (!token) return res.json({ success: false, message: 'Token da agência não configurado' });
  try {
    const data = await httpsGet(`https://graph.facebook.com/v19.0/me?access_token=${token}&fields=name,id`);
    if (data.error) return res.json({ success: false, message: data.error.message });
    res.json({ success: true, message: `Conectado como ${data.name || data.id}` });
  } catch (e: any) {
    res.json({ success: false, message: e.message });
  }
});

// ── Instagram Publishing ─────────────────────────────────────────────────────

async function httpsPost(url: string, body: Record<string, string>): Promise<any> {
  const qs = new URLSearchParams(body).toString();
  return new Promise((resolve, reject) => {
    const req = https.request(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(qs) } }, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch { reject(new Error('parse')); } });
    });
    req.on('error', reject);
    req.write(qs);
    req.end();
  });
}

const APP_URL = process.env.APP_URL || 'https://app.lunacomunica.com';

function toAbsoluteUrl(url: string): string {
  if (!url) return url;
  if (url.startsWith('http')) return url;
  return `${APP_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

// Core publish function — reusable by endpoint and cron
export async function publishToInstagram(tenantId: number, contentId: number): Promise<{ ig_media_id: string; ig_permalink: string }> {
  const token = (db.prepare("SELECT value FROM settings WHERE tenant_id=? AND key='meta_user_token'").get(tenantId) as any)?.value;
  if (!token) throw new Error('Token da agência não configurado');

  const piece = db.prepare('SELECT cp.*, ac.instagram_user_id FROM content_pieces cp LEFT JOIN agency_clients ac ON cp.agency_client_id = ac.id WHERE cp.id = ? AND cp.tenant_id = ?').get(contentId, tenantId) as any;
  if (!piece) throw new Error('Post não encontrado');
  if (!piece.instagram_user_id) throw new Error('Conta do Instagram não configurada para este cliente');

  const igId = piece.instagram_user_id;
  const caption = piece.caption || piece.copy_text || piece.title || '';
  const mediaFiles: { url: string; type: string }[] = JSON.parse(piece.media_files || '[]')
    .map((f: any) => ({ ...f, url: toAbsoluteUrl(f.url) }));

  let creationId: string;

  if (piece.type === 'carrossel' && mediaFiles.length > 1) {
    // Create item containers
    const children: string[] = [];
    for (const file of mediaFiles) {
      const isVideo = file.type === 'video';
      const params: Record<string, string> = { access_token: token, is_carousel_item: 'true' };
      if (isVideo) { params.media_type = 'VIDEO'; params.video_url = file.url; }
      else { params.image_url = file.url; }
      const item = await httpsPost(`https://graph.facebook.com/v19.0/${igId}/media`, params);
      if (item.error) throw new Error(item.error.message);
      children.push(item.id);
    }
    // Create carousel container
    const carousel = await httpsPost(`https://graph.facebook.com/v19.0/${igId}/media`, {
      media_type: 'CAROUSEL', children: children.join(','), caption, access_token: token,
    });
    if (carousel.error) throw new Error(carousel.error.message);
    creationId = carousel.id;

  } else if (piece.type === 'reels') {
    const videoFile = mediaFiles.find(f => f.type === 'video') || mediaFiles[0];
    if (!videoFile) throw new Error('Nenhum vídeo encontrado para o Reels');
    const container = await httpsPost(`https://graph.facebook.com/v19.0/${igId}/media`, {
      media_type: 'REELS', video_url: videoFile.url, caption, access_token: token,
    });
    if (container.error) throw new Error(container.error.message);
    creationId = container.id;
    // Wait for video processing (poll up to 60s)
    for (let i = 0; i < 12; i++) {
      await new Promise(r => setTimeout(r, 5000));
      const status = await httpsGet(`https://graph.facebook.com/v19.0/${creationId}?fields=status_code&access_token=${token}`);
      if (status.status_code === 'FINISHED') break;
      if (status.status_code === 'ERROR') throw new Error('Erro no processamento do vídeo');
    }

  } else {
    // Single image
    const imageFile = mediaFiles.find(f => f.type === 'image') || mediaFiles[0];
    const imageUrl = imageFile?.url || toAbsoluteUrl(piece.media_url);
    if (!imageUrl) throw new Error('Nenhuma imagem encontrada');
    const container = await httpsPost(`https://graph.facebook.com/v19.0/${igId}/media`, {
      image_url: imageUrl, caption, access_token: token,
    });
    if (container.error) throw new Error(container.error.message);
    creationId = container.id;
  }

  // Publish
  const published = await httpsPost(`https://graph.facebook.com/v19.0/${igId}/media_publish`, {
    creation_id: creationId, access_token: token,
  });
  if (published.error) throw new Error(published.error.message);

  const igMediaId = published.id;

  // Get permalink
  let igPermalink = '';
  try {
    const info = await httpsGet(`https://graph.facebook.com/v19.0/${igMediaId}?fields=permalink&access_token=${token}`);
    igPermalink = info.permalink || '';
  } catch {}

  // Update content piece
  db.prepare("UPDATE content_pieces SET ig_media_id=?, ig_permalink=?, status='publicado', updated_at=datetime('now') WHERE id=? AND tenant_id=?")
    .run(igMediaId, igPermalink, contentId, tenantId);

  return { ig_media_id: igMediaId, ig_permalink: igPermalink };
}

// POST /meta/publish/:clientId/:contentId — publish immediately
router.post('/publish/:clientId/:contentId', async (req, res) => {
  try {
    const result = await publishToInstagram(req.user.tenant_id, Number(req.params.contentId));
    res.json({ ok: true, ...result });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// POST /meta/link-ig/:clientId/:contentId — link existing post by URL or numeric ID
router.post('/link-ig/:clientId/:contentId', async (req, res) => {
  const token = getAgencyToken(req.user.tenant_id);
  if (!token) return res.status(400).json({ error: 'Token da agência não configurado' });

  const client = db.prepare('SELECT instagram_user_id FROM agency_clients WHERE id=? AND tenant_id=?')
    .get(req.params.clientId, req.user.tenant_id) as any;
  if (!client?.instagram_user_id) return res.status(400).json({ error: 'Conta do Instagram não configurada' });

  let { value } = req.body as { value: string };
  if (!value?.trim()) return res.status(400).json({ error: 'URL ou ID obrigatório' });
  value = value.trim();

  let mediaId: string;

  if (/^\d+$/.test(value)) {
    // Already a numeric ID
    mediaId = value;
  } else {
    // Extract shortcode from URL
    const match = value.match(/\/(?:p|reel)\/([A-Za-z0-9_-]+)/);
    if (!match) return res.status(400).json({ error: 'URL inválida — use o link do post do Instagram' });
    const shortcode = match[1];

    // Search in account media for matching shortcode
    try {
      let found: string | null = null;
      let url = `https://graph.facebook.com/v19.0/${client.instagram_user_id}/media?fields=id,shortcode,permalink&limit=50&access_token=${token}`;
      while (url && !found) {
        const page: any = await httpsGet(url);
        for (const m of page.data || []) {
          if (m.shortcode === shortcode || m.permalink?.includes(shortcode)) { found = m.id; break; }
        }
        url = page.paging?.next || null;
        if (!found && !page.paging?.next) break;
      }
      if (!found) return res.status(404).json({ error: 'Post não encontrado na conta. Verifique se é da conta correta.' });
      mediaId = found;
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  db.prepare("UPDATE content_pieces SET ig_media_id=?, status='publicado', updated_at=datetime('now') WHERE id=? AND tenant_id=?")
    .run(mediaId, req.params.contentId, req.user.tenant_id);
  res.json(db.prepare('SELECT * FROM content_pieces WHERE id=?').get(req.params.contentId));
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
