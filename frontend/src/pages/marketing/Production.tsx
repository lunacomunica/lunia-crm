import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { agencyClientsApi } from '../../api/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlertTriangle, Clock, CheckCircle2, ExternalLink, Layers } from 'lucide-react';

interface ClientProduction {
  id: number;
  name: string;
  segment: string;
  instagram_handle: string;
  logo: string | null;
  em_criacao: number;
  em_revisao: number;
  aguardando_aprovacao: number;
  ajuste_solicitado: number;
  aprovado: number;
  agendado: number;
  publicado_mes: number;
  tarefas_abertas: number;
  tarefas_atrasadas: number;
  ultima_atualizacao: string | null;
}

function healthScore(c: ClientProduction): 'critico' | 'atencao' | 'ok' {
  if (c.ajuste_solicitado > 0 || c.tarefas_atrasadas > 0) return 'critico';
  if (c.aguardando_aprovacao > 0 || c.em_revisao > 0) return 'atencao';
  return 'ok';
}

const HEALTH = {
  critico: { label: 'Crítico',  color: '#f87171', bg: 'rgba(248,113,113,0.1)',  dot: '#ef4444' },
  atencao: { label: 'Atenção',  color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',   dot: '#f59e0b' },
  ok:      { label: 'Em dia',   color: '#34d399', bg: 'rgba(52,211,153,0.1)',    dot: '#34d399' },
};

export default function Production() {
  const [clients, setClients] = useState<ClientProduction[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    agencyClientsApi.production().then(r => { setClients(r.data); setLoading(false); });
  }, []);

  const total       = clients.length;
  const totalAjuste = clients.reduce((s, c) => s + c.ajuste_solicitado, 0);
  const totalPendente = clients.reduce((s, c) => s + c.aguardando_aprovacao, 0);
  const totalAtrasado = clients.reduce((s, c) => s + c.tarefas_atrasadas, 0);
  const criticos    = clients.filter(c => healthScore(c) === 'critico').length;

  return (
    <div className="p-4 md:p-8 animate-fade-up">
      {/* Header */}
      <div className="mb-6">
        <p className="section-label mb-1">Marketing</p>
        <h1 className="text-2xl md:text-3xl font-extralight text-white tracking-tight"
          style={{ textShadow: '0 0 30px rgba(59,130,246,0.2)' }}>
          Painel de Produção
        </h1>
        <p className="text-sm mt-1" style={{ color: 'rgba(100,116,139,0.7)' }}>
          Visão geral de todos os clientes
        </p>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {[
          { icon: Layers,        label: 'Clientes ativos',      value: total,         color: '#60a5fa' },
          { icon: AlertTriangle, label: 'Com ajuste solicitado', value: totalAjuste,   color: '#f87171' },
          { icon: Clock,         label: 'Ag. aprovação cliente', value: totalPendente, color: '#f59e0b' },
          { icon: CheckCircle2,  label: 'Tarefas atrasadas',     value: totalAtrasado, color: '#a78bfa' },
        ].map(s => (
          <div key={s.label} className="rounded-2xl px-4 py-4"
            style={{ background: 'linear-gradient(145deg,#0c0c28,#0e0e2e)', border: '1px solid rgba(59,130,246,0.08)' }}>
            <s.icon size={16} className="mb-2" style={{ color: s.color }} />
            <p className="text-xl font-bold text-white">{s.value}</p>
            <p className="text-[10px] mt-0.5 leading-tight" style={{ color: 'rgba(100,116,139,0.5)' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: 'rgba(59,130,246,0.3)', borderTopColor: '#3b82f6' }} />
        </div>
      ) : clients.length === 0 ? (
        <div className="text-center py-24" style={{ color: 'rgba(100,116,139,0.4)' }}>
          Nenhum cliente ativo.
        </div>
      ) : (
        <>
          {/* Critical clients first — alert banner */}
          {criticos > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl mb-4"
              style={{ background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.2)' }}>
              <AlertTriangle size={14} style={{ color: '#f87171', flexShrink: 0 }} />
              <p className="text-sm" style={{ color: '#f87171' }}>
                {criticos} cliente{criticos > 1 ? 's precisam' : ' precisa'} de atenção imediata
              </p>
            </div>
          )}

          {/* Desktop table */}
          <div className="hidden md:block rounded-2xl overflow-hidden"
            style={{ border: '1px solid rgba(59,130,246,0.08)' }}>
            {/* Header row */}
            <div className="grid grid-cols-[2fr_1fr_3fr_1fr_1fr_auto] gap-4 px-5 py-3 text-[10px] font-semibold uppercase tracking-wider"
              style={{ background: 'rgba(59,130,246,0.04)', color: 'rgba(100,116,139,0.5)', borderBottom: '1px solid rgba(59,130,246,0.08)' }}>
              <span>Cliente</span>
              <span>Saúde</span>
              <span>Produção</span>
              <span>Tarefas</span>
              <span>Publicados</span>
              <span></span>
            </div>

            {clients.map((c, i) => {
              const health = healthScore(c);
              const h = HEALTH[health];
              return (
                <div key={c.id}
                  className="grid grid-cols-[2fr_1fr_3fr_1fr_1fr_auto] gap-4 items-center px-5 py-4 cursor-pointer transition-colors"
                  style={{
                    borderBottom: i < clients.length - 1 ? '1px solid rgba(59,130,246,0.05)' : 'none',
                    background: 'transparent'
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(59,130,246,0.03)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  onClick={() => navigate(`/marketing/content?client=${c.id}`)}>

                  {/* Name */}
                  <div className="flex items-center gap-3 min-w-0">
                    {c.logo ? (
                      <img src={c.logo} alt={c.name} className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)' }}>
                        {c.name.charAt(0)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{c.name}</p>
                      {c.segment && <p className="text-[10px] truncate" style={{ color: 'rgba(100,116,139,0.5)' }}>{c.segment}</p>}
                    </div>
                  </div>

                  {/* Health */}
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: h.dot }} />
                    <span className="text-xs" style={{ color: h.color }}>{h.label}</span>
                  </div>

                  {/* Production status pills */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {c.ajuste_solicitado > 0 && <Pill label={`${c.ajuste_solicitado} ajuste`} color="#f87171" bg="rgba(248,113,113,0.1)" />}
                    {c.aguardando_aprovacao > 0 && <Pill label={`${c.aguardando_aprovacao} ag. aprovação`} color="#f59e0b" bg="rgba(245,158,11,0.1)" />}
                    {c.em_revisao > 0 && <Pill label={`${c.em_revisao} revisão`} color="#60a5fa" bg="rgba(96,165,250,0.1)" />}
                    {c.em_criacao > 0 && <Pill label={`${c.em_criacao} criação`} color="#94a3b8" bg="rgba(148,163,184,0.08)" />}
                    {c.aprovado > 0 && <Pill label={`${c.aprovado} aprovado`} color="#34d399" bg="rgba(52,211,153,0.08)" />}
                    {c.agendado > 0 && <Pill label={`${c.agendado} agendado`} color="#a78bfa" bg="rgba(167,139,250,0.08)" />}
                    {c.ajuste_solicitado === 0 && c.aguardando_aprovacao === 0 && c.em_revisao === 0 && c.em_criacao === 0 && c.aprovado === 0 && c.agendado === 0 && (
                      <span className="text-xs" style={{ color: 'rgba(100,116,139,0.3)' }}>—</span>
                    )}
                  </div>

                  {/* Tasks */}
                  <div>
                    {c.tarefas_abertas > 0 ? (
                      <span className="text-xs" style={{ color: c.tarefas_atrasadas > 0 ? '#f87171' : 'rgba(100,116,139,0.6)' }}>
                        {c.tarefas_abertas} tarefa{c.tarefas_abertas > 1 ? 's' : ''}
                        {c.tarefas_atrasadas > 0 && <span style={{ color: '#f87171' }}> ({c.tarefas_atrasadas} atrasada{c.tarefas_atrasadas > 1 ? 's' : ''})</span>}
                      </span>
                    ) : (
                      <span className="text-xs" style={{ color: 'rgba(100,116,139,0.3)' }}>—</span>
                    )}
                  </div>

                  {/* Published this month */}
                  <div>
                    <span className="text-xs" style={{ color: c.publicado_mes > 0 ? '#34d399' : 'rgba(100,116,139,0.3)' }}>
                      {c.publicado_mes > 0 ? `${c.publicado_mes} este mês` : '—'}
                    </span>
                  </div>

                  {/* Action */}
                  <ExternalLink size={13} style={{ color: 'rgba(100,116,139,0.3)', flexShrink: 0 }} />
                </div>
              );
            })}
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {clients.map(c => {
              const health = healthScore(c);
              const h = HEALTH[health];
              return (
                <div key={c.id} className="rounded-2xl p-4 cursor-pointer"
                  style={{ background: 'linear-gradient(145deg,#0c0c28,#0e0e2e)', border: '1px solid rgba(59,130,246,0.08)' }}
                  onClick={() => navigate(`/marketing/content?client=${c.id}`)}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {c.logo ? (
                        <img src={c.logo} alt={c.name} className="w-8 h-8 rounded-lg object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                          style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)' }}>
                          {c.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-white">{c.name}</p>
                        {c.segment && <p className="text-[10px]" style={{ color: 'rgba(100,116,139,0.5)' }}>{c.segment}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ background: h.dot }} />
                      <span className="text-xs" style={{ color: h.color }}>{h.label}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {c.ajuste_solicitado > 0 && <Pill label={`${c.ajuste_solicitado} ajuste`} color="#f87171" bg="rgba(248,113,113,0.1)" />}
                    {c.aguardando_aprovacao > 0 && <Pill label={`${c.aguardando_aprovacao} ag. aprovação`} color="#f59e0b" bg="rgba(245,158,11,0.1)" />}
                    {c.em_revisao > 0 && <Pill label={`${c.em_revisao} revisão`} color="#60a5fa" bg="rgba(96,165,250,0.1)" />}
                    {c.em_criacao > 0 && <Pill label={`${c.em_criacao} criação`} color="#94a3b8" bg="rgba(148,163,184,0.08)" />}
                    {c.aprovado > 0 && <Pill label={`${c.aprovado} aprovado`} color="#34d399" bg="rgba(52,211,153,0.08)" />}
                  </div>
                  {c.ultima_atualizacao && (
                    <p className="text-[10px] mt-2" style={{ color: 'rgba(100,116,139,0.35)' }}>
                      Atualizado {format(new Date(c.ultima_atualizacao), "d MMM HH:mm", { locale: ptBR })}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function Pill({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span className="text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{ background: bg, color }}>
      {label}
    </span>
  );
}
