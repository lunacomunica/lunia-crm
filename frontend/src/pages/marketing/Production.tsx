import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { agencyClientsApi, contentApi, workflowTemplatesApi } from '../../api/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AlertTriangle, Clock, CheckCircle2, ExternalLink, Layers,
  CheckSquare, Square, Zap, Plus, X, Settings2, Trash2
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

  // Template modal
  const [templateModal, setTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<WorkflowTemplate | null>(null);
  const [tplName, setTplName] = useState('');
  const [tplStages, setTplStages] = useState<WorkflowStage[]>(DEFAULT_STAGES);
  const [savingTpl, setSavingTpl] = useState(false);

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
  }, []);

  const loadFeeds = async () => {
    setLoadingBatches(true);
    const r = await contentApi.productionBatches();
    setBatches(r.data.filter((b: BatchProduction) => b.post_count > 0));
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

  const applyWorkflow = async () => {
    if (!selectedTemplate || selected.size === 0) return;
    const tpl = templates.find(t => t.id === selectedTemplate);
    if (!tpl) return;
    setApplying(true);
    await contentApi.bulkWorkflow(Array.from(selected), tpl.stages);
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
          {/* Summary + template controls */}
          <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
            <div className="flex items-center gap-4">
              <StatPill label="Sem fluxo" value={semFluxo.length} color="#f59e0b" />
              <StatPill label="Em produção" value={emProducao.length} color="#60a5fa" />
              <StatPill label="Concluídos" value={concluido.length} color="#34d399" />
            </div>
            <div className="flex items-center gap-2">
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
              {templates.length > 0 && templates.map(t => (
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

      {/* Template modal */}
      {templateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)' }} onClick={() => setTemplateModal(false)}>
          <div className="w-full max-w-md rounded-2xl overflow-hidden" style={{ background: '#0d0d22', border: '1px solid rgba(167,139,250,0.2)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid rgba(167,139,250,0.1)' }}>
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
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'rgba(100,116,139,0.6)' }}>Nome do template</label>
                <input value={tplName} onChange={e => setTplName(e.target.value)} placeholder="Ex: Fluxo Padrão" className="input-dark w-full" autoFocus />
              </div>
              <div className="space-y-2">
                {tplStages.map((s, i) => (
                  <div key={s.stage} className="rounded-xl p-3 transition-all"
                    style={{ background: s.active ? 'rgba(167,139,250,0.06)' : 'rgba(255,255,255,0.02)', border: s.active ? '1px solid rgba(167,139,250,0.15)' : '1px solid rgba(255,255,255,0.05)' }}>
                    <div className="flex items-center gap-3 mb-2">
                      <button onClick={() => setTplStages(prev => prev.map((st, j) => j === i ? { ...st, active: !st.active } : st))}
                        className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0"
                        style={{ background: s.active ? '#a78bfa' : 'rgba(255,255,255,0.05)', border: s.active ? '1px solid #a78bfa' : '1px solid rgba(255,255,255,0.1)' }}>
                        {s.active && <span style={{ color: 'white', fontSize: 10, lineHeight: 1 }}>✓</span>}
                      </button>
                      <span className="text-sm font-medium" style={{ color: s.active ? '#e2e8f0' : 'rgba(100,116,139,0.4)' }}>{s.label}</span>
                    </div>
                    {s.active && (
                      <div className="pl-7">
                        <label className="text-[10px] mb-1 block" style={{ color: 'rgba(100,116,139,0.5)' }}>Responsável padrão</label>
                        <select value={s.assigned_to} onChange={e => setTplStages(prev => prev.map((st, j) => j === i ? { ...st, assigned_to: e.target.value } : st))}
                          className="input-dark w-full text-xs py-1.5">
                          <option value="">Sem responsável padrão</option>
                          {users.map(u => <option key={u.id} value={u.id}>{u.name}{u.job_title ? ` — ${u.job_title}` : ''}</option>)}
                        </select>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-2 px-6 pb-6">
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
