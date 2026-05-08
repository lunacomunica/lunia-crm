import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  CheckCircle2, RotateCcw, MessageSquare, Calendar, X, Send, Eye,
  FileImage, Clock, Grid3x3, Megaphone, Smartphone,
  TrendingUp, MousePointer, DollarSign, BarChart3, Target, Pencil,
  Plus, Trash2, ChevronRight, Zap, Users, Star, BookOpen, Briefcase,
  ArrowLeft, LayoutDashboard, Menu, Phone, UserPlus, Kanban
} from 'lucide-react';
import { contentApi, agencyClientsApi, campaignsApi, clientPortalApi, clientCrmApi } from '../../api/client';
import { ContentPiece, ContentStatus, AgencyClient, Campaign } from '../../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '../../context/AuthContext';

/* ─── Configs ────────────────────────────────────────────────────────────── */
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
  rascunho:  { label: 'Rascunho',  color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' },
  ativa:     { label: 'Ativa',     color: '#34d399', bg: 'rgba(52,211,153,0.1)'  },
  pausada:   { label: 'Pausada',   color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  encerrada: { label: 'Encerrada', color: '#64748b', bg: 'rgba(100,116,139,0.1)' },
};

const TYPE_LABEL: Record<string, string> = { post: 'Post', reels: 'Reels', story: 'Story', carrossel: 'Carrossel' };

type PageId = 'visao' | 'posicionamento' | 'metas' | 'aprovacoes' | 'feed' | 'campanhas' | 'crm_dashboard' | 'crm_contatos' | 'crm_pipeline';

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
        { id: 'visao' as PageId,          label: 'Visão Geral',      icon: LayoutDashboard, badge: 0 },
        { id: 'posicionamento' as PageId, label: 'Posicionamento',   icon: Star,            badge: 0 },
        { id: 'metas' as PageId,          label: 'Metas',            icon: Target,          badge: 0 },
      ],
    },
    {
      label: 'Marketing',
      items: [
        { id: 'aprovacoes' as PageId, label: 'Aprovações',    icon: CheckCircle2, badge: pendingCount },
        { id: 'feed' as PageId,       label: 'Prévia do Feed', icon: Grid3x3,     badge: 0 },
        { id: 'campanhas' as PageId,  label: 'Campanhas',     icon: Megaphone,   badge: activeCampaignsCount },
      ],
    },
    {
      label: 'Comercial',
      items: [
        { id: 'crm_dashboard' as PageId, label: 'Dashboard',  icon: LayoutDashboard, badge: 0 },
        { id: 'crm_contatos'  as PageId, label: 'Contatos',   icon: Users,           badge: 0 },
        { id: 'crm_pipeline'  as PageId, label: 'Pipeline',   icon: Kanban,          badge: 0 },
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
                          style={{ background: item.id === 'aprovacoes' ? 'rgba(245,158,11,0.2)' : 'rgba(52,211,153,0.15)', color: item.id === 'aprovacoes' ? '#f59e0b' : '#34d399' }}>
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
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'user';

  const [page, setPage] = useState<PageId>('visao');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [client, setClient] = useState<AgencyClient | null>(null);
  const [pieces, setPieces] = useState<ContentPiece[]>([]);
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

  const [detail, setDetail] = useState<ContentPiece | null>(null);
  const [adjustModal, setAdjustModal] = useState(false);
  const [adjustComment, setAdjustComment] = useState('');
  const [comment, setComment] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const [acting, setActing] = useState(false);
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

  useEffect(() => {
    if ((page === 'crm_dashboard' || page === 'crm_contatos' || page === 'crm_pipeline') && !crmDash && !crmLoading) {
      loadCrm();
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
            <div className="col-span-3 py-12 text-center"><p className="text-xs" style={{ color: 'rgba(100,116,139,0.4)' }}>Nenhuma peça para exibir</p></div>
          ) : feedDisplayed.map(p => {
            const overlay = FEED_OVERLAY[p.status];
            const isPublished = p.status === 'publicado';
            return (
              <button key={p.id} onClick={() => openDetail(p)} className="relative aspect-square overflow-hidden group" style={{ background: 'rgba(255,255,255,0.03)' }}>
                {p.media_url ? (
                  <img src={p.media_url} alt={p.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" style={{ opacity: overlay ? 0.65 : 1 }} />
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
                {isPublished && <div className="absolute top-1 right-1"><div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ background: '#10b981' }}><CheckCircle2 size={10} className="text-white" /></div></div>}
                {p.type !== 'post' && <div className="absolute bottom-1 left-1"><span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'rgba(0,0,0,0.7)', color: 'rgba(255,255,255,0.8)' }}>{TYPE_LABEL[p.type]}</span></div>}
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
    const flyItems = [
      { label: 'Conteúdo', color: '#a78bfa', metrics: [
        { label: 'Publicados', value: s?.posts?.published ?? 0 },
        { label: 'Este mês', value: s?.posts?.published_month ?? 0 },
        { label: 'Total planejado', value: s?.posts?.total ?? 0 },
      ]},
      { label: 'Alcance', color: '#60a5fa', metrics: [
        { label: 'Impressões', value: fmtN(s?.campaigns?.reach ?? 0) },
        { label: 'Cliques', value: fmtN(s?.campaigns?.clicks ?? 0) },
        { label: 'Campanhas ativas', value: s?.campaigns?.active ?? 0 },
      ]},
      { label: 'Leads', color: '#34d399', metrics: [
        { label: 'Conversões', value: s?.campaigns?.leads ?? 0 },
        { label: 'CPL médio', value: s?.cpl > 0 ? fmtR(s.cpl) : '—' },
        { label: 'Investido', value: s?.campaigns?.spent > 0 ? fmtR(s.campaigns.spent) : '—' },
      ]},
      { label: 'Receita', color: '#f59e0b', metrics: [
        { label: 'Faturamento', value: s?.campaigns?.revenue > 0 ? fmtR(s.campaigns.revenue) : '—' },
        { label: 'ROAS médio', value: s?.roas > 0 ? `${s.roas.toFixed(1)}x` : '—' },
        { label: 'Retorno', value: s?.campaigns?.revenue > 0 ? fmtR(s.campaigns.revenue - s.campaigns.spent) : '—' },
      ]},
    ];

    return (
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-semibold text-white mb-1">Visão Geral</h2>
          <p className="text-sm" style={{ color: 'rgba(100,116,139,0.5)' }}>
            {format(new Date(), "MMMM 'de' yyyy", { locale: ptBR })} — Flywheel de crescimento
          </p>
        </div>

        {/* Flywheel */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {flyItems.map((item, i) => (
            <div key={item.label} className="relative rounded-2xl p-5"
              style={{ background: 'linear-gradient(145deg,#0d0d22,#0f0f28)', border: `1px solid ${item.color}18` }}>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold tracking-wide" style={{ color: item.color }}>{item.label}</span>
                {i < flyItems.length - 1 && (
                  <ChevronRight size={12} className="hidden lg:block" style={{ color: 'rgba(100,116,139,0.2)' }} />
                )}
              </div>
              <div className="space-y-3">
                {item.metrics.map(m => (
                  <div key={m.label}>
                    <p className="text-lg font-bold leading-none" style={{ color: 'white' }}>{m.value}</p>
                    <p className="text-[10px] mt-1" style={{ color: 'rgba(100,116,139,0.45)' }}>{m.label}</p>
                  </div>
                ))}
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-2xl" style={{ background: `linear-gradient(90deg,${item.color}40,transparent)` }} />
            </div>
          ))}
        </div>

        {/* Status bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Ag. aprovação', value: s?.posts?.pending_approval ?? 0, color: '#f59e0b', urgent: (s?.posts?.pending_approval ?? 0) > 0 },
            { label: 'Ajuste solicitado', value: s?.posts?.needs_adjustment ?? 0, color: '#f97316', urgent: (s?.posts?.needs_adjustment ?? 0) > 0 },
            { label: 'Campanhas ativas', value: s?.campaigns?.active ?? 0, color: '#34d399', urgent: false },
            { label: 'Total de peças', value: s?.posts?.total ?? 0, color: '#60a5fa', urgent: false },
          ].map(stat => (
            <div key={stat.label} className="rounded-xl px-4 py-3"
              style={{ background: 'linear-gradient(145deg,#0d0d22,#0f0f28)', border: `1px solid ${stat.urgent ? stat.color + '30' : 'rgba(255,255,255,0.04)'}` }}>
              <p className="text-2xl font-bold" style={{ color: stat.urgent ? stat.color : 'white' }}>{stat.value}</p>
              <p className="text-[11px] mt-1" style={{ color: 'rgba(100,116,139,0.5)' }}>{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function PagePosicionamento() {
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState({
      icp: positioning?.icp || '',
      promise: positioning?.promise || '',
      mission: positioning?.mission || '',
      differentials: (() => { try { return JSON.parse(positioning?.differentials || '[]'); } catch { return []; } })(),
      cases: (() => { try { return JSON.parse(positioning?.cases || '[]'); } catch { return []; } })(),
    });
    const [saving, setSaving] = useState(false);
    const [newDiff, setNewDiff] = useState('');
    const [newCase, setNewCase] = useState({ title: '', result: '' });

    const pos = {
      icp: positioning?.icp || '',
      promise: positioning?.promise || '',
      mission: positioning?.mission || '',
      differentials: (() => { try { return JSON.parse(positioning?.differentials || '[]'); } catch { return []; } })(),
      cases: (() => { try { return JSON.parse(positioning?.cases || '[]'); } catch { return []; } })(),
    };

    const save = async () => {
      setSaving(true);
      const r = await clientPortalApi.updatePositioning(cid, form);
      setPositioning(r.data);
      setEditing(false);
      setSaving(false);
    };

    const isEmpty = !pos.icp && !pos.promise && !pos.mission && pos.differentials.length === 0;
    const data = editing ? form : pos;

    const blocks = [
      { key: 'icp', label: 'ICP — Cliente Ideal', icon: Users, color: '#a78bfa', placeholder: 'Descreva o perfil do cliente ideal...' },
      { key: 'promise', label: 'Promessa de Marca', icon: Star, color: '#60a5fa', placeholder: 'Qual é a promessa central da marca?' },
      { key: 'mission', label: 'Missão', icon: Target, color: '#34d399', placeholder: 'Missão da empresa...' },
    ];

    return (
      <div className="space-y-6">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-white mb-1">Posicionamento</h2>
            <p className="text-sm" style={{ color: 'rgba(100,116,139,0.5)' }}>Identidade e estratégia da marca</p>
          </div>
          {isAdmin && !editing && (
            <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg"
              style={{ background: 'rgba(59,130,246,0.08)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.15)' }}>
              <Pencil size={11} /> {isEmpty ? 'Preencher' : 'Editar'}
            </button>
          )}
          {editing && (
            <div className="flex gap-2">
              <button onClick={() => setEditing(false)} className="text-xs px-3 py-2 rounded-lg" style={{ color: 'rgba(100,116,139,0.6)' }}>Cancelar</button>
              <button onClick={save} disabled={saving} className="btn-primary text-xs py-2 px-4">{saving ? 'Salvando…' : 'Salvar'}</button>
            </div>
          )}
        </div>

        {isEmpty && !editing ? (
          <div className="flex flex-col items-center justify-center py-20 rounded-2xl"
            style={{ border: '1px dashed rgba(59,130,246,0.12)', background: 'linear-gradient(145deg,#0d0d22,#0f0f28)' }}>
            <BookOpen size={36} className="mb-3" style={{ color: 'rgba(59,130,246,0.15)' }} />
            <p className="text-sm font-medium text-white mb-1">Posicionamento não preenchido</p>
            <p className="text-xs text-center max-w-xs" style={{ color: 'rgba(100,116,139,0.4)' }}>
              {isAdmin ? 'Clique em "Preencher" para definir o posicionamento estratégico.' : 'A agência ainda não preencheu este campo.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {blocks.map(b => (
              <div key={b.key} className="rounded-2xl p-5"
                style={{ background: 'linear-gradient(145deg,#0d0d22,#0f0f28)', border: `1px solid ${b.color}10` }}>
                <div className="flex items-center gap-2 mb-3">
                  <b.icon size={13} style={{ color: b.color }} />
                  <p className="text-xs font-semibold" style={{ color: b.color }}>{b.label}</p>
                </div>
                {editing ? (
                  <textarea value={(form as any)[b.key]} onChange={e => setForm(f => ({ ...f, [b.key]: e.target.value }))}
                    rows={3} placeholder={b.placeholder} className="input-dark resize-none text-sm w-full" />
                ) : (
                  <p className="text-sm leading-relaxed" style={{ color: (data as any)[b.key] ? 'rgba(148,163,184,0.8)' : 'rgba(100,116,139,0.35)' }}>
                    {(data as any)[b.key] || 'Não preenchido'}
                  </p>
                )}
              </div>
            ))}

            {/* Differentials */}
            <div className="rounded-2xl p-5" style={{ background: 'linear-gradient(145deg,#0d0d22,#0f0f28)', border: '1px solid rgba(245,158,11,0.1)' }}>
              <div className="flex items-center gap-2 mb-3">
                <Zap size={13} style={{ color: '#f59e0b' }} />
                <p className="text-xs font-semibold" style={{ color: '#f59e0b' }}>Diferenciais</p>
              </div>
              {(editing ? form.differentials : pos.differentials).length === 0 && !editing ? (
                <p className="text-sm" style={{ color: 'rgba(100,116,139,0.35)' }}>Não preenchido</p>
              ) : (
                <div className="flex flex-wrap gap-2 mb-3">
                  {(editing ? form.differentials : pos.differentials).map((d: string, i: number) => (
                    <span key={i} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full"
                      style={{ background: 'rgba(245,158,11,0.08)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.15)' }}>
                      {d}
                      {editing && <button onClick={() => setForm(f => ({ ...f, differentials: f.differentials.filter((_: string, j: number) => j !== i) }))}><X size={10} /></button>}
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
                    className="px-3 py-1.5 rounded-lg" style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>
                    <Plus size={13} />
                  </button>
                </div>
              )}
            </div>

            {/* Cases */}
            <div className="rounded-2xl p-5" style={{ background: 'linear-gradient(145deg,#0d0d22,#0f0f28)', border: '1px solid rgba(16,185,129,0.1)' }}>
              <div className="flex items-center gap-2 mb-3">
                <Briefcase size={13} style={{ color: '#10b981' }} />
                <p className="text-xs font-semibold" style={{ color: '#10b981' }}>Cases de Sucesso</p>
              </div>
              {(editing ? form.cases : pos.cases).length === 0 && !editing ? (
                <p className="text-sm" style={{ color: 'rgba(100,116,139,0.35)' }}>Não preenchido</p>
              ) : (
                <div className="space-y-2 mb-3">
                  {(editing ? form.cases : pos.cases).map((c: any, i: number) => (
                    <div key={i} className="flex items-start justify-between gap-3 px-3 py-2.5 rounded-xl"
                      style={{ background: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.1)' }}>
                      <div>
                        <p className="text-xs font-medium text-white">{c.title}</p>
                        {c.result && <p className="text-[11px] mt-0.5" style={{ color: '#34d399' }}>{c.result}</p>}
                      </div>
                      {editing && <button onClick={() => setForm(f => ({ ...f, cases: f.cases.filter((_: any, j: number) => j !== i) }))}><Trash2 size={12} style={{ color: 'rgba(100,116,139,0.4)' }} /></button>}
                    </div>
                  ))}
                </div>
              )}
              {editing && (
                <div className="space-y-2">
                  <input value={newCase.title} onChange={e => setNewCase(c => ({ ...c, title: e.target.value }))} placeholder="Nome do case..." className="input-dark text-sm py-1.5 w-full" />
                  <div className="flex gap-2">
                    <input value={newCase.result} onChange={e => setNewCase(c => ({ ...c, result: e.target.value }))} placeholder="Resultado (ex: +150% de vendas)..." className="input-dark text-sm py-1.5 flex-1" />
                    <button onClick={() => { if (newCase.title.trim()) { setForm(f => ({ ...f, cases: [...f.cases, { ...newCase }] })); setNewCase({ title: '', result: '' }); } }}
                      className="px-3 py-1.5 rounded-lg" style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
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

  function PageMetas() {
    const [editing, setEditing] = useState(false);
    const [localGoals, setLocalGoals] = useState(goals);
    const [saving, setSaving] = useState(false);
    useEffect(() => { setLocalGoals(goals); }, [goals]);

    const METRICS = [
      { metric: 'posts_month', label: 'Posts publicados/mês', unit: 'posts' },
      { metric: 'leads_month', label: 'Leads gerados/mês', unit: 'leads' },
      { metric: 'reach_month', label: 'Alcance médio/mês', unit: 'impressões' },
      { metric: 'revenue', label: 'Faturamento gerado', unit: 'R$' },
      { metric: 'roas', label: 'ROAS mínimo', unit: 'x' },
    ];

    const getCurrentValue = (metric: string) => {
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

    const fmtVal = (metric: string, v: number) => {
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

    return (
      <div className="space-y-6">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-white mb-1">Metas</h2>
            <p className="text-sm" style={{ color: 'rgba(100,116,139,0.5)' }}>Objetivos e progresso em tempo real</p>
          </div>
          {isAdmin && !editing && (
            <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg"
              style={{ background: 'rgba(59,130,246,0.08)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.15)' }}>
              <Pencil size={11} /> {localGoals.length === 0 ? 'Definir metas' : 'Editar metas'}
            </button>
          )}
          {editing && (
            <div className="flex gap-2">
              <button onClick={() => { setEditing(false); setLocalGoals(goals); }} className="text-xs px-3 py-2 rounded-lg" style={{ color: 'rgba(100,116,139,0.6)' }}>Cancelar</button>
              <button onClick={save} disabled={saving} className="btn-primary text-xs py-2 px-4">{saving ? 'Salvando…' : 'Salvar'}</button>
            </div>
          )}
        </div>

        {localGoals.length === 0 && !editing ? (
          <div className="flex flex-col items-center justify-center py-20 rounded-2xl"
            style={{ border: '1px dashed rgba(59,130,246,0.12)', background: 'linear-gradient(145deg,#0d0d22,#0f0f28)' }}>
            <Target size={36} className="mb-3" style={{ color: 'rgba(59,130,246,0.15)' }} />
            <p className="text-sm font-medium text-white mb-1">Nenhuma meta definida</p>
            <p className="text-xs" style={{ color: 'rgba(100,116,139,0.4)' }}>
              {isAdmin ? 'Clique em "Definir metas" para começar.' : 'A agência ainda não definiu as metas.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(editing ? localGoals : goals).map((g: any, i: number) => {
              const current = getCurrentValue(g.metric);
              const pct = g.target > 0 ? Math.min((current / g.target) * 100, 100) : 0;
              const color = pct >= 100 ? '#34d399' : pct >= 70 ? '#60a5fa' : pct >= 40 ? '#f59e0b' : '#f87171';

              return (
                <div key={g.metric || i} className="rounded-2xl p-5"
                  style={{ background: 'linear-gradient(145deg,#0d0d22,#0f0f28)', border: '1px solid rgba(255,255,255,0.04)' }}>
                  {editing ? (
                    <div className="space-y-2">
                      <select value={g.metric}
                        onChange={e => { const m = METRICS.find(x => x.metric === e.target.value); setLocalGoals((prev: any[]) => prev.map((x: any, j: number) => j === i ? { ...x, metric: e.target.value, label: m?.label || x.label, unit: m?.unit || x.unit } : x)); }}
                        className="input-dark text-sm py-1.5 w-full">
                        {METRICS.map(m => <option key={m.metric} value={m.metric}>{m.label}</option>)}
                      </select>
                      <div className="flex gap-2 items-center">
                        <input value={g.label} onChange={e => setLocalGoals((prev: any[]) => prev.map((x: any, j: number) => j === i ? { ...x, label: e.target.value } : x))}
                          placeholder="Label..." className="input-dark text-sm py-1.5 flex-1" />
                        <input type="number" value={g.target} onChange={e => setLocalGoals((prev: any[]) => prev.map((x: any, j: number) => j === i ? { ...x, target: Number(e.target.value) } : x))}
                          className="input-dark text-sm py-1.5 w-20 text-center" />
                        <button onClick={() => setLocalGoals((prev: any[]) => prev.filter((_: any, j: number) => j !== i))}>
                          <Trash2 size={14} style={{ color: 'rgba(248,113,113,0.5)' }} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-xs font-medium mb-4" style={{ color: 'rgba(100,116,139,0.6)' }}>{g.label}</p>
                      <div className="flex items-baseline gap-2 mb-3">
                        <span className="text-3xl font-bold" style={{ color }}>{fmtVal(g.metric, current)}</span>
                        <span className="text-sm" style={{ color: 'rgba(100,116,139,0.4)' }}>
                          / {g.metric === 'revenue' ? fmtR(g.target) : g.metric === 'roas' ? `${g.target}x` : g.metric === 'reach_month' ? fmtN(g.target) : `${g.target} ${g.unit}`}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden mb-2" style={{ background: 'rgba(255,255,255,0.05)' }}>
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color, transition: 'width 0.7s ease' }} />
                      </div>
                      <p className="text-[10px]" style={{ color: 'rgba(100,116,139,0.4)' }}>{pct.toFixed(0)}% da meta</p>
                    </>
                  )}
                </div>
              );
            })}
            {editing && localGoals.length < METRICS.length && (
              <button onClick={() => { const unused = METRICS.find(m => !localGoals.some((g: any) => g.metric === m.metric)); if (unused) setLocalGoals((g: any[]) => [...g, { metric: unused.metric, label: unused.label, target: 0, unit: unused.unit }]); }}
                className="rounded-2xl p-5 flex items-center justify-center gap-2 text-sm transition-colors"
                style={{ border: '1px dashed rgba(59,130,246,0.15)', color: 'rgba(59,130,246,0.4)' }}>
                <Plus size={14} /> Adicionar meta
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  function PageAprovacoes() {
    return pieces.length === 0 ? (
      <div className="text-center py-24">
        <FileImage size={40} className="mx-auto mb-4" style={{ color: 'rgba(100,116,139,0.15)' }} />
        <p className="text-white font-medium mb-1">Nenhum conteúdo ainda</p>
        <p className="text-sm" style={{ color: 'rgba(100,116,139,0.4)' }}>Os conteúdos para aprovação aparecerão aqui.</p>
      </div>
    ) : (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold text-white mb-1">Aprovações</h2>
          <p className="text-sm" style={{ color: 'rgba(100,116,139,0.5)' }}>
            {pendingCount > 0 ? `${pendingCount} peça${pendingCount > 1 ? 's' : ''} aguardando sua aprovação` : 'Tudo aprovado por aqui'}
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {pieces.map(p => (
            <div key={p.id} onClick={() => openDetail(p)}
              className="rounded-2xl overflow-hidden cursor-pointer group transition-all duration-200"
              style={{ background: 'linear-gradient(145deg,#0d0d22,#0f0f28)', border: p.status === 'aguardando_aprovacao' ? '1px solid rgba(245,158,11,0.25)' : '1px solid rgba(255,255,255,0.04)' }}>
              <div className="relative aspect-square overflow-hidden" style={{ background: 'rgba(59,130,246,0.03)' }}>
                {p.media_url ? (
                  <img src={p.media_url} alt={p.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                    <FileImage size={32} style={{ color: 'rgba(59,130,246,0.15)' }} />
                  </div>
                )}
                <div className="absolute top-2 right-2">
                  <span className="text-xs px-2 py-0.5 rounded-md" style={{ background: 'rgba(0,0,0,0.6)', color: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(4px)' }}>
                    {TYPE_LABEL[p.type] || p.type}
                  </span>
                </div>
              </div>
              <div className="p-4">
                <p className="text-sm font-medium text-white mb-2 truncate">{p.title}</p>
                {p.scheduled_date && (
                  <p className="flex items-center gap-1 text-xs mb-3" style={{ color: 'rgba(100,116,139,0.45)' }}>
                    <Calendar size={10} />{format(new Date(p.scheduled_date), "d 'de' MMM", { locale: ptBR })}
                  </p>
                )}
                <StatusBadge status={p.status} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function PageCampanhas() {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold text-white mb-1">Campanhas</h2>
          <p className="text-sm" style={{ color: 'rgba(100,116,139,0.5)' }}>Performance de tráfego pago</p>
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

  function PageCrmPipeline() {
    if (crmLoading) return <CrmSpinner />;
    return (
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-white mb-1">Pipeline</h2>
            <p className="text-sm" style={{ color: 'rgba(100,116,139,0.5)' }}>{crmDeals.length} negócios em aberto</p>
          </div>
          <button onClick={openNewDeal}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white flex-shrink-0"
            style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.2)' }}>
            <Plus size={14} /> Novo negócio
          </button>
        </div>
        {crmDeals.length === 0 ? (
          <div className="text-center py-16 rounded-2xl" style={{ border: '1px dashed rgba(255,255,255,0.06)' }}>
            <Kanban size={32} className="mx-auto mb-3" style={{ color: 'rgba(100,116,139,0.3)' }} />
            <p className="text-sm" style={{ color: 'rgba(100,116,139,0.4)' }}>Nenhum negócio no pipeline</p>
          </div>
        ) : (
          <div className="space-y-6">
            {STAGES_CRM.map(stage => {
              const stageDeals = crmDeals.filter(d => d.stage === stage.id);
              if (stageDeals.length === 0) return null;
              const stageTotal = stageDeals.reduce((sum, d) => sum + (d.value || 0), 0);
              return (
                <div key={stage.id}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: stage.color }} />
                    <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: stage.color }}>{stage.label}</span>
                    <span className="text-xs ml-1" style={{ color: 'rgba(100,116,139,0.4)' }}>{stageDeals.length} · {fmtR(stageTotal)}</span>
                  </div>
                  <div className="space-y-2">
                    {stageDeals.map(d => (
                      <div key={d.id} className="flex items-center gap-4 px-4 py-3 rounded-xl group"
                        style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${stage.color}18` }}>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white">{d.title}</p>
                          {d.contact_name && (
                            <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: 'rgba(100,116,139,0.5)' }}>
                              <Phone size={10} />{d.contact_name}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <div className="text-right">
                            <p className="text-sm font-semibold" style={{ color: stage.id === 'fechado' ? '#34d399' : 'white' }}>{fmtR(d.value || 0)}</p>
                            <p className="text-[10px]" style={{ color: 'rgba(100,116,139,0.4)' }}>{d.probability}%</p>
                          </div>
                          <button onClick={() => openEditDeal(d)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg" style={{ color: 'rgba(100,116,139,0.6)' }}><Pencil size={13} /></button>
                          <button onClick={() => deleteDeal(d.id)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg" style={{ color: 'rgba(248,113,113,0.6)' }}><Trash2 size={13} /></button>
                        </div>
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

  const pageComponents: Record<PageId, JSX.Element> = {
    visao:          <PageVisaoGeral />,
    posicionamento: <PagePosicionamento />,
    metas:          <PageMetas />,
    aprovacoes:     <PageAprovacoes />,
    feed:           <PageFeed />,
    campanhas:      <PageCampanhas />,
    crm_dashboard:  <PageCrmDashboard />,
    crm_contatos:   <PageCrmContatos />,
    crm_pipeline:   <PageCrmPipeline />,
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#05050f' }}>
      <PortalSidebar
        client={client} page={page} setPage={setPage}
        pendingCount={pendingCount} activeCampaignsCount={activeCampaigns.length}
        open={sidebarOpen} onClose={() => setSidebarOpen(false)}
        isAdmin={isAdmin} onBack={() => navigate('/marketing/clients')}
      />

      <main className="flex-1 md:ml-60 overflow-y-auto min-w-0">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 sticky top-0 z-20"
          style={{ background: '#05050f', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <button onClick={() => setSidebarOpen(true)} className="p-1.5 rounded-lg" style={{ color: 'rgba(100,116,139,0.6)' }}>
            <Menu size={20} />
          </button>
          <p className="font-semibold text-white text-sm">{client?.name}</p>
        </div>

        <div className="p-6 md:p-10 max-w-4xl">
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
              {detail.media_url && <img src={detail.media_url} alt={detail.title} className="w-full rounded-2xl object-cover" style={{ maxHeight: '320px' }} />}
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
              {detail.status === 'aguardando_aprovacao' && (
                <div className="space-y-3">
                  <p className="label-dark">Sua decisão</p>
                  <button onClick={handleApprove} disabled={acting}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium"
                    style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)', color: '#34d399' }}>
                    <CheckCircle2 size={16} /> {acting ? 'Aprovando…' : 'Aprovar esta peça'}
                  </button>
                  <button onClick={() => setAdjustModal(true)} disabled={acting}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium"
                    style={{ background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.2)', color: '#f97316' }}>
                    <RotateCcw size={14} /> Solicitar ajuste
                  </button>
                </div>
              )}
              {detail.status === 'aprovado' && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl" style={{ background: 'rgba(52,211,153,0.05)', border: '1px solid rgba(52,211,153,0.12)' }}>
                  <CheckCircle2 size={14} style={{ color: '#34d399' }} />
                  <span className="text-sm" style={{ color: '#34d399' }}>Você aprovou esta peça</span>
                </div>
              )}
              {detail.status === 'ajuste_solicitado' && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl" style={{ background: 'rgba(249,115,22,0.05)', border: '1px solid rgba(249,115,22,0.12)' }}>
                  <RotateCcw size={14} style={{ color: '#f97316' }} />
                  <span className="text-sm" style={{ color: '#f97316' }}>Ajuste solicitado ao time</span>
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
