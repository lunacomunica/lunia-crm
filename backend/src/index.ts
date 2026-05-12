import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync } from 'fs';

dotenv.config();

import contactsRouter from './routes/contacts.js';
import dealsRouter from './routes/deals.js';
import conversationsRouter from './routes/conversations.js';
import dashboardRouter from './routes/dashboard.js';
import metaRouter from './routes/meta.js';
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
  <p>O <strong style="color:#fff">Lun.ia</strong> é um sistema de gestão (ERP) desenvolvido pela <strong style="color:#fff">Agência Luna Comunicação</strong> para uso interno e de seus clientes. Nosso site é <a href="https://app.lunacomunica.co">app.lunacomunica.co</a>.</p>

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
  <p>Você pode solicitar acesso, correção ou exclusão dos seus dados a qualquer momento entrando em contato pelo Instagram <a href="https://instagram.com/lunacomunica" target="_blank">@lunacomunica</a> ou pelo e-mail <a href="mailto:vanessaraeski@gmail.com">vanessaraeski@gmail.com</a>.</p>

  <h2>8. Contato</h2>
  <p>Dúvidas sobre esta política: <a href="https://instagram.com/lunacomunica" target="_blank">@lunacomunica</a> · <a href="mailto:vanessaraeski@gmail.com">vanessaraeski@gmail.com</a></p>

  <div class="footer">© ${new Date().getFullYear()} Agência Luna Comunicação · Todos os direitos reservados</div>
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
