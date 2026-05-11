import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { agencyClientsApi, contentApi } from '../../api/client';
import { AlertTriangle, Clock, CheckCircle2, Users, ExternalLink, Trash2, X, FileImage } from 'lucide-react';

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

interface PiecesModal { clientId: number; clientName: string; status: string; statusLabel: string; }

export default function AgencyOverview() {
  const [clients, setClients] = useState<ClientProduction[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Pieces modal
  const [modal, setModal] = useState<PiecesModal | null>(null);
  const [pieces, setPieces] = useState<any[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [piecesLoading, setPiecesLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = () => agencyClientsApi.production().then(r => { setClients(r.data); setLoading(false); });
  useEffect(() => { load(); }, []);

  const openModal = async (clientId: number, clientName: string, status: string, statusLabel: string) => {
    setModal({ clientId, clientName, status, statusLabel });
    setSelected(new Set());
    setPiecesLoading(true);
    const r = await contentApi.list({ client_id: String(clientId), status });
    setPieces(r.data);
    setPiecesLoading(false);
  };

  const toggleAll = () => {
    if (selected.size === pieces.length) setSelected(new Set());
    else setSelected(new Set(pieces.map((p: any) => p.id)));
  };

  const deleteSelected = async () => {
    if (!modal || selected.size === 0) return;
    if (!confirm(`Excluir ${selected.size} peça(s) selecionada(s)?`)) return;
    setDeleting(true);
    await Promise.all([...selected].map(id => contentApi.delete(id)));
    setPieces(prev => prev.filter(p => !selected.has(p.id)));
    setSelected(new Set());
    setDeleting(false);
    load();
  };

  const deleteSingle = async (id: number) => {
    setDeleting(true);
    await contentApi.delete(id);
    setPieces(prev => prev.filter(p => p.id !== id));
    setSelected(prev => { const s = new Set(prev); s.delete(id); return s; });
    setDeleting(false);
    load();
  };

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
                      <button key={key}
                        onClick={() => openModal(c.id, c.name, key === 'publicado_mes' ? 'publicado' : key, STATUS_LABELS[key])}
                        className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium cursor-pointer transition-opacity hover:opacity-80"
                        style={{ background: `${STATUS_COLORS[key]}18`, color: STATUS_COLORS[key], border: `1px solid ${STATUS_COLORS[key]}30` }}>
                        {val} {STATUS_LABELS[key]}
                      </button>
                    );
                  })}
                </div>

                {/* Task bar */}
                <div className="flex items-center justify-between text-[11px]"
                  style={{ color: 'rgba(100,116,139,0.6)', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '12px' }}>
                  <button onClick={() => navigate(`/gerot?client_id=${c.id}`)}
                    className="hover:text-white transition-colors">
                    {c.tarefas_abertas} tarefa{c.tarefas_abertas !== 1 ? 's' : ''} em aberto
                  </button>
                  {c.tarefas_atrasadas > 0 && (
                    <button onClick={() => navigate(`/gerot?client_id=${c.id}`)}
                      className="font-medium hover:opacity-80 transition-opacity" style={{ color: '#f87171' }}>
                      {c.tarefas_atrasadas} atrasada{c.tarefas_atrasadas !== 1 ? 's' : ''}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pieces modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="w-full max-w-2xl rounded-2xl flex flex-col" style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.08)', maxHeight: '80vh' }}>
            {/* Header */}
            <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div>
                <p className="text-xs font-medium mb-0.5" style={{ color: STATUS_COLORS[modal.status] || '#60a5fa' }}>{modal.statusLabel}</p>
                <h3 className="text-base font-semibold text-white">{modal.clientName}</h3>
              </div>
              <div className="flex items-center gap-3">
                {selected.size > 0 && (
                  <button onClick={deleteSelected} disabled={deleting}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-opacity hover:opacity-80"
                    style={{ background: 'rgba(248,113,113,0.15)', color: '#f87171', border: '1px solid rgba(248,113,113,0.2)' }}>
                    <Trash2 size={12} />
                    Excluir {selected.size} selecionada{selected.size !== 1 ? 's' : ''}
                  </button>
                )}
                <button onClick={() => setModal(null)} className="p-1.5 rounded-lg transition-colors hover:bg-white/5" style={{ color: 'rgba(100,116,139,0.6)' }}>
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Select all bar */}
            {!piecesLoading && pieces.length > 0 && (
              <div className="flex items-center gap-3 px-5 py-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: 'rgba(255,255,255,0.02)' }}>
                <input type="checkbox" checked={selected.size === pieces.length} onChange={toggleAll}
                  className="rounded" style={{ accentColor: '#3b82f6' }} />
                <span className="text-xs" style={{ color: 'rgba(100,116,139,0.7)' }}>
                  {selected.size === 0 ? `${pieces.length} peças` : `${selected.size} de ${pieces.length} selecionadas`}
                </span>
              </div>
            )}

            {/* List */}
            <div className="overflow-y-auto flex-1">
              {piecesLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'rgba(59,130,246,0.3)', borderTopColor: '#3b82f6' }} />
                </div>
              ) : pieces.length === 0 ? (
                <div className="py-16 text-center text-sm" style={{ color: 'rgba(100,116,139,0.5)' }}>Nenhuma peça encontrada</div>
              ) : pieces.map(p => (
                <div key={p.id} className="flex items-center gap-3 px-5 py-3 group transition-colors hover:bg-white/[0.02]"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <input type="checkbox" checked={selected.has(p.id)}
                    onChange={() => setSelected(prev => { const s = new Set(prev); s.has(p.id) ? s.delete(p.id) : s.add(p.id); return s; })}
                    style={{ accentColor: '#3b82f6' }} />
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden"
                    style={{ background: 'rgba(255,255,255,0.05)' }}>
                    {p.media_thumb || p.media_url
                      ? <img src={p.media_thumb || p.media_url} alt="" className="w-full h-full object-cover" />
                      : <FileImage size={14} style={{ color: 'rgba(100,116,139,0.4)' }} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{p.title}</p>
                    <p className="text-[11px]" style={{ color: 'rgba(100,116,139,0.6)' }}>
                      {p.type} {p.scheduled_date ? `· ${new Date(p.scheduled_date).toLocaleDateString('pt-BR')}` : ''} {p.batch_id ? '' : '· sem lote'}
                    </p>
                  </div>
                  <button onClick={() => deleteSingle(p.id)} disabled={deleting}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition-all hover:bg-red-500/10"
                    style={{ color: 'rgba(248,113,113,0.6)' }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
