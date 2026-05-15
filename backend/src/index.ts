import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync } from 'fs';
import https from 'https';

dotenv.config();

import contactsRouter from './routes/contacts.js';
import dealsRouter from './routes/deals.js';
import conversationsRouter from './routes/conversations.js';
import dashboardRouter from './routes/dashboard.js';
import metaRouter, { publishToInstagram } from './routes/meta.js';
import settingsRouter from './routes/settings.js';
import authRouter from './routes/auth.js';
import usersRouter from './routes/users.js';
import productsRouter from './routes/products.js';
import agencyClientsRouter from './routes/agency-clients.js';
import contentRouter from './routes/content.js';
import notificationsRouter from './routes/notifications.js';
import campaignsRouter from './routes/campaigns.js';
import adminRouter from './routes/admin.js';
import tasksRouter from './routes/tasks.js';
import clientPortalRouter from './routes/client-portal.js';
import clientCrmRouter from './routes/client-crm.js';
import uploadRouter from './routes/upload.js';
import workflowTemplatesRouter from './routes/workflow-templates.js';
import taskCategoriesRouter from './routes/task-categories.js';
import clientProjectsRouter from './routes/client-projects.js';
import contentIdeasRouter from './routes/content-ideas.js';
import { authMiddleware } from './middleware/auth.js';
import db from './db.js';

const app = express();
const PORT = process.env.PORT || 3001;
const IS_PROD = process.env.NODE_ENV === 'production';
const __dirname = dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = process.env.UPLOAD_DIR || join(__dirname, '../uploads');
if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true });

if (!IS_PROD) {
  app.use(cors({ origin: ['http://localhost:5173', 'http://127.0.0.1:5173'] }));
}
app.use(express.json({ limit: '5mb' }));
app.use('/uploads', express.static(UPLOAD_DIR));

// Public routes
app.use('/api/auth', authRouter);

// Meta OAuth callback — public, called by Meta after user authorizes
app.get('/api/meta/callback', async (req, res) => {
  const code = req.query.code as string;
  const state = req.query.state as string;
  const error = req.query.error as string;

  if (error) return res.redirect(`/?meta_error=${encodeURIComponent(error)}`);
  if (!code || !state) return res.redirect('/?meta_error=missing_params');

  let tenantId: number, clientId: number;
  try {
    const decoded = Buffer.from(state, 'base64').toString('utf8');
    [tenantId, clientId] = decoded.split(':').map(Number);
    if (!tenantId || !clientId) throw new Error('invalid state');
  } catch {
    return res.redirect('/?meta_error=invalid_state');
  }

  const appId = process.env.META_APP_ID!;
  const appSecret = process.env.META_APP_SECRET!;
  const redirectUri = process.env.META_REDIRECT_URI || 'https://app.lunacomunica.com/api/meta/callback';

  function httpsGet(url: string): Promise<any> {
    return new Promise((resolve, reject) => {
      https.get(url, r => {
        let d = ''; r.on('data', c => { d += c; }); r.on('end', () => {
          try { resolve(JSON.parse(d)); } catch { reject(new Error('parse')); }
        });
      }).on('error', reject);
    });
  }

  try {
    // Exchange code for short-lived token
    const tokenData = await httpsGet(
      `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&redirect_uri=${encodeURIComponent(redirectUri)}&code=${code}`
    );
    if (!tokenData.access_token) throw new Error(tokenData.error?.message || 'no token');

    // Exchange for long-lived token (60 days)
    const llData = await httpsGet(
      `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${tokenData.access_token}`
    );
    const longToken = llData.access_token || tokenData.access_token;
    const expiresIn = llData.expires_in || 5184000;
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    // Get Instagram Business Account ID + Facebook Page via /me/accounts
    const pages = await httpsGet(`https://graph.facebook.com/v19.0/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${longToken}`);
    let igUserId: string | null = null;
    let fbPageId: string | null = null;
    let fbPageToken: string | null = null;

    // Prefer the page that matches the instagram_user_id already saved for this client
    const existing = db.prepare('SELECT instagram_user_id FROM agency_clients WHERE id=? AND tenant_id=?').get(clientId, tenantId) as any;
    const existingIgId = existing?.instagram_user_id;

    const candidates = (pages.data || []).filter((p: any) => p.instagram_business_account?.id);
    const matched = existingIgId
      ? candidates.find((p: any) => p.instagram_business_account.id === existingIgId)
      : null;
    const chosen = matched || candidates[0];

    if (chosen) {
      igUserId = chosen.instagram_business_account.id;
      fbPageId = chosen.id;
      fbPageToken = chosen.access_token || longToken;
    }

    // Save per-client token + Facebook Page in agency_clients
    db.prepare(
      "UPDATE agency_clients SET instagram_token=?, instagram_user_id=COALESCE(?, instagram_user_id), instagram_token_expires=?, facebook_page_id=COALESCE(?, facebook_page_id), facebook_page_token=COALESCE(?, facebook_page_token), updated_at=datetime('now') WHERE id=? AND tenant_id=?"
    ).run(longToken, igUserId, expiresAt, fbPageId, fbPageToken, clientId, tenantId);

    res.redirect(`/marketing/clients/${clientId}?ig_connected=1`);
  } catch (err: any) {
    console.error('[meta/callback]', err.message);
    res.redirect(`/marketing/clients/${clientId}?ig_error=${encodeURIComponent(err.message)}`);
  }
});

// Meta webhook public (no auth) — Meta calls this directly
app.get('/api/meta/webhook', (req, res) => {
  const verifyToken = process.env.META_VERIFY_TOKEN || 'lunia_webhook_token';
  if (req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === verifyToken) {
    res.send(req.query['hub.challenge']);
  } else {
    res.status(403).json({ error: 'Verificação falhou' });
  }
});
app.post('/api/meta/webhook', (req, res) => {
  res.sendStatus(200);
  const body = req.body;
  console.log('[webhook] evento recebido:', JSON.stringify(body));
  if (!body?.object) return;
  const tid = 1;
  for (const entry of body.entry || []) {
    for (const change of entry.changes || []) {
      if (change.field === 'messages') {
        const msgs = change.value?.messages || [];
        const contacts_meta = change.value?.contacts || [];
        for (const msg of msgs) {
          const from = msg.from;
          const name = contacts_meta.find((c: any) => c.wa_id === from)?.profile?.name || from;
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

// Protected routes
app.use('/api/contacts', authMiddleware, contactsRouter);
app.use('/api/products', authMiddleware, productsRouter);
app.use('/api/agency-clients', authMiddleware, agencyClientsRouter);
app.use('/api/content', authMiddleware, contentRouter);
app.use('/api/notifications', authMiddleware, notificationsRouter);
app.use('/api/campaigns', authMiddleware, campaignsRouter);
app.use('/api/deals', authMiddleware, dealsRouter);
app.use('/api/conversations', authMiddleware, conversationsRouter);
app.use('/api/dashboard', authMiddleware, dashboardRouter);
app.use('/api/meta', authMiddleware, metaRouter);
app.use('/api/settings', authMiddleware, settingsRouter);
app.use('/api/users', authMiddleware, usersRouter);
app.use('/api/admin', adminRouter);
app.use('/api/upload', authMiddleware, uploadRouter);
app.use('/api/tasks', authMiddleware, tasksRouter);
app.use('/api/task-categories', authMiddleware, taskCategoriesRouter);
app.use('/api/client-portal', authMiddleware, clientPortalRouter);
app.use('/api/client-crm', authMiddleware, clientCrmRouter);
app.use('/api/workflow-templates', authMiddleware, workflowTemplatesRouter);
app.use('/api/client-projects', authMiddleware, clientProjectsRouter);
app.use('/api/content-ideas', authMiddleware, contentIdeasRouter);


app.get('/privacy', (_req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Política de Privacidade — Lun.ia</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: system-ui, -apple-system, sans-serif; background: #07071a; color: #cbd5e1; line-height: 1.8; min-height: 100vh; }
  .wrap { max-width: 780px; margin: 0 auto; padding: 60px 24px 80px; }
  .header { display: flex; align-items: center; gap: 14px; margin-bottom: 48px; padding-bottom: 32px; border-bottom: 1px solid rgba(255,255,255,0.07); }
  .logo { width: 42px; height: 42px; border-radius: 50%; }
  .brand { font-size: 1.25rem; font-weight: 700; color: #fff; letter-spacing: -0.02em; }
  .brand span { color: #60a5fa; }
  .updated { font-size: 0.75rem; color: rgba(100,116,139,0.6); margin-top: 2px; }
  h1 { font-size: 1.75rem; font-weight: 300; color: #fff; margin-bottom: 8px; letter-spacing: -0.02em; }
  .subtitle { color: rgba(100,116,139,0.7); font-size: 0.9rem; margin-bottom: 40px; }
  h2 { font-size: 0.8rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: #60a5fa; margin: 36px 0 10px; }
  p { color: rgba(148,163,184,0.85); font-size: 0.92rem; }
  a { color: #60a5fa; text-decoration: none; }
  a:hover { text-decoration: underline; }
  .footer { margin-top: 56px; padding-top: 24px; border-top: 1px solid rgba(255,255,255,0.07); font-size: 0.78rem; color: rgba(100,116,139,0.5); }
</style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <img src="/logo.png" alt="lun.ia" class="logo" />
    <div>
      <div class="brand">lun<span>.</span>ia</div>
      <div class="updated">ERP by @lunacomunica · app.lunacomunica.co</div>
    </div>
  </div>

  <h1>Política de Privacidade</h1>
  <p class="subtitle">Última atualização: ${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>

  <h2>1. Quem somos</h2>
  <p>O <strong style="color:#fff">Lun.ia</strong> é um sistema de gestão (ERP) desenvolvido pela <strong style="color:#fff">Agência Luna Comunicação</strong> para uso interno e de seus clientes. Nosso site é <a href="https://app.lunacomunica.com">app.lunacomunica.com</a>.</p>

  <h2>2. Dados coletados</h2>
  <p>Coletamos dados necessários para o funcionamento do sistema, incluindo: nome, e-mail e telefone de contatos; mensagens trocadas via Instagram Direct e WhatsApp Business; dados de leads gerados por anúncios no Meta Ads; métricas de desempenho de publicações e campanhas.</p>

  <h2>3. Como usamos os dados</h2>
  <p>Os dados são utilizados exclusivamente para: gestão de relacionamento com clientes (CRM), organização de funil de vendas, acompanhamento de campanhas de tráfego pago, agendamento e publicação de conteúdo via API da Meta, e análise de performance.</p>

  <h2>4. Integrações com a Meta</h2>
  <p>O sistema se integra à plataforma Meta (Instagram e WhatsApp Business) via API oficial. Os dados obtidos por essas integrações seguem os <a href="https://developers.facebook.com/terms/" target="_blank">Termos da Plataforma Meta</a> e são usados apenas para as finalidades descritas nesta política.</p>

  <h2>5. Compartilhamento</h2>
  <p>Os dados <strong style="color:#fff">não são vendidos nem compartilhados</strong> com terceiros, exceto quando necessário para viabilizar as integrações técnicas com a Meta Platforms, Inc.</p>

  <h2>6. Armazenamento e segurança</h2>
  <p>Os dados são armazenados em servidor seguro com acesso restrito por autenticação (e-mail e senha). Todo acesso à plataforma requer login individual com credenciais únicas.</p>

  <h2>7. Seus direitos</h2>
  <p>Você pode solicitar acesso, correção ou exclusão dos seus dados a qualquer momento entrando em contato pelo Instagram <a href="https://instagram.com/lunacomunica" target="_blank">@lunacomunica</a> ou pelo e-mail <a href="mailto:contato@lunacomunica.com">contato@lunacomunica.com</a>.</p>

  <h2>8. Contato</h2>
  <p>Dúvidas sobre esta política: <a href="https://instagram.com/lunacomunica" target="_blank">@lunacomunica</a> · <a href="mailto:contato@lunacomunica.com">contato@lunacomunica.com</a></p>

  <div class="footer">© ${new Date().getFullYear()} Agência Luna Comunicação · Todos os direitos reservados</div>
</div>
</body></html>`);
});

app.get('/terms', (_req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Termos de Serviço — Lun.ia</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: system-ui, -apple-system, sans-serif; background: #07071a; color: #cbd5e1; line-height: 1.8; min-height: 100vh; }
  .wrap { max-width: 780px; margin: 0 auto; padding: 60px 24px 80px; }
  .header { display: flex; align-items: center; gap: 14px; margin-bottom: 48px; padding-bottom: 32px; border-bottom: 1px solid rgba(255,255,255,0.07); }
  .logo { width: 42px; height: 42px; border-radius: 50%; }
  .brand { font-size: 1.25rem; font-weight: 700; color: #fff; letter-spacing: -0.02em; }
  .brand span { color: #60a5fa; }
  h1 { font-size: 1.75rem; font-weight: 300; color: #fff; margin-bottom: 8px; letter-spacing: -0.02em; }
  .subtitle { color: rgba(100,116,139,0.7); font-size: 0.9rem; margin-bottom: 40px; }
  h2 { font-size: 0.8rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: #60a5fa; margin: 36px 0 10px; }
  p { color: rgba(148,163,184,0.85); font-size: 0.92rem; margin-bottom: 12px; }
  a { color: #60a5fa; text-decoration: none; }
  a:hover { text-decoration: underline; }
  .footer { margin-top: 56px; padding-top: 24px; border-top: 1px solid rgba(255,255,255,0.07); font-size: 0.78rem; color: rgba(100,116,139,0.5); }
</style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <img src="/logo.png" alt="lun.ia" class="logo" />
    <div>
      <div class="brand">lun<span>.</span>ia</div>
      <div style="font-size:0.75rem;color:rgba(100,116,139,0.6);margin-top:2px">ERP by @lunacomunica · app.lunacomunica.com</div>
    </div>
  </div>

  <h1>Termos de Serviço</h1>
  <p class="subtitle">Última atualização: ${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>

  <h2>1. Aceitação dos termos</h2>
  <p>Ao acessar e utilizar o <strong style="color:#fff">Lun.ia</strong>, você concorda com estes Termos de Serviço. Se não concordar, não utilize a plataforma.</p>

  <h2>2. Sobre o serviço</h2>
  <p>O Lun.ia é um sistema de gestão (ERP/CRM) desenvolvido pela <strong style="color:#fff">Agência Luna Comunicação</strong> para uso interno e de seus clientes. A plataforma oferece ferramentas de gestão de conteúdo, tráfego pago, relacionamento com clientes e integração com redes sociais.</p>

  <h2>3. Uso permitido</h2>
  <p>O acesso à plataforma é restrito a usuários autorizados pela Agência Luna Comunicação. É vedado o uso para fins ilícitos, compartilhamento de credenciais de acesso ou qualquer ação que comprometa a segurança do sistema.</p>

  <h2>4. Integrações com terceiros</h2>
  <p>O Lun.ia pode se integrar a plataformas de terceiros, incluindo Meta (Instagram, Facebook e WhatsApp). O uso dessas integrações está sujeito também aos termos e políticas dessas plataformas.</p>

  <h2>5. Propriedade intelectual</h2>
  <p>Todo o conteúdo, código e design do Lun.ia são propriedade da Agência Luna Comunicação. É proibida a reprodução, cópia ou distribuição sem autorização expressa.</p>

  <h2>6. Limitação de responsabilidade</h2>
  <p>A Agência Luna Comunicação não se responsabiliza por eventuais indisponibilidades do serviço, perda de dados decorrente de falhas externas ou uso indevido da plataforma por parte dos usuários.</p>

  <h2>7. Alterações nos termos</h2>
  <p>Reservamos o direito de atualizar estes termos a qualquer momento. Mudanças relevantes serão comunicadas aos usuários ativos.</p>

  <h2>8. Contato</h2>
  <p>
    📧 <a href="mailto:contato@lunacomunica.com">contato@lunacomunica.com</a><br>
    📱 <a href="https://instagram.com/lunacomunica" target="_blank">@lunacomunica</a>
  </p>

  <div class="footer">© ${new Date().getFullYear()} Agência Luna Comunicação · <a href="/privacy">Política de Privacidade</a> · <a href="/data-deletion">Exclusão de Dados</a></div>
</div>
</body></html>`);
});

app.get('/datadeletion', (_req, res) => res.redirect('/data-deletion'));

app.get('/data-deletion', (_req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Exclusão de Dados — Lun.ia</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: system-ui, -apple-system, sans-serif; background: #07071a; color: #cbd5e1; line-height: 1.8; min-height: 100vh; }
  .wrap { max-width: 780px; margin: 0 auto; padding: 60px 24px 80px; }
  .header { display: flex; align-items: center; gap: 14px; margin-bottom: 48px; padding-bottom: 32px; border-bottom: 1px solid rgba(255,255,255,0.07); }
  .logo { width: 42px; height: 42px; border-radius: 50%; }
  .brand { font-size: 1.25rem; font-weight: 700; color: #fff; letter-spacing: -0.02em; }
  .brand span { color: #60a5fa; }
  h1 { font-size: 1.75rem; font-weight: 300; color: #fff; margin-bottom: 8px; letter-spacing: -0.02em; }
  .subtitle { color: rgba(100,116,139,0.7); font-size: 0.9rem; margin-bottom: 40px; }
  h2 { font-size: 0.8rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: #60a5fa; margin: 36px 0 10px; }
  p { color: rgba(148,163,184,0.85); font-size: 0.92rem; margin-bottom: 12px; }
  a { color: #60a5fa; text-decoration: none; }
  a:hover { text-decoration: underline; }
  .box { background: rgba(59,130,246,0.06); border: 1px solid rgba(59,130,246,0.18); border-radius: 16px; padding: 24px 28px; margin: 28px 0; }
  .box p { margin: 0; }
  .steps { list-style: none; counter-reset: steps; margin: 12px 0; }
  .steps li { counter-increment: steps; padding: 10px 0 10px 44px; position: relative; border-bottom: 1px solid rgba(255,255,255,0.04); font-size: 0.92rem; color: rgba(148,163,184,0.85); }
  .steps li:last-child { border-bottom: none; }
  .steps li::before { content: counter(steps); position: absolute; left: 0; top: 10px; width: 28px; height: 28px; background: rgba(59,130,246,0.15); border: 1px solid rgba(59,130,246,0.3); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 600; color: #60a5fa; line-height: 28px; text-align: center; }
  .footer { margin-top: 56px; padding-top: 24px; border-top: 1px solid rgba(255,255,255,0.07); font-size: 0.78rem; color: rgba(100,116,139,0.5); }
</style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <img src="/logo.png" alt="lun.ia" class="logo" />
    <div>
      <div class="brand">lun<span>.</span>ia</div>
      <div style="font-size:0.75rem;color:rgba(100,116,139,0.6);margin-top:2px">ERP by @lunacomunica · app.lunacomunica.com</div>
    </div>
  </div>

  <h1>Exclusão de Dados</h1>
  <p class="subtitle">Como solicitar a remoção dos seus dados do Lun.ia</p>

  <div class="box">
    <p>Se você conectou sua conta do Instagram ou Facebook ao <strong style="color:#fff">Lun.ia</strong> e deseja que seus dados sejam removidos, siga as instruções abaixo. Atendemos todas as solicitações em até <strong style="color:#fff">7 dias úteis</strong>.</p>
  </div>

  <h2>Como solicitar a exclusão</h2>
  <ol class="steps">
    <li>Envie um e-mail para <a href="mailto:contato@lunacomunica.com">contato@lunacomunica.com</a> com o assunto <strong style="color:#fff">"Exclusão de dados — Lun.ia"</strong></li>
    <li>Informe o nome completo e o e-mail ou Instagram vinculado à conta</li>
    <li>Nossa equipe confirmará o recebimento em até 48h e processará a exclusão em até 7 dias úteis</li>
    <li>Você receberá uma confirmação por e-mail quando os dados forem removidos</li>
  </ol>

  <h2>O que será removido</h2>
  <p>Ao solicitar a exclusão, removeremos permanentemente: dados de perfil, histórico de mensagens, leads, métricas e qualquer informação associada à sua conta no sistema.</p>

  <h2>Contato direto</h2>
  <p>
    📧 <a href="mailto:contato@lunacomunica.com">contato@lunacomunica.com</a><br>
    📱 Instagram: <a href="https://instagram.com/lunacomunica" target="_blank">@lunacomunica</a>
  </p>

  <div class="footer">© ${new Date().getFullYear()} Agência Luna Comunicação · <a href="/privacy">Política de Privacidade</a></div>
</div>
</body></html>`);
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', app: 'Lun.ia ERP', timestamp: new Date().toISOString() });
});

// Serve frontend
const frontendDist = join(__dirname, 'public');
console.log(`[static] frontendDist=${frontendDist} exists=${existsSync(frontendDist)}`);
if (existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (_req, res) => res.sendFile(join(frontendDist, 'index.html')));
}

app.listen(PORT, () => {
  console.log(`🌙 lun.ia API rodando na porta ${PORT}`);
});

// ── Cron: publica posts agendados a cada 5 minutos ────────────────────────────
setInterval(async () => {
  try {
    const now = new Date().toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM
    const scheduled = db.prepare(`
      SELECT cp.id, cp.tenant_id, cp.scheduled_date, cp.scheduled_time
      FROM content_pieces cp
      WHERE cp.status = 'agendado'
        AND cp.ig_media_id IS NULL
        AND cp.scheduled_date IS NOT NULL
    `).all() as any[];

    for (const post of scheduled) {
      const scheduledAt = post.scheduled_time
        ? `${post.scheduled_date}T${post.scheduled_time.slice(0,5)}`
        : `${post.scheduled_date}T00:00`;
      if (scheduledAt > now) continue;
      try {
        await publishToInstagram(post.tenant_id, post.id);
        console.log(`[cron] Post ${post.id} publicado no Instagram`);
      } catch (e: any) {
        console.error(`[cron] Erro ao publicar post ${post.id}:`, e.message);
      }
    }
  } catch (e: any) {
    console.error('[cron] Erro no job de publicação:', e.message);
  }
}, 5 * 60 * 1000);

// ── Cron: alerta de token Meta expirando (roda 1x por dia) ───────────────────
setInterval(() => {
  try {
    const tokens = db.prepare(`
      SELECT s.tenant_id, s.value as expires_at
      FROM settings s
      WHERE s.key = 'meta_user_token_expires'
    `).all() as any[];

    for (const row of tokens) {
      if (!row.expires_at) continue;
      const days = Math.ceil((new Date(row.expires_at).getTime() - Date.now()) / 86400000);
      if (days > 14 || days < 0) continue;

      const msg = days <= 0
        ? 'Token Meta expirado. Acesse Configurações → Meta e gere um novo token.'
        : `Token Meta expira em ${days} ${days === 1 ? 'dia' : 'dias'}. Renove em Configurações → Meta.`;

      // Avoid duplicate notifications on same day
      const today = new Date().toISOString().slice(0, 10);
      const existing = db.prepare(`
        SELECT id FROM notifications
        WHERE tenant_id = ? AND type = 'meta_token_expiry'
          AND created_at >= ?
      `).get(row.tenant_id, today);
      if (existing) continue;

      db.prepare(`
        INSERT INTO notifications (tenant_id, type, title, body)
        VALUES (?, 'meta_token_expiry', 'Token Meta expirando', ?)
      `).run(row.tenant_id, msg);
    }
  } catch (e: any) {
    console.error('[cron] Erro no job de token expiry:', e.message);
  }
}, 24 * 60 * 60 * 1000);
