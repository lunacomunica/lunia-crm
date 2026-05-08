import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';


const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '../../lunia.db');

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
    role TEXT DEFAULT 'admin',
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
];
for (const sql of migrations) {
  try { db.exec(sql); } catch { /* column already exists */ }
}

// Migration: promote first tenant-1 admin to superadmin
{
  const firstAdmin = db.prepare("SELECT id FROM users WHERE tenant_id = 1 AND role = 'admin' ORDER BY id LIMIT 1").get() as any;
  if (firstAdmin) db.prepare("UPDATE users SET role = 'superadmin' WHERE id = ?").run(firstAdmin.id);
}

// Seed default tenant + admin user if empty
const tenantCount = (db.prepare('SELECT COUNT(*) as count FROM tenants').get() as any).count;

if (tenantCount === 0) {
  const insertTenant = db.prepare(`INSERT INTO tenants (name, slug) VALUES (?, ?)`);
  insertTenant.run('Demo', 'demo');

  const passwordHash = '$2b$10$mrWKuVQVqaO.2Z5dvX3zde9Ldc3R2KqSkEVaWCxTcqVc9RQRRJqOe';
  db.prepare(`INSERT INTO users (tenant_id, name, email, password_hash, role) VALUES (1, 'Admin', 'admin@lunia.com', ?, 'superadmin')`).run(passwordHash);

  const insertContact = db.prepare(`
    INSERT INTO contacts (tenant_id, name, email, phone, source, status, tags, notes, created_at)
    VALUES (1, ?, ?, ?, ?, ?, ?, ?, datetime('now', ? || ' days'))
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
  for (const c of contacts) ids.push(Number(insertContact.run(...c).lastInsertRowid));

  const insertDeal = db.prepare(`
    INSERT INTO deals (tenant_id, contact_id, title, value, stage, probability, expected_close_date, created_at)
    VALUES (1, ?, ?, ?, ?, ?, ?, datetime('now', ? || ' days'))
  `);
  insertDeal.run(ids[0], 'Plano Premium - Ana', 2500, 'proposal', 60, '2026-06-30', '-3');
  insertDeal.run(ids[1], 'Serviço de Marketing - Bruno', 5000, 'negotiation', 75, '2026-06-15', '-8');
  insertDeal.run(ids[2], 'Consultoria Mensal - Carla', 8000, 'closing', 90, '2026-06-10', '-12');
  insertDeal.run(ids[4], 'Pack Redes Sociais - Elena', 3500, 'proposal', 55, '2026-07-01', '-2');
  insertDeal.run(ids[6], 'Renovação Anual - Gabriela', 12000, 'closing', 95, '2026-06-08', '-1');
  insertDeal.run(ids[8], 'Onboarding RH - Isabela', 4500, 'prospecting', 30, '2026-07-15', '-5');
  insertDeal.run(ids[3], 'Demo Trial - Diego', 1000, 'prospecting', 20, '2026-07-20', '-1');

  const insertConv = db.prepare(`
    INSERT INTO conversations (tenant_id, contact_id, platform, external_id, unread_count, last_message_at)
    VALUES (1, ?, ?, ?, ?, datetime('now', ? || ' hours'))
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
    INSERT INTO instagram_leads (tenant_id, form_id, form_name, lead_id, ad_id, campaign_name, contact_id, data, created_at)
    VALUES (1, ?, ?, ?, ?, ?, ?, ?, datetime('now', ? || ' days'))
  `);
  insertLead.run('form_001', 'Lead Form - Produto A', 'lead_001', 'ad_abc123', 'Campanha Black Friday', ids[2], JSON.stringify({ name: 'Carla Lima', email: 'carla@consultoria.com', phone: '+5521997654321' }), '-10');
  insertLead.run('form_001', 'Lead Form - Produto A', 'lead_002', 'ad_abc123', 'Campanha Black Friday', ids[5], JSON.stringify({ name: 'Fábio Oliveira', email: 'fabio@ecommerce.com', phone: '+5551994321098' }), '-7');
  insertLead.run('form_002', 'Lead Form - Demo Grátis', 'lead_003', 'ad_def456', 'Campanha Janeiro', null, JSON.stringify({ name: 'Marcos Pereira', email: 'marcos@vendas.com', phone: '+5511988776655' }), '-3');
  insertLead.run('form_002', 'Lead Form - Demo Grátis', 'lead_004', 'ad_def456', 'Campanha Janeiro', null, JSON.stringify({ name: 'Sandra Torres', email: 'sandra@moda.com', phone: '+5521977665544' }), '-2');
  insertLead.run('form_003', 'Webinar Gratuito', 'lead_005', 'ad_ghi789', 'Campanha Webinar', null, JSON.stringify({ name: 'Ricardo Mendes', email: 'ricardo@logistica.com', phone: '+5531966554433' }), '-1');

  const insertAct = db.prepare(`INSERT INTO activities (tenant_id, contact_id, deal_id, type, description, created_at) VALUES (1, ?, ?, ?, ?, datetime('now', ? || ' hours'))`);
  insertAct.run(ids[0], 1, 'whatsapp', 'Perguntou sobre a proposta via WhatsApp', '-1');
  insertAct.run(ids[2], 3, 'stage_change', 'Deal movido para Fechamento', '-2');
  insertAct.run(ids[4], 4, 'note', 'Reunião agendada para segunda-feira às 10h', '-3');
  insertAct.run(ids[8], 6, 'meeting', 'Reunião confirmada para quinta-feira', '-3');
  insertAct.run(ids[1], 2, 'instagram', 'Novo DM no Instagram — pediu call', '-0.5');
  insertAct.run(ids[6], 5, 'stage_change', 'Renovação confirmada — movido para Fechamento', '-1');

}

// Seed marketing demo data independently (runs even on existing DBs)
const agencyCount = (db.prepare('SELECT COUNT(*) as count FROM agency_clients').get() as any).count;
if (agencyCount === 0) {
  const insertClient = db.prepare(`
    INSERT INTO agency_clients (tenant_id, name, segment, instagram_handle, contact_name, contact_email, active)
    VALUES (1, ?, ?, ?, ?, ?, 1)
  `);
  const client1Id = Number(insertClient.run('Studio Z', 'Moda & Lifestyle', 'studioz', 'Bia Torres', 'bia@studioz.com').lastInsertRowid);
  const client2Id = Number(insertClient.run('Café Boreal', 'Gastronomia', 'cafeboreal', 'Rafael Nunes', 'rafael@cafeboreal.com').lastInsertRowid);

  const insertContent = db.prepare(`
    INSERT INTO content_pieces (tenant_id, agency_client_id, title, type, status, caption, objective, scheduled_date, media_url, created_at)
    VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', ? || ' days'))
  `);

  // Studio Z — mix de status com imagens placeholder (picsum)
  insertContent.run(client1Id, 'Nova Coleção Verão', 'post', 'aprovado',
    'Chegou a coleção que você esperava ☀️ Peças leves, elegantes e com muito estilo. Link na bio!',
    'Apresentar nova coleção e gerar tráfego pro site',
    '2026-05-10', 'https://picsum.photos/seed/c1/600/600', '-5');

  insertContent.run(client1Id, 'Behind the scenes — Ensaio', 'reels', 'aprovado',
    'De dentro do estúdio para o seu feed 🎬 Veja como foi o making of do nosso último ensaio.',
    'Humanizar a marca e aumentar engajamento',
    '2026-05-12', 'https://picsum.photos/seed/c2/600/600', '-4');

  insertContent.run(client1Id, 'Promoção Dia das Mães', 'carrossel', 'aguardando_aprovacao',
    'Presente especial para quem você ama 💛 Até 30% OFF em peças selecionadas. Só até domingo!',
    'Converter vendas no feriado',
    '2026-05-11', 'https://picsum.photos/seed/c3/600/600', '-2');

  insertContent.run(client1Id, 'Look do Dia — Azul Marinho', 'post', 'aguardando_aprovacao',
    'O azul marinho nunca sai de moda 💙 Combine com tudo e esteja sempre pronta.',
    'Inspirar o público com looks do dia',
    '2026-05-14', 'https://picsum.photos/seed/c4/600/600', '-1');

  insertContent.run(client1Id, 'Story — Flash Sale 24h', 'story', 'ajuste_solicitado',
    'FLASH SALE ⚡ 24h apenas! Não perde!',
    'Urgência para converter seguidores',
    '2026-05-08', 'https://picsum.photos/seed/c5/600/600', '-3');

  insertContent.run(client1Id, 'Reels Tendências Outono', 'reels', 'em_revisao',
    null, 'Antecipar tendências da nova estação', '2026-05-18',
    'https://picsum.photos/seed/c6/600/600', '-1');

  insertContent.run(client1Id, 'Post Institucional — Valores', 'post', 'em_criacao',
    null, 'Fortalecer identidade de marca', '2026-05-22',
    null, '0');

  insertContent.run(client1Id, 'Coleção Inverno — Teaser', 'post', 'agendado',
    'O frio chegou com tudo 🧥 Prepare-se para a nova coleção.',
    'Gerar antecipação para o lançamento de inverno',
    '2026-05-20', 'https://picsum.photos/seed/c8/600/600', '-6');

  insertContent.run(client1Id, 'Post Publicado — Março', 'post', 'publicado',
    'Março chegou com muita novidade! Fique de olho no nosso feed 👀',
    'Engajamento geral da marca',
    '2026-03-01', 'https://picsum.photos/seed/c9/600/600', '-30');

  // Café Boreal — conteúdos de gastronomia
  insertContent.run(client2Id, 'Novo Cardápio de Inverno', 'carrossel', 'aguardando_aprovacao',
    'Novidades quentinhas esperando por você ☕ Conheça nosso cardápio de inverno.',
    'Apresentar novos itens e atrair clientes',
    '2026-05-15', 'https://picsum.photos/seed/cb1/600/600', '-1');

  insertContent.run(client2Id, 'Drink da Semana', 'post', 'aprovado',
    'Drink da semana: Espresso Tônica 🍋 Refrescante e cheio de personalidade.',
    'Destacar bebida especial e gerar pedidos',
    '2026-05-09', 'https://picsum.photos/seed/cb2/600/600', '-3');

  insertContent.run(client2Id, 'Story — Ambiente do Café', 'story', 'em_criacao',
    null, 'Mostrar o ambiente aconchegante', '2026-05-16',
    null, '0');
}

// Seed campaigns demo data
const campaignCount = (db.prepare('SELECT COUNT(*) as count FROM campaigns').get() as any).count;
if (campaignCount === 0) {
  const clients = db.prepare('SELECT id, name FROM agency_clients LIMIT 2').all() as any[];
  if (clients.length >= 1) {
    const c1 = clients[0].id;
    const c2 = clients[1]?.id || clients[0].id;

    const insertCampaign = db.prepare(`
      INSERT INTO campaigns (tenant_id, agency_client_id, name, platform, status, objective, budget, spent, revenue, impressions, clicks, conversions, target_audience, utm_link, start_date, end_date, notes)
      VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const cam1 = Number(insertCampaign.run(c1, 'Coleção Verão — Conversão', 'meta', 'ativa', 'conversao',
      1500, 1247.80, 4320, 84300, 1842, 38, 'Mulheres 25-40 interessadas em moda, SP e RJ',
      'https://studioz.com.br/colecao-verao?utm_source=meta&utm_campaign=verao2026',
      '2026-05-01', '2026-05-31', 'Campanha principal da coleção verão').lastInsertRowid);

    const cam2 = Number(insertCampaign.run(c1, 'Retargeting — Visitantes do Site', 'meta', 'ativa', 'conversao',
      600, 412.50, 1890, 31200, 724, 18, 'Retargeting visitantes últimos 30 dias',
      null, '2026-05-05', '2026-05-25', 'Público quente — reimpacto com oferta especial').lastInsertRowid);

    const cam3 = Number(insertCampaign.run(c1, 'Reconhecimento de Marca Q2', 'meta', 'pausada', 'reconhecimento',
      800, 800, 0, 210000, 3100, 0, 'Lookalike clientes — Brasil nacional',
      null, '2026-04-01', '2026-04-30', 'Campanha de topo de funil encerrada em abril').lastInsertRowid);

    const cam4 = Number(insertCampaign.run(c2, 'Lançamento Cardápio Inverno', 'meta', 'ativa', 'trafego',
      900, 631.20, 0, 52400, 1580, 0, 'Homens e mulheres 28-50, raio 10km do café',
      'https://cafeboreal.com/cardapio?utm_source=meta&utm_campaign=inverno',
      '2026-05-03', '2026-06-03', null).lastInsertRowid);

    const cam5 = Number(insertCampaign.run(c2, 'Google — Café Gourmet SP', 'google', 'ativa', 'trafego',
      400, 298.60, 0, 18700, 842, 0, 'Busca: café gourmet são paulo, cafeteria pinheiros',
      null, '2026-05-01', null, 'Campanha de pesquisa Google Ads').lastInsertRowid);

    const insertCreative = db.prepare(`
      INSERT INTO campaign_creatives (campaign_id, title, type, media_url, headline, description, cta, status, impressions, clicks, conversions, spend)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertCreative.run(cam1, 'Look Azul Marinho', 'image', 'https://picsum.photos/seed/cr1/800/800',
      'A peça que todo closet precisa', 'Azul marinho clássico. Disponível em 3 tamanhos. Frete grátis.',
      'Comprar Agora', 'ativo', 41200, 934, 19, 618.40);
    insertCreative.run(cam1, 'Carrossel Nova Coleção', 'carousel', 'https://picsum.photos/seed/cr2/800/800',
      'Conheça a coleção completa', '5 looks para arrasar no verão. Desconto especial para primeiros pedidos.',
      'Ver Coleção', 'ativo', 28600, 712, 14, 423.80);
    insertCreative.run(cam1, 'Vídeo Making of', 'video', 'https://picsum.photos/seed/cr3/800/800',
      'De dentro do estúdio para você', 'Veja como nossa coleção é criada com muito carinho.',
      'Saiba Mais', 'pausado', 14500, 196, 5, 205.60);

    insertCreative.run(cam2, 'Oferta Especial — Retargeting', 'image', 'https://picsum.photos/seed/cr4/800/800',
      'Você deixou algo para trás 👀', 'Volte e aproveite 10% OFF exclusivo para você.',
      'Aproveitar Oferta', 'ativo', 31200, 724, 18, 412.50);

    insertCreative.run(cam4, 'Foto Ambiente', 'image', 'https://picsum.photos/seed/cr5/800/800',
      'O lugar perfeito para o seu inverno', 'Ambiente aconchegante, drinks especiais e muito sabor.',
      'Reservar Mesa', 'ativo', 31800, 960, 0, 382.10);
    insertCreative.run(cam4, 'Vídeo Cardápio', 'video', 'https://picsum.photos/seed/cr6/800/800',
      'Novidades quentinhas chegaram', 'Conheça nosso cardápio de inverno com ingredientes selecionados.',
      'Ver Cardápio', 'ativo', 20600, 620, 0, 249.10);
  }
}

export default db;
