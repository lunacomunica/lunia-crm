import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, X, Trash2, FileImage, Send, CheckCircle2, RotateCcw, Calendar, Clock, Eye, MessageSquare, ChevronDown, List, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { contentApi, agencyClientsApi } from '../../api/client';
import { ContentPiece, ContentStatus, AgencyClient } from '../../types';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isToday } from 'date-fns';
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
const TYPES = ['post','reels','story','carrossel'];
const TYPE_LABEL: Record<string, string> = { post: 'Post', reels: 'Reels', story: 'Story', carrossel: 'Carrossel' };

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
        <div className="absolute z-50 top-full mt-1 left-0 rounded-xl overflow-hidden min-w-44"
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

const emptyForm = { agency_client_id: '', title: '', type: 'post', caption: '', media_url: '', scheduled_date: '', objective: '', status: 'em_criacao' as ContentStatus };
const selectStyle = { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '0.75rem', padding: '0.5rem 0.875rem', color: '#e2e8f0', fontSize: '0.8rem', outline: 'none', cursor: 'pointer' };

export default function MarketingContent() {
  const [searchParams] = useSearchParams();
  const [pieces, setPieces] = useState<ContentPiece[]>([]);
  const [clients, setClients] = useState<AgencyClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [filterClient, setFilterClient] = useState(searchParams.get('client') || 'all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [modal, setModal] = useState(false);
  const [detail, setDetail] = useState<ContentPiece | null>(null);
  const [editing, setEditing] = useState<ContentPiece | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [comment, setComment] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [calMonth, setCalMonth] = useState(new Date());

  const load = () => {
    setLoading(true);
    const p: Record<string, string> = {};
    if (filterClient !== 'all') p.client_id = filterClient;
    if (filterStatus !== 'all') p.status = filterStatus;
    contentApi.list(p).then(r => { setPieces(r.data); setLoading(false); });
  };
  useEffect(() => { load(); }, [filterClient, filterStatus]);
  useEffect(() => { agencyClientsApi.list().then(r => setClients(r.data)); }, []);

  const openCreate = () => { setEditing(null); setForm({ ...emptyForm, agency_client_id: filterClient !== 'all' ? filterClient : '' }); setModal(true); };
  const openEdit = (p: ContentPiece) => {
    setEditing(p);
    setForm({ agency_client_id: String(p.agency_client_id), title: p.title, type: p.type, caption: p.caption || '', media_url: p.media_url || '', scheduled_date: p.scheduled_date ? p.scheduled_date.slice(0,10) : '', objective: p.objective || '', status: p.status });
    setModal(true);
  };
  const openDetail = async (p: ContentPiece) => { const r = await contentApi.get(p.id); setDetail(r.data); };

  const handleSave = async () => {
    if (!form.title.trim() || !form.agency_client_id) return;
    setSaving(true);
    if (editing) await contentApi.update(editing.id, form);
    else await contentApi.create(form);
    setSaving(false); setModal(false); load();
  };

  const handleStatus = async (id: number, status: ContentStatus) => {
    await contentApi.updateStatus(id, status);
    setPieces(prev => prev.map(p => p.id === id ? { ...p, status } : p));
    if (detail?.id === id) setDetail(prev => prev ? { ...prev, status } : prev);
  };

  const handleComment = async () => {
    if (!comment.trim() || !detail) return;
    setSendingComment(true);
    const r = await contentApi.addComment(detail.id, comment);
    setDetail(prev => prev ? { ...prev, comments: [...(prev.comments || []), r.data] } : prev);
    setComment(''); setSendingComment(false);
  };

  const handleDelete = async (id: number) => { await contentApi.delete(id); setDeleting(null); setDetail(null); load(); };

  const grouped = STATUS_ORDER.reduce((acc, s) => { acc[s] = pieces.filter(p => p.status === s); return acc; }, {} as Record<string, ContentPiece[]>);

  // Calendar helpers
  const calDays = eachDayOfInterval({ start: startOfMonth(calMonth), end: endOfMonth(calMonth) });
  const calStartDay = startOfMonth(calMonth).getDay();
  const allPieces = pieces; // calendar uses filtered pieces (filterClient applied via load)
  const byDay = (day: Date) => allPieces.filter(p => p.scheduled_date && isSameDay(new Date(p.scheduled_date + 'T12:00:00'), day));

  return (
    <div className="p-4 md:p-8 animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="section-label mb-1">Marketing</p>
          <h1 className="text-3xl font-extralight text-white tracking-tight" style={{ textShadow: '0 0 30px rgba(59,130,246,0.2)' }}>Conteúdos</h1>
          <p className="text-sm mt-1" style={{ color: 'rgba(100,116,139,0.7)' }}>{pieces.length} peças</p>
        </div>
        <div className="flex items-center gap-3">
          {/* View toggle */}
          <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}>
            <button onClick={() => setView('list')}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-all"
              style={{ color: view === 'list' ? '#e2e8f0' : 'rgba(100,116,139,0.5)', background: view === 'list' ? 'rgba(59,130,246,0.15)' : 'transparent' }}>
              <List size={13} /> Lista
            </button>
            <button onClick={() => setView('calendar')}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-all"
              style={{ color: view === 'calendar' ? '#e2e8f0' : 'rgba(100,116,139,0.5)', background: view === 'calendar' ? 'rgba(59,130,246,0.15)' : 'transparent' }}>
              <CalendarDays size={13} /> Calendário
            </button>
          </div>
          <button onClick={openCreate} className="btn-primary"><Plus size={15} /> Nova Peça</button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6 flex-wrap items-center">
        <select value={filterClient} onChange={e => setFilterClient(e.target.value)} style={selectStyle}>
          <option value="all">Todos os clientes</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {view === 'list' && (
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={selectStyle}>
            <option value="all">Todos os status</option>
            {STATUS_ORDER.map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
          </select>
        )}
        {view === 'calendar' && (
          <div className="flex items-center gap-2 ml-auto">
            <button onClick={() => setCalMonth(m => subMonths(m, 1))} className="btn-ghost px-2.5 py-2"><ChevronLeft size={16} /></button>
            <span className="text-white font-medium min-w-36 text-center capitalize text-sm">
              {format(calMonth, 'MMMM yyyy', { locale: ptBR })}
            </span>
            <button onClick={() => setCalMonth(m => addMonths(m, 1))} className="btn-ghost px-2.5 py-2"><ChevronRight size={16} /></button>
            <button onClick={() => setCalMonth(new Date())} className="btn-ghost text-xs px-3">Hoje</button>
          </div>
        )}
      </div>

      {/* ── LIST VIEW ── */}
      {view === 'list' && (
        <>
          {/* Status chips */}
          <div className="flex gap-2 flex-wrap mb-6">
            {STATUS_ORDER.map(s => {
              const count = grouped[s]?.length || 0;
              if (count === 0) return null;
              const cfg = STATUS_CONFIG[s];
              return (
                <button key={s} onClick={() => setFilterStatus(filterStatus === s ? 'all' : s)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                  style={{ color: cfg.color, background: filterStatus === s ? cfg.bg : 'rgba(255,255,255,0.02)', border: `1px solid ${filterStatus === s ? cfg.border : 'rgba(255,255,255,0.05)'}` }}>
                  {cfg.label} <span className="font-bold">{count}</span>
                </button>
              );
            })}
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
                style={{ borderColor: 'rgba(59,130,246,0.3)', borderTopColor: '#3b82f6' }} />
            </div>
          ) : pieces.length === 0 ? (
            <div className="card p-16 text-center">
              <FileImage size={36} className="mx-auto mb-3" style={{ color: 'rgba(100,116,139,0.2)' }} />
              <p className="text-sm mb-4" style={{ color: 'rgba(100,116,139,0.5)' }}>Nenhuma peça cadastrada ainda</p>
              <button onClick={openCreate} className="btn-primary mx-auto"><Plus size={14} /> Criar primeira peça</button>
            </div>
          ) : (
            <div className="card overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="th">Conteúdo</th>
                    <th className="th hidden md:table-cell">Cliente</th>
                    <th className="th hidden sm:table-cell">Tipo</th>
                    <th className="th">Status</th>
                    <th className="th hidden lg:table-cell">Data prevista</th>
                    <th className="th w-16" />
                  </tr>
                </thead>
                <tbody>
                  {pieces.map(p => (
                    <tr key={p.id} className="tr group cursor-pointer" onClick={() => openDetail(p)}>
                      <td className="td">
                        <div className="flex items-center gap-3">
                          {p.media_url ? (
                            <img src={p.media_url} alt={p.title} className="w-9 h-9 rounded-lg object-cover flex-shrink-0"
                              style={{ border: '1px solid rgba(59,130,246,0.15)' }} />
                          ) : (
                            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                              style={{ background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.12)' }}>
                              <FileImage size={14} style={{ color: 'rgba(59,130,246,0.4)' }} />
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-medium text-white">{p.title}</p>
                            {p.objective && <p className="text-xs truncate max-w-xs" style={{ color: 'rgba(100,116,139,0.5)' }}>{p.objective}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="td hidden md:table-cell">
                        <span className="text-sm" style={{ color: 'rgba(148,163,184,0.7)' }}>{p.client_name}</span>
                      </td>
                      <td className="td hidden sm:table-cell">
                        <span className="badge badge-slate">{TYPE_LABEL[p.type] || p.type}</span>
                      </td>
                      <td className="td" onClick={e => e.stopPropagation()}>
                        <StatusDropdown current={p.status} onChange={s => handleStatus(p.id, s)} />
                      </td>
                      <td className="td hidden lg:table-cell text-xs" style={{ color: 'rgba(100,116,139,0.55)' }}>
                        {p.scheduled_date ? format(new Date(p.scheduled_date), "d MMM yyyy", { locale: ptBR }) : '—'}
                      </td>
                      <td className="td" onClick={e => e.stopPropagation()}>
                        <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg transition-all"
                            style={{ color: 'rgba(100,116,139,0.6)' }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#60a5fa'; (e.currentTarget as HTMLElement).style.background = 'rgba(59,130,246,0.1)'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(100,116,139,0.6)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          </button>
                          <button onClick={() => setDeleting(p.id)} className="p-1.5 rounded-lg transition-all"
                            style={{ color: 'rgba(100,116,139,0.6)' }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#f87171'; (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.1)'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(100,116,139,0.6)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── CALENDAR VIEW ── */}
      {view === 'calendar' && (
        <div className="card overflow-hidden">
          <div className="grid grid-cols-7" style={{ borderBottom: '1px solid rgba(59,130,246,0.08)' }}>
            {['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map(d => (
              <div key={d} className="py-3 text-center text-xs font-medium" style={{ color: 'rgba(100,116,139,0.5)' }}>{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {Array.from({ length: calStartDay }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-24 p-2" style={{ borderRight: '1px solid rgba(59,130,246,0.04)', borderBottom: '1px solid rgba(59,130,246,0.04)' }} />
            ))}
            {calDays.map(day => {
              const dayPieces = byDay(day);
              const today = isToday(day);
              return (
                <div key={day.toISOString()} className="min-h-24 p-2 transition-colors"
                  style={{ borderRight: '1px solid rgba(59,130,246,0.04)', borderBottom: '1px solid rgba(59,130,246,0.04)', background: today ? 'rgba(59,130,246,0.04)' : 'transparent' }}
                  onMouseEnter={e => (e.currentTarget.style.background = today ? 'rgba(59,130,246,0.07)' : 'rgba(255,255,255,0.01)')}
                  onMouseLeave={e => (e.currentTarget.style.background = today ? 'rgba(59,130,246,0.04)' : 'transparent')}>
                  <p className="text-xs font-medium mb-1.5 w-6 h-6 flex items-center justify-center rounded-full"
                    style={{ color: today ? '#fff' : 'rgba(148,163,184,0.6)', background: today ? '#3b82f6' : 'transparent' }}>
                    {format(day, 'd')}
                  </p>
                  <div className="space-y-1">
                    {dayPieces.slice(0, 3).map(p => {
                      const color = STATUS_CONFIG[p.status]?.color || '#94a3b8';
                      return (
                        <div key={p.id} onClick={() => openDetail(p)}
                          className="flex items-center gap-1 px-1.5 py-0.5 rounded cursor-pointer text-[10px] truncate transition-opacity hover:opacity-80"
                          style={{ background: `${color}15`, border: `1px solid ${color}25`, color }}>
                          <div className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: color }} />
                          {p.title}
                        </div>
                      );
                    })}
                    {dayPieces.length > 3 && (
                      <p className="text-[10px] px-1" style={{ color: 'rgba(100,116,139,0.4)' }}>+{dayPieces.length - 3} mais</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {modal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4 animate-fade"
          style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)' }}>
          <div className="modal-card w-full max-w-lg animate-fade-up">
            <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid rgba(59,130,246,0.1)' }}>
              <div>
                <p className="section-label mb-0.5">{editing ? 'Editar' : 'Nova'}</p>
                <h2 className="text-lg font-light text-white">{editing ? editing.title : 'Cadastrar Peça'}</h2>
              </div>
              <button onClick={() => setModal(false)} className="p-1.5 rounded-lg transition-colors"
                style={{ color: 'rgba(100,116,139,0.6)' }}><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
              <div>
                <label className="label-dark">Cliente *</label>
                <select value={form.agency_client_id} onChange={e => setForm({ ...form, agency_client_id: e.target.value })} className="input-dark" style={{ cursor: 'pointer' }}>
                  <option value="">Selecione o cliente</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label-dark">Título *</label>
                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="input-dark" placeholder="Ex: Post produto lançamento" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-dark">Tipo</label>
                  <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="input-dark" style={{ cursor: 'pointer' }}>
                    {TYPES.map(t => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label-dark">Data prevista</label>
                  <input type="date" value={form.scheduled_date} onChange={e => setForm({ ...form, scheduled_date: e.target.value })} className="input-dark" />
                </div>
              </div>
              <div>
                <label className="label-dark">URL da mídia</label>
                <input value={form.media_url} onChange={e => setForm({ ...form, media_url: e.target.value })} className="input-dark" placeholder="Link da imagem ou vídeo (Drive, Dropbox…)" />
              </div>
              <div>
                <label className="label-dark">Legenda</label>
                <textarea value={form.caption} onChange={e => setForm({ ...form, caption: e.target.value })} rows={3} className="input-dark resize-none" placeholder="Texto do post…" />
              </div>
              <div>
                <label className="label-dark">Objetivo estratégico</label>
                <input value={form.objective} onChange={e => setForm({ ...form, objective: e.target.value })} className="input-dark" placeholder="Ex: Gerar leads, aumentar seguidores, lançamento" />
              </div>
              <div>
                <label className="label-dark">Status inicial</label>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as ContentStatus })} className="input-dark" style={{ cursor: 'pointer' }}>
                  {STATUS_ORDER.map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={() => setModal(false)} className="btn-ghost flex-1 justify-center">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 justify-center">
                {saving ? 'Salvando…' : editing ? 'Salvar' : 'Criar Peça'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail panel */}
      {detail && (
        <div className="fixed inset-0 flex items-end sm:items-center justify-end z-50 animate-fade"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
          onClick={() => setDetail(null)}>
          <div className="h-full sm:h-screen w-full max-w-md overflow-y-auto animate-fade-up"
            style={{ background: '#07071a', borderLeft: '1px solid rgba(59,130,246,0.12)', boxShadow: '-20px 0 60px rgba(0,0,0,0.6)' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(59,130,246,0.08)' }}>
              <span className="badge badge-slate">{detail.client_name}</span>
              <button onClick={() => setDetail(null)} style={{ color: 'rgba(100,116,139,0.5)' }}><X size={18} /></button>
            </div>
            <div className="p-5 space-y-5">
              {detail.media_url && (
                <img src={detail.media_url} alt={detail.title} className="w-full rounded-xl object-cover max-h-64"
                  style={{ border: '1px solid rgba(59,130,246,0.12)' }} />
              )}
              <div>
                <h2 className="text-lg font-medium text-white mb-1">{detail.title}</h2>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="badge badge-slate">{TYPE_LABEL[detail.type]}</span>
                  {detail.scheduled_date && (
                    <span className="flex items-center gap-1 text-xs" style={{ color: 'rgba(100,116,139,0.6)' }}>
                      <Calendar size={10} />{format(new Date(detail.scheduled_date), "d MMM yyyy", { locale: ptBR })}
                    </span>
                  )}
                </div>
              </div>
              <div>
                <p className="label-dark mb-2">Status</p>
                <StatusDropdown current={detail.status} onChange={s => handleStatus(detail.id, s)} />
              </div>
              {detail.objective && (
                <div className="rounded-xl px-4 py-3" style={{ background: 'rgba(59,130,246,0.04)', border: '1px solid rgba(59,130,246,0.1)' }}>
                  <p className="text-xs mb-1" style={{ color: 'rgba(59,130,246,0.6)' }}>Objetivo estratégico</p>
                  <p className="text-sm text-white">{detail.objective}</p>
                </div>
              )}
              {detail.caption && (
                <div>
                  <p className="label-dark mb-2">Legenda</p>
                  <p className="text-sm whitespace-pre-wrap" style={{ color: 'rgba(148,163,184,0.8)', lineHeight: '1.6' }}>{detail.caption}</p>
                </div>
              )}
              <div>
                <p className="label-dark mb-3 flex items-center gap-2"><MessageSquare size={12} />Comentários</p>
                <div className="space-y-3 mb-4 max-h-48 overflow-y-auto">
                  {(detail.comments || []).length === 0 ? (
                    <p className="text-xs" style={{ color: 'rgba(100,116,139,0.4)' }}>Nenhum comentário ainda</p>
                  ) : detail.comments!.map(c => (
                    <div key={c.id} className="rounded-xl px-3 py-2.5"
                      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-white">{c.user_name}</span>
                        <span className="text-[10px]" style={{ color: 'rgba(100,116,139,0.4)' }}>
                          {format(new Date(c.created_at), "d MMM HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                      <p className="text-xs" style={{ color: 'rgba(148,163,184,0.7)' }}>{c.message}</p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input value={comment} onChange={e => setComment(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleComment()}
                    placeholder="Adicionar comentário…" className="input-dark flex-1 text-sm py-2" />
                  <button onClick={handleComment} disabled={sendingComment || !comment.trim()}
                    className="btn-primary px-3 py-2 flex-shrink-0"><Send size={13} /></button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleting && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4 animate-fade"
          style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)' }}>
          <div className="modal-card w-full max-w-sm p-6 animate-fade-up">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)' }}>
              <Trash2 size={16} className="icon-red" />
            </div>
            <h3 className="text-white font-medium mb-2">Excluir peça?</h3>
            <p className="text-sm mb-5" style={{ color: 'rgba(148,163,184,0.55)' }}>Comentários e histórico serão removidos.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleting(null)} className="btn-ghost flex-1 justify-center">Cancelar</button>
              <button onClick={() => handleDelete(deleting)} className="btn-danger flex-1 justify-center">Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
