import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, RotateCcw, MessageSquare, Calendar, X, Send, Eye, ArrowLeft, FileImage, Clock } from 'lucide-react';
import { contentApi, agencyClientsApi } from '../../api/client';
import { ContentPiece, ContentStatus, AgencyClient } from '../../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '../../context/AuthContext';

const STATUS_CONFIG: Record<ContentStatus, { label: string; color: string; bg: string; border: string }> = {
  em_criacao:           { label: 'Em Criação',        color: '#94a3b8', bg: 'rgba(148,163,184,0.08)', border: 'rgba(148,163,184,0.15)' },
  em_revisao:           { label: 'Em Revisão',        color: '#60a5fa', bg: 'rgba(59,130,246,0.08)',  border: 'rgba(59,130,246,0.15)'  },
  aguardando_aprovacao: { label: 'Aguardando Aprovação', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)' },
  aprovado:             { label: 'Aprovado',          color: '#34d399', bg: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.2)'  },
  ajuste_solicitado:    { label: 'Ajuste Solicitado', color: '#f97316', bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.2)'  },
  agendado:             { label: 'Agendado',          color: '#a78bfa', bg: 'rgba(167,139,250,0.08)',border: 'rgba(167,139,250,0.2)' },
  publicado:            { label: 'Publicado',         color: '#10b981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)'  },
};

const TYPE_LABEL: Record<string, string> = { post: 'Post', reels: 'Reels', story: 'Story', carrossel: 'Carrossel' };

function StatusBadge({ status }: { status: ContentStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className="text-xs font-medium px-2.5 py-1 rounded-full"
      style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}>
      {cfg.label}
    </span>
  );
}

export default function ClientPortal() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isPreview = user?.role === 'admin' || user?.role === 'user';

  const [client, setClient] = useState<AgencyClient | null>(null);
  const [pieces, setPieces] = useState<ContentPiece[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<ContentPiece | null>(null);
  const [adjustModal, setAdjustModal] = useState(false);
  const [adjustComment, setAdjustComment] = useState('');
  const [comment, setComment] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const [acting, setActing] = useState(false);

  const load = async () => {
    setLoading(true);
    const [clientRes, contentRes] = await Promise.all([
      agencyClientsApi.get(Number(clientId)),
      contentApi.list({ client_id: clientId! }),
    ]);
    setClient(clientRes.data);
    setPieces(contentRes.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [clientId]);

  const openDetail = async (p: ContentPiece) => {
    const r = await contentApi.get(p.id);
    setDetail(r.data);
  };

  const handleApprove = async () => {
    if (!detail || acting) return;
    setActing(true);
    await contentApi.updateStatus(detail.id, 'aprovado');
    setPieces(prev => prev.map(p => p.id === detail.id ? { ...p, status: 'aprovado' } : p));
    setDetail(prev => prev ? { ...prev, status: 'aprovado' } : prev);
    setActing(false);
  };

  const handleRequestAdjust = async () => {
    if (!detail || !adjustComment.trim() || acting) return;
    setActing(true);
    await contentApi.updateStatus(detail.id, 'ajuste_solicitado', adjustComment);
    const updated = await contentApi.get(detail.id);
    setPieces(prev => prev.map(p => p.id === detail.id ? { ...p, status: 'ajuste_solicitado' } : p));
    setDetail(updated.data);
    setAdjustModal(false);
    setAdjustComment('');
    setActing(false);
  };

  const handleComment = async () => {
    if (!comment.trim() || !detail) return;
    setSendingComment(true);
    const r = await contentApi.addComment(detail.id, comment);
    setDetail(prev => prev ? { ...prev, comments: [...(prev.comments || []), r.data] } : prev);
    setComment('');
    setSendingComment(false);
  };

  const pendingCount = pieces.filter(p => p.status === 'aguardando_aprovacao').length;

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#05050f' }}>
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
        style={{ borderColor: 'rgba(59,130,246,0.3)', borderTopColor: '#3b82f6' }} />
    </div>
  );

  return (
    <div className="min-h-screen" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(59,130,246,0.06) 0%, #05050f 60%)' }}>
      {/* Preview banner */}
      {isPreview && (
        <div className="flex items-center justify-between px-6 py-2.5"
          style={{ background: 'rgba(245,158,11,0.1)', borderBottom: '1px solid rgba(245,158,11,0.2)' }}>
          <div className="flex items-center gap-2">
            <Eye size={13} style={{ color: '#f59e0b' }} />
            <span className="text-xs font-medium" style={{ color: '#f59e0b' }}>
              Modo preview — você está visualizando como o cliente vê este portal
            </span>
          </div>
          <button onClick={() => navigate('/marketing/clients')}
            className="flex items-center gap-1.5 text-xs transition-opacity hover:opacity-70"
            style={{ color: '#f59e0b' }}>
            <ArrowLeft size={12} /> Voltar para clientes
          </button>
        </div>
      )}

      {/* Header */}
      <div className="px-8 py-6" style={{ borderBottom: '1px solid rgba(59,130,246,0.08)' }}>
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            {client?.logo ? (
              <img src={client.logo} alt={client.name} className="w-12 h-12 rounded-xl object-cover" />
            ) : (
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-lg font-bold"
                style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)' }}>
                {client?.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-xl font-semibold text-white">{client?.name}</h1>
              <p className="text-sm" style={{ color: 'rgba(100,116,139,0.6)' }}>Portal de Aprovação de Conteúdo</p>
            </div>
          </div>
          {pendingCount > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl"
              style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
              <Clock size={14} style={{ color: '#f59e0b' }} />
              <span className="text-sm font-medium" style={{ color: '#f59e0b' }}>
                {pendingCount} peça{pendingCount > 1 ? 's' : ''} aguardando aprovação
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-8 py-8">
        {pieces.length === 0 ? (
          <div className="text-center py-24">
            <FileImage size={40} className="mx-auto mb-4" style={{ color: 'rgba(100,116,139,0.2)' }} />
            <p style={{ color: 'rgba(100,116,139,0.5)' }}>Nenhum conteúdo disponível ainda.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pieces.map(p => (
              <div key={p.id} onClick={() => openDetail(p)}
                className="rounded-2xl overflow-hidden cursor-pointer group transition-all duration-200"
                style={{ background: 'linear-gradient(145deg,#0c0c28,#0e0e2e)', border: p.status === 'aguardando_aprovacao' ? '1px solid rgba(245,158,11,0.3)' : '1px solid rgba(59,130,246,0.1)', boxShadow: p.status === 'aguardando_aprovacao' ? '0 0 20px rgba(245,158,11,0.08)' : 'none' }}>
                {/* Thumbnail */}
                <div className="relative aspect-square overflow-hidden"
                  style={{ background: 'rgba(59,130,246,0.04)' }}>
                  {p.media_url ? (
                    <img src={p.media_url} alt={p.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                      <FileImage size={32} style={{ color: 'rgba(59,130,246,0.2)' }} />
                      <span className="text-xs" style={{ color: 'rgba(100,116,139,0.4)' }}>Sem imagem</span>
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-md"
                      style={{ background: 'rgba(0,0,0,0.6)', color: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(4px)' }}>
                      {TYPE_LABEL[p.type] || p.type}
                    </span>
                  </div>
                </div>

                {/* Info */}
                <div className="p-4">
                  <p className="text-sm font-medium text-white mb-1 truncate">{p.title}</p>
                  {p.scheduled_date && (
                    <p className="flex items-center gap-1 text-xs mb-3" style={{ color: 'rgba(100,116,139,0.55)' }}>
                      <Calendar size={10} />{format(new Date(p.scheduled_date), "d 'de' MMM", { locale: ptBR })}
                    </p>
                  )}
                  <StatusBadge status={p.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail panel */}
      {detail && (
        <div className="fixed inset-0 flex items-center justify-end z-50 animate-fade"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
          onClick={() => { setDetail(null); setAdjustModal(false); }}>
          <div className="h-full w-full max-w-lg overflow-y-auto animate-fade-up"
            style={{ background: '#07071a', borderLeft: '1px solid rgba(59,130,246,0.12)', boxShadow: '-20px 0 60px rgba(0,0,0,0.7)' }}
            onClick={e => e.stopPropagation()}>

            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(59,130,246,0.08)' }}>
              <StatusBadge status={detail.status} />
              <button onClick={() => setDetail(null)} style={{ color: 'rgba(100,116,139,0.5)' }}
                className="p-1.5 rounded-lg hover:text-white transition-colors"><X size={18} /></button>
            </div>

            <div className="p-6 space-y-6">
              {detail.media_url && (
                <img src={detail.media_url} alt={detail.title} className="w-full rounded-2xl object-cover"
                  style={{ border: '1px solid rgba(59,130,246,0.1)', maxHeight: '320px' }} />
              )}

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="badge badge-slate">{TYPE_LABEL[detail.type]}</span>
                  {detail.scheduled_date && (
                    <span className="flex items-center gap-1 text-xs" style={{ color: 'rgba(100,116,139,0.5)' }}>
                      <Calendar size={10} />{format(new Date(detail.scheduled_date), "d 'de' MMMM", { locale: ptBR })}
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-semibold text-white mt-2">{detail.title}</h2>
              </div>

              {detail.objective && (
                <div className="rounded-xl px-4 py-3" style={{ background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.12)' }}>
                  <p className="text-xs mb-1" style={{ color: 'rgba(59,130,246,0.6)' }}>Objetivo estratégico</p>
                  <p className="text-sm text-white">{detail.objective}</p>
                </div>
              )}

              {detail.caption && (
                <div>
                  <p className="label-dark mb-2">Legenda do post</p>
                  <div className="rounded-xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <p className="text-sm whitespace-pre-wrap" style={{ color: 'rgba(148,163,184,0.85)', lineHeight: '1.7' }}>{detail.caption}</p>
                  </div>
                </div>
              )}

              {/* Approval actions */}
              {detail.status === 'aguardando_aprovacao' && (
                <div className="space-y-3">
                  <p className="label-dark">Sua decisão</p>
                  <button onClick={handleApprove} disabled={acting}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all"
                    style={{ background: 'linear-gradient(135deg,rgba(52,211,153,0.15),rgba(16,185,129,0.1))', border: '1px solid rgba(52,211,153,0.3)', color: '#34d399' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'linear-gradient(135deg,rgba(52,211,153,0.25),rgba(16,185,129,0.18))')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'linear-gradient(135deg,rgba(52,211,153,0.15),rgba(16,185,129,0.1))')}>
                    <CheckCircle2 size={18} /> {acting ? 'Aprovando…' : 'Aprovar esta peça'}
                  </button>
                  <button onClick={() => setAdjustModal(true)} disabled={acting}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all"
                    style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.25)', color: '#f97316' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(249,115,22,0.15)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(249,115,22,0.08)')}>
                    <RotateCcw size={16} /> Solicitar ajuste
                  </button>
                </div>
              )}

              {detail.status === 'aprovado' && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl"
                  style={{ background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.15)' }}>
                  <CheckCircle2 size={16} style={{ color: '#34d399' }} />
                  <span className="text-sm" style={{ color: '#34d399' }}>Você aprovou esta peça</span>
                </div>
              )}

              {detail.status === 'ajuste_solicitado' && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl"
                  style={{ background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.15)' }}>
                  <RotateCcw size={16} style={{ color: '#f97316' }} />
                  <span className="text-sm" style={{ color: '#f97316' }}>Ajuste solicitado ao time</span>
                </div>
              )}

              {/* Adjust modal inline */}
              {adjustModal && (
                <div className="rounded-xl p-4 space-y-3" style={{ background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.2)' }}>
                  <p className="text-sm font-medium" style={{ color: '#f97316' }}>Descreva o ajuste necessário</p>
                  <textarea value={adjustComment} onChange={e => setAdjustComment(e.target.value)}
                    rows={3} placeholder="Ex: Mudar a cor do texto, ajustar a copy…"
                    className="input-dark resize-none text-sm w-full" />
                  <div className="flex gap-2">
                    <button onClick={() => { setAdjustModal(false); setAdjustComment(''); }} className="btn-ghost flex-1 justify-center text-sm py-2">Cancelar</button>
                    <button onClick={handleRequestAdjust} disabled={!adjustComment.trim() || acting}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium transition-all"
                      style={{ background: 'rgba(249,115,22,0.15)', border: '1px solid rgba(249,115,22,0.3)', color: '#f97316' }}>
                      <Send size={13} /> {acting ? 'Enviando…' : 'Enviar'}
                    </button>
                  </div>
                </div>
              )}

              {/* Comments */}
              <div>
                <p className="label-dark mb-3 flex items-center gap-2"><MessageSquare size={12} />Comentários</p>
                <div className="space-y-3 mb-4 max-h-52 overflow-y-auto">
                  {!(detail.comments?.length) ? (
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
                      <p className="text-xs" style={{ color: 'rgba(148,163,184,0.7)', lineHeight: '1.5' }}>{c.message}</p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input value={comment} onChange={e => setComment(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleComment()}
                    placeholder="Comentar…" className="input-dark flex-1 text-sm py-2" />
                  <button onClick={handleComment} disabled={sendingComment || !comment.trim()}
                    className="btn-primary px-3 flex-shrink-0"><Send size={13} /></button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
