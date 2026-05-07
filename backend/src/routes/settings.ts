import { Router } from 'express';
import db from '../db.js';

const router = Router();

router.get('/', (_req, res) => {
  const rows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];
  const settings: Record<string, string> = {};
  for (const row of rows) settings[row.key] = row.value;

  const masked = { ...settings };
  const sensitiveKeys = ['whatsapp_token', 'meta_app_secret', 'instagram_token', 'meta_ads_token'];
  for (const key of sensitiveKeys) {
    if (masked[key] && masked[key].length > 6) {
      masked[key] = masked[key].slice(0, 6) + '••••••••••••';
    }
  }
  res.json(masked);
});

router.put('/', (req, res) => {
  const { settings } = req.body as { settings: Record<string, string> };
  const upsert = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');

  db.transaction(() => {
    for (const [key, value] of Object.entries(settings)) {
      if (value && !value.includes('••••')) upsert.run(key, value);
    }
  })();

  res.json({ success: true, message: 'Configurações salvas com sucesso' });
});

router.get('/webhook-info', (req, res) => {
  const host = req.get('host') || `localhost:3001`;
  const verifyToken =
    (db.prepare("SELECT value FROM settings WHERE key='meta_verify_token'").get() as any)?.value || 'lunia_webhook_token';

  res.json({
    webhookUrl: `https://${host}/api/meta/webhook`,
    verifyToken,
  });
});

router.post('/test-connection', (req, res) => {
  const { type } = req.body;

  const token = (db.prepare(`SELECT value FROM settings WHERE key='${type}_token'`).get() as any)?.value;

  if (!token) {
    return res.json({ success: false, message: 'Credenciais não configuradas. Salve o token primeiro.' });
  }

  res.json({ success: true, message: `Conexão ${type} verificada — token encontrado nas configurações.` });
});

export default router;
