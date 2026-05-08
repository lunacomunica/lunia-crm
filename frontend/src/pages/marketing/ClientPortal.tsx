import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  CheckCircle2, RotateCcw, MessageSquare, Calendar, X, Send, Eye,
  ArrowLeft, FileImage, Clock, Grid3x3, Megaphone, Smartphone,
  TrendingUp, MousePointer, DollarSign, BarChart3, Target, Pencil,
  Plus, Trash2, ChevronRight, Zap, Users, Star, BookOpen, Briefcase
} from 'lucide-react';
import { contentApi, agencyClientsApi, campaignsApi, clientPortalApi } from '../../api/client';
import { ContentPiece, ContentStatus, AgencyClient, Campaign } from '../../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '../../context/AuthContext';

/* ─── Status configs ─────────────────────────────────────────────────────── */
const STATUS_CFG: Record<ContentStatus, { label: string; color: string; bg: string; border: string }> = {
  em_criacao:           { label: 'Em Criação',           color: '#94a3b8', bg: 'rgba(148,163,184,0.08)', border: 'rgba(148,163,184,0.15)' },
  em_revisao:           { label: 'Em Revisão',           color: '#60a5fa', bg: 'rgba(59,130,246,0.08)',  border: 'rgba(59,130,246,0.15)'  },
  aguardando_aprovacao: { label: 'Aguardando Aprovação', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',   border: 'rgba(245,158,11,0.25)'  },
  aprovado:             { label: 'Aprovado',             color: '#34d399', bg: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.2)'   },
  ajuste_solicitado:    { label: 'Ajuste Solicitado',    color: '#f97316', bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.2)'   },
  agendado:             { label: 'Agendado',             color: '#a78bfa', bg: 'rgba(167,139,250,0.08)',border: 'rgba(167,139,250,0.2)'  },
  publicado:            { label: 'Publicado',            color: '#10b981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)'   },
};

const FEED_OVERLAY: Partial<Record<ContentStatus, { icon: any; color: string; bg: string; label: string }>> = {
  aguardando_aprovacao: { icon: Clock,     color: '#f59e0b', bg: 'rgba(245,158,11,0.75)',  label: 'Ag. aprovação' },
  ajuste_solicitado:    { icon: RotateCcw, color: '#f97316', bg: 'rgba(249,115,22,0.75)',  label: 'Ajuste pedido' },
  em_criacao:           { icon: FileImage, color: '#94a3b8', bg: 'rgba(5,5,15,0.7)',       label: 'Em criação'    },
  em_revisao:           { icon: Eye,       color: '#60a5fa', bg: 'rgba(59,130,246,0.65)',  label: 'Em revisão'    },
  agendado:             { icon: Calendar,  color: '#a78bfa', bg: 'rgba(167,139,250,0.65)', label: 'Agendado'      },
};

const PLATFORM_CFG: Record<string, { label: string; color: string }> = {
  meta:     { label: 'Meta Ads',    color: '#1877f2' },
  google:   { label: 'Google Ads',  color: '#ea4335' },
  tiktok:   { label: 'TikTok Ads',  color: '#ff0050' },
  linkedin: { label: 'LinkedIn Ads',color: '#0077b5' },
};

const CAMPAIGN_STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  rascunho: { label: 'Rascunho', color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' },
  ativa:    { label: 'Ativa',    color: '#34d399', bg: 'rgba(52,211,153,0.1)'  },
  pausada:  { label: 'Pausada',  color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  encerrada:{ label: 'Encerrada',color: '#64748b', bg: 'rgba(100,116,139,0.1)' },
};

const TYPE_LABEL: Record<string, string> = { post: 'Post', reels: 'Reels', story: 'Story', carrossel: 'Carrossel' };

type Section = 'negocio' | 'marketing' | 'comercial';
type NegocioTab = 'visao' | 'posicionamento' | 'metas';
type MarketingTab = 'aprovacoes' | 'feed' | 'campanhas';

const fmtR = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const fmtN = (v: number) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v);

function StatusBadge({ status }: { status: ContentStatus }) {
  const c = STATUS_CFG[status];
  return (
    <span className="text-xs font-medium px-2.5 py-1 rounded-full"
      style={{ color: c.color, background: c.bg, border: `1px solid ${c.border}` }}>
      {c.label}
    </span>
  );
}

/* ─── Main component ─────────────────────────────────────────────────────── */
export default function ClientPortal() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'user';
  const isPreview = isAdmin || user?.role === 'team';

  const [section, setSection] = useState<Section>('negocio');
  const [negocioTab, setNegocioTab] = useState<NegocioTab>('visao');
  const [marketingTab, setMarketingTab] = useState<MarketingTab>('aprovacoes');

  const [client, setClient] = useState<AgencyClient | null>(null);
  const [pieces, setPieces] = useState<ContentPiece[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [goals, setGoals] = useState<any[]>([]);
  const [positioning, setPositioning] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Approval state
  const [detail, setDetail] = useState<ContentPiece | null>(null);
  const [adjustModal, setAdjustModal] = useState(false);
  const [adjustComment, setAdjustComment] = useState('');
  const [comment, setComment] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const [acting, setActing] = useState(false);

  // Feed state
  const [feedFilter, setFeedFilter] = useState<'all' | 'approved'>('all');
  const [phoneFrame, setPhoneFrame] = useState(true);

  const cid = Number(clientId);

  const load = async () => {
    setLoading(true);
    const [clientRes, contentRes, campRes, summaryRes, goalsRes, posRes] = await Promise.all([
      agencyClientsApi.get(cid),
      contentApi.list({ client_id: clientId! }),
      campaignsApi.list({ client_id: clientId! }),
      clientPortalApi.summary(cid),
      clientPortalApi.goals(cid),
      clientPortalApi.positioning(cid),
    ]);
    setClient(clientRes.data);
    setPieces(contentRes.data);
    setCampaigns(campRes.data);
    setSummary(summaryRes.data);
    setGoals(goalsRes.data);
    setPositioning(posRes.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [clientId]);

  const openDetail = async (p: ContentPiece) => {
    const r = await contentApi.get(p.id);
    setDetail(r.data);
  };

  const handleApprove = async () => {
    if (!detail || acting) return;
    setActing(true);
    await contentApi.updateStatus(detail.id, 'aprovado');
    setPieces(prev => prev.map(p => p.id === detail.id ? { ...p, status: 'aprovado' } : p));
    setDetail(prev => prev ? { ...prev, status: 'aprovado' } : prev);
    setActing(false);
  };

  const handleRequestAdjust = async () => {
    if (!detail || !adjustComment.trim() || acting) return;
    setActing(true);
    await contentApi.updateStatus(detail.id, 'ajuste_solicitado', adjustComment);
    const updated = await contentApi.get(detail.id);
    setPieces(prev => prev.map(p => p.id === detail.id ? { ...p, status: 'ajuste_solicitado' } : p));
    setDetail(updated.data);
    setAdjustModal(false);
    setAdjustComment('');
    setActing(false);
  };

  const handleComment = async () => {
    if (!comment.trim() || !detail) return;
    setSendingComment(true);
    const r = await contentApi.addComment(detail.id, comment);
    setDetail(prev => prev ? { ...prev, comments: [...(prev.comments || []), r.data] } : prev);
    setComment('');
    setSendingComment(false);
  };

  const pendingCount = pieces.filter(p => p.status === 'aguardando_aprovacao').length;
  const activeCampaigns = campaigns.filter(c => c.status === 'ativa');
  const totalSpent = campaigns.reduce((s, c) => s + c.spent, 0);
  const totalImpressions = campaigns.reduce((s, c) => s + c.impressions, 0);
  const totalConversions = campaigns.reduce((s, c) => s + c.conversions, 0);
  const totalRevenue = campaigns.reduce((s, c) => s + c.revenue, 0);
  const overallRoas = totalSpent > 0 ? totalRevenue / totalSpent : 0;

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#05050f' }}>
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
        style={{ borderColor: 'rgba(59,130,246,0.3)', borderTopColor: '#3b82f6' }} />
    </div>
  );

  /* ── Feed grid ───────────────────────────────────────────────────────── */
  const feedDisplayed = pieces.filter(p =>
    feedFilter === 'all' ? true : ['aprovado', 'agendado', 'publicado'].includes(p.status)
  ).slice(0, 30);

  const feedStats = {
    total: pieces.length,
    approved: pieces.filter(p => ['aprovado', 'agendado', 'publicado'].includes(p.status)).length,
    pending: pieces.filter(p => p.status === 'aguardando_aprovacao').length,
  };

  function FeedGrid() {
    return (
      <div>
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-center gap-3 mb-3">
            {client?.logo ? (
              <img src={client.logo} alt={client.name} className="w-14 h-14 rounded-full object-cover"
                style={{ border: '2px solid rgba(255,255,255,0.1)' }} />
            ) : (
              <div className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold"
                style={{ background: 'linear-gradient(135deg,#f59e0b,#ec4899,#8b5cf6)', padding: '2px' }}>
                <div className="w-full h-full rounded-full flex items-center justify-center" style={{ background: '#111' }}>
                  {client?.name.charAt(0).toUpperCase()}
                </div>
              </div>
            )}
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">{client?.instagram_handle ? `@${client.instagram_handle}` : client?.name}</p>
              {client?.segment && <p className="text-xs" style={{ color: 'rgba(148,163,184,0.6)' }}>{client.segment}</p>}
            </div>
          </div>
          <div className="grid grid-cols-3 text-center mb-3 py-2 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
            {[
              { label: 'Peças', value: feedStats.total },
              { label: 'Aprovadas', value: feedStats.approved },
              { label: 'Pendentes', value: feedStats.pending },
            ].map(s => (
              <div key={s.label}>
                <p className="text-sm font-bold text-white">{s.value}</p>
                <p className="text-[10px]" style={{ color: 'rgba(100,116,139,0.5)' }}>{s.label}</p>
              </div>
            ))}
          </div>
          <div className="flex border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            <button onClick={() => setFeedFilter('all')}
              className="flex-1 py-2 text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
              style={{ color: feedFilter === 'all' ? '#fff' : 'rgba(100,116,139,0.5)', borderBottom: feedFilter === 'all' ? '2px solid #fff' : '2px solid transparent' }}>
              <Grid3x3 size={11} /> Tudo
            </button>
            <button onClick={() => setFeedFilter('approved')}
              className="flex-1 py-2 text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
              style={{ color: feedFilter === 'approved' ? '#34d399' : 'rgba(100,116,139,0.5)', borderBottom: feedFilter === 'approved' ? '2px solid #34d399' : '2px solid transparent' }}>
              <CheckCircle2 size={11} /> Aprovados
            </button>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-0.5">
          {feedDisplayed.length === 0 ? (
            <div className="col-span-3 py-12 text-center">
              <p className="text-xs" style={{ color: 'rgba(100,116,139,0.4)' }}>Nenhuma peça para exibir</p>
            </div>
          ) : feedDisplayed.map(p => {
            const overlay = FEED_OVERLAY[p.status];
            const isPublished = p.status === 'publicado';
            return (
              <button key={p.id} onClick={() => openDetail(p)}
                className="relative aspect-square overflow-hidden group"
                style={{ background: 'rgba(255,255,255,0.03)' }}>
                {p.media_url ? (
                  <img src={p.media_url} alt={p.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    style={{ opacity: overlay ? 0.65 : 1 }} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.05)' }}>
                    <FileImage size={20} style={{ color: 'rgba(59,130,246,0.2)' }} />
                  </div>
                )}
                {overlay && !isPublished && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1" style={{ background: overlay.bg }}>
                    <overlay.icon size={16} style={{ color: overlay.color }} />
                    <span className="text-[9px] font-bold" style={{ color: overlay.color }}>{overlay.label}</span>
                  </div>
                )}
                {isPublished && (
                  <div className="absolute top-1 right-1">
                    <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ background: '#10b981' }}>
                      <CheckCircle2 size={10} className="text-white" />
                    </div>
                  </div>
                )}
                {p.type !== 'post' && (
                  <div className="absolute bottom-1 left-1">
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                      style={{ background: 'rgba(0,0,0,0.7)', color: 'rgba(255,255,255,0.8)' }}>
                      {TYPE_LABEL[p.type]}
                    </span>
                  </div>
                )}
                {p.scheduled_date && (
                  <div className="absolute inset-0 flex items-end justify-center pb-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%)' }}>
                    <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.8)' }}>
                      {format(new Date(p.scheduled_date), "d MMM", { locale: ptBR })}
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  function CampaignCard({ c }: { c: Campaign }) {
    const platform = PLATFORM_CFG[c.platform] || { label: c.platform, color: '#60a5fa' };
    const statusCfg = CAMPAIGN_STATUS_CFG[c.status] || CAMPAIGN_STATUS_CFG.rascunho;
    const progress = c.budget > 0 ? Math.min((c.spent / c.budget) * 100, 100) : 0;
    const roasVal = c.spent > 0 ? (c.revenue / c.spent) : 0;
    return (
      <div className="rounded-2xl p-5"
        style={{ background: 'linear-gradient(145deg,#0c0c28,#0e0e2e)', border: '1px solid rgba(59,130,246,0.1)' }}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ background: `${platform.color}15`, color: platform.color, border: `1px solid ${platform.color}30` }}>
                {platform.label}
              </span>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: statusCfg.bg, color: statusCfg.color }}>
                {statusCfg.label}
              </span>
            </div>
            <h3 className="text-sm font-semibold text-white truncate">{c.name}</h3>
            {(c.start_date || c.end_date) && (
              <p className="text-xs mt-0.5" style={{ color: 'rgba(100,116,139,0.5)' }}>
                {c.start_date && format(new Date(c.start_date), "d MMM", { locale: ptBR })}
                {c.start_date && c.end_date && ' → '}
                {c.end_date && format(new Date(c.end_date), "d MMM yyyy", { locale: ptBR })}
              </p>
            )}
          </div>
        </div>
        <div className="mb-4">
          <div className="flex justify-between text-xs mb-1.5">
            <span style={{ color: 'rgba(100,116,139,0.6)' }}>Investido</span>
            <span className="text-white font-medium">{fmtR(c.spent)} <span style={{ color: 'rgba(100,116,139,0.5)' }}>/ {fmtR(c.budget)}</span></span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div className="h-full rounded-full" style={{ width: `${progress}%`, background: progress > 90 ? '#f97316' : '#3b82f6' }} />
          </div>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {[
            { icon: Eye, label: 'Impressões', value: fmtN(c.impressions) },
            { icon: MousePointer, label: 'Cliques', value: fmtN(c.clicks) },
            { icon: TrendingUp, label: 'Conversões', value: fmtN(c.conversions) },
            { icon: BarChart3, label: 'ROAS', value: roasVal > 0 ? `${roasVal.toFixed(1)}x` : '—' },
          ].map(m => (
            <div key={m.label} className="text-center">
              <m.icon size={12} className="mx-auto mb-1" style={{ color: 'rgba(100,116,139,0.4)' }} />
              <p className="text-sm font-semibold text-white">{m.value}</p>
              <p className="text-[9px]" style={{ color: 'rgba(100,116,139,0.45)' }}>{m.label}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ── Flywheel ──────────────────────────────────────────────────────────── */
  function FlywheelView() {
    const s = summary;
    const nodes = [
      {
        label: 'Conteúdo',
        color: '#a78bfa',
        glow: 'rgba(167,139,250,0.3)',
        metrics: [
          { label: 'Publicados', value: s?.posts?.published ?? '—' },
          { label: 'Este mês', value: s?.posts?.published_month ?? '—' },
          { label: 'Total planejado', value: s?.posts?.total ?? '—' },
        ],
      },
      {
        label: 'Alcance',
        color: '#60a5fa',
        glow: 'rgba(96,165,250,0.3)',
        metrics: [
          { label: 'Impressões', value: fmtN(s?.campaigns?.reach ?? 0) },
          { label: 'Cliques', value: fmtN(s?.campaigns?.clicks ?? 0) },
          { label: 'Campanhas ativas', value: s?.campaigns?.active ?? '—' },
        ],
      },
      {
        label: 'Leads',
        color: '#34d399',
        glow: 'rgba(52,211,153,0.3)',
        metrics: [
          { label: 'Conversões', value: s?.campaigns?.leads ?? '—' },
          { label: 'CPL médio', value: s?.cpl > 0 ? fmtR(s.cpl) : '—' },
          { label: 'Investido', value: s?.campaigns?.spent > 0 ? fmtR(s.campaigns.spent) : '—' },
        ],
      },
      {
        label: 'Receita',
        color: '#f59e0b',
        glow: 'rgba(245,158,11,0.3)',
        metrics: [
          { label: 'Faturamento', value: s?.campaigns?.revenue > 0 ? fmtR(s.campaigns.revenue) : '—' },
          { label: 'ROAS médio', value: s?.roas > 0 ? `${s.roas.toFixed(1)}x` : '—' },
          { label: 'Retorno total', value: s?.campaigns?.revenue > 0 ? fmtR(s.campaigns.revenue - s.campaigns.spent) : '—' },
        ],
      },
    ];

    return (
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider mb-6" style={{ color: 'rgba(100,116,139,0.5)' }}>
          Visão Geral — Flywheel de Crescimento
        </p>

        {/* Flywheel visual */}
        <div className="relative mb-8">
          {/* Center circle */}
          <div className="flex flex-col items-center mb-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-full flex flex-col items-center justify-center border-2"
                style={{ background: 'radial-gradient(circle,rgba(59,130,246,0.15),rgba(5,5,15,0.9))', borderColor: 'rgba(59,130,246,0.3)', boxShadow: '0 0 40px rgba(59,130,246,0.15)' }}>
                <Zap size={20} style={{ color: '#60a5fa' }} />
                <span className="text-[10px] font-bold mt-1" style={{ color: '#60a5fa' }}>flywheel</span>
              </div>
            </div>
          </div>

          {/* Nodes grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {nodes.map((node, i) => (
              <div key={node.label} className="relative rounded-2xl p-4"
                style={{ background: 'linear-gradient(145deg,#0c0c28,#0e0e2e)', border: `1px solid ${node.color}25`, boxShadow: `0 0 20px ${node.glow}10` }}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full" style={{ background: node.color, boxShadow: `0 0 8px ${node.glow}` }} />
                  <span className="text-xs font-bold" style={{ color: node.color }}>{node.label}</span>
                  {i < nodes.length - 1 && (
                    <ChevronRight size={10} className="ml-auto hidden md:block" style={{ color: 'rgba(100,116,139,0.3)' }} />
                  )}
                </div>
                <div className="space-y-2.5">
                  {node.metrics.map(m => (
                    <div key={m.label}>
                      <p className="text-base font-bold text-white leading-none">{m.value}</p>
                      <p className="text-[10px] mt-0.5" style={{ color: 'rgba(100,116,139,0.5)' }}>{m.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Ag. aprovação', value: s?.posts?.pending_approval ?? 0, color: '#f59e0b', urgent: (s?.posts?.pending_approval ?? 0) > 0 },
            { label: 'Ajuste solicitado', value: s?.posts?.needs_adjustment ?? 0, color: '#f97316', urgent: (s?.posts?.needs_adjustment ?? 0) > 0 },
            { label: 'Campanhas ativas', value: s?.campaigns?.active ?? 0, color: '#34d399', urgent: false },
            { label: 'Total de peças', value: s?.posts?.total ?? 0, color: '#60a5fa', urgent: false },
          ].map(stat => (
            <div key={stat.label} className="rounded-xl px-4 py-3"
              style={{ background: stat.urgent ? `${stat.color}08` : 'rgba(59,130,246,0.04)', border: `1px solid ${stat.urgent ? stat.color + '25' : 'rgba(59,130,246,0.08)'}` }}>
              <p className="text-xl font-bold" style={{ color: stat.urgent ? stat.color : 'white' }}>{stat.value}</p>
              <p className="text-[10px] mt-0.5" style={{ color: 'rgba(100,116,139,0.5)' }}>{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ── Posicionamento ────────────────────────────────────────────────────── */
  function PositioningView() {
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState({
      icp: positioning?.icp || '',
      promise: positioning?.promise || '',
      mission: positioning?.mission || '',
      differentials: (() => {
        try { return JSON.parse(positioning?.differentials || '[]'); } catch { return []; }
      })(),
      cases: (() => {
        try { return JSON.parse(positioning?.cases || '[]'); } catch { return []; }
      })(),
    });
    const [saving, setSaving] = useState(false);
    const [newDiff, setNewDiff] = useState('');
    const [newCase, setNewCase] = useState({ title: '', result: '' });

    const save = async () => {
      setSaving(true);
      const r = await clientPortalApi.updatePositioning(cid, form);
      setPositioning(r.data);
      setEditing(false);
      setSaving(false);
    };

    const pos = editing ? form : {
      icp: positioning?.icp || '',
      promise: positioning?.promise || '',
      mission: positioning?.mission || '',
      differentials: (() => { try { return JSON.parse(positioning?.differentials || '[]'); } catch { return []; } })(),
      cases: (() => { try { return JSON.parse(positioning?.cases || '[]'); } catch { return []; } })(),
    };

    const isEmpty = !pos.icp && !pos.promise && !pos.mission && pos.differentials.length === 0;

    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(100,116,139,0.5)' }}>
            Posicionamento de Marca
          </p>
          {isAdmin && !editing && (
            <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors"
              style={{ background: 'rgba(59,130,246,0.08)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.2)' }}>
              <Pencil size={11} /> {isEmpty ? 'Preencher' : 'Editar'}
            </button>
          )}
          {editing && (
            <div className="flex gap-2">
              <button onClick={() => setEditing(false)} className="text-xs px-3 py-1.5 rounded-lg"
                style={{ color: 'rgba(100,116,139,0.6)' }}>Cancelar</button>
              <button onClick={save} disabled={saving} className="btn-primary text-xs py-1.5 px-3">
                {saving ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          )}
        </div>

        {isEmpty && !editing ? (
          <div className="text-center py-16" style={{ border: '1px dashed rgba(59,130,246,0.15)', borderRadius: '16px' }}>
            <BookOpen size={32} className="mx-auto mb-3" style={{ color: 'rgba(59,130,246,0.2)' }} />
            <p className="text-sm font-medium text-white mb-1">Posicionamento não preenchido</p>
            <p className="text-xs" style={{ color: 'rgba(100,116,139,0.5)' }}>
              {isAdmin ? 'Clique em "Preencher" para adicionar o posicionamento do cliente.' : 'A agência ainda não preencheu este campo.'}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* ICP */}
            <div className="rounded-2xl p-5" style={{ background: 'linear-gradient(145deg,#0c0c28,#0e0e2e)', border: '1px solid rgba(167,139,250,0.12)' }}>
              <div className="flex items-center gap-2 mb-3">
                <Users size={14} style={{ color: '#a78bfa' }} />
                <p className="text-xs font-semibold" style={{ color: '#a78bfa' }}>ICP — Cliente Ideal</p>
              </div>
              {editing ? (
                <textarea value={form.icp} onChange={e => setForm(f => ({ ...f, icp: e.target.value }))}
                  rows={3} placeholder="Descreva o perfil do cliente ideal..." className="input-dark resize-none text-sm w-full" />
              ) : (
                <p className="text-sm" style={{ color: pos.icp ? 'rgba(148,163,184,0.85)' : 'rgba(100,116,139,0.4)', lineHeight: '1.7' }}>
                  {pos.icp || 'Não preenchido'}
                </p>
              )}
            </div>

            {/* Promise */}
            <div className="rounded-2xl p-5" style={{ background: 'linear-gradient(145deg,#0c0c28,#0e0e2e)', border: '1px solid rgba(96,165,250,0.12)' }}>
              <div className="flex items-center gap-2 mb-3">
                <Star size={14} style={{ color: '#60a5fa' }} />
                <p className="text-xs font-semibold" style={{ color: '#60a5fa' }}>Promessa de Marca</p>
              </div>
              {editing ? (
                <textarea value={form.promise} onChange={e => setForm(f => ({ ...f, promise: e.target.value }))}
                  rows={2} placeholder="Qual é a promessa central da marca?" className="input-dark resize-none text-sm w-full" />
              ) : (
                <p className="text-sm font-medium" style={{ color: pos.promise ? 'white' : 'rgba(100,116,139,0.4)', lineHeight: '1.7' }}>
                  {pos.promise || 'Não preenchido'}
                </p>
              )}
            </div>

            {/* Mission */}
            <div className="rounded-2xl p-5" style={{ background: 'linear-gradient(145deg,#0c0c28,#0e0e2e)', border: '1px solid rgba(52,211,153,0.12)' }}>
              <div className="flex items-center gap-2 mb-3">
                <Target size={14} style={{ color: '#34d399' }} />
                <p className="text-xs font-semibold" style={{ color: '#34d399' }}>Missão</p>
              </div>
              {editing ? (
                <textarea value={form.mission} onChange={e => setForm(f => ({ ...f, mission: e.target.value }))}
                  rows={2} placeholder="Missão da empresa..." className="input-dark resize-none text-sm w-full" />
              ) : (
                <p className="text-sm" style={{ color: pos.mission ? 'rgba(148,163,184,0.85)' : 'rgba(100,116,139,0.4)', lineHeight: '1.7' }}>
                  {pos.mission || 'Não preenchido'}
                </p>
              )}
            </div>

            {/* Differentials */}
            <div className="rounded-2xl p-5" style={{ background: 'linear-gradient(145deg,#0c0c28,#0e0e2e)', border: '1px solid rgba(245,158,11,0.12)' }}>
              <div className="flex items-center gap-2 mb-3">
                <Zap size={14} style={{ color: '#f59e0b' }} />
                <p className="text-xs font-semibold" style={{ color: '#f59e0b' }}>Diferenciais</p>
              </div>
              {pos.differentials.length === 0 && !editing ? (
                <p className="text-sm" style={{ color: 'rgba(100,116,139,0.4)' }}>Não preenchido</p>
              ) : (
                <div className="flex flex-wrap gap-2 mb-3">
                  {(editing ? form.differentials : pos.differentials).map((d: string, i: number) => (
                    <span key={i} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full"
                      style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }}>
                      {d}
                      {editing && (
                        <button onClick={() => setForm(f => ({ ...f, differentials: f.differentials.filter((_: string, j: number) => j !== i) }))}>
                          <X size={10} />
                        </button>
                      )}
                    </span>
                  ))}
                </div>
              )}
              {editing && (
                <div className="flex gap-2">
                  <input value={newDiff} onChange={e => setNewDiff(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && newDiff.trim()) { setForm(f => ({ ...f, differentials: [...f.differentials, newDiff.trim()] })); setNewDiff(''); } }}
                    placeholder="Adicionar diferencial..." className="input-dark flex-1 text-sm py-1.5" />
                  <button onClick={() => { if (newDiff.trim()) { setForm(f => ({ ...f, differentials: [...f.differentials, newDiff.trim()] })); setNewDiff(''); } }}
                    className="px-3 py-1.5 rounded-lg text-xs" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>
                    <Plus size={13} />
                  </button>
                </div>
              )}
            </div>

            {/* Cases */}
            <div className="rounded-2xl p-5" style={{ background: 'linear-gradient(145deg,#0c0c28,#0e0e2e)', border: '1px solid rgba(16,185,129,0.12)' }}>
              <div className="flex items-center gap-2 mb-3">
                <Briefcase size={14} style={{ color: '#10b981' }} />
                <p className="text-xs font-semibold" style={{ color: '#10b981' }}>Cases de Sucesso</p>
              </div>
              {(editing ? form.cases : pos.cases).length === 0 && !editing ? (
                <p className="text-sm" style={{ color: 'rgba(100,116,139,0.4)' }}>Não preenchido</p>
              ) : (
                <div className="space-y-2 mb-3">
                  {(editing ? form.cases : pos.cases).map((c: any, i: number) => (
                    <div key={i} className="flex items-start justify-between gap-3 px-3 py-2.5 rounded-xl"
                      style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.12)' }}>
                      <div>
                        <p className="text-xs font-medium text-white">{c.title}</p>
                        {c.result && <p className="text-[11px] mt-0.5" style={{ color: '#34d399' }}>{c.result}</p>}
                      </div>
                      {editing && (
                        <button onClick={() => setForm(f => ({ ...f, cases: f.cases.filter((_: any, j: number) => j !== i) }))}>
                          <Trash2 size={12} style={{ color: 'rgba(100,116,139,0.5)' }} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {editing && (
                <div className="space-y-2">
                  <input value={newCase.title} onChange={e => setNewCase(c => ({ ...c, title: e.target.value }))}
                    placeholder="Nome do case..." className="input-dark text-sm py-1.5 w-full" />
                  <div className="flex gap-2">
                    <input value={newCase.result} onChange={e => setNewCase(c => ({ ...c, result: e.target.value }))}
                      placeholder="Resultado obtido (ex: +150% de vendas)..." className="input-dark text-sm py-1.5 flex-1" />
                    <button onClick={() => { if (newCase.title.trim()) { setForm(f => ({ ...f, cases: [...f.cases, { ...newCase }] })); setNewCase({ title: '', result: '' }); } }}
                      className="px-3 py-1.5 rounded-lg text-xs" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>
                      <Plus size={13} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ── Metas ─────────────────────────────────────────────────────────────── */
  function MetasView() {
    const [editing, setEditing] = useState(false);
    const [localGoals, setLocalGoals] = useState(goals);
    const [saving, setSaving] = useState(false);

    useEffect(() => { setLocalGoals(goals); }, [goals]);

    const METRICS = [
      { metric: 'posts_month', label: 'Posts publicados/mês', unit: 'posts', icon: 'content' },
      { metric: 'leads_month', label: 'Leads gerados/mês', unit: 'leads', icon: 'leads' },
      { metric: 'reach_month', label: 'Alcance médio/mês', unit: 'impressões', icon: 'reach' },
      { metric: 'revenue', label: 'Faturamento gerado', unit: 'R$', icon: 'revenue' },
      { metric: 'roas', label: 'ROAS mínimo', unit: 'x', icon: 'roas' },
    ];

    const getCurrentValue = (metric: string): number => {
      if (!summary) return 0;
      switch (metric) {
        case 'posts_month': return summary.posts?.published_month ?? 0;
        case 'leads_month': return summary.campaigns?.leads ?? 0;
        case 'reach_month': return summary.campaigns?.reach ?? 0;
        case 'revenue': return summary.campaigns?.revenue ?? 0;
        case 'roas': return summary.roas ?? 0;
        default: return 0;
      }
    };

    const formatValue = (metric: string, v: number) => {
      if (metric === 'revenue') return fmtR(v);
      if (metric === 'roas') return `${v.toFixed(1)}x`;
      if (metric === 'reach_month') return fmtN(v);
      return String(v);
    };

    const save = async () => {
      setSaving(true);
      const r = await clientPortalApi.updateGoals(cid, localGoals);
      setGoals(r.data);
      setEditing(false);
      setSaving(false);
    };

    const addGoal = () => {
      const unused = METRICS.find(m => !localGoals.some((g: any) => g.metric === m.metric));
      if (unused) setLocalGoals((g: any[]) => [...g, { metric: unused.metric, label: unused.label, target: 0, unit: unused.unit, icon: unused.icon }]);
    };

    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(100,116,139,0.5)' }}>
            Metas & Progresso
          </p>
          {isAdmin && !editing && (
            <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg"
              style={{ background: 'rgba(59,130,246,0.08)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.2)' }}>
              <Pencil size={11} /> {localGoals.length === 0 ? 'Definir metas' : 'Editar metas'}
            </button>
          )}
          {editing && (
            <div className="flex gap-2">
              <button onClick={() => { setEditing(false); setLocalGoals(goals); }} className="text-xs px-3 py-1.5 rounded-lg"
                style={{ color: 'rgba(100,116,139,0.6)' }}>Cancelar</button>
              <button onClick={save} disabled={saving} className="btn-primary text-xs py-1.5 px-3">
                {saving ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          )}
        </div>

        {localGoals.length === 0 && !editing ? (
          <div className="text-center py-16" style={{ border: '1px dashed rgba(59,130,246,0.15)', borderRadius: '16px' }}>
            <Target size={32} className="mx-auto mb-3" style={{ color: 'rgba(59,130,246,0.2)' }} />
            <p className="text-sm font-medium text-white mb-1">Nenhuma meta definida</p>
            <p className="text-xs" style={{ color: 'rgba(100,116,139,0.5)' }}>
              {isAdmin ? 'Clique em "Definir metas" para começar.' : 'A agência ainda não definiu as metas para este cliente.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {(editing ? localGoals : goals).map((g: any, i: number) => {
              const current = getCurrentValue(g.metric);
              const pct = g.target > 0 ? Math.min((current / g.target) * 100, 100) : 0;
              const color = pct >= 100 ? '#34d399' : pct >= 70 ? '#60a5fa' : pct >= 40 ? '#f59e0b' : '#f87171';

              return (
                <div key={g.metric || i} className="rounded-2xl p-5"
                  style={{ background: 'linear-gradient(145deg,#0c0c28,#0e0e2e)', border: '1px solid rgba(59,130,246,0.08)' }}>
                  {editing ? (
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <select value={g.metric}
                          onChange={e => { const m = METRICS.find(x => x.metric === e.target.value); setLocalGoals((prev: any[]) => prev.map((x: any, j: number) => j === i ? { ...x, metric: e.target.value, label: m?.label || x.label, unit: m?.unit || x.unit } : x)); }}
                          className="input-dark text-sm py-1.5 w-full mb-2">
                          {METRICS.map(m => <option key={m.metric} value={m.metric}>{m.label}</option>)}
                        </select>
                        <input value={g.label} onChange={e => setLocalGoals((prev: any[]) => prev.map((x: any, j: number) => j === i ? { ...x, label: e.target.value } : x))}
                          placeholder="Label personalizado..." className="input-dark text-sm py-1.5 w-full mb-2" />
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <input type="number" value={g.target} onChange={e => setLocalGoals((prev: any[]) => prev.map((x: any, j: number) => j === i ? { ...x, target: Number(e.target.value) } : x))}
                          className="input-dark text-sm py-1.5 w-24 text-center" />
                        <span className="text-xs" style={{ color: 'rgba(100,116,139,0.5)' }}>{g.unit}</span>
                        <button onClick={() => setLocalGoals((prev: any[]) => prev.filter((_: any, j: number) => j !== i))}>
                          <Trash2 size={14} style={{ color: 'rgba(248,113,113,0.6)' }} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-medium text-white">{g.label}</p>
                        <div className="flex items-baseline gap-1">
                          <span className="text-xl font-bold" style={{ color }}>{formatValue(g.metric, current)}</span>
                          <span className="text-xs" style={{ color: 'rgba(100,116,139,0.5)' }}>/ {g.metric === 'revenue' ? fmtR(g.target) : g.metric === 'roas' ? `${g.target}x` : g.metric === 'reach_month' ? fmtN(g.target) : `${g.target} ${g.unit}`}</span>
                        </div>
                      </div>
                      <div className="relative h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                        <div className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${pct}%`, background: `linear-gradient(90deg,${color}88,${color})` }} />
                      </div>
                      <p className="text-[10px] mt-1.5" style={{ color: 'rgba(100,116,139,0.45)' }}>
                        {pct.toFixed(0)}% da meta atingida
                      </p>
                    </>
                  )}
                </div>
              );
            })}

            {editing && localGoals.length < METRICS.length && (
              <button onClick={addGoal} className="w-full py-3 rounded-2xl text-sm flex items-center justify-center gap-2 transition-colors"
                style={{ border: '1px dashed rgba(59,130,246,0.2)', color: 'rgba(59,130,246,0.5)' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(59,130,246,0.4)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(59,130,246,0.2)')}>
                <Plus size={14} /> Adicionar meta
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(59,130,246,0.06) 0%, #05050f 60%)' }}>

      {/* Preview banner */}
      {isPreview && (
        <div className="flex items-center justify-between px-6 py-2.5"
          style={{ background: 'rgba(245,158,11,0.1)', borderBottom: '1px solid rgba(245,158,11,0.2)' }}>
          <div className="flex items-center gap-2">
            <Eye size={13} style={{ color: '#f59e0b' }} />
            <span className="text-xs font-medium" style={{ color: '#f59e0b' }}>Modo preview — você está visualizando como o cliente vê este portal</span>
          </div>
          <button onClick={() => navigate('/marketing/clients')} className="flex items-center gap-1.5 text-xs" style={{ color: '#f59e0b' }}>
            <ArrowLeft size={12} /> Voltar para clientes
          </button>
        </div>
      )}

      {/* Header */}
      <div className="px-4 md:px-8 py-6" style={{ borderBottom: '1px solid rgba(59,130,246,0.08)' }}>
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          {client?.logo ? (
            <img src={client.logo} alt={client.name} className="w-12 h-12 rounded-xl object-cover" />
          ) : (
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-lg font-bold flex-shrink-0"
              style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)' }}>
              {client?.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-xl font-semibold text-white">{client?.name}</h1>
            <p className="text-sm" style={{ color: 'rgba(100,116,139,0.6)' }}>Portal do Cliente</p>
          </div>
        </div>
      </div>

      {/* Main section tabs */}
      <div className="max-w-5xl mx-auto px-4 md:px-8">
        <div className="flex gap-1 pt-4" style={{ borderBottom: '1px solid rgba(59,130,246,0.08)' }}>
          {([
            { id: 'negocio',   label: 'Negócio',   badge: 0 },
            { id: 'marketing', label: 'Marketing',  badge: pendingCount },
            { id: 'comercial', label: 'Comercial',  badge: 0 },
          ] as const).map(s => (
            <button key={s.id} onClick={() => setSection(s.id)}
              className="flex items-center gap-2 px-5 py-3 text-sm font-semibold transition-colors relative"
              style={{ color: section === s.id ? '#e2e8f0' : 'rgba(100,116,139,0.6)' }}>
              {s.label}
              {s.badge > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>
                  {s.badge}
                </span>
              )}
              {section === s.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t" style={{ background: '#3b82f6' }} />
              )}
            </button>
          ))}
        </div>

        {/* Sub-tabs */}
        {section === 'negocio' && (
          <div className="flex gap-0.5 py-3" style={{ borderBottom: '1px solid rgba(59,130,246,0.06)' }}>
            {([
              { id: 'visao', label: 'Visão Geral' },
              { id: 'posicionamento', label: 'Posicionamento' },
              { id: 'metas', label: 'Metas' },
            ] as const).map(t => (
              <button key={t.id} onClick={() => setNegocioTab(t.id)}
                className="px-4 py-1.5 text-xs font-medium rounded-lg transition-all"
                style={{ background: negocioTab === t.id ? 'rgba(59,130,246,0.12)' : 'transparent', color: negocioTab === t.id ? '#e2e8f0' : 'rgba(100,116,139,0.55)', border: negocioTab === t.id ? '1px solid rgba(59,130,246,0.2)' : '1px solid transparent' }}>
                {t.label}
              </button>
            ))}
          </div>
        )}
        {section === 'marketing' && (
          <div className="flex gap-0.5 py-3" style={{ borderBottom: '1px solid rgba(59,130,246,0.06)' }}>
            {([
              { id: 'aprovacoes', label: 'Aprovações', badge: pendingCount },
              { id: 'feed',       label: 'Feed' },
              { id: 'campanhas',  label: 'Campanhas', badge: activeCampaigns.length },
            ] as const).map(t => (
              <button key={t.id} onClick={() => setMarketingTab(t.id)}
                className="px-4 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5"
                style={{ background: marketingTab === t.id ? 'rgba(59,130,246,0.12)' : 'transparent', color: marketingTab === t.id ? '#e2e8f0' : 'rgba(100,116,139,0.55)', border: marketingTab === t.id ? '1px solid rgba(59,130,246,0.2)' : '1px solid transparent' }}>
                {t.label}
                {'badge' in t && (t as any).badge > 0 && (
                  <span className="text-[9px] font-bold px-1 py-0.5 rounded-full"
                    style={{ background: t.id === 'aprovacoes' ? 'rgba(245,158,11,0.2)' : 'rgba(52,211,153,0.2)', color: t.id === 'aprovacoes' ? '#f59e0b' : '#34d399' }}>
                    {(t as any).badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-8">

        {/* ── NEGÓCIO ── */}
        {section === 'negocio' && negocioTab === 'visao' && <FlywheelView />}
        {section === 'negocio' && negocioTab === 'posicionamento' && <PositioningView />}
        {section === 'negocio' && negocioTab === 'metas' && <MetasView />}

        {/* ── MARKETING ── */}
        {section === 'marketing' && marketingTab === 'aprovacoes' && (
          pieces.length === 0 ? (
            <div className="text-center py-24">
              <FileImage size={40} className="mx-auto mb-4" style={{ color: 'rgba(100,116,139,0.2)' }} />
              <p style={{ color: 'rgba(100,116,139,0.5)' }}>Nenhum conteúdo disponível ainda.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {pieces.map(p => (
                <div key={p.id} onClick={() => openDetail(p)}
                  className="rounded-2xl overflow-hidden cursor-pointer group transition-all duration-200"
                  style={{ background: 'linear-gradient(145deg,#0c0c28,#0e0e2e)', border: p.status === 'aguardando_aprovacao' ? '1px solid rgba(245,158,11,0.3)' : '1px solid rgba(59,130,246,0.1)', boxShadow: p.status === 'aguardando_aprovacao' ? '0 0 20px rgba(245,158,11,0.08)' : 'none' }}>
                  <div className="relative aspect-square overflow-hidden" style={{ background: 'rgba(59,130,246,0.04)' }}>
                    {p.media_url ? (
                      <img src={p.media_url} alt={p.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                        <FileImage size={32} style={{ color: 'rgba(59,130,246,0.2)' }} />
                        <span className="text-xs" style={{ color: 'rgba(100,116,139,0.4)' }}>Sem imagem</span>
                      </div>
                    )}
                    <div className="absolute top-2 right-2">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-md"
                        style={{ background: 'rgba(0,0,0,0.6)', color: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(4px)' }}>
                        {TYPE_LABEL[p.type] || p.type}
                      </span>
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="text-sm font-medium text-white mb-1 truncate">{p.title}</p>
                    {p.scheduled_date && (
                      <p className="flex items-center gap-1 text-xs mb-3" style={{ color: 'rgba(100,116,139,0.55)' }}>
                        <Calendar size={10} />{format(new Date(p.scheduled_date), "d 'de' MMM", { locale: ptBR })}
                      </p>
                    )}
                    <StatusBadge status={p.status} />
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {section === 'marketing' && marketingTab === 'campanhas' && (
          <div>
            {campaigns.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                {[
                  { icon: DollarSign, label: 'Total Investido', value: fmtR(totalSpent) },
                  { icon: Eye, label: 'Impressões', value: fmtN(totalImpressions) },
                  { icon: TrendingUp, label: 'Conversões', value: fmtN(totalConversions) },
                  { icon: BarChart3, label: 'ROAS Geral', value: overallRoas > 0 ? `${overallRoas.toFixed(1)}x` : '—' },
                ].map(m => (
                  <div key={m.label} className="rounded-2xl px-5 py-4"
                    style={{ background: 'linear-gradient(145deg,#0c0c28,#0e0e2e)', border: '1px solid rgba(59,130,246,0.1)' }}>
                    <m.icon size={16} className="mb-2" style={{ color: 'rgba(59,130,246,0.5)' }} />
                    <p className="text-xl font-bold text-white">{m.value}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(100,116,139,0.55)' }}>{m.label}</p>
                  </div>
                ))}
              </div>
            )}
            {campaigns.length === 0 ? (
              <div className="text-center py-24">
                <Megaphone size={40} className="mx-auto mb-4" style={{ color: 'rgba(100,116,139,0.2)' }} />
                <p style={{ color: 'rgba(100,116,139,0.5)' }}>Nenhuma campanha cadastrada ainda.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {campaigns.map(c => <CampaignCard key={c.id} c={c} />)}
              </div>
            )}
          </div>
        )}

        {section === 'marketing' && marketingTab === 'feed' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <p className="text-sm" style={{ color: 'rgba(100,116,139,0.6)' }}>
                Visualização do feed como aparecerá no Instagram
              </p>
              <button onClick={() => setPhoneFrame(f => !f)}
                className="flex items-center gap-2 btn-ghost text-xs px-3 py-2"
                style={{ color: phoneFrame ? '#60a5fa' : 'rgba(100,116,139,0.6)' }}>
                <Smartphone size={13} /> {phoneFrame ? 'Sem moldura' : 'Com moldura'}
              </button>
            </div>
            <div className="flex justify-center">
              {phoneFrame ? (
                <div className="relative" style={{ width: '375px' }}>
                  <div className="rounded-[44px] overflow-hidden"
                    style={{ background: '#000', border: '10px solid #1a1a2e', boxShadow: '0 40px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.06)' }}>
                    <div className="flex items-center justify-between px-6 pt-3 pb-1" style={{ background: '#000' }}>
                      <span className="text-[11px] font-semibold text-white">9:41</span>
                      <div className="w-24 h-5 rounded-full" style={{ background: '#000', border: '1px solid rgba(255,255,255,0.1)' }} />
                      <div className="flex items-center gap-1">
                        {[3, 4, 5].map(w => <div key={w} className="rounded-sm" style={{ width: '3px', height: `${w * 2}px`, background: 'white', opacity: 0.8 }} />)}
                        <div className="ml-1 text-[11px] font-semibold text-white">100%</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between px-4 py-3"
                      style={{ background: '#000', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                      <span className="text-base font-bold text-white" style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>
                        {client?.instagram_handle || client?.name}
                      </span>
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full border border-white opacity-60" />
                        <div className="w-4 h-0.5 rounded-full bg-white opacity-60" />
                      </div>
                    </div>
                    <div className="overflow-y-auto" style={{ maxHeight: '680px', background: '#000' }}>
                      <FeedGrid />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-full max-w-sm rounded-2xl overflow-hidden"
                  style={{ background: '#000', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <FeedGrid />
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── COMERCIAL ── */}
        {section === 'comercial' && (
          <div className="text-center py-24">
            <TrendingUp size={40} className="mx-auto mb-4" style={{ color: 'rgba(59,130,246,0.15)' }} />
            <p className="text-white font-medium mb-2">Comercial — em breve</p>
            <p className="text-sm" style={{ color: 'rgba(100,116,139,0.5)' }}>
              Pipeline de vendas, origem dos leads e previsão de receita.
            </p>
          </div>
        )}
      </div>

      {/* Detail panel */}
      {detail && (
        <div className="fixed inset-0 flex items-center justify-end z-50"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
          onClick={() => { setDetail(null); setAdjustModal(false); }}>
          <div className="h-full w-full max-w-lg overflow-y-auto"
            style={{ background: '#07071a', borderLeft: '1px solid rgba(59,130,246,0.12)', boxShadow: '-20px 0 60px rgba(0,0,0,0.7)' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(59,130,246,0.08)' }}>
              <StatusBadge status={detail.status} />
              <button onClick={() => setDetail(null)} style={{ color: 'rgba(100,116,139,0.5)' }} className="p-1.5 rounded-lg">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-6">
              {detail.media_url && (
                <img src={detail.media_url} alt={detail.title} className="w-full rounded-2xl object-cover"
                  style={{ border: '1px solid rgba(59,130,246,0.1)', maxHeight: '320px' }} />
              )}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="badge badge-slate">{TYPE_LABEL[detail.type]}</span>
                  {detail.scheduled_date && (
                    <span className="flex items-center gap-1 text-xs" style={{ color: 'rgba(100,116,139,0.5)' }}>
                      <Calendar size={10} />{format(new Date(detail.scheduled_date), "d 'de' MMMM", { locale: ptBR })}
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-semibold text-white mt-2">{detail.title}</h2>
              </div>
              {detail.objective && (
                <div className="rounded-xl px-4 py-3" style={{ background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.12)' }}>
                  <p className="text-xs mb-1" style={{ color: 'rgba(59,130,246,0.6)' }}>Objetivo estratégico</p>
                  <p className="text-sm text-white">{detail.objective}</p>
                </div>
              )}
              {detail.caption && (
                <div>
                  <p className="label-dark mb-2">Legenda do post</p>
                  <div className="rounded-xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <p className="text-sm whitespace-pre-wrap" style={{ color: 'rgba(148,163,184,0.85)', lineHeight: '1.7' }}>{detail.caption}</p>
                  </div>
                </div>
              )}
              {detail.status === 'aguardando_aprovacao' && (
                <div className="space-y-3">
                  <p className="label-dark">Sua decisão</p>
                  <button onClick={handleApprove} disabled={acting}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium"
                    style={{ background: 'linear-gradient(135deg,rgba(52,211,153,0.15),rgba(16,185,129,0.1))', border: '1px solid rgba(52,211,153,0.3)', color: '#34d399' }}>
                    <CheckCircle2 size={18} /> {acting ? 'Aprovando…' : 'Aprovar esta peça'}
                  </button>
                  <button onClick={() => setAdjustModal(true)} disabled={acting}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium"
                    style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.25)', color: '#f97316' }}>
                    <RotateCcw size={16} /> Solicitar ajuste
                  </button>
                </div>
              )}
              {detail.status === 'aprovado' && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl"
                  style={{ background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.15)' }}>
                  <CheckCircle2 size={16} style={{ color: '#34d399' }} />
                  <span className="text-sm" style={{ color: '#34d399' }}>Você aprovou esta peça</span>
                </div>
              )}
              {detail.status === 'ajuste_solicitado' && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl"
                  style={{ background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.15)' }}>
                  <RotateCcw size={16} style={{ color: '#f97316' }} />
                  <span className="text-sm" style={{ color: '#f97316' }}>Ajuste solicitado ao time</span>
                </div>
              )}
              {adjustModal && (
                <div className="rounded-xl p-4 space-y-3" style={{ background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.2)' }}>
                  <p className="text-sm font-medium" style={{ color: '#f97316' }}>Descreva o ajuste necessário</p>
                  <textarea value={adjustComment} onChange={e => setAdjustComment(e.target.value)}
                    rows={3} placeholder="Ex: Mudar a cor do texto, ajustar a copy…" className="input-dark resize-none text-sm w-full" />
                  <div className="flex gap-2">
                    <button onClick={() => { setAdjustModal(false); setAdjustComment(''); }} className="btn-ghost flex-1 justify-center text-sm py-2">Cancelar</button>
                    <button onClick={handleRequestAdjust} disabled={!adjustComment.trim() || acting}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium"
                      style={{ background: 'rgba(249,115,22,0.15)', border: '1px solid rgba(249,115,22,0.3)', color: '#f97316' }}>
                      <Send size={13} /> {acting ? 'Enviando…' : 'Enviar'}
                    </button>
                  </div>
                </div>
              )}
              <div>
                <p className="label-dark mb-3 flex items-center gap-2"><MessageSquare size={12} />Comentários</p>
                <div className="space-y-3 mb-4 max-h-52 overflow-y-auto">
                  {!(detail.comments?.length) ? (
                    <p className="text-xs" style={{ color: 'rgba(100,116,139,0.4)' }}>Nenhum comentário ainda</p>
                  ) : detail.comments!.map(c => (
                    <div key={c.id} className="rounded-xl px-3 py-2.5"
                      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-white">{c.user_name}</span>
                        <span className="text-[10px]" style={{ color: 'rgba(100,116,139,0.4)' }}>
                          {format(new Date(c.created_at), "d MMM HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                      <p className="text-xs" style={{ color: 'rgba(148,163,184,0.7)', lineHeight: '1.5' }}>{c.message}</p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input value={comment} onChange={e => setComment(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleComment()}
                    placeholder="Comentar…" className="input-dark flex-1 text-sm py-2" />
                  <button onClick={handleComment} disabled={sendingComment || !comment.trim()}
                    className="btn-primary px-3"><Send size={13} /></button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
