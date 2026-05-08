import { useEffect, useState } from 'react';
import {
  Play, Pause, CheckCircle2, Plus, X, Clock, Calendar,
  FileImage, Megaphone, Timer, Trash2, AlertTriangle, TrendingUp, Zap
} from 'lucide-react';
import { tasksApi, agencyClientsApi } from '../api/client';
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
  created_at: string;
  completed_at: string | null;
}

const PRIORITY_CFG = {
  urgente: { label: 'Urgente', color: '#f87171', bg: 'rgba(248,113,113,0.1)', dot: '#ef4444' },
  alta:    { label: 'Alta',    color: '#f97316', bg: 'rgba(249,115,22,0.1)',  dot: '#f97316' },
  media:   { label: 'Média',   color: '#60a5fa', bg: 'rgba(96,165,250,0.1)',  dot: '#3b82f6' },
  baixa:   { label: 'Baixa',   color: '#94a3b8', bg: 'rgba(148,163,184,0.08)', dot: '#64748b' },
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

const EMPTY_FORM = { title: '', description: '', assigned_to: '', agency_client_id: '', priority: 'media', due_date: '', est_hours: '', est_minutes: '' };

export default function Gerot() {
  const { user } = useAuth();
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
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
  const isTeam = user?.role === 'team';

  const load = async () => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (!isTeam) {
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

  const handleComplete = async (id: number) => {
    setActing(id);
    await tasksApi.complete(id);
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: 'concluida', session_started_at: null } : t));
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
    const estimated_minutes = (Number(form.est_hours || 0) * 60) + Number(form.est_minutes || 0) || null;
    const r = await tasksApi.create({
      title: form.title, description: form.description,
      assigned_to: form.assigned_to || null,
      agency_client_id: form.agency_client_id || null,
      priority: form.priority, due_date: form.due_date || null,
      estimated_minutes,
    });
    setTasks(prev => [r.data, ...prev]);
    setModal(false); setForm(EMPTY_FORM);
    setSaving(false);
  };

  const activeTask = tasks.find(t => t.status === 'em_andamento');

  if (isTeam) return <TeamPanel tasks={tasks} loading={loading} activeTask={activeTask} acting={acting} onStart={handleStart} onPause={handlePause} onComplete={handleComplete} onDetail={setDetail} detail={detail} setDetail={setDetail} />;

  // ── Admin view ──────────────────────────────────────────────────────────
  const grouped = (['urgente', 'alta', 'media', 'baixa'] as const).map(p => ({
    priority: p,
    tasks: tasks.filter(t => t.priority === p && t.status !== 'concluida'),
  })).filter(g => g.tasks.length > 0);
  const done = tasks.filter(t => t.status === 'concluida');

  return (
    <div className="p-8">
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
        <div className="flex items-center justify-between px-5 py-3 rounded-2xl mb-6"
          style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#3b82f6' }} />
            <span className="text-sm text-white font-medium">{activeTask.title}</span>
            {activeTask.client_name && <span className="badge badge-blue text-xs">{activeTask.client_name}</span>}
          </div>
          <div className="flex items-center gap-4">
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
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(59,130,246,0.08)' }}>
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
                  {ptasks.map(task => <TaskRow key={task.id} task={task} acting={acting} activeTask={activeTask} onStart={handleStart} onPause={handlePause} onComplete={handleComplete} onDetail={setDetail} />)}
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
                {done.map(task => <TaskRow key={task.id} task={task} acting={acting} activeTask={activeTask} onStart={handleStart} onPause={handlePause} onComplete={handleComplete} onDetail={setDetail} />)}
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

      <DetailPanel detail={detail} acting={acting} isAdmin={isAdmin} onClose={() => setDetail(null)} onStart={handleStart} onPause={handlePause} onComplete={handleComplete} onDelete={handleDelete} />

      {modal && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }} onClick={() => setModal(false)}>
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
  const weekTasks = myTasks.filter(t => t.due_date && isThisWeek(new Date(t.due_date), { weekStartsOn: 1 }));
  const urgentCount = myTasks.filter(t => t.priority === 'urgente').length;
  const doneThisWeek = tasks.filter(t => t.status === 'concluida' && t.completed_at && isThisWeek(new Date(t.completed_at), { weekStartsOn: 1 }));
  const timeToday = tasks.filter(t => t.status === 'concluida').reduce((s, t) => s + t.total_minutes, 0);

  const displayTasks = todayTasks.length > 0 ? todayTasks : myTasks.slice(0, 8);

  return (
    <div className="p-8 max-w-3xl">
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
      <div className="grid grid-cols-4 gap-3 mb-8">
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

      {/* Tasks */}
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
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-4"
            style={{ color: 'rgba(100,116,139,0.5)' }}>
            {todayTasks.length > 0 ? 'Suas tarefas de hoje' : 'Suas tarefas'}
          </p>
          <div className="space-y-3">
            {displayTasks.map(task => (
              <TeamTaskCard key={task.id} task={task} acting={acting} activeTask={activeTask}
                onStart={onStart} onPause={onPause} onComplete={onComplete} onDetail={onDetail} />
            ))}
          </div>

          {weekTasks.length > displayTasks.length && (
            <div className="mt-6">
              <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'rgba(100,116,139,0.5)' }}>
                Esta semana
              </p>
              <div className="space-y-2 opacity-70">
                {weekTasks.filter(t => !todayTasks.find(d => d.id === t.id)).map(task => (
                  <TeamTaskCard key={task.id} task={task} acting={acting} activeTask={activeTask}
                    onStart={onStart} onPause={onPause} onComplete={onComplete} onDetail={onDetail} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <DetailPanel detail={detail} acting={acting} isAdmin={false} onClose={() => setDetail(null)} onStart={onStart} onPause={onPause} onComplete={onComplete} onDelete={() => {}} />
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
function TaskRow({ task, acting, activeTask, onStart, onPause, onComplete, onDetail }: {
  task: Task; acting: number | null; activeTask: Task | undefined;
  onStart: (id: number) => void; onPause: (id: number) => void;
  onComplete: (id: number) => void; onDetail: (t: Task) => void;
}) {
  const cfg = PRIORITY_CFG[task.priority];
  const isRunning = task.status === 'em_andamento';

  return (
    <div onClick={() => onDetail(task)}
      className="flex items-center gap-4 px-4 py-3.5 rounded-xl cursor-pointer transition-all"
      style={{ background: isRunning ? 'rgba(59,130,246,0.06)' : 'linear-gradient(145deg,#0c0c28,#0e0e2e)', border: isRunning ? '1px solid rgba(59,130,246,0.2)' : '1px solid rgba(59,130,246,0.08)' }}>
      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cfg.dot }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-white truncate">{task.title}</p>
          {task.client_name && <span className="text-[10px] px-1.5 py-0.5 rounded-md" style={{ background: 'rgba(59,130,246,0.1)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.15)' }}>{task.client_name}</span>}
          {(task.content_title || task.campaign_name) && <span className="text-[10px] px-1.5 py-0.5 rounded-md" style={{ background: 'rgba(167,139,250,0.08)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.15)' }}>{task.content_title || task.campaign_name}</span>}
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          {task.assigned_name && <span className="text-[10px]" style={{ color: 'rgba(100,116,139,0.5)' }}>{task.assigned_name}</span>}
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
      </div>
    </div>
  );
}

/* ── Detail panel ────────────────────────────────────────────────────────── */
function DetailPanel({ detail, acting, isAdmin, onClose, onStart, onPause, onComplete, onDelete }: {
  detail: Task | null; acting: number | null; isAdmin: boolean;
  onClose: () => void; onStart: (id: number) => void; onPause: (id: number) => void;
  onComplete: (id: number) => void; onDelete: (id: number) => void;
}) {
  if (!detail) return null;
  const cfg = PRIORITY_CFG[detail.priority];

  return (
    <div className="fixed inset-0 flex items-center justify-end z-50" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }} onClick={onClose}>
      <div className="h-full w-full max-w-lg overflow-y-auto" style={{ background: '#07071a', borderLeft: '1px solid rgba(59,130,246,0.12)', boxShadow: '-20px 0 60px rgba(0,0,0,0.7)' }} onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(59,130,246,0.08)' }}>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ background: cfg.dot }} />
            <span className="text-sm font-medium" style={{ color: cfg.color }}>{cfg.label}</span>
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
                {detail.content_caption && <p className="text-xs mt-1 line-clamp-2" style={{ color: 'rgba(148,163,184,0.6)' }}>{detail.content_caption}</p>}
              </div>
            </div>
          )}

          <h2 className="text-xl font-semibold text-white">{detail.title}</h2>
          {detail.description && <p className="text-sm" style={{ color: 'rgba(148,163,184,0.8)', lineHeight: '1.6' }}>{detail.description}</p>}

          <div className="grid grid-cols-2 gap-3">
            {detail.client_name && <InfoCard label="Cliente" value={detail.client_name} />}
            {detail.assigned_name && <InfoCard label="Responsável" value={detail.assigned_name} />}
            {detail.due_date && <InfoCard label="Prazo" value={format(new Date(detail.due_date), "d MMM yyyy", { locale: ptBR })} />}
          </div>

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
              <button onClick={() => onComplete(detail.id)} disabled={acting === detail.id}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium"
                style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.25)', color: '#34d399' }}>
                <CheckCircle2 size={16} /> Marcar como concluída
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

function TaskForm({ form, setForm, clients, users, onSubmit, onCancel, saving }: any) {
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
      <div className="grid grid-cols-2 gap-3">
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
          <select value={form.agency_client_id} onChange={e => setForm((f: any) => ({ ...f, agency_client_id: e.target.value }))} className="input-dark w-full mt-1 text-sm">
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
