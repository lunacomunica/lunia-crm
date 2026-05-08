import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { agencyClientsApi, contentApi, workflowTemplatesApi } from '../../api/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AlertTriangle, Clock, CheckCircle2, ExternalLink, Layers,
  CheckSquare, Square, Zap, Plus, X, Settings2, Trash2, CalendarPlus, Check
} from 'lucide-react';

interface ClientProduction {
  id: number; name: string; segment: string; instagram_handle: string; logo: string | null;
  em_criacao: number; em_revisao: number; aguardando_aprovacao: number; ajuste_solicitado: number;
  aprovado: number; agendado: number; publicado_mes: number; tarefas_abertas: number;
  tarefas_atrasadas: number; ultima_atualizacao: string | null;
}
interface BatchProduction {
  id: number; name: string; month: number; year: number; agency_client_id: number;
  client_name: string; client_logo: string | null;
  post_count: number; task_count: number; tasks_done: number; tasks_open: number;
  default_template_id: number | null; template_name: string | null;
}
interface WorkflowTemplate {
  id: number; name: string; stages: WorkflowStage[];
}
interface WorkflowStage {
  stage: string; label: string; active: boolean; assigned_to: string; due_date: string;
}

const DEFAULT_STAGES: WorkflowStage[] = [
  { stage: 'copy',    label: 'Copy',    active: true,  assigned_to: '', due_date: '' },
  { stage: 'design',  label: 'Design',  active: true,  assigned_to: '', due_date: '' },
  { stage: 'edicao',  label: 'Edição',  active: false, assigned_to: '', due_date: '' },
  { stage: 'revisao', label: 'Revisão', active: true,  assigned_to: '', due_date: '' },
];

const MONTHS_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

function healthScore(c: ClientProduction) {
  if (c.ajuste_solicitado > 0 || c.tarefas_atrasadas > 0) return 'critico' as const;
  if (c.aguardando_aprovacao > 0 || c.em_revisao > 0) return 'atencao' as const;
  return 'ok' as const;
}
const HEALTH = {
  critico: { label: 'Crítico',  color: '#f87171', bg: 'rgba(248,113,113,0.1)',  dot: '#ef4444' },
  atencao: { label: 'Atenção',  color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',   dot: '#f59e0b' },
  ok:      { label: 'Em dia',   color: '#34d399', bg: 'rgba(52,211,153,0.1)',    dot: '#34d399' },
};

function batchStatus(b: BatchProduction): 'sem_fluxo' | 'em_producao' | 'concluido' {
  if (b.task_count === 0) return 'sem_fluxo';
  if (b.tasks_open > 0) return 'em_producao';
  return 'concluido';
}

export default function Production() {
  const [tab, setTab] = useState<'clientes' | 'feeds'>('feeds');
  const navigate = useNavigate();

  // Clientes tab
  const [clients, setClients] = useState<ClientProduction[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);

  // Feeds tab
  const [batches, setBatches] = useState<BatchProduction[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
  const [applying, setApplying] = useState(false);

  // Workflow dates modal
  const [datesModal, setDatesModal] = useState(false);
  const [stageDates, setStageDates] = useState<Record<string, string>>({});

  // Template modal
  const [templateModal, setTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<WorkflowTemplate | null>(null);
  const [tplName, setTplName] = useState('');
  const [tplStages, setTplStages] = useState<WorkflowStage[]>(DEFAULT_STAGES);
  const [savingTpl, setSavingTpl] = useState(false);

  // Bulk create feeds modal
  const [bulkModal, setBulkModal] = useState(false);
  const [bulkMonth, setBulkMonth] = useState(new Date().getMonth() + 1);
  const [bulkYear, setBulkYear] = useState(new Date().getFullYear());
  const [bulkTemplate, setBulkTemplate] = useState<number | ''>('');
  const [bulkClients, setBulkClients] = useState<Set<number>>(new Set());
  const [bulkPostCounts, setBulkPostCounts] = useState<Record<number, number>>({});
  const [allClientsList, setAllClientsList] = useState<{ id: number; name: string }[]>([]);
  const [creatingBulk, setCreatingBulk] = useState(false);
  const [bulkResult, setBulkResult] = useState<{ created: number; skipped: number } | null>(null);

  useEffect(() => {
    if (tab === 'clientes' && clients.length === 0) {
      setLoadingClients(true);
      agencyClientsApi.production().then(r => { setClients(r.data); setLoadingClients(false); });
    }
    if (tab === 'feeds' && batches.length === 0) {
      loadFeeds();
    }
  }, [tab]);

  useEffect(() => {
    workflowTemplatesApi.list().then(r => setTemplates(r.data));
    fetch('/api/users', { headers: { Authorization: `Bearer ${localStorage.getItem('lunia_token')}` } })
      .then(r => r.json()).then(d => setUsers(Array.isArray(d) ? d : [])).catch(() => {});
    // Load all clients for bulk modal
    agencyClientsApi.list().then((r: any) => setAllClientsList(r.data || [])).catch(() => {});
  }, []);

  const loadFeeds = async () => {
    setLoadingBatches(true);
    const r = await contentApi.productionBatches();
    setBatches(r.data);
    setLoadingBatches(false);
  };

  const semFluxo   = batches.filter(b => batchStatus(b) === 'sem_fluxo');
  const emProducao = batches.filter(b => batchStatus(b) === 'em_producao');
  const concluido  = batches.filter(b => batchStatus(b) === 'concluido');

  const toggleSelect = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectGroup = (ids: number[]) => {
    setSelected(prev => {
      const next = new Set(prev);
      const allSelected = ids.every(id => next.has(id));
      if (allSelected) ids.forEach(id => next.delete(id));
      else ids.forEach(id => next.add(id));
      return next;
    });
  };

  const applyWorkflow = () => {
    if (!selectedTemplate || selected.size === 0) return;
    const tpl = templates.find(t => t.id === selectedTemplate);
    if (!tpl) return;
    // Pre-fill dates from template if they exist
    const initial: Record<string, string> = {};
    tpl.stages.filter(s => s.active).forEach(s => { initial[s.stage] = s.due_date || ''; });
    setStageDates(initial);
    setDatesModal(true);
  };

  const confirmApplyWorkflow = async () => {
    if (!selectedTemplate) return;
    const tpl = templates.find(t => t.id === selectedTemplate);
    if (!tpl) return;
    setApplying(true);
    setDatesModal(false);
    const stagesWithDates = tpl.stages.map(s => ({ ...s, due_date: stageDates[s.stage] || s.due_date || '' }));
    await contentApi.bulkWorkflow(Array.from(selected), stagesWithDates, selectedTemplate);
    setApplying(false);
    setSelected(new Set());
    await loadFeeds();
  };

  const openNewTemplate = () => {
    setEditingTemplate(null);
    setTplName('');
    setTplStages(DEFAULT_STAGES.map(s => ({ ...s })));
    setTemplateModal(true);
  };

  const openEditTemplate = (tpl: WorkflowTemplate) => {
    setEditingTemplate(tpl);
    setTplName(tpl.name);
    setTplStages(tpl.stages.map(s => ({ ...s, assigned_to: String(s.assigned_to || '') })));
    setTemplateModal(true);
  };

  const saveTemplate = async () => {
    if (!tplName.trim()) return;
    setSavingTpl(true);
    if (editingTemplate) {
      const r = await workflowTemplatesApi.update(editingTemplate.id, { name: tplName, stages: tplStages });
      setTemplates(prev => prev.map(t => t.id === editingTemplate.id ? { ...r.data, stages: tplStages } : t));
    } else {
      const r = await workflowTemplatesApi.create({ name: tplName, stages: tplStages });
      setTemplates(prev => [...prev, { ...r.data, stages: tplStages }]);
    }
    setSavingTpl(false);
    setTemplateModal(false);
  };

  const deleteTemplate = async (id: number) => {
    await workflowTemplatesApi.delete(id);
    setTemplates(prev => prev.filter(t => t.id !== id));
    if (selectedTemplate === id) setSelectedTemplate(null);
  };

  const openBulkModal = () => {
    setBulkMonth(new Date().getMonth() + 1);
    setBulkYear(new Date().getFullYear());
    setBulkTemplate('');
    setBulkClients(new Set(allClientsList.map(c => c.id)));
    setBulkPostCounts({});
    setBulkResult(null);
    setBulkModal(true);
  };

  const toggleBulkClient = (id: number) => {
    setBulkClients(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAllBulkClients = () => {
    if (bulkClients.size === allClientsList.length) setBulkClients(new Set());
    else setBulkClients(new Set(allClientsList.map(c => c.id)));
  };

  const executeBulkCreate = async () => {
    if (bulkClients.size === 0) return;
    setCreatingBulk(true);
    const r = await contentApi.bulkCreateBatches({
      clients: Array.from(bulkClients).map(id => ({ id, post_count: bulkPostCounts[id] || 0 })),
      month: bulkMonth,
      year: bulkYear,
      default_template_id: bulkTemplate ? Number(bulkTemplate) : undefined,
    });
    setBulkResult({ created: r.data.created.length, skipped: r.data.skipped.length });
    setCreatingBulk(false);
    await loadFeeds();
  };

  // ── Clients tab summary
  const totalAjuste   = clients.reduce((s, c) => s + c.ajuste_solicitado, 0);
  const totalPendente = clients.reduce((s, c) => s + c.aguardando_aprovacao, 0);
  const totalAtrasado = clients.reduce((s, c) => s + c.tarefas_atrasadas, 0);
  const criticos      = clients.filter(c => healthScore(c) === 'critico').length;

  return (
    <div className="p-4 md:p-8 animate-fade-up">
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="section-label mb-1">Marketing</p>
          <h1 className="text-2xl md:text-3xl font-extralight text-white tracking-tight"
            style={{ textShadow: '0 0 30px rgba(59,130,246,0.2)' }}>
            Produção
          </h1>
        </div>
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(59,130,246,0.08)' }}>
          {([['feeds', 'Central de Feeds'], ['clientes', 'Clientes']] as const).map(([v, label]) => (
            <button key={v} onClick={() => setTab(v)}
              className="px-4 py-1.5 text-sm rounded-lg transition-all"
              style={{ background: tab === v ? 'rgba(59,130,246,0.15)' : 'transparent', color: tab === v ? '#e2e8f0' : 'rgba(100,116,139,0.6)', border: tab === v ? '1px solid rgba(59,130,246,0.2)' : '1px solid transparent' }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── FEEDS TAB ──────────────────────────────────────────────────────── */}
      {tab === 'feeds' && (
        <>
          {/* Summary + controls */}
          <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
            <div className="flex items-center gap-4">
              <StatPill label="Sem fluxo" value={semFluxo.length} color="#f59e0b" />
              <StatPill label="Em produção" value={emProducao.length} color="#60a5fa" />
              <StatPill label="Concluídos" value={concluido.length} color="#34d399" />
            </div>
            <div className="flex items-center gap-2">
              <button onClick={openBulkModal}
                className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg font-medium"
                style={{ background: 'rgba(59,130,246,0.1)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.2)' }}>
                <CalendarPlus size={14} /> Criar feeds do mês
              </button>
              {templates.length > 0 && (
                <select value={selectedTemplate ?? ''} onChange={e => setSelectedTemplate(Number(e.target.value) || null)}
                  className="input-dark text-sm py-1.5 pr-8 min-w-40">
                  <option value="">Selecionar template…</option>
                  {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              )}
              <button onClick={openNewTemplate}
                className="text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-medium"
                style={{ background: 'rgba(167,139,250,0.1)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.2)' }}>
                <Plus size={12} /> Template
              </button>
              {templates.map(t => (
                <button key={t.id} onClick={() => openEditTemplate(t)}
                  className="p-1.5 rounded-lg transition-all" title={`Editar ${t.name}`}
                  style={{ color: 'rgba(100,116,139,0.4)', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <Settings2 size={13} />
                </button>
              ))}
            </div>
          </div>

          {loadingBatches ? (
            <div className="flex justify-center py-20">
              <div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'rgba(59,130,246,0.3)', borderTopColor: '#3b82f6' }} />
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-6">
              <FeedColumn title="Sem fluxo" color="#f59e0b" batches={semFluxo} selected={selected}
                onToggle={toggleSelect} onSelectAll={() => selectGroup(semFluxo.map(b => b.id))} />
              <FeedColumn title="Em produção" color="#60a5fa" batches={emProducao} selected={selected}
                onToggle={toggleSelect} onSelectAll={() => selectGroup(emProducao.map(b => b.id))} />
              <FeedColumn title="Concluído" color="#34d399" batches={concluido} selected={selected}
                onToggle={toggleSelect} onSelectAll={() => selectGroup(concluido.map(b => b.id))} />
            </div>
          )}

          {/* Bottom action bar */}
          {selected.size > 0 && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl"
              style={{ background: '#0d0d22', border: '1px solid rgba(167,139,250,0.3)', boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}>
              <span className="text-sm font-medium text-white">{selected.size} feed{selected.size > 1 ? 's' : ''} selecionado{selected.size > 1 ? 's' : ''}</span>
              <select value={selectedTemplate ?? ''} onChange={e => setSelectedTemplate(Number(e.target.value) || null)}
                className="input-dark text-sm py-1.5 min-w-44">
                <option value="">Escolher template…</option>
                {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <button onClick={applyWorkflow} disabled={!selectedTemplate || applying}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white disabled:opacity-40"
                style={{ background: 'rgba(167,139,250,0.2)', border: '1px solid rgba(167,139,250,0.3)' }}>
                <Zap size={13} /> {applying ? 'Criando…' : 'Iniciar produção'}
              </button>
              <button onClick={() => setSelected(new Set())} style={{ color: 'rgba(100,116,139,0.5)' }}>
                <X size={16} />
              </button>
            </div>
          )}
        </>
      )}

      {/* ── CLIENTES TAB ───────────────────────────────────────────────────── */}
      {tab === 'clientes' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            {[
              { icon: Layers,        label: 'Clientes ativos',       value: clients.length, color: '#60a5fa' },
              { icon: AlertTriangle, label: 'Com ajuste solicitado',  value: totalAjuste,    color: '#f87171' },
              { icon: Clock,         label: 'Ag. aprovação cliente',  value: totalPendente,  color: '#f59e0b' },
              { icon: CheckCircle2,  label: 'Tarefas atrasadas',      value: totalAtrasado,  color: '#a78bfa' },
            ].map(s => (
              <div key={s.label} className="rounded-2xl px-4 py-4"
                style={{ background: 'linear-gradient(145deg,#0c0c28,#0e0e2e)', border: '1px solid rgba(59,130,246,0.08)' }}>
                <s.icon size={16} className="mb-2" style={{ color: s.color }} />
                <p className="text-xl font-bold text-white">{s.value}</p>
                <p className="text-[10px] mt-0.5 leading-tight" style={{ color: 'rgba(100,116,139,0.5)' }}>{s.label}</p>
              </div>
            ))}
          </div>
          {loadingClients ? (
            <div className="flex justify-center py-20">
              <div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'rgba(59,130,246,0.3)', borderTopColor: '#3b82f6' }} />
            </div>
          ) : (
            <>
              {criticos > 0 && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl mb-4"
                  style={{ background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.2)' }}>
                  <AlertTriangle size={14} style={{ color: '#f87171', flexShrink: 0 }} />
                  <p className="text-sm" style={{ color: '#f87171' }}>
                    {criticos} cliente{criticos > 1 ? 's precisam' : ' precisa'} de atenção imediata
                  </p>
                </div>
              )}
              <div className="rounded-2xl overflow-hidden hidden md:block" style={{ border: '1px solid rgba(59,130,246,0.08)' }}>
                <div className="grid grid-cols-[2fr_1fr_3fr_1fr_1fr_auto] gap-4 px-5 py-3 text-[10px] font-semibold uppercase tracking-wider"
                  style={{ background: 'rgba(59,130,246,0.04)', color: 'rgba(100,116,139,0.5)', borderBottom: '1px solid rgba(59,130,246,0.08)' }}>
                  <span>Cliente</span><span>Saúde</span><span>Produção</span><span>Tarefas</span><span>Publicados</span><span></span>
                </div>
                {clients.map((c, i) => {
                  const health = healthScore(c); const h = HEALTH[health];
                  return (
                    <div key={c.id} className="grid grid-cols-[2fr_1fr_3fr_1fr_1fr_auto] gap-4 items-center px-5 py-4 cursor-pointer transition-colors"
                      style={{ borderBottom: i < clients.length - 1 ? '1px solid rgba(59,130,246,0.05)' : 'none', background: 'transparent' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(59,130,246,0.03)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      onClick={() => navigate(`/marketing/content?client=${c.id}`)}>
                      <div className="flex items-center gap-3 min-w-0">
                        {c.logo ? <img src={c.logo} alt={c.name} className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                          : <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)' }}>{c.name.charAt(0)}</div>}
                        <div className="min-w-0"><p className="text-sm font-medium text-white truncate">{c.name}</p>{c.segment && <p className="text-[10px] truncate" style={{ color: 'rgba(100,116,139,0.5)' }}>{c.segment}</p>}</div>
                      </div>
                      <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: h.dot }} /><span className="text-xs" style={{ color: h.color }}>{h.label}</span></div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {c.ajuste_solicitado > 0 && <Pill label={`${c.ajuste_solicitado} ajuste`} color="#f87171" bg="rgba(248,113,113,0.1)" />}
                        {c.aguardando_aprovacao > 0 && <Pill label={`${c.aguardando_aprovacao} ag. aprovação`} color="#f59e0b" bg="rgba(245,158,11,0.1)" />}
                        {c.em_revisao > 0 && <Pill label={`${c.em_revisao} revisão`} color="#60a5fa" bg="rgba(96,165,250,0.1)" />}
                        {c.em_criacao > 0 && <Pill label={`${c.em_criacao} criação`} color="#94a3b8" bg="rgba(148,163,184,0.08)" />}
                        {c.aprovado > 0 && <Pill label={`${c.aprovado} aprovado`} color="#34d399" bg="rgba(52,211,153,0.08)" />}
                        {c.agendado > 0 && <Pill label={`${c.agendado} agendado`} color="#a78bfa" bg="rgba(167,139,250,0.08)" />}
                        {c.ajuste_solicitado === 0 && c.aguardando_aprovacao === 0 && c.em_revisao === 0 && c.em_criacao === 0 && c.aprovado === 0 && c.agendado === 0 && <span className="text-xs" style={{ color: 'rgba(100,116,139,0.3)' }}>—</span>}
                      </div>
                      <div>{c.tarefas_abertas > 0 ? <span className="text-xs" style={{ color: c.tarefas_atrasadas > 0 ? '#f87171' : 'rgba(100,116,139,0.6)' }}>{c.tarefas_abertas} tarefa{c.tarefas_abertas > 1 ? 's' : ''}{c.tarefas_atrasadas > 0 && <span style={{ color: '#f87171' }}> ({c.tarefas_atrasadas} atrasada{c.tarefas_atrasadas > 1 ? 's' : ''})</span>}</span> : <span className="text-xs" style={{ color: 'rgba(100,116,139,0.3)' }}>—</span>}</div>
                      <div><span className="text-xs" style={{ color: c.publicado_mes > 0 ? '#34d399' : 'rgba(100,116,139,0.3)' }}>{c.publicado_mes > 0 ? `${c.publicado_mes} este mês` : '—'}</span></div>
                      <ExternalLink size={13} style={{ color: 'rgba(100,116,139,0.3)', flexShrink: 0 }} />
                    </div>
                  );
                })}
              </div>
              <div className="md:hidden space-y-3">
                {clients.map(c => {
                  const health = healthScore(c); const h = HEALTH[health];
                  return (
                    <div key={c.id} className="rounded-2xl p-4 cursor-pointer" style={{ background: 'linear-gradient(145deg,#0c0c28,#0e0e2e)', border: '1px solid rgba(59,130,246,0.08)' }} onClick={() => navigate(`/marketing/content?client=${c.id}`)}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          {c.logo ? <img src={c.logo} alt={c.name} className="w-8 h-8 rounded-lg object-cover" /> : <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)' }}>{c.name.charAt(0)}</div>}
                          <div><p className="text-sm font-medium text-white">{c.name}</p>{c.segment && <p className="text-[10px]" style={{ color: 'rgba(100,116,139,0.5)' }}>{c.segment}</p>}</div>
                        </div>
                        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{ background: h.dot }} /><span className="text-xs" style={{ color: h.color }}>{h.label}</span></div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {c.ajuste_solicitado > 0 && <Pill label={`${c.ajuste_solicitado} ajuste`} color="#f87171" bg="rgba(248,113,113,0.1)" />}
                        {c.aguardando_aprovacao > 0 && <Pill label={`${c.aguardando_aprovacao} ag. aprovação`} color="#f59e0b" bg="rgba(245,158,11,0.1)" />}
                        {c.em_revisao > 0 && <Pill label={`${c.em_revisao} revisão`} color="#60a5fa" bg="rgba(96,165,250,0.1)" />}
                        {c.em_criacao > 0 && <Pill label={`${c.em_criacao} criação`} color="#94a3b8" bg="rgba(148,163,184,0.08)" />}
                        {c.aprovado > 0 && <Pill label={`${c.aprovado} aprovado`} color="#34d399" bg="rgba(52,211,153,0.08)" />}
                      </div>
                      {c.ultima_atualizacao && <p className="text-[10px] mt-2" style={{ color: 'rgba(100,116,139,0.35)' }}>Atualizado {format(new Date(c.ultima_atualizacao), "d MMM HH:mm", { locale: ptBR })}</p>}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}

      {/* ── BULK CREATE MODAL ──────────────────────────────────────────────── */}
      {bulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)' }}
          onClick={() => setBulkModal(false)}>
          <div className="w-full max-w-lg rounded-2xl flex flex-col"
            style={{ background: '#0d0d22', border: '1px solid rgba(59,130,246,0.2)', maxHeight: '90vh' }}
            onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 flex-shrink-0"
              style={{ borderBottom: '1px solid rgba(59,130,246,0.1)' }}>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest mb-0.5" style={{ color: 'rgba(59,130,246,0.6)' }}>Produção</p>
                <h3 className="text-base font-semibold text-white">Criar feeds do mês</h3>
              </div>
              <button onClick={() => setBulkModal(false)} style={{ color: 'rgba(100,116,139,0.5)' }}><X size={18} /></button>
            </div>

            {bulkResult ? (
              /* Success state */
              <div className="p-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto" style={{ background: 'rgba(52,211,153,0.15)' }}>
                  <Check size={24} style={{ color: '#34d399' }} />
                </div>
                <p className="text-white font-semibold">Feeds criados com sucesso!</p>
                <p className="text-sm" style={{ color: 'rgba(100,116,139,0.6)' }}>
                  {bulkResult.created} feed{bulkResult.created !== 1 ? 's' : ''} criado{bulkResult.created !== 1 ? 's' : ''}
                  {bulkResult.skipped > 0 && ` · ${bulkResult.skipped} já existia${bulkResult.skipped !== 1 ? 'm' : ''}`}
                </p>
                <button onClick={() => setBulkModal(false)}
                  className="mt-2 px-6 py-2 rounded-xl text-sm font-medium"
                  style={{ background: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.2)' }}>
                  Fechar
                </button>
              </div>
            ) : (
              <>
                {/* Body */}
                <div className="p-6 space-y-5 overflow-y-auto flex-1">
                  {/* Month + Year */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs mb-1.5 block font-semibold uppercase tracking-wide" style={{ color: 'rgba(100,116,139,0.5)' }}>Mês</label>
                      <select value={bulkMonth} onChange={e => setBulkMonth(Number(e.target.value))} className="input-dark w-full">
                        {MONTHS_PT.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs mb-1.5 block font-semibold uppercase tracking-wide" style={{ color: 'rgba(100,116,139,0.5)' }}>Ano</label>
                      <input type="number" value={bulkYear} onChange={e => setBulkYear(Number(e.target.value))}
                        className="input-dark w-full" min={2024} max={2030} />
                    </div>
                  </div>

                  {/* Template (optional) */}
                  <div>
                    <label className="text-xs mb-1.5 block font-semibold uppercase tracking-wide" style={{ color: 'rgba(100,116,139,0.5)' }}>
                      Template de produção <span style={{ color: 'rgba(100,116,139,0.35)' }}>(opcional — novos posts herdarão automaticamente)</span>
                    </label>
                    <select value={bulkTemplate} onChange={e => setBulkTemplate(e.target.value ? Number(e.target.value) : '')} className="input-dark w-full">
                      <option value="">Sem template</option>
                      {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>

                  {/* Client list with per-client post count */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'rgba(100,116,139,0.5)' }}>
                        Clientes ({bulkClients.size}/{allClientsList.length})
                      </label>
                      <button onClick={toggleAllBulkClients}
                        className="text-[10px] px-2 py-0.5 rounded-md"
                        style={{ color: '#60a5fa', background: 'rgba(59,130,246,0.08)' }}>
                        {bulkClients.size === allClientsList.length ? 'Desmarcar todos' : 'Selecionar todos'}
                      </button>
                    </div>
                    <div className="space-y-1.5 max-h-72 overflow-y-auto">
                      {allClientsList.map(c => (
                        <div key={c.id} className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all"
                          style={{ background: bulkClients.has(c.id) ? 'rgba(59,130,246,0.08)' : 'rgba(255,255,255,0.02)', border: bulkClients.has(c.id) ? '1px solid rgba(59,130,246,0.2)' : '1px solid rgba(255,255,255,0.05)' }}>
                          <button onClick={() => toggleBulkClient(c.id)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                            <div className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0"
                              style={{ background: bulkClients.has(c.id) ? '#3b82f6' : 'rgba(255,255,255,0.05)', border: bulkClients.has(c.id) ? 'none' : '1px solid rgba(255,255,255,0.12)' }}>
                              {bulkClients.has(c.id) && <Check size={10} color="white" />}
                            </div>
                            <span className="text-sm text-white truncate">{c.name}</span>
                          </button>
                          {bulkClients.has(c.id) && (
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <span className="text-[10px]" style={{ color: 'rgba(100,116,139,0.4)' }}>posts</span>
                              <input
                                type="number" min={0} max={60}
                                value={bulkPostCounts[c.id] ?? ''}
                                placeholder="0"
                                onClick={e => e.stopPropagation()}
                                onChange={e => setBulkPostCounts(prev => ({ ...prev, [c.id]: Math.max(0, Math.min(60, Number(e.target.value))) }))}
                                className="w-14 text-center text-sm rounded-lg px-2 py-1 outline-none"
                                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(59,130,246,0.2)', color: '#e2e8f0' }}
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex gap-3 px-6 py-4 flex-shrink-0" style={{ borderTop: '1px solid rgba(59,130,246,0.08)' }}>
                  <button onClick={() => setBulkModal(false)}
                    className="flex-1 py-2 rounded-xl text-sm" style={{ color: 'rgba(100,116,139,0.6)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    Cancelar
                  </button>
                  <button onClick={executeBulkCreate} disabled={creatingBulk || bulkClients.size === 0}
                    className="flex-1 py-2 rounded-xl text-sm font-medium text-white disabled:opacity-40"
                    style={{ background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.3)' }}>
                    {creatingBulk ? 'Criando…' : `Criar ${bulkClients.size} feed${bulkClients.size !== 1 ? 's' : ''}`}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── WORKFLOW DATES MODAL ──────────────────────────────────────────── */}
      {datesModal && (() => {
        const tpl = templates.find(t => t.id === selectedTemplate);
        const activeStages = tpl?.stages.filter(s => s.active) ?? [];
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)' }}
            onClick={() => setDatesModal(false)}>
            <div className="w-full max-w-sm rounded-2xl"
              style={{ background: '#0d0d22', border: '1px solid rgba(167,139,250,0.25)' }}
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(59,130,246,0.08)' }}>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest mb-0.5" style={{ color: 'rgba(167,139,250,0.6)' }}>Iniciar produção</p>
                  <h3 className="text-sm font-semibold text-white">Definir datas por etapa</h3>
                </div>
                <button onClick={() => setDatesModal(false)} style={{ color: 'rgba(100,116,139,0.5)' }}><X size={16} /></button>
              </div>
              <div className="p-5 space-y-3">
                <p className="text-xs" style={{ color: 'rgba(100,116,139,0.5)' }}>
                  Todos os posts dos {selected.size} feed{selected.size > 1 ? 's' : ''} selecionado{selected.size > 1 ? 's' : ''} receberão essas datas.
                </p>
                {activeStages.map(s => (
                  <div key={s.stage} className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.stage === 'copy' ? '#60a5fa' : s.stage === 'design' ? '#a78bfa' : s.stage === 'edicao' ? '#f59e0b' : '#34d399' }} />
                    <span className="text-sm text-white w-20 flex-shrink-0">{s.label}</span>
                    <input type="date" value={stageDates[s.stage] || ''}
                      onChange={e => setStageDates(prev => ({ ...prev, [s.stage]: e.target.value }))}
                      className="flex-1 text-sm rounded-xl px-3 py-1.5 outline-none"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(59,130,246,0.2)', color: stageDates[s.stage] ? '#e2e8f0' : 'rgba(100,116,139,0.5)', colorScheme: 'dark' }} />
                  </div>
                ))}
              </div>
              <div className="flex gap-3 px-5 py-4" style={{ borderTop: '1px solid rgba(59,130,246,0.08)' }}>
                <button onClick={() => setDatesModal(false)} className="flex-1 py-2 rounded-xl text-sm"
                  style={{ color: 'rgba(100,116,139,0.6)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  Cancelar
                </button>
                <button onClick={confirmApplyWorkflow}
                  className="flex-1 py-2 rounded-xl text-sm font-medium text-white"
                  style={{ background: 'rgba(167,139,250,0.2)', border: '1px solid rgba(167,139,250,0.3)' }}>
                  <span className="flex items-center justify-center gap-1.5"><Zap size={13} /> Iniciar produção</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── TEMPLATE MODAL ─────────────────────────────────────────────────── */}
      {templateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)' }} onClick={() => setTemplateModal(false)}>
          <div className="w-full max-w-lg rounded-2xl flex flex-col" style={{ background: '#0d0d22', border: '1px solid rgba(167,139,250,0.2)', maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-5 flex-shrink-0" style={{ borderBottom: '1px solid rgba(167,139,250,0.1)' }}>
              <h3 className="text-base font-semibold text-white">{editingTemplate ? 'Editar template' : 'Novo template'}</h3>
              <div className="flex items-center gap-2">
                {editingTemplate && (
                  <button onClick={() => { deleteTemplate(editingTemplate.id); setTemplateModal(false); }}
                    className="p-1.5 rounded-lg transition-colors" style={{ color: 'rgba(100,116,139,0.4)' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#f87171')} onMouseLeave={e => (e.currentTarget.style.color = 'rgba(100,116,139,0.4)')}>
                    <Trash2 size={14} />
                  </button>
                )}
                <button onClick={() => setTemplateModal(false)} style={{ color: 'rgba(100,116,139,0.5)' }}><X size={18} /></button>
              </div>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'rgba(100,116,139,0.6)' }}>Nome do template</label>
                <input value={tplName} onChange={e => setTplName(e.target.value)} placeholder="Ex: Fluxo Padrão" className="input-dark w-full" autoFocus />
              </div>
              <div className="space-y-2">
                {tplStages.map((s, i) => (
                  <div key={s.stage} className="rounded-xl p-3 transition-all"
                    style={{ background: s.active ? 'rgba(167,139,250,0.06)' : 'rgba(255,255,255,0.02)', border: s.active ? '1px solid rgba(167,139,250,0.15)' : '1px solid rgba(255,255,255,0.05)' }}>
                    <div className="flex items-center gap-3">
                      <button onClick={() => setTplStages(prev => prev.map((st, j) => j === i ? { ...st, active: !st.active } : st))}
                        className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0"
                        style={{ background: s.active ? '#a78bfa' : 'rgba(255,255,255,0.05)', border: s.active ? '1px solid #a78bfa' : '1px solid rgba(255,255,255,0.1)' }}>
                        {s.active && <span style={{ color: 'white', fontSize: 10, lineHeight: 1 }}>✓</span>}
                      </button>
                      <span className="text-sm font-medium flex-1" style={{ color: s.active ? '#e2e8f0' : 'rgba(100,116,139,0.4)' }}>{s.label}</span>
                      {s.active && (
                        <select value={s.assigned_to} onChange={e => setTplStages(prev => prev.map((st, j) => j === i ? { ...st, assigned_to: e.target.value } : st))}
                          className="input-dark text-xs py-1 flex-1 max-w-[200px]">
                          <option value="">Sem responsável</option>
                          {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </select>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-2 px-6 py-4 flex-shrink-0" style={{ borderTop: '1px solid rgba(167,139,250,0.08)' }}>
              <button onClick={() => setTemplateModal(false)} className="flex-1 py-2 rounded-lg text-sm" style={{ color: 'rgba(100,116,139,0.6)', border: '1px solid rgba(255,255,255,0.06)' }}>Cancelar</button>
              <button onClick={saveTemplate} disabled={savingTpl || !tplName.trim()} className="flex-1 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-40"
                style={{ background: 'rgba(167,139,250,0.2)', border: '1px solid rgba(167,139,250,0.3)' }}>
                {savingTpl ? 'Salvando…' : 'Salvar template'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FeedColumn({ title, color, batches, selected, onToggle, onSelectAll }: {
  title: string; color: string; batches: BatchProduction[];
  selected: Set<number>; onToggle: (id: number) => void; onSelectAll: () => void;
}) {
  const allSelected = batches.length > 0 && batches.every(b => selected.has(b.id));
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: color }} />
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color }}>{title}</span>
          <span className="text-xs" style={{ color: 'rgba(100,116,139,0.4)' }}>({batches.length})</span>
        </div>
        {batches.length > 0 && (
          <button onClick={onSelectAll} className="text-[10px] px-2 py-0.5 rounded-md transition-all"
            style={{ color: allSelected ? '#a78bfa' : 'rgba(100,116,139,0.4)', background: allSelected ? 'rgba(167,139,250,0.1)' : 'transparent' }}>
            {allSelected ? 'Desmarcar' : 'Selecionar todos'}
          </button>
        )}
      </div>
      <div className="space-y-2">
        {batches.length === 0 ? (
          <div className="text-center py-8 rounded-2xl" style={{ border: '1px dashed rgba(255,255,255,0.06)' }}>
            <p className="text-xs" style={{ color: 'rgba(100,116,139,0.3)' }}>Nenhum feed</p>
          </div>
        ) : batches.map(b => (
          <BatchCard key={b.id} batch={b} selected={selected.has(b.id)} onToggle={() => onToggle(b.id)} />
        ))}
      </div>
    </div>
  );
}

function BatchCard({ batch: b, selected, onToggle }: { batch: BatchProduction; selected: boolean; onToggle: () => void }) {
  const progress = b.task_count > 0 ? b.tasks_done / b.task_count : 0;
  return (
    <div className="flex items-start gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all"
      style={{ background: selected ? 'rgba(167,139,250,0.08)' : 'linear-gradient(145deg,#0c0c28,#0e0e2e)', border: selected ? '1px solid rgba(167,139,250,0.25)' : '1px solid rgba(59,130,246,0.08)' }}
      onClick={onToggle}>
      <div className="mt-0.5 flex-shrink-0" style={{ color: selected ? '#a78bfa' : 'rgba(100,116,139,0.3)' }}>
        {selected ? <CheckSquare size={15} /> : <Square size={15} />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-white truncate">{b.client_name}</p>
        <p className="text-[10px] truncate mt-0.5" style={{ color: 'rgba(100,116,139,0.5)' }}>
          {b.name} · {b.post_count} post{b.post_count !== 1 ? 's' : ''}
        </p>
        {b.template_name && (
          <p className="text-[9px] mt-1 truncate" style={{ color: 'rgba(167,139,250,0.6)' }}>
            ⚡ {b.template_name}
          </p>
        )}
        {b.task_count > 0 && (
          <div className="flex items-center gap-2 mt-1.5">
            <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(59,130,246,0.1)' }}>
              <div className="h-full rounded-full" style={{ width: `${progress * 100}%`, background: progress === 1 ? '#34d399' : '#3b82f6', transition: 'width 0.3s' }} />
            </div>
            <span className="text-[9px] flex-shrink-0" style={{ color: 'rgba(100,116,139,0.4)' }}>{b.tasks_done}/{b.task_count}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function StatPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-2 h-2 rounded-full" style={{ background: color }} />
      <span className="text-sm font-semibold text-white">{value}</span>
      <span className="text-xs" style={{ color: 'rgba(100,116,139,0.5)' }}>{label}</span>
    </div>
  );
}

function Pill({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span className="text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap" style={{ background: bg, color }}>{label}</span>
  );
}
