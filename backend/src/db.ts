import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '../../lunia.db');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
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
    contact_id INTEGER,
    deal_id INTEGER,
    type TEXT,
    description TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS instagram_leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
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

const contactCount = (db.prepare('SELECT COUNT(*) as count FROM contacts').get() as any).count;

if (contactCount === 0) {
  const insertContact = db.prepare(`
    INSERT INTO contacts (name, email, phone, source, status, tags, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now', ? || ' days'))
  `);

  const contacts = [
    ['Ana Souza', 'ana@empresa.com', '+5511999001234', 'whatsapp', 'lead', '["quente","produto-a"]', 'Interessada no plano premium', '-2'],
    ['Bruno Costa', 'bruno@agencia.com', '+5511998765432', 'instagram', 'qualified', '["frio","produto-b"]', 'Pediu proposta', '-5'],
    ['Carla Lima', 'carla@consultoria.com', '+5521997654321', 'ads', 'customer', '["quente"]', 'Cliente ativo', '-10'],
    ['Diego Ferreira', 'diego@startup.com', '+5531996543210', 'manual', 'lead', '[]', '', '-1'],
    ['Elena Martins', 'elena@mktdigital.com', '+5541995432109', 'whatsapp', 'qualified', '["quente"]', 'Negociando valores', '-3'],
    ['Fábio Oliveira', 'fabio@ecommerce.com', '+5551994321098', 'instagram', 'lead', '["produto-a"]', '', '-7'],
    ['Gabriela Nunes', 'gabi@design.com', '+5561993210987', 'ads', 'customer', '["fidelizado"]', 'Renovou contrato', '-15'],
    ['Henrique Alves', 'henrique@tech.com', '+5571992109876', 'manual', 'lost', '[]', 'Escolheu concorrente', '-20'],
    ['Isabela Castro', 'isa@rh.com', '+5581991098765', 'whatsapp', 'qualified', '["quente"]', 'Reunião agendada', '-4'],
    ['João Paulo', 'joao@financas.com', '+5511990987654', 'instagram', 'lead', '["produto-b"]', '', '-6'],
  ];

  const ids: number[] = [];
  for (const c of contacts) {
    ids.push(Number(insertContact.run(...c).lastInsertRowid));
  }

  const insertDeal = db.prepare(`
    INSERT INTO deals (contact_id, title, value, stage, probability, expected_close_date, created_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now', ? || ' days'))
  `);

  insertDeal.run(ids[0], 'Plano Premium - Ana', 2500, 'proposal', 60, '2026-06-30', '-3');
  insertDeal.run(ids[1], 'Serviço de Marketing - Bruno', 5000, 'negotiation', 75, '2026-06-15', '-8');
  insertDeal.run(ids[2], 'Consultoria Mensal - Carla', 8000, 'closing', 90, '2026-06-10', '-12');
  insertDeal.run(ids[4], 'Pack Redes Sociais - Elena', 3500, 'proposal', 55, '2026-07-01', '-2');
  insertDeal.run(ids[6], 'Renovação Anual - Gabriela', 12000, 'closing', 95, '2026-06-08', '-1');
  insertDeal.run(ids[8], 'Onboarding RH - Isabela', 4500, 'prospecting', 30, '2026-07-15', '-5');
  insertDeal.run(ids[3], 'Demo Trial - Diego', 1000, 'prospecting', 20, '2026-07-20', '-1');

  const insertConv = db.prepare(`
    INSERT INTO conversations (contact_id, platform, external_id, unread_count, last_message_at)
    VALUES (?, ?, ?, ?, datetime('now', ? || ' hours'))
  `);
  const insertMsg = db.prepare(`
    INSERT INTO messages (conversation_id, content, direction, status, timestamp)
    VALUES (?, ?, ?, ?, datetime('now', ? || ' hours'))
  `);

  const c1 = Number(insertConv.run(ids[0], 'whatsapp', 'wa_001', 2, '-1').lastInsertRowid);
  insertMsg.run(c1, 'Olá! Vi o anúncio de vocês e fiquei interessada.', 'inbound', 'read', '-25');
  insertMsg.run(c1, 'Oi Ana! Fico feliz em te atender. Qual produto te interessou?', 'outbound', 'read', '-24');
  insertMsg.run(c1, 'O plano premium! Quais são os valores?', 'inbound', 'read', '-23');
  insertMsg.run(c1, 'Vou te enviar uma proposta completa agora mesmo!', 'outbound', 'delivered', '-22');
  insertMsg.run(c1, 'Recebi! Vou analisar e retorno em breve 😊', 'inbound', 'read', '-2');
  insertMsg.run(c1, 'Oi! Você conseguiu ver a proposta?', 'inbound', 'read', '-1');

  const c2 = Number(insertConv.run(ids[4], 'whatsapp', 'wa_002', 1, '-0.5').lastInsertRowid);
  insertMsg.run(c2, 'Bom dia! Quero saber mais sobre o pack de redes sociais', 'inbound', 'read', '-5');
  insertMsg.run(c2, 'Bom dia, Elena! Pode me contar o que precisa?', 'outbound', 'read', '-4.5');
  insertMsg.run(c2, 'Gerencio 3 marcas e preciso de automação', 'inbound', 'read', '-4');
  insertMsg.run(c2, 'Perfeito! Temos uma solução ideal. Posso enviar o material?', 'outbound', 'delivered', '-1');
  insertMsg.run(c2, 'Sim, por favor!', 'inbound', 'read', '-0.5');

  const c3 = Number(insertConv.run(ids[8], 'whatsapp', 'wa_003', 0, '-3').lastInsertRowid);
  insertMsg.run(c3, 'Boa tarde! Gostaria de agendar uma reunião', 'inbound', 'read', '-10');
  insertMsg.run(c3, 'Boa tarde, Isabela! Quando seria bom para você?', 'outbound', 'read', '-9');
  insertMsg.run(c3, 'Na quinta-feira às 14h?', 'inbound', 'read', '-8');
  insertMsg.run(c3, 'Perfeito! Confirmado para quinta às 14h ✅', 'outbound', 'read', '-3');

  const c4 = Number(insertConv.run(ids[1], 'instagram', 'ig_001', 3, '-0.5').lastInsertRowid);
  insertMsg.run(c4, 'Oi, vi o post de vocês e quero saber mais!', 'inbound', 'read', '-48');
  insertMsg.run(c4, 'Olá Bruno! O que você precisa?', 'outbound', 'read', '-47');
  insertMsg.run(c4, 'Vocês trabalham com agências?', 'inbound', 'read', '-46');
  insertMsg.run(c4, 'Sim! Temos planos especiais para agências.', 'outbound', 'delivered', '-2');
  insertMsg.run(c4, 'Sim please! Qual o melhor horário para uma call?', 'inbound', 'read', '-0.5');

  const c5 = Number(insertConv.run(ids[9], 'instagram', 'ig_002', 1, '-2').lastInsertRowid);
  insertMsg.run(c5, 'Oi! Quero parcerias 🙌', 'inbound', 'read', '-24');
  insertMsg.run(c5, 'Olá João! Me conta mais?', 'outbound', 'read', '-20');
  insertMsg.run(c5, 'Sou do setor financeiro e preciso de automação', 'inbound', 'read', '-2');

  const insertLead = db.prepare(`
    INSERT INTO instagram_leads (form_id, form_name, lead_id, ad_id, campaign_name, contact_id, data, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now', ? || ' days'))
  `);
  insertLead.run('form_001', 'Lead Form - Produto A', 'lead_001', 'ad_abc123', 'Campanha Black Friday', ids[2], JSON.stringify({ name: 'Carla Lima', email: 'carla@consultoria.com', phone: '+5521997654321', interesse: 'Consultoria' }), '-10');
  insertLead.run('form_001', 'Lead Form - Produto A', 'lead_002', 'ad_abc123', 'Campanha Black Friday', ids[5], JSON.stringify({ name: 'Fábio Oliveira', email: 'fabio@ecommerce.com', phone: '+5551994321098', interesse: 'E-commerce' }), '-7');
  insertLead.run('form_002', 'Lead Form - Demo Grátis', 'lead_003', 'ad_def456', 'Campanha Janeiro', null, JSON.stringify({ name: 'Marcos Pereira', email: 'marcos@vendas.com', phone: '+5511988776655', interesse: 'Vendas' }), '-3');
  insertLead.run('form_002', 'Lead Form - Demo Grátis', 'lead_004', 'ad_def456', 'Campanha Janeiro', null, JSON.stringify({ name: 'Sandra Torres', email: 'sandra@moda.com', phone: '+5521977665544', interesse: 'Moda' }), '-2');
  insertLead.run('form_003', 'Webinar Gratuito', 'lead_005', 'ad_ghi789', 'Campanha Webinar', null, JSON.stringify({ name: 'Ricardo Mendes', email: 'ricardo@logistica.com', phone: '+5531966554433', interesse: 'Logística' }), '-1');

  const insertAct = db.prepare(`INSERT INTO activities (contact_id, deal_id, type, description, created_at) VALUES (?, ?, ?, ?, datetime('now', ? || ' hours'))`);
  insertAct.run(ids[0], 1, 'whatsapp', 'Perguntou sobre a proposta via WhatsApp', '-1');
  insertAct.run(ids[2], 3, 'stage_change', 'Deal movido para Fechamento', '-2');
  insertAct.run(ids[4], 4, 'note', 'Reunião agendada para segunda-feira às 10h', '-3');
  insertAct.run(ids[8], 6, 'meeting', 'Reunião confirmada para quinta-feira', '-3');
  insertAct.run(ids[1], 2, 'instagram', 'Novo DM no Instagram — pediu call', '-0.5');
  insertAct.run(ids[6], 5, 'stage_change', 'Renovação confirmada — movido para Fechamento', '-1');
}

export default db;
