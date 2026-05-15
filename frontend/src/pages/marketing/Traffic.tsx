import { useEffect, useState, useRef } from 'react';
import { Plus, X, Trash2, ChevronDown, ExternalLink, TrendingUp, MousePointerClick, Eye, Target, DollarSign, Pencil, Image, Video, LayoutGrid, Users, Link, FileText, ChevronRight, Play, Pause, CheckCircle2 } from 'lucide-react';
import { campaignsApi, agencyClientsApi, contentApi } from '../../api/client';
import { Campaign, CampaignCreative, CampaignPlatform, CampaignStatus, CampaignObjective, CreativeType, CreativeStatus, AgencyClient } from '../../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ── Config ──────────────────────────────────────────────────────────────────

const PLATFORM: Record<CampaignPlatform, { label: string; color: string; bg: string }> = {
  meta:            { label: 'Meta Ads',          color: '#60a5fa', bg: 'rgba(59,130,246,0.12)' },
  google:          { label: 'Google Ads',         color: '#f87171', bg: 'rgba(239,68,68,0.12)' },
  tiktok:          { label: 'TikTok Ads',         color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
  linkedin:        { label: 'LinkedIn Ads',       color: '#38bdf8', bg: 'rgba(56,189,248,0.12)' },
  instagram_boost: { label: 'Turbinar Instagram', color: '#ec4899', bg: 'rgba(236,72,153,0.12)' },
};

const STATUS: Record<CampaignStatus, { label: string; color: string; bg: string; border: string }> = {
  rascunho:  { label: 'Rascunho',  color: '#94a3b8', bg: 'rgba(148,163,184,0.08)', border: 'rgba(148,163,184,0.2)' },
  ativa:     { label: 'Ativa',     color: '#34d399', bg: 'rgba(52,211,153,0.1)',   border: 'rgba(52,211,153,0.25)' },
  pausada:   { label: 'Pausada',   color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',   border: 'rgba(245,158,11,0.25)' },
  encerrada: { label: 'Encerrada', color: '#64748b', bg: 'rgba(100,116,139,0.08)', border: 'rgba(100,116,139,0.2)' },
};

const OBJECTIVE: Record<CampaignObjective, string> = {
  conversao:      'Conversão',
  trafego:        'Tráfego',
  reconhecimento: 'Reconhecimento',
  leads:          'Geração de Leads',
  vendas:         'Vendas',
};

const CREATIVE_TYPE: Record<CreativeType, { label: string; icon: any }> = {
  image:    { label: 'Imagem',    icon: Image },
  video:    { label: 'Vídeo',     icon: Video },
  carousel: { label: 'Carrossel', icon: LayoutGrid },
};

const CREATIVE_STATUS: Record<CreativeStatus, { label: string; color: string }> = {
  ativo:     { label: 'Ativo',     color: '#34d399' },
  pausado:   { label: 'Pausado',   color: '#f59e0b' },
  reprovado: { label: 'Reprovado', color: '#f87171' },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) => n >= 1000000 ? `${(n/1000000).toFixed(1)}M` : n >= 1000 ? `${(n/1000).toFixed(1)}k` : String(n);
const fmtR = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });
const ctr = (clicks: number, impr: number) => impr > 0 ? ((clicks / impr) * 100).toFixed(2) + '%' : '—';
const cpc = (spent: number, clicks: number) => clicks > 0 ? fmtR(spent / clicks) : '—';
const cpl = (spent: number, conv: number) => conv > 0 ? fmtR(spent / conv) : '—';
const roas = (rev: number, spent: number) => spent > 0 && rev > 0 ? (rev / spent).toFixed(2) + 'x' : '—';

const selectStyle = {
  background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: '0.75rem', padding: '0.5rem 0.875rem', color: '#e2e8f0',
  fontSize: '0.8rem', outline: 'none', cursor: 'pointer',
};

const emptyForm = {
  agency_client_id: '', name: '', platform: 'meta' as CampaignPlatform,
  status: 'rascunho' as CampaignStatus, objective: 'trafego' as CampaignObjective,
  budget: '', target_audience: '', start_date: '', end_date: '', notes: '',
};

const emptyCreativeForm = {
  title: '', type: 'image' as CreativeType, media_url: '', headline: '', description: '',
  cta: '', status: 'ativo' as CreativeStatus, utm_link: '',
  impressions: '', clicks: '', conversions: '', spend: '',
  content_piece_id: '' as string | number,
};

function getBoostThumb(p: any): string {
  if (p.media_files) {
    try {
      const files = typeof p.media_files === 'string' ? JSON.parse(p.media_files) : p.media_files;
      if (Array.isArray(files) && files.length > 0) return files[0].url || '';
    } catch {}
  }
  return p.media_url || '';
}

// ── Components ───────────────────────────────────────────────────────────────

function MetricCard({ label, value, sub, icon: Icon, color }: { label: string; value: string; sub?: string; icon: any; color: string }) {
  return (
    <div className="card px-5 py-4 flex items-center gap-4">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}12`, border: `1px solid ${color}25` }}>
        <Icon size={18} style={{ color }} />
      </div>
      <div>
        <p className="text-xl font-semibold text-white">{value}</p>
        <p className="text-xs" style={{ color: 'rgba(100,116,139,0.6)' }}>{label}</p>
        {sub && <p className="text-[10px] mt-0.5" style={{ color: 'rgba(100,116,139,0.4)' }}>{sub}</p>}
      </div>
    </div>
  );
}

function CampaignCard({ c, onOpen, onEdit, onDelete }: { c: Campaign; onOpen: () => void; onEdit: () => void; onDelete: () => void }) {
  const plat = PLATFORM[c.platform];
  const stat = STATUS[c.status];
  const budgetPct = c.budget > 0 ? Math.min((c.spent / c.budget) * 100, 100) : 0;

  return (
    <div className="card p-5 cursor-pointer group transition-all duration-200 hover:border-blue-500/20"
      onClick={onOpen}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ color: plat.color, background: plat.bg }}>{plat.label}</span>
          <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ color: stat.color, background: stat.bg, border: `1px solid ${stat.border}` }}>{stat.label}</span>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
          <button onClick={onEdit} className="p-1.5 rounded-lg transition-all"
            style={{ color: 'rgba(100,116,139,0.5)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#60a5fa'; (e.currentTarget as HTMLElement).style.background = 'rgba(59,130,246,0.1)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(100,116,139,0.5)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
            <Pencil size={12} />
          </button>
          <button onClick={onDelete} className="p-1.5 rounded-lg transition-all"
            style={{ color: 'rgba(100,116,139,0.5)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#f87171'; (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.1)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(100,116,139,0.5)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      <p className="text-sm font-semibold text-white mb-0.5">{c.name}</p>
      <p className="text-xs mb-3" style={{ color: 'rgba(100,116,139,0.5)' }}>
        {c.client_name} · {OBJECTIVE[c.objective]}
      </p>

      {/* Budget bar */}
      {c.budget > 0 && (
        <div className="mb-4">
          <div className="flex justify-between text-[10px] mb-1" style={{ color: 'rgba(100,116,139,0.5)' }}>
            <span>Investido: <span className="text-white font-medium">{fmtR(c.spent)}</span></span>
            <span>Budget: {fmtR(c.budget)}</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <div className="h-full rounded-full transition-all"
              style={{ width: `${budgetPct}%`, background: budgetPct >= 90 ? '#f87171' : budgetPct >= 70 ? '#f59e0b' : '#34d399' }} />
          </div>
        </div>
      )}

      {/* Metrics grid */}
      <div className="grid grid-cols-4 gap-2 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        {[
          { label: 'Impressões', value: fmt(c.impressions) },
          { label: 'Cliques',    value: fmt(c.clicks) },
          { label: 'CTR',        value: ctr(c.clicks, c.impressions) },
          { label: c.revenue > 0 ? 'ROAS' : 'Conv.',
            value: c.revenue > 0 ? roas(c.revenue, c.spent) : String(c.conversions) },
        ].map(m => (
          <div key={m.label} className="text-center">
            <p className="text-sm font-semibold text-white">{m.value}</p>
            <p className="text-[9px]" style={{ color: 'rgba(100,116,139,0.45)' }}>{m.label}</p>
          </div>
        ))}
      </div>

      {c.creative_count ? (
        <p className="text-[10px] mt-3 flex items-center gap-1" style={{ color: 'rgba(100,116,139,0.4)' }}>
          <Image size={9} /> {c.creative_count} criativo{c.creative_count > 1 ? 's' : ''} · clique para ver detalhes
        </p>
      ) : null}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Traffic() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [clients, setClients] = useState<AgencyClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterClient, setFilterClient] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPlatform, setFilterPlatform] = useState('all');
  const [detail, setDetail] = useState<Campaign | null>(null);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [creativeModal, setCreativeModal] = useState(false);
  const [editingCreative, setEditingCreative] = useState<CampaignCreative | null>(null);
  const [creativeForm, setCreativeForm] = useState(emptyCreativeForm);
  const [savingCreative, setSavingCreative] = useState(false);
  const [boostBatches, setBoostBatches] = useState<any[]>([]);
  const [boostSelectedBatch, setBoostSelectedBatch] = useState<number | null>(null);
  const [boostPosts, setBoostPosts] = useState<any[]>([]);
  const [boostSelectedPost, setBoostSelectedPost] = useState<any | null>(null);

  const load = () => {
    setLoading(true);
    const p: Record<string, string> = {};
    if (filterClient !== 'all') p.client_id = filterClient;
    if (filterStatus !== 'all') p.status = filterStatus;
    if (filterPlatform !== 'all') p.platform = filterPlatform;
    campaignsApi.list(p).then(r => { setCampaigns(r.data); setLoading(false); });
  };
  useEffect(() => { load(); }, [filterClient, filterStatus, filterPlatform]);
  useEffect(() => { agencyClientsApi.list(true).then(r => setClients(r.data)); }, []);

  useEffect(() => {
    if (creativeModal && detail?.platform === 'instagram_boost' && detail?.agency_client_id) {
      setBoostBatches([]); setBoostSelectedBatch(null); setBoostPosts([]); setBoostSelectedPost(null);
      contentApi.listBatches({ client_id: String(detail.agency_client_id) }).then(r => setBoostBatches(r.data));
    }
  }, [creativeModal]);

  useEffect(() => {
    if (boostSelectedBatch) {
      setBoostPosts([]);
      contentApi.list({ batch_id: String(boostSelectedBatch) }).then(r => setBoostPosts(r.data));
    }
  }, [boostSelectedBatch]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, agency_client_id: filterClient !== 'all' ? filterClient : '' });
    setModal(true);
  };
  const openEdit = (c: Campaign) => {
    setEditing(c);
    setForm({
      agency_client_id: String(c.agency_client_id || ''),
      name: c.name, platform: c.platform, status: c.status, objective: c.objective,
      budget: String(c.budget),
      target_audience: c.target_audience || '',
      start_date: c.start_date?.slice(0,10) || '', end_date: c.end_date?.slice(0,10) || '',
      notes: c.notes || '',
    });
    setModal(true);
  };

  const openDetail = async (c: Campaign) => {
    const r = await campaignsApi.get(c.id);
    setDetail(r.data);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const payload = {
      ...form,
      agency_client_id: form.agency_client_id || null,
      budget: Number(form.budget) || 0,
    };
    if (editing) {
      await campaignsApi.update(editing.id, payload);
      setSaving(false); setModal(false); load();
      if (detail?.id === editing.id) { const r = await campaignsApi.get(editing.id); setDetail(r.data); }
    } else {
      const r = await campaignsApi.create(payload);
      setSaving(false); setModal(false); load();
      // Auto-open detail so user can immediately add creatives
      const full = await campaignsApi.get(r.data.id);
      setDetail(full.data);
    }
  };

  const handleDelete = async (id: number) => {
    await campaignsApi.delete(id); setDeleting(null);
    if (detail?.id === id) setDetail(null);
    load();
  };

  const openAddCreative = () => {
    setEditingCreative(null); setCreativeForm(emptyCreativeForm);
    setBoostSelectedPost(null); setCreativeModal(true);
  };
  const openEditCreative = (cr: CampaignCreative) => {
    setEditingCreative(cr);
    setCreativeForm({
      title: cr.title, type: cr.type, media_url: cr.media_url || '', headline: cr.headline || '',
      description: cr.description || '', cta: cr.cta || '', status: cr.status,
      utm_link: (cr as any).utm_link || '',
      impressions: String(cr.impressions), clicks: String(cr.clicks),
      conversions: String(cr.conversions), spend: String(cr.spend),
      content_piece_id: (cr as any).content_piece_id || '',
    });
    setBoostSelectedPost(null); setCreativeModal(true);
  };

  const handleSaveCreative = async () => {
    if (!detail || !creativeForm.title.trim()) return;
    setSavingCreative(true);
    const payload: any = {
      ...creativeForm,
      impressions: Number(creativeForm.impressions) || 0, clicks: Number(creativeForm.clicks) || 0,
      conversions: Number(creativeForm.conversions) || 0, spend: Number(creativeForm.spend) || 0,
    };
    if (boostSelectedPost) {
      payload.content_piece_id = boostSelectedPost.id;
      const thumb = getBoostThumb(boostSelectedPost);
      if (thumb && !payload.media_url) payload.media_url = thumb;
    }
    if (editingCreative) await campaignsApi.updateCreative(detail.id, editingCreative.id, payload);
    else await campaignsApi.addCreative(detail.id, payload);
    setSavingCreative(false); setCreativeModal(false);
    const r = await campaignsApi.get(detail.id); setDetail(r.data);
  };

  const handleDeleteCreative = async (cid: number) => {
    if (!detail) return;
    await campaignsApi.deleteCreative(detail.id, cid);
    const r = await campaignsApi.get(detail.id); setDetail(r.data);
  };

  // Totals
  const totalSpent = campaigns.reduce((a, c) => a + c.spent, 0);
  const totalImpr = campaigns.reduce((a, c) => a + c.impressions, 0);
  const totalClicks = campaigns.reduce((a, c) => a + c.clicks, 0);
  const totalConv = campaigns.reduce((a, c) => a + c.conversions, 0);
  const totalRev = campaigns.reduce((a, c) => a + c.revenue, 0);

  return (
    <div className="p-8 animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="section-label mb-1">Marketing</p>
          <h1 className="text-3xl font-extralight text-white tracking-tight" style={{ textShadow: '0 0 30px rgba(59,130,246,0.2)' }}>Tráfego Pago</h1>
          <p className="text-sm mt-1" style={{ color: 'rgba(100,116,139,0.7)' }}>{campaigns.length} campanha{campaigns.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={openCreate} className="btn-primary"><Plus size={15} /> Nova Campanha</button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <MetricCard label="Investido" value={fmtR(totalSpent)} icon={DollarSign} color="#34d399" />
        <MetricCard label="Impressões" value={fmt(totalImpr)} icon={Eye} color="#60a5fa" />
        <MetricCard label="Cliques" value={fmt(totalClicks)} sub={`CTR ${ctr(totalClicks, totalImpr)}`} icon={MousePointerClick} color="#a78bfa" />
        <MetricCard label="Conversões" value={String(totalConv)} sub={`CPL ${cpl(totalSpent, totalConv)}`} icon={Target} color="#f59e0b" />
        <MetricCard label="ROAS" value={roas(totalRev, totalSpent)} sub={totalRev > 0 ? `Receita ${fmtR(totalRev)}` : 'Sem receita'} icon={TrendingUp} color="#f97316" />
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <select value={filterClient} onChange={e => setFilterClient(e.target.value)} style={selectStyle}>
          <option value="all">Todos os clientes</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={selectStyle}>
          <option value="all">Todos os status</option>
          {(Object.keys(STATUS) as CampaignStatus[]).map(s => <option key={s} value={s}>{STATUS[s].label}</option>)}
        </select>
        <select value={filterPlatform} onChange={e => setFilterPlatform(e.target.value)} style={selectStyle}>
          <option value="all">Todas as plataformas</option>
          {(Object.keys(PLATFORM) as CampaignPlatform[]).map(p => <option key={p} value={p}>{PLATFORM[p].label}</option>)}
        </select>
      </div>

      {/* Campaigns grid */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: 'rgba(59,130,246,0.3)', borderTopColor: '#3b82f6' }} />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="card p-16 text-center">
          <TrendingUp size={36} className="mx-auto mb-3" style={{ color: 'rgba(100,116,139,0.2)' }} />
          <p className="text-sm mb-4" style={{ color: 'rgba(100,116,139,0.5)' }}>Nenhuma campanha cadastrada ainda</p>
          <button onClick={openCreate} className="btn-primary mx-auto"><Plus size={14} /> Criar primeira campanha</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {campaigns.map(c => (
            <CampaignCard key={c.id} c={c}
              onOpen={() => openDetail(c)}
              onEdit={() => openEdit(c)}
              onDelete={() => setDeleting(c.id)} />
          ))}
        </div>
      )}

      {/* ── Detail panel ── */}
      {detail && (
        <div className="fixed inset-0 flex items-center justify-end z-50 animate-fade"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
          onClick={() => setDetail(null)}>
          <div className="h-full w-full max-w-xl overflow-y-auto"
            style={{ background: '#07071a', borderLeft: '1px solid rgba(59,130,246,0.12)', boxShadow: '-20px 0 60px rgba(0,0,0,0.7)' }}
            onClick={e => e.stopPropagation()}>

            {/* Panel header */}
            <div className="flex items-center justify-between px-5 py-4 sticky top-0 z-10"
              style={{ background: '#07071a', borderBottom: '1px solid rgba(59,130,246,0.08)' }}>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ color: PLATFORM[detail.platform].color, background: PLATFORM[detail.platform].bg }}>{PLATFORM[detail.platform].label}</span>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ color: STATUS[detail.status].color, background: STATUS[detail.status].bg, border: `1px solid ${STATUS[detail.status].border}` }}>{STATUS[detail.status].label}</span>
                </div>
                <p className="text-base font-semibold text-white">{detail.name}</p>
                {detail.client_name && <p className="text-xs" style={{ color: 'rgba(100,116,139,0.5)' }}>{detail.client_name} · {OBJECTIVE[detail.objective]}</p>}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => { openEdit(detail); }} className="p-1.5 rounded-lg"
                  style={{ color: 'rgba(100,116,139,0.5)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#60a5fa')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(100,116,139,0.5)')}>
                  <Pencil size={15} />
                </button>
                <button onClick={() => setDetail(null)} style={{ color: 'rgba(100,116,139,0.5)' }}><X size={18} /></button>
              </div>
            </div>

            <div className="p-5 space-y-5">
              {/* Metrics grid */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Investido',   value: fmtR(detail.spent),        sub: `Budget ${fmtR(detail.budget)}` },
                  { label: 'Impressões',  value: fmt(detail.impressions),    sub: null },
                  { label: 'Cliques',     value: fmt(detail.clicks),         sub: `CTR ${ctr(detail.clicks, detail.impressions)}` },
                  { label: 'Conversões',  value: String(detail.conversions), sub: `CPL ${cpl(detail.spent, detail.conversions)}` },
                  { label: 'CPC',         value: cpc(detail.spent, detail.clicks), sub: null },
                  { label: 'ROAS',        value: roas(detail.revenue, detail.spent), sub: detail.revenue > 0 ? fmtR(detail.revenue) : 'sem receita' },
                ].map(m => (
                  <div key={m.label} className="rounded-xl px-3 py-3 text-center"
                    style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <p className="text-base font-semibold text-white">{m.value}</p>
                    <p className="text-[10px]" style={{ color: 'rgba(100,116,139,0.5)' }}>{m.label}</p>
                    {m.sub && <p className="text-[9px] mt-0.5" style={{ color: 'rgba(100,116,139,0.35)' }}>{m.sub}</p>}
                  </div>
                ))}
              </div>

              {/* Budget bar */}
              {detail.budget > 0 && (
                <div className="rounded-xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="flex justify-between text-xs mb-2">
                    <span style={{ color: 'rgba(148,163,184,0.7)' }}>Budget utilizado</span>
                    <span className="font-medium text-white">{((detail.spent / detail.budget) * 100).toFixed(1)}%</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <div className="h-full rounded-full"
                      style={{ width: `${Math.min((detail.spent / detail.budget) * 100, 100)}%`, background: 'linear-gradient(90deg,#34d399,#60a5fa)' }} />
                  </div>
                </div>
              )}

              {/* Info fields */}
              <div className="space-y-3">
                {detail.target_audience && (
                  <div className="flex gap-3">
                    <Users size={14} className="flex-shrink-0 mt-0.5" style={{ color: 'rgba(100,116,139,0.5)' }} />
                    <div>
                      <p className="text-[10px] mb-0.5" style={{ color: 'rgba(100,116,139,0.4)' }}>Público-alvo</p>
                      <p className="text-sm" style={{ color: 'rgba(148,163,184,0.8)' }}>{detail.target_audience}</p>
                    </div>
                  </div>
                )}
                {detail.utm_link && (
                  <div className="flex gap-3 items-start">
                    <Link size={14} className="flex-shrink-0 mt-0.5" style={{ color: 'rgba(100,116,139,0.5)' }} />
                    <div className="min-w-0">
                      <p className="text-[10px] mb-0.5" style={{ color: 'rgba(100,116,139,0.4)' }}>Link / UTM</p>
                      <a href={detail.utm_link} target="_blank" rel="noreferrer"
                        className="text-xs break-all flex items-center gap-1 hover:opacity-80"
                        style={{ color: '#60a5fa' }} onClick={e => e.stopPropagation()}>
                        {detail.utm_link} <ExternalLink size={10} />
                      </a>
                    </div>
                  </div>
                )}
                {(detail.start_date || detail.end_date) && (
                  <div className="flex gap-3">
                    <FileText size={14} className="flex-shrink-0 mt-0.5" style={{ color: 'rgba(100,116,139,0.5)' }} />
                    <div>
                      <p className="text-[10px] mb-0.5" style={{ color: 'rgba(100,116,139,0.4)' }}>Período</p>
                      <p className="text-sm" style={{ color: 'rgba(148,163,184,0.8)' }}>
                        {detail.start_date ? format(new Date(detail.start_date + 'T12:00:00'), "d MMM yyyy", { locale: ptBR }) : '?'}
                        {' → '}
                        {detail.end_date ? format(new Date(detail.end_date + 'T12:00:00'), "d MMM yyyy", { locale: ptBR }) : 'Em aberto'}
                      </p>
                    </div>
                  </div>
                )}
                {detail.notes && (
                  <div className="flex gap-3">
                    <FileText size={14} className="flex-shrink-0 mt-0.5" style={{ color: 'rgba(100,116,139,0.5)' }} />
                    <div>
                      <p className="text-[10px] mb-0.5" style={{ color: 'rgba(100,116,139,0.4)' }}>Observações</p>
                      <p className="text-sm whitespace-pre-wrap" style={{ color: 'rgba(148,163,184,0.8)' }}>{detail.notes}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Creatives */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="label-dark flex items-center gap-2"><Image size={12} />Criativos ({detail.creatives?.length || 0})</p>
                  <button onClick={openAddCreative} className="flex items-center gap-1.5 text-xs transition-opacity hover:opacity-70"
                    style={{ color: '#60a5fa' }}>
                    <Plus size={12} /> Adicionar
                  </button>
                </div>

                {!detail.creatives?.length ? (
                  <button onClick={openAddCreative}
                    className="w-full flex flex-col items-center gap-2 py-6 rounded-xl border-dashed transition-all"
                    style={{ border: '1.5px dashed rgba(59,130,246,0.2)', background: 'rgba(59,130,246,0.02)', color: 'rgba(100,116,139,0.5)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(59,130,246,0.4)'; (e.currentTarget as HTMLElement).style.color = '#60a5fa'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(59,130,246,0.2)'; (e.currentTarget as HTMLElement).style.color = 'rgba(100,116,139,0.5)'; }}>
                    <Plus size={20} />
                    <span className="text-xs font-medium">Adicionar primeiro criativo</span>
                  </button>
                ) : (
                  <div className="space-y-3">
                    {detail.creatives.map(cr => {
                      const TypeIcon = CREATIVE_TYPE[cr.type].icon;
                      const cs = CREATIVE_STATUS[cr.status];
                      return (
                        <div key={cr.id} className="rounded-xl overflow-hidden"
                          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                          <div className="flex gap-3 p-3">
                            {cr.media_url ? (
                              <img src={cr.media_url} alt={cr.title} className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                                style={{ border: '1px solid rgba(255,255,255,0.06)' }} />
                            ) : (
                              <div className="w-16 h-16 rounded-lg flex items-center justify-center flex-shrink-0"
                                style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.1)' }}>
                                <TypeIcon size={20} style={{ color: 'rgba(59,130,246,0.3)' }} />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <p className="text-sm font-medium text-white truncate">{cr.title}</p>
                                <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                                  <span className="text-[10px] font-medium" style={{ color: cs.color }}>{cs.label}</span>
                                  <button onClick={() => openEditCreative(cr)} className="p-1 rounded transition-all"
                                    style={{ color: 'rgba(100,116,139,0.5)' }}
                                    onMouseEnter={e => (e.currentTarget.style.color = '#60a5fa')}
                                    onMouseLeave={e => (e.currentTarget.style.color = 'rgba(100,116,139,0.5)')}>
                                    <Pencil size={10} />
                                  </button>
                                  <button onClick={() => handleDeleteCreative(cr.id)} className="p-1 rounded transition-all"
                                    style={{ color: 'rgba(100,116,139,0.5)' }}
                                    onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
                                    onMouseLeave={e => (e.currentTarget.style.color = 'rgba(100,116,139,0.5)')}>
                                    <X size={10} />
                                  </button>
                                </div>
                              </div>
                              {cr.headline && <p className="text-xs truncate mb-2" style={{ color: 'rgba(148,163,184,0.6)' }}>{cr.headline}</p>}
                              <div className="flex gap-3 text-[10px]" style={{ color: 'rgba(100,116,139,0.5)' }}>
                                <span><span className="text-white font-medium">{fmt(cr.impressions)}</span> impr.</span>
                                <span><span className="text-white font-medium">{fmt(cr.clicks)}</span> cliques</span>
                                <span>CTR <span className="text-white font-medium">{ctr(cr.clicks, cr.impressions)}</span></span>
                                {cr.spend > 0 && <span><span className="text-white font-medium">{fmtR(cr.spend)}</span></span>}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Campaign modal ── */}
      {modal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4 animate-fade"
          style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)' }}>
          <div className="modal-card w-full max-w-2xl animate-fade-up">
            <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid rgba(59,130,246,0.1)' }}>
              <div>
                <p className="section-label mb-0.5">{editing ? 'Editar' : 'Nova'}</p>
                <h2 className="text-lg font-light text-white">{editing ? editing.name : 'Criar Campanha'}</h2>
              </div>
              <button onClick={() => setModal(false)} style={{ color: 'rgba(100,116,139,0.6)' }}><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="label-dark">Nome da campanha *</label>
                  <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="input-dark" placeholder="Ex: Coleção Verão — Conversão" />
                </div>
                <div>
                  <label className="label-dark">Cliente</label>
                  <select value={form.agency_client_id} onChange={e => setForm({ ...form, agency_client_id: e.target.value })} className="input-dark" style={{ cursor: 'pointer' }}>
                    <option value="">Selecionar cliente</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label-dark">Plataforma</label>
                  <select value={form.platform} onChange={e => setForm({ ...form, platform: e.target.value as CampaignPlatform })} className="input-dark" style={{ cursor: 'pointer' }}>
                    {(Object.keys(PLATFORM) as CampaignPlatform[]).map(p => <option key={p} value={p}>{PLATFORM[p].label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label-dark">Status</label>
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as CampaignStatus })} className="input-dark" style={{ cursor: 'pointer' }}>
                    {(Object.keys(STATUS) as CampaignStatus[]).map(s => <option key={s} value={s}>{STATUS[s].label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label-dark">Objetivo</label>
                  <select value={form.objective} onChange={e => setForm({ ...form, objective: e.target.value as CampaignObjective })} className="input-dark" style={{ cursor: 'pointer' }}>
                    {(Object.keys(OBJECTIVE) as CampaignObjective[]).map(o => <option key={o} value={o}>{OBJECTIVE[o]}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-dark">Budget (R$)</label>
                  <input type="number" min="0" value={form.budget} onChange={e => setForm({ ...form, budget: e.target.value })} className="input-dark" placeholder="0" />
                </div>
                <div />
                <div>
                  <label className="label-dark">Início</label>
                  <input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} className="input-dark" />
                </div>
                <div>
                  <label className="label-dark">Fim</label>
                  <input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} className="input-dark" />
                </div>
                <div className="col-span-2">
                  <label className="label-dark">Público-alvo</label>
                  <input value={form.target_audience} onChange={e => setForm({ ...form, target_audience: e.target.value })} className="input-dark" placeholder="Ex: Mulheres 25-40 interessadas em moda, SP e RJ" />
                </div>
                <div className="col-span-2">
                  <label className="label-dark">Observações</label>
                  <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} className="input-dark resize-none" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={() => setModal(false)} className="btn-ghost flex-1 justify-center">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 justify-center">
                {saving ? 'Salvando…' : editing ? 'Salvar' : 'Criar Campanha'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Creative modal ── */}
      {creativeModal && detail && (
        <div className="fixed inset-0 flex items-center justify-center z-[60] p-4 animate-fade"
          style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)' }}>
          <div className="modal-card w-full max-w-lg animate-fade-up">
            <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid rgba(59,130,246,0.1)' }}>
              <h2 className="text-lg font-light text-white">{editingCreative ? 'Editar Criativo' : 'Novo Criativo'}</h2>
              <button onClick={() => setCreativeModal(false)} style={{ color: 'rgba(100,116,139,0.6)' }}><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="label-dark">Título *</label>
                  <input value={creativeForm.title} onChange={e => setCreativeForm({ ...creativeForm, title: e.target.value })} className="input-dark" placeholder="Ex: Look Azul Marinho" />
                </div>
                <div>
                  <label className="label-dark">Tipo</label>
                  <select value={creativeForm.type} onChange={e => setCreativeForm({ ...creativeForm, type: e.target.value as CreativeType })} className="input-dark" style={{ cursor: 'pointer' }}>
                    {(Object.keys(CREATIVE_TYPE) as CreativeType[]).map(t => <option key={t} value={t}>{CREATIVE_TYPE[t].label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label-dark">Status</label>
                  <select value={creativeForm.status} onChange={e => setCreativeForm({ ...creativeForm, status: e.target.value as CreativeStatus })} className="input-dark" style={{ cursor: 'pointer' }}>
                    {(Object.keys(CREATIVE_STATUS) as CreativeStatus[]).map(s => <option key={s} value={s}>{CREATIVE_STATUS[s].label}</option>)}
                  </select>
                </div>
                {detail?.platform === 'instagram_boost' ? (
                  <div className="col-span-2">
                    <label className="label-dark">Post do feed</label>
                    {boostSelectedPost ? (
                      <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(236,72,153,0.06)', border: '1px solid rgba(236,72,153,0.2)' }}>
                        {getBoostThumb(boostSelectedPost) ? (
                          <img src={getBoostThumb(boostSelectedPost)} alt="" className="w-12 rounded-lg object-cover flex-shrink-0" style={{ aspectRatio: '1080/1350' }} />
                        ) : (
                          <div className="w-12 rounded-lg flex-shrink-0" style={{ aspectRatio: '1080/1350', background: 'rgba(255,255,255,0.05)' }} />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-white truncate">{boostSelectedPost.title || 'Post sem título'}</p>
                          {boostSelectedPost.scheduled_date && <p className="text-[10px] mt-0.5" style={{ color: 'rgba(100,116,139,0.5)' }}>{boostSelectedPost.scheduled_date}</p>}
                        </div>
                        <button onClick={() => setBoostSelectedPost(null)} style={{ color: 'rgba(100,116,139,0.5)', flexShrink: 0 }}><X size={14} /></button>
                      </div>
                    ) : (
                      <>
                        {boostBatches.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-3">
                            {boostBatches.map((b: any) => (
                              <button key={b.id} onClick={() => setBoostSelectedBatch(b.id)}
                                className="text-xs px-3 py-1 rounded-full transition-all"
                                style={boostSelectedBatch === b.id
                                  ? { background: 'rgba(236,72,153,0.2)', color: '#ec4899', border: '1px solid rgba(236,72,153,0.35)' }
                                  : { background: 'rgba(255,255,255,0.04)', color: 'rgba(148,163,184,0.6)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                {b.name}
                              </button>
                            ))}
                          </div>
                        )}
                        {boostSelectedBatch && (
                          boostPosts.length === 0 ? (
                            <p className="text-xs text-center py-4" style={{ color: 'rgba(100,116,139,0.4)' }}>Nenhum post neste feed</p>
                          ) : (
                            <div className="grid grid-cols-4 gap-2">
                              {boostPosts.map((p: any) => {
                                const thumb = getBoostThumb(p);
                                return (
                                  <button key={p.id} onClick={() => setBoostSelectedPost(p)}
                                    className="relative rounded-lg overflow-hidden group transition-all"
                                    style={{ aspectRatio: '1080/1350', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                    {thumb ? (
                                      <img src={thumb} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center" style={{ color: 'rgba(100,116,139,0.3)', fontSize: 10 }}>sem mídia</div>
                                    )}
                                    <div className="absolute inset-0 flex items-end p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                      style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 50%)' }}>
                                      <p className="text-[9px] text-white truncate w-full">{p.title || '—'}</p>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          )
                        )}
                        {boostBatches.length === 0 && <p className="text-xs" style={{ color: 'rgba(100,116,139,0.4)' }}>Nenhum feed encontrado para este cliente</p>}
                      </>
                    )}
                  </div>
                ) : (
                  <div className="col-span-2">
                    <label className="label-dark">URL da mídia</label>
                    <input value={creativeForm.media_url} onChange={e => setCreativeForm({ ...creativeForm, media_url: e.target.value })} className="input-dark" placeholder="Link da imagem ou vídeo" />
                  </div>
                )}
                <div className="col-span-2">
                  <label className="label-dark">Headline</label>
                  <input value={creativeForm.headline} onChange={e => setCreativeForm({ ...creativeForm, headline: e.target.value })} className="input-dark" placeholder="Título do anúncio" />
                </div>
                <div className="col-span-2">
                  <label className="label-dark">Texto do anúncio</label>
                  <textarea value={creativeForm.description} onChange={e => setCreativeForm({ ...creativeForm, description: e.target.value })} rows={2} className="input-dark resize-none" />
                </div>
                <div>
                  <label className="label-dark">CTA</label>
                  <input value={creativeForm.cta} onChange={e => setCreativeForm({ ...creativeForm, cta: e.target.value })} className="input-dark" placeholder="Ex: Comprar Agora" />
                </div>
                <div>
                  <label className="label-dark">Gasto (R$)</label>
                  <input type="number" min="0" value={creativeForm.spend} onChange={e => setCreativeForm({ ...creativeForm, spend: e.target.value })} className="input-dark" />
                </div>
                <div className="col-span-2">
                  <label className="label-dark">Link / UTM</label>
                  <input value={creativeForm.utm_link} onChange={e => setCreativeForm({ ...creativeForm, utm_link: e.target.value })} className="input-dark" placeholder="https://seusite.com.br/?utm_source=meta&utm_campaign=..." />
                </div>
              </div>
              <p className="label-dark">Métricas</p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Impressões', key: 'impressions' },
                  { label: 'Cliques', key: 'clicks' },
                  { label: 'Conversões', key: 'conversions' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="label-dark">{f.label}</label>
                    <input type="number" min="0" value={(creativeForm as any)[f.key]}
                      onChange={e => setCreativeForm({ ...creativeForm, [f.key]: e.target.value })} className="input-dark" />
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={() => setCreativeModal(false)} className="btn-ghost flex-1 justify-center">Cancelar</button>
              <button onClick={handleSaveCreative} disabled={savingCreative} className="btn-primary flex-1 justify-center">
                {savingCreative ? 'Salvando…' : editingCreative ? 'Salvar' : 'Adicionar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleting && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4 animate-fade"
          style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)' }}>
          <div className="modal-card w-full max-w-sm p-6 animate-fade-up">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)' }}>
              <Trash2 size={16} className="icon-red" />
            </div>
            <h3 className="text-white font-medium mb-2">Excluir campanha?</h3>
            <p className="text-sm mb-5" style={{ color: 'rgba(148,163,184,0.55)' }}>Os criativos vinculados também serão removidos.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleting(null)} className="btn-ghost flex-1 justify-center">Cancelar</button>
              <button onClick={() => handleDelete(deleting)} className="btn-danger flex-1 justify-center">Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
