import { useEffect, useState } from 'react';
import { agencyClientsApi, tasksApi } from '../../api/client';
import { FileImage, CheckCircle2, Clock, AlertTriangle, Timer, TrendingUp } from 'lucide-react';

interface ClientProduction {
  id: number; name: string; logo: string | null; segment: string;
  em_criacao: number; em_revisao: number; aguardando_aprovacao: number;
  ajuste_solicitado: number; aprovado: number; agendado: number;
  publicado_mes: number; tarefas_abertas: number; tarefas_atrasadas: number;
}
interface ClientHours { client_id: number; client_name: string; minutes_week: number; }

function minutesToHours(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h${m > 0 ? ` ${m}m` : ''}` : `${m}m`;
}

export default function AgencyPerformance() {
  const [clients, setClients] = useState<ClientProduction[]>([]);
  const [clientHours, setClientHours] = useState<ClientHours[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      agencyClientsApi.production(),
      tasksApi.teamOverview(),
    ]).then(([prod, team]) => {
      setClients(prod.data);
      setClientHours(team.data.clientHours || []);
      setLoading(false);
    });
  }, []);

  const totals = clients.reduce(
    (acc, c) => ({
      published: acc.published + c.publicado_mes,
      scheduled: acc.scheduled + c.agendado,
      approved: acc.approved + c.aprovado,
      pending: acc.pending + c.aguardando_aprovacao,
      adjustments: acc.adjustments + c.ajuste_solicitado,
      in_progress: acc.in_progress + c.em_criacao + c.em_revisao,
      overdue_tasks: acc.overdue_tasks + c.tarefas_atrasadas,
    }),
    { published: 0, scheduled: 0, approved: 0, pending: 0, adjustments: 0, in_progress: 0, overdue_tasks: 0 }
  );

  const maxPublished = Math.max(...clients.map(c => c.publicado_mes), 1);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
        style={{ borderColor: 'rgba(59,130,246,0.3)', borderTopColor: '#3b82f6' }} />
    </div>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">Performance Consolidada</h1>
        <p className="text-sm" style={{ color: 'rgba(100,116,139,0.7)' }}>Métricas somadas de todos os clientes este mês</p>
      </div>

      {/* Global metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {[
          { label: 'Publicados', value: totals.published, icon: CheckCircle2, color: '#34d399', sub: 'este mês' },
          { label: 'Agendados', value: totals.scheduled, icon: Clock, color: '#818cf8', sub: 'prontos' },
          { label: 'Em produção', value: totals.in_progress, icon: FileImage, color: '#60a5fa', sub: 'criação + revisão' },
          { label: 'Aguardando cliente', value: totals.pending, icon: Clock, color: '#f59e0b', sub: 'aprovação' },
        ].map(({ label, value, icon: Icon, color, sub }) => (
          <div key={label} className="rounded-2xl p-5"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2 mb-3">
              <Icon size={14} style={{ color }} />
              <span className="text-xs" style={{ color: 'rgba(100,116,139,0.7)' }}>{label}</span>
            </div>
            <p className="text-3xl font-bold text-white mb-1">{value}</p>
            <p className="text-[11px]" style={{ color: 'rgba(100,116,139,0.5)' }}>{sub}</p>
          </div>
        ))}
      </div>

      {/* Alerts row */}
      {(totals.adjustments > 0 || totals.overdue_tasks > 0) && (
        <div className="flex flex-wrap gap-3 mb-8">
          {totals.adjustments > 0 && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl"
              style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}>
              <AlertTriangle size={13} style={{ color: '#f87171' }} />
              <span className="text-sm" style={{ color: '#f87171' }}>
                <strong>{totals.adjustments}</strong> pedido{totals.adjustments !== 1 ? 's' : ''} de ajuste pendente{totals.adjustments !== 1 ? 's' : ''}
              </span>
            </div>
          )}
          {totals.overdue_tasks > 0 && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl"
              style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
              <AlertTriangle size={13} style={{ color: '#f59e0b' }} />
              <span className="text-sm" style={{ color: '#f59e0b' }}>
                <strong>{totals.overdue_tasks}</strong> tarefa{totals.overdue_tasks !== 1 ? 's' : ''} atrasada{totals.overdue_tasks !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Per-client breakdown */}
        <div>
          <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp size={15} style={{ color: '#60a5fa' }} />
            Posts publicados por cliente
          </h2>
          <div className="rounded-2xl overflow-hidden"
            style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
            {clients.length === 0 ? (
              <p className="px-5 py-8 text-sm text-center" style={{ color: 'rgba(100,116,139,0.5)' }}>
                Nenhum cliente cadastrado
              </p>
            ) : clients.sort((a, b) => b.publicado_mes - a.publicado_mes).map((c, i) => (
              <div key={c.id} className="px-5 py-3.5"
                style={{ background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent', borderBottom: i < clients.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    {c.logo ? (
                      <img src={c.logo} alt={c.name} className="w-6 h-6 rounded-full object-cover" />
                    ) : (
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                        style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                        {c.name.charAt(0)}
                      </div>
                    )}
                    <span className="text-sm text-white">{c.name}</span>
                  </div>
                  <span className="text-sm font-semibold text-white">{c.publicado_mes}</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${(c.publicado_mes / maxPublished) * 100}%`, background: 'linear-gradient(90deg,#3b82f6,#6366f1)' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Hours by client */}
        <div>
          <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <Timer size={15} style={{ color: '#a78bfa' }} />
            Horas registradas esta semana
          </h2>
          <div className="rounded-2xl overflow-hidden"
            style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
            {clientHours.length === 0 ? (
              <p className="px-5 py-8 text-sm text-center" style={{ color: 'rgba(100,116,139,0.5)' }}>
                Nenhuma hora registrada esta semana
              </p>
            ) : clientHours.map((ch, i) => {
              const maxMin = Math.max(...clientHours.map(x => x.minutes_week), 1);
              return (
                <div key={ch.client_id} className="px-5 py-3.5"
                  style={{ background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent', borderBottom: i < clientHours.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-white">{ch.client_name}</span>
                    <span className="text-sm font-semibold" style={{ color: '#a78bfa' }}>
                      {minutesToHours(ch.minutes_week)}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${(ch.minutes_week / maxMin) * 100}%`, background: 'linear-gradient(90deg,#8b5cf6,#a78bfa)' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
