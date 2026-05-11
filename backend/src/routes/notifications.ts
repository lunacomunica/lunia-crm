import { Router } from 'express';
import db from '../db.js';

const router = Router();

router.get('/', (req, res) => {
  const notifications = db.prepare('SELECT * FROM notifications WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 50').all(req.user.tenant_id);
  const unread = (db.prepare('SELECT COUNT(*) as count FROM notifications WHERE tenant_id = ? AND read = 0').get(req.user.tenant_id) as any).count;
  res.json({ notifications, unread });
});

router.patch('/read-all', (req, res) => {
  db.prepare('UPDATE notifications SET read = 1 WHERE tenant_id = ?').run(req.user.tenant_id);
  res.json({ ok: true });
});

router.patch('/:id/read', (req, res) => {
  db.prepare('UPDATE notifications SET read = 1 WHERE id = ? AND tenant_id = ?').run(req.params.id, req.user.tenant_id);
  res.json({ ok: true });
});

router.delete('/', (req, res) => {
  db.prepare('DELETE FROM notifications WHERE tenant_id = ?').run(req.user.tenant_id);
  res.json({ ok: true });
});

export default router;
