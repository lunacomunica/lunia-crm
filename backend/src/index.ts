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
app.use('/api/client-portal', authMiddleware, clientPortalRouter);
app.use('/api/client-crm', authMiddleware, clientCrmRouter);
app.use('/api/workflow-templates', authMiddleware, workflowTemplatesRouter);

app.get('/privacy', (_req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Política de Privacidade — lun.ia CRM</title>
<style>body{font-family:system-ui,sans-serif;max-width:800px;margin:60px auto;padding:0 24px;color:#1e293b;line-height:1.7}h1{color:#3b82f6}h2{margin-top:2rem;color:#334155}a{color:#3b82f6}</style>
</head>
<body>
<h1>Política de Privacidade</h1>
<p><strong>lun.ia CRM</strong> — desenvolvido por <strong>@lunacomunica</strong><br>Última atualização: ${new Date().toLocaleDateString('pt-BR')}</p>

<h2>1. Informações coletadas</h2>
<p>O lun.ia CRM coleta dados de contatos e mensagens provenientes de integrações com o Instagram e WhatsApp Business via API da Meta, incluindo: nome, telefone, e-mail, mensagens trocadas e dados de leads gerados por anúncios.</p>

<h2>2. Uso das informações</h2>
<p>Os dados são utilizados exclusivamente para gestão de relacionamento com clientes (CRM), incluindo: organização de contatos, histórico de conversas, acompanhamento de funil de vendas e análise de performance de campanhas.</p>

<h2>3. Compartilhamento de dados</h2>
<p>Os dados <strong>não são compartilhados</strong> com terceiros, exceto para viabilizar as integrações com a plataforma Meta (Instagram/WhatsApp) conforme os Termos de Serviço da Meta.</p>

<h2>4. Armazenamento e segurança</h2>
<p>Os dados são armazenados em banco de dados seguro com acesso restrito por autenticação. Todo acesso à plataforma requer login com e-mail e senha.</p>

<h2>5. Direitos do usuário</h2>
<p>Os usuários podem solicitar a exclusão dos seus dados a qualquer momento entrando em contato pelo Instagram <a href="https://instagram.com/lunacomunica">@lunacomunica</a>.</p>

<h2>6. Contato</h2>
<p>Dúvidas sobre esta política: <a href="https://instagram.com/lunacomunica">@lunacomunica</a></p>
</body></html>`);
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', app: 'lun.ia CRM', timestamp: new Date().toISOString() });
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
