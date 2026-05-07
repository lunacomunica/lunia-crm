import { Router } from 'express';
import db from '../db.js';

const router = Router();

router.get('/', (req, res) => {
  const tid = req.user.tenant_id;
  const q = (sql: string, ...p: any[]) => (db.prepare(sql).get(...p) as any);

  const stats = {
    totalContacts:    q('SELECT COUNT(*) as v FROM contacts WHERE tenant_id=?', tid).v,
    newLeadsThisWeek: q("SELECT COUNT(*) as v FROM contacts WHERE tenant_id=? AND created_at >= datetime('now','-7 days')", tid).v,
    activeDeals:      q("SELECT COUNT(*) as v FROM deals WHERE tenant_id=? AND stage NOT IN ('won','lost')", tid).v,
    pipelineValue:    q("SELECT COALESCE(SUM(value),0) as v FROM deals WHERE tenant_id=? AND stage NOT IN ('won','lost')", tid).v,
    closingValue:     q("SELECT COALESCE(SUM(value),0) as v FROM deals WHERE tenant_id=? AND stage='closing'", tid).v,
    totalConversations: q('SELECT COUNT(*) as v FROM conversations WHERE tenant_id=?', tid).v,
    unreadMessages:   q('SELECT COALESCE(SUM(unread_count),0) as v FROM conversations WHERE tenant_id=?', tid).v,
    instagramLeads:   q('SELECT COUNT(*) as v FROM instagram_leads WHERE tenant_id=?', tid).v,
    unconvertedLeads: q('SELECT COUNT(*) as v FROM instagram_leads WHERE tenant_id=? AND contact_id IS NULL', tid).v,
  };

  const dealsByStage = db.prepare(`
    SELECT stage, COUNT(*) as count, COALESCE(SUM(value),0) as value
    FROM deals WHERE tenant_id=? AND stage NOT IN ('won','lost') GROUP BY stage
  `).all(tid);

  const leadSources = db.prepare('SELECT source, COUNT(*) as count FROM contacts WHERE tenant_id=? GROUP BY source').all(tid);

  const recentActivities = db.prepare(`
    SELECT a.*, c.name as contact_name
    FROM activities a LEFT JOIN contacts c ON a.contact_id = c.id
    WHERE a.tenant_id=? ORDER BY a.created_at DESC LIMIT 10
  `).all(tid);

  res.json({ stats, dealsByStage, leadSources, recentActivities });
});

export default router;
