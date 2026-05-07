import { useEffect, useState } from 'react';
import { Instagram, RefreshCw, UserPlus, MessageSquare, CheckCircle2, Trash2 } from 'lucide-react';
import { metaApi, conversationsApi } from '../api/client';
import { InstagramLead, Conversation } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const AVATAR_COLORS = [
  'linear-gradient(135deg,#ec4899,#8b5cf6)',
  'linear-gradient(135deg,#8b5cf6,#3b82f6)',
  'linear-gradient(135deg,#f59e0b,#ec4899)',
  'linear-gradient(135deg,#10b981,#3b82f6)',
];

function Avatar({ name }: { name: string }) {
  const initials = (name || '?').split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
  return (
    <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
      style={{ background: AVATAR_COLORS[(name || '?').charCodeAt(0) % AVATAR_COLORS.length], boxShadow: '0 0 10px rgba(236,72,153,0.2)' }}>
      {initials}
    </div>
  );
}

export default function InstagramPage() {
  const [tab, setTab] = useState<'leads' | 'dms'>('leads');
  const [leads, setLeads] = useState<InstagramLead[]>([]);
  const [dms, setDms] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    const [lr, dr] = await Promise.all([metaApi.getInstagramLeads(), conversationsApi.list({ platform: 'instagram' })]);
    setLeads(lr.data); setDms(dr.data); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const handleConvert = async (id: number) => {
    setConverting(id); await metaApi.convertLead(id); await load(); setConverting(null);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Apagar este lead?')) return;
    await metaApi.deleteLead(id); await load();
  };

  const converted = leads.filter(l => l.contact_id !== null).length;
  const pending   = leads.filter(l => l.contact_id === null).length;

  return (
    <div className="p-8 animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="section-label mb-1">Integração</p>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#ec4899,#f97316)', boxShadow: '0 0 18px rgba(236,72,153,0.4)' }}>
              <Instagram size={16} className="text-white" />
            </div>
            <h1 className="text-3xl font-extralight text-white tracking-tight"
              style={{ textShadow: '0 0 25px rgba(236,72,153,0.2)' }}>Instagram</h1>
          </div>
          <p className="text-sm" style={{ color: 'rgba(100,116,139,0.65)' }}>Leads de anúncios e DMs diretos</p>
        </div>
        <button onClick={load} className="btn-ghost">
          <RefreshCw size={14} /> Sincronizar
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total de Leads', value: leads.length, cls: 'icon-pink' },
          { label: 'Convertidos', value: converted, cls: 'icon-green' },
          { label: 'Pendentes', value: pending, cls: 'icon-amber' },
        ].map((s, i) => (
          <div key={i} className="card p-5 animate-fade-up" style={{ animationDelay: `${i * 60}ms` }}>
            <p className="metric-md">{s.value}</p>
            <p className="text-sm mt-1" style={{ color: 'rgba(100,116,139,0.65)' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 w-fit rounded-xl p-1"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
        {[
          { id: 'leads', label: 'Leads de Anúncios' },
          { id: 'dms', label: 'DMs', badge: dms.reduce((a, d) => a + d.unread_count, 0) },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all"
            style={tab === t.id
              ? { background: 'rgba(59,130,246,0.12)', color: '#93c5fd', border: '1px solid rgba(59,130,246,0.2)' }
              : { color: 'rgba(100,116,139,0.7)', border: '1px solid transparent' }}>
            {t.id === 'dms' && <MessageSquare size={13} />}
            {t.label}
            {t.badge ? (
              <span className="w-4 h-4 rounded-full text-[10px] text-white flex items-center justify-center font-bold"
                style={{ background: '#ec4899', boxShadow: '0 0 6px rgba(236,72,153,0.6)' }}>{t.badge}</span>
            ) : null}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: 'rgba(59,130,246,0.3)', borderTopColor: '#3b82f6' }} />
        </div>
      ) : tab === 'leads' ? (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr>
                <th className="th">Lead</th>
                <th className="th hidden md:table-cell">Campanha</th>
                <th className="th hidden md:table-cell">Formulário</th>
                <th className="th hidden lg:table-cell">Data</th>
                <th className="th">Status</th>
                <th className="th w-40" />
              </tr>
            </thead>
            <tbody>
              {leads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3"
                      style={{ background: 'rgba(236,72,153,0.08)', border: '1px solid rgba(236,72,153,0.15)' }}>
                      <Instagram size={18} className="icon-pink" />
                    </div>
                    <p className="text-sm" style={{ color: 'rgba(100,116,139,0.5)' }}>
                      Nenhum lead ainda. Configure a API da Meta para receber leads automaticamente.
                    </p>
                  </td>
                </tr>
              ) : leads.map(lead => (
                <tr key={lead.id} className="tr group">
                  <td className="td">
                    <div className="flex items-center gap-3">
                      <Avatar name={lead.data?.name || lead.lead_id} />
                      <div>
                        <p className="text-sm font-medium text-white">{lead.data?.name || `Lead ${lead.lead_id.slice(-6)}`}</p>
                        {lead.data?.email && <p className="text-xs" style={{ color: 'rgba(100,116,139,0.6)' }}>{lead.data.email}</p>}
                        {lead.data?.phone && <p className="text-xs" style={{ color: 'rgba(100,116,139,0.6)' }}>{lead.data.phone}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="td hidden md:table-cell text-sm" style={{ color: 'rgba(148,163,184,0.7)' }}>
                    {lead.campaign_name || '—'}
                  </td>
                  <td className="td hidden md:table-cell text-xs" style={{ color: 'rgba(100,116,139,0.6)' }}>
                    {lead.form_name || '—'}
                  </td>
                  <td className="td hidden lg:table-cell text-xs" style={{ color: 'rgba(100,116,139,0.5)' }}>
                    {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true, locale: ptBR })}
                  </td>
                  <td className="td">
                    {lead.contact_id
                      ? <span className="badge badge-green flex items-center gap-1"><CheckCircle2 size={10} /> Convertido</span>
                      : <span className="badge badge-amber">Pendente</span>}
                  </td>
                  <td className="td text-right">
                    <div className="flex items-center justify-end gap-2">
                      {!lead.contact_id && (
                        <button onClick={() => handleConvert(lead.id)} disabled={converting === lead.id}
                          className="btn-ghost text-xs px-3 py-1.5"
                          style={{ color: '#93c5fd', borderColor: 'rgba(59,130,246,0.2)' }}>
                          <UserPlus size={12} />
                          {converting === lead.id ? 'Criando…' : 'Criar Contato'}
                        </button>
                      )}
                      <button onClick={() => handleDelete(lead.id)}
                        className="btn-ghost text-xs px-2 py-1.5"
                        style={{ color: 'rgba(239,68,68,0.6)', borderColor: 'rgba(239,68,68,0.15)' }}
                        onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'rgba(239,68,68,0.6)')}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="space-y-3">
          {dms.length === 0 ? (
            <div className="card p-16 text-center">
              <MessageSquare size={32} className="icon-blue mx-auto mb-3" />
              <p className="text-sm" style={{ color: 'rgba(100,116,139,0.5)' }}>Nenhum DM do Instagram ainda.</p>
            </div>
          ) : dms.map(dm => (
            <div key={dm.id} className="card p-4 flex items-center gap-4 cursor-default">
              <Avatar name={dm.contact_name || '?'} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-sm font-medium text-white">{dm.contact_name}</p>
                  {dm.unread_count > 0 && (
                    <span className="w-5 h-5 rounded-full text-[10px] text-white flex items-center justify-center font-bold"
                      style={{ background: '#ec4899', boxShadow: '0 0 6px rgba(236,72,153,0.6)' }}>
                      {dm.unread_count}
                    </span>
                  )}
                </div>
                <p className="text-xs truncate" style={{ color: 'rgba(100,116,139,0.6)' }}>{dm.last_message || 'Sem mensagens'}</p>
              </div>
              <p className="text-xs whitespace-nowrap" style={{ color: 'rgba(100,116,139,0.5)' }}>
                {dm.last_message_time ? formatDistanceToNow(new Date(dm.last_message_time), { addSuffix: true, locale: ptBR }) : ''}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
