import { Router } from 'express';
import db from '../db.js';

const router = Router();

router.get('/', (_req, res) => {
  const q = (sql: string) => (db.prepare(sql).get() as any);

  const stats = {
    totalContacts: q('SELECT COUNT(*) as v FROM contacts').v,
    newLeadsThisWeek: q("SELECT COUNT(*) as v FROM contacts WHERE created_at >= datetime('now', '-7 days')").v,
    activeDeals: q("SELECT COUNT(*) as v FROM deals WHERE stage NOT IN ('won','lost')").v,
    pipelineValue: q("SELECT COALESCE(SUM(value),0) as v FROM deals WHERE stage NOT IN ('won','lost')").v,
    closingValue: q("SELECT COALESCE(SUM(value),0) as v FROM deals WHERE stage = 'closing'").v,
    totalConversations: q('SELECT COUNT(*) as v FROM conversations').v,
    unreadMessages: q('SELECT COALESCE(SUM(unread_count),0) as v FROM conversations').v,
    instagramLeads: q('SELECT COUNT(*) as v FROM instagram_leads').v,
    unconvertedLeads: q('SELECT COUNT(*) as v FROM instagram_leads WHERE contact_id IS NULL').v,
  };

  const dealsByStage = db.prepare(`
    SELECT stage, COUNT(*) as count, COALESCE(SUM(value),0) as value
    FROM deals WHERE stage NOT IN ('won','lost') GROUP BY stage
  `).all();

  const leadSources = db.prepare('SELECT source, COUNT(*) as count FROM contacts GROUP BY source').all();

  const recentActivities = db.prepare(`
    SELECT a.*, c.name as contact_name
    FROM activities a LEFT JOIN contacts c ON a.contact_id = c.id
    ORDER BY a.created_at DESC LIMIT 10
  `).all();

  res.json({ stats, dealsByStage, leadSources, recentActivities });
});

export default router;
