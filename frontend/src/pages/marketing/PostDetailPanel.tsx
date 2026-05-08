import { useEffect, useState, useRef } from 'react';
import { X, Trash2, ChevronDown, FileImage, Calendar, Clock, CheckCircle2, RotateCcw, Send, Eye, Plus, Zap, Check, Upload, ChevronLeft, ChevronRight, Play, Image as ImageIcon, Video } from 'lucide-react';
import { contentApi, usersApi, uploadApi } from '../../api/client';
import { ContentPiece, ContentStatus } from '../../types';

const STAGES = [
  { stage: 'copy',    label: 'Copy' },
  { stage: 'design',  label: 'Design' },
  { stage: 'edicao',  label: 'Edição' },
  { stage: 'revisao', label: 'Revisão' },
];

const OBJECTIVES = [
  'Aumentar seguidores',
  'Gerar leads',
  'Engajamento',
  'Lançamento',
  'Reconhecimento de marca',
  'Venda direta',
  'Educativo',
  'Institucional',
];

const POST_TYPES = [
  { value: 'estatico',  label: 'Estático' },
  { value: 'carrossel', label: 'Carrossel' },
  { value: 'reels',     label: 'Reels' },
];

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

const TASK_STATUS_CFG: Record<string, { label: string; color: string }> = {
  a_fazer:      { label: 'A fazer',      color: '#94a3b8' },
  em_andamento: { label: 'Em andamento', color: '#60a5fa' },
  concluida:    { label: 'Concluída',    color: '#34d399' },
  pausada:      { label: 'Pausada',      color: '#f59e0b' },
};

interface MediaFile { url: string; type: 'image' | 'video'; name: string; }

interface Props {
  post: ContentPiece;
  onClose: () => void;
  onUpdated: (p: ContentPiece) => void;
  onDeleted: () => void;
}

function StatusDropdown({ current, onChange }: { current: ContentStatus; onChange: (s: ContentStatus) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
  }, []);
  const cfg = STATUS_CONFIG[current];
  const Icon = cfg.icon;
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-opacity hover:opacity-80"
        style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}>
        <Icon size={10} />{cfg.label}<ChevronDown size={10} />
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 rounded-xl overflow-hidden min-w-44"
          style={{ background: '#0d0d1f', border: '1px solid rgba(59,130,246,0.2)', boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}>
          {STATUS_ORDER.map(s => {
            const c = STATUS_CONFIG[s]; const I = c.icon;
            return (
              <button key={s} onClick={() => { onChange(s); setOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium transition-colors"
                style={{ color: c.color, background: s === current ? c.bg : 'transparent' }}
                onMouseEnter={e => (e.currentTarget.style.background = c.bg)}
                onMouseLeave={e => (e.currentTarget.style.background = s === current ? c.bg : 'transparent')}>
                <I size={10} />{c.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Carousel viewer ──────────────────────────────────────────────────────────
function CarouselViewer({ images, onRemove }: { images: MediaFile[]; onRemove: (i: number) => void }) {
  const [idx, setIdx] = useState(0);
  if (!images.length) return null;
  const prev = () => setIdx(i => Math.max(0, i - 1));
  const next = () => setIdx(i => Math.min(images.length - 1, i + 1));
  return (
    <div className="relative rounded-2xl overflow-hidden" style={{ aspectRatio: '1', background: '#000' }}>
      <img src={images[idx].url} alt="" className="w-full h-full object-cover" />
      {/* Remove button */}
      <button onClick={() => onRemove(idx)}
        className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center"
        style={{ background: 'rgba(0,0,0,0.65)', color: 'white' }}>
        <X size={12} />
      </button>
      {/* Position badge */}
      <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold"
        style={{ background: 'rgba(0,0,0,0.55)', color: 'white' }}>
        {idx + 1}/{images.length}
      </div>
      {/* Nav arrows */}
      {idx > 0 && (
        <button onClick={prev} className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.55)', color: 'white' }}>
          <ChevronLeft size={14} />
        </button>
      )}
      {idx < images.length - 1 && (
        <button onClick={next} className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.55)', color: 'white' }}>
          <ChevronRight size={14} />
        </button>
      )}
      {/* Dots */}
      {images.length > 1 && (
        <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
          {images.map((_, i) => (
            <button key={i} onClick={() => setIdx(i)}
              className="rounded-full transition-all"
              style={{ width: i === idx ? 14 : 6, height: 6, background: i === idx ? 'white' : 'rgba(255,255,255,0.45)' }} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Reels viewer ─────────────────────────────────────────────────────────────
function ReelsViewer({ video, cover, onRemoveVideo, onRemoveCover }: { video: MediaFile; cover?: MediaFile; onRemoveVideo: () => void; onRemoveCover: () => void }) {
  return (
    <div className="space-y-2">
      {/* Video */}
      <div className="relative rounded-2xl overflow-hidden" style={{ aspectRatio: '9/16', maxHeight: 360, background: '#000' }}>
        <video src={video.url} controls poster={cover?.url}
          className="w-full h-full object-contain"
          style={{ maxHeight: 360 }} />
        <button onClick={onRemoveVideo}
          className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.65)', color: 'white' }}>
          <X size={12} />
        </button>
      </div>
      {/* Cover */}
      {cover && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <img src={cover.url} alt="capa" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-white truncate">{cover.name}</p>
            <p className="text-[10px]" style={{ color: 'rgba(100,116,139,0.5)' }}>Capa do Reels</p>
          </div>
          <button onClick={onRemoveCover} style={{ color: 'rgba(100,116,139,0.5)' }}><X size={12} /></button>
        </div>
      )}
    </div>
  );
}

// ── Upload drop zone ──────────────────────────────────────────────────────────
function DropZone({ accept, multiple, label, icon: Icon, onFiles, uploading }: {
  accept: string; multiple: boolean; label: string; icon: any; onFiles: (files: File[]) => void; uploading: boolean;
}) {
  const [dragging, setDragging] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div
      className="rounded-xl px-4 py-5 text-center cursor-pointer transition-all"
      style={{
        border: `2px dashed ${dragging ? 'rgba(59,130,246,0.5)' : 'rgba(59,130,246,0.15)'}`,
        background: dragging ? 'rgba(59,130,246,0.06)' : 'rgba(255,255,255,0.02)',
      }}
      onClick={() => ref.current?.click()}
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => {
        e.preventDefault(); setDragging(false);
        const files = Array.from(e.dataTransfer.files).filter(f => {
          const ok = /^(image\/(jpeg|png|gif|webp)|video\/(mp4|quicktime|webm))$/.test(f.type);
          return ok;
        });
        if (files.length) onFiles(files);
      }}>
      <input ref={ref} type="file" accept={accept} multiple={multiple} className="hidden"
        onChange={e => { const files = Array.from(e.target.files || []); if (files.length) onFiles(files); e.target.value = ''; }} />
      {uploading ? (
        <div className="flex flex-col items-center gap-2">
          <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: 'rgba(59,130,246,0.3)', borderTopColor: '#3b82f6' }} />
          <p className="text-xs" style={{ color: 'rgba(100,116,139,0.5)' }}>Enviando…</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.15)' }}>
            <Icon size={16} style={{ color: '#60a5fa' }} />
          </div>
          <p className="text-xs font-medium" style={{ color: 'rgba(148,163,184,0.7)' }}>{label}</p>
          <p className="text-[10px]" style={{ color: 'rgba(100,116,139,0.4)' }}>Clique ou arraste aqui</p>
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function PostDetailPanel({ post, onClose, onUpdated, onDeleted }: Props) {
  const [form, setForm] = useState({
    title: post.title,
    type: (post.type as string) || 'estatico',
    scheduled_date: post.scheduled_date?.slice(0, 10) || '',
    status: post.status,
    caption: post.caption || '',
    objective: post.objective || '',
    copy_text: post.copy_text || '',
  });

  // Parse existing media_files, fall back to media_url for legacy posts
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>(() => {
    try {
      const parsed = JSON.parse((post as any).media_files || '[]');
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {}
    if (post.media_url) return [{ url: post.media_url, type: 'image', name: 'imagem' }];
    return [];
  });

  const [uploading, setUploading] = useState<'images' | 'video' | 'cover' | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [tasks, setTasks] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [workflowModal, setWorkflowModal] = useState(false);
  const [wfStages, setWfStages] = useState(
    STAGES.map(s => ({ ...s, active: true, assigned_to: '', due_date: '' }))
  );
  const [creatingFlow, setCreatingFlow] = useState(false);

  useEffect(() => {
    contentApi.getTasks(post.id).then(r => setTasks(r.data || []));
    usersApi.list().then(r => setUsers(r.data || []));
  }, [post.id]);

  // Derived media buckets
  const images = mediaFiles.filter(f => f.type === 'image');
  const video = mediaFiles.find(f => f.type === 'video') ?? null;
  const cover = mediaFiles.filter(f => f.type === 'image').find(
    (_, i, arr) => form.type === 'reels' && i === arr.length - 1 && arr.length > 0 && video !== null
  ) ?? null;
  // For reels: first file is video, last image is cover
  const reelsVideo = form.type === 'reels' ? mediaFiles.find(f => f.type === 'video') ?? null : null;
  const reelsCover = form.type === 'reels' ? mediaFiles.filter(f => f.type === 'image')[0] ?? null : null;
  const carouselImages = form.type !== 'reels' ? mediaFiles.filter(f => f.type === 'image') : [];

  const uploadFiles = async (files: File[], kind: 'images' | 'video' | 'cover') => {
    setUploading(kind);
    try {
      const r = await uploadApi.files(files);
      const newFiles: MediaFile[] = r.data.files;
      setMediaFiles(prev => {
        if (kind === 'video') {
          // Replace existing video, keep images
          return [...prev.filter(f => f.type === 'image'), ...newFiles];
        }
        if (kind === 'cover') {
          // For reels: add as image (shown as cover)
          return [...prev.filter(f => f.type === 'video'), ...newFiles.map(f => ({ ...f, type: 'image' as const }))];
        }
        // images: append
        return [...prev, ...newFiles.map(f => ({ ...f, type: 'image' as const }))];
      });
    } finally {
      setUploading(null);
    }
  };

  const removeMedia = (index: number) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
  };
  const removeVideoForReels = () => setMediaFiles(prev => prev.filter(f => f.type !== 'video'));
  const removeCoverForReels = () => {
    // Remove the first image (cover for reels)
    setMediaFiles(prev => {
      const imgIdx = prev.findIndex(f => f.type === 'image');
      return imgIdx >= 0 ? prev.filter((_, i) => i !== imgIdx) : prev;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    const r = await contentApi.update(post.id, {
      ...form,
      agency_client_id: post.agency_client_id,
      batch_id: (post as any).batch_id,
      media_files: JSON.stringify(mediaFiles),
      // Keep media_url as first image URL for backward compat with thumbnails
      media_url: carouselImages[0]?.url || reelsVideo?.url || '',
    });
    setSaving(false);
    onUpdated(r.data);
  };

  const handleStatusChange = async (status: ContentStatus) => {
    setForm(f => ({ ...f, status }));
    await contentApi.updateStatus(post.id, status);
    onUpdated({ ...post, ...form, type: form.type as any, status });
  };

  const handleDelete = async () => {
    await contentApi.delete(post.id);
    onDeleted();
  };

  const handleCreateFlow = async () => {
    setCreatingFlow(true);
    const stages = wfStages.filter(s => s.active).map(s => ({
      stage: s.stage, label: s.label, active: true,
      assigned_to: s.assigned_to ? Number(s.assigned_to) : undefined,
      due_date: s.due_date || undefined,
    }));
    const r = await contentApi.createWorkflow(post.id, stages);
    setTasks(r.data.tasks || []);
    setCreatingFlow(false);
    setWorkflowModal(false);
  };

  const inputCls = "w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none focus:ring-1 focus:ring-blue-500/30 transition-all";
  const inputStyle = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: 'white' };
  const labelCls = "text-[10px] font-semibold uppercase tracking-wide mb-1.5 block";
  const labelStyle = { color: 'rgba(100,116,139,0.5)' };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 animate-fade"
        style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
        onClick={onClose} />

      {/* Panel */}
      <div className="fixed top-0 right-0 bottom-0 z-50 flex flex-col w-full max-w-[480px] animate-slide-right"
        style={{ background: '#07071a', borderLeft: '1px solid rgba(59,130,246,0.12)', boxShadow: '-24px 0 60px rgba(0,0,0,0.7)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(59,130,246,0.08)' }}>
          <StatusDropdown current={form.status} onChange={handleStatusChange} />
          <div className="flex items-center gap-2">
            {deleting ? (
              <div className="flex items-center gap-2">
                <span className="text-xs" style={{ color: 'rgba(148,163,184,0.6)' }}>Excluir?</span>
                <button onClick={handleDelete} className="text-xs px-2.5 py-1.5 rounded-lg font-medium"
                  style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)' }}>Sim</button>
                <button onClick={() => setDeleting(false)} className="text-xs px-2.5 py-1.5 rounded-lg"
                  style={{ color: 'rgba(100,116,139,0.6)', border: '1px solid rgba(255,255,255,0.06)' }}>Não</button>
              </div>
            ) : (
              <button onClick={() => setDeleting(true)} className="p-1.5 rounded-lg transition-all"
                style={{ color: 'rgba(100,116,139,0.4)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#f87171'; (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.08)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(100,116,139,0.4)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                <Trash2 size={14} />
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg transition-all"
              style={{ color: 'rgba(100,116,139,0.4)' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'white')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(100,116,139,0.4)')}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

          {/* Title */}
          <div>
            <label className={labelCls} style={labelStyle}>Título</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className={inputCls} style={inputStyle} placeholder="Título do post" />
          </div>

          {/* Type + Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls} style={labelStyle}>Tipo</label>
              <div className="flex rounded-xl overflow-hidden"
                style={{ border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}>
                {POST_TYPES.map(t => (
                  <button key={t.value}
                    onClick={() => { setForm(f => ({ ...f, type: t.value })); setMediaFiles([]); }}
                    className="flex-1 py-2 text-xs font-medium transition-all"
                    style={{ color: form.type === t.value ? '#e2e8f0' : 'rgba(100,116,139,0.5)', background: form.type === t.value ? 'rgba(59,130,246,0.15)' : 'transparent' }}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className={labelCls} style={labelStyle}>Data prevista</label>
              <input type="date" value={form.scheduled_date}
                onChange={e => setForm(f => ({ ...f, scheduled_date: e.target.value }))}
                className={inputCls} style={inputStyle} />
            </div>
          </div>

          {/* ── MÍDIA ─────────────────────────────────────────────────────── */}
          <div>
            <label className={labelCls} style={labelStyle}>Mídia</label>

            {/* ESTÁTICO / CARROSSEL */}
            {(form.type === 'estatico' || form.type === 'carrossel') && (
              <div className="space-y-3">
                {carouselImages.length > 0 && (
                  <CarouselViewer
                    images={carouselImages}
                    onRemove={i => {
                      const imgOnly = mediaFiles.filter(f => f.type === 'image');
                      const toRemove = imgOnly[i];
                      setMediaFiles(prev => prev.filter(f => f !== toRemove));
                    }}
                  />
                )}
                {(form.type === 'carrossel' || carouselImages.length === 0) && (
                  <DropZone
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    multiple={form.type === 'carrossel'}
                    label={form.type === 'carrossel' ? 'Adicionar imagens ao carrossel' : 'Subir imagem'}
                    icon={ImageIcon}
                    uploading={uploading === 'images'}
                    onFiles={files => uploadFiles(files, 'images')}
                  />
                )}
                {form.type === 'estatico' && carouselImages.length > 0 && (
                  <button onClick={() => setMediaFiles(prev => prev.filter(f => f.type !== 'image'))}
                    className="text-xs flex items-center gap-1.5 transition-opacity hover:opacity-70"
                    style={{ color: 'rgba(100,116,139,0.5)' }}>
                    <Upload size={10} /> Trocar imagem
                  </button>
                )}
              </div>
            )}

            {/* REELS */}
            {form.type === 'reels' && (
              <div className="space-y-3">
                {reelsVideo ? (
                  <ReelsViewer
                    video={reelsVideo}
                    cover={reelsCover ?? undefined}
                    onRemoveVideo={removeVideoForReels}
                    onRemoveCover={removeCoverForReels}
                  />
                ) : (
                  <DropZone
                    accept="video/mp4,video/quicktime,video/webm"
                    multiple={false}
                    label="Subir vídeo do Reels"
                    icon={Video}
                    uploading={uploading === 'video'}
                    onFiles={files => uploadFiles(files, 'video')}
                  />
                )}
                {reelsVideo && !reelsCover && (
                  <DropZone
                    accept="image/jpeg,image/png,image/webp"
                    multiple={false}
                    label="Adicionar capa (opcional)"
                    icon={ImageIcon}
                    uploading={uploading === 'cover'}
                    onFiles={files => uploadFiles(files, 'cover')}
                  />
                )}
              </div>
            )}
          </div>

          {/* Objective */}
          <div>
            <label className={labelCls} style={labelStyle}>Objetivo</label>
            <select value={form.objective} onChange={e => setForm(f => ({ ...f, objective: e.target.value }))}
              className={inputCls} style={{ ...inputStyle, cursor: 'pointer' }}>
              <option value="">Selecionar objetivo</option>
              {OBJECTIVES.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>

          {/* Caption */}
          <div>
            <label className={labelCls} style={labelStyle}>Legenda</label>
            <textarea value={form.caption} onChange={e => setForm(f => ({ ...f, caption: e.target.value }))}
              rows={3} className={inputCls} style={{ ...inputStyle, resize: 'none' }}
              placeholder="Texto do post para publicação…" />
          </div>

          {/* Copy & Referências */}
          <div>
            <label className={labelCls} style={labelStyle}>Copy & Referências</label>
            <textarea value={form.copy_text} onChange={e => setForm(f => ({ ...f, copy_text: e.target.value }))}
              rows={4} className={inputCls} style={{ ...inputStyle, resize: 'none' }}
              placeholder="Briefing para o designer: copies, referências visuais, orientações de estilo…" />
          </div>

          {/* Produção interna */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className={labelCls} style={{ ...labelStyle, marginBottom: 0 }}>Produção Interna</label>
              <button onClick={() => setWorkflowModal(true)}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all"
                style={{ color: '#60a5fa', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.15)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(59,130,246,0.15)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(59,130,246,0.08)')}>
                {tasks.length === 0 ? <><Zap size={11} /> Criar fluxo</> : <><Plus size={11} /> Etapa</>}
              </button>
            </div>

            {tasks.length === 0 ? (
              <div className="rounded-xl px-4 py-6 text-center"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(59,130,246,0.12)' }}>
                <p className="text-xs" style={{ color: 'rgba(100,116,139,0.4)' }}>
                  Clique em "Criar fluxo" para gerar as tarefas de Copy → Design → Edição → Revisão
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {tasks.map((t: any) => {
                  const sc = TASK_STATUS_CFG[t.status] || TASK_STATUS_CFG.a_fazer;
                  return (
                    <div key={t.id} className="rounded-xl px-3 py-2.5"
                      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: sc.color }} />
                        <p className="text-xs font-medium text-white flex-1 truncate">{t.title}</p>
                        <span className="text-[10px] font-medium flex-shrink-0" style={{ color: sc.color }}>{sc.label}</span>
                      </div>
                      <div className="mt-2 ml-5">
                        <select
                          value={t.assigned_to || ''}
                          onChange={async e => {
                            const uid = e.target.value ? Number(e.target.value) : null;
                            await import('../../api/client').then(m => m.tasksApi.update(t.id, { assigned_to: uid }));
                            setTasks(prev => prev.map(x => x.id === t.id ? { ...x, assigned_to: uid, assignee_name: users.find((u: any) => u.id === uid)?.name || null } : x));
                          }}
                          className="text-[11px] rounded-lg px-2 py-1 outline-none w-full"
                          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: t.assigned_to ? 'rgba(148,163,184,0.9)' : 'rgba(100,116,139,0.45)', cursor: 'pointer' }}>
                          <option value="">Sem responsável</option>
                          {users.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 py-4 flex-shrink-0"
          style={{ borderTop: '1px solid rgba(59,130,246,0.08)' }}>
          <button onClick={onClose} className="btn-ghost flex-1 justify-center">Cancelar</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 justify-center">
            {saving ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </div>

      {/* Workflow modal */}
      {workflowModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-fade"
          style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)' }}>
          <div className="w-full max-w-lg rounded-2xl overflow-hidden animate-fade-up"
            style={{ background: '#0d0d22', border: '1px solid rgba(59,130,246,0.15)' }}>
            <div className="flex items-center justify-between px-6 py-5"
              style={{ borderBottom: '1px solid rgba(59,130,246,0.1)' }}>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest mb-0.5"
                  style={{ color: 'rgba(59,130,246,0.6)' }}>Produção</p>
                <h2 className="text-base font-semibold text-white">Criar fluxo de produção</h2>
              </div>
              <button onClick={() => setWorkflowModal(false)} style={{ color: 'rgba(100,116,139,0.5)' }}><X size={18} /></button>
            </div>
            <div className="p-6 space-y-3">
              {wfStages.map((s, i) => (
                <div key={s.stage} className="rounded-xl p-4 transition-all"
                  style={{ background: s.active ? 'rgba(59,130,246,0.04)' : 'rgba(255,255,255,0.02)', border: `1px solid ${s.active ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.05)'}` }}>
                  <div className="flex items-center gap-3 mb-3">
                    <button onClick={() => setWfStages(prev => prev.map((x, idx) => idx === i ? { ...x, active: !x.active } : x))}
                      className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-all"
                      style={{ background: s.active ? '#3b82f6' : 'rgba(255,255,255,0.05)', border: s.active ? 'none' : '1px solid rgba(255,255,255,0.12)' }}>
                      {s.active && <Check size={11} color="white" />}
                    </button>
                    <span className="text-sm font-semibold"
                      style={{ color: s.active ? 'white' : 'rgba(100,116,139,0.4)' }}>{s.label}</span>
                  </div>
                  {s.active && (
                    <div className="grid grid-cols-2 gap-3 ml-8">
                      <div>
                        <label className="text-[10px] font-semibold uppercase tracking-wide block mb-1"
                          style={{ color: 'rgba(100,116,139,0.5)' }}>Responsável</label>
                        <select value={s.assigned_to}
                          onChange={e => setWfStages(prev => prev.map((x, idx) => idx === i ? { ...x, assigned_to: e.target.value } : x))}
                          className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: 'white', cursor: 'pointer' }}>
                          <option value="">Sem responsável</option>
                          {users.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold uppercase tracking-wide block mb-1"
                          style={{ color: 'rgba(100,116,139,0.5)' }}>Prazo</label>
                        <input type="date" value={s.due_date}
                          onChange={e => setWfStages(prev => prev.map((x, idx) => idx === i ? { ...x, due_date: e.target.value } : x))}
                          className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: 'white' }} />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={() => setWorkflowModal(false)} className="btn-ghost flex-1 justify-center">Cancelar</button>
              <button onClick={handleCreateFlow} disabled={creatingFlow || wfStages.every(s => !s.active)}
                className="btn-primary flex-1 justify-center">
                {creatingFlow ? 'Criando…' : 'Criar tarefas'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
