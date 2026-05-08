import { useEffect, useState, useRef } from 'react';
import {
  Play, Pause, CheckCircle2, Plus, X, Clock, Calendar, User,
  FileImage, Megaphone, AlertCircle, ChevronDown, Timer, Trash2
} from 'lucide-react';
import { tasksApi, agencyClientsApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Task {
  id: number;
  title: string;
  description: string | null;
  assigned_to: number | null;
  assigned_name: string | null;
  assigned_avatar: string | null;
  content_piece_id: number | null;
  campaign_id: number | null;
  agency_client_id: number | null;
  client_name: string | null;
  content_title: string | null;
  campaign_name: string | null;
  priority: 'baixa' | 'media' | 'alta' | 'urgente';
  status: 'a_fazer' | 'em_andamento' | 'pausada' | 'concluida';
  due_date: string | null;
  estimated_minutes: number | null;
  total_minutes: number;
  session_started_at: string | null;
  created_at: string;
  completed_at: string | null;
}

const PRIORITY_CFG = {
  urgente: { label: 'Urgente', color: '#f87171', bg: 'rgba(248,113,113,0.1)', dot: '#ef4444' },
  alta:    { label: 'Alta',    color: '#f97316', bg: 'rgba(249,115,22,0.1)',  dot: '#f97316' },
  media:   { label: 'Média',   color: '#60a5fa', bg: 'rgba(96,165,250,0.1)',  dot: '#3b82f6' },
  baixa:   { label: 'Baixa',   color: '#94a3b8', bg: 'rgba(148,163,184,0.08)', dot: '#64748b' },
};

const STATUS_CFG = {
  a_fazer:     { label: 'A fazer',       color: 'rgba(100,116,139,0.6)' },
  em_andamento:{ label: 'Em andamento',  color: '#60a5fa' },
  pausada:     { label: 'Pausada',       color: '#f59e0b' },
  concluida:   { label: 'Concluída',     color: '#34d399' },
};

const FILTER_TABS = [
  { id: 'hoje',    label: 'Hoje' },
  { id: 'semana',  label: 'Esta semana' },
  { id: 'todas',   label: 'Todas' },
] as const;

type FilterTab = typeof FILTER_TABS[number]['id'];

function fmtTime(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m.toString().padStart(2, '0')}min` : `${m}min`;
}

function ElapsedTimer({ startedAt, baseMinutes }: { startedAt: string; baseMinutes: number }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const base = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
    setElapsed(base);
    const t = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [startedAt]);

  const totalSec = elapsed + baseMinutes * 60;
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return (
    <span className="font-mono text-sm font-bold" style={{ color: '#60a5fa' }}>
      {h > 0 && `${h}:`}{m.toString().padStart(2, '0')}:{s.toString().padStart(2, '0')}
    </span>
  );
}

const EMPTY_FORM = {
  title: '', description: '', assigned_to: '', agency_client_id: '',
  priority: 'media', due_date: '', estimated_minutes: '',
};

export default function Gerot() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>('hoje');
  const [filterUser, setFilterUser] = useState('');
  const [clients, setClients] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [acting, setActing] = useState<number | null>(null);
  const [detail, setDetail] = useState<Task | null>(null);
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  const load = async () => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (filter === 'hoje') params.due = 'today';
    if (filter === 'semana') params.due = 'week';
    if (filterUser) params.assigned_to = filterUser;
    const r = await tasksApi.list(params);
    setTasks(r.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [filter, filterUser]);

  useEffect(() => {
    agencyClientsApi.list().then(r => setClients(r.data));
    if (isAdmin) {
      fetch('/api/users', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
        .then(r => r.json()).then(d => setUsers(Array.isArray(d) ? d : [])).catch(() => {});
    }
  }, []);

  const handleStart = async (id: number) => {
    setActing(id);
    await tasksApi.start(id);
    setTasks(prev => prev.map(t => t.id === id
      ? { ...t, status: 'em_andamento', session_started_at: new Date().toISOString() } : t));
    setActing(null);
  };

  const handlePause = async (id: number) => {
    setActing(id);
    const r = await tasksApi.pause(id);
    setTasks(prev => prev.map(t => t.id === id
      ? { ...t, status: 'pausada', session_started_at: null, total_minutes: t.total_minutes + (r.data.minutes || 0) } : t));
    setActing(null);
  };

  const handleComplete = async (id: number) => {
    setActing(id);
    await tasksApi.complete(id);
    setTasks(prev => prev.map(t => t.id === id
      ? { ...t, status: 'concluida', session_started_at: null } : t));
    setDetail(null);
    setActing(null);
  };

  const handleDelete = async (id: number) => {
    await tasksApi.delete(id);
    setTasks(prev => prev.filter(t => t.id !== id));
    setDetail(null);
  };

  const handleCreate = async () => {
    if (!form.title) return;
    setSaving(true);
    const r = await tasksApi.create({
      ...form,
      assigned_to: form.assigned_to || null,
      agency_client_id: form.agency_client_id || null,
      estimated_minutes: form.estimated_minutes ? Number(form.estimated_minutes) : null,
    });
    setTasks(prev => [r.data, ...prev]);
    setModal(false);
    setForm(EMPTY_FORM);
    setSaving(false);
  };

  // Group by priority
  const grouped = (['urgente', 'alta', 'media', 'baixa'] as const).map(p => ({
    priority: p,
    tasks: tasks.filter(t => t.priority === p && t.status !== 'concluida'),
  })).filter(g => g.tasks.length > 0);

  const done = tasks.filter(t => t.status === 'concluida');
  const activeTask = tasks.find(t => t.status === 'em_andamento');

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="section-label mb-1">Equipe</p>
          <h1 className="text-2xl font-semibold text-white">Gerot</h1>
          {!isAdmin && <p className="text-sm mt-0.5" style={{ color: 'rgba(100,116,139,0.5)' }}>Suas tarefas</p>}
        </div>
        <button onClick={() => { setModal(true); setForm(EMPTY_FORM); }}
          className="btn-primary flex items-center gap-2">
          <Plus size={15} /> Nova tarefa
        </button>
      </div>

      {/* Active timer banner */}
      {activeTask && (
        <div className="flex items-center justify-between px-5 py-3 rounded-2xl mb-6"
          style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#3b82f6' }} />
            <span className="text-sm text-white font-medium">{activeTask.title}</span>
            {activeTask.client_name && (
              <span className="badge badge-blue text-xs">{activeTask.client_name}</span>
            )}
          </div>
          <div className="flex items-center gap-4">
            {activeTask.session_started_at && (
              <ElapsedTimer startedAt={activeTask.session_started_at} baseMinutes={activeTask.total_minutes} />
            )}
            <button onClick={() => handlePause(activeTask.id)} disabled={acting === activeTask.id}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all"
              style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}>
              <Pause size={12} /> Pausar
            </button>
            <button onClick={() => handleComplete(activeTask.id)} disabled={acting === activeTask.id}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all"
              style={{ background: 'rgba(52,211,153,0.15)', color: '#34d399', border: '1px solid rgba(52,211,153,0.3)' }}>
              <CheckCircle2 size={12} /> Concluir
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(59,130,246,0.08)' }}>
          {FILTER_TABS.map(t => (
            <button key={t.id} onClick={() => setFilter(t.id)}
              className="px-4 py-1.5 text-sm rounded-lg transition-all"
              style={{
                background: filter === t.id ? 'rgba(59,130,246,0.15)' : 'transparent',
                color: filter === t.id ? '#e2e8f0' : 'rgba(100,116,139,0.6)',
                border: filter === t.id ? '1px solid rgba(59,130,246,0.2)' : '1px solid transparent',
              }}>
              {t.label}
            </button>
          ))}
        </div>
        {isAdmin && users.length > 0 && (
          <select value={filterUser} onChange={e => setFilterUser(e.target.value)}
            className="input-dark text-sm py-1.5 pr-8">
            <option value="">Toda a equipe</option>
            {users.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: 'rgba(59,130,246,0.3)', borderTopColor: '#3b82f6' }} />
        </div>
      ) : tasks.filter(t => t.status !== 'concluida').length === 0 && done.length === 0 ? (
        <div className="text-center py-24">
          <CheckCircle2 size={40} className="mx-auto mb-3" style={{ color: 'rgba(100,116,139,0.15)' }} />
          <p className="text-sm" style={{ color: 'rgba(100,116,139,0.4)' }}>Nenhuma tarefa por aqui.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(({ priority, tasks: ptasks }) => {
            const cfg = PRIORITY_CFG[priority];
            return (
              <div key={priority}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full" style={{ background: cfg.dot }} />
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: cfg.color }}>
                    {cfg.label}
                  </span>
                  <span className="text-xs" style={{ color: 'rgba(100,116,139,0.4)' }}>({ptasks.length})</span>
                </div>
                <div className="space-y-2">
                  {ptasks.map(task => <TaskCard key={task.id} task={task} />)}
                </div>
              </div>
            );
          })}

          {done.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 size={14} style={{ color: '#34d399' }} />
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#34d399' }}>
                  Concluídas
                </span>
                <span className="text-xs" style={{ color: 'rgba(100,116,139,0.4)' }}>({done.length})</span>
              </div>
              <div className="space-y-2 opacity-60">
                {done.map(task => <TaskCard key={task.id} task={task} />)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Detail panel */}
      {detail && (
        <div className="fixed inset-0 flex items-center justify-end z-50"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
          onClick={() => setDetail(null)}>
          <div className="h-full w-full max-w-md overflow-y-auto"
            style={{ background: '#07071a', borderLeft: '1px solid rgba(59,130,246,0.12)', boxShadow: '-20px 0 60px rgba(0,0,0,0.7)' }}
            onClick={e => e.stopPropagation()}>

            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(59,130,246,0.08)' }}>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ background: PRIORITY_CFG[detail.priority].dot }} />
                <span className="text-sm font-medium" style={{ color: PRIORITY_CFG[detail.priority].color }}>
                  {PRIORITY_CFG[detail.priority].label}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <button onClick={() => handleDelete(detail.id)}
                    className="p-1.5 rounded-lg transition-colors" style={{ color: 'rgba(100,116,139,0.4)' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'rgba(100,116,139,0.4)')}>
                    <Trash2 size={14} />
                  </button>
                )}
                <button onClick={() => setDetail(null)} style={{ color: 'rgba(100,116,139,0.5)' }}>
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-5">
              <h2 className="text-xl font-semibold text-white">{detail.title}</h2>

              {detail.description && (
                <p className="text-sm" style={{ color: 'rgba(148,163,184,0.8)', lineHeight: '1.6' }}>{detail.description}</p>
              )}

              <div className="grid grid-cols-2 gap-3">
                {detail.client_name && (
                  <div className="rounded-xl px-3 py-2.5" style={{ background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.1)' }}>
                    <p className="text-[10px] mb-0.5" style={{ color: 'rgba(59,130,246,0.5)' }}>Cliente</p>
                    <p className="text-sm text-white font-medium">{detail.client_name}</p>
                  </div>
                )}
                {detail.assigned_name && (
                  <div className="rounded-xl px-3 py-2.5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <p className="text-[10px] mb-0.5" style={{ color: 'rgba(100,116,139,0.5)' }}>Responsável</p>
                    <p className="text-sm text-white font-medium">{detail.assigned_name}</p>
                  </div>
                )}
                {detail.due_date && (
                  <div className="rounded-xl px-3 py-2.5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <p className="text-[10px] mb-0.5" style={{ color: 'rgba(100,116,139,0.5)' }}>Prazo</p>
                    <p className="text-sm text-white font-medium">{format(new Date(detail.due_date), "d MMM yyyy", { locale: ptBR })}</p>
                  </div>
                )}
                <div className="rounded-xl px-3 py-2.5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <p className="text-[10px] mb-0.5" style={{ color: 'rgba(100,116,139,0.5)' }}>Status</p>
                  <p className="text-sm font-medium" style={{ color: STATUS_CFG[detail.status].color }}>{STATUS_CFG[detail.status].label}</p>
                </div>
              </div>

              {/* Linked entity */}
              {(detail.content_title || detail.campaign_name) && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
                  style={{ background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.15)' }}>
                  {detail.content_title ? <FileImage size={14} style={{ color: '#a78bfa' }} /> : <Megaphone size={14} style={{ color: '#a78bfa' }} />}
                  <span className="text-sm" style={{ color: '#a78bfa' }}>{detail.content_title || detail.campaign_name}</span>
                </div>
              )}

              {/* Time tracking */}
              <div className="rounded-xl p-4" style={{ background: 'rgba(59,130,246,0.04)', border: '1px solid rgba(59,130,246,0.1)' }}>
                <p className="label-dark mb-3 flex items-center gap-2"><Timer size={12} />Tempo</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] mb-0.5" style={{ color: 'rgba(100,116,139,0.5)' }}>Estimado</p>
                    <p className="text-sm text-white font-medium">
                      {detail.estimated_minutes ? fmtTime(detail.estimated_minutes) : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] mb-0.5" style={{ color: 'rgba(100,116,139,0.5)' }}>Registrado</p>
                    {detail.status === 'em_andamento' && detail.session_started_at ? (
                      <ElapsedTimer startedAt={detail.session_started_at} baseMinutes={detail.total_minutes} />
                    ) : (
                      <p className="text-sm text-white font-medium">{detail.total_minutes > 0 ? fmtTime(detail.total_minutes) : '—'}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              {detail.status !== 'concluida' && (
                <div className="space-y-2 pt-2">
                  {detail.status !== 'em_andamento' && (
                    <button onClick={() => { handleStart(detail.id); setDetail(prev => prev ? { ...prev, status: 'em_andamento', session_started_at: new Date().toISOString() } : prev); }}
                      disabled={acting === detail.id}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all"
                      style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)', color: '#60a5fa' }}>
                      <Play size={15} /> Iniciar
                    </button>
                  )}
                  {detail.status === 'em_andamento' && (
                    <button onClick={() => { handlePause(detail.id); setDetail(prev => prev ? { ...prev, status: 'pausada', session_started_at: null } : prev); }}
                      disabled={acting === detail.id}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all"
                      style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', color: '#f59e0b' }}>
                      <Pause size={15} /> Pausar
                    </button>
                  )}
                  <button onClick={() => handleComplete(detail.id)} disabled={acting === detail.id}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all"
                    style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.25)', color: '#34d399' }}>
                    <CheckCircle2 size={16} /> Marcar como concluída
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create modal */}
      {modal && (
        <div className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
          onClick={() => setModal(false)}>
          <div className="w-full max-w-md rounded-2xl p-6"
            style={{ background: '#07071a', border: '1px solid rgba(59,130,246,0.15)', boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }}
            onClick={e => e.stopPropagation()}>

            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-white">Nova tarefa</h2>
              <button onClick={() => setModal(false)} style={{ color: 'rgba(100,116,139,0.5)' }}><X size={18} /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="label-dark">Título *</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="O que precisa ser feito?" className="input-dark w-full mt-1" autoFocus />
              </div>
              <div>
                <label className="label-dark">Descrição</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={2} placeholder="Detalhes, contexto, briefing…" className="input-dark w-full mt-1 resize-none text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-dark">Prioridade</label>
                  <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                    className="input-dark w-full mt-1 text-sm">
                    <option value="baixa">Baixa</option>
                    <option value="media">Média</option>
                    <option value="alta">Alta</option>
                    <option value="urgente">Urgente</option>
                  </select>
                </div>
                <div>
                  <label className="label-dark">Prazo</label>
                  <input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                    className="input-dark w-full mt-1 text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-dark">Cliente</label>
                  <select value={form.agency_client_id} onChange={e => setForm(f => ({ ...f, agency_client_id: e.target.value }))}
                    className="input-dark w-full mt-1 text-sm">
                    <option value="">Sem cliente</option>
                    {clients.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                {isAdmin && users.length > 0 && (
                  <div>
                    <label className="label-dark">Responsável</label>
                    <select value={form.assigned_to} onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))}
                      className="input-dark w-full mt-1 text-sm">
                      <option value="">Sem responsável</option>
                      {users.map((u: any) => <option key={u.id} value={u.id}>{u.name}{u.job_title ? ` — ${u.job_title}` : ''}</option>)}
                    </select>
                  </div>
                )}
              </div>
              <div>
                <label className="label-dark">Tempo estimado (min)</label>
                <input type="number" value={form.estimated_minutes} onChange={e => setForm(f => ({ ...f, estimated_minutes: e.target.value }))}
                  placeholder="Ex: 60" className="input-dark w-full mt-1 text-sm" min="1" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setModal(false)} className="btn-ghost flex-1 justify-center">Cancelar</button>
                <button onClick={handleCreate} disabled={saving || !form.title} className="btn-primary flex-1 justify-center">
                  {saving ? 'Criando…' : 'Criar tarefa'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  function TaskCard({ task }: { task: Task }) {
    const cfg = PRIORITY_CFG[task.priority];
    const isDone = task.status === 'concluida';
    const isRunning = task.status === 'em_andamento';
    const isPaused = task.status === 'pausada';

    return (
      <div onClick={() => setDetail(task)}
        className="flex items-center gap-4 px-4 py-3.5 rounded-xl cursor-pointer group transition-all"
        style={{
          background: isRunning ? 'rgba(59,130,246,0.06)' : 'linear-gradient(145deg,#0c0c28,#0e0e2e)',
          border: isRunning ? '1px solid rgba(59,130,246,0.2)' : '1px solid rgba(59,130,246,0.08)',
        }}>

        {/* Priority dot */}
        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: isDone ? '#34d399' : cfg.dot }} />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium text-white truncate" style={{ textDecoration: isDone ? 'line-through' : 'none', opacity: isDone ? 0.5 : 1 }}>
              {task.title}
            </p>
            {task.client_name && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-md flex-shrink-0"
                style={{ background: 'rgba(59,130,246,0.1)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.15)' }}>
                {task.client_name}
              </span>
            )}
            {(task.content_title || task.campaign_name) && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-md flex-shrink-0"
                style={{ background: 'rgba(167,139,250,0.08)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.15)' }}>
                {task.content_title || task.campaign_name}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            {task.assigned_name && (
              <span className="text-[10px]" style={{ color: 'rgba(100,116,139,0.5)' }}>{task.assigned_name}</span>
            )}
            {task.due_date && (
              <span className="flex items-center gap-1 text-[10px]" style={{ color: 'rgba(100,116,139,0.5)' }}>
                <Calendar size={9} />{format(new Date(task.due_date), "d MMM", { locale: ptBR })}
              </span>
            )}
            {task.total_minutes > 0 && !isRunning && (
              <span className="flex items-center gap-1 text-[10px]" style={{ color: 'rgba(100,116,139,0.5)' }}>
                <Clock size={9} />{fmtTime(task.total_minutes)}
              </span>
            )}
          </div>
        </div>

        {/* Timer display or actions */}
        <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
          {isRunning && task.session_started_at && (
            <ElapsedTimer startedAt={task.session_started_at} baseMinutes={task.total_minutes} />
          )}
          {isPaused && (
            <span className="text-[10px] px-2 py-1 rounded-lg"
              style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>
              Pausada
            </span>
          )}
          {!isDone && (
            <>
              {isRunning ? (
                <button onClick={() => handlePause(task.id)} disabled={acting === task.id}
                  className="p-1.5 rounded-lg transition-colors"
                  style={{ color: '#f59e0b', background: 'rgba(245,158,11,0.1)' }}>
                  <Pause size={13} />
                </button>
              ) : (
                <button onClick={() => handleStart(task.id)} disabled={acting === task.id || !!activeTask}
                  className="p-1.5 rounded-lg transition-colors"
                  style={{ color: 'rgba(100,116,139,0.5)', opacity: activeTask && !isRunning ? 0.4 : 1 }}
                  onMouseEnter={e => { if (!activeTask) e.currentTarget.style.color = '#60a5fa'; }}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(100,116,139,0.5)')}>
                  <Play size={13} />
                </button>
              )}
              <button onClick={() => handleComplete(task.id)} disabled={acting === task.id}
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: 'rgba(100,116,139,0.5)' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#34d399')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(100,116,139,0.5)')}>
                <CheckCircle2 size={13} />
              </button>
            </>
          )}
        </div>
      </div>
    );
  }
}
