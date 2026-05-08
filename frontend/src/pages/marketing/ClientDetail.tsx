import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Eye, Plus, Trash2, X, Instagram, Pencil,
  Target, TrendingUp, Users, Zap, Star, DollarSign,
  FileImage, Megaphone, CheckSquare, Save, ExternalLink,
  Clock, CheckCircle2, RotateCcw, Calendar, ChevronDown, Send,
  List, CalendarDays, LayoutGrid
} from 'lucide-react';
import { agencyClientsApi, clientPortalApi, contentApi, campaignsApi, tasksApi } from '../../api/client';
import { ContentStatus } from '../../types';
import { startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type Tab = 'estrategia' | 'operacao' | 'dados';
type OpTab = 'conteudo' | 'trafego' | 'projetos';
type ContentView = 'list' | 'calendar' | 'preview';

const STATUS_CFG: Record<ContentStatus, { label: string; color: string; bg: string; border: string; icon: any }> = {
  em_criacao:           { label: 'Em Criação',        color: '#94a3b8', bg: 'rgba(148,163,184,0.08)', border: 'rgba(148,163,184,0.2)', icon: FileImage },
  em_revisao:           { label: 'Em Revisão',        color: '#60a5fa', bg: 'rgba(59,130,246,0.08)',  border: 'rgba(59,130,246,0.2)',  icon: Eye },
  aguardando_aprovacao: { label: 'Ag. Aprovação',     color: '#f59e0b', bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.2)',  icon: Clock },
  aprovado:             { label: 'Aprovado',           color: '#34d399', bg: 'rgba(52,211,153,0.08)',  border: 'rgba(52,211,153,0.2)',  icon: CheckCircle2 },
  ajuste_solicitado:    { label: 'Ajuste Solicitado', color: '#f97316', bg: 'rgba(249,115,22,0.08)',  border: 'rgba(249,115,22,0.2)',  icon: RotateCcw },
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

const CAMP_STATUS: Record<string, { label: string; color: string }> = {
  rascunho:  { label: 'Rascunho',  color: '#94a3b8' },
  ativa:     { label: 'Ativa',     color: '#34d399' },
  pausada:   { label: 'Pausada',   color: '#f59e0b' },
  encerrada: { label: 'Encerrada', color: '#64748b' },
};

const GOAL_ICONS: Record<string, any> = { target: Target, trending: TrendingUp, users: Users, zap: Zap, star: Star, dollar: DollarSign };
const fmtR = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const fmtN = (v: number) => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(1)}k` : String(v);

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
  const cid = Number(id);

  const [tab, setTab] = useState<Tab>('estrategia');
  const [opTab, setOpTab] = useState<OpTab>('conteudo');
  const [loading, setLoading] = useState(true);

  // Data
  const [client, setClient] = useState<any>(null);
  const [positioning, setPositioning] = useState<any>({ icp: '', promise: '', mission: '', differentials: [], cases: [] });
  const [goals, setGoals] = useState<any[]>([]);
  const [batches, setBatches] = useState<FeedBatch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [contentView, setContentView] = useState<ContentView>('list');
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);

  // Batch modal
  const [batchModal, setBatchModal] = useState(false);
  const [batchForm, setBatchForm] = useState({ month: String(new Date().getMonth() + 1), year: String(new Date().getFullYear()) });
  const [savingBatch, setSavingBatch] = useState(false);

  // Post modal
  const [postModal, setPostModal] = useState<{ piece?: any } | null>(null);
  const [postForm, setPostForm] = useState({ title: '', scheduled_date: '', media_url: '', caption: '', objective: '', status: 'em_criacao' as ContentStatus });
  const [savingPost, setSavingPost] = useState(false);
  const [deletingPost, setDeletingPost] = useState<number | null>(null);

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

  const load = async () => {
    setLoading(true);
    const [cRes, posRes, goalsRes] = await Promise.all([
      agencyClientsApi.get(cid),
      clientPortalApi.positioning(cid),
      clientPortalApi.goals(cid),
    ]);
    const c = cRes.data;
    setClient(c);
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
    setLoading(false);
  };

  const loadOp = async () => {
    const [campRes, taskRes] = await Promise.all([
      campaignsApi.list({ client_id: String(cid) }),
      tasksApi.list({ client_id: String(cid) }),
    ]);
    setCampaigns(campRes.data);
    setTasks(taskRes.data || []);
    setLoadingBatches(true);
    const batchRes = await contentApi.listBatches({ client_id: String(cid) });
    setBatches(batchRes.data);
    if (batchRes.data.length > 0) setSelectedBatchId(batchRes.data[0].id);
    setLoadingBatches(false);
  };

  const reloadBatches = async () => {
    const r = await contentApi.listBatches({ client_id: String(cid) });
    setBatches(r.data);
  };

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
    const r = await contentApi.createBatch({ agency_client_id: cid, month: Number(batchForm.month), year: Number(batchForm.year) });
    setSavingBatch(false); setBatchModal(false);
    await reloadBatches();
    setSelectedBatchId(r.data.id);
  };

  const handleSavePost = async () => {
    if (!postModal || !postForm.title.trim() || !selectedBatchId) return;
    setSavingPost(true);
    const data = { ...postForm, type: 'post', agency_client_id: cid, batch_id: selectedBatchId };
    if (postModal.piece) await contentApi.update(postModal.piece.id, data);
    else await contentApi.create(data);
    setSavingPost(false); setPostModal(null);
    const r = await contentApi.list({ batch_id: String(selectedBatchId) });
    setPosts(r.data); reloadBatches();
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

  useEffect(() => { load(); }, [cid]);
  useEffect(() => { if (tab === 'operacao' && batches.length === 0 && !loadingBatches) loadOp(); }, [tab]);

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

  const saveData = async () => {
    setSavingData(true);
    await agencyClientsApi.update(cid, dataForm);
    setClient((c: any) => ({ ...c, ...dataForm }));
    setSavingData(false);
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
  ];

  const OP_TABS: { id: OpTab; label: string; count: number }[] = [
    { id: 'conteudo',  label: 'Conteúdo',  count: batches.length },
    { id: 'trafego',   label: 'Tráfego',   count: campaigns.length },
    { id: 'projetos',  label: 'Projetos',  count: tasks.length },
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
          <Section title="Posicionamento da Marca">
            <div className="space-y-4">
              <div>
                <label className={labelCls} style={labelStyle}>ICP — Perfil do cliente ideal</label>
                <textarea value={positioning.icp} onChange={e => setPositioning((p: any) => ({ ...p, icp: e.target.value }))}
                  rows={3} placeholder="Descreva quem é o cliente ideal desta marca — idade, perfil, dores, desejos…"
                  className={inputCls} style={{ ...inputStyle, resize: 'none' }} />
              </div>
              <div>
                <label className={labelCls} style={labelStyle}>Promessa de valor</label>
                <textarea value={positioning.promise} onChange={e => setPositioning((p: any) => ({ ...p, promise: e.target.value }))}
                  rows={2} placeholder="O que a marca entrega que ninguém mais entrega?"
                  className={inputCls} style={{ ...inputStyle, resize: 'none' }} />
              </div>
              <div>
                <label className={labelCls} style={labelStyle}>Missão da marca</label>
                <textarea value={positioning.mission} onChange={e => setPositioning((p: any) => ({ ...p, mission: e.target.value }))}
                  rows={2} placeholder="Para quê essa marca existe? Qual impacto quer causar?"
                  className={inputCls} style={{ ...inputStyle, resize: 'none' }} />
              </div>

              {/* Differentials */}
              <div>
                <label className={labelCls} style={labelStyle}>Diferenciais</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {positioning.differentials.map((d: string, i: number) => (
                    <span key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                      style={{ background: 'rgba(59,130,246,0.1)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.2)' }}>
                      {d}
                      <button onClick={() => removeDiff(i)} style={{ color: 'rgba(100,116,139,0.5)' }}><X size={10} /></button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input value={diffInput} onChange={e => setDiffInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addDiff()}
                    placeholder="Adicionar diferencial e pressionar Enter"
                    className={inputCls} style={inputStyle} />
                  <button onClick={addDiff} className="px-3 py-2 rounded-xl flex-shrink-0"
                    style={{ background: 'rgba(59,130,246,0.1)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.2)' }}>
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              {/* Cases */}
              <div>
                <label className={labelCls} style={labelStyle}>Cases / Provas sociais</label>
                <div className="space-y-2 mb-2">
                  {positioning.cases.map((c: string, i: number) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <span className="flex-1 text-white">{c}</span>
                      <button onClick={() => removeCase(i)} style={{ color: 'rgba(100,116,139,0.4)' }}><X size={12} /></button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input value={caseInput} onChange={e => setCaseInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addCase()}
                    placeholder="Adicionar case ou prova social…"
                    className={inputCls} style={inputStyle} />
                  <button onClick={addCase} className="px-3 py-2 rounded-xl flex-shrink-0"
                    style={{ background: 'rgba(59,130,246,0.1)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.2)' }}>
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              <button onClick={savePositioning} disabled={savingPos}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-40"
                style={{ background: savedPos ? 'rgba(52,211,153,0.2)' : 'rgba(59,130,246,0.2)', border: `1px solid ${savedPos ? 'rgba(52,211,153,0.3)' : 'rgba(59,130,246,0.3)'}`, color: savedPos ? '#34d399' : 'white' }}>
                <Save size={14} />
                {savingPos ? 'Salvando…' : savedPos ? 'Salvo!' : 'Salvar posicionamento'}
              </button>
            </div>
          </Section>

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
            const selectedBatch = batches.find(b => b.id === selectedBatchId) ?? null;
            const calMonth = selectedBatch ? new Date(selectedBatch.year, selectedBatch.month - 1, 1) : new Date();
            const calDays = eachDayOfInterval({ start: startOfMonth(calMonth), end: endOfMonth(calMonth) });
            const calStartDay = startOfMonth(calMonth).getDay();
            const byDay = (day: Date) => posts.filter((p: any) => p.scheduled_date && isSameDay(new Date(p.scheduled_date + 'T12:00:00'), day));
            const sortedPosts = [...posts].sort((a: any, b: any) => {
              if (!a.scheduled_date) return 1; if (!b.scheduled_date) return -1;
              return a.scheduled_date.localeCompare(b.scheduled_date);
            });
            return (
              <div className="space-y-4">
                {/* Month chips + actions */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
                    {loadingBatches ? (
                      <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'rgba(59,130,246,0.3)', borderTopColor: '#3b82f6' }} />
                    ) : batches.length === 0 ? (
                      <span className="text-xs" style={{ color: 'rgba(100,116,139,0.4)' }}>Nenhum feed criado</span>
                    ) : batches.map(b => {
                      const isSelected = b.id === selectedBatchId;
                      const pct = b.post_count > 0 ? Math.round((b.approved_count / b.post_count) * 100) : 0;
                      return (
                        <button key={b.id} onClick={() => setSelectedBatchId(b.id)}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all flex-shrink-0"
                          style={isSelected
                            ? { background: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.3)' }
                            : { background: 'rgba(255,255,255,0.03)', color: 'rgba(100,116,139,0.7)', border: '1px solid rgba(255,255,255,0.06)' }}>
                          {b.name}
                          {b.post_count > 0 && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                              style={{ background: isSelected ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.06)', color: pct === 100 ? '#10b981' : (isSelected ? '#60a5fa' : 'rgba(100,116,139,0.5)') }}>
                              {b.approved_count}/{b.post_count}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <button onClick={() => { setBatchForm({ month: String(new Date().getMonth() + 1), year: String(new Date().getFullYear()) }); setBatchModal(true); }}
                    className="btn-ghost text-xs px-3 py-1.5 flex-shrink-0">
                    <Plus size={12} /> Novo Feed
                  </button>
                </div>

                {selectedBatchId && (
                  <>
                    {/* View toggle + new post */}
                    <div className="flex items-center justify-between">
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
                      <button onClick={() => { setPostModal({}); setPostForm({ title: '', scheduled_date: '', media_url: '', caption: '', objective: '', status: 'em_criacao' }); }}
                        className="btn-primary text-xs px-3 py-1.5">
                        <Plus size={12} /> Post
                      </button>
                    </div>

                    {/* Content area */}
                    {loadingPosts ? (
                      <div className="flex justify-center py-8">
                        <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'rgba(59,130,246,0.3)', borderTopColor: '#3b82f6' }} />
                      </div>
                    ) : posts.length === 0 ? (
                      <div className="text-center py-10" style={{ color: 'rgba(100,116,139,0.4)' }}>
                        <FileImage size={28} className="mx-auto mb-2 opacity-30" />
                        <p className="text-sm mb-3">Nenhum post neste feed</p>
                        <button onClick={() => { setPostModal({}); setPostForm({ title: '', scheduled_date: '', media_url: '', caption: '', objective: '', status: 'em_criacao' }); }}
                          className="btn-ghost text-xs px-3 py-1.5 mx-auto"><Plus size={12} /> Adicionar post</button>
                      </div>
                    ) : (
                      <>
                        {/* LISTA */}
                        {contentView === 'list' && (
                          <div className="rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(145deg,#0d0d22,#0f0f28)', border: '1px solid rgba(255,255,255,0.06)' }}>
                            {sortedPosts.map((p: any, i: number) => (
                              <div key={p.id} className="flex items-center gap-3 px-5 py-3 group transition-colors"
                                style={{ borderBottom: i < sortedPosts.length - 1 ? '1px solid rgba(255,255,255,0.04)' : undefined }}
                                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.01)')}
                                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                                <span className="text-[10px] font-mono w-5 flex-shrink-0 text-center" style={{ color: 'rgba(100,116,139,0.35)' }}>
                                  {String(i + 1).padStart(2, '0')}
                                </span>
                                {p.media_url ? (
                                  <img src={p.media_url} alt={p.title} className="w-9 h-9 rounded-lg object-cover flex-shrink-0" style={{ border: '1px solid rgba(59,130,246,0.12)' }} />
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
                                  <button onClick={() => { setPostModal({ piece: p }); setPostForm({ title: p.title, scheduled_date: p.scheduled_date?.slice(0,10) || '', media_url: p.media_url || '', caption: p.caption || '', objective: p.objective || '', status: p.status }); }}
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
                                        <div key={p.id} onClick={() => { setPostModal({ piece: p }); setPostForm({ title: p.title, scheduled_date: p.scheduled_date?.slice(0,10) || '', media_url: p.media_url || '', caption: p.caption || '', objective: p.objective || '', status: p.status }); }}
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
                            <p className="text-xs mb-2" style={{ color: 'rgba(100,116,139,0.45)' }}>{sortedPosts.length} posts · ordem por data agendada</p>
                            <div className="grid grid-cols-3 gap-0.5 rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                              {sortedPosts.map((p: any, i: number) => {
                                const cfg = STATUS_CFG[p.status as ContentStatus];
                                return (
                                  <div key={p.id} className="relative group cursor-pointer" style={{ aspectRatio: '1' }}
                                    onClick={() => { setPostModal({ piece: p }); setPostForm({ title: p.title, scheduled_date: p.scheduled_date?.slice(0,10) || '', media_url: p.media_url || '', caption: p.caption || '', objective: p.objective || '', status: p.status }); }}>
                                    {p.media_url ? (
                                      <img src={p.media_url} alt={p.title} className="w-full h-full object-cover" />
                                    ) : (
                                      <div className="w-full h-full flex flex-col items-center justify-center gap-1"
                                        style={{ background: 'rgba(59,130,246,0.06)' }}>
                                        <FileImage size={18} style={{ color: 'rgba(59,130,246,0.3)' }} />
                                        <span className="text-[9px] font-mono" style={{ color: 'rgba(100,116,139,0.4)' }}>{String(i + 1).padStart(2, '0')}</span>
                                      </div>
                                    )}
                                    <div className="absolute top-1 left-1 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold"
                                      style={{ background: 'rgba(0,0,0,0.55)', color: 'rgba(255,255,255,0.8)' }}>{i + 1}</div>
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
                              {Array.from({ length: (3 - (sortedPosts.length % 3)) % 3 }).map((_, i) => (
                                <div key={`f-${i}`} style={{ aspectRatio: '1', background: 'rgba(255,255,255,0.015)' }} />
                              ))}
                            </div>
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
            campaigns.length === 0 ? (
              <div className="text-center py-12" style={{ color: 'rgba(100,116,139,0.4)' }}>
                <Megaphone size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">Nenhuma campanha ainda</p>
              </div>
            ) : (
              <div className="space-y-3">
                {campaigns.map(c => {
                  const s = CAMP_STATUS[c.status] || { label: c.status, color: '#94a3b8' };
                  return (
                    <div key={c.id} className="rounded-xl px-5 py-4"
                      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="text-sm font-semibold text-white">{c.name}</p>
                          <p className="text-xs mt-0.5 capitalize" style={{ color: 'rgba(100,116,139,0.5)' }}>{c.platform}</p>
                        </div>
                        <span className="text-xs font-medium px-2.5 py-1 rounded-full"
                          style={{ color: s.color, background: `${s.color}15`, border: `1px solid ${s.color}25` }}>{s.label}</span>
                      </div>
                      <div className="grid grid-cols-4 gap-3">
                        {[
                          { label: 'Investido',    value: fmtR(c.spent) },
                          { label: 'Impressões',   value: fmtN(c.impressions) },
                          { label: 'Conversões',   value: fmtN(c.conversions) },
                          { label: 'ROAS',         value: c.spent > 0 ? `${(c.revenue / c.spent).toFixed(1)}x` : '—' },
                        ].map(m => (
                          <div key={m.label}>
                            <p className="text-sm font-semibold text-white">{m.value}</p>
                            <p className="text-[10px]" style={{ color: 'rgba(100,116,139,0.45)' }}>{m.label}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}

          {/* Projetos */}
          {opTab === 'projetos' && (
            tasks.length === 0 ? (
              <div className="text-center py-12" style={{ color: 'rgba(100,116,139,0.4)' }}>
                <CheckSquare size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">Nenhuma tarefa para este cliente</p>
              </div>
            ) : (
              <div className="space-y-2">
                {tasks.map((t: any) => {
                  const statusIcon = t.status === 'concluida' ? CheckCircle2 : t.status === 'em_andamento' ? RotateCcw : Clock;
                  const statusColor = t.status === 'concluida' ? '#34d399' : t.status === 'em_andamento' ? '#60a5fa' : 'rgba(100,116,139,0.5)';
                  const priorityColor: Record<string, string> = { urgente: '#f87171', alta: '#f97316', media: '#f59e0b', baixa: '#94a3b8' };
                  return (
                    <div key={t.id} className="flex items-center gap-4 px-4 py-3 rounded-xl"
                      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                      {(() => { const I = statusIcon; return <I size={15} style={{ color: statusColor, flexShrink: 0 }} />; })()}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{t.title}</p>
                        <p className="text-xs mt-0.5" style={{ color: 'rgba(100,116,139,0.5)' }}>{t.assignee_name || 'Sem responsável'} · {t.stage}</p>
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
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>
      )}

      {/* ──────────────────── DADOS ──────────────────── */}
      {tab === 'dados' && (
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

      {/* Post modal */}
      {postModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)' }}>
          <div className="w-full max-w-lg rounded-2xl overflow-hidden" style={{ background: '#0d0d22', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid rgba(59,130,246,0.1)' }}>
              <h3 className="text-base font-semibold text-white">{postModal.piece ? 'Editar post' : 'Novo post'}</h3>
              <button onClick={() => setPostModal(null)} style={{ color: 'rgba(100,116,139,0.5)' }}><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <div>
                <label className={labelCls} style={labelStyle}>Título *</label>
                <input value={postForm.title} onChange={e => setPostForm(p => ({ ...p, title: e.target.value }))}
                  placeholder="Ex: Lançamento produto X" className={inputCls} style={inputStyle} autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls} style={labelStyle}>Data prevista</label>
                  <input type="date" value={postForm.scheduled_date} onChange={e => setPostForm(p => ({ ...p, scheduled_date: e.target.value }))}
                    className={inputCls} style={inputStyle} />
                </div>
                <div>
                  <label className={labelCls} style={labelStyle}>Status</label>
                  <select value={postForm.status} onChange={e => setPostForm(p => ({ ...p, status: e.target.value as ContentStatus }))}
                    className={inputCls} style={{ ...inputStyle, cursor: 'pointer' }}>
                    {STATUS_ORDER.map(s => <option key={s} value={s}>{STATUS_CFG[s].label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className={labelCls} style={labelStyle}>URL da mídia</label>
                <input value={postForm.media_url} onChange={e => setPostForm(p => ({ ...p, media_url: e.target.value }))}
                  placeholder="Link da imagem…" className={inputCls} style={inputStyle} />
              </div>
              <div>
                <label className={labelCls} style={labelStyle}>Legenda</label>
                <textarea value={postForm.caption} onChange={e => setPostForm(p => ({ ...p, caption: e.target.value }))}
                  rows={3} placeholder="Texto do post…" className={inputCls} style={{ ...inputStyle, resize: 'none' }} />
              </div>
            </div>
            <div className="flex gap-2 px-6 pb-6">
              <button onClick={() => setPostModal(null)} className="flex-1 py-2 rounded-lg text-sm"
                style={{ color: 'rgba(100,116,139,0.6)', border: '1px solid rgba(255,255,255,0.06)' }}>Cancelar</button>
              <button onClick={handleSavePost} disabled={savingPost || !postForm.title.trim()}
                className="flex-1 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-40"
                style={{ background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.3)' }}>
                {savingPost ? 'Salvando…' : postModal.piece ? 'Salvar' : 'Criar Post'}
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
    </div>
  );
}
