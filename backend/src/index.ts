import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

dotenv.config();

import contactsRouter from './routes/contacts.js';
import dealsRouter from './routes/deals.js';
import conversationsRouter from './routes/conversations.js';
import dashboardRouter from './routes/dashboard.js';
import metaRouter from './routes/meta.js';
import settingsRouter from './routes/settings.js';
import authRouter from './routes/auth.js';
import { authMiddleware } from './middleware/auth.js';

const app = express();
const PORT = process.env.PORT || 3001;
const IS_PROD = process.env.NODE_ENV === 'production';
const __dirname = dirname(fileURLToPath(import.meta.url));

if (!IS_PROD) {
  app.use(cors({ origin: ['http://localhost:5173', 'http://127.0.0.1:5173'] }));
}
app.use(express.json());

// Public routes
app.use('/api/auth', authRouter);
app.use('/api/meta/webhook', metaRouter); // Meta webhook (no auth)

// Protected routes
app.use('/api/contacts', authMiddleware, contactsRouter);
app.use('/api/deals', authMiddleware, dealsRouter);
app.use('/api/conversations', authMiddleware, conversationsRouter);
app.use('/api/dashboard', authMiddleware, dashboardRouter);
app.use('/api/meta', authMiddleware, metaRouter);
app.use('/api/settings', authMiddleware, settingsRouter);

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
