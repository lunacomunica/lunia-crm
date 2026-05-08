import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';


const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || join(__dirname, '../../lunia.db');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS tenants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'owner',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL DEFAULT 1,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    source TEXT DEFAULT 'manual',
    status TEXT DEFAULT 'lead',
    tags TEXT DEFAULT '[]',
    notes TEXT,
    external_id TEXT,
    avatar_url TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS deals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL DEFAULT 1,
    contact_id INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    value REAL DEFAULT 0,
    stage TEXT DEFAULT 'prospecting',
    probability INTEGER DEFAULT 20,
    expected_close_date TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL DEFAULT 1,
    contact_id INTEGER REFERENCES contacts(id) ON DELETE CASCADE,
    platform TEXT NOT NULL,
    external_id TEXT UNIQUE,
    status TEXT DEFAULT 'active',
    last_message_at TEXT DEFAULT (datetime('now')),
    unread_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
    content TEXT,
    media_url TEXT,
    media_type TEXT,
    direction TEXT NOT NULL,
    status TEXT DEFAULT 'sent',
    external_id TEXT,
    timestamp TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL DEFAULT 1,
    contact_id INTEGER,
    deal_id INTEGER,
    type TEXT,
    description TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS settings (
    tenant_id INTEGER NOT NULL DEFAULT 1,
    key TEXT NOT NULL,
    value TEXT,
    PRIMARY KEY (tenant_id, key)
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL DEFAULT 1,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT,
    read INTEGER DEFAULT 0,
    meta TEXT DEFAULT '{}',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS agency_clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL DEFAULT 1,
    name TEXT NOT NULL,
    segment TEXT,
    contact_name TEXT,
    contact_email TEXT,
    instagram_handle TEXT,
    logo TEXT,
    active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS content_pieces (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL DEFAULT 1,
    agency_client_id INTEGER NOT NULL REFERENCES agency_clients(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    type TEXT DEFAULT 'post',
    caption TEXT,
    media_url TEXT,
    media_thumb TEXT,
    scheduled_date TEXT,
    objective TEXT,
    status TEXT DEFAULT 'em_criacao',
    created_by INTEGER REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS content_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content_piece_id INTEGER NOT NULL REFERENCES content_pieces(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),
    user_name TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS feed_batches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL DEFAULT 1,
    agency_client_id INTEGER NOT NULL REFERENCES agency_clients(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    month INTEGER,
    year INTEGER,
    order_num INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL DEFAULT 1,
    name TEXT NOT NULL,
    description TEXT,
    price REAL DEFAULT 0,
    unit TEXT DEFAULT 'un',
    category TEXT,
    active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS deal_products (
    deal_id INTEGER NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity REAL DEFAULT 1,
    unit_price REAL NOT NULL,
    PRIMARY KEY (deal_id, product_id)
  );

  CREATE TABLE IF NOT EXISTS campaigns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL DEFAULT 1,
    agency_client_id INTEGER REFERENCES agency_clients(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    platform TEXT DEFAULT 'meta',
    status TEXT DEFAULT 'rascunho',
    objective TEXT DEFAULT 'trafego',
    budget REAL DEFAULT 0,
    spent REAL DEFAULT 0,
    revenue REAL DEFAULT 0,
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    conversions INTEGER DEFAULT 0,
    target_audience TEXT,
    utm_link TEXT,
    start_date TEXT,
    end_date TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS campaign_creatives (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    type TEXT DEFAULT 'image',
    media_url TEXT,
    headline TEXT,
    description TEXT,
    cta TEXT,
    status TEXT DEFAULT 'ativo',
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    conversions INTEGER DEFAULT 0,
    spend REAL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS client_contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agency_client_id INTEGER NOT NULL REFERENCES agency_clients(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    source TEXT DEFAULT 'manual',
    campaign_id INTEGER REFERENCES campaigns(id) ON DELETE SET NULL,
    stage TEXT DEFAULT 'novo',
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS client_deals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agency_client_id INTEGER NOT NULL REFERENCES agency_clients(id) ON DELETE CASCADE,
    client_contact_id INTEGER REFERENCES client_contacts(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    value REAL DEFAULT 0,
    stage TEXT DEFAULT 'novo',
    probability INTEGER DEFAULT 20,
    expected_close_date TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS client_goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agency_client_id INTEGER NOT NULL REFERENCES agency_clients(id) ON DELETE CASCADE,
    metric TEXT NOT NULL,
    label TEXT NOT NULL,
    target REAL NOT NULL,
    unit TEXT DEFAULT '',
    icon TEXT DEFAULT 'target',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(agency_client_id, metric)
  );

  CREATE TABLE IF NOT EXISTS client_positioning (
    agency_client_id INTEGER PRIMARY KEY REFERENCES agency_clients(id) ON DELETE CASCADE,
    icp TEXT,
    promise TEXT,
    differentials TEXT DEFAULT '[]',
    cases TEXT DEFAULT '[]',
    mission TEXT,
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS instagram_leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL DEFAULT 1,
    form_id TEXT,
    form_name TEXT,
    lead_id TEXT UNIQUE,
    ad_id TEXT,
    campaign_name TEXT,
    contact_id INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
    data TEXT DEFAULT '{}',
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL DEFAULT 1,
    title TEXT NOT NULL,
    description TEXT,
    assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    content_piece_id INTEGER REFERENCES content_pieces(id) ON DELETE SET NULL,
    campaign_id INTEGER REFERENCES campaigns(id) ON DELETE SET NULL,
    agency_client_id INTEGER REFERENCES agency_clients(id) ON DELETE SET NULL,
    priority TEXT DEFAULT 'media',
    status TEXT DEFAULT 'a_fazer',
    due_date TEXT,
    estimated_minutes INTEGER,
    total_minutes INTEGER DEFAULT 0,
    started_at TEXT,
    completed_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS task_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    started_at TEXT NOT NULL,
    ended_at TEXT,
    minutes INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS task_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS workflow_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    stages TEXT NOT NULL DEFAULT '[]',
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

// Migrations: add tenant_id to existing tables if upgrading
const migrations = [
  "ALTER TABLE contacts ADD COLUMN tenant_id INTEGER NOT NULL DEFAULT 1",
  "ALTER TABLE deals ADD COLUMN tenant_id INTEGER NOT NULL DEFAULT 1",
  "ALTER TABLE conversations ADD COLUMN tenant_id INTEGER NOT NULL DEFAULT 1",
  "ALTER TABLE activities ADD COLUMN tenant_id INTEGER NOT NULL DEFAULT 1",
  "ALTER TABLE instagram_leads ADD COLUMN tenant_id INTEGER NOT NULL DEFAULT 1",
  "ALTER TABLE users ADD COLUMN avatar TEXT",
  "ALTER TABLE contacts ADD COLUMN referred_by_id INTEGER REFERENCES contacts(id) ON DELETE SET NULL",
  "ALTER TABLE users ADD COLUMN agency_client_id INTEGER REFERENCES agency_clients(id) ON DELETE SET NULL",
  "ALTER TABLE users ADD COLUMN job_title TEXT",
  "ALTER TABLE tasks ADD COLUMN stage TEXT DEFAULT 'geral'",
  "ALTER TABLE tasks ADD COLUMN parent_task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL",
  "ALTER TABLE content_pieces ADD COLUMN batch_id INTEGER REFERENCES feed_batches(id) ON DELETE SET NULL",
  "ALTER TABLE content_pieces ADD COLUMN copy_text TEXT DEFAULT ''",
  "ALTER TABLE content_pieces ADD COLUMN media_files TEXT DEFAULT '[]'",
  "ALTER TABLE content_pieces ADD COLUMN copy_hook TEXT DEFAULT ''",
  "ALTER TABLE content_pieces ADD COLUMN copy_cta TEXT DEFAULT ''",
  "ALTER TABLE content_pieces ADD COLUMN post_references TEXT DEFAULT '[]'",
  "ALTER TABLE feed_batches ADD COLUMN default_template_id INTEGER REFERENCES workflow_templates(id) ON DELETE SET NULL",
  "ALTER TABLE agency_clients ADD COLUMN is_agency INTEGER DEFAULT 0",
  "ALTER TABLE agency_clients ADD COLUMN ceo_message TEXT",
  `CREATE TABLE IF NOT EXISTS user_agency_clients (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    agency_client_id INTEGER NOT NULL REFERENCES agency_clients(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, agency_client_id)
  )`,
];
for (const sql of migrations) {
  try { db.exec(sql); } catch { /* column already exists */ }
}
// Promote Amanda to alta gestão (manager) — runs after job_title column is guaranteed to exist
db.prepare("UPDATE users SET role = 'manager', job_title = 'Head de Operação' WHERE email = 'amanda@lunacomunica.com'").run();

// Migration: promote first tenant-1 admin to owner
{
  const firstAdmin = db.prepare("SELECT id FROM users WHERE tenant_id = 1 AND role = 'owner' ORDER BY id LIMIT 1").get() as any;
  if (!firstAdmin) {
    const firstLegacy = db.prepare("SELECT id FROM users WHERE tenant_id = 1 AND role IN ('admin', 'superadmin') ORDER BY id LIMIT 1").get() as any;
    if (firstLegacy) db.prepare("UPDATE users SET role = 'owner' WHERE id = ?").run(firstLegacy.id);
  }
}

// Seed default tenant + admin user if empty
const tenantCount = (db.prepare('SELECT COUNT(*) as count FROM tenants').get() as any).count;

if (tenantCount === 0) {
  const insertTenant = db.prepare(`INSERT INTO tenants (name, slug) VALUES (?, ?)`);
  insertTenant.run('Lun.ia', 'lunia');

  const passwordHash = '$2b$10$mrWKuVQVqaO.2Z5dvX3zde9Ldc3R2KqSkEVaWCxTcqVc9RQRRJqOe';
  db.prepare(`INSERT INTO users (tenant_id, name, email, password_hash, role) VALUES (1, 'Admin', 'admin@lunia.com', ?, 'owner')`).run(passwordHash);
}

db.prepare("UPDATE users SET role = 'owner' WHERE role IN ('admin', 'superadmin')").run();
db.prepare("UPDATE users SET role = 'manager' WHERE role = 'user'").run();

export default db;
