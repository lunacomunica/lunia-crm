import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import ClientPositioning from './ClientPositioning';
import {
  ArrowLeft, Eye, Plus, Trash2, X, Instagram, Pencil,
  Target, TrendingUp, Users, Zap, Star, DollarSign,
  FileImage, Megaphone, CheckSquare, Save, ExternalLink,
  Clock, CheckCircle2, RotateCcw, Calendar, ChevronDown, ChevronLeft, ChevronRight, Send,
  List, CalendarDays, LayoutGrid,
  Image, Video, MousePointerClick, Link, FileText
} from 'lucide-react';
import { agencyClientsApi, clientPortalApi, contentApi, campaignsApi, tasksApi, clientProjectsApi, contentIdeasApi, metaApi } from '../../api/client';
import PostDetailPanel from './PostDetailPanel';
import TaskDetailDrawer from './TaskDetailDrawer';
import { ContentStatus, Campaign, CampaignCreative, CampaignPlatform, CampaignStatus, CampaignObjective, CreativeType, CreativeStatus } from '../../types';
import { startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type Tab = 'estrategia' | 'operacao' | 'dados' | 'integracao';
type OpTab = 'conteudo' | 'trafego' | 'tarefas' | 'projetos' | 'ideias';

const PROJECT_STATUS: { id: string; label: string; color: string }[] = [
  { id: 'pendente',     label: 'Pendente',     color: '#94a3b8' },
  { id: 'em_andamento', label: 'Em andamento', color: '#60a5fa' },
  { id: 'entregue',     label: 'Entregue',     color: '#34d399' },
  { id: 'pausado',      label: 'Pausado',      color: '#f59e0b' },
  { id: 'cancelado',    label: 'Cancelado',    color: '#f87171' },
];
type ContentView = 'list' | 'calendar' | 'preview';

function toDisplayUrl(url: string): string {
  const m = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (m) return `https://drive.google.com/uc?export=view&id=${m[1]}`;
  return url;
}

function getPostThumbnail(p: any): string | null {
  try {
    const files = JSON.parse(p.media_files || '[]');
    const img = files.find((f: any) => f.type === 'image');
    if (img?.url) return img.url;
  } catch {}
  return p.media_url ? toDisplayUrl(p.media_url) : null;
}

const STATUS_CFG: Record<ContentStatus, { label: string; color: string; bg: string; border: string; icon: any }> = {
  em_criacao:           { label: 'Em Criação',        color: '#94a3b8', bg: 'rgba(148,163,184,0.08)', border: 'rgba(148,163,184,0.2)', icon: FileImage },
  em_revisao:           { label: 'Em Revisão',        color: '#22d3ee', bg: 'rgba(34,211,238,0.08)',  border: 'rgba(34,211,238,0.2)',  icon: Eye },
  aguardando_aprovacao: { label: 'Ag. Aprovação',     color: '#f59e0b', bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.2)',  icon: Clock },
  aprovado:             { label: 'Aprovado',           color: '#60a5fa', bg: 'rgba(59,130,246,0.08)',  border: 'rgba(59,130,246,0.2)',  icon: CheckCircle2 },
  ajuste_solicitado:    { label: 'Ajuste Solicitado', color: '#f87171', bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.2)', icon: RotateCcw },
  agendado:             { label: 'Agendado',           color: '#a78bfa', bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.2)', icon: Calendar },
  publicado:            { label: 'Publicado',          color: '#10b981', bg: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.2)',  icon: Send },
};

const STATUS_ORDER: ContentStatus[] = ['em_criacao','em_revisao','aguardando_aprovacao','aprovado','ajuste_solicitado','agendado','publicado'];
const MONTHS_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

interface FeedBatch {
  id: number;
  name: string;
  agency_client_id: number;
  month: number;
  year: number;
  order_num: number;
  post_count: number;
  approved_count: number;
}

function StatusBadge({ status }: { status: ContentStatus }) {
  const cfg = STATUS_CFG[status];
  const Icon = cfg.icon;
  return (
    <span className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full w-fit"
      style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}>
      <Icon size={10} />{cfg.label}
    </span>
  );
}

function StatusDropdown({ current, onChange }: { current: ContentStatus; onChange: (s: ContentStatus) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
  }, []);
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(o => !o)} className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
        <StatusBadge status={current} />
        <ChevronDown size={11} style={{ color: 'rgba(100,116,139,0.5)' }} />
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-1 right-0 rounded-xl overflow-hidden min-w-44"
          style={{ background: '#0d0d1f', border: '1px solid rgba(59,130,246,0.2)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
          {STATUS_ORDER.map(s => (
            <button key={s} onClick={() => { onChange(s); setOpen(false); }}
              className="w-full flex items-center px-3 py-2 transition-colors"
              style={{ background: s === current ? 'rgba(59,130,246,0.08)' : 'transparent' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(59,130,246,0.06)')}
              onMouseLeave={e => (e.currentTarget.style.background = s === current ? 'rgba(59,130,246,0.08)' : 'transparent')}>
              <StatusBadge status={s} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const CAMP_PLATFORM: Record<CampaignPlatform, { label: string; color: string; bg: string }> = {
  meta:            { label: 'Meta Ads',          color: '#60a5fa', bg: 'rgba(59,130,246,0.12)' },
  google:          { label: 'Google Ads',         color: '#f87171', bg: 'rgba(239,68,68,0.12)' },
  tiktok:          { label: 'TikTok Ads',         color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
  linkedin:        { label: 'LinkedIn Ads',       color: '#38bdf8', bg: 'rgba(56,189,248,0.12)' },
  instagram_boost: { label: 'Turbinar Instagram', color: '#ec4899', bg: 'rgba(236,72,153,0.12)' },
};

const CAMP_STATUS: Record<CampaignStatus, { label: string; color: string; bg: string; border: string }> = {
  rascunho:  { label: 'Rascunho',  color: '#94a3b8', bg: 'rgba(148,163,184,0.08)', border: 'rgba(148,163,184,0.2)' },
  ativa:     { label: 'Ativa',     color: '#34d399', bg: 'rgba(52,211,153,0.1)',   border: 'rgba(52,211,153,0.25)' },
  pausada:   { label: 'Pausada',   color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',   border: 'rgba(245,158,11,0.25)' },
  encerrada: { label: 'Encerrada', color: '#64748b', bg: 'rgba(100,116,139,0.08)', border: 'rgba(100,116,139,0.2)' },
};

const CAMP_OBJECTIVE: Record<CampaignObjective, string> = {
  conversao:      'Conversão',
  trafego:        'Tráfego',
  reconhecimento: 'Reconhecimento',
  leads:          'Geração de Leads',
  vendas:         'Vendas',
};

const CAMP_CREATIVE_TYPE: Record<CreativeType, { label: string; icon: any }> = {
  image:    { label: 'Imagem',    icon: Image },
  video:    { label: 'Vídeo',     icon: Video },
  carousel: { label: 'Carrossel', icon: LayoutGrid },
};

const CAMP_CREATIVE_STATUS: Record<CreativeStatus, { label: string; color: string }> = {
  ativo:     { label: 'Ativo',     color: '#34d399' },
  pausado:   { label: 'Pausado',   color: '#f59e0b' },
  reprovado: { label: 'Reprovado', color: '#f87171' },
};

const GOAL_ICONS: Record<string, any> = { target: Target, trending: TrendingUp, users: Users, zap: Zap, star: Star, dollar: DollarSign };
const fmtR = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const fmtN = (v: number) => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(1)}k` : String(v);

const ctr = (clicks: number, impr: number) => impr > 0 ? ((clicks / impr) * 100).toFixed(2) + '%' : '—';
const cpl = (spent: number, conv: number) => conv > 0 ? fmtR(spent / conv) : '—';
const roasCalc = (rev: number, spent: number) => spent > 0 && rev > 0 ? (rev / spent).toFixed(2) + 'x' : '—';

const emptyCampForm = {
  name: '', platform: 'meta' as CampaignPlatform, status: 'rascunho' as CampaignStatus,
  objective: 'trafego' as CampaignObjective, budget: '', spent: '', revenue: '',
  impressions: '', clicks: '', conversions: '', target_audience: '', utm_link: '',
  start_date: '', end_date: '', notes: '',
};

const emptyCreativeForm = {
  title: '', type: 'image' as CreativeType, media_url: '', headline: '', description: '',
  cta: '', status: 'ativo' as CreativeStatus,
  impressions: '', clicks: '', conversions: '', spend: '',
};

const inputCls = "w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none focus:ring-1 focus:ring-blue-500/40 transition-all";
const inputStyle = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'white' };
const labelCls = "text-xs font-semibold uppercase tracking-wide mb-1.5 block";
const labelStyle = { color: 'rgba(100,116,139,0.5)' };

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
        style={{ borderColor: 'rgba(59,130,246,0.3)', borderTopColor: '#3b82f6' }} />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-6 space-y-4" style={{ background: 'linear-gradient(145deg,#0d0d22,#0f0f28)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <p className={labelCls} style={labelStyle}>{title}</p>
      {children}
    </div>
  );
}

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const cid = Number(id);

  const [tab, setTab] = useState<Tab>('estrategia');
  const [opTab, setOpTab] = useState<OpTab>('conteudo');
  const [loading, setLoading] = useState(true);

  // Data
  const [client, setClient] = useState<any>(null);
  const [positioning, setPositioning] = useState<any>({ icp: '', promise: '', mission: '', differentials: [], cases: [] });
  const [goals, setGoals] = useState<any[]>([]);
  const [batches, setBatches] = useState<FeedBatch[]>([]);
  const [navMonth, setNavMonth] = useState({ month: new Date().getMonth() + 1, year: new Date().getFullYear() });
  const [posts, setPosts] = useState<any[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [contentView, setContentView] = useState<ContentView>('list');
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [ideas, setIdeas] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [taskTypeFilter, setTaskTypeFilter] = useState<'todos' | 'conteudo' | 'trafego' | 'geral'>('todos');
  const [openTaskId, setOpenTaskId] = useState<number | null>(null);
  const [projectModal, setProjectModal] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [projectForm, setProjectForm] = useState({ title: '', description: '', status: 'pendente', due_date: '' });
  const [savingProject, setSavingProject] = useState(false);
  const [deletingProject, setDeletingProject] = useState<number | null>(null);

  const [campDetail, setCampDetail] = useState<Campaign | null>(null);
  const [campModal, setCampModal] = useState(false);
  const [editingCamp, setEditingCamp] = useState<Campaign | null>(null);
  const [campForm, setCampForm] = useState(emptyCampForm);
  const [savingCamp, setSavingCamp] = useState(false);
  const [deletingCamp, setDeletingCamp] = useState<number | null>(null);
  const [creativeModal, setCreativeModal] = useState(false);
  const [editingCreative, setEditingCreative] = useState<CampaignCreative | null>(null);
  const [creativeForm, setCreativeForm] = useState(emptyCreativeForm);
  const [savingCreative, setSavingCreative] = useState(false);

  // Batch modal
  const [batchModal, setBatchModal] = useState(false);
  const [batchForm, setBatchForm] = useState({ month: String(new Date().getMonth() + 1), year: String(new Date().getFullYear()) });
  const [savingBatch, setSavingBatch] = useState(false);

  // Post creation
  const [newPostTitle, setNewPostTitle] = useState('');
  const [showNewPostModal, setShowNewPostModal] = useState(false);
  const [creatingPost, setCreatingPost] = useState(false);
  const [deletingPost, setDeletingPost] = useState<number | null>(null);
  const [selectedPosts, setSelectedPosts] = useState<Set<number>>(new Set());
  const [deletingBulk, setDeletingBulk] = useState(false);
  const [panelPost, setPanelPost] = useState<any | null>(null);

  // Batch workflow modal
  const [batchWorkflowModal, setBatchWorkflowModal] = useState(false);
  const DEFAULT_WORKFLOW_STAGES = [
    { stage: 'copy',    label: 'Copy',    active: true,  assigned_to: '', due_date: '' },
    { stage: 'design',  label: 'Design',  active: true,  assigned_to: '', due_date: '' },
    { stage: 'edicao',  label: 'Edição',  active: false, assigned_to: '', due_date: '' },
    { stage: 'revisao', label: 'Revisão', active: true,  assigned_to: '', due_date: '' },
  ];
  const [workflowStages, setWorkflowStages] = useState(DEFAULT_WORKFLOW_STAGES);
  const [savingWorkflow, setSavingWorkflow] = useState(false);
  const [users, setUsers] = useState<any[]>([]);

  // Saving
  const [savingPos, setSavingPos] = useState(false);
  const [savedPos, setSavedPos] = useState(false);
  const [savingGoals, setSavingGoals] = useState(false);
  const [savingData, setSavingData] = useState(false);

  // Differentials & cases tag editing
  const [diffInput, setDiffInput] = useState('');
  const [caseInput, setCaseInput] = useState('');

  // Goals editing
  const [goalModal, setGoalModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<any>(null);
  const [goalForm, setGoalForm] = useState({ label: '', metric: '', target: '', unit: '', icon: 'target' });

  // Client data form
  const [dataForm, setDataForm] = useState({ name: '', segment: '', instagram_handle: '', contact_name: '', contact_email: '', logo: '' });

  // Instagram connection
  const [igConnected, setIgConnected] = useState(false);
  const [igConnecting, setIgConnecting] = useState(false);

  // Modules (flywheel)
  const [modules, setModules] = useState({ posicionamento: false, marketing_conteudo: false, marketing_trafego: false, comercial: false });
  const [savingModules, setSavingModules] = useState(false);

  const load = async () => {
    setLoading(true);
    const [cRes, posRes, goalsRes] = await Promise.all([
      agencyClientsApi.get(cid),
      clientPortalApi.positioning(cid),
      clientPortalApi.goals(cid),
    ]);
    const c = cRes.data;
    setClient(c);
    setIgConnected(!!c.instagram_user_id);
    setDataForm({ name: c.name, segment: c.segment || '', instagram_handle: c.instagram_handle || '', contact_name: c.contact_name || '', contact_email: c.contact_email || '', logo: c.logo || '' });

    const pos = posRes.data;
    setPositioning({
      icp: pos.icp || '',
      promise: pos.promise || '',
      mission: pos.mission || '',
      differentials: typeof pos.differentials === 'string' ? JSON.parse(pos.differentials || '[]') : (pos.differentials || []),
      cases: typeof pos.cases === 'string' ? JSON.parse(pos.cases || '[]') : (pos.cases || []),
    });
    setGoals(goalsRes.data || []);
    try {
      const mods = typeof c.modules === 'string' ? JSON.parse(c.modules) : (c.modules || {});
      setModules(m => ({ ...m, ...mods }));
    } catch {}
    setLoading(false);
  };

  const loadOp = async () => {
    const [campRes, taskRes, projRes, ideasRes] = await Promise.all([
      campaignsApi.list({ client_id: String(cid) }),
      tasksApi.list({ client_id: String(cid) }),
      clientProjectsApi.list(cid),
      contentIdeasApi.list(cid),
    ]);
    setCampaigns(campRes.data);
    setTasks(taskRes.data || []);
    setProjects(projRes.data || []);
    setIdeas(ideasRes.data || []);
    if (users.length === 0) {
      fetch('/api/users', { headers: { Authorization: `Bearer ${localStorage.getItem('lunia_token')}` } })
        .then(r => r.json()).then(d => setUsers(Array.isArray(d) ? d : [])).catch(() => {});
    }
    setLoadingBatches(true);
    const batchRes = await contentApi.listBatches({ client_id: String(cid) });
    setBatches(batchRes.data);
    setLoadingBatches(false);
  };

  const reloadBatches = async () => {
    const r = await contentApi.listBatches({ client_id: String(cid) });
    setBatches(r.data);
  };

  const selectedBatch_cd = batches.find(b => b.month === navMonth.month && b.year === navMonth.year) ?? null;
  const selectedBatchId = selectedBatch_cd?.id ?? null;
  const prevMonthCd = () => setNavMonth(m => m.month === 1 ? { month: 12, year: m.year - 1 } : { month: m.month - 1, year: m.year });
  const nextMonthCd = () => setNavMonth(m => m.month === 12 ? { month: 1, year: m.year + 1 } : { month: m.month + 1, year: m.year });

  useEffect(() => {
    if (!selectedBatchId) { setPosts([]); return; }
    setLoadingPosts(true);
    contentApi.list({ batch_id: String(selectedBatchId) }).then(r => {
      setPosts(r.data); setLoadingPosts(false);
    });
  }, [selectedBatchId]);

  const handleSaveBatch = async () => {
    if (!batchForm.month) return;
    setSavingBatch(true);
    await contentApi.createBatch({ agency_client_id: cid, month: Number(batchForm.month), year: Number(batchForm.year) });
    setSavingBatch(false); setBatchModal(false);
    await reloadBatches();
    setNavMonth({ month: Number(batchForm.month), year: Number(batchForm.year) });
  };

  const handleBatchWorkflow = async () => {
    if (!selectedBatchId) return;
    setSavingWorkflow(true);
    const r = await contentApi.createBatchWorkflow(selectedBatchId, workflowStages);
    setSavingWorkflow(false);
    setBatchWorkflowModal(false);
    setWorkflowStages(DEFAULT_WORKFLOW_STAGES);
    if (r.data.created > 0) {
      const taskRes = await tasksApi.list({ client_id: String(cid) });
      setTasks(taskRes.data || []);
    }
  };

  const createNewPost = async () => {
    if (!newPostTitle.trim() || !selectedBatchId) return;
    setCreatingPost(true);
    const r = await contentApi.create({ title: newPostTitle.trim(), type: 'post', agency_client_id: cid, batch_id: selectedBatchId, status: 'em_criacao' });
    setCreatingPost(false); setShowNewPostModal(false);
    setPanelPost(r.data);
    const pr = await contentApi.list({ batch_id: String(selectedBatchId) });
    setPosts(pr.data); reloadBatches();
  };

  const handleStatusChange = async (pieceId: number, status: ContentStatus) => {
    await contentApi.updateStatus(pieceId, status);
    setPosts(prev => prev.map(p => p.id === pieceId ? { ...p, status } : p));
    reloadBatches();
  };

  const handleDeletePost = async (id: number) => {
    await contentApi.delete(id); setDeletingPost(null);
    setPosts(prev => prev.filter(p => p.id !== id));
    reloadBatches();
  };

  const handleBulkDelete = async () => {
    setDeletingBulk(true);
    await Promise.all(Array.from(selectedPosts).map(id => contentApi.delete(id)));
    setPosts(prev => prev.filter(p => !selectedPosts.has(p.id)));
    setSelectedPosts(new Set());
    setDeletingBulk(false);
    reloadBatches();
  };

  const toggleSelectPost = (id: number) => setSelectedPosts(prev => {
    const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next;
  });
  const toggleSelectAll = () => setSelectedPosts(
    selectedPosts.size === posts.length ? new Set() : new Set(posts.map((p: any) => p.id))
  );

  useEffect(() => { load(); }, [cid]);
  useEffect(() => {
    if (searchParams.get('meta_connected') === '1') {
      navigate(`/marketing/clients/${cid}`, { replace: true });
    }
  }, [searchParams]);
  useEffect(() => { if (tab === 'operacao' && batches.length === 0 && !loadingBatches) loadOp(); }, [tab]);

  const connectInstagram = async () => {
    setIgConnecting(true);
    try {
      const res = await metaApi.getAuthUrl(cid);
      window.location.href = res.data.url;
    } catch {
      setIgConnecting(false);
    }
  };

  const disconnectInstagram = async () => {
    await metaApi.disconnectIg(cid);
    setIgConnected(false);
  };

  const savePositioning = async () => {
    setSavingPos(true);
    await clientPortalApi.updatePositioning(cid, positioning);
    setSavingPos(false); setSavedPos(true); setTimeout(() => setSavedPos(false), 2000);
  };

  const addDiff = () => {
    if (!diffInput.trim()) return;
    setPositioning((p: any) => ({ ...p, differentials: [...p.differentials, diffInput.trim()] }));
    setDiffInput('');
  };
  const removeDiff = (i: number) => setPositioning((p: any) => ({ ...p, differentials: p.differentials.filter((_: any, idx: number) => idx !== i) }));
  const addCase = () => {
    if (!caseInput.trim()) return;
    setPositioning((p: any) => ({ ...p, cases: [...p.cases, caseInput.trim()] }));
    setCaseInput('');
  };
  const removeCase = (i: number) => setPositioning((p: any) => ({ ...p, cases: p.cases.filter((_: any, idx: number) => idx !== i) }));

  const openNewGoal = () => { setEditingGoal(null); setGoalForm({ label: '', metric: '', target: '', unit: '', icon: 'target' }); setGoalModal(true); };
  const openEditGoal = (g: any) => { setEditingGoal(g); setGoalForm({ label: g.label, metric: g.metric, target: String(g.target), unit: g.unit || '', icon: g.icon || 'target' }); setGoalModal(true); };
  const saveGoal = async () => {
    setSavingGoals(true);
    const updated = editingGoal
      ? goals.map(g => g.id === editingGoal.id ? { ...g, ...goalForm, target: parseFloat(goalForm.target) || 0 } : g)
      : [...goals, { ...goalForm, target: parseFloat(goalForm.target) || 0, id: Date.now() }];
    await clientPortalApi.updateGoals(cid, updated.map(({ id: _id, agency_client_id: _ac, created_at: _ca, ...rest }) => rest));
    const r = await clientPortalApi.goals(cid);
    setGoals(r.data);
    setSavingGoals(false); setGoalModal(false);
  };
  const deleteGoal = async (g: any) => {
    const updated = goals.filter(x => x.id !== g.id);
    await clientPortalApi.updateGoals(cid, updated.map(({ id: _id, agency_client_id: _ac, created_at: _ca, ...rest }) => rest));
    setGoals(updated);
  };

  const openCreateCamp = () => {
    setEditingCamp(null);
    setCampForm(emptyCampForm);
    setCampModal(true);
  };
  const openEditCamp = (c: Campaign) => {
    setEditingCamp(c);
    setCampForm({
      name: c.name, platform: c.platform, status: c.status, objective: c.objective,
      budget: String(c.budget), spent: String(c.spent), revenue: String(c.revenue),
      impressions: String(c.impressions), clicks: String(c.clicks), conversions: String(c.conversions),
      target_audience: c.target_audience || '', utm_link: c.utm_link || '',
      start_date: c.start_date?.slice(0,10) || '', end_date: c.end_date?.slice(0,10) || '',
      notes: c.notes || '',
    });
    setCampModal(true);
  };
  const openCampDetail = async (c: Campaign) => {
    const r = await campaignsApi.get(c.id);
    setCampDetail(r.data);
  };
  const handleSaveCamp = async () => {
    if (!campForm.name.trim()) return;
    setSavingCamp(true);
    const payload = {
      ...campForm,
      agency_client_id: cid,
      budget: Number(campForm.budget) || 0, spent: Number(campForm.spent) || 0,
      revenue: Number(campForm.revenue) || 0, impressions: Number(campForm.impressions) || 0,
      clicks: Number(campForm.clicks) || 0, conversions: Number(campForm.conversions) || 0,
    };
    if (editingCamp) await campaignsApi.update(editingCamp.id, payload);
    else await campaignsApi.create(payload);
    setSavingCamp(false); setCampModal(false);
    const r = await campaignsApi.list({ client_id: String(cid) });
    setCampaigns(r.data);
    if (campDetail && editingCamp && campDetail.id === editingCamp.id) {
      const dr = await campaignsApi.get(editingCamp.id); setCampDetail(dr.data);
    }
  };
  const handleDeleteCamp = async (id: number) => {
    await campaignsApi.delete(id); setDeletingCamp(null);
    if (campDetail?.id === id) setCampDetail(null);
    const r = await campaignsApi.list({ client_id: String(cid) });
    setCampaigns(r.data);
  };
  const openAddCreative = () => { setEditingCreative(null); setCreativeForm(emptyCreativeForm); setCreativeModal(true); };
  const openEditCreative = (cr: CampaignCreative) => {
    setEditingCreative(cr);
    setCreativeForm({
      title: cr.title, type: cr.type, media_url: cr.media_url || '', headline: cr.headline || '',
      description: cr.description || '', cta: cr.cta || '', status: cr.status,
      impressions: String(cr.impressions), clicks: String(cr.clicks),
      conversions: String(cr.conversions), spend: String(cr.spend),
    });
    setCreativeModal(true);
  };
  const handleSaveCreative = async () => {
    if (!campDetail || !creativeForm.title.trim()) return;
    setSavingCreative(true);
    const payload = {
      ...creativeForm,
      impressions: Number(creativeForm.impressions) || 0,
      clicks: Number(creativeForm.clicks) || 0,
      conversions: Number(creativeForm.conversions) || 0,
      spend: Number(creativeForm.spend) || 0,
    };
    if (editingCreative) await campaignsApi.updateCreative(campDetail.id, editingCreative.id, payload);
    else await campaignsApi.addCreative(campDetail.id, payload);
    setSavingCreative(false); setCreativeModal(false);
    const r = await campaignsApi.get(campDetail.id); setCampDetail(r.data);
  };
  const handleDeleteCreative = async (creativeId: number) => {
    if (!campDetail) return;
    await campaignsApi.deleteCreative(campDetail.id, creativeId);
    const r = await campaignsApi.get(campDetail.id); setCampDetail(r.data);
  };

  const saveData = async () => {
    setSavingData(true);
    await agencyClientsApi.update(cid, dataForm);
    setClient((c: any) => ({ ...c, ...dataForm }));
    setSavingData(false);
  };

  const saveModules = async () => {
    setSavingModules(true);
    await agencyClientsApi.updateModules(cid, modules);
    setClient((c: any) => ({ ...c, modules: JSON.stringify(modules) }));
    setSavingModules(false);
  };

  if (loading) return (
    <div className="p-8">
      <Spinner />
    </div>
  );

  const TABS: { id: Tab; label: string; icon: any }[] = [
    { id: 'estrategia', label: 'Estratégia', icon: Star },
    { id: 'operacao',   label: 'Operação',   icon: CheckSquare },
    { id: 'dados',      label: 'Dados',      icon: Pencil },
    { id: 'integracao', label: 'Integração', icon: Link },
  ];

  const OP_TABS: { id: OpTab; label: string; count: number }[] = [
    { id: 'conteudo',  label: 'Conteúdo',  count: batches.length },
    { id: 'trafego',   label: 'Tráfego',   count: campaigns.length },
    { id: 'tarefas',   label: 'Tarefas',   count: tasks.length },
    { id: 'projetos',  label: 'Projetos',  count: projects.length },
    { id: 'ideias',    label: 'Ideias',    count: ideas.length },
  ];

  return (
    <div className="p-4 md:p-8 max-w-5xl animate-fade-up">
      {/* Back + Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-start gap-4">
          <button onClick={() => navigate('/marketing/clients')}
            className="mt-1 p-2 rounded-xl transition-all flex-shrink-0"
            style={{ color: 'rgba(100,116,139,0.5)', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'white')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(100,116,139,0.5)')}>
            <ArrowLeft size={16} />
          </button>
          <div className="flex items-center gap-4">
            {client?.logo ? (
              <img src={client.logo} alt={client.name} className="w-14 h-14 rounded-2xl object-cover flex-shrink-0" />
            ) : (
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-bold flex-shrink-0"
                style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)' }}>
                {client?.name?.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-2xl font-semibold text-white leading-tight">{client?.name}</h1>
              <div className="flex items-center gap-3 mt-1">
                {client?.segment && <span className="text-xs" style={{ color: 'rgba(100,116,139,0.55)' }}>{client.segment}</span>}
                {client?.instagram_handle && (
                  <span className="flex items-center gap-1 text-xs" style={{ color: 'rgba(236,72,153,0.7)' }}>
                    <Instagram size={10} />@{client.instagram_handle}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        <button onClick={() => navigate(`/marketing/portal/${cid}`)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all flex-shrink-0"
          style={{ color: 'rgba(100,116,139,0.6)', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#f59e0b'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(245,158,11,0.2)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(100,116,139,0.6)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)'; }}>
          <Eye size={13} /> Ver como cliente
          <ExternalLink size={11} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-8 p-1 rounded-xl w-fit" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all"
            style={tab === t.id
              ? { background: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.2)' }
              : { color: 'rgba(100,116,139,0.6)', border: '1px solid transparent' }}>
            <t.icon size={14} />{t.label}
          </button>
        ))}
      </div>

      {/* ──────────────────── ESTRATÉGIA ──────────────────── */}
      {tab === 'estrategia' && (
        <div className="space-y-6">
          {/* Posicionamento */}
          <ClientPositioning clientId={cid} />

          {/* Metas */}
          <Section title="Metas do Cliente">
            <div className="space-y-3">
              {goals.length === 0 && (
                <p className="text-sm py-4 text-center" style={{ color: 'rgba(100,116,139,0.4)' }}>
                  Nenhuma meta definida ainda
                </p>
              )}
              {goals.map(g => {
                const Icon = GOAL_ICONS[g.icon] || Target;
                return (
                  <div key={g.id} className="flex items-center gap-4 px-4 py-3 rounded-xl group"
                    style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: 'rgba(59,130,246,0.1)' }}>
                      <Icon size={15} style={{ color: '#60a5fa' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white">{g.label}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'rgba(100,116,139,0.5)' }}>
                        Meta: {fmtN(g.target)}{g.unit ? ` ${g.unit}` : ''}
                      </p>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEditGoal(g)} className="p-1.5 rounded-lg" style={{ color: 'rgba(100,116,139,0.5)' }}><Pencil size={13} /></button>
                      <button onClick={() => deleteGoal(g)} className="p-1.5 rounded-lg" style={{ color: 'rgba(248,113,113,0.5)' }}><Trash2 size={13} /></button>
                    </div>
                  </div>
                );
              })}
              <button onClick={openNewGoal}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium w-full justify-center transition-all"
                style={{ border: '1px dashed rgba(59,130,246,0.2)', color: 'rgba(100,116,139,0.5)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(59,130,246,0.4)'; (e.currentTarget as HTMLElement).style.color = '#60a5fa'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(59,130,246,0.2)'; (e.currentTarget as HTMLElement).style.color = 'rgba(100,116,139,0.5)'; }}>
                <Plus size={14} /> Adicionar meta
              </button>
            </div>
          </Section>
        </div>
      )}

      {/* ──────────────────── OPERAÇÃO ──────────────────── */}
      {tab === 'operacao' && (
        <div className="space-y-6">
          {/* Op sub-tabs */}
          <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            {OP_TABS.map(t => (
              <button key={t.id} onClick={() => setOpTab(t.id)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                style={opTab === t.id
                  ? { background: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.2)' }
                  : { color: 'rgba(100,116,139,0.6)', border: '1px solid transparent' }}>
                {t.label}
                {t.count > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: opTab === t.id ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.06)', color: opTab === t.id ? '#60a5fa' : 'rgba(100,116,139,0.5)' }}>
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Conteúdo — Feed */}
          {opTab === 'conteudo' && (() => {
            const selectedBatch = selectedBatch_cd;
            const calMonth = new Date(navMonth.year, navMonth.month - 1, 1);
            const calDays = eachDayOfInterval({ start: startOfMonth(calMonth), end: endOfMonth(calMonth) });
            const calStartDay = startOfMonth(calMonth).getDay();
            const byDay = (day: Date) => posts.filter((p: any) => p.scheduled_date && isSameDay(new Date(p.scheduled_date + 'T12:00:00'), day));
            const sortedPosts = [...posts].sort((a: any, b: any) => {
              if (!a.scheduled_date) return 1; if (!b.scheduled_date) return -1;
              return a.scheduled_date.localeCompare(b.scheduled_date);
            });
            return (
              <div className="space-y-4">
                {/* Month nav + view toggle */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1">
                    <button onClick={prevMonthCd} className="p-1 rounded-lg transition-all"
                      style={{ color: 'rgba(148,163,184,0.6)', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <ChevronLeft size={13} />
                    </button>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl min-w-36 justify-center"
                      style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)' }}>
                      <span className="text-xs font-medium text-white whitespace-nowrap">
                        {MONTHS_PT[navMonth.month - 1]} {navMonth.year}
                      </span>
                      {selectedBatch && selectedBatch.post_count > 0 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                          style={{ background: 'rgba(59,130,246,0.15)', color: selectedBatch.approved_count === selectedBatch.post_count ? '#10b981' : '#60a5fa' }}>
                          {selectedBatch.approved_count}/{selectedBatch.post_count}
                        </span>
                      )}
                    </div>
                    <button onClick={nextMonthCd} className="p-1 rounded-lg transition-all"
                      style={{ color: 'rgba(148,163,184,0.6)', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <ChevronRight size={13} />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}>
                      {([
                        { id: 'list' as ContentView, icon: List, label: 'Lista' },
                        { id: 'calendar' as ContentView, icon: CalendarDays, label: 'Calendário' },
                        { id: 'preview' as ContentView, icon: LayoutGrid, label: 'Prévia' },
                      ]).map(v => (
                        <button key={v.id} onClick={() => setContentView(v.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-all"
                          style={{ color: contentView === v.id ? '#e2e8f0' : 'rgba(100,116,139,0.5)', background: contentView === v.id ? 'rgba(59,130,246,0.15)' : 'transparent' }}>
                          <v.icon size={12} />{v.label}
                        </button>
                      ))}
                    </div>
                    {selectedBatchId && (
                      <div className="flex items-center gap-2">
                        {posts.length > 0 && (
                          <button onClick={() => { setWorkflowStages(DEFAULT_WORKFLOW_STAGES); setBatchWorkflowModal(true); }}
                            className="text-xs px-2.5 py-1.5 rounded-lg font-medium flex items-center gap-1.5"
                            style={{ background: 'rgba(167,139,250,0.12)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.25)' }}>
                            <CheckSquare size={11} /> Iniciar produção
                          </button>
                        )}
                        <button onClick={() => { setNewPostTitle(''); setShowNewPostModal(true); }}
                          className="btn-primary text-xs px-2.5 py-1.5">
                          <Plus size={11} /> Post
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {loadingBatches ? (
                  <div className="flex justify-center py-8">
                    <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'rgba(59,130,246,0.3)', borderTopColor: '#3b82f6' }} />
                  </div>
                ) : !selectedBatch ? (
                  <div className="text-center py-10">
                    <FileImage size={28} className="mx-auto mb-2 opacity-20" style={{ color: 'rgba(100,116,139,0.5)' }} />
                    <p className="text-sm mb-1" style={{ color: 'rgba(100,116,139,0.5)' }}>Nenhum feed para {MONTHS_PT[navMonth.month - 1]} {navMonth.year}</p>
                    <p className="text-xs mb-4" style={{ color: 'rgba(100,116,139,0.3)' }}>Use as setas ou crie um feed para este mês</p>
                    <button onClick={() => { setBatchForm({ month: String(navMonth.month), year: String(navMonth.year) }); setBatchModal(true); }}
                      className="btn-ghost text-xs px-3 py-1.5 mx-auto"><Plus size={12} /> Criar feed</button>
                  </div>
                ) : (
                  <>

                    {/* Content area */}
                    {loadingPosts ? (
                      <div className="flex justify-center py-8">
                        <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'rgba(59,130,246,0.3)', borderTopColor: '#3b82f6' }} />
                      </div>
                    ) : posts.length === 0 ? (
                      <div className="text-center py-10" style={{ color: 'rgba(100,116,139,0.4)' }}>
                        <FileImage size={28} className="mx-auto mb-2 opacity-30" />
                        <p className="text-sm mb-3">Nenhum post neste feed</p>
                        <button onClick={() => { setNewPostTitle(''); setShowNewPostModal(true); }}
                          className="btn-ghost text-xs px-3 py-1.5 mx-auto"><Plus size={12} /> Adicionar post</button>
                      </div>
                    ) : (
                      <>
                        {/* LISTA */}
                        {contentView === 'list' && (
                          <div className="rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(145deg,#0d0d22,#0f0f28)', border: '1px solid rgba(255,255,255,0.06)' }}>
                            {/* Select-all header */}
                            <div className="flex items-center gap-3 px-5 py-2.5" style={{ borderBottom: '1px solid rgba(59,130,246,0.06)', background: 'rgba(255,255,255,0.01)' }}>
                              <input type="checkbox"
                                checked={selectedPosts.size === posts.length && posts.length > 0}
                                onChange={toggleSelectAll}
                                className="w-3.5 h-3.5 rounded cursor-pointer flex-shrink-0"
                                style={{ accentColor: '#3b82f6' }} />
                              {selectedPosts.size > 0 ? (
                                <div className="flex items-center gap-3 flex-1">
                                  <span className="text-xs" style={{ color: 'rgba(100,116,139,0.6)' }}>{selectedPosts.size} selecionado{selectedPosts.size > 1 ? 's' : ''}</span>
                                  <button onClick={handleBulkDelete} disabled={deletingBulk}
                                    className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg disabled:opacity-40"
                                    style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)' }}>
                                    <Trash2 size={11} /> {deletingBulk ? 'Apagando…' : 'Apagar selecionados'}
                                  </button>
                                </div>
                              ) : (
                                <span className="text-xs flex-1" style={{ color: 'rgba(100,116,139,0.35)' }}>Selecionar todos</span>
                              )}
                            </div>
                            {sortedPosts.map((p: any, i: number) => (
                              <div key={p.id} className="flex items-center gap-3 px-5 py-3 group transition-colors"
                                style={{ borderBottom: i < sortedPosts.length - 1 ? '1px solid rgba(255,255,255,0.04)' : undefined, background: selectedPosts.has(p.id) ? 'rgba(59,130,246,0.04)' : undefined }}
                                onMouseEnter={e => { if (!selectedPosts.has(p.id)) e.currentTarget.style.background = 'rgba(255,255,255,0.01)'; }}
                                onMouseLeave={e => { if (!selectedPosts.has(p.id)) e.currentTarget.style.background = 'transparent'; }}>
                              <input type="checkbox" checked={selectedPosts.has(p.id)} onChange={() => toggleSelectPost(p.id)}
                                onClick={e => e.stopPropagation()}
                                className="w-3.5 h-3.5 rounded cursor-pointer flex-shrink-0"
                                style={{ accentColor: '#3b82f6' }} />
                                <span className="text-[10px] font-mono w-5 flex-shrink-0 text-center" style={{ color: 'rgba(100,116,139,0.35)' }}>
                                  {String(i + 1).padStart(2, '0')}
                                </span>
                                {getPostThumbnail(p) ? (
                                  <img src={getPostThumbnail(p)!} alt={p.title} className="w-9 h-9 rounded-lg object-cover flex-shrink-0" style={{ border: '1px solid rgba(59,130,246,0.12)' }} />
                                ) : (
                                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.1)' }}>
                                    <FileImage size={13} style={{ color: 'rgba(59,130,246,0.35)' }} />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-white truncate">{p.title}</p>
                                  {p.scheduled_date && (
                                    <p className="text-[10px] mt-0.5" style={{ color: 'rgba(100,116,139,0.5)' }}>
                                      {format(new Date(p.scheduled_date + 'T12:00:00'), "d 'de' MMMM", { locale: ptBR })}
                                    </p>
                                  )}
                                </div>
                                <div onClick={e => e.stopPropagation()}>
                                  <StatusDropdown current={p.status} onChange={s => handleStatusChange(p.id, s)} />
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                  <button onClick={() => setPanelPost(p)}
                                    className="p-1.5 rounded-lg transition-all" style={{ color: 'rgba(100,116,139,0.5)' }}
                                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#60a5fa'; (e.currentTarget as HTMLElement).style.background = 'rgba(59,130,246,0.1)'; }}
                                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(100,116,139,0.5)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                  </button>
                                  <button onClick={() => setDeletingPost(p.id)} className="p-1.5 rounded-lg transition-all" style={{ color: 'rgba(100,116,139,0.5)' }}
                                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#f87171'; (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.1)'; }}
                                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(100,116,139,0.5)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* CALENDÁRIO */}
                        {contentView === 'calendar' && (
                          <div className="rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(145deg,#0d0d22,#0f0f28)', border: '1px solid rgba(255,255,255,0.06)' }}>
                            <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(59,130,246,0.08)' }}>
                              <span className="text-sm font-medium text-white capitalize">{format(calMonth, 'MMMM yyyy', { locale: ptBR })}</span>
                              <span className="text-xs" style={{ color: 'rgba(100,116,139,0.5)' }}>{posts.length} posts</span>
                            </div>
                            <div className="grid grid-cols-7" style={{ borderBottom: '1px solid rgba(59,130,246,0.06)' }}>
                              {['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map(d => (
                                <div key={d} className="py-2 text-center text-[10px] font-medium uppercase tracking-wide" style={{ color: 'rgba(100,116,139,0.4)' }}>{d}</div>
                              ))}
                            </div>
                            <div className="grid grid-cols-7">
                              {Array.from({ length: calStartDay }).map((_, i) => (
                                <div key={`e-${i}`} className="min-h-16 p-1" style={{ borderRight: '1px solid rgba(59,130,246,0.04)', borderBottom: '1px solid rgba(59,130,246,0.04)' }} />
                              ))}
                              {calDays.map(day => {
                                const dp = byDay(day);
                                const today = isToday(day);
                                return (
                                  <div key={day.toISOString()} className="min-h-16 p-1 transition-colors"
                                    style={{ borderRight: '1px solid rgba(59,130,246,0.04)', borderBottom: '1px solid rgba(59,130,246,0.04)', background: today ? 'rgba(59,130,246,0.04)' : 'transparent' }}>
                                    <p className="text-[10px] font-medium mb-0.5 w-5 h-5 flex items-center justify-center rounded-full"
                                      style={{ color: today ? '#fff' : 'rgba(148,163,184,0.5)', background: today ? '#3b82f6' : 'transparent' }}>
                                      {format(day, 'd')}
                                    </p>
                                    {dp.map((p: any) => {
                                      const color = STATUS_CFG[p.status as ContentStatus]?.color || '#94a3b8';
                                      return (
                                        <div key={p.id} onClick={() => setPanelPost(p)}
                                          className="flex items-center gap-0.5 px-1 py-0.5 rounded cursor-pointer text-[9px] truncate hover:opacity-80 transition-opacity mb-0.5"
                                          style={{ background: `${color}18`, border: `1px solid ${color}28`, color }}>
                                          <div className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: color }} />{p.title}
                                        </div>
                                      );
                                    })}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* PRÉVIA DO FEED */}
                        {contentView === 'preview' && (
                          <div>
                            {(() => {
                              const previewPosts = [...posts].sort((a: any, b: any) => {
                                if (!a.scheduled_date) return 1;
                                if (!b.scheduled_date) return -1;
                                return b.scheduled_date.localeCompare(a.scheduled_date);
                              });
                              const total = previewPosts.length;
                              return (
                            <>
                            <p className="text-xs mb-2" style={{ color: 'rgba(100,116,139,0.45)' }}>{total} posts · ordem decrescente</p>
                            <div className="grid grid-cols-3 gap-0.5 rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                              {previewPosts.map((p: any, i: number) => {
                                const cfg = STATUS_CFG[p.status as ContentStatus];
                                return (
                                  <div key={p.id} className="relative group cursor-pointer" style={{ aspectRatio: '1' }}
                                    onClick={() => setPanelPost(p)}>
                                    {getPostThumbnail(p) ? (
                                      <img src={getPostThumbnail(p)!} alt={p.title} className="w-full h-full object-cover" />
                                    ) : (
                                      <div className="w-full h-full flex flex-col items-center justify-center gap-1"
                                        style={{ background: 'rgba(59,130,246,0.06)' }}>
                                        <FileImage size={18} style={{ color: 'rgba(59,130,246,0.3)' }} />
                                        <span className="text-[9px] font-mono" style={{ color: 'rgba(100,116,139,0.4)' }}>{String(total - i).padStart(2, '0')}</span>
                                      </div>
                                    )}
                                    <div className="absolute top-1 left-1 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold"
                                      style={{ background: 'rgba(0,0,0,0.55)', color: 'rgba(255,255,255,0.8)' }}>{total - i}</div>
                                    <div className="absolute top-1 right-1 w-2 h-2 rounded-full" style={{ background: cfg.color, boxShadow: `0 0 5px ${cfg.color}` }} />
                                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                      style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(2px)' }}>
                                      <StatusBadge status={p.status} />
                                      <p className="text-white text-[10px] font-medium text-center px-1 leading-tight line-clamp-2">{p.title}</p>
                                      {p.scheduled_date && (
                                        <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
                                          {format(new Date(p.scheduled_date + 'T12:00:00'), "d MMM", { locale: ptBR })}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                              {Array.from({ length: (3 - (total % 3)) % 3 }).map((_, i) => (
                                <div key={`f-${i}`} style={{ aspectRatio: '1', background: 'rgba(255,255,255,0.015)' }} />
                              ))}
                            </div>
                            </>
                              );
                            })()}
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}
              </div>
            );
          })()}

          {/* Tráfego */}
          {opTab === 'trafego' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs" style={{ color: 'rgba(100,116,139,0.5)' }}>
                  {campaigns.length} campanha{campaigns.length !== 1 ? 's' : ''}
                </p>
                <button onClick={openCreateCamp} className="btn-primary text-xs px-3 py-2">
                  <Plus size={13} /> Nova Campanha
                </button>
              </div>

              {campaigns.length === 0 ? (
                <div className="text-center py-12" style={{ color: 'rgba(100,116,139,0.4)' }}>
                  <TrendingUp size={28} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm mb-3">Nenhuma campanha ainda</p>
                  <button onClick={openCreateCamp} className="btn-ghost text-xs px-3 py-1.5 mx-auto">
                    <Plus size={12} /> Criar campanha
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {campaigns.map((c: Campaign) => {
                    const plat = CAMP_PLATFORM[c.platform];
                    const stat = CAMP_STATUS[c.status];
                    const budgetPct = c.budget > 0 ? Math.min((c.spent / c.budget) * 100, 100) : 0;
                    return (
                      <div key={c.id} className="rounded-xl p-4 cursor-pointer group transition-all"
                        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(59,130,246,0.2)')}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)')}
                        onClick={() => openCampDetail(c)}>
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ color: plat.color, background: plat.bg }}>{plat.label}</span>
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ color: stat.color, background: stat.bg, border: `1px solid ${stat.border}` }}>{stat.label}</span>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                            <button onClick={() => openEditCamp(c)} className="p-1.5 rounded-lg"
                              style={{ color: 'rgba(100,116,139,0.5)' }}
                              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#60a5fa'; (e.currentTarget as HTMLElement).style.background = 'rgba(59,130,246,0.1)'; }}
                              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(100,116,139,0.5)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                              <Pencil size={12} />
                            </button>
                            <button onClick={() => setDeletingCamp(c.id)} className="p-1.5 rounded-lg"
                              style={{ color: 'rgba(100,116,139,0.5)' }}
                              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#f87171'; (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.1)'; }}
                              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(100,116,139,0.5)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                        <p className="text-sm font-semibold text-white mb-0.5">{c.name}</p>
                        <p className="text-xs mb-2" style={{ color: 'rgba(100,116,139,0.5)' }}>{CAMP_OBJECTIVE[c.objective]}</p>
                        {c.budget > 0 && (
                          <div className="mb-3">
                            <div className="flex justify-between text-[10px] mb-1" style={{ color: 'rgba(100,116,139,0.5)' }}>
                              <span>Investido: <span className="text-white font-medium">{fmtR(c.spent)}</span></span>
                              <span>Budget: {fmtR(c.budget)}</span>
                            </div>
                            <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                              <div className="h-full rounded-full" style={{ width: `${budgetPct}%`, background: budgetPct >= 90 ? '#f87171' : budgetPct >= 70 ? '#f59e0b' : '#34d399' }} />
                            </div>
                          </div>
                        )}
                        <div className="grid grid-cols-4 gap-2 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                          {[
                            { label: 'Impressões', value: fmtN(c.impressions) },
                            { label: 'Cliques',    value: fmtN(c.clicks) },
                            { label: 'CTR',        value: ctr(c.clicks, c.impressions) },
                            { label: c.revenue > 0 ? 'ROAS' : 'Conv.', value: c.revenue > 0 ? roasCalc(c.revenue, c.spent) : String(c.conversions) },
                          ].map(m => (
                            <div key={m.label} className="text-center">
                              <p className="text-sm font-semibold text-white">{m.value}</p>
                              <p className="text-[9px]" style={{ color: 'rgba(100,116,139,0.45)' }}>{m.label}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Tarefas */}
          {opTab === 'tarefas' && (() => {
            const taskType = (t: any) => t.content_piece_id ? 'conteudo' : t.campaign_id ? 'trafego' : 'geral';
            const filtered = taskTypeFilter === 'todos' ? tasks : tasks.filter(t => taskType(t) === taskTypeFilter);
            const counts = {
              conteudo: tasks.filter(t => taskType(t) === 'conteudo').length,
              trafego:  tasks.filter(t => taskType(t) === 'trafego').length,
              geral:    tasks.filter(t => taskType(t) === 'geral').length,
            };
            const taskContext = (t: any): string | null => {
              if (t.batch_month && t.batch_year) return `${MONTHS_PT[t.batch_month - 1]} ${t.batch_year}`;
              if (t.batch_name) return t.batch_name;
              if (t.campaign_name) return t.campaign_name;
              return null;
            };
            const TYPE_FILTERS = [
              { id: 'todos',    label: 'Todos',     color: '#94a3b8', count: tasks.length },
              { id: 'conteudo', label: 'Conteúdo',  color: '#34d399', count: counts.conteudo },
              { id: 'trafego',  label: 'Tráfego',   color: '#60a5fa', count: counts.trafego },
              { id: 'geral',    label: 'Geral',      color: '#a78bfa', count: counts.geral },
            ] as const;
            return tasks.length === 0 ? (
              <div className="text-center py-12" style={{ color: 'rgba(100,116,139,0.4)' }}>
                <CheckSquare size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">Nenhuma tarefa para este cliente</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Filter chips */}
                <div className="flex gap-2 flex-wrap">
                  {TYPE_FILTERS.map(f => (
                    <button key={f.id} onClick={() => setTaskTypeFilter(f.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
                      style={taskTypeFilter === f.id
                        ? { background: `${f.color}18`, color: f.color, border: `1px solid ${f.color}35` }
                        : { background: 'transparent', color: 'rgba(100,116,139,0.45)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      {taskTypeFilter === f.id && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: f.color }} />}
                      {f.label}
                      <span className="opacity-50">{f.count}</span>
                    </button>
                  ))}
                </div>
                {/* Task list */}
                <div className="space-y-2">
                  {filtered.map((t: any) => {
                    const statusIcon = t.status === 'concluida' ? CheckCircle2 : t.status === 'em_andamento' ? RotateCcw : Clock;
                    const statusColor = t.status === 'concluida' ? '#34d399' : t.status === 'em_andamento' ? '#60a5fa' : 'rgba(100,116,139,0.5)';
                    const priorityColor: Record<string, string> = { urgente: '#f87171', alta: '#f97316', media: '#f59e0b', baixa: '#94a3b8' };
                    const ctx = taskContext(t);
                    const type = taskType(t);
                    const typeColor = type === 'conteudo' ? '#34d399' : type === 'trafego' ? '#60a5fa' : '#a78bfa';
                    return (
                      <div key={t.id} onClick={() => setOpenTaskId(t.id)}
                        className="group flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all hover:brightness-110"
                        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                        {(() => { const I = statusIcon; return <I size={15} style={{ color: statusColor, flexShrink: 0 }} />; })()}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{t.title}</p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-xs" style={{ color: 'rgba(100,116,139,0.5)' }}>{t.assigned_name || 'Sem responsável'}</span>
                            {ctx && (
                              <span className="flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded"
                                style={{ color: typeColor, background: `${typeColor}12` }}>
                                {ctx}
                              </span>
                            )}
                          </div>
                        </div>
                        {t.priority && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                            style={{ color: priorityColor[t.priority] || '#94a3b8', background: `${priorityColor[t.priority] || '#94a3b8'}15` }}>
                            {t.priority}
                          </span>
                        )}
                        {t.due_date && (
                          <span className="text-[10px] flex items-center gap-1 flex-shrink-0" style={{ color: 'rgba(100,116,139,0.4)' }}>
                            <Calendar size={9} />{t.due_date}
                          </span>
                        )}
                        <button onClick={async e => { e.stopPropagation(); await tasksApi.delete(t.id); setTasks(prev => prev.filter((x: any) => x.id !== t.id)); }}
                          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition-all flex-shrink-0"
                          style={{ color: 'rgba(100,116,139,0.5)' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#f87171'; (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.1)'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(100,116,139,0.5)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Projetos — entregas avulsas de marketing */}
          {opTab === 'projetos' && (() => {
            const openProjectModal = (proj?: any) => {
              setEditingProject(proj || null);
              setProjectForm(proj
                ? { title: proj.title, description: proj.description || '', status: proj.status, due_date: proj.due_date || '' }
                : { title: '', description: '', status: 'pendente', due_date: '' });
              setProjectModal(true);
            };
            const saveProject = async () => {
              if (!projectForm.title.trim()) return;
              setSavingProject(true);
              if (editingProject) {
                const r = await clientProjectsApi.update(editingProject.id, projectForm);
                setProjects(prev => prev.map(p => p.id === editingProject.id ? r.data : p));
              } else {
                const r = await clientProjectsApi.create({ agency_client_id: cid, ...projectForm });
                setProjects(prev => [r.data, ...prev]);
              }
              setSavingProject(false);
              setProjectModal(false);
            };
            const confirmDelete = async (id: number) => {
              await clientProjectsApi.delete(id);
              setProjects(prev => prev.filter(p => p.id !== id));
              setDeletingProject(null);
            };
            return (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs" style={{ color: 'rgba(100,116,139,0.4)' }}>Entregas avulsas de marketing</p>
                  <button onClick={() => openProjectModal()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
                    style={{ background: 'rgba(59,130,246,0.1)', color: '#93c5fd', border: '1px solid rgba(59,130,246,0.2)' }}>
                    <Plus size={12} /> Novo projeto
                  </button>
                </div>

                {projects.length === 0 ? (
                  <div className="text-center py-12" style={{ color: 'rgba(100,116,139,0.4)' }}>
                    <Star size={32} className="mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Nenhum projeto cadastrado</p>
                    <p className="text-xs mt-1 opacity-60">Use para entregas avulsas como identidade visual, site, vídeo institucional…</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {projects.map((proj: any) => {
                      const st = PROJECT_STATUS.find(s => s.id === proj.status) || PROJECT_STATUS[0];
                      return (
                        <div key={proj.id} className="flex items-start gap-4 px-4 py-3 rounded-xl group"
                          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{proj.title}</p>
                            {proj.description && (
                              <p className="text-xs mt-0.5 line-clamp-1" style={{ color: 'rgba(100,116,139,0.5)' }}>{proj.description}</p>
                            )}
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                                style={{ color: st.color, background: `${st.color}15` }}>{st.label}</span>
                              {proj.due_date && (
                                <span className="text-[10px] flex items-center gap-1" style={{ color: 'rgba(100,116,139,0.4)' }}>
                                  <Calendar size={9} />{proj.due_date}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                            <button onClick={() => openProjectModal(proj)}
                              className="p-1.5 rounded-lg transition-all"
                              style={{ color: 'rgba(100,116,139,0.5)', background: 'rgba(255,255,255,0.04)' }}>
                              <Pencil size={12} />
                            </button>
                            {deletingProject === proj.id ? (
                              <div className="flex gap-1">
                                <button onClick={() => confirmDelete(proj.id)}
                                  className="px-2 py-1 rounded-lg text-[10px] font-medium"
                                  style={{ background: 'rgba(248,113,113,0.15)', color: '#f87171', border: '1px solid rgba(248,113,113,0.2)' }}>
                                  Confirmar
                                </button>
                                <button onClick={() => setDeletingProject(null)}
                                  className="p-1.5 rounded-lg"
                                  style={{ color: 'rgba(100,116,139,0.5)', background: 'rgba(255,255,255,0.04)' }}>
                                  <X size={12} />
                                </button>
                              </div>
                            ) : (
                              <button onClick={() => setDeletingProject(proj.id)}
                                className="p-1.5 rounded-lg transition-all"
                                style={{ color: 'rgba(100,116,139,0.5)', background: 'rgba(255,255,255,0.04)' }}>
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Project modal */}
                {projectModal && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
                    onClick={e => { if (e.target === e.currentTarget) setProjectModal(false); }}>
                    <div className="w-full max-w-md rounded-2xl p-6 space-y-4"
                      style={{ background: '#0d0d22', border: '1px solid rgba(59,130,246,0.2)', boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }}>
                      <div className="flex items-center justify-between">
                        <h3 className="text-base font-semibold text-white">{editingProject ? 'Editar projeto' : 'Novo projeto'}</h3>
                        <button onClick={() => setProjectModal(false)} style={{ color: 'rgba(100,116,139,0.5)' }}><X size={16} /></button>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(100,116,139,0.6)' }}>Título *</label>
                          <input value={projectForm.title} onChange={e => setProjectForm(p => ({ ...p, title: e.target.value }))}
                            placeholder="Ex: Identidade Visual, Site institucional…"
                            className="w-full px-3 py-2 rounded-xl text-sm text-white outline-none"
                            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }} />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(100,116,139,0.6)' }}>Descrição</label>
                          <textarea value={projectForm.description} onChange={e => setProjectForm(p => ({ ...p, description: e.target.value }))}
                            rows={2} placeholder="Detalhes do projeto…"
                            className="w-full px-3 py-2 rounded-xl text-sm text-white outline-none resize-none"
                            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(100,116,139,0.6)' }}>Status</label>
                            <select value={projectForm.status} onChange={e => setProjectForm(p => ({ ...p, status: e.target.value }))}
                              className="w-full px-3 py-2 rounded-xl text-sm text-white outline-none"
                              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                              {PROJECT_STATUS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(100,116,139,0.6)' }}>Prazo</label>
                            <input type="date" value={projectForm.due_date} onChange={e => setProjectForm(p => ({ ...p, due_date: e.target.value }))}
                              className="w-full px-3 py-2 rounded-xl text-sm text-white outline-none"
                              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }} />
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button onClick={() => setProjectModal(false)}
                          className="flex-1 py-2 rounded-xl text-sm transition-all"
                          style={{ color: 'rgba(100,116,139,0.6)', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                          Cancelar
                        </button>
                        <button onClick={saveProject} disabled={savingProject || !projectForm.title.trim()}
                          className="flex-1 py-2 rounded-xl text-sm font-medium text-white transition-all disabled:opacity-40"
                          style={{ background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.3)' }}>
                          {savingProject ? 'Salvando…' : editingProject ? 'Salvar' : 'Criar projeto'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
          {/* Ideias */}
          {opTab === 'ideias' && (() => {
            const STATUS_IDEAS: Record<string, { label: string; color: string }> = {
              nova:       { label: 'Nova',       color: '#60a5fa' },
              em_analise: { label: 'Em análise', color: '#f59e0b' },
              aprovada:   { label: 'Aprovada',   color: '#34d399' },
              descartada: { label: 'Descartada', color: '#94a3b8' },
            };
            const updateStatus = async (id: number, status: string) => {
              await contentIdeasApi.updateStatus(id, status);
              setIdeas(prev => prev.map(i => i.id === id ? { ...i, status } : i));
            };
            const deleteIdea = async (id: number) => {
              await contentIdeasApi.delete(id);
              setIdeas(prev => prev.filter(i => i.id !== id));
            };
            return ideas.length === 0 ? (
              <div className="text-center py-12" style={{ color: 'rgba(100,116,139,0.4)' }}>
                <Zap size={32} className="mx-auto mb-3 opacity-20" />
                <p className="text-sm">Nenhuma ideia enviada pelo cliente ainda</p>
              </div>
            ) : (
              <div className="space-y-3">
                {ideas.map((idea: any) => {
                  const st = STATUS_IDEAS[idea.status] || STATUS_IDEAS['nova'];
                  return (
                    <div key={idea.id} className="rounded-xl p-4 group"
                      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                      <div className="flex items-start justify-between gap-3 mb-1">
                        <p className="text-sm font-semibold text-white">{idea.title}</p>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <select value={idea.status}
                            onChange={e => updateStatus(idea.id, e.target.value)}
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-full outline-none cursor-pointer"
                            style={{ color: st.color, background: `${st.color}15`, border: `1px solid ${st.color}30` }}>
                            {Object.entries(STATUS_IDEAS).map(([k, v]) => (
                              <option key={k} value={k}>{v.label}</option>
                            ))}
                          </select>
                          <button onClick={() => deleteIdea(idea.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded transition-all"
                            style={{ color: 'rgba(248,113,113,0.5)' }}>
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                      {idea.description && (
                        <p className="text-xs mb-2 leading-relaxed" style={{ color: 'rgba(148,163,184,0.55)' }}>{idea.description}</p>
                      )}
                      {idea.reference_url && (
                        <a href={idea.reference_url} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs hover:opacity-80 transition-opacity"
                          style={{ color: '#60a5fa' }}>
                          <ExternalLink size={10} /> Ver referência
                        </a>
                      )}
                      <p className="text-[10px] mt-2" style={{ color: 'rgba(100,116,139,0.3)' }}>
                        {new Date(idea.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* ──────────────────── DADOS ──────────────────── */}
      {tab === 'dados' && (
        <>
        <Section title="Dados do Cliente">
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls} style={labelStyle}>Nome *</label>
                <input value={dataForm.name} onChange={e => setDataForm(p => ({ ...p, name: e.target.value }))}
                  className={inputCls} style={inputStyle} />
              </div>
              <div>
                <label className={labelCls} style={labelStyle}>Segmento</label>
                <input value={dataForm.segment} onChange={e => setDataForm(p => ({ ...p, segment: e.target.value }))}
                  placeholder="Ex: Varejo, Gastronomia…"
                  className={inputCls} style={inputStyle} />
              </div>
              <div>
                <label className={labelCls} style={labelStyle}>Responsável</label>
                <input value={dataForm.contact_name} onChange={e => setDataForm(p => ({ ...p, contact_name: e.target.value }))}
                  className={inputCls} style={inputStyle} />
              </div>
              <div>
                <label className={labelCls} style={labelStyle}>E-mail do responsável</label>
                <input value={dataForm.contact_email} onChange={e => setDataForm(p => ({ ...p, contact_email: e.target.value }))}
                  type="email" className={inputCls} style={inputStyle} />
              </div>
              <div>
                <label className={labelCls} style={labelStyle}>Instagram handle</label>
                <input value={dataForm.instagram_handle} onChange={e => setDataForm(p => ({ ...p, instagram_handle: e.target.value }))}
                  placeholder="@usuario" className={inputCls} style={inputStyle} />
              </div>
              <div>
                <label className={labelCls} style={labelStyle}>Logo (URL)</label>
                <input value={dataForm.logo} onChange={e => setDataForm(p => ({ ...p, logo: e.target.value }))}
                  placeholder="https://…" className={inputCls} style={inputStyle} />
              </div>
            </div>
            <button onClick={saveData} disabled={savingData || !dataForm.name.trim()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-40"
              style={{ background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.3)' }}>
              <Save size={14} />
              {savingData ? 'Salvando…' : 'Salvar dados'}
            </button>
          </div>
        </Section>

        <Section title="Módulos Ativos (Flywheel)">
          <div className="space-y-4">
            <p className="text-sm" style={{ color: 'rgba(100,116,139,0.6)' }}>
              Defina quais pilares estão ativos para este cliente. O progresso aparece no portal.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {([
                { key: 'posicionamento',      label: 'Posicionamento',       color: '#a78bfa' },
                { key: 'marketing_conteudo',  label: 'Marketing de Conteúdo', color: '#34d399' },
                { key: 'marketing_trafego',   label: 'Marketing de Tráfego',  color: '#60a5fa' },
                { key: 'comercial',           label: 'Comercial',             color: '#fb923c' },
              ] as const).map(({ key, label, color }) => (
                <button key={key}
                  onClick={() => setModules(m => ({ ...m, [key]: !m[key] }))}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all"
                  style={{
                    background: modules[key] ? `${color}15` : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${modules[key] ? color + '40' : 'rgba(255,255,255,0.06)'}`,
                  }}>
                  <div className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0"
                    style={{ background: modules[key] ? color : 'rgba(255,255,255,0.08)', border: `1px solid ${modules[key] ? color : 'rgba(255,255,255,0.1)'}` }}>
                    {modules[key] && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </div>
                  <span className="text-sm font-medium" style={{ color: modules[key] ? color : 'rgba(148,163,184,0.7)' }}>{label}</span>
                </button>
              ))}
            </div>
            <button onClick={saveModules} disabled={savingModules}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-40"
              style={{ background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.3)' }}>
              <Save size={14} />
              {savingModules ? 'Salvando…' : 'Salvar módulos'}
            </button>
          </div>
        </Section>
        </>
      )}

      {/* ──────────────────── INTEGRAÇÃO ──────────────────── */}
      {tab === 'integracao' && (
        <div className="space-y-4">

          {/* Instagram */}
          <div className="rounded-2xl p-6 space-y-5" style={{ background: 'linear-gradient(145deg,#0d0d22,#0f0f28)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(236,72,153,0.1)', border: '1px solid rgba(236,72,153,0.2)' }}>
                  <Instagram size={16} style={{ color: '#ec4899' }} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Instagram Business</p>
                  <p className="text-xs" style={{ color: 'rgba(100,116,139,0.6)' }}>Publicação, agendamento e insights</p>
                </div>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                style={igConnected
                  ? { color: '#10b981', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }
                  : { color: 'rgba(100,116,139,0.5)', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                {igConnected ? 'CONECTADO' : 'NÃO CONECTADO'}
              </span>
            </div>

            {igConnected && client?.instagram_user_id && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(100,116,139,0.5)' }}>Instagram Business Account ID</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 px-4 py-2.5 rounded-xl text-sm font-mono" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(148,163,184,0.8)' }}>
                    {client.instagram_user_id}
                  </div>
                  <button onClick={() => navigator.clipboard.writeText(client.instagram_user_id || '')}
                    className="p-2.5 rounded-xl transition-all" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(100,116,139,0.5)' }}>
                    <FileText size={14} />
                  </button>
                </div>
                {client.instagram_token_expires && (
                  <p className="text-xs" style={{ color: 'rgba(100,116,139,0.4)' }}>
                    Token expira em {new Date(client.instagram_token_expires).toLocaleDateString('pt-BR')}
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-3">
              {igConnected ? (
                <button onClick={disconnectInstagram}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                  style={{ color: '#f87171', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}>
                  <X size={14} /> Desconectar
                </button>
              ) : (
                <button onClick={connectInstagram} disabled={igConnecting}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-40"
                  style={{ color: '#ec4899', background: 'rgba(236,72,153,0.08)', border: '1px solid rgba(236,72,153,0.2)' }}>
                  <Instagram size={14} /> {igConnecting ? 'Redirecionando...' : 'Conectar Instagram'}
                </button>
              )}
            </div>
          </div>

          {/* Meta Ads */}
          <div className="rounded-2xl p-6 space-y-4" style={{ background: 'linear-gradient(145deg,#0d0d22,#0f0f28)', border: '1px solid rgba(255,255,255,0.06)', opacity: 0.6 }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)' }}>
                  <Megaphone size={16} style={{ color: '#60a5fa' }} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Meta Ads</p>
                  <p className="text-xs" style={{ color: 'rgba(100,116,139,0.6)' }}>Métricas reais de campanhas e anúncios</p>
                </div>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ color: '#f59e0b', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                EM BREVE
              </span>
            </div>
            <p className="text-xs" style={{ color: 'rgba(100,116,139,0.5)' }}>
              Requer revisão de permissões <code style={{ color: 'rgba(148,163,184,0.6)' }}>ads_read</code> e <code style={{ color: 'rgba(148,163,184,0.6)' }}>ads_management</code> aprovadas pela Meta.
            </p>
          </div>

        </div>
      )}

      {/* Batch modal */}
      {batchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)' }}>
          <div className="w-full max-w-sm rounded-2xl p-6 space-y-4" style={{ background: '#0d0d22', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-white">Criar Feed</h3>
              <button onClick={() => setBatchModal(false)} style={{ color: 'rgba(100,116,139,0.5)' }}><X size={18} /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls} style={labelStyle}>Mês</label>
                <select value={batchForm.month} onChange={e => setBatchForm(p => ({ ...p, month: e.target.value }))}
                  className={inputCls} style={{ ...inputStyle, cursor: 'pointer' }}>
                  {MONTHS_PT.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls} style={labelStyle}>Ano</label>
                <input type="number" value={batchForm.year} onChange={e => setBatchForm(p => ({ ...p, year: e.target.value }))}
                  min="2024" max="2030" className={inputCls} style={inputStyle} />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setBatchModal(false)} className="flex-1 py-2 rounded-lg text-sm"
                style={{ color: 'rgba(100,116,139,0.6)', border: '1px solid rgba(255,255,255,0.06)' }}>Cancelar</button>
              <button onClick={handleSaveBatch} disabled={savingBatch}
                className="flex-1 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-40"
                style={{ background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.3)' }}>
                {savingBatch ? 'Criando…' : 'Criar Feed'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch workflow modal */}
      {batchWorkflowModal && selectedBatch_cd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)' }}
          onClick={() => setBatchWorkflowModal(false)}>
          <div className="w-full max-w-md rounded-2xl overflow-hidden" style={{ background: '#0d0d22', border: '1px solid rgba(167,139,250,0.2)' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid rgba(167,139,250,0.1)' }}>
              <div>
                <p className="text-xs font-medium mb-0.5" style={{ color: 'rgba(167,139,250,0.6)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Produção em lote</p>
                <h3 className="text-base font-semibold text-white">{selectedBatch_cd.name}</h3>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(100,116,139,0.5)' }}>
                  {selectedBatch_cd.post_count} post{selectedBatch_cd.post_count !== 1 ? 's' : ''} · tasks criadas para todos
                </p>
              </div>
              <button onClick={() => setBatchWorkflowModal(false)} style={{ color: 'rgba(100,116,139,0.5)' }}><X size={18} /></button>
            </div>
            <div className="p-6 space-y-3">
              {workflowStages.map((s, i) => (
                <div key={s.stage} className="rounded-xl p-3 transition-all"
                  style={{ background: s.active ? 'rgba(167,139,250,0.06)' : 'rgba(255,255,255,0.02)', border: s.active ? '1px solid rgba(167,139,250,0.15)' : '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="flex items-center gap-3 mb-2">
                    <button onClick={() => setWorkflowStages(prev => prev.map((st, j) => j === i ? { ...st, active: !st.active } : st))}
                      className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-all"
                      style={{ background: s.active ? '#a78bfa' : 'rgba(255,255,255,0.05)', border: s.active ? '1px solid #a78bfa' : '1px solid rgba(255,255,255,0.1)' }}>
                      {s.active && <span style={{ color: 'white', fontSize: 10, lineHeight: 1 }}>✓</span>}
                    </button>
                    <span className="text-sm font-medium" style={{ color: s.active ? '#e2e8f0' : 'rgba(100,116,139,0.4)' }}>{s.label}</span>
                  </div>
                  {s.active && (
                    <div className="grid grid-cols-2 gap-2 pl-7">
                      <div>
                        <label className="text-[10px] mb-1 block" style={{ color: 'rgba(100,116,139,0.5)' }}>Responsável</label>
                        <select value={s.assigned_to}
                          onChange={e => setWorkflowStages(prev => prev.map((st, j) => j === i ? { ...st, assigned_to: e.target.value } : st))}
                          className="input-dark w-full text-xs py-1.5">
                          <option value="">Sem responsável</option>
                          {users.map(u => <option key={u.id} value={u.id}>{u.name}{u.job_title ? ` — ${u.job_title}` : ''}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] mb-1 block" style={{ color: 'rgba(100,116,139,0.5)' }}>Prazo</label>
                        <input type="date" value={s.due_date}
                          onChange={e => setWorkflowStages(prev => prev.map((st, j) => j === i ? { ...st, due_date: e.target.value } : st))}
                          className="input-dark w-full text-xs py-1.5" />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-2 px-6 pb-6">
              <button onClick={() => setBatchWorkflowModal(false)} className="flex-1 py-2 rounded-lg text-sm"
                style={{ color: 'rgba(100,116,139,0.6)', border: '1px solid rgba(255,255,255,0.06)' }}>Cancelar</button>
              <button onClick={handleBatchWorkflow} disabled={savingWorkflow || workflowStages.every(s => !s.active)}
                className="flex-1 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-40"
                style={{ background: 'rgba(167,139,250,0.2)', border: '1px solid rgba(167,139,250,0.3)' }}>
                {savingWorkflow ? 'Criando…' : `Iniciar produção`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New post modal */}
      {showNewPostModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)' }}>
          <div className="w-full max-w-sm rounded-2xl overflow-hidden" style={{ background: '#0d0d22', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid rgba(59,130,246,0.1)' }}>
              <div>
                <p className="text-xs font-medium mb-0.5" style={{ color: 'rgba(100,116,139,0.5)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Novo post</p>
                <h3 className="text-base font-semibold text-white">{selectedBatch_cd?.name}</h3>
              </div>
              <button onClick={() => setShowNewPostModal(false)} style={{ color: 'rgba(100,116,139,0.5)' }}><X size={18} /></button>
            </div>
            <div className="p-6">
              <label className={labelCls} style={labelStyle}>Título *</label>
              <input value={newPostTitle} onChange={e => setNewPostTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && createNewPost()}
                placeholder="Ex: Lançamento produto X" className={inputCls} style={inputStyle} autoFocus />
            </div>
            <div className="flex gap-2 px-6 pb-6">
              <button onClick={() => setShowNewPostModal(false)} className="flex-1 py-2 rounded-lg text-sm"
                style={{ color: 'rgba(100,116,139,0.6)', border: '1px solid rgba(255,255,255,0.06)' }}>Cancelar</button>
              <button onClick={createNewPost} disabled={creatingPost || !newPostTitle.trim()}
                className="flex-1 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-40"
                style={{ background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.3)' }}>
                {creatingPost ? 'Criando…' : 'Criar Post'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete post confirm */}
      {deletingPost !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)' }}>
          <div className="w-full max-w-sm rounded-2xl p-6" style={{ background: '#0d0d22', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)' }}>
              <Trash2 size={16} style={{ color: '#f87171' }} />
            </div>
            <h3 className="text-white font-medium mb-2">Excluir post?</h3>
            <p className="text-sm mb-5" style={{ color: 'rgba(148,163,184,0.55)' }}>Esta ação não pode ser desfeita.</p>
            <div className="flex gap-2">
              <button onClick={() => setDeletingPost(null)} className="flex-1 py-2 rounded-lg text-sm" style={{ color: 'rgba(100,116,139,0.6)', border: '1px solid rgba(255,255,255,0.06)' }}>Cancelar</button>
              <button onClick={() => handleDeletePost(deletingPost)} className="flex-1 py-2 rounded-lg text-sm font-medium" style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)' }}>Excluir</button>
            </div>
          </div>
        </div>
      )}

      {panelPost && (
        <PostDetailPanel
          post={panelPost}
          onClose={() => setPanelPost(null)}
          onUpdated={updated => {
            setPosts(prev => prev.map(p => p.id === updated.id ? updated : p));
            setPanelPost(updated);
            reloadBatches();
          }}
          onDeleted={() => {
            setPosts(prev => prev.filter(p => p.id !== panelPost.id));
            setPanelPost(null);
            reloadBatches();
          }}
        />
      )}

      {/* Campaign detail panel */}
      {campDetail && (
        <div className="fixed inset-0 flex items-center justify-end z-50 animate-fade"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
          onClick={() => setCampDetail(null)}>
          <div className="h-full w-full max-w-xl overflow-y-auto"
            style={{ background: '#07071a', borderLeft: '1px solid rgba(59,130,246,0.12)', boxShadow: '-20px 0 60px rgba(0,0,0,0.7)' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 sticky top-0 z-10"
              style={{ background: '#07071a', borderBottom: '1px solid rgba(59,130,246,0.08)' }}>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ color: CAMP_PLATFORM[campDetail.platform].color, background: CAMP_PLATFORM[campDetail.platform].bg }}>{CAMP_PLATFORM[campDetail.platform].label}</span>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ color: CAMP_STATUS[campDetail.status].color, background: CAMP_STATUS[campDetail.status].bg, border: `1px solid ${CAMP_STATUS[campDetail.status].border}` }}>{CAMP_STATUS[campDetail.status].label}</span>
                </div>
                <p className="text-base font-semibold text-white">{campDetail.name}</p>
                <p className="text-xs" style={{ color: 'rgba(100,116,139,0.5)' }}>{CAMP_OBJECTIVE[campDetail.objective]}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => { openEditCamp(campDetail); setCampDetail(null); }} className="p-1.5 rounded-lg"
                  style={{ color: 'rgba(100,116,139,0.5)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#60a5fa')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(100,116,139,0.5)')}>
                  <Pencil size={15} />
                </button>
                <button onClick={() => setCampDetail(null)} style={{ color: 'rgba(100,116,139,0.5)' }}><X size={18} /></button>
              </div>
            </div>

            <div className="p-5 space-y-5">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Investido',   value: fmtR(campDetail.spent),        sub: `Budget ${fmtR(campDetail.budget)}` },
                  { label: 'Impressões',  value: fmtN(campDetail.impressions),   sub: null },
                  { label: 'Cliques',     value: fmtN(campDetail.clicks),        sub: `CTR ${ctr(campDetail.clicks, campDetail.impressions)}` },
                  { label: 'Conversões',  value: String(campDetail.conversions), sub: `CPL ${cpl(campDetail.spent, campDetail.conversions)}` },
                  { label: 'CPC',         value: campDetail.clicks > 0 ? fmtR(campDetail.spent / campDetail.clicks) : '—', sub: null },
                  { label: 'ROAS',        value: roasCalc(campDetail.revenue, campDetail.spent), sub: campDetail.revenue > 0 ? fmtR(campDetail.revenue) : 'sem receita' },
                ].map(m => (
                  <div key={m.label} className="rounded-xl px-3 py-3 text-center"
                    style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <p className="text-base font-semibold text-white">{m.value}</p>
                    <p className="text-[10px]" style={{ color: 'rgba(100,116,139,0.5)' }}>{m.label}</p>
                    {m.sub && <p className="text-[9px] mt-0.5" style={{ color: 'rgba(100,116,139,0.35)' }}>{m.sub}</p>}
                  </div>
                ))}
              </div>

              {campDetail.budget > 0 && (
                <div className="rounded-xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="flex justify-between text-xs mb-2">
                    <span style={{ color: 'rgba(148,163,184,0.7)' }}>Budget utilizado</span>
                    <span className="font-medium text-white">{((campDetail.spent / campDetail.budget) * 100).toFixed(1)}%</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <div className="h-full rounded-full"
                      style={{ width: `${Math.min((campDetail.spent / campDetail.budget) * 100, 100)}%`, background: 'linear-gradient(90deg,#34d399,#60a5fa)' }} />
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {campDetail.target_audience && (
                  <div className="flex gap-3">
                    <Users size={14} className="flex-shrink-0 mt-0.5" style={{ color: 'rgba(100,116,139,0.5)' }} />
                    <div>
                      <p className="text-[10px] mb-0.5" style={{ color: 'rgba(100,116,139,0.4)' }}>Público-alvo</p>
                      <p className="text-sm" style={{ color: 'rgba(148,163,184,0.8)' }}>{campDetail.target_audience}</p>
                    </div>
                  </div>
                )}
                {campDetail.utm_link && (
                  <div className="flex gap-3 items-start">
                    <Link size={14} className="flex-shrink-0 mt-0.5" style={{ color: 'rgba(100,116,139,0.5)' }} />
                    <div className="min-w-0">
                      <p className="text-[10px] mb-0.5" style={{ color: 'rgba(100,116,139,0.4)' }}>Link / UTM</p>
                      <a href={campDetail.utm_link} target="_blank" rel="noreferrer"
                        className="text-xs break-all flex items-center gap-1 hover:opacity-80"
                        style={{ color: '#60a5fa' }} onClick={e => e.stopPropagation()}>
                        {campDetail.utm_link} <ExternalLink size={10} />
                      </a>
                    </div>
                  </div>
                )}
                {(campDetail.start_date || campDetail.end_date) && (
                  <div className="flex gap-3">
                    <FileText size={14} className="flex-shrink-0 mt-0.5" style={{ color: 'rgba(100,116,139,0.5)' }} />
                    <div>
                      <p className="text-[10px] mb-0.5" style={{ color: 'rgba(100,116,139,0.4)' }}>Período</p>
                      <p className="text-sm" style={{ color: 'rgba(148,163,184,0.8)' }}>
                        {campDetail.start_date ? format(new Date(campDetail.start_date + 'T12:00:00'), "d MMM yyyy", { locale: ptBR }) : '?'}
                        {' → '}
                        {campDetail.end_date ? format(new Date(campDetail.end_date + 'T12:00:00'), "d MMM yyyy", { locale: ptBR }) : 'Em aberto'}
                      </p>
                    </div>
                  </div>
                )}
                {campDetail.notes && (
                  <div className="flex gap-3">
                    <FileText size={14} className="flex-shrink-0 mt-0.5" style={{ color: 'rgba(100,116,139,0.5)' }} />
                    <div>
                      <p className="text-[10px] mb-0.5" style={{ color: 'rgba(100,116,139,0.4)' }}>Observações</p>
                      <p className="text-sm whitespace-pre-wrap" style={{ color: 'rgba(148,163,184,0.8)' }}>{campDetail.notes}</p>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="label-dark flex items-center gap-2"><Image size={12} />Criativos ({campDetail.creatives?.length || 0})</p>
                  <button onClick={openAddCreative} className="flex items-center gap-1.5 text-xs hover:opacity-70"
                    style={{ color: '#60a5fa' }}>
                    <Plus size={12} /> Adicionar
                  </button>
                </div>
                {!campDetail.creatives?.length ? (
                  <p className="text-xs" style={{ color: 'rgba(100,116,139,0.4)' }}>Nenhum criativo ainda</p>
                ) : (
                  <div className="space-y-3">
                    {campDetail.creatives.map(cr => {
                      const TypeIcon = CAMP_CREATIVE_TYPE[cr.type].icon;
                      const cs = CAMP_CREATIVE_STATUS[cr.status];
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
                                  <button onClick={() => openEditCreative(cr)} className="p-1 rounded"
                                    style={{ color: 'rgba(100,116,139,0.5)' }}
                                    onMouseEnter={e => (e.currentTarget.style.color = '#60a5fa')}
                                    onMouseLeave={e => (e.currentTarget.style.color = 'rgba(100,116,139,0.5)')}>
                                    <Pencil size={10} />
                                  </button>
                                  <button onClick={() => handleDeleteCreative(cr.id)} className="p-1 rounded"
                                    style={{ color: 'rgba(100,116,139,0.5)' }}
                                    onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
                                    onMouseLeave={e => (e.currentTarget.style.color = 'rgba(100,116,139,0.5)')}>
                                    <X size={10} />
                                  </button>
                                </div>
                              </div>
                              {cr.headline && <p className="text-xs truncate mb-2" style={{ color: 'rgba(148,163,184,0.6)' }}>{cr.headline}</p>}
                              <div className="flex gap-3 text-[10px]" style={{ color: 'rgba(100,116,139,0.5)' }}>
                                <span><span className="text-white font-medium">{fmtN(cr.impressions)}</span> impr.</span>
                                <span><span className="text-white font-medium">{fmtN(cr.clicks)}</span> cliques</span>
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

      {/* Campaign modal */}
      {campModal && (
        <div className="fixed inset-0 flex items-center justify-center z-[60] p-4 animate-fade"
          style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)' }}>
          <div className="modal-card w-full max-w-2xl animate-fade-up">
            <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid rgba(59,130,246,0.1)' }}>
              <div>
                <p className="section-label mb-0.5">{editingCamp ? 'Editar' : 'Nova'}</p>
                <h2 className="text-lg font-light text-white">{editingCamp ? editingCamp.name : 'Criar Campanha'}</h2>
              </div>
              <button onClick={() => setCampModal(false)} style={{ color: 'rgba(100,116,139,0.6)' }}><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="label-dark">Nome da campanha *</label>
                  <input value={campForm.name} onChange={e => setCampForm({ ...campForm, name: e.target.value })} className="input-dark" placeholder="Ex: Coleção Verão — Conversão" autoFocus />
                </div>
                <div>
                  <label className="label-dark">Plataforma</label>
                  <select value={campForm.platform} onChange={e => setCampForm({ ...campForm, platform: e.target.value as CampaignPlatform })} className="input-dark" style={{ cursor: 'pointer' }}>
                    {(Object.keys(CAMP_PLATFORM) as CampaignPlatform[]).map(p => <option key={p} value={p}>{CAMP_PLATFORM[p].label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label-dark">Status</label>
                  <select value={campForm.status} onChange={e => setCampForm({ ...campForm, status: e.target.value as CampaignStatus })} className="input-dark" style={{ cursor: 'pointer' }}>
                    {(Object.keys(CAMP_STATUS) as CampaignStatus[]).map(s => <option key={s} value={s}>{CAMP_STATUS[s].label}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="label-dark">Objetivo</label>
                  <select value={campForm.objective} onChange={e => setCampForm({ ...campForm, objective: e.target.value as CampaignObjective })} className="input-dark" style={{ cursor: 'pointer' }}>
                    {(Object.keys(CAMP_OBJECTIVE) as CampaignObjective[]).map(o => <option key={o} value={o}>{CAMP_OBJECTIVE[o]}</option>)}
                  </select>
                </div>
              </div>

              <p className="label-dark pt-2">Orçamento & Métricas</p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Budget (R$)', key: 'budget' }, { label: 'Investido (R$)', key: 'spent' },
                  { label: 'Receita (R$)', key: 'revenue' }, { label: 'Impressões', key: 'impressions' },
                  { label: 'Cliques', key: 'clicks' }, { label: 'Conversões', key: 'conversions' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="label-dark">{f.label}</label>
                    <input type="number" min="0" value={(campForm as any)[f.key]}
                      onChange={e => setCampForm({ ...campForm, [f.key]: e.target.value })} className="input-dark" />
                  </div>
                ))}
              </div>

              <p className="label-dark pt-2">Configurações</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-dark">Início</label>
                  <input type="date" value={campForm.start_date} onChange={e => setCampForm({ ...campForm, start_date: e.target.value })} className="input-dark" />
                </div>
                <div>
                  <label className="label-dark">Fim</label>
                  <input type="date" value={campForm.end_date} onChange={e => setCampForm({ ...campForm, end_date: e.target.value })} className="input-dark" />
                </div>
                <div className="col-span-2">
                  <label className="label-dark">Público-alvo</label>
                  <input value={campForm.target_audience} onChange={e => setCampForm({ ...campForm, target_audience: e.target.value })} className="input-dark" placeholder="Ex: Mulheres 25-40, SP e RJ" />
                </div>
                <div className="col-span-2">
                  <label className="label-dark">Link / UTM</label>
                  <input value={campForm.utm_link} onChange={e => setCampForm({ ...campForm, utm_link: e.target.value })} className="input-dark" placeholder="https://…?utm_source=meta" />
                </div>
                <div className="col-span-2">
                  <label className="label-dark">Observações</label>
                  <textarea value={campForm.notes} onChange={e => setCampForm({ ...campForm, notes: e.target.value })} rows={2} className="input-dark resize-none" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={() => setCampModal(false)} className="btn-ghost flex-1 justify-center">Cancelar</button>
              <button onClick={handleSaveCamp} disabled={savingCamp || !campForm.name.trim()} className="btn-primary flex-1 justify-center">
                {savingCamp ? 'Salvando…' : editingCamp ? 'Salvar' : 'Criar Campanha'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Creative modal */}
      {creativeModal && campDetail && (
        <div className="fixed inset-0 flex items-center justify-center z-[70] p-4 animate-fade"
          style={{ background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(10px)' }}>
          <div className="modal-card w-full max-w-lg animate-fade-up">
            <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid rgba(59,130,246,0.1)' }}>
              <h2 className="text-lg font-light text-white">{editingCreative ? 'Editar Criativo' : 'Novo Criativo'}</h2>
              <button onClick={() => setCreativeModal(false)} style={{ color: 'rgba(100,116,139,0.6)' }}><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="label-dark">Título *</label>
                  <input value={creativeForm.title} onChange={e => setCreativeForm({ ...creativeForm, title: e.target.value })} className="input-dark" placeholder="Ex: Look Azul Marinho" autoFocus />
                </div>
                <div>
                  <label className="label-dark">Tipo</label>
                  <select value={creativeForm.type} onChange={e => setCreativeForm({ ...creativeForm, type: e.target.value as CreativeType })} className="input-dark" style={{ cursor: 'pointer' }}>
                    {(Object.keys(CAMP_CREATIVE_TYPE) as CreativeType[]).map(t => <option key={t} value={t}>{CAMP_CREATIVE_TYPE[t].label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label-dark">Status</label>
                  <select value={creativeForm.status} onChange={e => setCreativeForm({ ...creativeForm, status: e.target.value as CreativeStatus })} className="input-dark" style={{ cursor: 'pointer' }}>
                    {(Object.keys(CAMP_CREATIVE_STATUS) as CreativeStatus[]).map(s => <option key={s} value={s}>{CAMP_CREATIVE_STATUS[s].label}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="label-dark">URL da mídia</label>
                  <input value={creativeForm.media_url} onChange={e => setCreativeForm({ ...creativeForm, media_url: e.target.value })} className="input-dark" placeholder="Link da imagem ou vídeo" />
                </div>
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
              <button onClick={handleSaveCreative} disabled={savingCreative || !creativeForm.title.trim()} className="btn-primary flex-1 justify-center">
                {savingCreative ? 'Salvando…' : editingCreative ? 'Salvar' : 'Adicionar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete campaign confirm */}
      {deletingCamp !== null && (
        <div className="fixed inset-0 flex items-center justify-center z-[60] p-4 animate-fade"
          style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)' }}>
          <div className="modal-card w-full max-w-sm p-6 animate-fade-up">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)' }}>
              <Trash2 size={16} style={{ color: '#f87171' }} />
            </div>
            <h3 className="text-white font-medium mb-2">Excluir campanha?</h3>
            <p className="text-sm mb-5" style={{ color: 'rgba(148,163,184,0.55)' }}>Os criativos vinculados também serão removidos.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeletingCamp(null)} className="btn-ghost flex-1 justify-center">Cancelar</button>
              <button onClick={() => handleDeleteCamp(deletingCamp)} className="btn-danger flex-1 justify-center">Excluir</button>
            </div>
          </div>
        </div>
      )}

      {/* Goal modal */}
      {goalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-sm rounded-2xl p-6 space-y-4" style={{ background: '#0d0d22', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-white">{editingGoal ? 'Editar meta' : 'Nova meta'}</h3>
              <button onClick={() => setGoalModal(false)} style={{ color: 'rgba(100,116,139,0.5)' }}><X size={18} /></button>
            </div>
            <input value={goalForm.label} onChange={e => setGoalForm(p => ({ ...p, label: e.target.value }))}
              placeholder="Nome da meta (ex: Seguidores)" className={inputCls} style={inputStyle} />
            <div className="grid grid-cols-2 gap-3">
              <input value={goalForm.target} onChange={e => setGoalForm(p => ({ ...p, target: e.target.value }))}
                type="number" placeholder="Valor alvo" className={inputCls} style={inputStyle} />
              <input value={goalForm.unit} onChange={e => setGoalForm(p => ({ ...p, unit: e.target.value }))}
                placeholder="Unidade (seguidores…)" className={inputCls} style={inputStyle} />
            </div>
            <select value={goalForm.icon} onChange={e => setGoalForm(p => ({ ...p, icon: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={{ background: '#0d0d22', border: '1px solid rgba(255,255,255,0.08)', color: 'white' }}>
              {Object.keys(GOAL_ICONS).map(k => <option key={k} value={k}>{k}</option>)}
            </select>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setGoalModal(false)} className="flex-1 py-2 rounded-lg text-sm"
                style={{ color: 'rgba(100,116,139,0.6)', border: '1px solid rgba(255,255,255,0.06)' }}>Cancelar</button>
              <button onClick={saveGoal} disabled={savingGoals || !goalForm.label.trim()}
                className="flex-1 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-40"
                style={{ background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.3)' }}>
                {savingGoals ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {openTaskId && (
        <TaskDetailDrawer
          taskId={openTaskId}
          onClose={() => setOpenTaskId(null)}
          onUpdated={() => tasksApi.list({ client_id: String(cid) }).then(r => setTasks(r.data || []))}
        />
      )}
    </div>
  );
}
