import { useEffect, useState, useRef } from 'react';
import { Plus, X, Trash2, FileImage, ChevronDown, ChevronRight, Send, CheckCircle2, RotateCcw, Calendar, Clock, Eye } from 'lucide-react';
import { contentApi, agencyClientsApi } from '../../api/client';
import { ContentPiece, ContentStatus, AgencyClient } from '../../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const STATUS_CONFIG: Record<ContentStatus, { label: string; color: string; bg: string; border: string; icon: any }> = {
  em_criacao:           { label: 'Em Criação',        color: '#94a3b8', bg: 'rgba(148,163,184,0.08)', border: 'rgba(148,163,184,0.2)', icon: FileImage },
  em_revisao:           { label: 'Em Revisão',        color: '#60a5fa', bg: 'rgba(59,130,246,0.08)',  border: 'rgba(59,130,246,0.2)',  icon: Eye },
  aguardando_aprovacao: { label: 'Ag. Aprovação',     color: '#f59e0b', bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.2)',  icon: Clock },
  aprovado:             { label: 'Aprovado',          color: '#34d399', bg: 'rgba(52,211,153,0.08)',  border: 'rgba(52,211,153,0.2)',  icon: CheckCircle2 },
  ajuste_solicitado:    { label: 'Ajuste Solicitado', color: '#f97316', bg: 'rgba(249,115,22,0.08)',  border: 'rgba(249,115,22,0.2)',  icon: RotateCcw },
  agendado:             { label: 'Agendado',          color: '#a78bfa', bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.2)', icon: Calendar },
  publicado:            { label: 'Publicado',         color: '#10b981', bg: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.2)',  icon: Send },
};

const STATUS_ORDER: ContentStatus[] = ['em_criacao','em_revisao','aguardando_aprovacao','aprovado','ajuste_solicitado','agendado','publicado'];
const MONTHS_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

interface FeedBatch {
  id: number;
  name: string;
  client_name: string;
  agency_client_id: number;
  month: number;
  year: number;
  order_num: number;
  post_count: number;
  approved_count: number;
}

function StatusBadge({ status }: { status: ContentStatus }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <span className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full w-fit"
      style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}>
      <Icon size={10} />{cfg.label}
    </span>
  );
}

function StatusDropdown({ current, onChange }: { current: ContentStatus; onChange: (s: ContentStatus) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
  }, []);
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(o => !o)} className="flex items-center gap-1.5 transition-opacity hover:opacity-80">
        <StatusBadge status={current} />
        <ChevronDown size={11} style={{ color: 'rgba(100,116,139,0.5)' }} />
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-1 right-0 rounded-xl overflow-hidden min-w-44"
          style={{ background: '#0d0d1f', border: '1px solid rgba(59,130,246,0.2)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
          {STATUS_ORDER.map(s => (
            <button key={s} onClick={() => { onChange(s); setOpen(false); }}
              className="w-full flex items-center px-3 py-2 transition-colors"
              style={{ background: s === current ? 'rgba(59,130,246,0.08)' : 'transparent' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(59,130,246,0.06)')}
              onMouseLeave={e => (e.currentTarget.style.background = s === current ? 'rgba(59,130,246,0.08)' : 'transparent')}>
              <StatusBadge status={s} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const emptyPostForm = { title: '', scheduled_date: '', media_url: '', caption: '', objective: '', status: 'em_criacao' as ContentStatus };
const emptyBatchForm = { agency_client_id: '', month: String(new Date().getMonth() + 1), year: String(new Date().getFullYear()) };
const selectStyle = { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '0.75rem', padding: '0.5rem 0.875rem', color: '#e2e8f0', fontSize: '0.8rem', outline: 'none', cursor: 'pointer' };

export default function MarketingContent() {
  const [clients, setClients] = useState<AgencyClient[]>([]);
  const [filterClient, setFilterClient] = useState('all');
  const [batches, setBatches] = useState<FeedBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [batchPosts, setBatchPosts] = useState<Record<number, ContentPiece[]>>({});
  const [loadingBatch, setLoadingBatch] = useState<Set<number>>(new Set());

  const [batchModal, setBatchModal] = useState(false);
  const [batchForm, setBatchForm] = useState(emptyBatchForm);
  const [savingBatch, setSavingBatch] = useState(false);
  const [deletingBatch, setDeletingBatch] = useState<number | null>(null);

  const [postModal, setPostModal] = useState<{ batchId: number; piece?: ContentPiece } | null>(null);
  const [postForm, setPostForm] = useState(emptyPostForm);
  const [savingPost, setSavingPost] = useState(false);
  const [deletingPost, setDeletingPost] = useState<{ id: number; batchId: number } | null>(null);

  const loadBatches = (client?: string) => {
    setLoading(true);
    const p: Record<string, string> = {};
    const ef = client ?? filterClient;
    if (ef !== 'all') p.client_id = ef;
    contentApi.listBatches(p).then(r => { setBatches(r.data); setLoading(false); });
  };

  useEffect(() => { agencyClientsApi.list().then(r => setClients(r.data)); }, []);
  useEffect(() => { loadBatches(); setExpanded(new Set()); setBatchPosts({}); }, [filterClient]);

  const toggleBatch = async (id: number) => {
    const next = new Set(expanded);
    if (next.has(id)) { next.delete(id); setExpanded(next); return; }
    next.add(id); setExpanded(next);
    if (!batchPosts[id]) {
      setLoadingBatch(l => new Set(l).add(id));
      const r = await contentApi.list({ batch_id: String(id) });
      setBatchPosts(p => ({ ...p, [id]: r.data }));
      setLoadingBatch(l => { const n = new Set(l); n.delete(id); return n; });
    }
  };

  const refreshBatchPosts = async (batchId: number) => {
    const r = await contentApi.list({ batch_id: String(batchId) });
    setBatchPosts(p => ({ ...p, [batchId]: r.data }));
  };

  const openNewPost = (batchId: number) => {
    if (!expanded.has(batchId)) toggleBatch(batchId);
    setPostModal({ batchId });
    setPostForm(emptyPostForm);
  };

  const openEditPost = (batchId: number, piece: ContentPiece) => {
    setPostModal({ batchId, piece });
    setPostForm({
      title: piece.title,
      scheduled_date: piece.scheduled_date ? piece.scheduled_date.slice(0, 10) : '',
      media_url: piece.media_url || '',
      caption: piece.caption || '',
      objective: piece.objective || '',
      status: piece.status,
    });
  };

  const handleSaveBatch = async () => {
    if (!batchForm.agency_client_id || !batchForm.month) return;
    setSavingBatch(true);
    await contentApi.createBatch({ agency_client_id: Number(batchForm.agency_client_id), month: Number(batchForm.month), year: Number(batchForm.year) });
    setSavingBatch(false); setBatchModal(false); loadBatches();
  };

  const handleDeleteBatch = async (id: number) => {
    await contentApi.deleteBatch(id);
    setDeletingBatch(null);
    setBatches(b => b.filter(x => x.id !== id));
    setBatchPosts(p => { const n = { ...p }; delete n[id]; return n; });
    setExpanded(e => { const n = new Set(e); n.delete(id); return n; });
  };

  const handleSavePost = async () => {
    if (!postModal || !postForm.title.trim()) return;
    const { batchId, piece } = postModal;
    const batch = batches.find(b => b.id === batchId);
    if (!batch) return;
    setSavingPost(true);
    const data = { ...postForm, type: 'post', agency_client_id: batch.agency_client_id, batch_id: batchId };
    if (piece) await contentApi.update(piece.id, data);
    else await contentApi.create(data);
    setSavingPost(false); setPostModal(null);
    await refreshBatchPosts(batchId);
    loadBatches();
  };

  const handleDeletePost = async (id: number, batchId: number) => {
    await contentApi.delete(id);
    setDeletingPost(null);
    setBatchPosts(p => ({ ...p, [batchId]: (p[batchId] || []).filter(x => x.id !== id) }));
    loadBatches();
  };

  const handleStatusChange = async (pieceId: number, batchId: number, status: ContentStatus) => {
    await contentApi.updateStatus(pieceId, status);
    setBatchPosts(p => ({ ...p, [batchId]: (p[batchId] || []).map(x => x.id === pieceId ? { ...x, status } : x) }));
    loadBatches();
  };

  return (
    <div className="p-4 md:p-8 animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="section-label mb-1">Marketing</p>
          <h1 className="text-3xl font-extralight text-white tracking-tight" style={{ textShadow: '0 0 30px rgba(59,130,246,0.2)' }}>
            Feed
          </h1>
          <p className="text-sm mt-1" style={{ color: 'rgba(100,116,139,0.7)' }}>
            {batches.length} {batches.length === 1 ? 'feed' : 'feeds'}
          </p>
        </div>
        <button onClick={() => { setBatchForm(emptyBatchForm); setBatchModal(true); }} className="btn-primary">
          <Plus size={15} /> Novo Feed
        </button>
      </div>

      {/* Filter */}
      <div className="mb-6">
        <select value={filterClient} onChange={e => setFilterClient(e.target.value)} style={selectStyle}>
          <option value="all">Todos os clientes</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: 'rgba(59,130,246,0.3)', borderTopColor: '#3b82f6' }} />
        </div>
      ) : batches.length === 0 ? (
        <div className="card p-16 text-center">
          <FileImage size={36} className="mx-auto mb-3" style={{ color: 'rgba(100,116,139,0.2)' }} />
          <p className="text-sm mb-4" style={{ color: 'rgba(100,116,139,0.5)' }}>Nenhum feed cadastrado ainda</p>
          <button onClick={() => { setBatchForm(emptyBatchForm); setBatchModal(true); }} className="btn-primary mx-auto">
            <Plus size={14} /> Criar primeiro feed
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {batches.map(batch => {
            const isOpen = expanded.has(batch.id);
            const posts = batchPosts[batch.id] || [];
            const isLoadingPosts = loadingBatch.has(batch.id);
            const pct = batch.post_count > 0 ? Math.round((batch.approved_count / batch.post_count) * 100) : 0;

            return (
              <div key={batch.id} className="card overflow-hidden">
                {/* Batch header */}
                <div className="flex items-center gap-3 px-5 py-4 cursor-pointer select-none transition-colors"
                  onClick={() => toggleBatch(batch.id)}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.015)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <div className="flex-shrink-0" style={{ color: 'rgba(100,116,139,0.5)' }}>
                    {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </div>
                  <div className="flex-1 min-w-0 flex items-center gap-3 flex-wrap">
                    <span className="text-white font-medium text-sm">{batch.name}</span>
                    {filterClient === 'all' && (
                      <span className="badge badge-slate text-[10px]">{batch.client_name}</span>
                    )}
                    <span className="text-xs" style={{ color: 'rgba(100,116,139,0.5)' }}>
                      {batch.post_count} {batch.post_count === 1 ? 'post' : 'posts'}
                    </span>
                    {batch.post_count > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                          <div className="h-full rounded-full transition-all duration-300"
                            style={{ width: `${pct}%`, background: pct === 100 ? '#10b981' : '#3b82f6' }} />
                        </div>
                        <span className="text-[10px]" style={{ color: pct === 100 ? '#10b981' : 'rgba(100,116,139,0.5)' }}>
                          {batch.approved_count}/{batch.post_count}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                    <button onClick={() => openNewPost(batch.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                      style={{ color: '#60a5fa', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.15)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(59,130,246,0.15)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'rgba(59,130,246,0.08)')}>
                      <Plus size={12} /> Post
                    </button>
                    <button onClick={() => setDeletingBatch(batch.id)} className="p-1.5 rounded-lg transition-all"
                      style={{ color: 'rgba(100,116,139,0.4)' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#f87171'; (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.08)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(100,116,139,0.4)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Posts */}
                {isOpen && (
                  <div style={{ borderTop: '1px solid rgba(59,130,246,0.06)' }}>
                    {isLoadingPosts ? (
                      <div className="flex justify-center py-6">
                        <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
                          style={{ borderColor: 'rgba(59,130,246,0.3)', borderTopColor: '#3b82f6' }} />
                      </div>
                    ) : posts.length === 0 ? (
                      <div className="px-5 py-5 text-center">
                        <p className="text-xs mb-3" style={{ color: 'rgba(100,116,139,0.4)' }}>Nenhum post neste feed ainda</p>
                        <button onClick={() => openNewPost(batch.id)} className="btn-ghost text-xs px-3 py-1.5 mx-auto">
                          <Plus size={11} /> Adicionar primeiro post
                        </button>
                      </div>
                    ) : (
                      <>
                        {posts.map((p, i) => (
                          <div key={p.id}
                            className="flex items-center gap-3 px-5 py-3 group transition-colors"
                            style={{ borderBottom: i < posts.length - 1 ? '1px solid rgba(255,255,255,0.025)' : undefined }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.01)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                            {p.media_url ? (
                              <img src={p.media_url} alt={p.title} className="w-9 h-9 rounded-lg object-cover flex-shrink-0"
                                style={{ border: '1px solid rgba(59,130,246,0.12)' }} />
                            ) : (
                              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                                style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.1)' }}>
                                <FileImage size={13} style={{ color: 'rgba(59,130,246,0.35)' }} />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-white truncate">{p.title}</p>
                              {p.scheduled_date && (
                                <p className="text-[10px] mt-0.5" style={{ color: 'rgba(100,116,139,0.5)' }}>
                                  {format(new Date(p.scheduled_date + 'T12:00:00'), "d 'de' MMMM", { locale: ptBR })}
                                </p>
                              )}
                            </div>
                            <div onClick={e => e.stopPropagation()}>
                              <StatusDropdown current={p.status} onChange={s => handleStatusChange(p.id, batch.id, s)} />
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                              <button onClick={() => openEditPost(batch.id, p)} className="p-1.5 rounded-lg transition-all"
                                style={{ color: 'rgba(100,116,139,0.5)' }}
                                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#60a5fa'; (e.currentTarget as HTMLElement).style.background = 'rgba(59,130,246,0.1)'; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(100,116,139,0.5)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                              </button>
                              <button onClick={() => setDeletingPost({ id: p.id, batchId: batch.id })} className="p-1.5 rounded-lg transition-all"
                                style={{ color: 'rgba(100,116,139,0.5)' }}
                                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#f87171'; (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.1)'; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(100,116,139,0.5)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        ))}
                        <button onClick={() => openNewPost(batch.id)}
                          className="w-full flex items-center gap-2 px-5 py-3 text-xs transition-colors"
                          style={{ color: 'rgba(100,116,139,0.4)', borderTop: '1px solid rgba(255,255,255,0.025)' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#60a5fa'; (e.currentTarget as HTMLElement).style.background = 'rgba(59,130,246,0.04)'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(100,116,139,0.4)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                          <Plus size={13} /> Adicionar post
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Batch Modal */}
      {batchModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4 animate-fade"
          style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)' }}>
          <div className="modal-card w-full max-w-md animate-fade-up">
            <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid rgba(59,130,246,0.1)' }}>
              <div>
                <p className="section-label mb-0.5">Novo</p>
                <h2 className="text-lg font-light text-white">Criar Feed</h2>
              </div>
              <button onClick={() => setBatchModal(false)} className="p-1.5 rounded-lg" style={{ color: 'rgba(100,116,139,0.6)' }}><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="label-dark">Cliente *</label>
                <select value={batchForm.agency_client_id} onChange={e => setBatchForm({ ...batchForm, agency_client_id: e.target.value })} className="input-dark" style={{ cursor: 'pointer' }}>
                  <option value="">Selecione o cliente</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-dark">Mês</label>
                  <select value={batchForm.month} onChange={e => setBatchForm({ ...batchForm, month: e.target.value })} className="input-dark" style={{ cursor: 'pointer' }}>
                    {MONTHS_PT.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label-dark">Ano</label>
                  <input type="number" value={batchForm.year} onChange={e => setBatchForm({ ...batchForm, year: e.target.value })} className="input-dark" min="2024" max="2030" />
                </div>
              </div>
              {batchForm.agency_client_id && batchForm.month && (
                <p className="text-xs px-3 py-2 rounded-lg" style={{ background: 'rgba(59,130,246,0.06)', color: 'rgba(148,163,184,0.6)', border: '1px solid rgba(59,130,246,0.1)' }}>
                  Será criado como: <span className="text-white font-medium">Feed {MONTHS_PT[Number(batchForm.month) - 1]}</span>
                </p>
              )}
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={() => setBatchModal(false)} className="btn-ghost flex-1 justify-center">Cancelar</button>
              <button onClick={handleSaveBatch} disabled={savingBatch || !batchForm.agency_client_id} className="btn-primary flex-1 justify-center">
                {savingBatch ? 'Criando…' : 'Criar Feed'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Post Modal */}
      {postModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4 animate-fade"
          style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)' }}>
          <div className="modal-card w-full max-w-lg animate-fade-up">
            <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid rgba(59,130,246,0.1)' }}>
              <div>
                <p className="section-label mb-0.5">{postModal.piece ? 'Editar' : 'Novo'}</p>
                <h2 className="text-lg font-light text-white">
                  {postModal.piece ? postModal.piece.title : `Post — ${batches.find(b => b.id === postModal.batchId)?.name}`}
                </h2>
              </div>
              <button onClick={() => setPostModal(null)} className="p-1.5 rounded-lg" style={{ color: 'rgba(100,116,139,0.6)' }}><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
              <div>
                <label className="label-dark">Título *</label>
                <input value={postForm.title} onChange={e => setPostForm({ ...postForm, title: e.target.value })} className="input-dark" placeholder="Ex: Lançamento produto X" autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-dark">Data prevista</label>
                  <input type="date" value={postForm.scheduled_date} onChange={e => setPostForm({ ...postForm, scheduled_date: e.target.value })} className="input-dark" />
                </div>
                <div>
                  <label className="label-dark">Status</label>
                  <select value={postForm.status} onChange={e => setPostForm({ ...postForm, status: e.target.value as ContentStatus })} className="input-dark" style={{ cursor: 'pointer' }}>
                    {STATUS_ORDER.map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="label-dark">URL da mídia</label>
                <input value={postForm.media_url} onChange={e => setPostForm({ ...postForm, media_url: e.target.value })} className="input-dark" placeholder="Link da imagem (Drive, Dropbox…)" />
              </div>
              <div>
                <label className="label-dark">Legenda</label>
                <textarea value={postForm.caption} onChange={e => setPostForm({ ...postForm, caption: e.target.value })} rows={3} className="input-dark resize-none" placeholder="Texto do post…" />
              </div>
              <div>
                <label className="label-dark">Objetivo estratégico</label>
                <input value={postForm.objective} onChange={e => setPostForm({ ...postForm, objective: e.target.value })} className="input-dark" placeholder="Ex: Gerar leads, engajamento, lançamento" />
              </div>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={() => setPostModal(null)} className="btn-ghost flex-1 justify-center">Cancelar</button>
              <button onClick={handleSavePost} disabled={savingPost || !postForm.title.trim()} className="btn-primary flex-1 justify-center">
                {savingPost ? 'Salvando…' : postModal.piece ? 'Salvar' : 'Criar Post'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete batch confirm */}
      {deletingBatch !== null && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4 animate-fade"
          style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)' }}>
          <div className="modal-card w-full max-w-sm p-6 animate-fade-up">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)' }}>
              <Trash2 size={16} className="icon-red" />
            </div>
            <h3 className="text-white font-medium mb-2">Excluir feed?</h3>
            <p className="text-sm mb-5" style={{ color: 'rgba(148,163,184,0.55)' }}>
              Os posts dentro do feed serão desvinculados mas não excluídos.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeletingBatch(null)} className="btn-ghost flex-1 justify-center">Cancelar</button>
              <button onClick={() => handleDeleteBatch(deletingBatch)} className="btn-danger flex-1 justify-center">Excluir</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete post confirm */}
      {deletingPost !== null && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4 animate-fade"
          style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)' }}>
          <div className="modal-card w-full max-w-sm p-6 animate-fade-up">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)' }}>
              <Trash2 size={16} className="icon-red" />
            </div>
            <h3 className="text-white font-medium mb-2">Excluir post?</h3>
            <p className="text-sm mb-5" style={{ color: 'rgba(148,163,184,0.55)' }}>Esta ação não pode ser desfeita.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeletingPost(null)} className="btn-ghost flex-1 justify-center">Cancelar</button>
              <button onClick={() => handleDeletePost(deletingPost.id, deletingPost.batchId)} className="btn-danger flex-1 justify-center">Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
