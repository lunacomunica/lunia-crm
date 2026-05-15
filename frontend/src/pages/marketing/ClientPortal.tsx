import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ClientPositioning from './ClientPositioning';
import {
  CheckCircle2, RotateCcw, MessageSquare, Calendar, X, Send, Eye,
  FileImage, Clock, Grid3x3, Megaphone, Smartphone, Instagram,
  TrendingUp, MousePointer, DollarSign, BarChart3, Target, Pencil,
  Plus, Trash2, ChevronRight, ChevronLeft, Zap, Users, Star, BookOpen, Briefcase,
  ArrowLeft, LayoutDashboard, Menu, Phone, UserPlus, Kanban, Settings, Search,
  List, CalendarDays, ExternalLink
} from 'lucide-react';
import { contentApi, agencyClientsApi, campaignsApi, clientPortalApi, clientCrmApi, conversationsApi, profileApi, contentIdeasApi, metaApi } from '../../api/client';
import { ContentPiece, ContentStatus, AgencyClient, Campaign } from '../../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '../../context/AuthContext';

/* ─── Helpers ───────────────────────────────────────────────────────────── */
function toDisplayUrl(url: string): string {
  const m = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (m) return `https://drive.google.com/uc?export=view&id=${m[1]}`;
  return url;
}

function getPostThumbnail(p: ContentPiece): string | null {
  try {
    const files = JSON.parse((p as any).media_files || '[]');
    const img = files.find((f: any) => f.type === 'image');
    if (img?.url) return toDisplayUrl(img.url);
  } catch {}
  return p.media_url ? toDisplayUrl(p.media_url) : null;
}

function IgCarouselIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="white" className="drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
      <path d="M2 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8z"/>
      <path d="M6 4h13a3 3 0 0 1 3 3v11" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round"/>
    </svg>
  );
}

function IgReelsIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="white" className="drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
      <path d="M5 3a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H5z"/>
      <path d="M2 8h20M8 3v5M16 3v5" stroke="black" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      <path d="M10 12l5 3-5 3v-6z" fill="black"/>
    </svg>
  );
}

/* ─── Configs ────────────────────────────────────────────────────────────── */
const STATUS_CFG: Record<ContentStatus, { label: string; color: string; bg: string; border: string }> = {
  em_criacao:           { label: 'Em Criação',           color: '#94a3b8', bg: 'rgba(148,163,184,0.08)', border: 'rgba(148,163,184,0.15)' },
  em_revisao:           { label: 'Em Revisão',           color: '#22d3ee', bg: 'rgba(34,211,238,0.08)',  border: 'rgba(34,211,238,0.15)'  },
  aguardando_aprovacao: { label: 'Aguardando Aprovação', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',   border: 'rgba(245,158,11,0.25)'  },
  aprovado:             { label: 'Aprovado',             color: '#60a5fa', bg: 'rgba(59,130,246,0.08)',  border: 'rgba(59,130,246,0.2)'   },
  ajuste_solicitado:    { label: 'Ajuste Solicitado',    color: '#f87171', bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.2)'  },
  agendado:             { label: 'Agendado',             color: '#a78bfa', bg: 'rgba(167,139,250,0.08)',border: 'rgba(167,139,250,0.2)'  },
  publicado:            { label: 'Publicado',            color: '#10b981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)'   },
};

const FEED_OVERLAY: Partial<Record<ContentStatus, { icon: any; color: string; bg: string; label: string }>> = {
  aguardando_aprovacao: { icon: Clock,     color: '#f59e0b', bg: 'rgba(245,158,11,0.75)',  label: 'Ag. aprovação' },
  ajuste_solicitado:    { icon: RotateCcw, color: '#f87171', bg: 'rgba(248,113,113,0.75)', label: 'Ajuste pedido' },
  em_criacao:           { icon: FileImage, color: '#94a3b8', bg: 'rgba(5,5,15,0.7)',       label: 'Em criação'    },
  em_revisao:           { icon: Eye,       color: '#22d3ee', bg: 'rgba(34,211,238,0.65)',  label: 'Em revisão'    },
  agendado:             { icon: Calendar,  color: '#a78bfa', bg: 'rgba(167,139,250,0.65)', label: 'Agendado'      },
};

const PLATFORM_CFG: Record<string, { label: string; color: string }> = {
  meta:     { label: 'Meta Ads',    color: '#1877f2' },
  google:   { label: 'Google Ads',  color: '#ea4335' },
  tiktok:   { label: 'TikTok Ads',  color: '#ff0050' },
  linkedin: { label: 'LinkedIn Ads',color: '#0077b5' },
};

const CAMPAIGN_STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  rascunho:  { label: 'Rascunho',  color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' },
  ativa:     { label: 'Ativa',     color: '#34d399', bg: 'rgba(52,211,153,0.1)'  },
  pausada:   { label: 'Pausada',   color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  encerrada: { label: 'Encerrada', color: '#64748b', bg: 'rgba(100,116,139,0.1)' },
};

const TYPE_LABEL: Record<string, string> = { post: 'Post', reels: 'Reels', story: 'Story', carrossel: 'Carrossel' };

type PageId = 'visao' | 'posicionamento' | 'produtos' | 'metas' | 'conteudos' | 'ideias' | 'performance' | 'trafico' | 'crm_dashboard' | 'crm_contatos' | 'crm_pipeline' | 'crm_conversas';

const STAGES_CRM = [
  { id: 'novo',       label: 'Novo',        color: '#94a3b8' },
  { id: 'contato',    label: 'Contato',     color: '#60a5fa' },
  { id: 'proposta',   label: 'Proposta',    color: '#a78bfa' },
  { id: 'negociacao', label: 'Negociação',  color: '#f59e0b' },
  { id: 'fechado',    label: 'Fechado',     color: '#34d399' },
  { id: 'perdido',    label: 'Perdido',     color: '#f87171' },
];
const stageCfg = (id: string) => STAGES_CRM.find(s => s.id === id) || STAGES_CRM[0];

const fmtR = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const fmtN = (v: number) => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(1)}k` : String(v);

/* ── MediaViewer ─────────────────────────────────────────────────────────── */
interface MediaItem { type: 'image' | 'video'; url: string; }

function MediaViewer({ mediaFiles, mediaUrl, contentType }: {
  mediaFiles?: string | null; mediaUrl?: string | null; contentType?: string;
}) {
  const items: MediaItem[] = (() => {
    try {
      const parsed: { type: string; url: string }[] = JSON.parse(mediaFiles || '[]');
      const mapped = parsed.filter(f => f.url).map(f => ({
        type: (f.type === 'video' ? 'video' : 'image') as 'image' | 'video',
        url: f.url,
      }));
      if (mapped.length > 0) return mapped;
    } catch {}
    if (!mediaUrl) return [];
    const isVideo = contentType === 'reels' || /\.(mp4|mov|webm)(\?|$)/i.test(mediaUrl);
    return [{ type: isVideo ? 'video' : 'image', url: mediaUrl }];
  })();

  const [active, setActive] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);

  if (items.length === 0) return null;

  const goTo = (i: number) => {
    setActive(i);
    trackRef.current?.children[i]?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
  };

  const onScroll = () => {
    const el = trackRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollLeft / el.clientWidth);
    setActive(idx);
  };

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: '#000', position: 'relative' }}>
      {/* Slides */}
      <div ref={trackRef} onScroll={onScroll}
        className="flex"
        style={{ overflowX: 'scroll', scrollSnapType: 'x mandatory', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
        {items.map((item, i) => (
          <div key={i} className="flex-shrink-0 w-full flex items-center justify-center"
            style={{ scrollSnapAlign: 'start', minHeight: '200px', maxHeight: '520px', background: '#000' }}>
            {item.type === 'video' ? (
              <video src={item.url} controls playsInline
                className="w-full"
                style={{ maxHeight: '520px', display: 'block', outline: 'none' }} />
            ) : (
              <img src={item.url} alt={`slide ${i + 1}`}
                className="w-full object-contain"
                style={{ maxHeight: '520px', display: 'block' }}
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            )}
          </div>
        ))}
      </div>

      {/* Slide counter badge (top-right) */}
      {items.length > 1 && (
        <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-semibold"
          style={{ background: 'rgba(0,0,0,0.55)', color: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(4px)' }}>
          {active + 1} / {items.length}
        </div>
      )}

      {/* Dot indicators */}
      {items.length > 1 && (
        <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
          {items.map((_, i) => (
            <button key={i} onClick={() => goTo(i)}
              className="rounded-full transition-all duration-200"
              style={{
                width: i === active ? '18px' : '6px',
                height: '6px',
                background: i === active ? '#fff' : 'rgba(255,255,255,0.4)',
              }} />
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: ContentStatus }) {
  const c = STATUS_CFG[status];
  return (
    <span className="text-xs font-medium px-2.5 py-1 rounded-full"
      style={{ color: c.color, background: c.bg, border: `1px solid ${c.border}` }}>
      {c.label}
    </span>
  );
}

/* ─── Sidebar ────────────────────────────────────────────────────────────── */
function PortalSidebar({
  client, page, setPage, pendingCount, activeCampaignsCount, open, onClose, isAdmin, onBack
}: {
  client: AgencyClient | null; page: PageId; setPage: (p: PageId) => void;
  pendingCount: number; activeCampaignsCount: number;
  open: boolean; onClose: () => void; isAdmin: boolean; onBack: () => void;
}) {
  const { user, logout } = useAuth();

  const sections = [
    {
      label: 'Negócio',
      items: [
        { id: 'visao'          as PageId, label: 'Visão Geral',    icon: LayoutDashboard, badge: 0 },
        { id: 'posicionamento' as PageId, label: 'Posicionamento', icon: Star,            badge: 0 },
        { id: 'produtos'       as PageId, label: 'Produtos',       icon: Briefcase,       badge: 0 },
        { id: 'metas'          as PageId, label: 'Metas',          icon: Target,          badge: 0 },
      ],
    },
    {
      label: 'Marketing',
      items: [
        { id: 'conteudos'   as PageId, label: 'Conteúdos',   icon: Grid3x3,   badge: pendingCount },
        { id: 'ideias'      as PageId, label: 'Ideias',        icon: Zap,       badge: 0 },
        { id: 'trafico'     as PageId, label: 'Tráfego',      icon: Megaphone, badge: activeCampaignsCount },
        { id: 'performance' as PageId, label: 'Performance',  icon: BarChart3, badge: 0 },
      ],
    },
    {
      label: 'Comercial',
      items: [
        { id: 'crm_dashboard'  as PageId, label: 'Dashboard',  icon: LayoutDashboard, badge: 0 },
        { id: 'crm_pipeline'   as PageId, label: 'Pipeline',   icon: Kanban,          badge: 0 },
        { id: 'crm_contatos'   as PageId, label: 'Contatos',   icon: Users,           badge: 0 },
        { id: 'crm_conversas'  as PageId, label: 'Conversas',  icon: MessageSquare,   badge: 0 },
      ],
    },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div className="fixed inset-0 z-30 md:hidden" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose} />
      )}

      <aside className={`w-60 flex flex-col h-screen fixed left-0 top-0 z-40 transition-transform duration-300 ${open ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
        style={{ background: 'linear-gradient(180deg,#030314 0%,#04041a 100%)', borderRight: '1px solid rgba(255,255,255,0.05)' }}>

        {/* Client identity */}
        <div className="px-5 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          {client?.logo ? (
            <img src={client.logo} alt={client.name} className="w-10 h-10 rounded-xl object-cover mb-3" />
          ) : (
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-base font-bold mb-3"
              style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)' }}>
              {client?.name.charAt(0).toUpperCase()}
            </div>
          )}
          <p className="font-semibold text-white text-sm leading-tight">{client?.name}</p>
          <p className="text-[11px] mt-0.5" style={{ color: 'rgba(100,116,139,0.5)' }}>
            {client?.segment || 'Portal do Cliente'}
          </p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-5">
          {sections.map(section => (
            <div key={section.label}>
              <p className="section-label px-3 mb-1.5">{section.label}</p>
              <div className="space-y-0.5">
                {section.items.map(item => {
                  const active = page === item.id;
                  return (
                    <button key={item.id} onClick={() => { if (!(item as any).disabled) { setPage(item.id); onClose(); } }}
                      disabled={(item as any).disabled}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left"
                      style={active
                        ? { background: 'linear-gradient(90deg,rgba(59,130,246,0.13),rgba(59,130,246,0.04))', borderLeft: '2px solid #3b82f6' }
                        : { borderLeft: '2px solid transparent', opacity: (item as any).disabled ? 0.35 : 1 }}>
                      <item.icon size={15} style={{ color: active ? '#60a5fa' : 'rgba(100,116,139,0.6)', flexShrink: 0 }} />
                      <span className="text-sm flex-1" style={{ color: active ? '#e2e8f0' : 'rgba(100,116,139,0.7)' }}>
                        {item.label}
                      </span>
                      {item.badge > 0 && (
                        <span className="text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ background: item.id === 'conteudos' ? 'rgba(245,158,11,0.2)' : 'rgba(52,211,153,0.15)', color: item.id === 'conteudos' ? '#f59e0b' : '#34d399' }}>
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          {isAdmin && (
            <button onClick={onBack}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs mb-1 transition-colors"
              style={{ color: 'rgba(245,158,11,0.7)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(245,158,11,0.06)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <ArrowLeft size={13} /> Sair do preview
            </button>
          )}
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
              style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)' }}>
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate">{user?.name}</p>
              <p className="text-[10px] truncate" style={{ color: 'rgba(100,116,139,0.5)' }}>Cliente</p>
            </div>
            {!isAdmin && (
              <button onClick={logout} title="Sair" className="p-1 rounded" style={{ color: 'rgba(100,116,139,0.4)' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(100,116,139,0.4)')}>
                <ArrowLeft size={12} />
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}

/* ─── Main ───────────────────────────────────────────────────────────────── */
export default function ClientPortal() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'owner' || user?.role === 'manager';
  const isOwner = user?.role === 'owner';

  const [page, setPage] = useState<PageId>('visao');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [client, setClient] = useState<AgencyClient | null>(null);
  const [pieces, setPieces] = useState<ContentPiece[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [goals, setGoals] = useState<any[]>([]);
  const [positioning, setPositioning] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // CRM state
  const [crmDash, setCrmDash] = useState<any>(null);
  const [crmContacts, setCrmContacts] = useState<any[]>([]);
  const [crmDeals, setCrmDeals] = useState<any[]>([]);
  const [crmLoading, setCrmLoading] = useState(false);
  const [contactModal, setContactModal] = useState(false);
  const [editingContact, setEditingContact] = useState<any>(null);
  const [contactForm, setContactForm] = useState({ name: '', email: '', phone: '', source: 'manual', notes: '' });
  const [savingContact, setSavingContact] = useState(false);
  const [dealModal, setDealModal] = useState(false);
  const [editingDeal, setEditingDeal] = useState<any>(null);
  const [dealForm, setDealForm] = useState({ title: '', value: '', stage: 'novo', probability: '20', notes: '', client_contact_id: '' });
  const [savingDeal, setSavingDeal] = useState(false);

  // Conversations state
  const [convs, setConvs] = useState<any[]>([]);
  const [convLoading, setConvLoading] = useState(false);
  const [activeConv, setActiveConv] = useState<any>(null);
  const [convMessages, setConvMessages] = useState<any[]>([]);
  const [convSearch, setConvSearch] = useState('');
  const [convMsg, setConvMsg] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);

  // Profile state
  const [profileForm, setProfileForm] = useState({ name: '', avatar: '' });
  const [profileSaving, setProfileSaving] = useState(false);

  const [detail, setDetail] = useState<ContentPiece | null>(null);
  const [adjustModal, setAdjustModal] = useState(false);
  const [adjustComment, setAdjustComment] = useState('');
  const [comment, setComment] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const [acting, setActing] = useState(false);
  const [feedFilter, setFeedFilter] = useState<'all' | 'approved'>('all');
  const [conteudosInitFilter, setConteudosInitFilter] = useState<string>('all');
  const [phoneFrame, setPhoneFrame] = useState(true);
  const [igInsights, setIgInsights] = useState<any>(null);
  const [igInsightsLoading, setIgInsightsLoading] = useState(false);
  const [detailInsights, setDetailInsights] = useState<any>(null);
  const [detailInsightsLoading, setDetailInsightsLoading] = useState(false);

  const [cid, setCid] = useState<number>(Number(clientId) || 0);

  const load = async () => {
    setLoading(true);
    const clientRes = await agencyClientsApi.get(clientId as any);
    const numId = clientRes.data.id;
    setCid(numId);
    const [contentRes, batchRes, campRes, summaryRes, goalsRes, posRes] = await Promise.all([
      contentApi.list({ client_id: String(numId) }),
      contentApi.listBatches({ client_id: String(numId) }),
      campaignsApi.list({ client_id: String(numId) }),
      clientPortalApi.summary(numId),
      clientPortalApi.goals(numId),
      clientPortalApi.positioning(numId),
    ]);
    setClient(clientRes.data);
    setPieces(contentRes.data);
    const sortedBatches = (batchRes.data as any[]).sort((a, b) =>
      a.year !== b.year ? a.year - b.year : a.month - b.month
    );
    setBatches(sortedBatches);
    setCampaigns(campRes.data);
    setSummary(summaryRes.data);
    setGoals(goalsRes.data);
    setPositioning(posRes.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [clientId]);

  const loadCrm = async () => {
    setCrmLoading(true);
    const [dashRes, contactsRes, dealsRes] = await Promise.all([
      clientCrmApi.dashboard(cid),
      clientCrmApi.contacts(cid),
      clientCrmApi.deals(cid),
    ]);
    setCrmDash(dashRes.data);
    setCrmContacts(contactsRes.data);
    setCrmDeals(dealsRes.data);
    setCrmLoading(false);
  };

  const loadIgInsights = async () => {
    if (igInsightsLoading) return;
    setIgInsightsLoading(true);
    try {
      const r = await metaApi.getInsights(cid);
      setIgInsights(r.data);
    } catch {}
    setIgInsightsLoading(false);
  };

  useEffect(() => {
    const igId = (detail as any)?.ig_media_id;
    if (igId && cid) {
      setDetailInsights(null);
      setDetailInsightsLoading(true);
      metaApi.getMediaInsights(cid, igId)
        .then(r => setDetailInsights(r.data))
        .catch(() => {})
        .finally(() => setDetailInsightsLoading(false));
    } else {
      setDetailInsights(null);
    }
  }, [detail?.id]);

  useEffect(() => {
    if (page === 'performance' && !igInsights && !igInsightsLoading) {
      loadIgInsights();
    }
    if ((page === 'crm_dashboard' || page === 'crm_contatos' || page === 'crm_pipeline' || page === 'crm_conversas') && !crmDash && !crmLoading) {
      loadCrm();
    }
    if (page === 'crm_conversas' && convs.length === 0 && !convLoading && cid) {
      setConvLoading(true);
      conversationsApi.list({ agency_client_id: String(cid) }).then(r => { setConvs(r.data); setConvLoading(false); });
    }
    if (page === 'visao' && user) {
      setProfileForm({ name: user.name || '', avatar: user.avatar || '' });
    }
  }, [page]);

  const openNewContact = () => { setEditingContact(null); setContactForm({ name: '', email: '', phone: '', source: 'manual', notes: '' }); setContactModal(true); };
  const openEditContact = (c: any) => { setEditingContact(c); setContactForm({ name: c.name, email: c.email || '', phone: c.phone || '', source: c.source || 'manual', notes: c.notes || '' }); setContactModal(true); };
  const saveContact = async () => {
    if (!contactForm.name.trim()) return;
    setSavingContact(true);
    if (editingContact) await clientCrmApi.updateContact(cid, editingContact.id, { ...contactForm, stage: editingContact.stage });
    else await clientCrmApi.createContact(cid, contactForm);
    await loadCrm();
    setContactModal(false); setSavingContact(false);
  };
  const deleteContact = async (id: number) => {
    if (!confirm('Excluir este contato?')) return;
    await clientCrmApi.deleteContact(cid, id); await loadCrm();
  };
  const updateContactStage = async (id: number, stage: string) => {
    const c = crmContacts.find(x => x.id === id);
    if (!c) return;
    await clientCrmApi.updateContact(cid, id, { ...c, stage });
    setCrmContacts(prev => prev.map(x => x.id === id ? { ...x, stage } : x));
  };
  const openNewDeal = () => { setEditingDeal(null); setDealForm({ title: '', value: '', stage: 'novo', probability: '20', notes: '', client_contact_id: '' }); setDealModal(true); };
  const openEditDeal = (d: any) => { setEditingDeal(d); setDealForm({ title: d.title, value: String(d.value || ''), stage: d.stage, probability: String(d.probability || 20), notes: d.notes || '', client_contact_id: String(d.client_contact_id || '') }); setDealModal(true); };
  const saveDeal = async () => {
    if (!dealForm.title.trim()) return;
    setSavingDeal(true);
    const data = { ...dealForm, value: parseFloat(dealForm.value) || 0, probability: parseInt(dealForm.probability) || 20, client_contact_id: parseInt(dealForm.client_contact_id) || null };
    if (editingDeal) await clientCrmApi.updateDeal(cid, editingDeal.id, data);
    else await clientCrmApi.createDeal(cid, data);
    await loadCrm();
    setDealModal(false); setSavingDeal(false);
  };
  const deleteDeal = async (id: number) => {
    if (!confirm('Excluir este negócio?')) return;
    await clientCrmApi.deleteDeal(cid, id); await loadCrm();
  };

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

  /* ── Feed grid ─────────────────────────────────────────────────────────── */
  const feedDisplayed = pieces.filter(p =>
    feedFilter === 'all' ? true : ['aprovado', 'agendado', 'publicado'].includes(p.status)
  ).slice(0, 30);

  function FeedGrid() {
    const feedStats = {
      total: pieces.length,
      approved: pieces.filter(p => ['aprovado', 'agendado', 'publicado'].includes(p.status)).length,
      pending: pieces.filter(p => p.status === 'aguardando_aprovacao').length,
    };
    return (
      <div>
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-center gap-3 mb-3">
            {client?.logo ? (
              <img src={client.logo} alt={client.name} className="w-14 h-14 rounded-full object-cover" style={{ border: '2px solid rgba(255,255,255,0.1)' }} />
            ) : (
              <div className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold"
                style={{ background: 'linear-gradient(135deg,#f59e0b,#ec4899,#8b5cf6)', padding: '2px' }}>
                <div className="w-full h-full rounded-full flex items-center justify-center" style={{ background: '#111' }}>
                  {client?.name.charAt(0).toUpperCase()}
                </div>
              </div>
            )}
            <div>
              <p className="text-sm font-semibold text-white">{client?.instagram_handle ? `@${client.instagram_handle}` : client?.name}</p>
              {client?.segment && <p className="text-xs" style={{ color: 'rgba(148,163,184,0.6)' }}>{client.segment}</p>}
            </div>
          </div>
          <div className="grid grid-cols-3 text-center mb-3 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
            {[{ label: 'Peças', value: feedStats.total }, { label: 'Aprovadas', value: feedStats.approved }, { label: 'Pendentes', value: feedStats.pending }].map(s => (
              <div key={s.label}>
                <p className="text-sm font-bold text-white">{s.value}</p>
                <p className="text-[10px]" style={{ color: 'rgba(100,116,139,0.5)' }}>{s.label}</p>
              </div>
            ))}
          </div>
          <div className="flex border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            {[{ id: 'all' as const, label: 'Tudo', icon: Grid3x3, color: '#fff' }, { id: 'approved' as const, label: 'Aprovados', icon: CheckCircle2, color: '#34d399' }].map(f => (
              <button key={f.id} onClick={() => setFeedFilter(f.id)}
                className="flex-1 py-2 text-xs font-medium flex items-center justify-center gap-1.5"
                style={{ color: feedFilter === f.id ? f.color : 'rgba(100,116,139,0.5)', borderBottom: feedFilter === f.id ? `2px solid ${f.color}` : '2px solid transparent' }}>
                <f.icon size={11} /> {f.label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-0.5">
          {feedDisplayed.length === 0 ? (
            <div className="col-span-3 py-12 text-center"><p className="text-xs" style={{ color: 'rgba(100,116,139,0.4)' }}>Nenhum post para exibir</p></div>
          ) : feedDisplayed.map(p => {
            const overlay = FEED_OVERLAY[p.status];
            const isPublished = p.status === 'publicado';
            return (
              <button key={p.id} onClick={() => openDetail(p)} className="relative overflow-hidden group" style={{ aspectRatio: '1080/1350', background: 'rgba(255,255,255,0.03)' }}>
                {getPostThumbnail(p) ? (
                  <img src={getPostThumbnail(p)!} alt={p.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" style={{ opacity: overlay ? 0.65 : 1 }} />
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
                {p.type === 'carrossel' && <span className="absolute top-2 right-2"><IgCarouselIcon size={16} /></span>}
                {p.type === 'reels' && <span className="absolute top-2 right-2"><IgReelsIcon size={16} /></span>}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  /* ── Pages ─────────────────────────────────────────────────────────────── */
  function PageVisaoGeral() {
    const s = summary;
    const [editingMsg, setEditingMsg] = useState(false);
    const [msgDraft, setMsgDraft] = useState(client?.ceo_message || '');
    const [savingMsg, setSavingMsg] = useState(false);

    const saveMsg = async () => {
      setSavingMsg(true);
      await agencyClientsApi.updateCeoMessage(cid, msgDraft);
      setClient((prev: any) => prev ? { ...prev, ceo_message: msgDraft } : prev);
      setSavingMsg(false);
      setEditingMsg(false);
    };

    const pendingApproval = s?.posts?.pending_approval ?? 0;
    const needsAdjust = s?.posts?.needs_adjustment ?? 0;
    const pendingPieces: any[] = s?.pendingPieces ?? [];
    const nextBatch = s?.nextBatch ?? null;
    const lastApproved = s?.lastApproved ?? null;
    const lastUpdate = s?.lastAgencyUpdate ?? null;

    const MONTHS_PT_SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

    const mods = (() => { try { return typeof client?.modules === 'string' ? JSON.parse(client.modules) : (client?.modules || {}); } catch { return {}; } })();
    const pillars = [
      { key: 'posicionamento', label: 'Posicionamento', color: '#a78bfa', active: !!mods.posicionamento },
      { key: 'marketing',      label: 'Marketing',      color: '#34d399', active: !!(mods.marketing_conteudo || mods.marketing_trafego) },
      { key: 'comercial',      label: 'Comercial',      color: '#fb923c', active: !!mods.comercial },
    ];
    const activeCount = pillars.filter(p => p.active).length;
    const flywheelPct = activeCount / 3;

    const statusLabel: Record<string, string> = {
      em_criacao: 'Em criação', em_revisao: 'Em revisão', aguardando_aprovacao: 'Aguardando aprovação',
      aprovado: 'Aprovado', ajuste_solicitado: 'Ajuste solicitado', agendado: 'Agendado', publicado: 'Publicado',
    };

    return (
      <div className="space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-light text-white mb-1">
            Olá, <span className="font-semibold">{client?.name}</span> 👋
          </h1>
          <p className="text-sm" style={{ color: 'rgba(100,116,139,0.5)' }}>
            {format(new Date(), "MMMM 'de' yyyy", { locale: ptBR })} — seu negócio está em boas mãos
          </p>
        </div>

        {/* Action cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Pending approvals */}
          <button onClick={() => setPage('conteudos')}
            className="group text-left rounded-2xl p-5 transition-all"
            style={{
              background: pendingApproval > 0 ? 'linear-gradient(135deg,rgba(245,158,11,0.10),rgba(245,158,11,0.05))' : 'linear-gradient(135deg,#0d0d22,#0f0f28)',
              border: `1px solid ${pendingApproval > 0 ? 'rgba(245,158,11,0.25)' : 'rgba(255,255,255,0.05)'}`,
            }}>
            <div className="flex items-start justify-between mb-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: pendingApproval > 0 ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.05)' }}>
                <CheckCircle2 size={16} style={{ color: pendingApproval > 0 ? '#f59e0b' : 'rgba(100,116,139,0.4)' }} />
              </div>
              {pendingApproval > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>
                  {pendingApproval} novo{pendingApproval > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <p className="text-sm font-semibold mb-0.5" style={{ color: pendingApproval > 0 ? '#f59e0b' : 'rgba(100,116,139,0.5)' }}>
              {pendingApproval > 0
                ? `${pendingApproval} post${pendingApproval > 1 ? 's' : ''} aguardando aprovação`
                : 'Nenhuma aprovação pendente'}
            </p>
            <p className="text-xs" style={{ color: 'rgba(100,116,139,0.45)' }}>
              {pendingApproval > 0 ? 'Clique para revisar e aprovar →' : 'Tudo em dia por aqui'}
            </p>
          </button>

          {/* Next batch delivery */}
          <div className="rounded-2xl p-5"
            style={{
              background: nextBatch ? 'linear-gradient(135deg,rgba(52,211,153,0.08),rgba(52,211,153,0.03))' : 'linear-gradient(135deg,#0d0d22,#0f0f28)',
              border: `1px solid ${nextBatch ? 'rgba(52,211,153,0.2)' : 'rgba(255,255,255,0.05)'}`,
            }}>
            <div className="flex items-start justify-between mb-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: nextBatch ? 'rgba(52,211,153,0.12)' : 'rgba(255,255,255,0.05)' }}>
                <Calendar size={16} style={{ color: nextBatch ? '#34d399' : 'rgba(100,116,139,0.4)' }} />
              </div>
              {nextBatch && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(52,211,153,0.12)', color: '#34d399' }}>
                  Próxima entrega
                </span>
              )}
            </div>
            <p className="text-sm font-semibold mb-0.5" style={{ color: nextBatch ? '#34d399' : 'rgba(100,116,139,0.5)' }}>
              {nextBatch
                ? `Conteúdos de ${MONTHS_PT_SHORT[(nextBatch.month ?? 1) - 1]} ${nextBatch.year}`
                : 'Sem entregas previstas'}
            </p>
            <p className="text-xs" style={{ color: 'rgba(100,116,139,0.45)' }}>
              {nextBatch
                ? `${nextBatch.total ?? 0} post${(nextBatch.total ?? 0) !== 1 ? 's' : ''} planejado${(nextBatch.total ?? 0) !== 1 ? 's' : ''}`
                : 'Nenhum feed agendado ainda'}
            </p>
          </div>
        </div>

        {/* Pending pieces list */}
        {pendingPieces.length > 0 && (
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(245,158,11,0.15)' }}>
            <div className="px-5 py-3 flex items-center justify-between"
              style={{ background: 'rgba(245,158,11,0.06)', borderBottom: '1px solid rgba(245,158,11,0.1)' }}>
              <div className="flex items-center gap-2">
                <Clock size={12} style={{ color: '#f59e0b' }} />
                <span className="text-xs font-semibold" style={{ color: '#f59e0b' }}>
                  Aguardando sua aprovação ({pendingPieces.length})
                </span>
              </div>
              <button onClick={() => setPage('conteudos')} className="text-[10px]" style={{ color: 'rgba(100,116,139,0.5)' }}>
                Ver tudo →
              </button>
            </div>
            <div style={{ background: 'linear-gradient(145deg,#0d0d22,#0f0f28)' }}>
              {pendingPieces.slice(0, 5).map((piece: any, i: number) => (
                <button key={piece.id} onClick={() => setPage('conteudos')}
                  className="w-full flex items-center gap-3 px-5 py-3 text-left transition-colors"
                  style={{ borderTop: i > 0 ? '1px solid rgba(255,255,255,0.04)' : undefined }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(245,158,11,0.04)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#f59e0b' }} />
                  <span className="flex-1 text-sm text-white truncate">{piece.title}</span>
                  {piece.scheduled_date && (
                    <span className="text-[10px] flex-shrink-0" style={{ color: 'rgba(100,116,139,0.4)' }}>
                      {format(new Date(piece.scheduled_date), "d MMM", { locale: ptBR })}
                    </span>
                  )}
                  <ChevronRight size={12} style={{ color: 'rgba(100,116,139,0.3)', flexShrink: 0 }} />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Ajustes pendentes */}
        {needsAdjust > 0 && (
          <button
            onClick={() => { setConteudosInitFilter('ajuste'); setPage('conteudos'); }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all"
            style={{ background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.15)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(249,115,22,0.1)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(249,115,22,0.06)')}>
            <RotateCcw size={13} style={{ color: '#f97316', flexShrink: 0 }} />
            <span className="text-sm flex-1" style={{ color: 'rgba(226,232,240,0.6)' }}>
              <span className="font-medium" style={{ color: '#f97316' }}>{needsAdjust} ajuste{needsAdjust > 1 ? 's' : ''}</span> solicitado{needsAdjust > 1 ? 's' : ''} — toque para ver
            </span>
            <ChevronRight size={14} style={{ color: 'rgba(249,115,22,0.4)', flexShrink: 0 }} />
          </button>
        )}

        {/* CEO Message */}
        <div className="rounded-2xl p-6" style={{ background: 'linear-gradient(135deg,#0d0d22,#0f0f28)', border: '1px solid rgba(167,139,250,0.12)' }}>
          {editingMsg ? (
            <div className="space-y-4">
              <textarea value={msgDraft} onChange={e => setMsgDraft(e.target.value)} rows={5}
                placeholder="Escreva sua mensagem mensal para este cliente…"
                className="w-full bg-transparent resize-none text-sm leading-relaxed outline-none"
                style={{ color: 'rgba(226,232,240,0.85)', caretColor: '#a78bfa' }} autoFocus />
              <div className="flex gap-2 justify-end">
                <button onClick={() => { setEditingMsg(false); setMsgDraft(client?.ceo_message || ''); }}
                  className="text-xs px-3 py-1.5 rounded-lg" style={{ color: 'rgba(100,116,139,0.6)' }}>Cancelar</button>
                <button onClick={saveMsg} disabled={savingMsg}
                  className="text-xs px-4 py-1.5 rounded-lg font-medium"
                  style={{ background: 'rgba(167,139,250,0.15)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.25)' }}>
                  {savingMsg ? 'Salvando…' : 'Salvar'}
                </button>
              </div>
            </div>
          ) : (
            <div>
              {client?.ceo_message ? (
                <p className="text-sm leading-relaxed whitespace-pre-wrap mb-5"
                  style={{ color: 'rgba(226,232,240,0.8)', fontStyle: 'italic' }}>
                  "{client.ceo_message}"
                </p>
              ) : isOwner ? (
                <p className="text-sm mb-5" style={{ color: 'rgba(100,116,139,0.35)', fontStyle: 'italic' }}>
                  Clique em editar para escrever sua mensagem mensal…
                </p>
              ) : (
                <p className="text-sm mb-5" style={{ color: 'rgba(100,116,139,0.35)', fontStyle: 'italic' }}>
                  Em breve você receberá uma mensagem personalizada aqui.
                </p>
              )}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0"
                    style={{ border: '1px solid rgba(167,139,250,0.25)', boxShadow: '0 0 10px rgba(167,139,250,0.15)' }}>
                    {client?.owner_avatar
                      ? <img src={client.owner_avatar} alt="CEO" className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white"
                          style={{ background: 'linear-gradient(135deg,#a78bfa,#6366f1)' }}>
                          {(client?.owner_name || 'O')?.charAt(0).toUpperCase()}
                        </div>}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">{client?.owner_name || '—'}</p>
                    <p className="text-[10px]" style={{ color: 'rgba(167,139,250,0.55)' }}>
                      {client?.owner_job_title || 'CEO, Luna Comunica'}
                    </p>
                  </div>
                </div>
                {isOwner && (
                  <button onClick={() => setEditingMsg(true)}
                    className="text-[11px] px-3 py-1.5 rounded-lg transition-colors"
                    style={{ color: 'rgba(100,116,139,0.5)', border: '1px solid rgba(255,255,255,0.06)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#a78bfa'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(167,139,250,0.3)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(100,116,139,0.5)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)'; }}>
                    <Pencil size={10} className="inline mr-1" />Editar
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Flywheel */}
        <div className="rounded-2xl p-6" style={{ background: 'linear-gradient(145deg,#0d0d22,#0f0f28)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="flex flex-col sm:flex-row items-center gap-8">
            <div className="relative flex-shrink-0" style={{ width: 140, height: 140 }}>
              <svg width="140" height="140" viewBox="0 0 140 140" style={{ transform: 'rotate(-90deg)' }}>
                {pillars.map((p, i) => {
                  const r = 56;
                  const circ = 2 * Math.PI * r;
                  const gapDeg = 8;
                  const segDeg = (360 - gapDeg * 3) / 3;
                  const startDeg = i * (segDeg + gapDeg);
                  const dashLen = (segDeg / 360) * circ;
                  const dashOffset = circ - (startDeg / 360) * circ;
                  return (
                    <g key={p.key}>
                      <circle cx="70" cy="70" r={r} fill="none"
                        stroke={`${p.color}20`} strokeWidth="9"
                        strokeDasharray={`${dashLen} ${circ - dashLen}`}
                        strokeDashoffset={dashOffset} strokeLinecap="round" />
                      {p.active && (
                        <circle cx="70" cy="70" r={r} fill="none"
                          stroke={p.color} strokeWidth="9"
                          strokeDasharray={`${dashLen} ${circ - dashLen}`}
                          strokeDashoffset={dashOffset} strokeLinecap="round"
                          style={{ filter: `drop-shadow(0 0 5px ${p.color}70)` }} />
                      )}
                    </g>
                  );
                })}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-white">{activeCount}</span>
                <span className="text-[10px]" style={{ color: 'rgba(100,116,139,0.45)' }}>de 3 pilares</span>
              </div>
            </div>
            <div className="flex-1 w-full space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-white mb-0.5">Flywheel do Negócio</h3>
                <p className="text-xs" style={{ color: 'rgba(100,116,139,0.4)' }}>
                  {activeCount === 3 ? 'Todos os pilares ativos 🚀' : `${3 - activeCount} pilar${3 - activeCount > 1 ? 'es' : ''} ainda não ativado${3 - activeCount > 1 ? 's' : ''}`}
                </p>
              </div>
              <div className="space-y-2">
                {pillars.map(p => (
                  <div key={p.key} className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ background: p.active ? p.color : 'rgba(255,255,255,0.1)', boxShadow: p.active ? `0 0 5px ${p.color}80` : 'none' }} />
                    <div className="flex-1 flex items-center justify-between">
                      <span className="text-xs" style={{ color: p.active ? 'rgba(226,232,240,0.8)' : 'rgba(100,116,139,0.35)' }}>{p.label}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full"
                        style={{ background: p.active ? `${p.color}12` : 'rgba(255,255,255,0.03)', color: p.active ? p.color : 'rgba(100,116,139,0.25)', border: `1px solid ${p.active ? p.color + '25' : 'rgba(255,255,255,0.04)'}` }}>
                        {p.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="h-0.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${flywheelPct * 100}%`, background: activeCount === 3 ? 'linear-gradient(90deg,#a78bfa,#34d399,#fb923c)' : activeCount === 2 ? 'linear-gradient(90deg,#a78bfa,#34d399)' : '#a78bfa' }} />
              </div>
            </div>
          </div>
        </div>

      </div>
    );
  }

  function PagePosicionamento() {
    return (
      <div>
        <ClientPositioning clientId={cid} />
      </div>
    );
  }

  function PageMetas() {
    const [localGoals, setLocalGoals] = useState<any[]>(goals);
    const [saving, setSaving] = useState(false);
    const [modal, setModal] = useState<any>(null);
    const [form, setForm] = useState({ metric: 'custom', label: '', target: '', unit: '', icon: 'target', due_date: '' });
    const [editingValue, setEditingValue] = useState<number | null>(null); // goal id being edited
    const [valueDraft, setValueDraft] = useState('');
    const [savingValue, setSavingValue] = useState(false);
    useEffect(() => { setLocalGoals(goals); }, [goals]);

    const PRESET_METRICS = [
      { metric: 'posts_month', label: 'Posts publicados/mês', unit: 'posts', icon: 'grid' },
      { metric: 'leads_month', label: 'Leads gerados/mês',   unit: 'leads', icon: 'users' },
      { metric: 'reach_month', label: 'Alcance médio/mês',   unit: 'impressões', icon: 'trending' },
      { metric: 'revenue',     label: 'Faturamento gerado',  unit: 'R$', icon: 'dollar' },
      { metric: 'roas',        label: 'ROAS mínimo',         unit: 'x', icon: 'zap' },
    ];

    const ICONS: Record<string, any> = { grid: Grid3x3, users: Users, trending: TrendingUp, dollar: DollarSign, zap: Zap, target: Target };

    const AUTO_METRICS = ['posts_month', 'leads_month', 'reach_month', 'revenue', 'roas'];

    const getCurrentValue = (g: any) => {
      switch (g.metric) {
        case 'posts_month': return summary?.posts?.published_month ?? 0;
        case 'leads_month': return summary?.campaigns?.leads ?? 0;
        case 'reach_month': return summary?.campaigns?.reach ?? 0;
        case 'revenue':     return summary?.campaigns?.revenue ?? 0;
        case 'roas':        return summary?.roas ?? 0;
        default:            return g.current_value ?? 0;
      }
    };

    const saveCurrentValue = async (g: any) => {
      setSavingValue(true);
      const val = parseFloat(valueDraft) || 0;
      const r = await clientPortalApi.updateGoalValue(cid, g.id, val);
      setLocalGoals(prev => prev.map(x => x.id === g.id ? { ...x, current_value: val } : x));
      setGoals((prev: any[]) => prev.map((x: any) => x.id === g.id ? { ...x, current_value: val } : x));
      setSavingValue(false);
      setEditingValue(null);
    };

    const fmtVal = (metric: string, unit: string, v: number) => {
      if (metric === 'revenue' || unit === 'R$') return fmtR(v);
      if (metric === 'roas' || unit === 'x') return `${v.toFixed(1)}x`;
      if (metric === 'reach_month') return fmtN(v);
      return fmtN(v);
    };

    const fmtTarget = (g: any) => {
      if (g.metric === 'revenue' || g.unit === 'R$') return fmtR(g.target);
      if (g.metric === 'roas' || g.unit === 'x') return `${g.target}x`;
      return `${fmtN(g.target)}${g.unit ? ' ' + g.unit : ''}`;
    };

    const statusOf = (pct: number) => pct >= 100 ? 'concluida' : pct >= 70 ? 'caminho' : pct >= 40 ? 'atencao' : 'risco';
    const STATUS_COLORS: Record<string, string> = { concluida: '#34d399', caminho: '#60a5fa', atencao: '#f59e0b', risco: '#f87171' };
    const STATUS_LABELS: Record<string, string> = { concluida: 'Concluída', caminho: 'No caminho', atencao: 'Atenção', risco: 'Em risco' };

    const save = async () => {
      setSaving(true);
      const r = await clientPortalApi.updateGoals(cid, localGoals);
      setGoals(r.data);
      setSaving(false);
    };

    const openAdd = () => {
      setForm({ metric: 'posts_month', label: 'Posts publicados/mês', target: '', unit: 'posts', icon: 'grid', due_date: '' });
      setModal({});
    };

    const openEdit = (g: any, i: number) => {
      setForm({ metric: g.metric, label: g.label, target: String(g.target), unit: g.unit || '', icon: g.icon || 'target', due_date: g.due_date || '' });
      setModal({ ...g, _idx: i });
    };

    const saveModal = async () => {
      const entry = { metric: form.metric, label: form.label, target: parseFloat(form.target) || 0, unit: form.unit, icon: form.icon, due_date: form.due_date || null };
      let next: any[];
      if (modal?._idx !== undefined) {
        next = localGoals.map((g, i) => i === modal._idx ? entry : g);
      } else {
        next = [...localGoals, entry];
      }
      setLocalGoals(next);
      setSaving(true);
      const r = await clientPortalApi.updateGoals(cid, next);
      setGoals(r.data);
      setSaving(false);
      setModal(null);
    };

    const removeGoal = async (idx: number) => {
      const next = localGoals.filter((_, i) => i !== idx);
      setLocalGoals(next);
      const r = await clientPortalApi.updateGoals(cid, next);
      setGoals(r.data);
    };

    // Summary
    const onTrack = localGoals.filter((g: any) => { const pct = g.target > 0 ? (getCurrentValue(g) / g.target) * 100 : 0; return pct >= 70; }).length;
    const atRisk  = localGoals.filter((g: any) => { const pct = g.target > 0 ? (getCurrentValue(g) / g.target) * 100 : 0; return pct < 40; }).length;

    const inputStyle = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(226,232,240,0.9)' };
    const inputCls = 'w-full rounded-xl px-3 py-2.5 text-sm outline-none';
    const labelStyle = { color: 'rgba(100,116,139,0.55)', fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' as const, marginBottom: 6, display: 'block' };

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-white mb-1">Metas</h2>
            <p className="text-sm" style={{ color: 'rgba(100,116,139,0.5)' }}>Objetivos e progresso em tempo real</p>
          </div>
          {isAdmin && (
            <button onClick={openAdd}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white"
              style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.25)' }}>
              <Plus size={14} /> Nova meta
            </button>
          )}
        </div>

        {/* Summary strip */}
        {localGoals.length > 0 && (
          <div className="flex gap-3">
            {[
              { label: 'No caminho', count: onTrack, color: '#60a5fa' },
              { label: 'Em risco', count: atRisk, color: '#f87171' },
              { label: 'Total', count: localGoals.length, color: 'rgba(100,116,139,0.5)' },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-2 px-4 py-2 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <span className="text-lg font-bold" style={{ color: s.color }}>{s.count}</span>
                <span className="text-xs" style={{ color: 'rgba(100,116,139,0.5)' }}>{s.label}</span>
              </div>
            ))}
            {isAdmin && (
              <button onClick={save} disabled={saving}
                className="ml-auto flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl"
                style={{ background: 'rgba(52,211,153,0.08)', color: '#34d399', border: '1px solid rgba(52,211,153,0.15)' }}>
                {saving ? 'Salvando…' : '✓ Salvar ordem'}
              </button>
            )}
          </div>
        )}

        {/* Empty */}
        {localGoals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 rounded-2xl"
            style={{ border: '1px dashed rgba(59,130,246,0.12)', background: 'linear-gradient(145deg,#0d0d22,#0f0f28)' }}>
            <Target size={36} className="mb-3" style={{ color: 'rgba(59,130,246,0.15)' }} />
            <p className="text-sm font-medium text-white mb-1">Nenhuma meta definida</p>
            <p className="text-xs" style={{ color: 'rgba(100,116,139,0.4)' }}>
              {isAdmin ? 'Clique em "Nova meta" para começar.' : 'A agência ainda não definiu as metas.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {localGoals.map((g: any, i: number) => {
              const current = getCurrentValue(g);
              const pct = g.target > 0 ? Math.min((current / g.target) * 100, 100) : 0;
              const status = statusOf(pct);
              const color = STATUS_COLORS[status];
              const Icon = ICONS[g.icon] || Target;
              const circumference = 2 * Math.PI * 28;
              const dash = (pct / 100) * circumference;
              const isAuto = AUTO_METRICS.includes(g.metric);
              const isEditingThis = editingValue === g.id;

              return (
                <div key={i} className="group rounded-2xl p-5 relative"
                  style={{ background: 'linear-gradient(145deg,#0d0d22,#0f0f28)', border: `1px solid ${color}15` }}>

                  {/* Edit meta button */}
                  {isAdmin && (
                    <button onClick={() => openEdit(g, i)}
                      className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg"
                      style={{ color: 'rgba(100,116,139,0.5)', background: 'rgba(255,255,255,0.04)' }}>
                      <Pencil size={11} />
                    </button>
                  )}

                  <div className="flex items-start gap-4">
                    {/* Circular progress */}
                    <div className="relative flex-shrink-0" style={{ width: 72, height: 72 }}>
                      <svg width="72" height="72" viewBox="0 0 72 72" style={{ transform: 'rotate(-90deg)' }}>
                        <circle cx="36" cy="36" r="28" fill="none" stroke={`${color}15`} strokeWidth="6" />
                        <circle cx="36" cy="36" r="28" fill="none" stroke={color} strokeWidth="6"
                          strokeLinecap="round"
                          strokeDasharray={`${dash} ${circumference - dash}`}
                          style={{ transition: 'stroke-dasharray 0.7s ease', filter: `drop-shadow(0 0 4px ${color}60)` }} />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Icon size={16} style={{ color }} />
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pt-1">
                      <p className="text-xs font-medium mb-2 truncate" style={{ color: 'rgba(100,116,139,0.55)' }}>{g.label}</p>

                      {/* Current value — editable if manual */}
                      {isEditingThis ? (
                        <div className="flex items-center gap-2 mb-2">
                          <input
                            autoFocus
                            type="number"
                            value={valueDraft}
                            onChange={e => setValueDraft(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') saveCurrentValue(g); if (e.key === 'Escape') setEditingValue(null); }}
                            className="w-28 rounded-lg px-2 py-1 text-sm font-bold outline-none"
                            style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${color}40`, color }}
                          />
                          <button onClick={() => saveCurrentValue(g)} disabled={savingValue}
                            className="text-[10px] px-2 py-1 rounded-lg font-medium"
                            style={{ background: `${color}20`, color, border: `1px solid ${color}30` }}>
                            {savingValue ? '…' : 'Ok'}
                          </button>
                          <button onClick={() => setEditingValue(null)}
                            className="text-[10px]" style={{ color: 'rgba(100,116,139,0.4)' }}>✕</button>
                        </div>
                      ) : (
                        <div className="flex items-baseline gap-1.5 mb-1">
                          <span className="text-2xl font-bold leading-none" style={{ color }}>
                            {fmtVal(g.metric, g.unit, current)}
                          </span>
                          <span className="text-xs" style={{ color: 'rgba(100,116,139,0.4)' }}>
                            / {fmtTarget(g)}
                          </span>
                          {isAdmin && !isAuto && (
                            <button
                              onClick={() => { setValueDraft(String(current)); setEditingValue(g.id); }}
                              className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] px-1.5 py-0.5 rounded"
                              style={{ color: 'rgba(100,116,139,0.5)', border: '1px solid rgba(255,255,255,0.07)' }}>
                              atualizar
                            </button>
                          )}
                        </div>
                      )}

                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] px-2 py-0.5 rounded-full"
                          style={{ background: `${color}12`, color, border: `1px solid ${color}25` }}>
                          {STATUS_LABELS[status]}
                        </span>
                        <span className="text-[10px]" style={{ color: 'rgba(100,116,139,0.35)' }}>{pct.toFixed(0)}%</span>
                        {isAuto && (
                          <span className="text-[10px]" style={{ color: 'rgba(100,116,139,0.25)' }}>· automático</span>
                        )}
                      </div>
                      {g.due_date && (() => {
                        const days = Math.ceil((new Date(g.due_date).getTime() - Date.now()) / 86400000);
                        const overdue = days < 0;
                        const urgent = days >= 0 && days <= 14;
                        const dueColor = overdue ? '#f87171' : urgent ? '#f59e0b' : 'rgba(100,116,139,0.4)';
                        return (
                          <div className="flex items-center gap-1 mt-1.5">
                            <Clock size={9} style={{ color: dueColor }} />
                            <span className="text-[10px]" style={{ color: dueColor }}>
                              {overdue
                                ? `Prazo encerrado há ${Math.abs(days)} dia${Math.abs(days) > 1 ? 's' : ''}`
                                : days === 0
                                ? 'Prazo: hoje'
                                : `${days} dia${days > 1 ? 's' : ''} restante${days > 1 ? 's' : ''}`}
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal */}
        {modal !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)' }}>
            <div className="w-full max-w-md rounded-2xl overflow-hidden" style={{ background: '#0d0d22', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <h3 className="text-base font-semibold text-white">{modal?._idx !== undefined ? 'Editar meta' : 'Nova meta'}</h3>
                <button onClick={() => setModal(null)} style={{ color: 'rgba(100,116,139,0.5)' }}><X size={18} /></button>
              </div>
              <div className="px-6 py-5 space-y-4">
                <div>
                  <label style={labelStyle}>Tipo de métrica</label>
                  <select value={form.metric}
                    onChange={e => {
                      const preset = PRESET_METRICS.find(m => m.metric === e.target.value);
                      setForm(f => ({ ...f, metric: e.target.value, label: preset?.label || f.label, unit: preset?.unit || f.unit, icon: preset?.icon || 'target' }));
                    }}
                    className={inputCls} style={{ ...inputStyle, cursor: 'pointer' }}>
                    {PRESET_METRICS.map(m => <option key={m.metric} value={m.metric}>{m.label}</option>)}
                    <option value="custom">Personalizada</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Nome da meta</label>
                  <input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                    placeholder="Ex: Seguidores no Instagram" className={inputCls} style={inputStyle} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label style={labelStyle}>Meta (valor alvo)</label>
                    <input type="number" value={form.target} onChange={e => setForm(f => ({ ...f, target: e.target.value }))}
                      placeholder="0" className={inputCls} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Unidade</label>
                    <input value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                      placeholder="posts, leads, R$…" className={inputCls} style={inputStyle} />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Ícone</label>
                  <div className="flex gap-2">
                    {Object.entries(ICONS).map(([key, Ic]: [string, any]) => (
                      <button key={key} onClick={() => setForm(f => ({ ...f, icon: key }))}
                        className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
                        style={{ background: form.icon === key ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.04)', border: `1px solid ${form.icon === key ? 'rgba(59,130,246,0.35)' : 'rgba(255,255,255,0.06)'}` }}>
                        <Ic size={14} style={{ color: form.icon === key ? '#60a5fa' : 'rgba(100,116,139,0.5)' }} />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Prazo</label>
                  <input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                    className={inputCls} style={{ ...inputStyle, colorScheme: 'dark' }} />
                </div>
              </div>
              <div className="flex items-center justify-between px-6 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <div>
                  {modal?._idx !== undefined && (
                    <button onClick={() => { removeGoal(modal._idx); setModal(null); }}
                      className="text-xs px-3 py-1.5 rounded-lg"
                      style={{ color: 'rgba(239,68,68,0.6)', border: '1px solid rgba(239,68,68,0.15)' }}>
                      Remover
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setModal(null)} className="text-xs px-4 py-2 rounded-xl"
                    style={{ color: 'rgba(100,116,139,0.6)' }}>Cancelar</button>
                  <button onClick={saveModal} disabled={saving || !form.label.trim() || !form.target}
                    className="text-xs px-5 py-2 rounded-xl font-medium text-white disabled:opacity-40"
                    style={{ background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.3)' }}>
                    {saving ? 'Salvando…' : 'Salvar'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  function PageConteudos() {
    const MONTHS_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    const DAYS_PT = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

    const [contentTab, setContentTab] = useState<'aprovar' | 'aprovados'>('aprovar');
    const [viewMode, setViewMode] = useState<'lista' | 'calendario' | 'previa'>('lista');
    const [batchIdx, setBatchIdx] = useState<number>(() => {
      if (batches.length === 0) return 0;
      const now = new Date();
      const idx = batches.findIndex(b => b.month === now.getMonth() + 1 && b.year === now.getFullYear());
      return idx >= 0 ? idx : batches.length - 1;
    });

    // Consume init filter once
    useEffect(() => { setConteudosInitFilter('all'); }, []);

    const selectedBatch = batches[batchIdx] ?? null;
    const batchPieces = selectedBatch
      ? pieces.filter(p => (p as any).batch_id === selectedBatch.id)
      : pieces;

    const approvalPieces = batchPieces.filter(p =>
      ['aguardando_aprovacao', 'ajuste_solicitado'].includes(p.status)
    );
    const approvedPieces = [...batchPieces]
      .filter(p => ['aprovado', 'agendado', 'publicado'].includes(p.status))
      .sort((a, b) => {
        const da = a.scheduled_date || a.created_at || '';
        const db2 = b.scheduled_date || b.created_at || '';
        return da < db2 ? 1 : da > db2 ? -1 : 0;
      });

    const displayed = contentTab === 'aprovar' ? approvalPieces : approvedPieces;

    const displayedApproved = selectedBatch?.approved_count ?? batchPieces.filter(p => ['aprovado','agendado','publicado'].includes(p.status)).length;
    const displayedTotal = selectedBatch?.post_count ?? batchPieces.length;
    const allApproved = displayedTotal > 0 && displayedApproved >= displayedTotal;

    // Calendar helpers
    const calYear  = selectedBatch?.year  ?? new Date().getFullYear();
    const calMonth = selectedBatch?.month ?? (new Date().getMonth() + 1);
    const firstDay    = new Date(calYear, calMonth - 1, 1).getDay();
    const daysInMonth = new Date(calYear, calMonth, 0).getDate();
    const postsByDay: Record<number, ContentPiece[]> = {};
    displayed.forEach(p => {
      if (!p.scheduled_date) return;
      const d = new Date(p.scheduled_date);
      if (d.getFullYear() === calYear && d.getMonth() + 1 === calMonth) {
        const day = d.getDate();
        if (!postsByDay[day]) postsByDay[day] = [];
        postsByDay[day].push(p);
      }
    });

    /* ── Views ── */
    function ListView() {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {displayed.map(p => {
            const borderColor = p.status === 'aguardando_aprovacao'
              ? 'rgba(245,158,11,0.25)'
              : p.status === 'ajuste_solicitado'
              ? 'rgba(248,113,113,0.25)'
              : 'rgba(255,255,255,0.04)';
            return (
              <div key={p.id} onClick={() => openDetail(p)}
                className="flex gap-3 p-3 rounded-2xl cursor-pointer transition-all duration-200 hover:brightness-110"
                style={{ background: 'linear-gradient(145deg,#0d0d22,#0f0f28)', border: `1px solid ${borderColor}` }}>
                <div className="relative flex-shrink-0 rounded-xl overflow-hidden" style={{ width: 64, height: 80, background: 'rgba(59,130,246,0.05)' }}>
                  {getPostThumbnail(p)
                    ? <img src={getPostThumbnail(p)!} alt={p.title} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center"><FileImage size={16} style={{ color: 'rgba(59,130,246,0.2)' }} /></div>}
                  {p.type === 'carrossel' && <span className="absolute top-1 right-1"><IgCarouselIcon size={10} /></span>}
                  {p.type === 'reels'    && <span className="absolute top-1 right-1"><IgReelsIcon size={10} /></span>}
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5">
                  <p className="text-sm font-medium text-white truncate">{p.title || 'Sem título'}</p>
                  {p.scheduled_date && (
                    <p className="flex items-center gap-1 text-xs" style={{ color: 'rgba(100,116,139,0.5)' }}>
                      <Calendar size={10} />{format(new Date(p.scheduled_date), "d 'de' MMM 'às' HH:mm", { locale: ptBR })}
                    </p>
                  )}
                  <StatusBadge status={p.status} />
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    function CalendarioView() {
      const cells: (number | null)[] = [];
      for (let i = 0; i < firstDay; i++) cells.push(null);
      for (let d = 1; d <= daysInMonth; d++) cells.push(d);
      const today = new Date();
      const noDate = displayed.filter(p => !p.scheduled_date);

      const TYPE_LABEL: Record<string, { label: string; color: string }> = {
        carrossel: { label: 'CAR', color: '#a78bfa' },
        reels:     { label: 'REE', color: '#f472b6' },
        story:     { label: 'STR', color: '#fb923c' },
        post:      { label: 'POST', color: '#60a5fa' },
      };

      return (
        <div>
          <div className="grid grid-cols-7 mb-1">
            {DAYS_PT.map(d => (
              <div key={d} className="text-center text-[10px] font-medium py-1.5" style={{ color: 'rgba(100,116,139,0.4)' }}>{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((day, i) => {
              const posts = day ? (postsByDay[day] || []) : [];
              const isToday = day !== null && calYear === today.getFullYear() && calMonth === today.getMonth() + 1 && day === today.getDate();
              return (
                <div key={i} className="rounded-lg"
                  style={{ minHeight: 90, background: day ? 'rgba(255,255,255,0.02)' : 'transparent', border: day ? (isToday ? '1px solid rgba(59,130,246,0.4)' : '1px solid rgba(255,255,255,0.04)') : 'none' }}>
                  {day && (
                    <>
                      <div className="px-1.5 pt-1 pb-0.5">
                        <span className="text-[10px] font-semibold" style={{ color: isToday ? '#60a5fa' : 'rgba(148,163,184,0.45)' }}>{day}</span>
                      </div>
                      <div className="px-1 pb-1 space-y-0.5">
                        {posts.slice(0, 3).map(p => {
                          const st = STATUS_CFG[p.status as ContentStatus] ?? STATUS_CFG['em_criacao'];
                          const tp = TYPE_LABEL[p.type] ?? TYPE_LABEL['post'];
                          const time = p.scheduled_date ? format(new Date(p.scheduled_date), 'HH:mm') : null;
                          return (
                            <button key={p.id} onClick={() => openDetail(p)}
                              className="w-full text-left px-1.5 py-1 rounded transition-all hover:brightness-125"
                              style={{ background: `${st.color}12`, border: `1px solid ${st.color}30` }}>
                              <div className="flex items-center gap-1 min-w-0">
                                <span className="text-[7px] font-bold px-0.5 py-px rounded flex-shrink-0 leading-none"
                                  style={{ color: tp.color, background: `${tp.color}20` }}>
                                  {tp.label}
                                </span>
                                <span className="text-[9px] font-medium text-white truncate flex-1 min-w-0 leading-none">{p.title}</span>
                                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: st.color }} />
                              </div>
                              {time && (
                                <div className="text-[8px] mt-0.5 leading-none" style={{ color: 'rgba(100,116,139,0.55)' }}>{time}</div>
                              )}
                            </button>
                          );
                        })}
                        {posts.length > 3 && (
                          <div className="text-center text-[8px] py-0.5" style={{ color: 'rgba(100,116,139,0.4)' }}>+{posts.length - 3}</div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
          {noDate.length > 0 && (
            <div className="mt-4 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <p className="text-[11px] mb-2" style={{ color: 'rgba(100,116,139,0.4)' }}>Sem data definida ({noDate.length})</p>
              <div className="flex gap-2 flex-wrap">
                {noDate.map(p => {
                  const st = STATUS_CFG[p.status as ContentStatus] ?? STATUS_CFG['em_criacao'];
                  const tp = TYPE_LABEL[p.type] ?? TYPE_LABEL['post'];
                  return (
                    <button key={p.id} onClick={() => openDetail(p)}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all hover:brightness-110"
                      style={{ background: `${st.color}10`, color: 'rgba(148,163,184,0.7)', border: `1px solid ${st.color}25` }}>
                      <span className="text-[8px] font-bold px-1 rounded" style={{ color: tp.color, background: `${tp.color}20` }}>{tp.label}</span>
                      <span className="truncate max-w-[110px]">{p.title || 'Sem título'}</span>
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: st.color }} />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      );
    }

    function PreviaView() {
      return (
        <div className="grid grid-cols-3 gap-0.5">
          {displayed.map((p, idx) => {
            const cfg = STATUS_CFG[p.status as ContentStatus] ?? STATUS_CFG['em_criacao'];
            return (
              <div key={p.id} onClick={() => openDetail(p)}
                className="relative cursor-pointer overflow-hidden group"
                style={{ aspectRatio: '1080/1350', background: '#0d0d22' }}>
                {getPostThumbnail(p)
                  ? <img src={getPostThumbnail(p)!} alt={p.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                  : <div className="w-full h-full flex items-center justify-center"><FileImage size={20} style={{ color: 'rgba(59,130,246,0.2)' }} /></div>}
                <span className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                  style={{ background: cfg.color, boxShadow: `0 0 6px ${cfg.color}88` }}>
                  {idx + 1}
                </span>
                {p.type === 'carrossel' && <span className="absolute top-1.5 right-1.5"><IgCarouselIcon size={13} /></span>}
                {p.type === 'reels'    && <span className="absolute top-1.5 right-1.5"><IgReelsIcon size={13} /></span>}
              </div>
            );
          })}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-white mb-1">Conteúdos</h2>
            <p className="text-sm" style={{ color: 'rgba(100,116,139,0.5)' }}>
              {pendingCount > 0 ? `${pendingCount} post${pendingCount > 1 ? 's' : ''} aguardando aprovação` : 'Feed e aprovações'}
            </p>
          </div>
          {/* View toggle */}
          <div className="flex gap-0.5 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
            {([
              { id: 'lista',      icon: List,        label: 'Lista'      },
              { id: 'calendario', icon: CalendarDays, label: 'Calendário' },
              { id: 'previa',     icon: Grid3x3,      label: 'Prévia'     },
            ] as const).map(v => (
              <button key={v.id} onClick={() => setViewMode(v.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={viewMode === v.id
                  ? { background: 'rgba(59,130,246,0.15)', color: '#93c5fd', border: '1px solid rgba(59,130,246,0.2)' }
                  : { color: 'rgba(100,116,139,0.55)' }}>
                <v.icon size={13} />{v.label}
              </button>
            ))}
          </div>
        </div>

        {/* Resumo rápido */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { label: 'Publicados / Agendados', value: pieces.filter(p => ['publicado','agendado'].includes(p.status)).length, color: '#34d399' },
            { label: 'Aprovados',              value: pieces.filter(p => p.status === 'aprovado').length,                    color: '#60a5fa' },
            { label: 'Aguardando aprovação',   value: pieces.filter(p => p.status === 'aguardando_aprovacao').length,        color: '#f59e0b' },
            { label: 'Pedidos de ajuste',      value: pieces.filter(p => p.status === 'ajuste_solicitado').length,           color: '#f97316' },
          ].map(m => (
            <div key={m.label} className="rounded-xl px-3 py-3"
              style={{ background: 'linear-gradient(145deg,#0d0d22,#0f0f28)', border: '1px solid rgba(255,255,255,0.04)' }}>
              <p className="text-xl font-bold mb-0.5" style={{ color: m.color }}>{m.value}</p>
              <p className="text-[10px] leading-tight" style={{ color: 'rgba(100,116,139,0.45)' }}>{m.label}</p>
            </div>
          ))}
        </div>

        {/* Month navigator */}
        {batches.length > 0 && (
          <div className="flex items-center gap-2">
            <button onClick={() => setBatchIdx(i => Math.max(0, i - 1))} disabled={batchIdx === 0}
              className="p-1.5 rounded-lg transition-all disabled:opacity-25"
              style={{ color: 'rgba(148,163,184,0.7)', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <ChevronLeft size={14} />
            </button>
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl flex-1 justify-center"
              style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)' }}>
              <span className="text-sm font-semibold text-white">
                {selectedBatch ? `${MONTHS_PT[selectedBatch.month - 1]} ${selectedBatch.year}` : '—'}
              </span>
              {displayedTotal > 0 && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: allApproved ? 'rgba(16,185,129,0.15)' : 'rgba(59,130,246,0.15)', color: allApproved ? '#10b981' : '#60a5fa' }}>
                  {displayedApproved}/{displayedTotal}
                </span>
              )}
            </div>
            <button onClick={() => setBatchIdx(i => Math.min(batches.length - 1, i + 1))} disabled={batchIdx === batches.length - 1}
              className="p-1.5 rounded-lg transition-all disabled:opacity-25"
              style={{ color: 'rgba(148,163,184,0.7)', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <ChevronRight size={14} />
            </button>
          </div>
        )}

        {/* Content tabs */}
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <button onClick={() => setContentTab('aprovar')}
            className="flex-1 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-2"
            style={contentTab === 'aprovar'
              ? { background: 'rgba(245,158,11,0.12)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.2)' }
              : { color: 'rgba(100,116,139,0.5)' }}>
            Para aprovar
            {approvalPieces.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>
                {approvalPieces.length}
              </span>
            )}
          </button>
          <button onClick={() => setContentTab('aprovados')}
            className="flex-1 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-2"
            style={contentTab === 'aprovados'
              ? { background: 'rgba(16,185,129,0.1)', color: '#34d399', border: '1px solid rgba(16,185,129,0.2)' }
              : { color: 'rgba(100,116,139,0.5)' }}>
            Aprovados
            {approvedPieces.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>
                {approvedPieces.length}
              </span>
            )}
          </button>
        </div>

        {/* Content area */}
        {displayed.length === 0 ? (
          <div className="text-center py-24">
            <FileImage size={40} className="mx-auto mb-4" style={{ color: 'rgba(100,116,139,0.15)' }} />
            <p className="text-white font-medium mb-1">
              {contentTab === 'aprovar' ? 'Nenhuma aprovação pendente' : 'Nenhum post aprovado neste mês'}
            </p>
          </div>
        ) : viewMode === 'lista' ? (
          <ListView />
        ) : viewMode === 'calendario' ? (
          <CalendarioView />
        ) : (
          <PreviaView />
        )}
      </div>
    );
  }

  function PageTrafico() {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold text-white mb-1">Tráfego Pago</h2>
          <p className="text-sm" style={{ color: 'rgba(100,116,139,0.5)' }}>Campanhas e criativos</p>
        </div>
        {campaigns.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total Investido', value: fmtR(totalSpent) },
              { label: 'Impressões', value: fmtN(totalImpressions) },
              { label: 'Conversões', value: fmtN(totalConversions) },
              { label: 'ROAS Geral', value: overallRoas > 0 ? `${overallRoas.toFixed(1)}x` : '—' },
            ].map(m => (
              <div key={m.label} className="rounded-xl px-4 py-3" style={{ background: 'linear-gradient(145deg,#0d0d22,#0f0f28)', border: '1px solid rgba(255,255,255,0.04)' }}>
                <p className="text-xl font-bold text-white">{m.value}</p>
                <p className="text-[11px] mt-1" style={{ color: 'rgba(100,116,139,0.45)' }}>{m.label}</p>
              </div>
            ))}
          </div>
        )}
        {campaigns.length === 0 ? (
          <div className="text-center py-24">
            <Megaphone size={40} className="mx-auto mb-4" style={{ color: 'rgba(100,116,139,0.15)' }} />
            <p className="text-white font-medium mb-1">Nenhuma campanha ainda</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {campaigns.map(c => {
              const platform = PLATFORM_CFG[c.platform] || { label: c.platform, color: '#60a5fa' };
              const statusCfg = CAMPAIGN_STATUS_CFG[c.status] || CAMPAIGN_STATUS_CFG.rascunho;
              const progress = c.budget > 0 ? Math.min((c.spent / c.budget) * 100, 100) : 0;
              const roasVal = c.spent > 0 ? (c.revenue / c.spent) : 0;
              return (
                <div key={c.id} className="rounded-2xl p-5" style={{ background: 'linear-gradient(145deg,#0d0d22,#0f0f28)', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: `${platform.color}15`, color: platform.color }}>
                      {platform.label}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: statusCfg.bg, color: statusCfg.color }}>{statusCfg.label}</span>
                  </div>
                  <p className="text-sm font-semibold text-white mb-1 truncate">{c.name}</p>
                  {(c.start_date || c.end_date) && (
                    <p className="text-xs mb-4" style={{ color: 'rgba(100,116,139,0.4)' }}>
                      {c.start_date && format(new Date(c.start_date), "d MMM", { locale: ptBR })}
                      {c.start_date && c.end_date && ' → '}
                      {c.end_date && format(new Date(c.end_date), "d MMM yyyy", { locale: ptBR })}
                    </p>
                  )}
                  <div className="mb-4">
                    <div className="flex justify-between text-xs mb-1.5">
                      <span style={{ color: 'rgba(100,116,139,0.5)' }}>Investido</span>
                      <span className="text-white font-medium">{fmtR(c.spent)} <span style={{ color: 'rgba(100,116,139,0.4)' }}>/ {fmtR(c.budget)}</span></span>
                    </div>
                    <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                      <div className="h-full rounded-full" style={{ width: `${progress}%`, background: progress > 90 ? '#f97316' : '#3b82f6' }} />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { icon: Eye, label: 'Impressões', value: fmtN(c.impressions) },
                      { icon: MousePointer, label: 'Cliques', value: fmtN(c.clicks) },
                      { icon: TrendingUp, label: 'Conv.', value: fmtN(c.conversions) },
                      { icon: BarChart3, label: 'ROAS', value: roasVal > 0 ? `${roasVal.toFixed(1)}x` : '—' },
                    ].map(m => (
                      <div key={m.label} className="text-center">
                        <m.icon size={11} className="mx-auto mb-1" style={{ color: 'rgba(100,116,139,0.3)' }} />
                        <p className="text-xs font-semibold text-white">{m.value}</p>
                        <p className="text-[9px]" style={{ color: 'rgba(100,116,139,0.4)' }}>{m.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  function PageFeed() {
    return (
      <div className="space-y-6">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-white mb-1">Prévia do Feed</h2>
            <p className="text-sm" style={{ color: 'rgba(100,116,139,0.5)' }}>Como ficará no Instagram</p>
          </div>
          <button onClick={() => setPhoneFrame(f => !f)} className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg"
            style={{ background: 'rgba(255,255,255,0.03)', color: phoneFrame ? '#60a5fa' : 'rgba(100,116,139,0.5)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <Smartphone size={12} /> {phoneFrame ? 'Sem moldura' : 'Com moldura'}
          </button>
        </div>
        <div className="flex justify-center">
          {phoneFrame ? (
            <div style={{ width: '375px' }}>
              <div className="rounded-[44px] overflow-hidden"
                style={{ background: '#000', border: '10px solid #1a1a2e', boxShadow: '0 40px 80px rgba(0,0,0,0.8)' }}>
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
            <div className="w-full max-w-sm rounded-2xl overflow-hidden" style={{ background: '#000', border: '1px solid rgba(255,255,255,0.06)' }}>
              <FeedGrid />
            </div>
          )}
        </div>
      </div>
    );
  }

  const crmInputCls = "w-full px-3 py-2 rounded-lg text-sm text-white bg-transparent outline-none focus:ring-1 focus:ring-blue-500/50";
  const crmInputStyle = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' };
  const crmSelectStyle = { background: '#0d0d22', border: '1px solid rgba(255,255,255,0.08)', color: 'white' };

  function CrmSpinner() {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'rgba(59,130,246,0.3)', borderTopColor: '#3b82f6' }} />
      </div>
    );
  }

  function PageProdutos() {
    const [products, setProducts] = useState<any[]>([]);
    const [loadingProds, setLoadingProds] = useState(true);
    const [view, setView] = useState<'kanban' | 'lista'>('kanban');
    const [modal, setModal] = useState<any>(null);
    const [modalTab, setModalTab] = useState<'cadastro' | 'proposta'>('cadastro');
    const [form, setForm] = useState({ name: '', price: '', unit: 'un', category: '', offer_type: 'alicerce', active: true, target_audience: '', promise: '', deliverables: '' });
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState<number | null>(null);

    useEffect(() => {
      clientPortalApi.products(cid).then(r => { setProducts(r.data); setLoadingProds(false); });
    }, []);

    const openNew = () => {
      setForm({ name: '', price: '', unit: 'un', category: '', offer_type: 'alicerce', active: true, target_audience: '', promise: '', deliverables: '' });
      setModalTab('cadastro');
      setModal({});
    };

    const openEdit = (p: any) => {
      setForm({ name: p.name, price: String(p.price ?? ''), unit: p.unit ?? 'un', category: p.category ?? '', offer_type: p.offer_type ?? 'alicerce', active: !!p.active, target_audience: p.target_audience ?? '', promise: p.promise ?? '', deliverables: p.deliverables ?? '' });
      setModalTab('cadastro');
      setModal(p);
    };

    const save = async () => {
      setSaving(true);
      const payload = { ...form, price: parseFloat(form.price) || 0 };
      if (modal?.id) {
        const r = await clientPortalApi.updateProduct(cid, modal.id, payload);
        setProducts(prev => prev.map(p => p.id === modal.id ? r.data : p));
      } else {
        const r = await clientPortalApi.createProduct(cid, payload);
        setProducts(prev => [...prev, r.data]);
      }
      setSaving(false);
      setModal(null);
    };

    const remove = async (id: number) => {
      setDeleting(id);
      await clientPortalApi.deleteProduct(cid, id);
      setProducts(prev => prev.filter(p => p.id !== id));
      setDeleting(null);
    };

    const fmtPrice = (v: number) => v > 0 ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v) : '—';

    const OFFER_TYPES = [
      { id: 'entrada',        label: 'Entrada',        color: '#34d399', desc: 'Oferta acessível, porta de entrada do cliente' },
      { id: 'alicerce',       label: 'Alicerce',       color: '#60a5fa', desc: 'Produto principal, entrega de valor central' },
      { id: 'acompanhamento', label: 'Acompanhamento', color: '#a78bfa', desc: 'Recorrência e continuidade do relacionamento' },
    ] as const;

    const inputCls = 'w-full rounded-xl px-3 py-2.5 text-sm outline-none bg-transparent';
    const inputStyle = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(226,232,240,0.9)' };
    const labelStyle = { color: 'rgba(100,116,139,0.55)', fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' as const, marginBottom: 6, display: 'block' };

    const activeProducts = products.filter(p => p.active);

    return (
      <div className="flex flex-col gap-5" style={{ minHeight: 'calc(100vh - 120px)' }}>
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-2xl font-semibold text-white mb-0.5">Esteira de Ofertas</h2>
            <p className="text-sm" style={{ color: 'rgba(100,116,139,0.45)' }}>
              Toda boa estratégia começa com uma oferta bem estruturada
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex p-0.5 rounded-xl gap-0.5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              {([
                { id: 'kanban', icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="1" width="4" height="12" rx="1" fill="currentColor" opacity="0.9"/><rect x="6" y="1" width="4" height="8" rx="1" fill="currentColor" opacity="0.9"/><rect x="11" y="1" width="2" height="5" rx="1" fill="currentColor" opacity="0.5"/></svg> },
                { id: 'lista',  icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="2" width="12" height="2" rx="1" fill="currentColor"/><rect x="1" y="6" width="12" height="2" rx="1" fill="currentColor"/><rect x="1" y="10" width="8" height="2" rx="1" fill="currentColor"/></svg> },
              ] as const).map(v => (
                <button key={v.id} onClick={() => setView(v.id)}
                  className="px-3 py-1.5 rounded-lg transition-all"
                  style={{
                    background: view === v.id ? 'rgba(255,255,255,0.08)' : 'transparent',
                    color: view === v.id ? 'rgba(226,232,240,0.9)' : 'rgba(100,116,139,0.45)',
                  }}>
                  {v.icon}
                </button>
              ))}
            </div>
            {isAdmin && (
              <button onClick={openNew}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', color: 'rgba(226,232,240,0.8)' }}>
                <Plus size={14} /> Novo produto
              </button>
            )}
          </div>
        </div>

        {loadingProds ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : view === 'kanban' ? (
          /* ── Kanban ── */
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
            {OFFER_TYPES.map(ot => {
              const cols = activeProducts.filter(p => p.offer_type === ot.id);
              return (
                <div key={ot.id} className="flex flex-col rounded-2xl overflow-hidden"
                  style={{ border: `1px solid ${ot.color}20`, background: '#0b0b1e' }}>
                  <div className="px-4 py-3 flex items-center gap-2 flex-shrink-0"
                    style={{ background: `${ot.color}08`, borderBottom: `1px solid ${ot.color}15` }}>
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ background: ot.color, boxShadow: `0 0 5px ${ot.color}` }} />
                    <span className="text-[11px] font-bold tracking-widest uppercase flex-1" style={{ color: ot.color }}>{ot.label}</span>
                    <span className="text-[10px] w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ background: `${ot.color}18`, color: ot.color }}>{cols.length}</span>
                  </div>
                  <div className="flex-1 p-3 space-y-2">
                    {cols.length === 0 ? (
                      <div className="h-full min-h-[120px] flex flex-col items-center justify-center gap-3">
                        <p className="text-xs" style={{ color: 'rgba(100,116,139,0.2)' }}>Nenhum produto aqui</p>
                        {isAdmin && (
                          <button onClick={() => { setForm(f => ({ ...f, offer_type: ot.id })); setModalTab('cadastro'); setModal({}); }}
                            className="text-[11px] px-3 py-1.5 rounded-lg"
                            style={{ color: ot.color, border: `1px solid ${ot.color}30`, background: `${ot.color}08` }}>
                            + Adicionar
                          </button>
                        )}
                      </div>
                    ) : cols.map(p => (
                      <div key={p.id} className="group rounded-xl px-3 py-3 transition-all"
                        style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)' }}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = `${ot.color}30`)}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)')}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white leading-snug truncate">{p.name}</p>
                            {p.category && <p className="text-[10px] mt-0.5" style={{ color: 'rgba(100,116,139,0.4)' }}>{p.category}</p>}
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <span className="text-sm font-semibold" style={{ color: ot.color }}>{fmtPrice(p.price)}</span>
                            {isAdmin && (
                              <button onClick={() => openEdit(p)}
                                className="opacity-0 group-hover:opacity-100 p-1 rounded-lg transition-opacity"
                                style={{ color: 'rgba(100,116,139,0.5)' }}>
                                <Pencil size={11} />
                              </button>
                            )}
                          </div>
                        </div>
                        {p.promise && <p className="text-[11px] mt-2 leading-relaxed line-clamp-2" style={{ color: 'rgba(148,163,184,0.4)' }}>{p.promise}</p>}
                        {p.target_audience && (
                          <div className="flex items-center gap-1 mt-2">
                            <Users size={9} style={{ color: 'rgba(100,116,139,0.3)' }} />
                            <span className="text-[10px] truncate" style={{ color: 'rgba(100,116,139,0.3)' }}>{p.target_audience}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ── Lista ── */
          <div className="flex flex-col gap-2 flex-1">
            {activeProducts.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-20 rounded-2xl"
                style={{ border: '1px dashed rgba(255,255,255,0.06)' }}>
                <Briefcase size={36} className="mb-3" style={{ color: 'rgba(100,116,139,0.15)' }} />
                <p className="text-sm font-medium text-white mb-1">Nenhum produto cadastrado</p>
                {isAdmin && <button onClick={openNew} className="text-xs mt-2 px-4 py-2 rounded-xl"
                  style={{ background: 'rgba(59,130,246,0.1)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.2)' }}>
                  + Adicionar primeiro produto
                </button>}
              </div>
            ) : OFFER_TYPES.map(ot => {
              const group = activeProducts.filter(p => p.offer_type === ot.id);
              if (group.length === 0) return null;
              return (
                <div key={ot.id}>
                  <div className="flex items-center gap-2 px-1 mb-2">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: ot.color }} />
                    <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: ot.color }}>{ot.label}</span>
                    <div className="flex-1 h-px" style={{ background: `${ot.color}15` }} />
                  </div>
                  <div className="space-y-1.5 mb-4">
                    {group.map(p => (
                      <div key={p.id} className="group rounded-xl px-5 py-4 flex items-center gap-4 transition-all"
                        style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)' }}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = `${ot.color}25`)}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)')}>
                        {/* Name + category */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{p.name}</p>
                          {p.category && <p className="text-[11px]" style={{ color: 'rgba(100,116,139,0.45)' }}>{p.category}</p>}
                        </div>
                        {/* Promise */}
                        {p.promise && (
                          <p className="hidden md:block flex-1 text-xs leading-relaxed line-clamp-1"
                            style={{ color: 'rgba(148,163,184,0.45)', maxWidth: 300 }}>{p.promise}</p>
                        )}
                        {/* Para quem */}
                        {p.target_audience && (
                          <div className="hidden lg:flex items-center gap-1.5 flex-shrink-0" style={{ maxWidth: 180 }}>
                            <Users size={10} style={{ color: 'rgba(100,116,139,0.35)' }} />
                            <span className="text-[11px] truncate" style={{ color: 'rgba(100,116,139,0.35)' }}>{p.target_audience}</span>
                          </div>
                        )}
                        {/* Price */}
                        <span className="text-sm font-bold flex-shrink-0" style={{ color: ot.color }}>{fmtPrice(p.price)}</span>
                        {/* Edit */}
                        {isAdmin && (
                          <button onClick={() => openEdit(p)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition-opacity flex-shrink-0"
                            style={{ color: 'rgba(100,116,139,0.5)', background: 'rgba(255,255,255,0.04)' }}>
                            <Pencil size={12} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Inativos */}
        {isAdmin && products.filter(p => !p.active).length > 0 && (
          <div>
            <p className="text-[10px] font-semibold tracking-widest uppercase mb-3"
              style={{ color: 'rgba(100,116,139,0.25)' }}>Inativos</p>
            <div className="space-y-1.5">
              {products.filter(p => !p.active).map(p => (
                <div key={p.id} className="group flex items-center gap-3 px-4 py-3 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <span className="flex-1 text-sm line-through" style={{ color: 'rgba(100,116,139,0.3)' }}>{p.name}</span>
                  <button onClick={() => openEdit(p)}
                    className="opacity-0 group-hover:opacity-100 text-[11px] px-2 py-1 rounded-lg transition-opacity"
                    style={{ color: 'rgba(100,116,139,0.5)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    Reativar
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modal */}
        {modal !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)' }}>
            <div className="w-full max-w-lg rounded-2xl overflow-hidden" style={{ background: '#0d0d22', border: '1px solid rgba(255,255,255,0.08)' }}>
              {/* Modal header */}
              <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <h3 className="text-base font-semibold text-white">{modal?.id ? 'Editar produto' : 'Novo produto'}</h3>
                <button onClick={() => setModal(null)} style={{ color: 'rgba(100,116,139,0.5)' }}><X size={18} /></button>
              </div>

              {/* Modal tabs */}
              <div className="flex px-6 pt-4 gap-1" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                {(['cadastro', 'proposta'] as const).map(t => (
                  <button key={t} onClick={() => setModalTab(t)}
                    className="px-4 py-2 text-xs font-semibold rounded-t-lg capitalize transition-colors"
                    style={{
                      color: modalTab === t ? '#60a5fa' : 'rgba(100,116,139,0.5)',
                      background: modalTab === t ? 'rgba(59,130,246,0.08)' : 'transparent',
                      borderBottom: modalTab === t ? '2px solid #60a5fa' : '2px solid transparent',
                    }}>
                    {t === 'cadastro' ? 'Cadastro' : 'Proposta'}
                  </button>
                ))}
              </div>

              {/* Modal body */}
              <div className="px-6 py-5 space-y-4">
                {modalTab === 'cadastro' ? (
                  <>
                    <div>
                      <label style={labelStyle}>Nome do produto *</label>
                      <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                        placeholder="Ex: Consultoria Mensal" className={inputCls} style={inputStyle} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label style={labelStyle}>Preço (R$)</label>
                        <input value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                          type="number" placeholder="0,00" className={inputCls} style={inputStyle} />
                      </div>
                      <div>
                        <label style={labelStyle}>Unidade</label>
                        <input value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                          placeholder="un, mês, hora…" className={inputCls} style={inputStyle} />
                      </div>
                    </div>
                    <div>
                      <label style={labelStyle}>Categoria</label>
                      <input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                        placeholder="Ex: Consultoria, Produto Digital…" className={inputCls} style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Posição na esteira</label>
                      <div className="grid grid-cols-3 gap-2">
                        {OFFER_TYPES.map(ot => (
                          <button key={ot.id} onClick={() => setForm(f => ({ ...f, offer_type: ot.id }))}
                            className="py-2.5 rounded-xl text-xs font-semibold transition-all"
                            style={{
                              background: form.offer_type === ot.id ? `${ot.color}15` : 'rgba(255,255,255,0.03)',
                              border: `1px solid ${form.offer_type === ot.id ? ot.color + '40' : 'rgba(255,255,255,0.06)'}`,
                              color: form.offer_type === ot.id ? ot.color : 'rgba(100,116,139,0.5)',
                            }}>
                            {ot.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button onClick={() => setForm(f => ({ ...f, active: !f.active }))}
                        className="w-10 h-5 rounded-full transition-all flex-shrink-0 relative"
                        style={{ background: form.active ? 'rgba(52,211,153,0.4)' : 'rgba(255,255,255,0.08)', border: `1px solid ${form.active ? '#34d399' : 'rgba(255,255,255,0.1)'}` }}>
                        <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
                          style={{ left: form.active ? 'calc(100% - 18px)' : '2px' }} />
                      </button>
                      <span className="text-sm" style={{ color: 'rgba(148,163,184,0.7)' }}>Produto ativo</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label style={labelStyle}>Para quem é</label>
                      <textarea value={form.target_audience} onChange={e => setForm(f => ({ ...f, target_audience: e.target.value }))}
                        rows={2} placeholder="Descreva o perfil ideal de cliente para este produto…"
                        className={inputCls + ' resize-none'} style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Promessa</label>
                      <textarea value={form.promise} onChange={e => setForm(f => ({ ...f, promise: e.target.value }))}
                        rows={3} placeholder="Qual transformação ou resultado este produto entrega?"
                        className={inputCls + ' resize-none'} style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>O que entrega</label>
                      <textarea value={form.deliverables} onChange={e => setForm(f => ({ ...f, deliverables: e.target.value }))}
                        rows={3} placeholder="Liste o que está incluído: sessões, materiais, acessos…"
                        className={inputCls + ' resize-none'} style={inputStyle} />
                    </div>
                  </>
                )}
              </div>

              {/* Modal footer */}
              <div className="flex items-center justify-between px-6 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <div>
                  {modal?.id && (
                    <button onClick={() => { remove(modal.id); setModal(null); }} disabled={deleting === modal.id}
                      className="text-xs px-3 py-1.5 rounded-lg"
                      style={{ color: 'rgba(239,68,68,0.6)', border: '1px solid rgba(239,68,68,0.15)' }}>
                      {deleting === modal.id ? 'Removendo…' : 'Excluir'}
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setModal(null)} className="text-xs px-4 py-2 rounded-xl"
                    style={{ color: 'rgba(100,116,139,0.6)' }}>Cancelar</button>
                  <button onClick={save} disabled={saving || !form.name.trim()}
                    className="text-xs px-5 py-2 rounded-xl font-medium text-white disabled:opacity-40"
                    style={{ background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.3)' }}>
                    {saving ? 'Salvando…' : 'Salvar'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  function PagePerformance() {
    return (
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-semibold text-white mb-1">Performance</h2>
          <p className="text-sm" style={{ color: 'rgba(100,116,139,0.5)' }}>Orgânico e tráfego pago</p>
        </div>

        {/* Instagram Orgânico */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: 'rgba(100,116,139,0.4)' }}>Orgânico — Instagram</p>
          <div className="rounded-2xl p-6 space-y-5" style={{ background: 'linear-gradient(145deg,#0d0d22,#0f0f28)', border: '1px solid rgba(255,255,255,0.06)' }}>
            {igInsightsLoading && (
              <div className="flex items-center justify-center py-8 gap-2">
                <RotateCcw size={14} className="animate-spin" style={{ color: 'rgba(100,116,139,0.4)' }} />
                <p className="text-xs" style={{ color: 'rgba(100,116,139,0.4)' }}>Carregando métricas…</p>
              </div>
            )}
            {!igInsightsLoading && !igInsights && (
              <div className="text-center py-8">
                <Instagram size={28} className="mx-auto mb-2" style={{ color: 'rgba(100,116,139,0.2)' }} />
                <p className="text-xs" style={{ color: 'rgba(100,116,139,0.4)' }}>Dados de Instagram não disponíveis</p>
              </div>
            )}
            {igInsights && (() => {
              const { profile, accountInsights, media } = igInsights;
              return (
                <div className="space-y-5">
                  <div className="flex items-center gap-3">
                    {profile.profile_picture_url && <img src={profile.profile_picture_url} className="w-10 h-10 rounded-full object-cover" />}
                    <div>
                      <p className="text-sm font-medium text-white">{profile.name}</p>
                      <p className="text-xs" style={{ color: 'rgba(100,116,139,0.5)' }}>{profile.media_count} publicações</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Seguidores', value: profile.followers_count, color: '#ec4899' },
                      { label: 'Alcance (30d)', value: accountInsights.reach, color: '#60a5fa' },
                      { label: 'Impressões (30d)', value: accountInsights.impressions, color: '#a78bfa' },
                    ].map(s => (
                      <div key={s.label} className="rounded-xl p-4 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <p className="text-xl font-semibold" style={{ color: s.color }}>{(s.value ?? 0).toLocaleString('pt-BR')}</p>
                        <p className="text-xs mt-1" style={{ color: 'rgba(100,116,139,0.6)' }}>{s.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Posts via lun.ia */}
        {(() => {
          const perfPosts = [...pieces]
            .filter(p => (p as any).ig_media_id || p.status === 'publicado' || p.status === 'agendado')
            .sort((a, b) => new Date((b as any).scheduled_date || (b as any).created_at).getTime() - new Date((a as any).scheduled_date || (a as any).created_at).getTime());
          if (perfPosts.length === 0) return null;
          return (
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: 'rgba(100,116,139,0.4)' }}>Posts publicados</p>
              <div className="grid grid-cols-3 gap-2.5">
                {perfPosts.map(p => {
                  const cfg = STATUS_CFG[p.status];
                  const thumb = getPostThumbnail(p);
                  return (
                    <button key={p.id} onClick={() => openDetail(p)}
                      className="relative group rounded-xl overflow-hidden text-left"
                      style={{ aspectRatio: '3/4', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                      {thumb ? (
                        <img src={thumb} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-2xl opacity-20">🖼️</span>
                        </div>
                      )}
                      <div className="absolute inset-0 flex flex-col justify-end p-2"
                        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 55%)' }}>
                        <p className="text-[10px] font-medium text-white truncate">{p.title}</p>
                        <span className="text-[9px] mt-0.5 px-1.5 py-0.5 rounded-full self-start font-medium"
                          style={{ color: cfg?.color, background: `${cfg?.color}22` }}>{cfg?.label}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Tráfego pago */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: 'rgba(100,116,139,0.4)' }}>Tráfego pago</p>
          {campaigns.length === 0 ? (
            <div className="text-center py-10 rounded-2xl" style={{ border: '1px dashed rgba(255,255,255,0.06)' }}>
              <p className="text-sm" style={{ color: 'rgba(100,116,139,0.4)' }}>Nenhuma campanha cadastrada</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Total investido',  value: fmtR(totalSpent) },
                { label: 'Impressões',       value: fmtN(totalImpressions) },
                { label: 'Conversões',       value: fmtN(totalConversions) },
                { label: 'ROAS geral',       value: overallRoas > 0 ? `${overallRoas.toFixed(1)}x` : '—' },
              ].map(m => (
                <div key={m.label} className="rounded-xl px-4 py-4"
                  style={{ background: 'linear-gradient(145deg,#0d0d22,#0f0f28)', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <p className="text-2xl font-bold text-white mb-1">{m.value}</p>
                  <p className="text-[11px]" style={{ color: 'rgba(100,116,139,0.45)' }}>{m.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  function PageCrmDashboard() {
    if (crmLoading || !crmDash) return <CrmSpinner />;
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold text-white mb-1">Dashboard</h2>
          <p className="text-sm" style={{ color: 'rgba(100,116,139,0.5)' }}>Visão geral do seu pipeline comercial</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total de contatos',  value: fmtN(crmDash.contacts?.total ?? 0),          color: '#60a5fa' },
            { label: 'Negócios ativos',    value: fmtN((crmDash.deals?.total ?? 0) - (crmDash.deals?.won_count ?? 0) - (crmDash.deals?.lost_count ?? 0)), color: '#a78bfa' },
            { label: 'Pipeline',           value: fmtR(crmDash.deals?.pipeline_total ?? 0),    color: '#f59e0b' },
            { label: 'Receita gerada',     value: fmtR(crmDash.deals?.won ?? 0),               color: '#34d399' },
          ].map(k => (
            <div key={k.label} className="rounded-2xl px-4 py-4"
              style={{ background: 'linear-gradient(145deg,#0d0d22,#0f0f28)', border: '1px solid rgba(255,255,255,0.04)' }}>
              <p className="text-2xl font-bold mb-1 text-white">{k.value}</p>
              <p className="text-[11px]" style={{ color: 'rgba(100,116,139,0.45)' }}>{k.label}</p>
            </div>
          ))}
        </div>
        <div className="rounded-2xl p-6" style={{ background: 'linear-gradient(145deg,#0d0d22,#0f0f28)', border: '1px solid rgba(255,255,255,0.04)' }}>
          <p className="text-xs font-semibold uppercase tracking-wider mb-5" style={{ color: 'rgba(100,116,139,0.45)' }}>Pipeline por etapa</p>
          <div className="space-y-3">
            {(crmDash.byStage || []).filter((s: any) => s.stage !== 'perdido').map((s: any) => {
              const cfg = stageCfg(s.stage);
              const maxVal = Math.max(...(crmDash.byStage || []).map((x: any) => x.value), 1);
              return (
                <div key={s.stage} className="flex items-center gap-3">
                  <span className="text-xs w-20 flex-shrink-0" style={{ color: cfg.color }}>{cfg.label}</span>
                  <div className="flex-1 h-5 rounded-md overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <div className="h-full rounded-md transition-all duration-500"
                      style={{ width: `${s.value > 0 ? Math.max((s.value / maxVal) * 100, 4) : 0}%`, background: `${cfg.color}30`, borderRight: s.value > 0 ? `2px solid ${cfg.color}` : 'none' }} />
                  </div>
                  <div className="text-right flex-shrink-0 w-28">
                    <span className="text-xs font-semibold text-white">{fmtR(s.value)}</span>
                    <span className="text-[10px] ml-2" style={{ color: 'rgba(100,116,139,0.45)' }}>{s.count} neg.</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="rounded-2xl p-5" style={{ background: 'linear-gradient(145deg,#0d0d22,#0f0f28)', border: '1px solid rgba(52,211,153,0.08)' }}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(52,211,153,0.1)' }}>
              <Zap size={16} style={{ color: '#34d399' }} />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Leads do marketing</p>
              <p className="text-xs" style={{ color: 'rgba(100,116,139,0.5)' }}>Contatos gerados por campanhas</p>
            </div>
            <div className="ml-auto">
              <span className="text-2xl font-bold" style={{ color: '#34d399' }}>{fmtN(crmDash.contacts?.from_marketing ?? 0)}</span>
            </div>
          </div>
          <p className="text-xs mt-3 pl-11" style={{ color: 'rgba(100,116,139,0.4)' }}>O marketing gera os leads — o comercial fecha os negócios.</p>
        </div>
      </div>
    );
  }

  function PageCrmContatos() {
    if (crmLoading) return <CrmSpinner />;
    return (
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-white mb-1">Contatos</h2>
            <p className="text-sm" style={{ color: 'rgba(100,116,139,0.5)' }}>{crmContacts.length} contatos no seu CRM</p>
          </div>
          <button onClick={openNewContact}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white flex-shrink-0"
            style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.2)' }}>
            <UserPlus size={14} /> Novo contato
          </button>
        </div>
        {crmContacts.length === 0 ? (
          <div className="text-center py-16 rounded-2xl" style={{ border: '1px dashed rgba(255,255,255,0.06)' }}>
            <Users size={32} className="mx-auto mb-3" style={{ color: 'rgba(100,116,139,0.3)' }} />
            <p className="text-sm" style={{ color: 'rgba(100,116,139,0.4)' }}>Nenhum contato ainda</p>
            <p className="text-xs mt-1" style={{ color: 'rgba(100,116,139,0.25)' }}>Adicione manualmente ou eles virão do marketing</p>
          </div>
        ) : (
          <div className="space-y-2">
            {crmContacts.map(c => {
              const cfg = stageCfg(c.stage);
              return (
                <div key={c.id} className="flex items-center gap-4 px-4 py-3 rounded-xl group"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white"
                    style={{ background: 'rgba(255,255,255,0.06)' }}>
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{c.name}</p>
                    <p className="text-xs truncate" style={{ color: 'rgba(100,116,139,0.5)' }}>
                      {[c.email, c.phone].filter(Boolean).join(' · ') || 'sem contato'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <select value={c.stage} onChange={e => updateContactStage(c.id, e.target.value)}
                      className="text-xs px-2 py-1 rounded-md outline-none cursor-pointer"
                      style={{ background: `${cfg.color}15`, color: cfg.color, border: `1px solid ${cfg.color}30` }}>
                      {STAGES_CRM.map(s => <option key={s.id} value={s.id} style={{ background: '#0d0d22', color: s.color }}>{s.label}</option>)}
                    </select>
                    <button onClick={() => openEditContact(c)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg" style={{ color: 'rgba(100,116,139,0.6)' }}><Pencil size={13} /></button>
                    <button onClick={() => deleteContact(c.id)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg" style={{ color: 'rgba(248,113,113,0.6)' }}><Trash2 size={13} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  const KANBAN_STAGES = STAGES_CRM.filter(s => s.id !== 'perdido');
  const STAGE_ORDER_CRM = STAGES_CRM.map(s => s.id);
  const AVATAR_COLORS = [
    'linear-gradient(135deg,#3b82f6,#6366f1)',
    'linear-gradient(135deg,#8b5cf6,#ec4899)',
    'linear-gradient(135deg,#10b981,#06b6d4)',
    'linear-gradient(135deg,#f59e0b,#ef4444)',
  ];
  const avatarColor = (name: string) => AVATAR_COLORS[(name || '?').charCodeAt(0) % AVATAR_COLORS.length];
  const initials = (name: string) => (name || '?').split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();

  function PageCrmPipeline() {
    if (crmLoading) return <CrmSpinner />;
    const total = crmDeals.reduce((s, d) => s + (d.value || 0), 0);

    const moveStage = async (deal: any, dir: 1 | -1) => {
      const idx = STAGE_ORDER_CRM.indexOf(deal.stage);
      const next = STAGE_ORDER_CRM[idx + dir];
      if (!next) return;
      setCrmDeals(prev => prev.map(d => d.id === deal.id ? { ...d, stage: next } : d));
      await clientCrmApi.updateDeal(cid, deal.id, { ...deal, stage: next });
    };

    return (
      <div className="flex flex-col h-full -m-6 md:-m-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 md:px-8 pt-6 md:pt-8 pb-5 flex-shrink-0">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'rgba(100,116,139,0.45)' }}>Pipeline</p>
            <h2 className="text-3xl font-extralight text-white tracking-tight">Funil de Vendas</h2>
            <p className="text-sm mt-1" style={{ color: 'rgba(100,116,139,0.6)' }}>
              {crmDeals.length} negócios · <span style={{ color: '#34d399' }}>{fmtR(total)}</span>
            </p>
          </div>
          <button onClick={openNewDeal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)', boxShadow: '0 0 20px rgba(99,102,241,0.35)' }}>
            <Plus size={15} /> Novo negócio
          </button>
        </div>

        {/* Kanban */}
        <div className="flex-1 overflow-x-auto px-6 md:px-8 pb-6">
          <div className="grid h-full gap-4" style={{ gridTemplateColumns: `repeat(${KANBAN_STAGES.length}, minmax(220px, 1fr))`, minWidth: `${KANBAN_STAGES.length * 240}px` }}>
            {KANBAN_STAGES.map((stage, si) => {
              const stageDeals = crmDeals.filter(d => d.stage === stage.id);
              const stageValue = stageDeals.reduce((s, d) => s + (d.value || 0), 0);
              const glow = stage.color + '55';
              return (
                <div key={stage.id} className="flex flex-col rounded-2xl overflow-hidden"
                  style={{ background: 'rgba(255,255,255,0.012)', border: '1px solid rgba(59,130,246,0.07)', animationDelay: `${si * 60}ms` }}>
                  {/* Column header */}
                  <div className="px-4 py-4 flex-shrink-0" style={{ borderBottom: `1px solid ${stage.color}18` }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold px-2.5 py-1 rounded-lg"
                        style={{ background: `${stage.color}12`, color: stage.color, border: `1px solid ${stage.color}25`, textShadow: `0 0 8px ${glow}` }}>
                        {stage.label}
                      </span>
                      <span className="text-xs font-semibold" style={{ color: 'rgba(100,116,139,0.6)' }}>{stageDeals.length}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Target size={12} style={{ color: stage.color, opacity: 0.7 }} />
                      <span className="text-sm font-semibold" style={{ color: stage.color }}>{fmtR(stageValue)}</span>
                    </div>
                  </div>

                  {/* Cards */}
                  <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {stageDeals.map(d => {
                      const idx = STAGE_ORDER_CRM.indexOf(d.stage);
                      const canBack = idx > 0;
                      const canFwd = idx < STAGE_ORDER_CRM.length - 1;
                      return (
                        <div key={d.id} className="rounded-xl p-4 cursor-pointer group transition-all duration-200"
                          style={{ background: 'linear-gradient(145deg,#0c0c28,#0e0e2e)', border: '1px solid rgba(59,130,246,0.1)', boxShadow: '0 2px 16px rgba(0,0,0,0.4)' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = `${stage.color}33`; (e.currentTarget as HTMLElement).style.boxShadow = `0 0 20px ${stage.color}18, 0 4px 20px rgba(0,0,0,0.5)`; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(59,130,246,0.1)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 16px rgba(0,0,0,0.4)'; }}
                          onClick={() => openEditDeal(d)}>
                          <div className="flex items-start justify-between mb-2">
                            <p className="text-sm font-medium text-white leading-tight flex-1 pr-2 line-clamp-2">{d.title}</p>
                            <button onClick={e => { e.stopPropagation(); deleteDeal(d.id); }}
                              className="opacity-0 group-hover:opacity-100 p-1 rounded-lg transition-all flex-shrink-0"
                              style={{ color: 'rgba(100,116,139,0.6)' }}
                              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#f87171'; (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.1)'; }}
                              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(100,116,139,0.6)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                              <Trash2 size={11} />
                            </button>
                          </div>
                          {d.contact_name && (
                            <div className="flex items-center gap-1.5 mb-3">
                              <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0"
                                style={{ background: avatarColor(d.contact_name) }}>{initials(d.contact_name)}</div>
                              <p className="text-xs truncate" style={{ color: 'rgba(100,116,139,0.65)' }}>{d.contact_name}</p>
                            </div>
                          )}
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-semibold" style={{ color: stage.color, textShadow: `0 0 12px ${glow}` }}>{fmtR(d.value || 0)}</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                              style={{ background: `${stage.color}15`, color: stage.color, border: `1px solid ${stage.color}30` }}>{d.probability}%</span>
                          </div>
                          <div className="flex gap-1.5" onClick={e => e.stopPropagation()}>
                            <button onClick={() => moveStage(d, -1)} disabled={!canBack}
                              className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] transition-all"
                              style={{ color: canBack ? 'rgba(100,116,139,0.6)' : 'rgba(100,116,139,0.2)', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                              <ChevronLeft size={10} /> Voltar
                            </button>
                            <button onClick={() => moveStage(d, 1)} disabled={!canFwd}
                              className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] transition-all"
                              style={canFwd ? { color: stage.color, background: `${stage.color}10`, border: `1px solid ${stage.color}25` } : { color: 'rgba(100,116,139,0.2)', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                              Avançar <ChevronRight size={10} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    <button onClick={() => { setDealForm(f => ({ ...f, stage: stage.id })); openNewDeal(); }}
                      className="w-full py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all"
                      style={{ border: `1px dashed ${stage.color}20`, color: 'rgba(100,116,139,0.4)' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = `${stage.color}40`; (e.currentTarget as HTMLElement).style.color = stage.color; (e.currentTarget as HTMLElement).style.background = `${stage.color}06`; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = `${stage.color}20`; (e.currentTarget as HTMLElement).style.color = 'rgba(100,116,139,0.4)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                      <Plus size={11} /> Adicionar negócio
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  function PageCrmConversas() {
    const openConv = async (c: any) => {
      setActiveConv(c);
      const r = await conversationsApi.getMessages(c.id);
      setConvMessages(r.data);
      conversationsApi.markRead(c.id);
      setConvs(prev => prev.map(x => x.id === c.id ? { ...x, unread_count: 0 } : x));
    };
    const sendMsg = async () => {
      if (!convMsg.trim() || !activeConv || sendingMsg) return;
      setSendingMsg(true);
      try {
        let r;
        if (activeConv.platform === 'instagram') {
          const parts = (activeConv.external_id || '').split('_');
          const recipientId = parts[parts.length - 1];
          r = await conversationsApi.sendIgReply(activeConv.id, String(cid), recipientId, convMsg);
        } else {
          r = await conversationsApi.sendMessage(activeConv.id, convMsg);
        }
        setConvMessages(prev => [...prev, r.data]);
        setConvMsg('');
      } catch (e: any) {
        alert(e?.response?.data?.error || 'Erro ao enviar');
      }
      setSendingMsg(false);
    };
    const filtered = convs.filter(c => c.contact_name?.toLowerCase().includes(convSearch.toLowerCase()));
    const platformDot = (p: string) => p === 'whatsapp' ? '#25d366' : p === 'instagram' && (activeConv as any)?.conv_type === 'comment' ? '#a855f7' : '#e1306c';

    return (
      <div className="flex h-full -m-6 md:-m-8 overflow-hidden">
        {/* List */}
        <div className="w-full md:w-80 flex-shrink-0 flex flex-col border-r" style={{ borderColor: 'rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.2)' }}>
          <div className="px-4 pt-5 pb-3 flex-shrink-0">
            <h2 className="text-xl font-semibold text-white mb-3">Mensagens</h2>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(100,116,139,0.4)' }} />
              <input value={convSearch} onChange={e => setConvSearch(e.target.value)}
                placeholder="Buscar conversa…"
                className="w-full pl-9 pr-3 py-2 rounded-xl text-sm outline-none"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: 'white' }} />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {convLoading ? <CrmSpinner /> : filtered.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-sm" style={{ color: 'rgba(100,116,139,0.4)' }}>Nenhuma conversa</p>
              </div>
            ) : filtered.map(c => (
              <button key={c.id} onClick={() => openConv(c)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left transition-all"
                style={{ background: activeConv?.id === c.id ? 'rgba(59,130,246,0.08)' : 'transparent', borderLeft: activeConv?.id === c.id ? '2px solid #3b82f6' : '2px solid transparent' }}>
                <div className="relative flex-shrink-0">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
                    style={{ background: avatarColor(c.contact_name || '') }}>{initials(c.contact_name || '?')}</div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2"
                    style={{ background: platformDot(c.platform), borderColor: '#05050f' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-white truncate">{c.contact_name}</p>
                    {c.unread_count > 0 && (
                      <span className="text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ml-1"
                        style={{ background: '#3b82f6', color: 'white' }}>{c.unread_count}</span>
                    )}
                  </div>
                  <p className="text-xs truncate mt-0.5" style={{ color: 'rgba(100,116,139,0.5)' }}>{c.last_message || '…'}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Chat */}
        <div className="flex-1 flex flex-col hidden md:flex">
          {!activeConv ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.12)' }}>
                <MessageSquare size={28} style={{ color: 'rgba(59,130,246,0.5)' }} />
              </div>
              <p className="text-base font-medium text-white">Selecione uma conversa</p>
              <p className="text-sm" style={{ color: 'rgba(100,116,139,0.4)' }}>ou aguarde novas mensagens pelo webhook</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 px-6 py-4 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold"
                  style={{ background: avatarColor(activeConv.contact_name || '') }}>{initials(activeConv.contact_name || '?')}</div>
                <div>
                  <p className="text-sm font-semibold text-white">{activeConv.contact_name}</p>
                  <p className="text-xs capitalize" style={{ color: 'rgba(100,116,139,0.5)' }}>{activeConv.platform}</p>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
                {convMessages.map((m: any) => (
                  <div key={m.id} className={`flex ${m.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                    <div className="max-w-xs px-3 py-2 rounded-2xl text-sm"
                      style={m.direction === 'outbound'
                        ? { background: 'rgba(59,130,246,0.2)', color: 'white', borderBottomRightRadius: '4px' }
                        : { background: 'rgba(255,255,255,0.06)', color: 'rgba(226,232,240,0.9)', borderBottomLeftRadius: '4px' }}>
                      {m.content}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 px-6 py-4 flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <input value={convMsg} onChange={e => setConvMsg(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMsg()}
                  placeholder="Escrever mensagem…"
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: 'white' }} />
                <button onClick={sendMsg} disabled={!convMsg.trim() || sendingMsg}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-40"
                  style={{ background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.3)' }}>
                  <Send size={14} />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  function PageCrmConfig() {
    const saveProfile = async () => {
      if (!profileForm.name.trim()) return;
      setProfileSaving(true);
      await profileApi.update({ name: profileForm.name, avatar: profileForm.avatar || undefined });
      setProfileSaving(false);
    };
    return (
      <div className="space-y-8 max-w-lg">
        <div>
          <h2 className="text-2xl font-semibold text-white mb-1">Configurações</h2>
          <p className="text-sm" style={{ color: 'rgba(100,116,139,0.5)' }}>Perfil e integrações da sua conta</p>
        </div>

        {/* Profile */}
        <div className="rounded-2xl p-6 space-y-4" style={{ background: 'linear-gradient(145deg,#0d0d22,#0f0f28)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(100,116,139,0.45)' }}>Perfil</p>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-lg font-bold flex-shrink-0"
              style={{ background: profileForm.avatar ? 'transparent' : 'linear-gradient(135deg,#3b82f6,#6366f1)' }}>
              {profileForm.avatar
                ? <img src={profileForm.avatar} className="w-full h-full rounded-2xl object-cover" />
                : initials(profileForm.name || user?.name || '?')}
            </div>
            <div className="flex-1">
              <input value={profileForm.avatar} onChange={e => setProfileForm(p => ({ ...p, avatar: e.target.value }))}
                placeholder="URL da foto de perfil"
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'white' }} />
              <p className="text-[11px] mt-1" style={{ color: 'rgba(100,116,139,0.35)' }}>Cole o link de uma imagem pública</p>
            </div>
          </div>
          <div className="space-y-3">
            <input value={profileForm.name} onChange={e => setProfileForm(p => ({ ...p, name: e.target.value }))}
              placeholder="Seu nome"
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'white' }} />
            <input value={user?.email || ''} disabled placeholder="E-mail"
              className="w-full px-3 py-2 rounded-lg text-sm outline-none opacity-50"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', color: 'rgba(148,163,184,0.6)' }} />
          </div>
          <button onClick={saveProfile} disabled={profileSaving || !profileForm.name.trim()}
            className="px-5 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-40"
            style={{ background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.3)' }}>
            {profileSaving ? 'Salvando…' : 'Salvar perfil'}
          </button>
        </div>

        {/* Meta integration */}
        <div className="rounded-2xl p-6 space-y-4" style={{ background: 'linear-gradient(145deg,#0d0d22,#0f0f28)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(100,116,139,0.45)' }}>Integração Meta</p>
          <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: 'rgba(24,119,242,0.06)', border: '1px solid rgba(24,119,242,0.15)' }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(24,119,242,0.15)' }}>
              <span className="text-base font-black" style={{ color: '#1877f2' }}>f</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-white">WhatsApp & Instagram</p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(100,116,139,0.5)' }}>Gerenciado pela sua agência via API da Meta</p>
            </div>
            <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: 'rgba(52,211,153,0.1)', color: '#34d399', border: '1px solid rgba(52,211,153,0.2)' }}>Ativo</span>
          </div>
          <p className="text-xs" style={{ color: 'rgba(100,116,139,0.4)' }}>
            As mensagens recebidas via WhatsApp e Instagram aparecem automaticamente na aba Mensagens.
            Para configurar novas integrações, fale com sua agência.
          </p>
        </div>
      </div>
    );
  }

  function PageIdeias() {
    const [ideas, setIdeas] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ title: '', description: '', reference_url: '' });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
      contentIdeasApi.list(cid).then(r => { setIdeas(r.data || []); setLoading(false); });
    }, []);

    const submit = async () => {
      if (!form.title.trim()) return;
      setSaving(true);
      const r = await contentIdeasApi.create({ agency_client_id: cid, ...form });
      setIdeas(prev => [r.data, ...prev]);
      setForm({ title: '', description: '', reference_url: '' });
      setShowForm(false);
      setSaving(false);
    };

    const STATUS_CFG_IDEAS: Record<string, { label: string; color: string }> = {
      nova:        { label: 'Nova',        color: '#60a5fa' },
      em_analise:  { label: 'Em análise',  color: '#f59e0b' },
      aprovada:    { label: 'Aprovada',    color: '#34d399' },
      descartada:  { label: 'Descartada',  color: '#94a3b8' },
    };

    return (
      <div className="space-y-5">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-white mb-1">Ideias de Conteúdo</h2>
            <p className="text-sm" style={{ color: 'rgba(100,116,139,0.5)' }}>Envie suas ideias para a agência avaliar</p>
          </div>
          <button onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
            style={{ background: 'rgba(59,130,246,0.12)', color: '#93c5fd', border: '1px solid rgba(59,130,246,0.2)' }}>
            <Plus size={14} />{showForm ? 'Cancelar' : 'Nova ideia'}
          </button>
        </div>

        {/* Form */}
        {showForm && (
          <div className="rounded-2xl p-5 space-y-4"
            style={{ background: 'linear-gradient(145deg,#0d0d22,#0f0f28)', border: '1px solid rgba(59,130,246,0.15)' }}>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(100,116,139,0.6)' }}>Título da ideia *</label>
              <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                placeholder="Ex: Reels mostrando os bastidores da loja…"
                className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(100,116,139,0.6)' }}>Descrição / contexto</label>
              <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                rows={3} placeholder="Descreva a ideia com detalhes, tom desejado, produto destacado…"
                className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none resize-none"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(100,116,139,0.6)' }}>Referência (link)</label>
              <input value={form.reference_url} onChange={e => setForm(p => ({ ...p, reference_url: e.target.value }))}
                placeholder="https://…  Instagram, Pinterest, TikTok…"
                className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }} />
            </div>
            <button onClick={submit} disabled={saving || !form.title.trim()}
              className="w-full py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-40 transition-all"
              style={{ background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.3)' }}>
              {saving ? 'Enviando…' : 'Enviar ideia'}
            </button>
          </div>
        )}

        {/* Ideas list */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'rgba(59,130,246,0.3)', borderTopColor: '#3b82f6' }} />
          </div>
        ) : ideas.length === 0 ? (
          <div className="text-center py-20">
            <Zap size={40} className="mx-auto mb-4 opacity-10" style={{ color: '#60a5fa' }} />
            <p className="text-white font-medium mb-1">Nenhuma ideia enviada ainda</p>
            <p className="text-sm" style={{ color: 'rgba(100,116,139,0.4)' }}>Clique em "Nova ideia" e inspire a agência!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {ideas.map((idea: any) => {
              const st = STATUS_CFG_IDEAS[idea.status] || STATUS_CFG_IDEAS['nova'];
              return (
                <div key={idea.id} className="rounded-2xl p-4"
                  style={{ background: 'linear-gradient(145deg,#0d0d22,#0f0f28)', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <p className="text-sm font-semibold text-white">{idea.title}</p>
                    <span className="flex-shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ color: st.color, background: `${st.color}15` }}>{st.label}</span>
                  </div>
                  {idea.description && (
                    <p className="text-xs mb-2 leading-relaxed" style={{ color: 'rgba(148,163,184,0.6)' }}>{idea.description}</p>
                  )}
                  {idea.reference_url && (
                    <a href={idea.reference_url} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs transition-opacity hover:opacity-80"
                      style={{ color: '#60a5fa' }} onClick={e => e.stopPropagation()}>
                      <BookOpen size={10} /> Ver referência
                    </a>
                  )}
                  <p className="text-[10px] mt-2" style={{ color: 'rgba(100,116,139,0.3)' }}>
                    {format(new Date(idea.created_at), "d 'de' MMM 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  const pageComponents: Record<PageId, JSX.Element> = {
    visao:           <PageVisaoGeral />,
    posicionamento:  <PagePosicionamento />,
    produtos:        <PageProdutos />,
    metas:           <PageMetas />,
    conteudos:       <PageConteudos />,
    ideias:          <PageIdeias />,
    performance:     <PagePerformance />,
    trafico:         <PageTrafico />,
    crm_dashboard:   <PageCrmDashboard />,
    crm_contatos:    <PageCrmContatos />,
    crm_pipeline:    <PageCrmPipeline />,
    crm_conversas:   <PageCrmConversas />,
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#05050f' }}>
      <PortalSidebar
        client={client} page={page} setPage={setPage}
        pendingCount={pendingCount} activeCampaignsCount={activeCampaigns.length}
        open={sidebarOpen} onClose={() => setSidebarOpen(false)}
        isAdmin={isAdmin} onBack={() => navigate('/marketing/clients')}
      />

      <main className="flex-1 md:ml-60 overflow-y-auto min-w-0 w-full">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 sticky top-0 z-20"
          style={{ background: '#05050f', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <button onClick={() => setSidebarOpen(true)} className="p-1.5 rounded-lg" style={{ color: 'rgba(100,116,139,0.6)' }}>
            <Menu size={20} />
          </button>
          <p className="font-semibold text-white text-sm">{client?.name}</p>
        </div>

        <div className={page === 'crm_pipeline' || page === 'crm_conversas'
          ? 'p-4 md:p-6 h-[calc(100vh-56px)] flex flex-col'
          : 'p-4 md:p-8 w-full'}>
          {pageComponents[page]}
        </div>
      </main>

      {/* Detail panel */}
      {detail && (
        <div className="fixed inset-0 flex items-center justify-end z-50"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
          onClick={() => { setDetail(null); setAdjustModal(false); }}>
          <div className="h-full w-full max-w-lg overflow-y-auto"
            style={{ background: '#07071a', borderLeft: '1px solid rgba(255,255,255,0.06)', boxShadow: '-20px 0 60px rgba(0,0,0,0.7)' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <StatusBadge status={detail.status} />
              <button onClick={() => setDetail(null)} className="p-1.5 rounded-lg" style={{ color: 'rgba(100,116,139,0.5)' }}><X size={18} /></button>
            </div>
            <div className="p-6 space-y-6">
              <MediaViewer mediaFiles={detail.media_files} mediaUrl={detail.media_url} contentType={detail.type} />
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="badge badge-slate">{TYPE_LABEL[detail.type]}</span>
                  {detail.scheduled_date && (
                    <span className="flex items-center gap-1 text-xs" style={{ color: 'rgba(100,116,139,0.5)' }}>
                      <Calendar size={10} />{format(new Date(detail.scheduled_date), "d 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-semibold text-white mt-2">{detail.title}</h2>
              </div>
              {detail.objective && (
                <div className="rounded-xl px-4 py-3" style={{ background: 'rgba(59,130,246,0.04)', border: '1px solid rgba(59,130,246,0.1)' }}>
                  <p className="text-xs mb-1" style={{ color: 'rgba(59,130,246,0.5)' }}>Objetivo estratégico</p>
                  <p className="text-sm text-white">{detail.objective}</p>
                </div>
              )}
              {detail.caption && (
                <div>
                  <p className="label-dark mb-2">Legenda</p>
                  <div className="rounded-xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <p className="text-sm whitespace-pre-wrap" style={{ color: 'rgba(148,163,184,0.8)', lineHeight: '1.7' }}>{detail.caption}</p>
                  </div>
                </div>
              )}
              {/* Métricas do Instagram */}
              {(detail as any).ig_media_id && (
                <div className="rounded-2xl p-4 space-y-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(100,116,139,0.45)' }}>Métricas do post</p>
                    {detailInsightsLoading && <RotateCcw size={11} className="animate-spin" style={{ color: 'rgba(100,116,139,0.4)' }} />}
                    {(detailInsights as any)?.permalink && (
                      <a href={(detailInsights as any).permalink} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[10px]" style={{ color: 'rgba(100,116,139,0.4)' }}>
                        <ExternalLink size={9} /> Ver no Instagram
                      </a>
                    )}
                  </div>
                  {detailInsightsLoading ? (
                    <p className="text-xs py-2" style={{ color: 'rgba(100,116,139,0.35)' }}>Carregando métricas…</p>
                  ) : detailInsights ? (() => {
                    const ins = detailInsights.insights || {};
                    const reach = ins.reach ?? 0;
                    const impressions = ins.impressions ?? 0;
                    const likes = ins.likes ?? detailInsights.like_count ?? 0;
                    const comments = ins.comments ?? detailInsights.comments_count ?? 0;
                    const saved = ins.saved ?? 0;
                    const shares = ins.shares ?? 0;
                    const totalInteractions = ins.total_interactions ?? (likes + comments + saved + shares);
                    const engRate = reach > 0 ? ((totalInteractions / reach) * 100).toFixed(1) : '—';
                    const isReel = detailInsights.media_type === 'VIDEO';
                    const plays = ins.plays ?? 0;
                    return (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="rounded-xl p-3" style={{ background: 'linear-gradient(145deg,rgba(59,130,246,0.08),rgba(99,102,241,0.05))', border: '1px solid rgba(59,130,246,0.15)' }}>
                            <p className="text-xl font-bold text-white">{reach.toLocaleString('pt-BR')}</p>
                            <p className="text-[10px] mt-0.5" style={{ color: 'rgba(100,116,139,0.55)' }}>Alcance</p>
                            <p className="text-[9px] mt-1" style={{ color: 'rgba(100,116,139,0.35)' }}>{impressions.toLocaleString('pt-BR')} impressões</p>
                          </div>
                          <div className="rounded-xl p-3" style={{ background: 'linear-gradient(145deg,rgba(52,211,153,0.08),rgba(16,185,129,0.05))', border: '1px solid rgba(52,211,153,0.15)' }}>
                            <p className="text-xl font-bold" style={{ color: '#34d399' }}>{engRate}%</p>
                            <p className="text-[10px] mt-0.5" style={{ color: 'rgba(100,116,139,0.55)' }}>Engajamento</p>
                            <p className="text-[9px] mt-1" style={{ color: 'rgba(100,116,139,0.35)' }}>{totalInteractions.toLocaleString('pt-BR')} interações</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-4 gap-1.5">
                          {[
                            { label: 'Curtidas',  value: likes,    color: '#ec4899', icon: '❤️' },
                            { label: 'Coment.',   value: comments, color: '#f59e0b', icon: '💬' },
                            { label: 'Salvos',    value: saved,    color: '#a78bfa', icon: '🔖' },
                            { label: 'Compart.',  value: shares,   color: '#22d3ee', icon: '↗️' },
                            ...(isReel ? [{ label: 'Reprod.', value: plays, color: '#60a5fa', icon: '▶️' }] : []),
                          ].map(m => (
                            <div key={m.label} className="rounded-xl p-2.5 text-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                              <p className="text-sm">{m.icon}</p>
                              <p className="text-sm font-semibold leading-none mt-1" style={{ color: m.color }}>{m.value.toLocaleString('pt-BR')}</p>
                              <p className="text-[9px] mt-0.5" style={{ color: 'rgba(100,116,139,0.45)' }}>{m.label}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })() : (
                    <p className="text-xs py-1" style={{ color: 'rgba(100,116,139,0.35)' }}>Métricas ainda não disponíveis.</p>
                  )}
                </div>
              )}

              {detail.status === 'aguardando_aprovacao' && (
                <div className="space-y-3">
                  <p className="label-dark">Sua decisão</p>
                  <button onClick={handleApprove} disabled={acting}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium"
                    style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)', color: '#34d399' }}>
                    <CheckCircle2 size={16} /> {acting ? 'Aprovando…' : 'Aprovar este post'}
                  </button>
                  <button onClick={() => setAdjustModal(true)} disabled={acting}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium"
                    style={{ background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.2)', color: '#f97316' }}>
                    <RotateCcw size={14} /> Solicitar ajuste
                  </button>
                </div>
              )}
              {detail.status === 'aprovado' && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 px-4 py-3 rounded-xl" style={{ background: 'rgba(52,211,153,0.05)', border: '1px solid rgba(52,211,153,0.12)' }}>
                    <CheckCircle2 size={14} style={{ color: '#34d399' }} />
                    <span className="text-sm flex-1" style={{ color: '#34d399' }}>Você aprovou este post</span>
                  </div>
                  {!adjustModal && (
                    <button onClick={() => setAdjustModal(true)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-medium transition-all"
                      style={{ background: 'transparent', border: '1px solid rgba(100,116,139,0.15)', color: 'rgba(100,116,139,0.5)' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(249,115,22,0.3)'; e.currentTarget.style.color = '#f97316'; e.currentTarget.style.background = 'rgba(249,115,22,0.05)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(100,116,139,0.15)'; e.currentTarget.style.color = 'rgba(100,116,139,0.5)'; e.currentTarget.style.background = 'transparent'; }}>
                      <RotateCcw size={12} /> Mudei de ideia — solicitar ajuste
                    </button>
                  )}
                </div>
              )}
              {detail.status === 'ajuste_solicitado' && (
                <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(249,115,22,0.04)', border: '1px solid rgba(249,115,22,0.18)' }}>
                  <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: detail.comments?.length ? '1px solid rgba(249,115,22,0.1)' : undefined }}>
                    <RotateCcw size={13} style={{ color: '#f97316' }} />
                    <span className="text-sm font-medium" style={{ color: '#f97316' }}>Ajuste solicitado ao time</span>
                  </div>
                  {detail.comments && detail.comments.length > 0 && (
                    <div className="px-4 py-3 space-y-2.5">
                      {detail.comments.map(c => (
                        <div key={c.id}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] font-semibold" style={{ color: 'rgba(249,115,22,0.7)' }}>{c.user_name}</span>
                            <span className="text-[10px]" style={{ color: 'rgba(100,116,139,0.4)' }}>{format(new Date(c.created_at), "d MMM HH:mm", { locale: ptBR })}</span>
                          </div>
                          <p className="text-sm leading-relaxed" style={{ color: 'rgba(226,232,240,0.75)' }}>{c.message}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {adjustModal && (
                <div className="rounded-xl p-4 space-y-3" style={{ background: 'rgba(249,115,22,0.04)', border: '1px solid rgba(249,115,22,0.15)' }}>
                  <p className="text-sm font-medium" style={{ color: '#f97316' }}>Descreva o ajuste</p>
                  <textarea value={adjustComment} onChange={e => setAdjustComment(e.target.value)} rows={3} placeholder="Ex: Mudar a cor do texto…" className="input-dark resize-none text-sm w-full" />
                  <div className="flex gap-2">
                    <button onClick={() => { setAdjustModal(false); setAdjustComment(''); }} className="btn-ghost flex-1 text-sm py-2">Cancelar</button>
                    <button onClick={handleRequestAdjust} disabled={!adjustComment.trim() || acting}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium"
                      style={{ background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.25)', color: '#f97316' }}>
                      <Send size={12} /> {acting ? 'Enviando…' : 'Enviar'}
                    </button>
                  </div>
                </div>
              )}
              <div>
                <p className="label-dark mb-3 flex items-center gap-2"><MessageSquare size={12} />Comentários</p>
                <div className="space-y-3 mb-4 max-h-52 overflow-y-auto">
                  {!(detail.comments?.length) ? (
                    <p className="text-xs" style={{ color: 'rgba(100,116,139,0.35)' }}>Nenhum comentário ainda</p>
                  ) : detail.comments!.map(c => (
                    <div key={c.id} className="rounded-xl px-3 py-2.5" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-white">{c.user_name}</span>
                        <span className="text-[10px]" style={{ color: 'rgba(100,116,139,0.4)' }}>{format(new Date(c.created_at), "d MMM HH:mm", { locale: ptBR })}</span>
                      </div>
                      <p className="text-xs" style={{ color: 'rgba(148,163,184,0.65)', lineHeight: '1.5' }}>{c.message}</p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input value={comment} onChange={e => setComment(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleComment()}
                    placeholder="Comentar…" className="input-dark flex-1 text-sm py-2" />
                  <button onClick={handleComment} disabled={sendingComment || !comment.trim()} className="btn-primary px-3"><Send size={13} /></button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CRM — Contact modal */}
      {contactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-md rounded-2xl p-6 space-y-4" style={{ background: '#0d0d22', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-white">{editingContact ? 'Editar contato' : 'Novo contato'}</h3>
              <button onClick={() => setContactModal(false)} style={{ color: 'rgba(100,116,139,0.5)' }}><X size={18} /></button>
            </div>
            {(['name', 'email', 'phone'] as const).map(field => (
              <input key={field} value={contactForm[field]} onChange={e => setContactForm(p => ({ ...p, [field]: e.target.value }))}
                placeholder={{ name: 'Nome *', email: 'E-mail', phone: 'Telefone' }[field]}
                className={crmInputCls} style={crmInputStyle} />
            ))}
            <select value={contactForm.source} onChange={e => setContactForm(p => ({ ...p, source: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={crmSelectStyle}>
              <option value="manual">Manual</option>
              <option value="marketing">Marketing</option>
              <option value="indicacao">Indicação</option>
              <option value="evento">Evento</option>
            </select>
            <textarea value={contactForm.notes} onChange={e => setContactForm(p => ({ ...p, notes: e.target.value }))}
              placeholder="Observações" rows={2} className={crmInputCls} style={crmInputStyle} />
            <div className="flex gap-2 pt-2">
              <button onClick={() => setContactModal(false)} className="flex-1 py-2 rounded-lg text-sm" style={{ color: 'rgba(100,116,139,0.6)', border: '1px solid rgba(255,255,255,0.06)' }}>Cancelar</button>
              <button onClick={saveContact} disabled={savingContact || !contactForm.name.trim()}
                className="flex-1 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-40"
                style={{ background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.3)' }}>
                {savingContact ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CRM — Deal modal */}
      {dealModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-md rounded-2xl p-6 space-y-4" style={{ background: '#0d0d22', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-white">{editingDeal ? 'Editar negócio' : 'Novo negócio'}</h3>
              <button onClick={() => setDealModal(false)} style={{ color: 'rgba(100,116,139,0.5)' }}><X size={18} /></button>
            </div>
            <input value={dealForm.title} onChange={e => setDealForm(p => ({ ...p, title: e.target.value }))}
              placeholder="Título do negócio *" className={crmInputCls} style={crmInputStyle} />
            <div className="grid grid-cols-2 gap-3">
              <input value={dealForm.value} onChange={e => setDealForm(p => ({ ...p, value: e.target.value }))}
                placeholder="Valor (R$)" type="number" className={crmInputCls} style={crmInputStyle} />
              <input value={dealForm.probability} onChange={e => setDealForm(p => ({ ...p, probability: e.target.value }))}
                placeholder="Probabilidade %" type="number" min="0" max="100" className={crmInputCls} style={crmInputStyle} />
            </div>
            <select value={dealForm.stage} onChange={e => setDealForm(p => ({ ...p, stage: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={crmSelectStyle}>
              {STAGES_CRM.map(s => <option key={s.id} value={s.id} style={{ background: '#0d0d22' }}>{s.label}</option>)}
            </select>
            <select value={dealForm.client_contact_id} onChange={e => setDealForm(p => ({ ...p, client_contact_id: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={crmSelectStyle}>
              <option value="">Nenhum contato vinculado</option>
              {crmContacts.map(c => <option key={c.id} value={String(c.id)} style={{ background: '#0d0d22' }}>{c.name}</option>)}
            </select>
            <textarea value={dealForm.notes} onChange={e => setDealForm(p => ({ ...p, notes: e.target.value }))}
              placeholder="Observações" rows={2} className={crmInputCls} style={crmInputStyle} />
            <div className="flex gap-2 pt-2">
              <button onClick={() => setDealModal(false)} className="flex-1 py-2 rounded-lg text-sm" style={{ color: 'rgba(100,116,139,0.6)', border: '1px solid rgba(255,255,255,0.06)' }}>Cancelar</button>
              <button onClick={saveDeal} disabled={savingDeal || !dealForm.title.trim()}
                className="flex-1 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-40"
                style={{ background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.3)' }}>
                {savingDeal ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
