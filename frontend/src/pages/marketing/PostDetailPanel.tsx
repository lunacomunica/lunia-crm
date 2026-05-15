import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Trash2, ChevronDown, FileImage, Calendar, Clock, CheckCircle2, RotateCcw, Send, Eye, Plus, Zap, Check, Upload, ChevronLeft, ChevronRight, Play, Pause, Image as ImageIcon, Video, AlertTriangle, Link, ExternalLink } from 'lucide-react';
import { contentApi, usersApi, uploadApi, tasksApi, metaApi } from '../../api/client';
import TaskDetailDrawer from './TaskDetailDrawer';
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
  em_revisao:           { label: 'Em Revisão',        color: '#22d3ee', bg: 'rgba(34,211,238,0.08)',  border: 'rgba(34,211,238,0.2)',  icon: Eye },
  aguardando_aprovacao: { label: 'Ag. Aprovação',     color: '#f59e0b', bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.2)',  icon: Clock },
  aprovado:             { label: 'Aprovado',          color: '#60a5fa', bg: 'rgba(59,130,246,0.08)',  border: 'rgba(59,130,246,0.2)',  icon: CheckCircle2 },
  ajuste_solicitado:    { label: 'Ajuste Solicitado', color: '#f87171', bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.2)', icon: RotateCcw },
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
  initialTab?: 'copy' | 'post' | 'gerot';
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
function CarouselViewer({ images, onRemove, readOnly }: { images: MediaFile[]; onRemove: (i: number) => void; readOnly?: boolean }) {
  const [idx, setIdx] = useState(0);
  if (!images.length) return null;
  const prev = () => setIdx(i => Math.max(0, i - 1));
  const next = () => setIdx(i => Math.min(images.length - 1, i + 1));
  return (
    <div className="relative rounded-2xl overflow-hidden" style={{ aspectRatio: '1080/1350', background: '#000' }}>
      <img src={images[idx].url} alt="" className="w-full h-full object-cover" />
      {/* Remove button */}
      {!readOnly && <button onClick={() => onRemove(idx)}
        className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center"
        style={{ background: 'rgba(0,0,0,0.65)', color: 'white' }}>
        <X size={12} />
      </button>}
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
function ReelsViewer({ video, cover, onRemoveVideo, onRemoveCover, readOnly }: { video: MediaFile; cover?: MediaFile; onRemoveVideo: () => void; onRemoveCover: () => void; readOnly?: boolean }) {
  return (
    <div className="space-y-2">
      {/* Video */}
      <div className="relative rounded-2xl overflow-hidden" style={{ aspectRatio: '9/16', maxHeight: 360, background: '#000' }}>
        <video src={video.url} controls poster={cover?.url}
          className="w-full h-full object-contain"
          style={{ maxHeight: 360 }} />
        {!readOnly && <button onClick={onRemoveVideo}
          className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.65)', color: 'white' }}>
          <X size={12} />
        </button>}
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
          {!readOnly && <button onClick={onRemoveCover} style={{ color: 'rgba(100,116,139,0.5)' }}><X size={12} /></button>}
        </div>
      )}
    </div>
  );
}

// ── Upload drop zone ──────────────────────────────────────────────────────────
function DropZone({ accept, multiple, label, icon: Icon, onFiles, uploading, progress }: {
  accept: string; multiple: boolean; label: string; icon: any; onFiles: (files: File[]) => void; uploading: boolean; progress?: number;
}) {
  const [dragging, setDragging] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div
      className="rounded-xl px-4 py-5 text-center cursor-pointer transition-all"
      style={{
        border: `2px dashed ${dragging ? 'rgba(59,130,246,0.5)' : 'rgba(59,130,246,0.15)'}`,
        background: dragging ? 'rgba(59,130,246,0.06)' : 'rgba(255,255,255,0.02)',
        pointerEvents: uploading ? 'none' : undefined,
      }}
      onClick={() => !uploading && ref.current?.click()}
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
        <div className="flex flex-col items-center gap-3">
          <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(59,130,246,0.15)' }}>
            <div className="h-full rounded-full transition-all duration-300" style={{ width: `${progress ?? 0}%`, background: 'linear-gradient(90deg,#3b82f6,#6366f1)' }} />
          </div>
          <p className="text-xs" style={{ color: 'rgba(100,116,139,0.6)' }}>
            {(progress ?? 0) < 100 ? `Enviando… ${progress ?? 0}%` : 'Processando…'}
          </p>
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
export default function PostDetailPanel({ post, onClose, onUpdated, onDeleted, initialTab }: Props) {
  const [form, setForm] = useState({
    title: post.title,
    type: (post.type as string) || 'estatico',
    scheduled_date: post.scheduled_date?.slice(0, 10) || '',
    scheduled_time: (post as any).scheduled_time || '',
    status: post.status,
    caption: post.caption || '',
    objective: post.objective || '',
    copy_text: (post as any).copy_text || '',
    copy_hook: (post as any).copy_hook || '',
    copy_cta: (post as any).copy_cta || '',
  });

  const [references, setReferences] = useState<{ url: string; label: string }[]>(() => {
    try { return JSON.parse((post as any).post_references || '[]'); } catch { return []; }
  });
  const [newRef, setNewRef] = useState('');
  const [newRefLabel, setNewRefLabel] = useState('');

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
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const captionRef = useRef<HTMLTextAreaElement>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);
  const handleSaveRef = useRef<() => void>(() => {});
  const [deleting, setDeleting] = useState(false);
  const [tasks, setTasks] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [workflowModal, setWorkflowModal] = useState(false);
  const [wfStages, setWfStages] = useState(
    STAGES.map(s => ({ ...s, active: true, assigned_to: '', due_date: '' }))
  );
  const [creatingFlow, setCreatingFlow] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', assigned_to: '', due_date: '', priority: 'alta', is_rework: false });
  const [savingTask, setSavingTask] = useState(false);
  const [openTaskId, setOpenTaskId] = useState<number | null>(null);
  const [panelTab, setPanelTab] = useState<'copy' | 'post' | 'gerot'>(initialTab || 'copy');
  const [mediaInsights, setMediaInsights] = useState<any>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [linkInput, setLinkInput] = useState('');
  const [linking, setLinking] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [schedDate, setSchedDate] = useState<string>(post.scheduled_date?.slice(0, 10) || '');
  const [schedTime, setSchedTime] = useState<string>((post as any).scheduled_time?.slice(0, 5) || '');

  useEffect(() => {
    contentApi.getTasks(post.id).then(r => setTasks(r.data || []));
    usersApi.list().then(r => setUsers(r.data || []));
  }, [post.id]);

  // Auto-load insights when tab opens with ig_media_id, or when ig_media_id is first set (after linking)
  useEffect(() => {
    const igId = (post as any).ig_media_id;
    const clientId = (post as any).agency_client_id;
    if (panelTab === 'post' && igId && clientId && !loadingInsights) {
      setLoadingInsights(true);
      setInsightsError(null);
      setMediaInsights(null);
      metaApi.getMediaInsights(clientId, igId)
        .then(r => setMediaInsights(r.data))
        .catch((e: any) => setInsightsError(e?.response?.data?.error || e?.message || 'Erro ao carregar métricas'))
        .finally(() => setLoadingInsights(false));
    }
  }, [panelTab, (post as any).ig_media_id]);

  // Auto-resize caption on mount
  useEffect(() => {
    if (captionRef.current) {
      captionRef.current.style.height = 'auto';
      captionRef.current.style.height = captionRef.current.scrollHeight + 'px';
    }
  }, []);

  // Auto-save with 1.5s debounce — uses ref so the timeout always calls latest handleSave
  useEffect(() => { handleSaveRef.current = handleSave; });
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => { handleSaveRef.current(); }, 1500);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [form, mediaFiles, references]);

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
    setUploadError(null);
    setUploadProgress(0);
    try {
      const fd = new FormData();
      files.forEach(f => fd.append('files', f));
      const r = await import('axios').then(({ default: axios }) =>
        axios.post('/api/upload', fd, {
          headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${localStorage.getItem('lunia_token')}` },
          timeout: 10 * 60 * 1000,
          onUploadProgress: e => { if (e.total) setUploadProgress(Math.round((e.loaded / e.total) * 100)); },
        })
      );
      const newFiles: MediaFile[] = r.data.files;
      setMediaFiles(prev => {
        if (kind === 'video') return [...prev.filter(f => f.type === 'image'), ...newFiles];
        if (kind === 'cover') return [...prev.filter(f => f.type === 'video'), ...newFiles.map(f => ({ ...f, type: 'image' as const }))];
        return [...prev, ...newFiles.map(f => ({ ...f, type: 'image' as const }))];
      });
    } catch (e: any) {
      const msg = e?.response?.status === 413 ? 'Arquivo muito grande. Contate o suporte para aumentar o limite.' : (e?.response?.data?.error || e?.message || 'Erro ao enviar arquivo');
      setUploadError(msg);
    } finally {
      setUploading(null);
      setUploadProgress(0);
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

  const addRef = () => {
    if (!newRef.trim()) return;
    setReferences(prev => [...prev, { url: newRef.trim(), label: newRefLabel.trim() }]);
    setNewRef(''); setNewRefLabel('');
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const r = await contentApi.update(post.id, {
        ...form,
        agency_client_id: post.agency_client_id,
        batch_id: (post as any).batch_id,
        media_files: JSON.stringify(mediaFiles),
        media_url: carouselImages[0]?.url || reelsVideo?.url || '',
        post_references: JSON.stringify(references),
      });
      onUpdated(r.data);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Erro ao salvar post:', err);
    } finally {
      setSaving(false);
    }
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

  const handleAddTask = async () => {
    if (!newTask.title.trim()) return;
    setSavingTask(true);
    const r = await tasksApi.create({
      title: newTask.title.trim(),
      assigned_to: newTask.assigned_to ? Number(newTask.assigned_to) : null,
      content_piece_id: post.id,
      agency_client_id: post.agency_client_id,
      priority: newTask.priority,
      due_date: newTask.due_date || null,
      stage: 'geral',
      category: newTask.is_rework ? 'retrabalho' : null,
    });
    setTasks(prev => [...prev, r.data]);
    setNewTask({ title: '', assigned_to: '', due_date: '', priority: 'alta', is_rework: false });
    setShowTaskForm(false);
    setSavingTask(false);
  };

  const handleDeleteTask = async (id: number) => {
    await tasksApi.delete(id);
    setTasks(prev => prev.filter((t: any) => t.id !== id));
  };

  const handleTaskAction = async (id: number, action: 'start' | 'pause' | 'complete') => {
    if (action === 'start') await tasksApi.start(id);
    else if (action === 'pause') await tasksApi.pause(id);
    else await tasksApi.complete(id);
    const r = await contentApi.getTasks(post.id);
    const updatedTasks = r.data || [];
    setTasks(updatedTasks);

    // Auto-volta para aguardando_aprovacao quando todos os ajustes são concluídos
    if (action === 'complete' && form.status === 'ajuste_solicitado') {
      const reworkTasks = updatedTasks.filter((t: any) => t.category === 'retrabalho');
      if (reworkTasks.length > 0 && reworkTasks.every((t: any) => t.status === 'concluida')) {
        const newStatus: ContentStatus = 'aguardando_aprovacao';
        await contentApi.updateStatus(post.id, newStatus, 'Ajustes concluídos — aguardando nova aprovação');
        setForm(f => ({ ...f, status: newStatus }));
        onUpdated({ ...post, ...form, type: form.type as any, status: newStatus });
      }
    }
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

  return createPortal(
    <>
      {/* Full-screen overlay */}
      <div className="fixed inset-0 z-50 flex flex-col animate-fade"
        style={{ background: '#07071a' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(59,130,246,0.1)', background: 'rgba(7,7,26,0.95)' }}>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="p-1.5 rounded-lg transition-all mr-1"
              style={{ color: 'rgba(100,116,139,0.5)' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'white')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(100,116,139,0.5)')}>
              <X size={20} />
            </button>
            <h1 className="text-base font-semibold text-white truncate max-w-xs">{form.title || 'Post'}</h1>
            <StatusDropdown current={form.status} onChange={handleStatusChange} />
          </div>
          <div className="flex items-center gap-3">
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
                <Trash2 size={16} />
              </button>
            )}
            <button onClick={onClose} className="btn-ghost">Cancelar</button>
            {saving && <span className="text-sm" style={{ color: 'rgba(100,116,139,0.5)' }}>Salvando…</span>}
            {!saving && saved && (
              <span className="flex items-center gap-1.5 text-sm font-medium" style={{ color: '#34d399' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                Salvo
              </span>
            )}
            <button onClick={handleSave} disabled={saving} className="btn-primary">Salvar</button>
          </div>
        </div>

        {/* Tabs bar */}
        <div className="flex-shrink-0 flex px-6 gap-1"
          style={{ borderBottom: '1px solid rgba(59,130,246,0.08)', background: 'rgba(7,7,26,0.95)' }}>
          {([
            { id: 'copy',  label: 'Copy' },
            { id: 'post',  label: 'Post' },
            { id: 'gerot', label: 'Gerot' },
          ] as const).map(t => (
            <button key={t.id} onClick={() => setPanelTab(t.id)}
              className="px-5 py-3 text-sm font-medium transition-all relative"
              style={{ color: panelTab === t.id ? '#93c5fd' : 'rgba(100,116,139,0.55)' }}>
              {t.label}
              {panelTab === t.id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t"
                  style={{ background: '#3b82f6' }} />
              )}
            </button>
          ))}
        </div>

        {/* Body — single column, tabbed */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-6 py-6 space-y-5">

          {/* ── COPY TAB ── */}
          {panelTab === 'copy' && (<>

            {/* Title */}
            <div>
              <label className={labelCls} style={labelStyle}>Título</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className={inputCls} style={inputStyle} placeholder="Título do post" />
            </div>

            {/* Type + Date/Time */}
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
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelCls} style={labelStyle}>Data</label>
                  <input type="date" value={form.scheduled_date}
                    onChange={e => setForm(f => ({ ...f, scheduled_date: e.target.value }))}
                    className={inputCls} style={inputStyle} />
                </div>
                <div>
                  <label className={labelCls} style={labelStyle}>Horário</label>
                  <input type="time" value={form.scheduled_time}
                    onChange={e => setForm(f => ({ ...f, scheduled_time: e.target.value }))}
                    className={inputCls} style={inputStyle} />
                </div>
              </div>
            </div>

            {/* Mídia */}
            <div>
              <label className={labelCls} style={labelStyle}>Mídia</label>
              {(form.type === 'estatico' || form.type === 'carrossel') && (
                <div className="space-y-3">
                  {carouselImages.length > 0 && (
                    <CarouselViewer images={carouselImages}
                      onRemove={i => {
                        const imgOnly = mediaFiles.filter(f => f.type === 'image');
                        setMediaFiles(prev => prev.filter(f => f !== imgOnly[i]));
                      }} />
                  )}
                  {(form.type === 'carrossel' || carouselImages.length === 0) && (
                    <DropZone accept="image/jpeg,image/png,image/webp,image/gif"
                      multiple={form.type === 'carrossel'}
                      label={form.type === 'carrossel' ? 'Adicionar imagens ao carrossel' : 'Subir imagem'}
                      icon={ImageIcon} uploading={uploading === 'images'} progress={uploading === 'images' ? uploadProgress : 0}
                      onFiles={files => uploadFiles(files, 'images')} />
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
              {form.type === 'reels' && (
                <div className="space-y-3">
                  {reelsVideo ? (
                    <ReelsViewer video={reelsVideo} cover={reelsCover ?? undefined}
                      onRemoveVideo={removeVideoForReels} onRemoveCover={removeCoverForReels} />
                  ) : (
                    <DropZone accept="video/mp4,video/quicktime,video/webm" multiple={false}
                      label="Subir vídeo do Reels" icon={Video} uploading={uploading === 'video'} progress={uploading === 'video' ? uploadProgress : 0}
                      onFiles={files => uploadFiles(files, 'video')} />
                  )}
                  {!reelsCover && (
                    <DropZone accept="image/jpeg,image/png,image/webp" multiple={false}
                      label="Capa do Reels (opcional)" icon={ImageIcon} uploading={uploading === 'cover'} progress={uploading === 'cover' ? uploadProgress : 0}
                      onFiles={files => uploadFiles(files, 'cover')} />
                  )}
                </div>
              )}
            </div>

            {uploadError && (
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" style={{ color: '#f87171' }} />
                <p className="text-xs" style={{ color: '#f87171' }}>{uploadError}</p>
                <button onClick={() => setUploadError(null)} className="ml-auto flex-shrink-0" style={{ color: 'rgba(248,113,113,0.5)' }}><X size={11} /></button>
              </div>
            )}

            {/* Legenda */}
            <div>
              <label className={labelCls} style={labelStyle}>Legenda</label>
              <textarea ref={captionRef} value={form.caption}
                onChange={e => {
                  setForm(f => ({ ...f, caption: e.target.value }));
                  e.target.style.height = 'auto';
                  e.target.style.height = e.target.scrollHeight + 'px';
                }}
                rows={4} className={inputCls} style={{ ...inputStyle, resize: 'none', overflow: 'hidden', minHeight: '96px' }}
                placeholder="Texto do post para publicação…" />
            </div>

            {/* Objetivo */}
            <div>
              <label className={labelCls} style={labelStyle}>Objetivo estratégico</label>
              <select value={form.objective} onChange={e => setForm(f => ({ ...f, objective: e.target.value }))}
                className={inputCls} style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="">Selecionar objetivo</option>
                {OBJECTIVES.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>

            {/* Estrutura copy */}
            <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(59,130,246,0.1)' }}>
              <div className="px-4 py-2.5" style={{ background: 'rgba(59,130,246,0.04)', borderBottom: '1px solid rgba(59,130,246,0.08)' }}>
                <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(59,130,246,0.7)' }}>Estrutura do copy</span>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <label className={labelCls} style={labelStyle}>Hook / Título</label>
                  <input value={form.copy_hook} onChange={e => setForm(f => ({ ...f, copy_hook: e.target.value }))}
                    className={inputCls} style={inputStyle} placeholder="Frase de abertura que prende a atenção…" />
                </div>
                <div>
                  <label className={labelCls} style={labelStyle}>Corpo</label>
                  <textarea value={form.copy_text} onChange={e => setForm(f => ({ ...f, copy_text: e.target.value }))}
                    rows={4} className={inputCls} style={{ ...inputStyle, resize: 'none' }}
                    placeholder="Desenvolvimento do texto…" />
                </div>
                <div>
                  <label className={labelCls} style={labelStyle}>CTA</label>
                  <input value={form.copy_cta} onChange={e => setForm(f => ({ ...f, copy_cta: e.target.value }))}
                    className={inputCls} style={inputStyle} placeholder="Chamada para ação final…" />
                </div>
              </div>
            </div>

            {/* Referências */}
            <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(167,139,250,0.12)' }}>
              <div className="px-4 py-2.5" style={{ background: 'rgba(167,139,250,0.04)', borderBottom: '1px solid rgba(167,139,250,0.08)' }}>
                <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(167,139,250,0.7)' }}>Referências</span>
              </div>
              <div className="p-4 space-y-2">
                {references.map((r, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-xl group"
                    style={{ background: 'rgba(167,139,250,0.05)', border: '1px solid rgba(167,139,250,0.1)' }}>
                    <Link size={11} style={{ color: 'rgba(167,139,250,0.6)', flexShrink: 0 }} />
                    <div className="flex-1 min-w-0">
                      {r.label && <p className="text-xs font-medium text-white truncate">{r.label}</p>}
                      <a href={r.url} target="_blank" rel="noreferrer"
                        className="text-[11px] truncate block hover:underline"
                        style={{ color: 'rgba(167,139,250,0.7)' }} onClick={e => e.stopPropagation()}>
                        {r.url}
                      </a>
                    </div>
                    <button onClick={() => setReferences(prev => prev.filter((_, j) => j !== i))}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded transition-opacity flex-shrink-0"
                      style={{ color: 'rgba(100,116,139,0.5)' }}>
                      <X size={11} />
                    </button>
                  </div>
                ))}
                <div className="space-y-2 pt-1">
                  <input value={newRefLabel} onChange={e => setNewRefLabel(e.target.value)}
                    className={inputCls} style={{ ...inputStyle, fontSize: 12 }}
                    placeholder="Nome / descrição (opcional)" />
                  <div className="flex gap-2">
                    <input value={newRef} onChange={e => setNewRef(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addRef()}
                      className={`${inputCls} flex-1`} style={{ ...inputStyle, fontSize: 12 }}
                      placeholder="https://…" />
                    <button onClick={addRef} disabled={!newRef.trim()}
                      className="px-3 rounded-xl text-xs font-medium disabled:opacity-30 flex-shrink-0"
                      style={{ background: 'rgba(167,139,250,0.15)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.25)' }}>
                      <Plus size={13} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>)}

          {/* ── POST TAB ── preview + publish + insights */}
          {panelTab === 'post' && (() => {
            const igId = (post as any).ig_media_id;
            const clientId = (post as any).agency_client_id;
            const ins = mediaInsights?.insights || {};
            const reach = ins.reach ?? mediaInsights?.reach ?? 0;
            const impressions = ins.impressions ?? mediaInsights?.impressions ?? 0;
            const engagement = ins.engagement ?? mediaInsights?.engagement ?? 0;
            const saved = ins.saved ?? mediaInsights?.saved ?? 0;
            const shares = ins.shares ?? mediaInsights?.shares ?? 0;
            const plays = ins.plays ?? mediaInsights?.plays ?? 0;
            const likes = ins.likes ?? mediaInsights?.like_count ?? 0;
            const comments = ins.comments ?? mediaInsights?.comments_count ?? 0;
            const engRate = reach > 0 ? ((( ins.total_interactions ?? engagement) / reach) * 100).toFixed(1) : '—';
            const isReel = mediaInsights?.media_type === 'VIDEO' || post.type === 'reels';
            const totalInteractions = ins.total_interactions ?? engagement;
            const profileVisits = ins.profile_visits ?? 0;
            const follows = ins.follows ?? 0;
            const avgWatchTime = ins.ig_reels_avg_watch_time ?? 0;
            const commentsList: any[] = mediaInsights?.comments_list || [];

            const reload = async () => {
              if (!igId || !clientId) return;
              setLoadingInsights(true);
              setInsightsError(null);
              try {
                const r = await metaApi.getMediaInsights(clientId, igId);
                setMediaInsights(r.data);
              } catch (e: any) {
                setInsightsError(e?.response?.data?.error || e?.message || 'Erro ao carregar métricas');
              }
              setLoadingInsights(false);
            };

            return (
              <div className="space-y-5">
                {/* Preview como o cliente vê */}
                <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
                  <div className="px-4 py-2.5 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(100,116,139,0.45)' }}>Visualização do cliente</span>
                    {post.scheduled_date && (
                      <span className="text-[10px] flex items-center gap-1" style={{ color: 'rgba(100,116,139,0.4)' }}>
                        <Calendar size={9} />
                        {new Date(post.scheduled_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                        {(post as any).scheduled_time ? ` às ${(post as any).scheduled_time.slice(0,5)}` : ''}
                      </span>
                    )}
                  </div>
                  <div className="p-4 space-y-3">
                    {carouselImages.length > 0 && (
                      <CarouselViewer images={carouselImages} onRemove={() => {}} readOnly />
                    )}
                    {reelsVideo && (
                      <ReelsViewer video={reelsVideo} cover={reelsCover ?? undefined} onRemoveVideo={() => {}} onRemoveCover={() => {}} readOnly />
                    )}
                    {form.caption && (
                      <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'rgba(148,163,184,0.8)' }}>{form.caption}</p>
                    )}
                    {!carouselImages.length && !reelsVideo && !form.caption && (
                      <p className="text-xs text-center py-4" style={{ color: 'rgba(100,116,139,0.3)' }}>Sem mídia ou legenda ainda</p>
                    )}
                  </div>
                </div>

                {/* Publicação — apenas agência */}
                {!igId && (
                  <div className="space-y-3">

                    {/* PROGRAMAR — destaque principal */}
                    <div className="rounded-2xl p-4 space-y-3" style={{ background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.18)' }}>
                      <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(96,165,250,0.9)' }}>Programar publicação</p>
                      <p className="text-xs" style={{ color: 'rgba(100,116,139,0.45)' }}>Define data e hora — publica automaticamente no Instagram e Facebook.</p>
                      <div className="flex gap-2">
                        <input type="date" value={schedDate} onChange={e => setSchedDate(e.target.value)}
                          className="flex-1 rounded-xl px-3 py-2 text-xs outline-none"
                          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(148,163,184,0.85)' }} />
                        <input type="time" value={schedTime} onChange={e => setSchedTime(e.target.value)}
                          className="w-28 rounded-xl px-3 py-2 text-xs outline-none"
                          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(148,163,184,0.85)' }} />
                      </div>
                      <button onClick={async () => {
                        if (!schedDate) return;
                        setScheduling(true); setPublishError(null);
                        try {
                          const r = await contentApi.update(post.id, { status: 'agendado', scheduled_date: schedDate, scheduled_time: schedTime || null });
                          onUpdated(r.data);
                        } catch (e: any) { setPublishError(e.response?.data?.error || 'Erro ao programar'); }
                        setScheduling(false);
                      }} disabled={scheduling || !schedDate}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-40"
                        style={{ color: '#60a5fa', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)' }}>
                        <Calendar size={13} className={scheduling ? 'animate-pulse' : ''} />
                        {scheduling ? 'Agendando…' : 'Programar'}
                      </button>
                    </div>

                    {/* PUBLICAR AGORA — secundário */}
                    <div className="rounded-2xl p-4 space-y-3" style={{ background: 'rgba(16,185,129,0.03)', border: '1px solid rgba(16,185,129,0.1)' }}>
                      <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(52,211,153,0.5)' }}>Publicar agora</p>
                      <button onClick={async () => {
                        setPublishing(true); setPublishError(null);
                        try {
                          const r = await metaApi.publish(clientId, post.id);
                          onUpdated({ ...post, status: 'publicado', ig_media_id: r.data.ig_media_id } as any);
                        } catch (e: any) { setPublishError(e.response?.data?.error || 'Erro ao publicar'); }
                        setPublishing(false);
                      }} disabled={publishing}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-40"
                        style={{ color: '#10b981', background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.15)' }}>
                        <Send size={13} className={publishing ? 'animate-pulse' : ''} />
                        {publishing ? 'Publicando…' : 'Publicar agora'}
                      </button>
                    </div>

                    {publishError && <p className="text-xs text-red-400 px-1">{publishError}</p>}

                    {/* VINCULAR POST JÁ PUBLICADO */}
                    <div className="rounded-2xl p-4 space-y-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(100,116,139,0.4)' }}>Vincular post já publicado</p>
                      <p className="text-xs" style={{ color: 'rgba(100,116,139,0.35)' }}>Cole o link do Instagram para conectar os insights.</p>
                      <div className="flex gap-2">
                        <input value={linkInput} onChange={e => setLinkInput(e.target.value)}
                          placeholder="https://www.instagram.com/p/…"
                          className="flex-1 rounded-xl px-3 py-2 text-xs outline-none"
                          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(148,163,184,0.85)' }} />
                        <button onClick={async () => {
                          if (!linkInput.trim()) return;
                          setLinking(true);
                          try { const r = await metaApi.linkIg(clientId, post.id, linkInput.trim()); onUpdated(r.data); }
                          catch (e: any) { setPublishError(e.response?.data?.error || 'Erro ao vincular'); }
                          setLinking(false);
                        }} disabled={linking || !linkInput.trim()}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all disabled:opacity-40 flex-shrink-0"
                          style={{ color: '#60a5fa', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.18)' }}>
                          <Link size={12} /> {linking ? 'Buscando…' : 'Vincular'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Insights */}
                {igId && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(100,116,139,0.4)' }}>Métricas do post</p>
                      <div className="flex items-center gap-2">
                        {mediaInsights?.permalink && (
                          <a href={mediaInsights.permalink} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-all"
                            style={{ color: 'rgba(148,163,184,0.6)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                            <ExternalLink size={10} /> Ver no Instagram
                          </a>
                        )}
                        <button onClick={reload} disabled={loadingInsights}
                          className="p-1.5 rounded-lg transition-all disabled:opacity-40"
                          style={{ color: 'rgba(100,116,139,0.4)', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                          <RotateCcw size={11} className={loadingInsights ? 'animate-spin' : ''} />
                        </button>
                      </div>
                    </div>

                    {loadingInsights ? (
                      <div className="flex items-center justify-center py-10 gap-2">
                        <RotateCcw size={14} className="animate-spin" style={{ color: 'rgba(100,116,139,0.4)' }} />
                        <p className="text-xs" style={{ color: 'rgba(100,116,139,0.4)' }}>Carregando métricas…</p>
                      </div>
                    ) : insightsError ? (
                      <div className="px-3 py-4 rounded-xl text-xs" style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.18)', color: '#f87171' }}>
                        {insightsError}
                      </div>
                    ) : !mediaInsights ? (
                      <div className="text-center py-8">
                        <p className="text-xs" style={{ color: 'rgba(100,116,139,0.4)' }}>Nenhuma métrica ainda — o post pode ser muito recente.</p>
                      </div>
                    ) : (
                      <>
                        {mediaInsights.insights_warning && (
                          <div className="px-3 py-2 rounded-xl text-xs" style={{ background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.2)', color: '#fbbf24' }}>
                            Insights parciais: {mediaInsights.insights_warning}
                          </div>
                        )}
                        {mediaInsights.timestamp && (
                          <p className="text-xs" style={{ color: 'rgba(100,116,139,0.35)' }}>
                            Publicado em {new Date(mediaInsights.timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-2xl p-5" style={{ background: 'linear-gradient(145deg,rgba(59,130,246,0.1),rgba(99,102,241,0.06))', border: '1px solid rgba(59,130,246,0.18)' }}>
                            <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'rgba(99,102,241,0.7)' }}>Contas alcançadas</p>
                            <p className="text-3xl font-bold text-white">{reach.toLocaleString('pt-BR')}</p>
                            <div className="mt-3 h-0.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
                              <div className="h-full rounded-full" style={{ width: impressions > 0 ? `${Math.min((reach / impressions) * 100, 100).toFixed(0)}%` : '0%', background: 'linear-gradient(90deg,#6366f1,#3b82f6)' }} />
                            </div>
                            <p className="text-[10px] mt-1" style={{ color: 'rgba(100,116,139,0.45)' }}>{impressions.toLocaleString('pt-BR')} impressões</p>
                          </div>
                          <div className="rounded-2xl p-5" style={{ background: 'linear-gradient(145deg,rgba(52,211,153,0.1),rgba(16,185,129,0.06))', border: '1px solid rgba(52,211,153,0.18)' }}>
                            <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'rgba(52,211,153,0.7)' }}>Taxa de engajamento</p>
                            <p className="text-3xl font-bold" style={{ color: '#34d399' }}>{engRate}%</p>
                            <p className="text-[10px] mt-4" style={{ color: 'rgba(100,116,139,0.45)' }}>{totalInteractions.toLocaleString('pt-BR')} interações totais</p>
                          </div>
                        </div>
                        <div className="rounded-2xl p-4 space-y-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                          <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(100,116,139,0.45)' }}>Engajamento</p>
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              { label: 'Curtidas',     value: likes,    color: '#ec4899', icon: '❤️' },
                              { label: 'Comentários',  value: comments, color: '#f59e0b', icon: '💬' },
                              { label: 'Salvamentos',  value: saved,    color: '#a78bfa', icon: '🔖' },
                              { label: 'Compart.',     value: shares,   color: '#22d3ee', icon: '↗️' },
                              ...(isReel ? [
                                { label: 'Reproduções',     value: plays,                          color: '#60a5fa', icon: '▶️' },
                                { label: 'Tempo médio (s)', value: Math.round(avgWatchTime / 1000), color: '#818cf8', icon: '⏱️' },
                              ] : []),
                              ...(profileVisits > 0 ? [{ label: 'Visitas ao perfil',  value: profileVisits, color: '#34d399', icon: '👤' }] : []),
                              ...(follows > 0        ? [{ label: 'Novos seguidores',  value: follows,       color: '#10b981', icon: '➕' }] : []),
                            ].map(m => (
                              <div key={m.label} className="flex items-center gap-3 rounded-xl px-3 py-2.5" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                                <span className="text-sm">{m.icon}</span>
                                <div>
                                  <p className="text-sm font-semibold leading-none" style={{ color: m.color }}>{m.value.toLocaleString('pt-BR')}</p>
                                  <p className="text-[10px] mt-0.5" style={{ color: 'rgba(100,116,139,0.5)' }}>{m.label}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="rounded-2xl p-4 space-y-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                          <div className="flex items-center justify-between">
                            <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(100,116,139,0.45)' }}>Comentários ({comments.toLocaleString('pt-BR')})</p>
                            {mediaInsights?.permalink && (
                              <a href={mediaInsights.permalink} target="_blank" rel="noopener noreferrer"
                                className="text-[10px]" style={{ color: 'rgba(100,116,139,0.4)' }}>Ver todos</a>
                            )}
                          </div>
                          {commentsList.length === 0 ? (
                            <p className="text-xs py-2" style={{ color: 'rgba(100,116,139,0.35)' }}>
                              {comments > 0 ? 'Carregando comentários…' : 'Nenhum comentário ainda.'}
                            </p>
                          ) : (
                            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                              {commentsList.map((c: any) => (
                                <div key={c.id}>
                                  <div className="flex gap-2.5">
                                    <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold"
                                      style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}>
                                      {(c.username || '?')[0].toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-baseline gap-1.5">
                                        <span className="text-xs font-semibold" style={{ color: 'rgba(148,163,184,0.8)' }}>@{c.username}</span>
                                        <span className="text-[10px]" style={{ color: 'rgba(100,116,139,0.35)' }}>
                                          {new Date(c.timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                                        </span>
                                        {c.like_count > 0 && <span className="text-[10px]" style={{ color: 'rgba(236,72,153,0.5)' }}>❤️ {c.like_count}</span>}
                                      </div>
                                      <p className="text-xs mt-0.5 break-words" style={{ color: 'rgba(148,163,184,0.65)' }}>{c.text}</p>
                                      {c.replies?.data?.length > 0 && (
                                        <div className="mt-1.5 ml-2 space-y-1.5 pl-2" style={{ borderLeft: '1px solid rgba(255,255,255,0.06)' }}>
                                          {c.replies.data.slice(0, 2).map((r: any) => (
                                            <div key={r.id} className="flex gap-2">
                                              <span className="text-[10px] font-semibold" style={{ color: 'rgba(148,163,184,0.6)' }}>@{r.username}</span>
                                              <p className="text-[10px] break-words" style={{ color: 'rgba(148,163,184,0.5)' }}>{r.text}</p>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

          {/* ── GEROT TAB ── */}
          {panelTab === 'gerot' && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className={labelCls} style={{ ...labelStyle, marginBottom: 0 }}>Tarefas</label>
                <div className="flex items-center gap-2">
                  {tasks.length === 0 && (
                    <button onClick={() => setWorkflowModal(true)}
                      className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all"
                      style={{ color: '#60a5fa', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.15)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(59,130,246,0.15)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'rgba(59,130,246,0.08)')}>
                      <Zap size={11} /> Criar fluxo
                    </button>
                  )}
                  <button onClick={() => { setShowTaskForm(true); setNewTask({ title: '', assigned_to: '', due_date: '', priority: 'alta', is_rework: false }); }}
                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all"
                    style={{ color: '#60a5fa', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.15)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(59,130,246,0.15)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(59,130,246,0.08)')}>
                    <Plus size={11} /> Task
                  </button>
                </div>
              </div>

              {tasks.length === 0 ? (
                <div className="rounded-xl px-4 py-6 text-center"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(59,130,246,0.12)' }}>
                  <p className="text-xs" style={{ color: 'rgba(100,116,139,0.4)' }}>
                    Clique em "Criar fluxo" para gerar as tarefas de Copy → Design → Edição → Revisão
                  </p>
                </div>
              ) : (() => {
                  const normalTasks = tasks.filter((t: any) => t.category !== 'retrabalho');
                  const reworkTasks = tasks.filter((t: any) => t.category === 'retrabalho');
                  const renderTask = (t: any) => {
                    const sc = TASK_STATUS_CFG[t.status] || TASK_STATUS_CFG.a_fazer;
                    const isRunning = t.status === 'em_andamento';
                    const isDone = t.status === 'concluida';
                    const PRIORITY_COLOR: Record<string, string> = { urgente: '#f87171', alta: '#fb923c', media: '#facc15', baixa: '#94a3b8' };
                    const pColor = PRIORITY_COLOR[t.priority] || '#94a3b8';
                    return (
                      <div key={t.id} className="group rounded-xl px-3 py-2.5 cursor-pointer transition-all"
                        onClick={() => setOpenTaskId(t.id)}
                        style={{ background: isDone ? 'rgba(52,211,153,0.03)' : 'rgba(255,255,255,0.02)', border: `1px solid ${isDone ? 'rgba(52,211,153,0.12)' : 'rgba(255,255,255,0.05)'}`, opacity: isDone ? 0.7 : 1 }}
                        onMouseEnter={e => (e.currentTarget.style.background = isDone ? 'rgba(52,211,153,0.06)' : 'rgba(255,255,255,0.04)')}
                        onMouseLeave={e => (e.currentTarget.style.background = isDone ? 'rgba(52,211,153,0.03)' : 'rgba(255,255,255,0.02)')}>
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: sc.color }} />
                          <p className="text-xs font-medium text-white flex-1 truncate" style={{ textDecoration: isDone ? 'line-through' : 'none' }}>{t.title}</p>
                          {t.priority && t.priority !== 'media' && (
                            <AlertTriangle size={9} style={{ color: pColor, flexShrink: 0 }} />
                          )}
                          <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                              {!isDone && (isRunning ? (
                                <button onClick={() => handleTaskAction(t.id, 'pause')} title="Pausar"
                                  className="w-6 h-6 rounded-md flex items-center justify-center transition-all"
                                  style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>
                                  <Pause size={9} />
                                </button>
                              ) : (
                                <button onClick={() => handleTaskAction(t.id, 'start')} title="Iniciar"
                                  className="w-6 h-6 rounded-md flex items-center justify-center transition-all"
                                  style={{ background: 'rgba(96,165,250,0.12)', color: '#60a5fa' }}>
                                  <Play size={9} />
                                </button>
                              ))}
                              {!isDone && (
                                <button onClick={() => handleTaskAction(t.id, 'complete')} title="Concluir"
                                  className="w-6 h-6 rounded-md flex items-center justify-center transition-all"
                                  style={{ background: 'rgba(52,211,153,0.12)', color: '#34d399' }}>
                                  <Check size={9} />
                                </button>
                              )}
                              <button onClick={() => handleDeleteTask(t.id)} title="Apagar task"
                                className="w-6 h-6 rounded-md flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                                style={{ background: 'rgba(239,68,68,0.08)', color: 'rgba(248,113,113,0.5)' }}
                                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.18)'; (e.currentTarget as HTMLElement).style.color = '#f87171'; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.08)'; (e.currentTarget as HTMLElement).style.color = 'rgba(248,113,113,0.5)'; }}>
                                <Trash2 size={9} />
                              </button>
                            </div>
                        </div>
                        <div className="mt-1.5 flex items-center gap-2 ml-3.5" onClick={e => e.stopPropagation()}>
                          <select value={t.assigned_to || ''}
                            onClick={e => e.stopPropagation()}
                            onChange={async e => {
                              const uid = e.target.value ? Number(e.target.value) : null;
                              await tasksApi.update(t.id, { assigned_to: uid });
                              setTasks(prev => prev.map(x => x.id === t.id ? { ...x, assigned_to: uid, assignee_name: users.find((u: any) => u.id === uid)?.name || null } : x));
                            }}
                            className="text-[11px] rounded-lg px-2 py-1 outline-none flex-1"
                            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: t.assigned_to ? 'rgba(148,163,184,0.8)' : 'rgba(100,116,139,0.4)', cursor: 'pointer' }}>
                            <option value="">Sem responsável</option>
                            {users.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
                          </select>
                          <input type="date" value={t.due_date ? t.due_date.slice(0,10) : ''}
                            onClick={e => e.stopPropagation()}
                            onChange={async e => {
                              const val = e.target.value || null;
                              await tasksApi.update(t.id, { due_date: val });
                              setTasks(prev => prev.map(x => x.id === t.id ? { ...x, due_date: val } : x));
                            }}
                            className="text-[11px] rounded-lg px-2 py-1 outline-none flex-shrink-0 cursor-pointer"
                            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: t.due_date ? 'rgba(148,163,184,0.7)' : 'rgba(100,116,139,0.3)', colorScheme: 'dark', width: '120px' }} />
                          <span className="text-[10px] flex-shrink-0" style={{ color: sc.color }}>{sc.label}</span>
                        </div>
                      </div>
                    );
                  };
                  return (
                    <div className="space-y-2">
                      {normalTasks.map(renderTask)}
                      {reworkTasks.length > 0 && (
                        <>
                          <div className="flex items-center gap-2 pt-1">
                            <div className="flex-1 h-px" style={{ background: 'rgba(248,113,113,0.2)' }} />
                            <span className="text-[10px] font-semibold uppercase tracking-widest flex-shrink-0"
                              style={{ color: 'rgba(248,113,113,0.6)' }}>Retrabalho</span>
                            <div className="flex-1 h-px" style={{ background: 'rgba(248,113,113,0.2)' }} />
                          </div>
                          {reworkTasks.map(renderTask)}
                        </>
                      )}
                    </div>
                  );
                })()
              }

              {showTaskForm && (
                <div className="rounded-xl p-3 mt-2 space-y-2"
                  style={{ background: 'rgba(59,130,246,0.04)', border: '1px solid rgba(59,130,246,0.15)' }}>
                  <input
                    value={newTask.title}
                    onChange={e => setNewTask(n => ({ ...n, title: e.target.value }))}
                    placeholder="Título da tarefa…"
                    autoFocus
                    className="w-full px-3 py-2 rounded-lg text-xs text-white outline-none"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <select value={newTask.priority} onChange={e => setNewTask(n => ({ ...n, priority: e.target.value }))}
                      className="px-3 py-2 rounded-lg text-xs outline-none"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(148,163,184,0.9)', cursor: 'pointer' }}>
                      <option value="urgente">Urgente</option>
                      <option value="alta">Alta</option>
                      <option value="media">Média</option>
                      <option value="baixa">Baixa</option>
                    </select>
                    <input type="date" value={newTask.due_date} onChange={e => setNewTask(n => ({ ...n, due_date: e.target.value }))}
                      className="px-3 py-2 rounded-lg text-xs outline-none"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(148,163,184,0.9)' }} />
                  </div>
                  <select value={newTask.assigned_to} onChange={e => setNewTask(n => ({ ...n, assigned_to: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: newTask.assigned_to ? 'rgba(148,163,184,0.9)' : 'rgba(100,116,139,0.45)', cursor: 'pointer' }}>
                    <option value="">Sem responsável</option>
                    {users.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                  <button
                    onClick={() => setNewTask(n => ({ ...n, is_rework: !n.is_rework }))}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all"
                    style={{
                      background: newTask.is_rework ? 'rgba(248,113,113,0.1)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${newTask.is_rework ? 'rgba(248,113,113,0.3)' : 'rgba(255,255,255,0.07)'}`,
                      color: newTask.is_rework ? '#f87171' : 'rgba(100,116,139,0.5)',
                    }}>
                    <RotateCcw size={11} />
                    Marcar como retrabalho
                    {newTask.is_rework && <span className="ml-auto text-[10px] font-semibold" style={{ color: '#f87171' }}>✓</span>}
                  </button>
                  <div className="flex gap-2">
                    <button onClick={() => setShowTaskForm(false)}
                      className="flex-1 py-1.5 rounded-lg text-xs"
                      style={{ color: 'rgba(100,116,139,0.6)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      Cancelar
                    </button>
                    <button onClick={handleAddTask} disabled={savingTask || !newTask.title.trim()}
                      className="flex-1 py-1.5 rounded-lg text-xs font-medium text-white disabled:opacity-40"
                      style={{ background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.3)' }}>
                      {savingTask ? 'Criando…' : 'Criar'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}


          </div>{/* /max-w-2xl */}
        </div>{/* /overflow-y-auto */}
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

      {openTaskId && (
        <TaskDetailDrawer
          taskId={openTaskId}
          onClose={() => setOpenTaskId(null)}
          onUpdated={updated => {
            setTasks(prev => prev.map(t => t.id === updated.id ? { ...t, ...updated } : t));
          }}
        />
      )}
    </>,
    document.body
  );
}
