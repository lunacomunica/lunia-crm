import { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, X, Trash2, FileImage, ChevronDown, ChevronLeft, ChevronRight, Send, CheckCircle2, RotateCcw, Calendar, Clock, Eye, List, CalendarDays, LayoutGrid } from 'lucide-react';
import { contentApi, agencyClientsApi } from '../../api/client';
import PostDetailPanel from './PostDetailPanel';
import { ContentPiece, ContentStatus, AgencyClient } from '../../types';
import { startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function toDisplayUrl(url: string): string {
  const m = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (m) return `https://drive.google.com/uc?export=view&id=${m[1]}`;
  return url;
}

function getPostThumbnail(p: ContentPiece): string | null {
  try {
    const files = JSON.parse((p as any).media_files || '[]');
    const img = files.find((f: any) => f.type === 'image');
    if (img?.url) return img.url;
  } catch {}
  // (unused fallback — getPostThumbnail handles this)
  return p.media_url ? toDisplayUrl(p.media_url) : null;
}

const STATUS_CONFIG: Record<ContentStatus, { label: string; color: string; bg: string; border: string; icon: any }> = {
  em_criacao:           { label: 'Em Criação',        color: '#94a3b8', bg: 'rgba(148,163,184,0.08)', border: 'rgba(148,163,184,0.2)', icon: FileImage },
  em_revisao:           { label: 'Em Revisão',        color: '#22d3ee', bg: 'rgba(34,211,238,0.08)',  border: 'rgba(34,211,238,0.2)',  icon: Eye },
  aguardando_aprovacao: { label: 'Ag. Aprovação',     color: '#f59e0b', bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.2)',  icon: Clock },
  aprovado:             { label: 'Aprovado',          color: '#60a5fa', bg: 'rgba(59,130,246,0.08)',  border: 'rgba(59,130,246,0.2)',  icon: CheckCircle2 },
  ajuste_solicitado:    { label: 'Ajuste Solicitado', color: '#f87171', bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.2)', icon: RotateCcw },
  agendado:             { label: 'Agendado',          color: '#a78bfa', bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.2)', icon: Calendar },
  publicado:            { label: 'Publicado',         color: '#10b981', bg: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.2)',  icon: Send },
};
const STATUS_ORDER: ContentStatus[] = ['em_criacao','em_revisao','aguardando_aprovacao','aprovado','ajuste_solicitado','agendado','publicado'];
const MONTHS_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

interface FeedBatch { id: number; name: string; agency_client_id: number; month: number; year: number; order_num: number; post_count: number; approved_count: number; }
type View = 'list' | 'calendar' | 'preview';

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
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (btnRef.current?.contains(e.target as Node)) return;
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const handleOpen = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, right: window.innerWidth - r.right });
    }
    setOpen(o => !o);
  };

  return (
    <div className="relative">
      <button ref={btnRef} onClick={handleOpen} className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
        <StatusBadge status={current} />
        <ChevronDown size={11} style={{ color: 'rgba(100,116,139,0.5)' }} />
      </button>
      {open && (
        <div ref={menuRef} className="rounded-xl overflow-hidden min-w-44"
          style={{ position: 'fixed', top: pos.top, right: pos.right, zIndex: 9999, background: '#0d0d1f', border: '1px solid rgba(59,130,246,0.2)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
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

const emptyBatchForm = { agency_client_id: '', month: String(new Date().getMonth() + 1), year: String(new Date().getFullYear()) };
const selectStyle = { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '0.75rem', padding: '0.5rem 0.875rem', color: '#e2e8f0', fontSize: '0.8rem', outline: 'none', cursor: 'pointer' };

export default function MarketingContent() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [clients, setClients] = useState<AgencyClient[]>([]);
  const [filterClient, setFilterClient] = useState(searchParams.get('client') || 'all');
  const [batches, setBatches] = useState<FeedBatch[]>([]);
  const pendingPostId = useRef<number | null>(Number(searchParams.get('post')) || null);
  const [navMonth, setNavMonth] = useState({ month: new Date().getMonth() + 1, year: new Date().getFullYear() });
  const [posts, setPosts] = useState<ContentPiece[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [view, setView] = useState<View>('list');

  const [batchModal, setBatchModal] = useState(false);
  const [batchForm, setBatchForm] = useState(emptyBatchForm);
  const [savingBatch, setSavingBatch] = useState(false);

  const [newPostTitle, setNewPostTitle] = useState('');
  const [showNewPostModal, setShowNewPostModal] = useState(false);
  const [creatingPost, setCreatingPost] = useState(false);
  const [deletingPost, setDeletingPost] = useState<number | null>(null);
  const [panelPost, setPanelPost] = useState<ContentPiece | null>(null);

  const selectedBatch = batches.find(b => b.month === navMonth.month && b.year === navMonth.year) ?? null;
  const selectedBatchId = selectedBatch?.id ?? null;
  const calMonth = new Date(navMonth.year, navMonth.month - 1, 1);
  const prevMonth = () => setNavMonth(m => m.month === 1 ? { month: 12, year: m.year - 1 } : { month: m.month - 1, year: m.year });
  const nextMonth = () => setNavMonth(m => m.month === 12 ? { month: 1, year: m.year + 1 } : { month: m.month + 1, year: m.year });

  useEffect(() => { agencyClientsApi.list(true).then(r => setClients(r.data)); }, []);

  useEffect(() => {
    if (filterClient === 'all') { setBatches([]); setPosts([]); return; }
    setLoadingBatches(true);
    contentApi.listBatches({ client_id: filterClient }).then(r => {
      setBatches(r.data);
      setLoadingBatches(false);
    });
  }, [filterClient]);

  useEffect(() => {
    if (!selectedBatchId) { setPosts([]); return; }
    setLoadingPosts(true);
    contentApi.list({ batch_id: String(selectedBatchId) }).then(r => {
      setPosts(r.data);
      setLoadingPosts(false);
    });
  }, [selectedBatchId]);

  // Auto-open post from notification (?post=ID)
  useEffect(() => {
    if (!pendingPostId.current) return;
    const id = pendingPostId.current;
    pendingPostId.current = null;
    contentApi.get(id).then(r => {
      setPanelPost(r.data);
      // Also switch to the right client/month if needed
      if (r.data.agency_client_id && filterClient !== String(r.data.agency_client_id)) {
        setFilterClient(String(r.data.agency_client_id));
      }
      setSearchParams({}, { replace: true });
    }).catch(() => {});
  }, []);

  const reloadPosts = async () => {
    if (!selectedBatchId) return;
    const r = await contentApi.list({ batch_id: String(selectedBatchId) });
    setPosts(r.data);
  };
  const reloadBatches = async () => {
    if (filterClient === 'all') return;
    const r = await contentApi.listBatches({ client_id: filterClient });
    setBatches(r.data);
  };

  const handleSaveBatch = async () => {
    if (!batchForm.agency_client_id || !batchForm.month) return;
    setSavingBatch(true);
    await contentApi.createBatch({ agency_client_id: Number(batchForm.agency_client_id), month: Number(batchForm.month), year: Number(batchForm.year) });
    setSavingBatch(false); setBatchModal(false);
    const clientId = batchForm.agency_client_id;
    const newMonth = { month: Number(batchForm.month), year: Number(batchForm.year) };
    if (filterClient !== clientId) setFilterClient(clientId);
    else {
      const br = await contentApi.listBatches({ client_id: clientId });
      setBatches(br.data);
    }
    setNavMonth(newMonth);
  };

  const createNewPost = async () => {
    if (!newPostTitle.trim() || !selectedBatchId) return;
    setCreatingPost(true);
    const r = await contentApi.create({ title: newPostTitle.trim(), type: 'post', agency_client_id: Number(filterClient), batch_id: selectedBatchId, status: 'em_criacao' });
    setCreatingPost(false); setShowNewPostModal(false);
    setPanelPost(r.data);
    await reloadPosts(); reloadBatches();
  };

  const handleStatusChange = async (id: number, status: ContentStatus) => {
    await contentApi.updateStatus(id, status);
    setPosts(prev => prev.map(p => p.id === id ? { ...p, status } : p));
    reloadBatches();
  };

  const handleDeletePost = async (id: number) => {
    await contentApi.delete(id); setDeletingPost(null);
    setPosts(prev => prev.filter(p => p.id !== id));
    reloadBatches();
  };

  const openNewPost = () => { setNewPostTitle(''); setShowNewPostModal(true); };
  const openEditPost = (p: ContentPiece) => setPanelPost(p);

  // Calendar helpers
  const calDays = eachDayOfInterval({ start: startOfMonth(calMonth), end: endOfMonth(calMonth) });
  const calStartDay = startOfMonth(calMonth).getDay();
  const byDay = (day: Date) => posts.filter(p => p.scheduled_date && isSameDay(new Date(p.scheduled_date + 'T12:00:00'), day));

  const sortedPosts = [...posts].sort((a, b) => {
    if (!a.scheduled_date) return 1;
    if (!b.scheduled_date) return -1;
    return a.scheduled_date.localeCompare(b.scheduled_date);
  });

  // Drag-and-drop state for calendar
  const [dragPost, setDragPost] = useState<ContentPiece | null>(null);
  const [dragOverDay, setDragOverDay] = useState<string | null>(null);

  const handleCalDrop = async (day: Date) => {
    if (!dragPost) return;
    const newDate = format(day, 'yyyy-MM-dd');
    setDragOverDay(null);
    setPosts(prev => prev.map(p => p.id === dragPost.id ? { ...p, scheduled_date: newDate } : p));
    setDragPost(null);
    await contentApi.update(dragPost.id, { scheduled_date: newDate });
  };

  return (
    <div className="p-4 md:p-8 animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="section-label mb-1">Marketing</p>
          <h1 className="text-3xl font-extralight text-white tracking-tight" style={{ textShadow: '0 0 30px rgba(59,130,246,0.2)' }}>Feed</h1>
        </div>
        <button onClick={() => { setBatchForm(emptyBatchForm); setBatchModal(true); }} className="btn-primary">
          <Plus size={15} /> Novo Feed
        </button>
      </div>

      {/* Client filter */}
      <div className="mb-5">
        <select value={filterClient} onChange={e => setFilterClient(e.target.value)} style={selectStyle}>
          <option value="all">Selecione um cliente</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* No client selected */}
      {filterClient === 'all' && (
        <div className="card p-16 text-center">
          <LayoutGrid size={36} className="mx-auto mb-3" style={{ color: 'rgba(100,116,139,0.2)' }} />
          <p className="text-sm" style={{ color: 'rgba(100,116,139,0.5)' }}>Selecione um cliente para ver e gerenciar o feed</p>
        </div>
      )}

      {/* Client selected */}
      {filterClient !== 'all' && (
        <>
          {/* Month nav + view toggle — always visible once client is selected */}
          <div className="flex items-center justify-between mb-5 gap-3">
            <div className="flex items-center gap-1">
              <button onClick={prevMonth} className="p-1.5 rounded-lg transition-all"
                style={{ color: 'rgba(148,163,184,0.6)', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <ChevronLeft size={14} />
              </button>
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl min-w-44 justify-center"
                style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)' }}>
                <span className="text-sm font-medium text-white whitespace-nowrap">
                  {MONTHS_PT[navMonth.month - 1]} {navMonth.year}
                </span>
                {selectedBatch && selectedBatch.post_count > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: 'rgba(59,130,246,0.15)', color: selectedBatch.approved_count === selectedBatch.post_count ? '#10b981' : '#60a5fa' }}>
                    {selectedBatch.approved_count}/{selectedBatch.post_count}
                  </span>
                )}
              </div>
              <button onClick={nextMonth} className="p-1.5 rounded-lg transition-all"
                style={{ color: 'rgba(148,163,184,0.6)', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <ChevronRight size={14} />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}>
                {([
                  { id: 'list' as View, icon: List, label: 'Lista' },
                  { id: 'calendar' as View, icon: CalendarDays, label: 'Calendário' },
                  { id: 'preview' as View, icon: LayoutGrid, label: 'Prévia' },
                ]).map(v => (
                  <button key={v.id} onClick={() => setView(v.id)}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-all"
                    style={{ color: view === v.id ? '#e2e8f0' : 'rgba(100,116,139,0.5)', background: view === v.id ? 'rgba(59,130,246,0.15)' : 'transparent' }}>
                    <v.icon size={13} />{v.label}
                  </button>
                ))}
              </div>
              {selectedBatchId && (
                <button onClick={openNewPost} className="btn-primary text-xs px-3 py-2">
                  <Plus size={13} /> Novo Post
                </button>
              )}
            </div>
          </div>

          {loadingBatches ? (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
                style={{ borderColor: 'rgba(59,130,246,0.3)', borderTopColor: '#3b82f6' }} />
            </div>
          ) : !selectedBatch ? (
            <div className="card p-16 text-center">
              <FileImage size={36} className="mx-auto mb-3" style={{ color: 'rgba(100,116,139,0.2)' }} />
              <p className="text-sm mb-1" style={{ color: 'rgba(100,116,139,0.5)' }}>Nenhum feed para {MONTHS_PT[navMonth.month - 1]} {navMonth.year}</p>
              <p className="text-xs mb-5" style={{ color: 'rgba(100,116,139,0.3)' }}>Use as setas para navegar ou crie um feed para este mês</p>
              <button onClick={() => { setBatchForm({ agency_client_id: filterClient, month: String(navMonth.month), year: String(navMonth.year) }); setBatchModal(true); }}
                className="btn-primary mx-auto"><Plus size={14} /> Criar feed para este mês</button>
            </div>
          ) : (
            <>

              {/* Content area */}
              {loadingPosts ? (
                <div className="flex justify-center py-12">
                  <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
                    style={{ borderColor: 'rgba(59,130,246,0.3)', borderTopColor: '#3b82f6' }} />
                </div>
              ) : posts.length === 0 ? (
                <div className="card p-12 text-center">
                  <FileImage size={32} className="mx-auto mb-3" style={{ color: 'rgba(100,116,139,0.2)' }} />
                  <p className="text-sm mb-4" style={{ color: 'rgba(100,116,139,0.5)' }}>Nenhum post neste feed ainda</p>
                  <button onClick={openNewPost} className="btn-primary mx-auto"><Plus size={14} /> Adicionar post</button>
                </div>
              ) : (
                <>
                  {/* ── LISTA ── */}
                  {view === 'list' && (
                    <div className="card overflow-hidden">
                      {sortedPosts.map((p, i) => (
                        <div key={p.id} className="flex items-center gap-3 px-5 py-3 group transition-colors"
                          style={{ borderBottom: i < sortedPosts.length - 1 ? '1px solid rgba(255,255,255,0.04)' : undefined }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.01)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                          <span className="text-[10px] font-mono w-5 flex-shrink-0 text-center" style={{ color: 'rgba(100,116,139,0.35)' }}>
                            {String(i + 1).padStart(2, '0')}
                          </span>
                          {getPostThumbnail(p) ? (
                            <img src={getPostThumbnail(p)!} alt={p.title} className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                              style={{ border: '1px solid rgba(59,130,246,0.12)' }} />
                          ) : (
                            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                              style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.1)' }}>
                              <FileImage size={14} style={{ color: 'rgba(59,130,246,0.35)' }} />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{p.title}</p>
                            {p.scheduled_date && (
                              <p className="text-[10px] mt-0.5" style={{ color: 'rgba(100,116,139,0.5)' }}>
                                {format(new Date(p.scheduled_date + 'T12:00:00'), "d 'de' MMMM", { locale: ptBR })}
                                {(p as any).scheduled_time && <span className="ml-1">· {(p as any).scheduled_time}</span>}
                              </p>
                            )}
                          </div>
                          <div className="flex-shrink-0" onClick={e => e.stopPropagation()}>
                            <StatusDropdown current={p.status} onChange={s => handleStatusChange(p.id, s)} />
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                            <button onClick={() => openEditPost(p)} className="p-1.5 rounded-lg transition-all"
                              style={{ color: 'rgba(100,116,139,0.5)' }}
                              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#60a5fa'; (e.currentTarget as HTMLElement).style.background = 'rgba(59,130,246,0.1)'; }}
                              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(100,116,139,0.5)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            </button>
                            <button onClick={() => setDeletingPost(p.id)} className="p-1.5 rounded-lg transition-all"
                              style={{ color: 'rgba(100,116,139,0.5)' }}
                              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#f87171'; (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.1)'; }}
                              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(100,116,139,0.5)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* ── CALENDÁRIO ── */}
                  {view === 'calendar' && (
                    <div className="card overflow-hidden">
                      <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(59,130,246,0.08)' }}>
                        <span className="text-sm font-medium text-white capitalize">
                          {format(calMonth, 'MMMM yyyy', { locale: ptBR })}
                        </span>
                        <span className="text-xs" style={{ color: 'rgba(100,116,139,0.5)' }}>{posts.length} posts agendados</span>
                      </div>
                      <div className="grid grid-cols-7" style={{ borderBottom: '1px solid rgba(59,130,246,0.06)' }}>
                        {['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map(d => (
                          <div key={d} className="py-2 text-center text-[10px] font-medium uppercase tracking-wide" style={{ color: 'rgba(100,116,139,0.4)' }}>{d}</div>
                        ))}
                      </div>
                      <div className="grid grid-cols-7">
                        {Array.from({ length: calStartDay }).map((_, i) => (
                          <div key={`e-${i}`} className="min-h-20 p-1.5" style={{ borderRight: '1px solid rgba(59,130,246,0.04)', borderBottom: '1px solid rgba(59,130,246,0.04)' }} />
                        ))}
                        {calDays.map(day => {
                          const dayPosts = byDay(day);
                          const today = isToday(day);
                          const dayKey = format(day, 'yyyy-MM-dd');
                          const isOver = dragOverDay === dayKey;
                          return (
                            <div key={day.toISOString()} className="min-h-20 p-1.5 transition-colors"
                              onDragOver={e => { e.preventDefault(); setDragOverDay(dayKey); }}
                              onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverDay(null); }}
                              onDrop={e => { e.preventDefault(); handleCalDrop(day); }}
                              style={{
                                borderRight: '1px solid rgba(59,130,246,0.04)',
                                borderBottom: '1px solid rgba(59,130,246,0.04)',
                                background: isOver ? 'rgba(59,130,246,0.12)' : today ? 'rgba(59,130,246,0.04)' : 'transparent',
                                outline: isOver ? '1px dashed rgba(59,130,246,0.4)' : undefined,
                                outlineOffset: '-2px',
                              }}>
                              <p className="text-[10px] font-medium mb-1 w-5 h-5 flex items-center justify-center rounded-full"
                                style={{ color: today ? '#fff' : 'rgba(148,163,184,0.5)', background: today ? '#3b82f6' : 'transparent' }}>
                                {format(day, 'd')}
                              </p>
                              <div className="space-y-0.5">
                                {dayPosts.map(p => {
                                  const color = STATUS_CONFIG[p.status]?.color || '#94a3b8';
                                  const isDragging = dragPost?.id === p.id;
                                  return (
                                    <div key={p.id}
                                      draggable
                                      onDragStart={() => setDragPost(p)}
                                      onDragEnd={() => { setDragPost(null); setDragOverDay(null); }}
                                      onClick={() => openEditPost(p)}
                                      className="flex items-center gap-1 px-1 py-0.5 rounded cursor-grab active:cursor-grabbing text-[9px] truncate hover:opacity-80 transition-opacity"
                                      style={{ background: `${color}18`, border: `1px solid ${color}28`, color, opacity: isDragging ? 0.4 : 1 }}>
                                      <div className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: color }} />
                                      {p.title}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* ── PRÉVIA DO FEED ── */}
                  {view === 'preview' && (
                    <div>
                      {(() => {
                        const previewPosts = [...posts].sort((a, b) => {
                          if (!a.scheduled_date) return 1;
                          if (!b.scheduled_date) return -1;
                          return b.scheduled_date.localeCompare(a.scheduled_date);
                        });
                        const total = previewPosts.length;
                        return (
                      <>
                      <p className="text-xs mb-3" style={{ color: 'rgba(100,116,139,0.45)' }}>
                        {total} posts · ordem decrescente
                      </p>
                      <div className="grid grid-cols-3 gap-0.5 rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                        {previewPosts.map((p, i) => {
                          const cfg = STATUS_CONFIG[p.status];
                          return (
                            <div key={p.id} className="relative group cursor-pointer"
                              style={{ aspectRatio: '1080/1350' }}
                              onClick={() => openEditPost(p)}>
                              {getPostThumbnail(p) ? (
                                <img src={getPostThumbnail(p)!} alt={p.title} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center gap-2"
                                  style={{ background: 'rgba(59,130,246,0.06)', borderRight: '1px solid rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                  <FileImage size={20} style={{ color: 'rgba(59,130,246,0.3)' }} />
                                  <span className="text-[9px] font-mono" style={{ color: 'rgba(100,116,139,0.4)' }}>
                                    {String(total - i).padStart(2, '0')}
                                  </span>
                                </div>
                              )}
                              {/* Position number — colored by status */}
                              <div className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold"
                                style={{ background: cfg.color, color: '#fff', boxShadow: `0 0 6px ${cfg.color}88` }}>
                                {total - i}
                              </div>
                              {/* Type icons Instagram-style */}
                              {p.type === 'carrossel' && (
                                <span className="absolute top-1.5 right-1.5 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                                    <path d="M2 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8z"/>
                                    <path d="M6 4h13a3 3 0 0 1 3 3v11" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round"/>
                                  </svg>
                                </span>
                              )}
                              {p.type === 'reels' && (
                                <span className="absolute top-1.5 right-1.5 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                                    <path d="M5 3a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H5z"/>
                                    <path d="M2 8h20M8 3v5M16 3v5" stroke="black" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                                    <path d="M10 12l5 3-5 3v-6z" fill="black"/>
                                  </svg>
                                </span>
                              )}
                              {/* Hover overlay */}
                              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(2px)' }}>
                                <StatusBadge status={p.status} />
                                <p className="text-white text-[11px] font-medium text-center px-2 leading-tight line-clamp-2">
                                  {p.title}
                                </p>
                                {p.scheduled_date && (
                                  <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
                                    {format(new Date(p.scheduled_date + 'T12:00:00'), "d MMM", { locale: ptBR })}
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                        {Array.from({ length: (3 - (total % 3)) % 3 }).map((_, i) => (
                          <div key={`fill-${i}`} style={{ aspectRatio: '1', background: 'rgba(255,255,255,0.015)' }} />
                        ))}
                      </div>
                      </>
                        );
                      })()}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </>
      )}

      {/* Batch Modal */}
      {batchModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4 animate-fade"
          style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)' }}>
          <div className="modal-card w-full max-w-md animate-fade-up">
            <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid rgba(59,130,246,0.1)' }}>
              <div><p className="section-label mb-0.5">Novo</p><h2 className="text-lg font-light text-white">Criar Feed</h2></div>
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

      {/* New post modal */}
      {showNewPostModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4 animate-fade"
          style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)' }}>
          <div className="modal-card w-full max-w-sm animate-fade-up">
            <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid rgba(59,130,246,0.1)' }}>
              <div>
                <p className="section-label mb-0.5">Novo post</p>
                <h2 className="text-lg font-light text-white">{selectedBatch?.name}</h2>
              </div>
              <button onClick={() => setShowNewPostModal(false)} className="p-1.5 rounded-lg" style={{ color: 'rgba(100,116,139,0.6)' }}><X size={18} /></button>
            </div>
            <div className="p-6">
              <label className="label-dark">Título *</label>
              <input value={newPostTitle} onChange={e => setNewPostTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && createNewPost()}
                className="input-dark" placeholder="Ex: Lançamento produto X" autoFocus />
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={() => setShowNewPostModal(false)} className="btn-ghost flex-1 justify-center">Cancelar</button>
              <button onClick={createNewPost} disabled={creatingPost || !newPostTitle.trim()} className="btn-primary flex-1 justify-center">
                {creatingPost ? 'Criando…' : 'Criar Post'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
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
              <button onClick={() => handleDeletePost(deletingPost)} className="btn-danger flex-1 justify-center">Excluir</button>
            </div>
          </div>
        </div>
      )}

      {panelPost && (
        <PostDetailPanel
          post={panelPost}
          onClose={() => setPanelPost(null)}
          onUpdated={updated => {
            setPosts(prev => prev.map(p => p.id === updated.id ? updated : p));
            setPanelPost(updated);
            reloadBatches();
          }}
          onDeleted={() => {
            setPosts(prev => prev.filter(p => p.id !== panelPost.id));
            setPanelPost(null);
            reloadBatches();
          }}
        />
      )}
    </div>
  );
}
