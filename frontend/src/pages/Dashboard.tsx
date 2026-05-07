import { useEffect, useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, defs
} from 'recharts';
import {
  Users, TrendingUp, DollarSign, MessageSquare,
  Instagram, UserPlus, Inbox, ArrowUpRight, Activity
} from 'lucide-react';
import { dashboardApi } from '../api/client';
import { DashboardData, Activity as ActivityType } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const STAGE_LABELS: Record<string, string> = {
  prospecting: 'Prospecção', proposal: 'Proposta',
  negotiation: 'Negociação', closing: 'Fechamento',
};

const SOURCE_COLORS: Record<string, string> = {
  whatsapp: '#25d366', instagram: '#ec4899', ads: '#8b5cf6', manual: '#475569',
};
const SOURCE_LABELS: Record<string, string> = {
  whatsapp: 'WhatsApp', instagram: 'Instagram', ads: 'Anúncios', manual: 'Manual',
};
const ACT_ICONS: Record<string, string> = {
  whatsapp: '💬', instagram: '📸', note: '📝', meeting: '📅', stage_change: '⚡', call: '📞',
};

function fmt(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);
}

const TREND_DATA = [
  { w: 'S1', v: 14000 }, { w: 'S2', v: 21000 }, { w: 'S3', v: 18500 },
  { w: 'S4', v: 27000 }, { w: 'S5', v: 30000 }, { w: 'S6', v: 36500 },
];

const CustomAreaTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="modal-card px-4 py-3 text-sm">
      <p className="text-white font-semibold">{fmt(payload[0].value)}</p>
    </div>
  );
};

const CustomBarTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="modal-card px-4 py-3 text-sm">
      <p style={{ color: 'rgba(148,163,184,0.7)' }} className="text-xs mb-1">{STAGE_LABELS[label] || label}</p>
      <p className="text-white font-semibold">{fmt(payload[0].value)}</p>
      <p className="text-xs mt-0.5" style={{ color: 'rgba(96,165,250,0.7)' }}>{payload[0].payload.count} deal(s)</p>
    </div>
  );
};

function StatCard({
  icon: Icon, iconClass, label, value, sub, delay = 0,
}: {
  icon: any; iconClass: string; label: string; value: string | number; sub?: string; delay?: number;
}) {
  return (
    <div className="card p-5 animate-fade-up" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <Icon size={17} className={iconClass} />
        </div>
        {sub && (
          <span className="badge badge-blue text-[10px]">{sub}</span>
        )}
      </div>
      <p className="metric mb-1">{value}</p>
      <p className="text-sm" style={{ color: 'rgba(148,163,184,0.65)' }}>{label}</p>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi.get().then(r => { setData(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div
        className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
        style={{ borderColor: 'rgba(59,130,246,0.3)', borderTopColor: '#3b82f6' }}
      />
    </div>
  );
  if (!data) return null;

  const { stats, dealsByStage, leadSources, recentActivities } = data;
  const barData = dealsByStage.map(d => ({ stage: d.stage, value: d.value, count: d.count }));
  const pieData = leadSources.map(s => ({
    name: SOURCE_LABELS[s.source] || s.source, value: s.count, fill: SOURCE_COLORS[s.source] || '#475569',
  }));

  return (
    <div className="p-8" style={{ minHeight: '100vh' }}>
      {/* Header */}
      <div className="mb-8 animate-fade-up">
        <p className="section-label mb-1">Visão Geral</p>
        <h1
          className="text-3xl font-extralight text-white tracking-tight"
          style={{ textShadow: '0 0 30px rgba(59,130,246,0.25)' }}
        >
          Dashboard
        </h1>
      </div>

      {/* Row 1 — Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Users}        iconClass="icon-blue"   label="Total de Contatos"  value={stats.totalContacts}         sub={`+${stats.newLeadsThisWeek} esta semana`} delay={0} />
        <StatCard icon={TrendingUp}   iconClass="icon-purple" label="Deals Ativos"        value={stats.activeDeals}                                                              delay={60} />
        <StatCard icon={DollarSign}   iconClass="icon-green"  label="Pipeline Total"      value={fmt(stats.pipelineValue)}    sub={`${fmt(stats.closingValue)} fechando`}    delay={120} />
        <StatCard icon={MessageSquare} iconClass="icon-cyan"  label="Conversas"           value={stats.totalConversations}    sub={stats.unreadMessages > 0 ? `${stats.unreadMessages} não lidas` : undefined} delay={180} />
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard icon={UserPlus}    iconClass="icon-amber"  label="Leads esta Semana"     value={stats.newLeadsThisWeek}                                                       delay={60} />
        <StatCard icon={Instagram}   iconClass="icon-pink"   label="Leads Instagram"        value={stats.instagramLeads}       sub={stats.unconvertedLeads > 0 ? `${stats.unconvertedLeads} pendentes` : undefined} delay={120} />
        <StatCard icon={Inbox}       iconClass="icon-red"    label="Não Lidas"              value={stats.unreadMessages}                                                         delay={180} />
        <StatCard icon={DollarSign}  iconClass="icon-green"  label="Em Fechamento"          value={fmt(stats.closingValue)}                                                      delay={240} />
      </div>

      {/* Row 2 — Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
        {/* Area Chart */}
        <div className="card xl:col-span-2 p-6 animate-fade-up" style={{ animationDelay: '200ms' }}>
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="section-label mb-1">Pipeline</p>
              <p className="text-lg font-light text-white">Evolução Semanal</p>
            </div>
            <span className="badge badge-green flex items-center gap-1">
              <ArrowUpRight size={10} /> +35%
            </span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={TREND_DATA} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#3b82f6" stopOpacity={0.25} />
                  <stop offset="75%"  stopColor="#3b82f6" stopOpacity={0.04} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(59,130,246,0.05)" vertical={false} />
              <XAxis
                dataKey="w"
                tick={{ fill: 'rgba(100,116,139,0.6)', fontSize: 11 }}
                axisLine={false} tickLine={false}
              />
              <YAxis
                tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`}
                tick={{ fill: 'rgba(100,116,139,0.6)', fontSize: 11 }}
                axisLine={false} tickLine={false}
              />
              <Tooltip content={<CustomAreaTooltip />} cursor={{ stroke: 'rgba(59,130,246,0.25)', strokeWidth: 1, strokeDasharray: '4 4' }} />
              <Area
                type="monotone"
                dataKey="v"
                stroke="#3b82f6"
                strokeWidth={2.5}
                fill="url(#areaGrad)"
                dot={false}
                activeDot={{ r: 4, fill: '#3b82f6', stroke: 'rgba(59,130,246,0.4)', strokeWidth: 4 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart */}
        <div className="card p-6 animate-fade-up" style={{ animationDelay: '260ms' }}>
          <div className="mb-4">
            <p className="section-label mb-1">Fontes</p>
            <p className="text-lg font-light text-white">Origem dos Leads</p>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={48} outerRadius={72} paddingAngle={3} dataKey="value">
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} opacity={0.85} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: '#0b0b2a', border: '1px solid rgba(59,130,246,0.2)',
                  borderRadius: 12, fontSize: 12, color: '#e2e8f0',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {pieData.map((d, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: d.fill, boxShadow: `0 0 6px ${d.fill}` }} />
                  <span style={{ color: 'rgba(148,163,184,0.75)' }}>{d.name}</span>
                </div>
                <span className="text-white font-medium">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 3 — Bar chart + Activities */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Bar chart */}
        <div className="card xl:col-span-2 p-6 animate-fade-up" style={{ animationDelay: '300ms' }}>
          <div className="mb-6">
            <p className="section-label mb-1">Funil</p>
            <p className="text-lg font-light text-white">Pipeline por Estágio</p>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={barData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="barGrad0" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0.4} />
                </linearGradient>
                <linearGradient id="barGrad1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.4} />
                </linearGradient>
                <linearGradient id="barGrad2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f97316" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#f97316" stopOpacity={0.4} />
                </linearGradient>
                <linearGradient id="barGrad3" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0.4} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(59,130,246,0.05)" vertical={false} />
              <XAxis
                dataKey="stage"
                tickFormatter={s => STAGE_LABELS[s] || s}
                tick={{ fill: 'rgba(100,116,139,0.6)', fontSize: 11 }}
                axisLine={false} tickLine={false}
              />
              <YAxis
                tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`}
                tick={{ fill: 'rgba(100,116,139,0.6)', fontSize: 11 }}
                axisLine={false} tickLine={false}
              />
              <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'rgba(59,130,246,0.05)' }} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {barData.map((_, i) => (
                  <Cell key={i} fill={`url(#barGrad${i})`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Activities */}
        <div className="card p-6 animate-fade-up" style={{ animationDelay: '360ms' }}>
          <div className="flex items-center gap-2 mb-5">
            <Activity size={14} className="icon-blue" />
            <p className="section-label">Atividade Recente</p>
          </div>
          {recentActivities.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: 'rgba(100,116,139,0.5)' }}>
              Nenhuma atividade
            </p>
          ) : (
            <div className="space-y-4">
              {recentActivities.map((act: ActivityType, i) => (
                <div key={act.id} className="flex items-start gap-3 animate-fade-up" style={{ animationDelay: `${360 + i * 40}ms` }}>
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                    style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.1)' }}
                  >
                    {ACT_ICONS[act.type] || '📌'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-300 leading-relaxed line-clamp-2">{act.description}</p>
                    {act.contact_name && (
                      <p className="text-[10px] mt-0.5" style={{ color: 'rgba(59,130,246,0.5)' }}>{act.contact_name}</p>
                    )}
                  </div>
                  <span className="text-[10px] whitespace-nowrap" style={{ color: 'rgba(100,116,139,0.5)' }}>
                    {formatDistanceToNow(new Date(act.created_at), { locale: ptBR, addSuffix: false })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
