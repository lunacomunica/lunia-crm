import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, CheckCircle2, Clock, RotateCcw, FileImage, Grid3x3, Smartphone, X, Send, Calendar, MessageSquare, Clapperboard, Copy } from 'lucide-react';
import { contentApi, agencyClientsApi } from '../../api/client';
import { ContentPiece, ContentStatus, AgencyClient } from '../../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '../../context/AuthContext';

const STATUS_OVERLAY: Partial<Record<ContentStatus, { icon: any; color: string; bg: string; label: string }>> = {
  aguardando_aprovacao: { icon: Clock,        color: '#f59e0b', bg: 'rgba(245,158,11,0.75)',  label: 'Ag. aprovação' },
  ajuste_solicitado:    { icon: RotateCcw,    color: '#f97316', bg: 'rgba(249,115,22,0.75)',  label: 'Ajuste pedido' },
  em_criacao:           { icon: FileImage,    color: '#94a3b8', bg: 'rgba(5,5,15,0.7)',       label: 'Em criação' },
  em_revisao:           { icon: Eye,          color: '#60a5fa', bg: 'rgba(59,130,246,0.65)',  label: 'Em revisão' },
  agendado:             { icon: Calendar,     color: '#a78bfa', bg: 'rgba(167,139,250,0.65)', label: 'Agendado' },
};

const TYPE_LABEL: Record<string, string> = { post: 'Post', reels: 'Reels', story: 'Story', carrossel: 'Carrossel' };

export default function FeedPreview() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isPreview = user?.role === 'owner' || user?.role === 'manager';

  const [client, setClient] = useState<AgencyClient | null>(null);
  const [pieces, setPieces] = useState<ContentPiece[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'approved'>('all');
  const [phoneFrame, setPhoneFrame] = useState(true);
  const [detail, setDetail] = useState<ContentPiece | null>(null);
  const [comment, setComment] = useState('');
  const [sendingComment, setSendingComment] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      agencyClientsApi.get(Number(clientId)),
      contentApi.list({ client_id: clientId! }),
    ]).then(([cr, pr]) => {
      setClient(cr.data);
      setPieces(pr.data);
      setLoading(false);
    });
  }, [clientId]);

  const openDetail = async (p: ContentPiece) => {
    const r = await contentApi.get(p.id);
    setDetail(r.data);
  };

  const handleComment = async () => {
    if (!comment.trim() || !detail) return;
    setSendingComment(true);
    const r = await contentApi.addComment(detail.id, comment);
    setDetail(prev => prev ? { ...prev, comments: [...(prev.comments || []), r.data] } : prev);
    setComment('');
    setSendingComment(false);
  };

  const displayed = pieces.filter(p =>
    filter === 'all'
      ? !['publicado'].includes(p.status) || true
      : ['aprovado', 'agendado', 'publicado'].includes(p.status)
  ).slice(0, 30);

  const stats = {
    total: pieces.length,
    approved: pieces.filter(p => ['aprovado', 'agendado', 'publicado'].includes(p.status)).length,
    pending: pieces.filter(p => p.status === 'aguardando_aprovacao').length,
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#05050f' }}>
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
        style={{ borderColor: 'rgba(59,130,246,0.3)', borderTopColor: '#3b82f6' }} />
    </div>
  );

  const FeedGrid = () => (
    <div>
      {/* Instagram profile mock */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center gap-3 mb-3">
          {client?.logo ? (
            <img src={client.logo} alt={client.name} className="w-14 h-14 rounded-full object-cover"
              style={{ border: '2px solid rgba(255,255,255,0.1)' }} />
          ) : (
            <div className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold"
              style={{ background: 'linear-gradient(135deg,#f59e0b,#ec4899,#8b5cf6)', padding: '2px' }}>
              <div className="w-full h-full rounded-full flex items-center justify-center"
                style={{ background: '#111' }}>
                {client?.name.charAt(0).toUpperCase()}
              </div>
            </div>
          )}
          <div className="flex-1">
            <p className="text-sm font-semibold text-white">{client?.instagram_handle ? `@${client.instagram_handle}` : client?.name}</p>
            {client?.segment && <p className="text-xs" style={{ color: 'rgba(148,163,184,0.6)' }}>{client.segment}</p>}
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 text-center mb-3 py-2 rounded-xl"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
          {[
            { label: 'Peças', value: stats.total },
            { label: 'Aprovadas', value: stats.approved },
            { label: 'Pendentes', value: stats.pending },
          ].map(s => (
            <div key={s.label}>
              <p className="text-sm font-bold text-white">{s.value}</p>
              <p className="text-[10px]" style={{ color: 'rgba(100,116,139,0.5)' }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <button onClick={() => setFilter('all')}
            className="flex-1 py-2 text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
            style={{ color: filter === 'all' ? '#fff' : 'rgba(100,116,139,0.5)', borderBottom: filter === 'all' ? '2px solid #fff' : '2px solid transparent' }}>
            <Grid3x3 size={11} /> Tudo
          </button>
          <button onClick={() => setFilter('approved')}
            className="flex-1 py-2 text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
            style={{ color: filter === 'approved' ? '#34d399' : 'rgba(100,116,139,0.5)', borderBottom: filter === 'approved' ? '2px solid #34d399' : '2px solid transparent' }}>
            <CheckCircle2 size={11} /> Aprovados
          </button>
        </div>
      </div>

      {/* 3-column grid */}
      <div className="grid grid-cols-3 gap-0.5">
        {displayed.length === 0 ? (
          <div className="col-span-3 py-12 text-center">
            <p className="text-xs" style={{ color: 'rgba(100,116,139,0.4)' }}>Nenhuma peça para exibir</p>
          </div>
        ) : displayed.map(p => {
          const overlay = STATUS_OVERLAY[p.status];
          const isPublished = p.status === 'publicado';
          return (
            <button key={p.id} onClick={() => openDetail(p)} className="relative overflow-hidden group" style={{ aspectRatio: '1080/1350' }}
              style={{ background: 'rgba(255,255,255,0.03)' }}>
              {p.media_url ? (
                <img src={p.media_url} alt={p.title}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  style={{ opacity: overlay ? 0.65 : 1 }} />
              ) : (
                <div className="w-full h-full flex items-center justify-center"
                  style={{ background: 'rgba(59,130,246,0.05)' }}>
                  <FileImage size={20} style={{ color: 'rgba(59,130,246,0.2)' }} />
                </div>
              )}

              {/* Status overlay */}
              {overlay && !isPublished && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1"
                  style={{ background: overlay.bg }}>
                  <overlay.icon size={16} style={{ color: overlay.color }} />
                  <span className="text-[9px] font-bold" style={{ color: overlay.color }}>{overlay.label}</span>
                </div>
              )}

              {/* Type icon (Instagram style) — top right */}
              {p.type === 'carrossel' && <Copy size={16} className="absolute top-2 right-2 drop-shadow-md" style={{ color: '#fff' }} />}
              {p.type === 'reels' && <Clapperboard size={16} className="absolute top-2 right-2 drop-shadow-md" style={{ color: '#fff' }} />}

              {/* Hover date */}
              {p.scheduled_date && (
                <div className="absolute inset-0 flex items-end justify-center pb-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%)' }}>
                  <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.8)' }}>
                    {format(new Date(p.scheduled_date), "d MMM", { locale: ptBR })}
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(59,130,246,0.05) 0%, #05050f 60%)' }}>
      {/* Header */}
      <div className="px-8 py-5 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(59,130,246,0.08)' }}>
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(isPreview ? `/marketing/portal/${clientId}` : -1 as any)}
            className="flex items-center gap-2 text-sm transition-opacity hover:opacity-70"
            style={{ color: 'rgba(100,116,139,0.6)' }}>
            <ArrowLeft size={15} /> Voltar
          </button>
          <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.06)' }} />
          <div>
            <p className="section-label">Marketing · {client?.name}</p>
            <h1 className="text-lg font-light text-white">Prévia do Feed</h1>
          </div>
        </div>
        <button onClick={() => setPhoneFrame(f => !f)}
          className="flex items-center gap-2 btn-ghost text-xs px-3 py-2"
          style={{ color: phoneFrame ? '#60a5fa' : 'rgba(100,116,139,0.6)' }}>
          <Smartphone size={13} /> {phoneFrame ? 'Sem moldura' : 'Com moldura'}
        </button>
      </div>

      {/* Feed */}
      <div className="flex justify-center px-8 py-10">
        {phoneFrame ? (
          <div className="relative" style={{ width: '375px' }}>
            {/* Phone shell */}
            <div className="rounded-[44px] overflow-hidden"
              style={{ background: '#000', border: '10px solid #1a1a2e', boxShadow: '0 40px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.06), inset 0 0 0 1px rgba(255,255,255,0.04)' }}>
              {/* Status bar mock */}
              <div className="flex items-center justify-between px-6 pt-3 pb-1"
                style={{ background: '#000' }}>
                <span className="text-[11px] font-semibold text-white">9:41</span>
                <div className="w-24 h-5 rounded-full" style={{ background: '#000', border: '1px solid rgba(255,255,255,0.1)' }} />
                <div className="flex items-center gap-1">
                  {[3, 4, 5].map(w => <div key={w} className="rounded-sm" style={{ width: '3px', height: `${w * 2}px`, background: 'white', opacity: 0.8 }} />)}
                  <div className="ml-1 text-[11px] font-semibold text-white">100%</div>
                </div>
              </div>
              {/* Instagram header */}
              <div className="flex items-center justify-between px-4 py-3" style={{ background: '#000', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <span className="text-base font-bold text-white" style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>
                  {client?.instagram_handle || client?.name}
                </span>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full border border-white opacity-60" />
                  <div className="w-4 h-0.5 rounded-full bg-white opacity-60" />
                </div>
              </div>
              {/* Scrollable content */}
              <div className="overflow-y-auto" style={{ maxHeight: '680px', background: '#000' }}>
                <FeedGrid />
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-sm rounded-2xl overflow-hidden"
            style={{ background: '#000', border: '1px solid rgba(255,255,255,0.08)' }}>
            <FeedGrid />
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 justify-center pb-8 px-8">
        {Object.entries(STATUS_OVERLAY).map(([status, cfg]) => (
          <span key={status} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full"
            style={{ color: cfg.color, background: `${cfg.color}10`, border: `1px solid ${cfg.color}25` }}>
            <cfg.icon size={10} /> {cfg.label}
          </span>
        ))}
        <span className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full"
          style={{ color: '#10b981', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)' }}>
          <CheckCircle2 size={10} /> Publicado
        </span>
      </div>

      {/* Detail panel */}
      {detail && (
        <div className="fixed inset-0 flex items-center justify-end z-50 animate-fade"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
          onClick={() => setDetail(null)}>
          <div className="h-full w-full max-w-md overflow-y-auto"
            style={{ background: '#07071a', borderLeft: '1px solid rgba(59,130,246,0.12)', boxShadow: '-20px 0 60px rgba(0,0,0,0.7)' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(59,130,246,0.08)' }}>
              <span className="text-sm font-medium text-white">{detail.title}</span>
              <button onClick={() => setDetail(null)} style={{ color: 'rgba(100,116,139,0.5)' }}><X size={18} /></button>
            </div>
            <div className="p-5 space-y-5">
              {detail.media_url && (
                <img src={detail.media_url} alt={detail.title} className="w-full rounded-xl object-cover"
                  style={{ border: '1px solid rgba(59,130,246,0.1)', maxHeight: '300px' }} />
              )}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="badge badge-slate">{TYPE_LABEL[detail.type]}</span>
                {detail.scheduled_date && (
                  <span className="flex items-center gap-1 text-xs" style={{ color: 'rgba(100,116,139,0.5)' }}>
                    <Calendar size={10} />{format(new Date(detail.scheduled_date), "d 'de' MMMM", { locale: ptBR })}
                  </span>
                )}
              </div>
              {detail.objective && (
                <div className="rounded-xl px-4 py-3" style={{ background: 'rgba(59,130,246,0.04)', border: '1px solid rgba(59,130,246,0.1)' }}>
                  <p className="text-xs mb-1" style={{ color: 'rgba(59,130,246,0.6)' }}>Objetivo</p>
                  <p className="text-sm text-white">{detail.objective}</p>
                </div>
              )}
              {detail.caption && (
                <div>
                  <p className="label-dark mb-2">Legenda</p>
                  <p className="text-sm whitespace-pre-wrap" style={{ color: 'rgba(148,163,184,0.8)', lineHeight: '1.7' }}>{detail.caption}</p>
                </div>
              )}
              <div>
                <p className="label-dark mb-3 flex items-center gap-2"><MessageSquare size={12} />Comentários</p>
                <div className="space-y-3 mb-4 max-h-40 overflow-y-auto">
                  {!(detail.comments?.length) ? (
                    <p className="text-xs" style={{ color: 'rgba(100,116,139,0.4)' }}>Nenhum comentário</p>
                  ) : detail.comments!.map(c => (
                    <div key={c.id} className="rounded-xl px-3 py-2.5"
                      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div className="flex justify-between mb-1">
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
                    onKeyDown={e => e.key === 'Enter' && handleComment()}
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
