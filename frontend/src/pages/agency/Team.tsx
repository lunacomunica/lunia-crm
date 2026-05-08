import { useEffect, useState } from 'react';
import { tasksApi } from '../../api/client';
import { AlertTriangle, Clock, CheckCircle2, Play, Timer } from 'lucide-react';

interface TeamMember {
  id: number; name: string; job_title: string | null; avatar: string | null;
  active_task: string | null; active_task_id: number | null;
  tasks_today: number; tasks_open: number; tasks_done_week: number;
  overdue_tasks: number; minutes_week: number;
}
interface Bottleneck {
  id: number; title: string; due_date: string; priority: string;
  assigned_name: string; client_name: string | null; days_overdue: number;
}

function minutesToHours(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h${m > 0 ? ` ${m}m` : ''}` : `${m}m`;
}

const PRIORITY_COLOR: Record<string, string> = { alta: '#f87171', media: '#f59e0b', baixa: '#60a5fa' };

export default function AgencyTeam() {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [bottlenecks, setBottlenecks] = useState<Bottleneck[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    tasksApi.teamOverview().then(r => {
      setTeam(r.data.team || []);
      setBottlenecks(r.data.bottlenecks || []);
      setLoading(false);
    });
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
        style={{ borderColor: 'rgba(59,130,246,0.3)', borderTopColor: '#3b82f6' }} />
    </div>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">Equipe</h1>
        <p className="text-sm" style={{ color: 'rgba(100,116,139,0.7)' }}>Capacidade e carga de trabalho do time</p>
      </div>

      {/* Team grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-10">
        {team.length === 0 ? (
          <p className="text-sm col-span-3 text-center py-10" style={{ color: 'rgba(100,116,139,0.5)' }}>
            Nenhum membro de equipe cadastrado
          </p>
        ) : team.map(member => (
          <div key={member.id} className="rounded-2xl p-5 flex flex-col gap-4"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>

            {/* Person header */}
            <div className="flex items-center gap-3">
              {member.avatar ? (
                <img src={member.avatar} alt={member.name} className="w-10 h-10 rounded-full object-cover"
                  style={{ border: '1px solid rgba(59,130,246,0.3)' }} />
              ) : (
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)' }}>
                  {member.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-sm font-semibold text-white">{member.name}</p>
                <p className="text-[11px]" style={{ color: 'rgba(100,116,139,0.6)' }}>
                  {member.job_title || 'Time'}
                </p>
              </div>
              {member.overdue_tasks > 0 && (
                <span className="ml-auto text-[10px] font-medium px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(248,113,113,0.1)', color: '#f87171', border: '1px solid rgba(248,113,113,0.2)' }}>
                  {member.overdue_tasks} atrasada{member.overdue_tasks !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            {/* Active task */}
            {member.active_task && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
                style={{ background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.15)' }}>
                <Play size={11} style={{ color: '#60a5fa', flexShrink: 0 }} />
                <span className="text-xs truncate" style={{ color: '#93c5fd' }}>{member.active_task}</span>
              </div>
            )}

            {/* Stats row */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'Hoje', value: member.tasks_today, icon: Clock, color: '#60a5fa' },
                { label: 'Abertas', value: member.tasks_open, icon: AlertTriangle, color: member.tasks_open > 5 ? '#f59e0b' : 'rgba(100,116,139,0.6)' },
                { label: 'Feitas', value: member.tasks_done_week, icon: CheckCircle2, color: '#34d399' },
                { label: 'Horas', value: minutesToHours(member.minutes_week), icon: Timer, color: '#a78bfa' },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="flex flex-col items-center gap-1 py-2 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.02)' }}>
                  <Icon size={12} style={{ color }} />
                  <p className="text-sm font-bold text-white">{value}</p>
                  <p className="text-[9px]" style={{ color: 'rgba(100,116,139,0.5)' }}>{label}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Bottlenecks */}
      {bottlenecks.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <AlertTriangle size={16} style={{ color: '#f87171' }} />
            Tarefas atrasadas
          </h2>
          <div className="rounded-2xl overflow-hidden"
            style={{ border: '1px solid rgba(248,113,113,0.15)' }}>
            {bottlenecks.map((b, i) => (
              <div key={b.id} className="flex items-center gap-4 px-5 py-3.5"
                style={{ background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent', borderBottom: i < bottlenecks.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: PRIORITY_COLOR[b.priority] || '#60a5fa' }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{b.title}</p>
                  {b.client_name && (
                    <p className="text-[11px]" style={{ color: 'rgba(100,116,139,0.5)' }}>{b.client_name}</p>
                  )}
                </div>
                <p className="text-xs flex-shrink-0" style={{ color: 'rgba(100,116,139,0.6)' }}>{b.assigned_name}</p>
                <span className="text-[10px] px-2 py-0.5 rounded-full flex-shrink-0"
                  style={{ background: 'rgba(248,113,113,0.1)', color: '#f87171' }}>
                  {b.days_overdue}d atraso
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
