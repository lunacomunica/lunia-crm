import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { agencyClientsApi } from '../../api/client';
import { AlertTriangle, Clock, CheckCircle2, Users, ExternalLink } from 'lucide-react';

interface ClientProduction {
  id: number; name: string; segment: string; logo: string | null;
  em_criacao: number; em_revisao: number; aguardando_aprovacao: number;
  ajuste_solicitado: number; aprovado: number; agendado: number;
  publicado_mes: number; tarefas_abertas: number; tarefas_atrasadas: number;
  ultima_atualizacao: string | null;
}

function health(c: ClientProduction): 'critico' | 'atencao' | 'ok' {
  if (c.ajuste_solicitado > 0 || c.tarefas_atrasadas > 0) return 'critico';
  if (c.aguardando_aprovacao > 0 || c.em_revisao > 0) return 'atencao';
  return 'ok';
}

const HEALTH = {
  critico: { label: 'Crítico',  color: '#f87171', dot: '#ef4444', bg: 'rgba(248,113,113,0.08)' },
  atencao: { label: 'Atenção',  color: '#f59e0b', dot: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
  ok:      { label: 'Em dia',   color: '#34d399', dot: '#34d399', bg: 'rgba(52,211,153,0.08)'  },
};

const STATUS_LABELS: Record<string, string> = {
  em_criacao: 'Em criação', em_revisao: 'Em revisão',
  aguardando_aprovacao: 'Aguardando aprovação', ajuste_solicitado: 'Ajuste solicitado',
  aprovado: 'Aprovado', agendado: 'Agendado', publicado_mes: 'Publicado (mês)',
};
const STATUS_COLORS: Record<string, string> = {
  em_criacao: '#60a5fa', em_revisao: '#a78bfa',
  aguardando_aprovacao: '#f59e0b', ajuste_solicitado: '#f87171',
  aprovado: '#34d399', agendado: '#818cf8', publicado_mes: '#10b981',
};

export default function AgencyOverview() {
  const [clients, setClients] = useState<ClientProduction[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    agencyClientsApi.production().then(r => { setClients(r.data); setLoading(false); });
  }, []);

  const totals = clients.reduce(
    (acc, c) => ({
      clients: acc.clients + 1,
      pending: acc.pending + c.aguardando_aprovacao,
      adjustments: acc.adjustments + c.ajuste_solicitado,
      overdue: acc.overdue + c.tarefas_atrasadas,
      published: acc.published + c.publicado_mes,
    }),
    { clients: 0, pending: 0, adjustments: 0, overdue: 0, published: 0 }
  );

  const critical = clients.filter(c => health(c) === 'critico');
  const attention = clients.filter(c => health(c) === 'atencao');
  const ok = clients.filter(c => health(c) === 'ok');

  const sorted = [...critical, ...attention, ...ok];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">Visão Geral da Agência</h1>
        <p className="text-sm" style={{ color: 'rgba(100,116,139,0.7)' }}>Saúde consolidada de todos os clientes</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {[
          { label: 'Clientes ativos', value: totals.clients, icon: Users, color: '#60a5fa' },
          { label: 'Publicados (mês)', value: totals.published, icon: CheckCircle2, color: '#34d399' },
          { label: 'Aguardando aprovação', value: totals.pending, icon: Clock, color: '#f59e0b' },
          { label: 'Pedidos de ajuste', value: totals.adjustments, icon: AlertTriangle, color: '#f87171' },
          { label: 'Tarefas atrasadas', value: totals.overdue, icon: AlertTriangle, color: '#f87171' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-2xl p-4"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2 mb-2">
              <Icon size={14} style={{ color }} />
              <span className="text-[11px]" style={{ color: 'rgba(100,116,139,0.7)' }}>{label}</span>
            </div>
            <p className="text-2xl font-bold text-white">{value}</p>
          </div>
        ))}
      </div>

      {/* Status legend */}
      <div className="flex items-center gap-4 mb-6">
        {Object.entries(HEALTH).map(([key, h]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ background: h.dot }} />
            <span className="text-xs" style={{ color: 'rgba(100,116,139,0.7)' }}>
              {h.label} ({key === 'critico' ? critical.length : key === 'atencao' ? attention.length : ok.length})
            </span>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: 'rgba(59,130,246,0.3)', borderTopColor: '#3b82f6' }} />
        </div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-20" style={{ color: 'rgba(100,116,139,0.5)' }}>
          Nenhum cliente cadastrado ainda
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sorted.map(c => {
            const h = HEALTH[health(c)];
            return (
              <div key={c.id} className="rounded-2xl p-5 flex flex-col gap-4"
                style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${h.dot}22` }}>
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {c.logo ? (
                      <img src={c.logo} alt={c.name} className="w-9 h-9 rounded-full object-cover"
                        style={{ border: '1px solid rgba(255,255,255,0.08)' }} />
                    ) : (
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white"
                        style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                        {c.name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-semibold text-white">{c.name}</p>
                      {c.segment && <p className="text-[11px]" style={{ color: 'rgba(100,116,139,0.6)' }}>{c.segment}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-medium px-2 py-1 rounded-full"
                      style={{ color: h.color, background: h.bg }}>{h.label}</span>
                    <button onClick={() => navigate(`/marketing/clients/${c.id}`)}
                      className="p-1.5 rounded-lg transition-colors"
                      style={{ color: 'rgba(100,116,139,0.4)' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#e2e8f0')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'rgba(100,116,139,0.4)')}>
                      <ExternalLink size={13} />
                    </button>
                  </div>
                </div>

                {/* Content status pills */}
                <div className="flex flex-wrap gap-1.5">
                  {(['ajuste_solicitado','aguardando_aprovacao','em_revisao','em_criacao','aprovado','agendado','publicado_mes'] as const).map(key => {
                    const val = c[key as keyof ClientProduction] as number;
                    if (!val) return null;
                    return (
                      <span key={key} className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                        style={{ background: `${STATUS_COLORS[key]}18`, color: STATUS_COLORS[key], border: `1px solid ${STATUS_COLORS[key]}30` }}>
                        {val} {STATUS_LABELS[key]}
                      </span>
                    );
                  })}
                </div>

                {/* Task bar */}
                <div className="flex items-center justify-between text-[11px]"
                  style={{ color: 'rgba(100,116,139,0.6)', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '12px' }}>
                  <span>{c.tarefas_abertas} tarefa{c.tarefas_abertas !== 1 ? 's' : ''} em aberto</span>
                  {c.tarefas_atrasadas > 0 && (
                    <span className="font-medium" style={{ color: '#f87171' }}>
                      {c.tarefas_atrasadas} atrasada{c.tarefas_atrasadas !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
