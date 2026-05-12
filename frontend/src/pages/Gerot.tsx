import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Play, Pause, CheckCircle2, Plus, X, Clock, Calendar,
  FileImage, Megaphone, Timer, Trash2, Send, ArrowRight, Zap, AlertTriangle, CheckSquare,
  LayoutList, CalendarDays, ChevronLeft, ChevronRight
} from 'lucide-react';
import { tasksApi, agencyClientsApi, contentApi, campaignsApi } from '../api/client';
import PostDetailPanel from './marketing/PostDetailPanel';
import { useAuth } from '../context/AuthContext';
import { format, isToday, isThisWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Task {
  id: number;
  title: string;
  description: string | null;
  assigned_to: number | null;
  assigned_name: string | null;
  assigned_job_title: string | null;
  content_piece_id: number | null;
  campaign_id: number | null;
  agency_client_id: number | null;
  client_name: string | null;
  content_title: string | null;
  content_media_url: string | null;
  content_caption: string | null;
  content_type: string | null;
  content_status: string | null;
  campaign_name: string | null;
  priority: 'baixa' | 'media' | 'alta' | 'urgente';
  status: 'a_fazer' | 'em_andamento' | 'pausada' | 'concluida';
  due_date: string | null;
  estimated_minutes: number | null;
  total_minutes: number;
  session_started_at: string | null;
  stage: string;
  parent_task_id: number | null;
  batch_id: number | null;
  batch_name: string | null;
  created_at: string;
  completed_at: string | null;
}

const PRIORITY_CFG = {
  urgente: { label: 'Urgente', color: '#f87171', bg: 'rgba(248,113,113,0.1)', dot: '#ef4444' },
  alta:    { label: 'Alta',    color: '#f97316', bg: 'rgba(249,115,22,0.1)',  dot: '#f97316' },
  media:   { label: 'Média',   color: '#60a5fa', bg: 'rgba(96,165,250,0.1)',  dot: '#3b82f6' },
  baixa:   { label: 'Baixa',   color: '#94a3b8', bg: 'rgba(148,163,184,0.08)', dot: '#64748b' },
};

const STAGE_CFG: Record<string, { label: string; color: string; bg: string }> = {
  planejamento: { label: 'Planejamento', color: '#a78bfa', bg: 'rgba(167,139,250,0.1)' },
  design:       { label: 'Design',       color: '#60a5fa', bg: 'rgba(96,165,250,0.1)'  },
  audiovisual:  { label: 'Audiovisual',  color: '#f59e0b', bg: 'rgba(245,158,11,0.1)'  },
  revisao:      { label: 'Revisão',      color: '#34d399', bg: 'rgba(52,211,153,0.1)'  },
  geral:        { label: 'Geral',        color: '#64748b', bg: 'rgba(100,116,139,0.08)' },
};

const CONTENT_STATUS_COLOR: Record<string, string> = {
  aguardando_aprovacao: '#f59e0b', aprovado: '#34d399', ajuste_solicitado: '#f97316',
  em_criacao: '#94a3b8', em_revisao: '#60a5fa', agendado: '#a78bfa', publicado: '#10b981',
};
const CONTENT_STATUS_LABEL: Record<string, string> = {
  aguardando_aprovacao: 'Ag. aprovação', aprovado: 'Aprovado', ajuste_solicitado: 'Ajuste solicitado',
  em_criacao: 'Em criação', em_revisao: 'Em revisão', agendado: 'Agendado', publicado: 'Publicado',
};
const TYPE_LABEL: Record<string, string> = { post: 'Post', reels: 'Reels', story: 'Story', carrossel: 'Carrossel' };

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
  const total = elapsed + baseMinutes * 60;
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return (
    <span className="font-mono font-bold" style={{ color: '#60a5fa' }}>
      {h > 0 && `${h}:`}{m.toString().padStart(2, '0')}:{s.toString().padStart(2, '0')}
    </span>
  );
}

const EMPTY_FORM = { title: '', description: '', assigned_to: '', agency_client_id: '', priority: 'media', stage: 'geral', due_date: '', est_hours: '', est_minutes: '', content_piece_id: '', campaign_id: '' };

export default function Gerot() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const initialClientId = searchParams.get('client_id') || '';
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'hoje' | 'semana' | 'todas'>('hoje');
  const [filterUser, setFilterUser] = useState('');
  const [clients, setClients] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [acting, setActing] = useState<number | null>(null);
  const [detail, setDetail] = useState<Task | null>(null);
  const [selectedPost, setSelectedPost] = useState<any | null>(null);
  const isAdmin = user?.role === 'owner';
  const isManager = user?.role === 'manager';
  const isTeam = user?.role === 'team';

  const handleDetail = async (task: Task) => {
    if (task.content_piece_id) {
      const r = await contentApi.get(task.content_piece_id);
      setSelectedPost(r.data);
    } else {
      setDetail(task);
    }
  };

  const load = async () => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (isTeam) {
      // team: backend restricts to own tasks, no date filter needed
    } else if (isManager) {
      // manager: fetch all tasks (frontend handles filtering in ManagerPanel)
    } else {
      // admin: apply date + user filters
      if (filter === 'hoje') params.due = 'today';
      if (filter === 'semana') params.due = 'week';
      if (filterUser) params.assigned_to = filterUser;
    }
    const r = await tasksApi.list(params);
    setTasks(r.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [filter, filterUser]);

  useEffect(() => {
    agencyClientsApi.list().then(r => setClients(r.data));
    fetch('/api/users', { headers: { Authorization: `Bearer ${localStorage.getItem('lunia_token')}` } })
      .then(r => r.json()).then(d => setUsers(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  const handleStart = async (id: number) => {
    setActing(id);
    await tasksApi.start(id);
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: 'em_andamento', session_started_at: new Date().toISOString() } : t));
    setDetail(prev => prev?.id === id ? { ...prev, status: 'em_andamento', session_started_at: new Date().toISOString() } : prev);
    setActing(null);
  };

  const handlePause = async (id: number) => {
    setActing(id);
    const r = await tasksApi.pause(id);
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: 'pausada', session_started_at: null, total_minutes: t.total_minutes + (r.data.minutes || 0) } : t));
    setDetail(prev => prev?.id === id ? { ...prev, status: 'pausada', session_started_at: null } : prev);
    setActing(null);
  };

  const handleComplete = async (id: number, handoff?: { next_assigned_to?: number; next_stage?: string; next_title?: string }) => {
    setActing(id);
    await tasksApi.complete(id, handoff);
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: 'concluida', session_started_at: null } : t));
    setDetail(null);
    setActing(null);
    if (handoff?.next_assigned_to) load();
  };

  const handleDelete = async (id: number) => {
    await tasksApi.delete(id);
    setTasks(prev => prev.filter(t => t.id !== id));
    setDetail(null);
  };

  const handleCreate = async () => {
    if (!form.title) return;
    setSaving(true);
    const estimated_minutes = (Number(form.est_hours || 0) * 60) + Number(form.est_minutes || 0) || null;
    const r = await tasksApi.create({
      title: form.title, description: form.description,
      assigned_to: form.assigned_to || null,
      agency_client_id: form.agency_client_id || null,
      priority: form.priority, stage: form.stage,
      due_date: form.due_date || null,
      estimated_minutes,
      content_piece_id: form.content_piece_id || null,
      campaign_id: form.campaign_id || null,
    });
    setTasks(prev => [r.data, ...prev]);
    setModal(false); setForm(EMPTY_FORM);
    setSaving(false);
  };

  const activeTask = tasks.find(t => t.status === 'em_andamento');

  if (isTeam) return <>
    <TeamPanel tasks={tasks} loading={loading} activeTask={activeTask} acting={acting} onStart={handleStart} onPause={handlePause} onComplete={handleComplete} onDetail={handleDetail} detail={detail} setDetail={setDetail} />
    {selectedPost && <PostDetailPanel post={selectedPost} onClose={() => setSelectedPost(null)} onUpdated={p => setSelectedPost(p)} onDeleted={() => { setSelectedPost(null); load(); }} />}
  </>;

  // Admin, superadmin e manager usam o mesmo painel
  if (isManager || isAdmin) return <>
    <ManagerPanel users={users} tasks={tasks} loading={loading} acting={acting} activeTask={activeTask} onStart={handleStart} onPause={handlePause} onComplete={handleComplete} onDetail={handleDetail} onDelete={handleDelete} detail={detail} setDetail={setDetail} onOpenModal={() => { setModal(true); setForm(EMPTY_FORM); }} initialClientId={initialClientId} />
    {selectedPost && <PostDetailPanel post={selectedPost} onClose={() => setSelectedPost(null)} onUpdated={p => setSelectedPost(p)} onDeleted={() => { setSelectedPost(null); load(); }} />}
    {modal && (
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }} onClick={() => setModal(false)}>
        <div className="w-full max-w-md rounded-2xl overflow-hidden flex flex-col" style={{ background: '#07071a', border: '1px solid rgba(59,130,246,0.15)', boxShadow: '0 24px 64px rgba(0,0,0,0.6)', maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between px-6 pt-6 pb-4 flex-shrink-0">
            <h2 className="text-lg font-semibold text-white">Nova tarefa</h2>
            <button onClick={() => setModal(false)} style={{ color: 'rgba(100,116,139,0.5)' }}><X size={18} /></button>
          </div>
          <div className="overflow-y-auto px-6 pb-6">
            <TaskForm form={form} setForm={setForm} clients={clients} users={users} onSubmit={handleCreate} onCancel={() => setModal(false)} saving={saving} />
          </div>
        </div>
      </div>
    )}
  </>;

  // ── Fallback (não deve chegar aqui) ─────────────────────────────────────
  const grouped = (['urgente', 'alta', 'media', 'baixa'] as const).map(p => ({
    priority: p,
    tasks: tasks.filter(t => t.priority === p && t.status !== 'concluida'),
  })).filter(g => g.tasks.length > 0);
  const done = tasks.filter(t => t.status === 'concluida');

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="section-label mb-1">Equipe</p>
          <h1 className="text-2xl font-semibold text-white">Gerot</h1>
        </div>
        <button onClick={() => { setModal(true); setForm(EMPTY_FORM); }} className="btn-primary flex items-center gap-2">
          <Plus size={15} /> Nova tarefa
        </button>
      </div>

      {activeTask && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 rounded-2xl mb-6"
          style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full animate-pulse flex-shrink-0" style={{ background: '#3b82f6' }} />
            <span className="text-sm text-white font-medium">{activeTask.title}</span>
            {activeTask.client_name && <span className="badge badge-blue text-xs">{activeTask.client_name}</span>}
          </div>
          <div className="flex items-center gap-3">
            {activeTask.session_started_at && <ElapsedTimer startedAt={activeTask.session_started_at} baseMinutes={activeTask.total_minutes} />}
            <button onClick={() => handlePause(activeTask.id)} disabled={acting === activeTask.id}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg"
              style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}>
              <Pause size={12} /> Pausar
            </button>
            <button onClick={() => handleComplete(activeTask.id)} disabled={acting === activeTask.id}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg"
              style={{ background: 'rgba(52,211,153,0.15)', color: '#34d399', border: '1px solid rgba(52,211,153,0.3)' }}>
              <CheckCircle2 size={12} /> Concluir
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-1 p-1 rounded-xl overflow-x-auto" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(59,130,246,0.08)' }}>
          {(['hoje', 'semana', 'todas'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className="px-4 py-1.5 text-sm rounded-lg transition-all capitalize"
              style={{ background: filter === f ? 'rgba(59,130,246,0.15)' : 'transparent', color: filter === f ? '#e2e8f0' : 'rgba(100,116,139,0.6)', border: filter === f ? '1px solid rgba(59,130,246,0.2)' : '1px solid transparent' }}>
              {f === 'todas' ? 'Todas' : f === 'hoje' ? 'Hoje' : 'Esta semana'}
            </button>
          ))}
        </div>
        {users.length > 0 && (
          <select value={filterUser} onChange={e => setFilterUser(e.target.value)} className="input-dark text-sm py-1.5 pr-8">
            <option value="">Toda a equipe</option>
            {users.map((u: any) => <option key={u.id} value={u.id}>{u.name}{u.job_title ? ` — ${u.job_title}` : ''}</option>)}
          </select>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'rgba(59,130,246,0.3)', borderTopColor: '#3b82f6' }} />
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(({ priority, tasks: ptasks }) => {
            const cfg = PRIORITY_CFG[priority];
            return (
              <div key={priority}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full" style={{ background: cfg.dot }} />
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: cfg.color }}>{cfg.label}</span>
                  <span className="text-xs" style={{ color: 'rgba(100,116,139,0.4)' }}>({ptasks.length})</span>
                </div>
                <div className="space-y-2">
                  {ptasks.map(task => <TaskRow key={task.id} task={task} acting={acting} activeTask={activeTask} onStart={handleStart} onPause={handlePause} onComplete={handleComplete} onDetail={handleDetail} />)}
                </div>
              </div>
            );
          })}
          {done.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 size={14} style={{ color: '#34d399' }} />
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#34d399' }}>Concluídas</span>
                <span className="text-xs" style={{ color: 'rgba(100,116,139,0.4)' }}>({done.length})</span>
              </div>
              <div className="space-y-2 opacity-50">
                {done.map(task => <TaskRow key={task.id} task={task} acting={acting} activeTask={activeTask} onStart={handleStart} onPause={handlePause} onComplete={handleComplete} onDetail={handleDetail} />)}
              </div>
            </div>
          )}
          {grouped.length === 0 && done.length === 0 && (
            <div className="text-center py-24">
              <CheckCircle2 size={40} className="mx-auto mb-3" style={{ color: 'rgba(100,116,139,0.15)' }} />
              <p className="text-sm" style={{ color: 'rgba(100,116,139,0.4)' }}>Nenhuma tarefa por aqui.</p>
            </div>
          )}
        </div>
      )}

      <DetailPanel detail={detail} acting={acting} isAdmin={isAdmin} users={users} onClose={() => setDetail(null)} onStart={handleStart} onPause={handlePause} onComplete={handleComplete} onDelete={handleDelete} />

      {selectedPost && (
        <PostDetailPanel
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
          onUpdated={p => setSelectedPost(p)}
          onDeleted={() => { setSelectedPost(null); load(); }}
        />
      )}

      {modal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }} onClick={() => setModal(false)}>
          <div className="w-full max-w-md rounded-2xl p-6" style={{ background: '#07071a', border: '1px solid rgba(59,130,246,0.15)', boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-white">Nova tarefa</h2>
              <button onClick={() => setModal(false)} style={{ color: 'rgba(100,116,139,0.5)' }}><X size={18} /></button>
            </div>
            <TaskForm form={form} setForm={setForm} clients={clients} users={users} onSubmit={handleCreate} onCancel={() => setModal(false)} saving={saving} />
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Manager Panel ───────────────────────────────────────────────────────── */
function ManagerPanel({ users, tasks, loading, acting, activeTask, onStart, onPause, onComplete, onDetail, onDelete, detail, setDetail, onOpenModal, initialClientId = '' }: {
  users: any[]; tasks: Task[]; loading: boolean; acting: number | null; activeTask: Task | undefined;
  onStart: (id: number) => void; onPause: (id: number) => void; onComplete: (id: number, h?: any) => void;
  onDetail: (t: Task) => void; onDelete: (id: number) => void; detail: Task | null; setDetail: (t: Task | null) => void;
  onOpenModal: () => void; initialClientId?: string;
}) {
  const { user } = useAuth();
  const [view, setView] = useState<'minhas' | 'calendario' | 'time'>('minhas');
  const [overview, setOverview] = useState<any>(null);
  const [showAllTasks, setShowAllTasks] = useState(false);
  const [myFilter, setMyFilter] = useState<'hoje' | 'semana' | 'todas'>(initialClientId ? 'todas' : 'hoje');
  const [clientFilter, setClientFilter] = useState(initialClientId);
  const [calWeekOffset, setCalWeekOffset] = useState(0);
  const [calMonthOffset, setCalMonthOffset] = useState(0);
  const [calMode, setCalMode] = useState<'semana' | 'mes'>('semana');
  const [showDone, setShowDone] = useState(false);
  const [expandedUsers, setExpandedUsers] = useState<Set<number>>(new Set());
  const [allTeamTasks, setAllTeamTasks] = useState<Task[]>([]);
  const [loadingTeamTasks, setLoadingTeamTasks] = useState(false);
  const today = new Date();

  // Split tasks between mine and team
  const myTasks = tasks.filter(t => t.assigned_to === user?.id && t.status !== 'concluida');
  const myDone  = tasks.filter(t => t.assigned_to === user?.id && t.status === 'concluida');
  const myActiveTask = tasks.find(t => t.assigned_to === user?.id && t.status === 'em_andamento');

  const myFiltered = (() => {
    // When a client filter is active, show all tasks for that client (including unassigned)
    let list = clientFilter
      ? tasks.filter(t => String(t.agency_client_id) === clientFilter && t.status !== 'concluida')
      : myTasks;
    if (myFilter === 'hoje') return list.filter(t => !t.due_date || isToday(new Date(t.due_date + 'T12:00:00')) || (new Date(t.created_at) && isToday(new Date(t.created_at))));
    if (myFilter === 'semana') return list.filter(t => !t.due_date || isThisWeek(new Date(t.due_date + 'T12:00:00'), { weekStartsOn: 1 }));
    return list;
  })();

  // Group team tasks by assignee for "Time" view
  const teamTasksByUser = users.map(u => ({
    user: u,
    open: tasks.filter(t => t.assigned_to === u.id && t.status !== 'concluida'),
    done: tasks.filter(t => t.assigned_to === u.id && t.status === 'concluida').length,
  })).filter(g => g.open.length > 0 || g.done > 0);

  useEffect(() => {
    tasksApi.teamOverview().then(r => setOverview(r.data));
  }, [tasks]);

  useEffect(() => {
    if (view === 'time') {
      setLoadingTeamTasks(true);
      tasksApi.list({}).then(r => { setAllTeamTasks(r.data); setLoadingTeamTasks(false); });
    }
  }, [view]);

  const toggleUser = (uid: number) => setExpandedUsers(prev => {
    const next = new Set(prev);
    next.has(uid) ? next.delete(uid) : next.add(uid);
    return next;
  });

  const totalOpen     = overview?.team?.reduce((s: number, m: any) => s + m.tasks_open, 0) ?? 0;
  const totalDone     = overview?.team?.reduce((s: number, m: any) => s + m.tasks_done_week, 0) ?? 0;
  const totalMinutes  = overview?.team?.reduce((s: number, m: any) => s + m.minutes_week, 0) ?? 0;
  const totalOverdue  = overview?.bottlenecks?.length ?? 0;
  const maxMinutes    = Math.max(...(overview?.clientHours?.map((c: any) => c.minutes_week) ?? [1]), 1);

  return (
    <div className="p-4 md:p-8">
      {/* Greeting + toggle */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-sm capitalize mb-1" style={{ color: 'rgba(100,116,139,0.5)' }}>
            {format(today, "EEEE, d 'de' MMMM", { locale: ptBR })}
          </p>
          <h1 className="text-3xl font-light text-white">
            Oi, <span style={{ color: '#60a5fa' }}>{user?.name?.split(' ')[0]}</span> 👋
          </h1>
          <p className="text-sm mt-1" style={{ color: 'rgba(100,116,139,0.5)' }}>
            {(user as any).job_title || 'Alta Gestão'}
          </p>
        </div>
        <div className="flex gap-1 p-1 rounded-xl flex-shrink-0"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(59,130,246,0.08)' }}>
          {([['minhas', 'Minhas tarefas', LayoutList], ['calendario', 'Calendário', CalendarDays], ['time', 'Time', CheckSquare]] as const).map(([v, label, Icon]) => (
            <button key={v} onClick={() => setView(v)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-all"
              style={{ background: view === v ? 'rgba(59,130,246,0.15)' : 'transparent', color: view === v ? '#e2e8f0' : 'rgba(100,116,139,0.6)', border: view === v ? '1px solid rgba(59,130,246,0.2)' : '1px solid transparent' }}>
              <Icon size={13} />{label}
            </button>
          ))}
        </div>
      </div>

      {/* ── MINHAS TAREFAS view ─────────────────────────────────────────────── */}
      {view === 'minhas' && (
        <>
          {/* Active task banner */}
          {myActiveTask && (
            <div className="flex items-center justify-between px-5 py-3.5 rounded-2xl mb-5"
              style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.25)' }}>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#3b82f6' }} />
                <div>
                  <p className="text-sm font-medium text-white">{myActiveTask.title}</p>
                  {myActiveTask.client_name && <p className="text-xs" style={{ color: 'rgba(59,130,246,0.6)' }}>{myActiveTask.client_name}</p>}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {myActiveTask.session_started_at && <ElapsedTimer startedAt={myActiveTask.session_started_at} baseMinutes={myActiveTask.total_minutes} />}
                <button onClick={() => onPause(myActiveTask.id)} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg"
                  style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}>
                  <Pause size={12} /> Pausar
                </button>
                <button onClick={() => onComplete(myActiveTask.id)} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg"
                  style={{ background: 'rgba(52,211,153,0.15)', color: '#34d399', border: '1px solid rgba(52,211,153,0.3)' }}>
                  <CheckCircle2 size={12} /> Concluir
                </button>
              </div>
            </div>
          )}

          {/* Filter tabs + client filter + new task */}
          <div className="flex items-center gap-2 justify-between mb-3 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(59,130,246,0.08)' }}>
                {(['hoje', 'semana', 'todas'] as const).map(f => (
                  <button key={f} onClick={() => setMyFilter(f)}
                    className="px-3 py-1.5 text-sm rounded-lg transition-all"
                    style={{ background: myFilter === f ? 'rgba(59,130,246,0.15)' : 'transparent', color: myFilter === f ? '#e2e8f0' : 'rgba(100,116,139,0.6)', border: myFilter === f ? '1px solid rgba(59,130,246,0.2)' : '1px solid transparent' }}>
                    {f === 'hoje' ? 'Hoje' : f === 'semana' ? 'Esta semana' : 'Todas'}
                  </button>
                ))}
              </div>
              {(() => {
                const clientsInTasks = Array.from(new Map(
                  myTasks.filter(t => t.client_name).map(t => [t.agency_client_id, t.client_name])
                ).entries());
                if (clientsInTasks.length < 2) return null;
                return (
                  <select value={clientFilter} onChange={e => setClientFilter(e.target.value)}
                    className="text-sm px-3 py-1.5 rounded-xl outline-none"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(59,130,246,0.12)', color: clientFilter ? '#e2e8f0' : 'rgba(100,116,139,0.5)', cursor: 'pointer' }}>
                    <option value="">Todos os clientes</option>
                    {clientsInTasks.map(([id, name]) => <option key={String(id)} value={String(id)}>{name}</option>)}
                  </select>
                );
              })()}
            </div>
            <button onClick={onOpenModal} className="btn-primary flex items-center gap-1.5 text-xs py-1.5 px-3">
              <Plus size={13} /> Nova tarefa
            </button>
          </div>

          {/* Progress header */}
          {!loading && myFiltered.length + myDone.length > 0 && (() => {
            const total = myFiltered.length + myDone.length;
            const done = myDone.length;
            const pct = Math.round((done / total) * 100);
            const overdue = myFiltered.filter(t => t.due_date && new Date(t.due_date + 'T23:59:00') < new Date()).length;
            return (
              <div className="flex items-center gap-4 px-4 py-3 rounded-xl mb-4"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(59,130,246,0.07)' }}>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-white font-medium">{done}/{total} concluídas</span>
                    <span className="text-xs font-semibold" style={{ color: pct === 100 ? '#34d399' : '#60a5fa' }}>{pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(59,130,246,0.1)' }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: pct === 100 ? '#34d399' : 'linear-gradient(90deg,#3b82f6,#6366f1)' }} />
                  </div>
                </div>
                {overdue > 0 && (
                  <span className="text-[11px] px-2 py-1 rounded-lg flex-shrink-0 flex items-center gap-1" style={{ background: 'rgba(248,113,113,0.1)', color: '#f87171' }}>
                    <AlertTriangle size={10} /> {overdue} atrasada{overdue > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            );
          })()}


          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'rgba(59,130,246,0.3)', borderTopColor: '#3b82f6' }} />
            </div>
          ) : myFiltered.length === 0 ? (
            <div className="text-center py-12 rounded-2xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(59,130,246,0.1)' }}>
              <CheckCircle2 size={28} className="mx-auto mb-2" style={{ color: 'rgba(52,211,153,0.3)' }} />
              <p className="text-sm" style={{ color: 'rgba(100,116,139,0.5)' }}>Nenhuma tarefa {myFilter === 'hoje' ? 'para hoje' : myFilter === 'semana' ? 'esta semana' : ''}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {myFiltered.map(task => (
                <TaskRow key={task.id} task={task} acting={acting} activeTask={myActiveTask}
                  onStart={onStart} onPause={onPause} onComplete={onComplete} onDetail={onDetail} onDelete={onDelete} />
              ))}
            </div>
          )}

          {myDone.length > 0 && (
            <div className="mt-4">
              <button onClick={() => setShowDone(s => !s)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all"
                style={{ color: 'rgba(100,116,139,0.5)', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(59,130,246,0.06)' }}>
                <span>{myDone.length} concluída{myDone.length > 1 ? 's' : ''}</span>
                <span style={{ transform: showDone ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', display: 'inline-block' }}>▾</span>
              </button>
              {showDone && (
                <div className="space-y-2 mt-2">
                  {myDone.map(task => (
                    <div key={task.id} onClick={() => onDetail(task)}
                      className="flex items-center gap-4 px-4 py-3 rounded-xl cursor-pointer opacity-50"
                      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(59,130,246,0.05)' }}>
                      <CheckCircle2 size={14} style={{ color: '#34d399', flexShrink: 0 }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate line-through">{task.title}</p>
                        {task.client_name && <span className="text-[10px]" style={{ color: 'rgba(59,130,246,0.5)' }}>{task.client_name}</span>}
                      </div>
                      {task.completed_at && (
                        <span className="text-[10px] flex-shrink-0" style={{ color: 'rgba(100,116,139,0.4)' }}>
                          {format(new Date(task.completed_at), "d MMM", { locale: ptBR })}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── CALENDÁRIO view ────────────────────────────────────────────────── */}
      {view === 'calendario' && (() => {
        const msDay = 86400000;
        const now = new Date();
        const todayStr = format(now, 'yyyy-MM-dd');
        const openTasks = tasks.filter(t => t.status !== 'concluida');
        const tasksWithDate = openTasks.filter(t => t.due_date);
        const tasksNoDate = openTasks.filter(t => !t.due_date);
        const allClients = Array.from(new Map(
          openTasks.filter(t => t.client_name).map(t => [t.agency_client_id, t.client_name])
        ).entries()).map(([id, name]) => ({ id, name }));
        const filtered = clientFilter
          ? { withDate: tasksWithDate.filter(t => String(t.agency_client_id) === clientFilter), noDate: tasksNoDate.filter(t => String(t.agency_client_id) === clientFilter) }
          : { withDate: tasksWithDate, noDate: tasksNoDate };

        // Week mode
        const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1;
        const monday = new Date(now.getTime() - dayOfWeek * msDay + calWeekOffset * 7 * msDay);
        monday.setHours(0, 0, 0, 0);
        const weekDays = Array.from({ length: 7 }, (_, i) => new Date(monday.getTime() + i * msDay));
        const weekLabel = `${format(weekDays[0], "d MMM", { locale: ptBR })} – ${format(weekDays[6], "d MMM", { locale: ptBR })}`;

        // Month mode
        const monthRef = new Date(now.getFullYear(), now.getMonth() + calMonthOffset, 1);
        const monthLabel = format(monthRef, "MMMM yyyy", { locale: ptBR });
        const firstDayOfMonth = new Date(monthRef.getFullYear(), monthRef.getMonth(), 1);
        const lastDayOfMonth = new Date(monthRef.getFullYear(), monthRef.getMonth() + 1, 0);
        const startDow = firstDayOfMonth.getDay() === 0 ? 6 : firstDayOfMonth.getDay() - 1;
        const gridStart = new Date(firstDayOfMonth.getTime() - startDow * msDay);
        gridStart.setHours(0, 0, 0, 0);
        const totalCells = Math.ceil((startDow + lastDayOfMonth.getDate()) / 7) * 7;
        const monthDays = Array.from({ length: totalCells }, (_, i) => new Date(gridStart.getTime() + i * msDay));

        const taskPill = (task: Task) => {
          const cfg = PRIORITY_CFG[task.priority] || PRIORITY_CFG.media;
          return (
            <div key={task.id} onClick={() => onDetail(task)} className="rounded px-1.5 py-0.5 cursor-pointer truncate"
              style={{ background: task.status === 'em_andamento' ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.05)', borderLeft: `2px solid ${cfg.dot}` }}>
              <p className="text-[10px] text-white truncate leading-tight">{task.title}</p>
            </div>
          );
        };

        return (
          <div>
            {/* Controls */}
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                {/* Mode toggle */}
                <div className="flex gap-1 p-0.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(59,130,246,0.08)' }}>
                  {(['semana', 'mes'] as const).map(m => (
                    <button key={m} onClick={() => setCalMode(m)}
                      className="px-2.5 py-1 text-xs rounded-md transition-all capitalize"
                      style={{ background: calMode === m ? 'rgba(59,130,246,0.15)' : 'transparent', color: calMode === m ? '#e2e8f0' : 'rgba(100,116,139,0.5)', border: calMode === m ? '1px solid rgba(59,130,246,0.2)' : '1px solid transparent' }}>
                      {m === 'semana' ? 'Semana' : 'Mês'}
                    </button>
                  ))}
                </div>
                {/* Nav */}
                <button onClick={() => calMode === 'semana' ? setCalWeekOffset(o => o - 1) : setCalMonthOffset(o => o - 1)}
                  className="p-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(59,130,246,0.1)', color: 'rgba(148,163,184,0.7)' }}>
                  <ChevronLeft size={15} />
                </button>
                <span className="text-sm font-medium min-w-32 text-center" style={{ color: '#e2e8f0' }}>
                  {calMode === 'semana' ? weekLabel : monthLabel}
                </span>
                <button onClick={() => calMode === 'semana' ? setCalWeekOffset(o => o + 1) : setCalMonthOffset(o => o + 1)}
                  className="p-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(59,130,246,0.1)', color: 'rgba(148,163,184,0.7)' }}>
                  <ChevronRight size={15} />
                </button>
                {(calMode === 'semana' ? calWeekOffset !== 0 : calMonthOffset !== 0) && (
                  <button onClick={() => { setCalWeekOffset(0); setCalMonthOffset(0); }} className="text-xs px-2 py-1 rounded-lg"
                    style={{ background: 'rgba(59,130,246,0.1)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.2)' }}>
                    Hoje
                  </button>
                )}
              </div>
              {allClients.length >= 2 && (
                <select value={clientFilter} onChange={e => setClientFilter(e.target.value)}
                  className="text-sm px-3 py-1.5 rounded-xl outline-none"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(59,130,246,0.12)', color: clientFilter ? '#e2e8f0' : 'rgba(100,116,139,0.5)', cursor: 'pointer' }}>
                  <option value="">Todos os clientes</option>
                  {allClients.map(c => <option key={String(c.id)} value={String(c.id)}>{c.name}</option>)}
                </select>
              )}
            </div>

            {/* ── WEEK grid ── */}
            {calMode === 'semana' && (
              <div className="grid grid-cols-7 gap-2 mb-6">
                {weekDays.map(day => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const isToday2 = dateStr === todayStr;
                  const isPast = dateStr < todayStr;
                  const dayTasks = filtered.withDate.filter(t => t.due_date === dateStr);
                  return (
                    <div key={dateStr} className="rounded-2xl overflow-hidden flex flex-col min-h-[160px]"
                      style={{ background: isToday2 ? 'rgba(59,130,246,0.06)' : 'rgba(255,255,255,0.02)', border: isToday2 ? '1px solid rgba(59,130,246,0.25)' : '1px solid rgba(59,130,246,0.06)' }}>
                      <div className="px-2 py-2 text-center" style={{ borderBottom: '1px solid rgba(59,130,246,0.06)' }}>
                        <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: isToday2 ? '#60a5fa' : 'rgba(100,116,139,0.5)' }}>{format(day, 'EEE', { locale: ptBR })}</p>
                        <p className="text-sm font-semibold" style={{ color: isToday2 ? '#60a5fa' : isPast ? 'rgba(100,116,139,0.35)' : '#e2e8f0' }}>{format(day, 'd')}</p>
                      </div>
                      <div className="p-1.5 flex-1 space-y-1 overflow-y-auto">
                        {dayTasks.length === 0
                          ? <div className="h-full flex items-center justify-center py-4"><span style={{ color: 'rgba(100,116,139,0.2)', fontSize: '10px' }}>—</span></div>
                          : dayTasks.map(task => {
                              const cfg = PRIORITY_CFG[task.priority] || PRIORITY_CFG.media;
                              return (
                                <div key={task.id} onClick={() => onDetail(task)} className="rounded-lg px-2 py-1.5 cursor-pointer"
                                  style={{ background: task.status === 'em_andamento' ? 'rgba(59,130,246,0.12)' : 'rgba(255,255,255,0.04)', border: `1px solid ${cfg.dot}25` }}>
                                  <div className="flex items-start gap-1 mb-0.5">
                                    <div className="w-1.5 h-1.5 rounded-full mt-1 flex-shrink-0" style={{ background: cfg.dot }} />
                                    <p className="text-[11px] font-medium text-white leading-tight line-clamp-2">{task.title}</p>
                                  </div>
                                  {task.client_name && <p className="text-[9px] pl-2.5" style={{ color: '#60a5fa' }}>{task.client_name}</p>}
                                </div>
                              );
                            })
                        }
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── MONTH grid ── */}
            {calMode === 'mes' && (
              <div className="mb-6">
                {/* Day-of-week headers */}
                <div className="grid grid-cols-7 gap-1 mb-1">
                  {['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'].map(d => (
                    <div key={d} className="text-center py-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(100,116,139,0.4)' }}>{d}</span>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {monthDays.map(day => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const isToday2 = dateStr === todayStr;
                    const inMonth = day.getMonth() === monthRef.getMonth();
                    const isPast = dateStr < todayStr;
                    const dayTasks = filtered.withDate.filter(t => t.due_date === dateStr);
                    return (
                      <div key={dateStr} className="rounded-xl p-1.5 min-h-[80px] flex flex-col"
                        style={{ background: isToday2 ? 'rgba(59,130,246,0.08)' : 'rgba(255,255,255,0.02)', border: isToday2 ? '1px solid rgba(59,130,246,0.3)' : '1px solid rgba(59,130,246,0.05)', opacity: inMonth ? 1 : 0.35 }}>
                        <p className="text-xs font-semibold mb-1 text-right pr-0.5"
                          style={{ color: isToday2 ? '#60a5fa' : isPast && inMonth ? 'rgba(100,116,139,0.4)' : 'rgba(148,163,184,0.7)' }}>
                          {format(day, 'd')}
                        </p>
                        <div className="space-y-0.5 flex-1 overflow-hidden">
                          {dayTasks.slice(0, 3).map(task => taskPill(task))}
                          {dayTasks.length > 3 && (
                            <p className="text-[9px] pl-1" style={{ color: 'rgba(100,116,139,0.5)' }}>+{dayTasks.length - 3} mais</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tasks without date */}
            {filtered.noDate.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'rgba(100,116,139,0.4)' }}>
                  Sem data ({filtered.noDate.length})
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                  {filtered.noDate.map(task => {
                    const cfg = PRIORITY_CFG[task.priority] || PRIORITY_CFG.media;
                    return (
                      <div key={task.id} onClick={() => onDetail(task)} className="rounded-xl px-3 py-2.5 cursor-pointer"
                        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(59,130,246,0.07)' }}>
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: cfg.dot }} />
                          <p className="text-xs font-medium text-white truncate">{task.title}</p>
                        </div>
                        {task.client_name && <p className="text-[10px] pl-3.5 mt-0.5" style={{ color: 'rgba(59,130,246,0.6)' }}>{task.client_name}</p>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* ── TIME view ──────────────────────────────────────────────────────── */}
      {view === 'time' && (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[
              { icon: CheckSquare,   label: 'Tarefas abertas',   value: totalOpen,                                      color: '#60a5fa' },
              { icon: CheckCircle2,  label: 'Concluídas semana', value: totalDone,                                      color: '#34d399' },
              { icon: Timer,         label: 'Horas esta semana', value: totalMinutes > 0 ? fmtTime(totalMinutes) : '—', color: '#a78bfa' },
              { icon: AlertTriangle, label: 'Atrasadas',         value: totalOverdue, color: totalOverdue > 0 ? '#f87171' : '#64748b' },
            ].map(s => (
              <div key={s.label} className="rounded-2xl px-4 py-4"
                style={{ background: 'linear-gradient(145deg,#0c0c28,#0e0e2e)', border: '1px solid rgba(59,130,246,0.08)' }}>
                <s.icon size={16} className="mb-2" style={{ color: s.color }} />
                <p className="text-xl font-bold text-white">{s.value}</p>
                <p className="text-[10px] mt-0.5 leading-tight" style={{ color: 'rgba(100,116,139,0.5)' }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* Per-person accordion */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(100,116,139,0.5)' }}>
                Equipe — {overview?.team?.length ?? 0} pessoas
              </p>
              <button onClick={onOpenModal} className="btn-primary flex items-center gap-1.5 text-xs py-1.5 px-3">
                <Plus size={13} /> Nova tarefa
              </button>
            </div>

            {(loading || loadingTeamTasks || !overview) ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'rgba(59,130,246,0.3)', borderTopColor: '#3b82f6' }} />
              </div>
            ) : (
              <div className="space-y-2">
                {overview.team?.map((member: any) => {
                  const memberTasks = allTeamTasks.filter(t => t.assigned_to === member.id && t.status !== 'concluida');
                  const isExpanded = expandedUsers.has(member.id);
                  const totalForProgress = member.tasks_open + member.tasks_done_week;
                  const progressPct = totalForProgress > 0 ? Math.round((member.tasks_done_week / totalForProgress) * 100) : 0;

                  return (
                    <div key={member.id} className="rounded-2xl overflow-hidden"
                      style={{ background: 'linear-gradient(145deg,#0c0c28,#0e0e2e)', border: member.active_task ? '1px solid rgba(59,130,246,0.2)' : '1px solid rgba(59,130,246,0.07)' }}>

                      {/* Header — clickable */}
                      <button className="w-full flex items-center gap-4 px-4 py-3.5 text-left" onClick={() => toggleUser(member.id)}>
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                          style={{ background: member.active_task ? 'linear-gradient(135deg,#3b82f6,#6366f1)' : 'rgba(100,116,139,0.18)' }}>
                          {member.name.charAt(0)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="text-sm font-medium text-white">{member.name}</p>
                            {member.job_title && <span className="text-[10px]" style={{ color: 'rgba(100,116,139,0.45)' }}>{member.job_title}</span>}
                          </div>
                          {member.active_task ? (
                            <p className="text-[11px] truncate" style={{ color: 'rgba(59,130,246,0.7)' }}>
                              <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle animate-pulse" style={{ background: '#3b82f6' }} />
                              {member.active_task}
                            </p>
                          ) : (
                            <p className="text-[11px]" style={{ color: 'rgba(100,116,139,0.35)' }}>Sem tarefa ativa</p>
                          )}
                          {totalForProgress > 0 && (
                            <div className="h-1 rounded-full mt-2 overflow-hidden" style={{ background: 'rgba(59,130,246,0.1)' }}>
                              <div className="h-full rounded-full transition-all" style={{ width: `${progressPct}%`, background: progressPct === 100 ? '#34d399' : 'linear-gradient(90deg,#3b82f6,#6366f1)' }} />
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-3 flex-shrink-0">
                          {member.overdue_tasks > 0 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-1" style={{ background: 'rgba(248,113,113,0.12)', color: '#f87171' }}>
                              <AlertTriangle size={9} /> {member.overdue_tasks}
                            </span>
                          )}
                          <div className="text-right">
                            <p className="text-sm font-semibold text-white">{member.tasks_open}</p>
                            <p className="text-[9px]" style={{ color: 'rgba(100,116,139,0.4)' }}>abertas</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold" style={{ color: '#34d399' }}>{member.tasks_done_week}</p>
                            <p className="text-[9px]" style={{ color: 'rgba(100,116,139,0.4)' }}>semana</p>
                          </div>
                          <ChevronRight size={14} style={{ color: 'rgba(100,116,139,0.4)', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform 0.2s', flexShrink: 0 }} />
                        </div>
                      </button>

                      {/* Expanded task list */}
                      {isExpanded && (
                        <div style={{ borderTop: '1px solid rgba(59,130,246,0.06)' }}>
                          {memberTasks.length === 0 ? (
                            <div className="px-4 py-5 text-center">
                              <p className="text-xs" style={{ color: 'rgba(100,116,139,0.4)' }}>Nenhuma tarefa aberta</p>
                            </div>
                          ) : (
                            <div className="divide-y" style={{ borderColor: 'rgba(59,130,246,0.04)' }}>
                              {memberTasks.map(task => {
                                const cfg = PRIORITY_CFG[task.priority] || PRIORITY_CFG.media;
                                const isOverdue = !!(task.due_date && new Date(task.due_date + 'T23:59:00') < new Date());
                                const daysOverdue = isOverdue ? Math.floor((Date.now() - new Date(task.due_date! + 'T23:59:00').getTime()) / 86400000) : 0;
                                return (
                                  <div key={task.id} onClick={() => onDetail(task)}
                                    className="flex items-center gap-3 px-4 py-3 cursor-pointer transition-all"
                                    style={{ background: 'transparent' }}
                                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: cfg.dot }} />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm text-white truncate">{task.title}</p>
                                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                        {task.client_name && <span className="text-[10px]" style={{ color: 'rgba(59,130,246,0.6)' }}>{task.client_name}</span>}
                                        {task.due_date && (
                                          <span className="text-[10px]" style={{ color: isOverdue ? '#f87171' : 'rgba(100,116,139,0.5)' }}>
                                            {isOverdue ? `${daysOverdue}d atraso` : format(new Date(task.due_date + 'T12:00:00'), "d MMM", { locale: ptBR })}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <span className="text-[10px] px-2 py-0.5 rounded-full flex-shrink-0"
                                      style={{
                                        background: task.status === 'em_andamento' ? 'rgba(59,130,246,0.12)' : task.status === 'pausada' ? 'rgba(245,158,11,0.1)' : 'rgba(100,116,139,0.08)',
                                        color: task.status === 'em_andamento' ? '#60a5fa' : task.status === 'pausada' ? '#f59e0b' : 'rgba(100,116,139,0.5)',
                                      }}>
                                      {task.status === 'em_andamento' ? '▶ Ativa' : task.status === 'pausada' ? '⏸ Pausada' : 'A fazer'}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Bottlenecks */}
          {overview?.bottlenecks?.length > 0 && (
            <div className="mb-8">
              <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#f87171' }}>
                Gargalos — {overview.bottlenecks.length} tarefa{overview.bottlenecks.length > 1 ? 's' : ''} atrasada{overview.bottlenecks.length > 1 ? 's' : ''}
              </p>
              <div className="space-y-2">
                {overview.bottlenecks.map((b: any) => (
                  <div key={b.id} className="flex items-center gap-3 px-4 py-3 rounded-xl"
                    style={{ background: 'rgba(248,113,113,0.05)', border: '1px solid rgba(248,113,113,0.15)' }}>
                    <AlertTriangle size={13} style={{ color: '#f87171', flexShrink: 0 }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{b.title}</p>
                      <p className="text-[10px] mt-0.5" style={{ color: 'rgba(100,116,139,0.5)' }}>
                        {b.assigned_name || 'Sem responsável'} {b.client_name ? `· ${b.client_name}` : ''}
                      </p>
                    </div>
                    <span className="text-[10px] flex-shrink-0" style={{ color: '#f87171' }}>{b.days_overdue}d atraso</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Client hours */}
          {overview?.clientHours?.length > 0 && (
            <div className="mb-8">
              <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'rgba(100,116,139,0.5)' }}>
                Horas por cliente — últimos 7 dias
              </p>
              <div className="space-y-2.5 rounded-2xl p-4"
                style={{ background: 'linear-gradient(145deg,#0c0c28,#0e0e2e)', border: '1px solid rgba(59,130,246,0.08)' }}>
                {overview.clientHours.map((c: any) => (
                  <div key={c.client_id} className="flex items-center gap-3">
                    <p className="text-xs w-28 flex-shrink-0 truncate" style={{ color: 'rgba(148,163,184,0.8)' }}>{c.client_name}</p>
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(59,130,246,0.08)' }}>
                      <div className="h-full rounded-full" style={{ width: `${(c.minutes_week / maxMinutes) * 100}%`, background: 'linear-gradient(90deg,#3b82f6,#6366f1)' }} />
                    </div>
                    <p className="text-xs w-12 text-right flex-shrink-0" style={{ color: 'rgba(100,116,139,0.5)' }}>{fmtTime(c.minutes_week)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <DetailPanel detail={detail} acting={acting} isAdmin={true} users={users} onClose={() => setDetail(null)}
        onStart={onStart} onPause={onPause} onComplete={onComplete} onDelete={() => {}} />
    </div>
  );
}

/* ── Team Panel ──────────────────────────────────────────────────────────── */
function TeamPanel({ tasks, loading, activeTask, acting, onStart, onPause, onComplete, onDetail, detail, setDetail }: {
  tasks: Task[]; loading: boolean; activeTask: Task | undefined; acting: number | null;
  onStart: (id: number) => void; onPause: (id: number) => void; onComplete: (id: number) => void;
  onDetail: (t: Task) => void; detail: Task | null; setDetail: (t: Task | null) => void;
}) {
  const { user } = useAuth();
  const today = new Date();
  const dayName = format(today, "EEEE", { locale: ptBR });
  const dateStr = format(today, "d 'de' MMMM", { locale: ptBR });

  const myTasks = tasks.filter(t => t.status !== 'concluida');
  const todayTasks = myTasks.filter(t => t.due_date && isToday(new Date(t.due_date)));
  const urgentCount = myTasks.filter(t => t.priority === 'urgente').length;
  const doneThisWeek = tasks.filter(t => t.status === 'concluida' && t.completed_at && isThisWeek(new Date(t.completed_at), { weekStartsOn: 1 }));
  const timeToday = tasks.filter(t => t.status === 'concluida').reduce((s, t) => s + t.total_minutes, 0);

  const displayTasks = todayTasks.length > 0 ? todayTasks : myTasks;

  // Group display tasks by batch; tasks without batch go to standalone group
  const batchMap = new Map<string, { batchId: number | null; batchName: string | null; clientName: string | null; tasks: Task[] }>();
  for (const t of displayTasks) {
    const key = t.batch_id ? `batch-${t.batch_id}` : 'standalone';
    if (!batchMap.has(key)) batchMap.set(key, { batchId: t.batch_id, batchName: t.batch_name, clientName: t.client_name, tasks: [] });
    batchMap.get(key)!.tasks.push(t);
  }
  const groups = Array.from(batchMap.values()).sort((a, b) => (a.batchId ? 0 : 1) - (b.batchId ? 0 : 1));

  return (
    <div className="p-4 md:p-8 max-w-3xl">
      {/* Greeting */}
      <div className="mb-8">
        <p className="text-sm capitalize mb-1" style={{ color: 'rgba(100,116,139,0.5)' }}>
          {dayName}, {dateStr}
        </p>
        <h1 className="text-3xl font-light text-white">
          Oi, <span style={{ color: '#60a5fa' }}>{user?.name?.split(' ')[0]}</span> 👋
        </h1>
        {user && (
          <p className="text-sm mt-1" style={{ color: 'rgba(100,116,139,0.5)' }}>
            {(user as any).job_title || 'Time lun.ia'}
          </p>
        )}
      </div>

      {/* Active timer banner */}
      {activeTask && (
        <div className="flex items-center justify-between px-5 py-3.5 rounded-2xl mb-6"
          style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.25)', boxShadow: '0 0 20px rgba(59,130,246,0.06)' }}>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#3b82f6' }} />
            <div>
              <p className="text-sm font-medium text-white">{activeTask.title}</p>
              {activeTask.client_name && <p className="text-xs" style={{ color: 'rgba(59,130,246,0.6)' }}>{activeTask.client_name}</p>}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {activeTask.session_started_at && <ElapsedTimer startedAt={activeTask.session_started_at} baseMinutes={activeTask.total_minutes} />}
            <button onClick={() => onPause(activeTask.id)} disabled={acting === activeTask.id}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg"
              style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}>
              <Pause size={12} /> Pausar
            </button>
            <button onClick={() => onComplete(activeTask.id)} disabled={acting === activeTask.id}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg"
              style={{ background: 'rgba(52,211,153,0.15)', color: '#34d399', border: '1px solid rgba(52,211,153,0.3)' }}>
              <CheckCircle2 size={12} /> Concluir
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {[
          { icon: Calendar,      label: 'Tarefas hoje',     value: todayTasks.length,     color: '#60a5fa' },
          { icon: Zap,           label: 'Urgentes',         value: urgentCount,            color: '#f87171' },
          { icon: CheckCircle2,  label: 'Concluídas semana',value: doneThisWeek.length,    color: '#34d399' },
          { icon: Timer,         label: 'Tempo registrado', value: timeToday > 0 ? fmtTime(timeToday) : '—', color: '#a78bfa' },
        ].map(s => (
          <div key={s.label} className="rounded-2xl px-4 py-4"
            style={{ background: 'linear-gradient(145deg,#0c0c28,#0e0e2e)', border: '1px solid rgba(59,130,246,0.08)' }}>
            <s.icon size={16} className="mb-2" style={{ color: s.color }} />
            <p className="text-xl font-bold text-white">{s.value}</p>
            <p className="text-[10px] mt-0.5 leading-tight" style={{ color: 'rgba(100,116,139,0.5)' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tasks grouped by batch */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'rgba(59,130,246,0.3)', borderTopColor: '#3b82f6' }} />
        </div>
      ) : displayTasks.length === 0 ? (
        <div className="text-center py-16 rounded-2xl" style={{ background: 'linear-gradient(145deg,#0c0c28,#0e0e2e)', border: '1px solid rgba(59,130,246,0.08)' }}>
          <CheckCircle2 size={36} className="mx-auto mb-3" style={{ color: 'rgba(52,211,153,0.3)' }} />
          <p className="text-white font-medium mb-1">Tudo em dia!</p>
          <p className="text-sm" style={{ color: 'rgba(100,116,139,0.4)' }}>Nenhuma tarefa pendente para hoje.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map(group => (
            <BatchGroup key={group.batchId ?? 'standalone'} group={group}
              acting={acting} activeTask={activeTask}
              onStart={onStart} onPause={onPause} onComplete={onComplete} onDetail={onDetail} />
          ))}
          {doneThisWeek.length > 0 && (
            <p className="text-xs text-center pt-2" style={{ color: 'rgba(100,116,139,0.35)' }}>
              {doneThisWeek.length} tarefa{doneThisWeek.length > 1 ? 's' : ''} concluída{doneThisWeek.length > 1 ? 's' : ''} esta semana
            </p>
          )}
        </div>
      )}

      <DetailPanel detail={detail} acting={acting} isAdmin={false} users={[]} onClose={() => setDetail(null)} onStart={onStart} onPause={onPause} onComplete={onComplete} onDelete={() => {}} />
    </div>
  );
}

/* ── Batch group for team panel ─────────────────────────────────────────── */
function BatchGroup({ group, acting, activeTask, onStart, onPause, onComplete, onDetail }: {
  group: { batchId: number | null; batchName: string | null; clientName: string | null; tasks: Task[] };
  acting: number | null; activeTask: Task | undefined;
  onStart: (id: number) => void; onPause: (id: number) => void;
  onComplete: (id: number) => void; onDetail: (t: Task) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const done = group.tasks.filter(t => t.status === 'concluida').length;
  const total = group.tasks.length;
  const hasRunning = group.tasks.some(t => t.status === 'em_andamento');

  if (!group.batchId) {
    return (
      <div className="space-y-3">
        {group.tasks.map(task => (
          <TeamTaskCard key={task.id} task={task} acting={acting} activeTask={activeTask}
            onStart={onStart} onPause={onPause} onComplete={onComplete} onDetail={onDetail} />
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: 'linear-gradient(145deg,#0c0c28,#0e0e2e)', border: hasRunning ? '1px solid rgba(59,130,246,0.2)' : '1px solid rgba(59,130,246,0.08)' }}>
      {/* Batch header */}
      <button className="w-full flex items-center gap-3 px-4 py-3 text-left"
        style={{ borderBottom: collapsed ? 'none' : '1px solid rgba(59,130,246,0.06)' }}
        onClick={() => setCollapsed(c => !c)}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-white">{group.batchName}</span>
            {group.clientName && <span className="text-[10px] px-1.5 py-0.5 rounded-md" style={{ background: 'rgba(59,130,246,0.1)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.15)' }}>{group.clientName}</span>}
            {hasRunning && <span className="w-1.5 h-1.5 rounded-full animate-pulse flex-shrink-0" style={{ background: '#3b82f6' }} />}
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <div className="w-16 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(59,130,246,0.1)' }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${total > 0 ? (done / total) * 100 : 0}%`, background: done === total ? '#34d399' : '#3b82f6' }} />
            </div>
            <span className="text-[10px]" style={{ color: done === total ? '#34d399' : 'rgba(100,116,139,0.5)' }}>{done}/{total}</span>
          </div>
          <span style={{ color: 'rgba(100,116,139,0.4)', transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.2s', display: 'inline-block' }}>▾</span>
        </div>
      </button>

      {!collapsed && (
        <div className="divide-y" style={{ borderColor: 'rgba(59,130,246,0.04)' }}>
          {group.tasks.map(task => (
            <TeamTaskCard key={task.id} task={task} acting={acting} activeTask={activeTask}
              onStart={onStart} onPause={onPause} onComplete={onComplete} onDetail={onDetail} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Team task card with inline content preview ──────────────────────────── */
function TeamTaskCard({ task, acting, activeTask, onStart, onPause, onComplete, onDetail }: {
  task: Task; acting: number | null; activeTask: Task | undefined;
  onStart: (id: number) => void; onPause: (id: number) => void;
  onComplete: (id: number) => void; onDetail: (t: Task) => void;
}) {
  const cfg = PRIORITY_CFG[task.priority];
  const isRunning = task.status === 'em_andamento';
  const isPaused = task.status === 'pausada';
  const hasOtherRunning = activeTask && activeTask.id !== task.id;

  return (
    <div className="rounded-2xl overflow-hidden cursor-pointer group transition-all"
      style={{ background: 'linear-gradient(145deg,#0c0c28,#0e0e2e)', border: isRunning ? '1px solid rgba(59,130,246,0.25)' : '1px solid rgba(59,130,246,0.08)' }}
      onClick={() => onDetail(task)}>

      <div className="flex items-start gap-4 p-4">
        {/* Priority dot */}
        <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ background: cfg.dot }} />

        {/* Content piece thumbnail */}
        {task.content_media_url ? (
          <img src={task.content_media_url} alt={task.content_title || ''} className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
            style={{ border: '1px solid rgba(59,130,246,0.15)' }} />
        ) : task.content_piece_id ? (
          <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.1)' }}>
            <FileImage size={18} style={{ color: 'rgba(59,130,246,0.3)' }} />
          </div>
        ) : task.campaign_id ? (
          <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.1)' }}>
            <Megaphone size={18} style={{ color: 'rgba(167,139,250,0.4)' }} />
          </div>
        ) : null}

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <p className="text-sm font-semibold text-white">{task.title}</p>
            <span className="text-[10px] px-1.5 py-0.5 rounded-md font-medium"
              style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {task.client_name && (
              <span className="text-xs" style={{ color: 'rgba(59,130,246,0.6)' }}>{task.client_name}</span>
            )}
            {task.content_type && (
              <span className="text-xs" style={{ color: 'rgba(100,116,139,0.5)' }}>{TYPE_LABEL[task.content_type] || task.content_type}</span>
            )}
            {task.content_status && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                style={{ background: `${CONTENT_STATUS_COLOR[task.content_status]}15`, color: CONTENT_STATUS_COLOR[task.content_status] }}>
                {CONTENT_STATUS_LABEL[task.content_status]}
              </span>
            )}
            {task.due_date && (
              <span className="flex items-center gap-1 text-[10px]" style={{ color: 'rgba(100,116,139,0.5)' }}>
                <Calendar size={9} />{format(new Date(task.due_date), "d MMM", { locale: ptBR })}
              </span>
            )}
            {task.estimated_minutes && (
              <span className="flex items-center gap-1 text-[10px]" style={{ color: 'rgba(100,116,139,0.5)' }}>
                <Clock size={9} />{fmtTime(task.estimated_minutes)}
              </span>
            )}
          </div>

          {task.description && (
            <p className="text-xs mt-1.5 line-clamp-1" style={{ color: 'rgba(148,163,184,0.5)' }}>{task.description}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
          {isRunning && task.session_started_at && (
            <ElapsedTimer startedAt={task.session_started_at} baseMinutes={task.total_minutes} />
          )}
          {isPaused && (
            <span className="text-[10px] px-2 py-1 rounded-lg" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>Pausada</span>
          )}
          {isRunning ? (
            <button onClick={() => onPause(task.id)} disabled={acting === task.id}
              className="p-2 rounded-xl transition-all" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }}>
              <Pause size={14} />
            </button>
          ) : (
            <button onClick={() => onStart(task.id)} disabled={acting === task.id || !!hasOtherRunning}
              className="p-2 rounded-xl transition-all"
              style={{ background: hasOtherRunning ? 'rgba(255,255,255,0.03)' : 'rgba(59,130,246,0.1)', color: hasOtherRunning ? 'rgba(100,116,139,0.3)' : '#60a5fa', border: hasOtherRunning ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(59,130,246,0.2)' }}>
              <Play size={14} />
            </button>
          )}
          <button onClick={() => onComplete(task.id)} disabled={acting === task.id}
            className="p-2 rounded-xl transition-all"
            style={{ background: 'rgba(52,211,153,0.08)', color: 'rgba(52,211,153,0.5)', border: '1px solid rgba(52,211,153,0.15)' }}
            onMouseEnter={e => { (e.currentTarget.style.color = '#34d399'); (e.currentTarget.style.background = 'rgba(52,211,153,0.15)'); }}
            onMouseLeave={e => { (e.currentTarget.style.color = 'rgba(52,211,153,0.5)'); (e.currentTarget.style.background = 'rgba(52,211,153,0.08)'); }}>
            <CheckCircle2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Shared admin task row ───────────────────────────────────────────────── */
function TaskRow({ task, acting, activeTask, onStart, onPause, onComplete, onDetail, onDelete }: {
  task: Task; acting: number | null; activeTask: Task | undefined;
  onStart: (id: number) => void; onPause: (id: number) => void;
  onComplete: (id: number) => void; onDetail: (t: Task) => void; onDelete?: (id: number) => void;
}) {
  const cfg = PRIORITY_CFG[task.priority];
  const isRunning = task.status === 'em_andamento';

  return (
    <div onClick={() => onDetail(task)}
      className="group flex items-center gap-4 px-4 py-3.5 rounded-xl cursor-pointer transition-all"
      style={{ background: isRunning ? 'rgba(59,130,246,0.06)' : 'linear-gradient(145deg,#0c0c28,#0e0e2e)', border: isRunning ? '1px solid rgba(59,130,246,0.2)' : '1px solid rgba(59,130,246,0.08)' }}>
      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cfg.dot }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-white truncate">{task.title}</p>
          {task.client_name && <span className="text-[10px] px-1.5 py-0.5 rounded-md" style={{ background: 'rgba(59,130,246,0.1)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.15)' }}>{task.client_name}</span>}
          {task.campaign_name && <span className="text-[10px] px-1.5 py-0.5 rounded-md" style={{ background: 'rgba(167,139,250,0.08)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.15)' }}>{task.campaign_name}</span>}
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          {task.assigned_name
            ? <span className="text-[10px]" style={{ color: 'rgba(100,116,139,0.5)' }}>{task.assigned_name}</span>
            : <span className="text-[10px] px-1.5 py-0.5 rounded-md font-medium" style={{ background: 'rgba(245,158,11,0.08)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }}>Sem responsável</span>
          }
          {task.due_date && <span className="flex items-center gap-1 text-[10px]" style={{ color: 'rgba(100,116,139,0.5)' }}><Calendar size={9} />{format(new Date(task.due_date), "d MMM", { locale: ptBR })}</span>}
          {task.total_minutes > 0 && !isRunning && <span className="flex items-center gap-1 text-[10px]" style={{ color: 'rgba(100,116,139,0.5)' }}><Clock size={9} />{fmtTime(task.total_minutes)}</span>}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
        {isRunning && task.session_started_at && <ElapsedTimer startedAt={task.session_started_at} baseMinutes={task.total_minutes} />}
        {isRunning ? (
          <button onClick={() => onPause(task.id)} disabled={acting === task.id} className="p-1.5 rounded-lg" style={{ color: '#f59e0b', background: 'rgba(245,158,11,0.1)' }}><Pause size={13} /></button>
        ) : (
          <button onClick={() => onStart(task.id)} disabled={acting === task.id || !!(activeTask && !isRunning)} className="p-1.5 rounded-lg" style={{ color: 'rgba(100,116,139,0.5)' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#60a5fa')} onMouseLeave={e => (e.currentTarget.style.color = 'rgba(100,116,139,0.5)')}>
            <Play size={13} />
          </button>
        )}
        <button onClick={() => onComplete(task.id)} disabled={acting === task.id} className="p-1.5 rounded-lg" style={{ color: 'rgba(100,116,139,0.5)' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#34d399')} onMouseLeave={e => (e.currentTarget.style.color = 'rgba(100,116,139,0.5)')}>
          <CheckCircle2 size={13} />
        </button>
        {onDelete && (
          <button onClick={e => { e.stopPropagation(); onDelete(task.id); }} title="Apagar"
            className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ color: 'rgba(248,113,113,0.5)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#f87171'; (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.1)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(248,113,113,0.5)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
            <Trash2 size={13} />
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Detail panel ────────────────────────────────────────────────────────── */
function DetailPanel({ detail, acting, isAdmin, users, onClose, onStart, onPause, onComplete, onDelete }: {
  detail: Task | null; acting: number | null; isAdmin: boolean; users: any[];
  onClose: () => void; onStart: (id: number) => void; onPause: (id: number) => void;
  onComplete: (id: number, handoff?: any) => void; onDelete: (id: number) => void;
}) {
  const { user } = useAuth();
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [posting, setPosting] = useState(false);
  const [handoffOpen, setHandoffOpen] = useState(false);
  const [handoff, setHandoff] = useState({ next_assigned_to: '', next_stage: 'design', next_title: '' });
  const [editingDueDate, setEditingDueDate] = useState(false);
  const [dueDate, setDueDate] = useState('');
  const commentsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!detail) return;
    setHandoffOpen(false);
    setHandoff({ next_assigned_to: '', next_stage: 'design', next_title: '' });
    setDueDate(detail.due_date || '');
    setEditingDueDate(false);
    tasksApi.listComments(detail.id).then(r => setComments(Array.isArray(r.data) ? r.data : []));
  }, [detail?.id]);

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  const submitComment = async () => {
    if (!newComment.trim() || !detail) return;
    setPosting(true);
    const r = await tasksApi.addComment(detail.id, newComment.trim());
    setComments(prev => [...prev, r.data]);
    setNewComment('');
    setPosting(false);
  };

  const handleCompleteClick = () => {
    if (!detail) return;
    if (handoffOpen && handoff.next_assigned_to) {
      onComplete(detail.id, { next_assigned_to: Number(handoff.next_assigned_to), next_stage: handoff.next_stage, next_title: handoff.next_title || undefined });
    } else {
      onComplete(detail.id);
    }
  };

  if (!detail) return null;
  const cfg = PRIORITY_CFG[detail.priority];
  const stageCfg = STAGE_CFG[detail.stage] || STAGE_CFG.geral;

  return (
    <div className="fixed inset-0 flex items-center justify-end z-50" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }} onClick={onClose}>
      <div className="h-full w-full md:max-w-lg overflow-y-auto" style={{ background: '#07071a', borderLeft: '1px solid rgba(59,130,246,0.12)', boxShadow: '-20px 0 60px rgba(0,0,0,0.7)' }} onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(59,130,246,0.08)' }}>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ background: cfg.dot }} />
            <span className="text-sm font-medium" style={{ color: cfg.color }}>{cfg.label}</span>
            {detail.stage !== 'geral' && (
              <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: stageCfg.bg, color: stageCfg.color }}>{stageCfg.label}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <button onClick={() => onDelete(detail.id)} className="p-1.5 rounded-lg transition-colors" style={{ color: 'rgba(100,116,139,0.4)' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#f87171')} onMouseLeave={e => (e.currentTarget.style.color = 'rgba(100,116,139,0.4)')}>
                <Trash2 size={14} />
              </button>
            )}
            <button onClick={onClose} style={{ color: 'rgba(100,116,139,0.5)' }}><X size={18} /></button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Content piece preview */}
          {detail.content_piece_id && (
            <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(59,130,246,0.12)' }}>
              {detail.content_media_url && (
                <img src={detail.content_media_url} alt={detail.content_title || ''} className="w-full object-cover" style={{ maxHeight: '240px' }} />
              )}
              <div className="px-4 py-3" style={{ background: 'rgba(59,130,246,0.04)' }}>
                <div className="flex items-center gap-2 mb-1">
                  {detail.content_type && <span className="badge badge-slate text-xs">{TYPE_LABEL[detail.content_type] || detail.content_type}</span>}
                  {detail.content_status && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: `${CONTENT_STATUS_COLOR[detail.content_status]}15`, color: CONTENT_STATUS_COLOR[detail.content_status] }}>
                      {CONTENT_STATUS_LABEL[detail.content_status]}
                    </span>
                  )}
                </div>
                <p className="text-sm font-medium text-white">{detail.content_title}</p>
                {detail.content_caption && <p className="text-xs mt-1" style={{ color: 'rgba(148,163,184,0.6)', whiteSpace: 'pre-line' }}>{detail.content_caption}</p>}
              </div>
            </div>
          )}

          <h2 className="text-xl font-semibold text-white">{detail.title}</h2>
          {detail.description && <p className="text-sm" style={{ color: 'rgba(148,163,184,0.8)', lineHeight: '1.6' }}>{detail.description}</p>}

          <div className="grid grid-cols-2 gap-3">
            {detail.client_name && <InfoCard label="Cliente" value={detail.client_name} />}
            <InfoCard label="Responsável" value={detail.assigned_name || '— Sem responsável'} />
            <div className="rounded-xl px-3 py-2.5" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(59,130,246,0.08)' }}>
              <p className="text-[10px] mb-1 font-semibold uppercase tracking-wide" style={{ color: 'rgba(100,116,139,0.5)' }}>Prazo</p>
              <input type="date" value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                onBlur={async e => {
                  if (!detail) return;
                  await tasksApi.update(detail.id, { due_date: e.target.value || null });
                }}
                className="text-sm text-white bg-transparent outline-none w-full cursor-pointer"
                style={{ colorScheme: 'dark' }} />
            </div>
          </div>

          {/* Time */}
          <div className="rounded-xl p-4" style={{ background: 'rgba(59,130,246,0.04)', border: '1px solid rgba(59,130,246,0.1)' }}>
            <p className="label-dark mb-3 flex items-center gap-2"><Timer size={12} />Tempo</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] mb-0.5" style={{ color: 'rgba(100,116,139,0.5)' }}>Estimado</p>
                <p className="text-sm text-white font-medium">{detail.estimated_minutes ? fmtTime(detail.estimated_minutes) : '—'}</p>
              </div>
              <div>
                <p className="text-[10px] mb-0.5" style={{ color: 'rgba(100,116,139,0.5)' }}>Registrado</p>
                {detail.status === 'em_andamento' && detail.session_started_at
                  ? <ElapsedTimer startedAt={detail.session_started_at} baseMinutes={detail.total_minutes} />
                  : <p className="text-sm text-white font-medium">{detail.total_minutes > 0 ? fmtTime(detail.total_minutes) : '—'}</p>}
              </div>
            </div>
          </div>

          {/* Comments / Briefing thread */}
          <div>
            <p className="label-dark mb-3">Briefing & comentários internos</p>
            <div className="space-y-3 mb-3 max-h-64 overflow-y-auto">
              {comments.length === 0 ? (
                <p className="text-xs py-3 text-center" style={{ color: 'rgba(100,116,139,0.35)' }}>Nenhum comentário ainda. Escreva o briefing aqui.</p>
              ) : comments.map(c => (
                <div key={c.id} className={`flex gap-2.5 ${c.user_id === user?.id ? 'flex-row-reverse' : ''}`}>
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)', color: 'white' }}>
                    {(c.user_name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className={`max-w-[75%] ${c.user_id === user?.id ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                    <span className="text-[10px]" style={{ color: 'rgba(100,116,139,0.5)' }}>{c.user_name}</span>
                    <div className="px-3 py-2 rounded-xl text-sm" style={{
                      background: c.user_id === user?.id ? 'rgba(59,130,246,0.12)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${c.user_id === user?.id ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.06)'}`,
                      color: '#e2e8f0', whiteSpace: 'pre-wrap'
                    }}>{c.content}</div>
                    <span className="text-[9px]" style={{ color: 'rgba(100,116,139,0.35)' }}>
                      {format(new Date(c.created_at), "d MMM HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                </div>
              ))}
              <div ref={commentsEndRef} />
            </div>
            <div className="flex gap-2">
              <textarea value={newComment} onChange={e => setNewComment(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitComment(); } }}
                placeholder="Escreva o briefing, copy ou comentário… (Enter para enviar)"
                rows={2} className="input-dark flex-1 text-sm resize-none" />
              <button onClick={submitComment} disabled={posting || !newComment.trim()}
                className="px-3 rounded-xl flex-shrink-0 self-end pb-2.5 transition-opacity"
                style={{ color: newComment.trim() ? '#60a5fa' : 'rgba(100,116,139,0.3)', background: 'transparent' }}>
                <Send size={15} />
              </button>
            </div>
          </div>

          {/* Actions */}
          {detail.status !== 'concluida' && (
            <div className="space-y-2 pt-2">
              {detail.status !== 'em_andamento' ? (
                <button onClick={() => onStart(detail.id)} disabled={acting === detail.id}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium"
                  style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)', color: '#60a5fa' }}>
                  <Play size={15} /> Iniciar
                </button>
              ) : (
                <button onClick={() => onPause(detail.id)} disabled={acting === detail.id}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium"
                  style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', color: '#f59e0b' }}>
                  <Pause size={15} /> Pausar
                </button>
              )}

              {/* Handoff toggle */}
              <button onClick={() => setHandoffOpen(o => !o)}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-sm transition-all"
                style={{ background: handoffOpen ? 'rgba(167,139,250,0.1)' : 'transparent', border: '1px solid rgba(167,139,250,0.2)', color: '#a78bfa' }}>
                <ArrowRight size={13} /> {handoffOpen ? 'Cancelar passagem de bastão' : 'Passar bastão para próxima etapa'}
              </button>

              {handoffOpen && (
                <div className="rounded-xl p-4 space-y-3" style={{ background: 'rgba(167,139,250,0.05)', border: '1px solid rgba(167,139,250,0.15)' }}>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="label-dark text-[10px]">Próxima etapa</label>
                      <select value={handoff.next_stage} onChange={e => setHandoff(h => ({ ...h, next_stage: e.target.value }))} className="input-dark w-full mt-1 text-sm">
                        {Object.entries(STAGE_CFG).filter(([k]) => k !== 'geral').map(([k, v]) => (
                          <option key={k} value={k}>{v.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="label-dark text-[10px]">Responsável</label>
                      <select value={handoff.next_assigned_to} onChange={e => setHandoff(h => ({ ...h, next_assigned_to: e.target.value }))} className="input-dark w-full mt-1 text-sm">
                        <option value="">Selecionar…</option>
                        {users.map((u: any) => <option key={u.id} value={u.id}>{u.name}{u.job_title ? ` — ${u.job_title}` : ''}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="label-dark text-[10px]">Título da nova tarefa (opcional)</label>
                    <input value={handoff.next_title} onChange={e => setHandoff(h => ({ ...h, next_title: e.target.value }))}
                      placeholder={detail.title} className="input-dark w-full mt-1 text-sm" />
                  </div>
                </div>
              )}

              <button onClick={handleCompleteClick} disabled={acting === detail.id || (handoffOpen && !handoff.next_assigned_to)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium"
                style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.25)', color: '#34d399', opacity: (handoffOpen && !handoff.next_assigned_to) ? 0.5 : 1 }}>
                <CheckCircle2 size={16} />
                {handoffOpen && handoff.next_assigned_to ? 'Concluir e passar bastão' : 'Marcar como concluída'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl px-3 py-2.5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <p className="text-[10px] mb-0.5" style={{ color: 'rgba(100,116,139,0.5)' }}>{label}</p>
      <p className="text-sm text-white font-medium">{value}</p>
    </div>
  );
}

function getThumb(p: any): string | null {
  try {
    const files = JSON.parse(p.media_files || '[]');
    const img = files.find((f: any) => f.type === 'image');
    if (img?.url) return img.url;
  } catch {}
  return p.media_url || null;
}

function TaskForm({ form, setForm, clients, users, onSubmit, onCancel, saving }: any) {
  const [batches, setBatches] = useState<any[]>([]);
  const [selectedBatch, setSelectedBatch] = useState('');
  const [pieces, setPieces] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [showPostPicker, setShowPostPicker] = useState(false);

  useEffect(() => {
    if (!form.agency_client_id) { setBatches([]); setSelectedBatch(''); setPieces([]); setCampaigns([]); return; }
    contentApi.listBatches({ client_id: form.agency_client_id }).then(r => {
      const bs = r.data || [];
      setBatches(bs);
      // default to most recent batch
      if (bs.length > 0) setSelectedBatch(String(bs[bs.length - 1].id));
    });
    campaignsApi.list({ client_id: form.agency_client_id }).then(r => setCampaigns(r.data));
  }, [form.agency_client_id]);

  useEffect(() => {
    if (!selectedBatch) { setPieces([]); return; }
    contentApi.list({ batch_id: selectedBatch }).then(r => setPieces(r.data || []));
  }, [selectedBatch]);

  const selectedPost = pieces.find((p: any) => String(p.id) === String(form.content_piece_id)) || null;

  return (
    <div className="space-y-4">
      <div>
        <label className="label-dark">Título *</label>
        <input value={form.title} onChange={e => setForm((f: any) => ({ ...f, title: e.target.value }))}
          placeholder="O que precisa ser feito?" className="input-dark w-full mt-1" autoFocus />
      </div>
      <div>
        <label className="label-dark">Descrição</label>
        <textarea value={form.description} onChange={e => setForm((f: any) => ({ ...f, description: e.target.value }))}
          rows={2} placeholder="Detalhes, contexto, briefing…" className="input-dark w-full mt-1 resize-none text-sm" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="label-dark">Etapa</label>
          <select value={form.stage} onChange={e => setForm((f: any) => ({ ...f, stage: e.target.value }))} className="input-dark w-full mt-1 text-sm">
            {Object.entries(STAGE_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label-dark">Prioridade</label>
          <select value={form.priority} onChange={e => setForm((f: any) => ({ ...f, priority: e.target.value }))} className="input-dark w-full mt-1 text-sm">
            <option value="baixa">Baixa</option>
            <option value="media">Média</option>
            <option value="alta">Alta</option>
            <option value="urgente">Urgente</option>
          </select>
        </div>
        <div>
          <label className="label-dark">Prazo</label>
          <input type="date" value={form.due_date} onChange={e => setForm((f: any) => ({ ...f, due_date: e.target.value }))} className="input-dark w-full mt-1 text-sm" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label-dark">Cliente</label>
          <select value={form.agency_client_id}
            onChange={e => setForm((f: any) => ({ ...f, agency_client_id: e.target.value, content_piece_id: '', campaign_id: '' }))}
            className="input-dark w-full mt-1 text-sm">
            <option value="">Sem cliente</option>
            {clients.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        {users.length > 0 && (
          <div>
            <label className="label-dark">Responsável</label>
            <select value={form.assigned_to} onChange={e => setForm((f: any) => ({ ...f, assigned_to: e.target.value }))} className="input-dark w-full mt-1 text-sm">
              <option value="">Sem responsável</option>
              {users.map((u: any) => <option key={u.id} value={u.id}>{u.name}{u.job_title ? ` — ${u.job_title}` : ''}</option>)}
            </select>
          </div>
        )}
      </div>
      {form.agency_client_id && (
        <div className="space-y-3">
          {/* Post relacionado */}
          <div>
            <label className="label-dark">Post relacionado</label>
            {/* Feed selector */}
            {batches.length > 0 && (
              <div className="flex gap-1.5 mt-1 mb-2 flex-wrap">
                {batches.map((b: any) => (
                  <button key={b.id} type="button"
                    onClick={() => { setSelectedBatch(String(b.id)); setShowPostPicker(true); setForm((f: any) => ({ ...f, content_piece_id: '' })); }}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
                    style={{
                      background: selectedBatch === String(b.id) ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.04)',
                      border: selectedBatch === String(b.id) ? '1px solid rgba(59,130,246,0.35)' : '1px solid rgba(255,255,255,0.07)',
                      color: selectedBatch === String(b.id) ? '#60a5fa' : 'rgba(148,163,184,0.6)',
                    }}>
                    {b.name}
                  </button>
                ))}
              </div>
            )}

            {/* Selected post preview */}
            {selectedPost ? (
              <div className="flex items-center gap-3 p-2 rounded-xl mt-1 cursor-pointer"
                onClick={() => setShowPostPicker(p => !p)}
                style={{ background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.2)' }}>
                <div className="w-10 rounded-lg overflow-hidden flex-shrink-0" style={{ aspectRatio: '1080/1350', background: 'rgba(59,130,246,0.05)' }}>
                  {getThumb(selectedPost)
                    ? <img src={getThumb(selectedPost)!} className="w-full h-full object-cover" alt="" />
                    : <div className="w-full h-full flex items-center justify-center"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(59,130,246,0.3)" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white truncate">{selectedPost.title}</p>
                  {selectedPost.scheduled_date && (
                    <p className="text-[10px] mt-0.5" style={{ color: 'rgba(100,116,139,0.5)' }}>
                      {format(new Date(selectedPost.scheduled_date + 'T12:00:00'), "d 'de' MMMM", { locale: ptBR })}
                    </p>
                  )}
                </div>
                <button type="button" onClick={e => { e.stopPropagation(); setForm((f: any) => ({ ...f, content_piece_id: '' })); setShowPostPicker(false); }}
                  className="p-1 rounded-lg flex-shrink-0" style={{ color: 'rgba(100,116,139,0.5)' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => setShowPostPicker(p => !p)}
                className="w-full mt-1 px-3 py-2 rounded-xl text-sm text-left transition-all"
                style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(100,116,139,0.5)' }}>
                {batches.length === 0 ? 'Nenhum feed encontrado' : 'Selecionar post…'}
              </button>
            )}

            {/* Post grid picker */}
            {showPostPicker && pieces.length > 0 && (
              <div className="mt-2 rounded-xl overflow-hidden" style={{ border: '1px solid rgba(59,130,246,0.15)', background: 'rgba(5,5,15,0.8)' }}>
                <div className="grid grid-cols-3 gap-0.5 p-0.5" style={{ maxHeight: '220px', overflowY: 'auto' }}>
                  {pieces.map((p: any) => {
                    const thumb = getThumb(p);
                    const isSelected = String(form.content_piece_id) === String(p.id);
                    return (
                      <button key={p.id} type="button"
                        onClick={() => { setForm((f: any) => ({ ...f, content_piece_id: p.id })); setShowPostPicker(false); }}
                        className="relative overflow-hidden rounded-lg group"
                        style={{ aspectRatio: '1080/1350', background: 'rgba(59,130,246,0.04)', outline: isSelected ? '2px solid #3b82f6' : undefined }}>
                        {thumb
                          ? <img src={thumb} className="w-full h-full object-cover" alt={p.title} />
                          : <div className="w-full h-full flex items-center justify-center"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(59,130,246,0.2)" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>
                        }
                        {/* Hover overlay with title + date */}
                        <div className="absolute inset-0 flex flex-col justify-end p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 50%)' }}>
                          <p className="text-white text-[8px] font-medium leading-tight line-clamp-2">{p.title}</p>
                          {p.scheduled_date && (
                            <p className="text-[7px] mt-0.5" style={{ color: 'rgba(255,255,255,0.55)' }}>
                              {format(new Date(p.scheduled_date + 'T12:00:00'), "d MMM", { locale: ptBR })}
                            </p>
                          )}
                        </div>
                        {isSelected && (
                          <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.3)' }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Campanha relacionada */}
          <div>
            <label className="label-dark">Campanha relacionada</label>
            <select value={form.campaign_id} onChange={e => setForm((f: any) => ({ ...f, campaign_id: e.target.value }))} className="input-dark w-full mt-1 text-sm">
              <option value="">Nenhuma</option>
              {campaigns.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
      )}
      <div>
        <label className="label-dark">Tempo estimado</label>
        <div className="flex gap-2 mt-1">
          <div className="relative flex-1">
            <input type="number" value={form.est_hours} onChange={e => setForm((f: any) => ({ ...f, est_hours: e.target.value }))}
              placeholder="0" className="input-dark w-full text-sm pr-8" min="0" />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs pointer-events-none" style={{ color: 'rgba(100,116,139,0.5)' }}>h</span>
          </div>
          <div className="relative flex-1">
            <input type="number" value={form.est_minutes} onChange={e => setForm((f: any) => ({ ...f, est_minutes: e.target.value }))}
              placeholder="0" className="input-dark w-full text-sm pr-10" min="0" max="59" />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs pointer-events-none" style={{ color: 'rgba(100,116,139,0.5)' }}>min</span>
          </div>
        </div>
        {(form.est_hours || form.est_minutes) && (
          <p className="text-xs mt-1" style={{ color: 'rgba(100,116,139,0.45)' }}>
            = {fmtTime((Number(form.est_hours || 0) * 60) + Number(form.est_minutes || 0))}
          </p>
        )}
      </div>
      <div className="flex gap-3 pt-2">
        <button onClick={onCancel} className="btn-ghost flex-1 justify-center">Cancelar</button>
        <button onClick={onSubmit} disabled={saving || !form.title} className="btn-primary flex-1 justify-center">
          {saving ? 'Criando…' : 'Criar tarefa'}
        </button>
      </div>
    </div>
  );
}
