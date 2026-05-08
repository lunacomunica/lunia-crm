import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Eye, Plus, Trash2, X, Instagram, Pencil,
  Target, TrendingUp, Users, Zap, Star, DollarSign,
  FileImage, Megaphone, CheckSquare, Save, ExternalLink,
  Clock, CheckCircle2, RotateCcw, Calendar
} from 'lucide-react';
import { agencyClientsApi, clientPortalApi, contentApi, campaignsApi, tasksApi } from '../../api/client';
import { ContentStatus } from '../../types';

type Tab = 'estrategia' | 'operacao' | 'dados';
type OpTab = 'conteudo' | 'trafego' | 'projetos';

const STATUS_CFG: Record<ContentStatus, { label: string; color: string; bg: string }> = {
  em_criacao:           { label: 'Em Criação',      color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' },
  em_revisao:           { label: 'Em Revisão',      color: '#60a5fa', bg: 'rgba(59,130,246,0.1)'  },
  aguardando_aprovacao: { label: 'Ag. Aprovação',   color: '#f59e0b', bg: 'rgba(245,158,11,0.1)'  },
  aprovado:             { label: 'Aprovado',         color: '#34d399', bg: 'rgba(52,211,153,0.1)'  },
  ajuste_solicitado:    { label: 'Ajuste',           color: '#f97316', bg: 'rgba(249,115,22,0.1)'  },
  agendado:             { label: 'Agendado',         color: '#a78bfa', bg: 'rgba(167,139,250,0.1)' },
  publicado:            { label: 'Publicado',        color: '#10b981', bg: 'rgba(16,185,129,0.1)'  },
};

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
  const [pieces, setPieces] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);

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
    const [cRes, campRes, taskRes] = await Promise.all([
      contentApi.list({ client_id: String(cid) }),
      campaignsApi.list({ client_id: String(cid) }),
      tasksApi.list({ client_id: String(cid) }),
    ]);
    setPieces(cRes.data);
    setCampaigns(campRes.data);
    setTasks(taskRes.data || []);
  };

  useEffect(() => { load(); }, [cid]);
  useEffect(() => { if (tab === 'operacao' && pieces.length === 0) loadOp(); }, [tab]);

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
    { id: 'conteudo',  label: 'Conteúdo',  count: pieces.length },
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

          {/* Conteúdo */}
          {opTab === 'conteudo' && (
            pieces.length === 0 ? <Spinner /> : (
              <div className="space-y-2">
                {pieces.map(p => {
                  const s = STATUS_CFG[p.status as ContentStatus];
                  return (
                    <div key={p.id} className="flex items-center gap-4 px-4 py-3 rounded-xl"
                      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                      {p.media_url && (
                        <img src={p.media_url} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{p.title}</p>
                        <p className="text-xs mt-0.5 capitalize" style={{ color: 'rgba(100,116,139,0.5)' }}>{p.type}{p.scheduled_date ? ` · ${p.scheduled_date}` : ''}</p>
                      </div>
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0"
                        style={{ color: s.color, background: s.bg }}>{s.label}</span>
                    </div>
                  );
                })}
              </div>
            )
          )}

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
