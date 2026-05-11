import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X, Play, Pause, CheckCircle2, Send, Upload, Trash2,
  FileText, File, Image as ImageIcon, Video, Download,
  Clock, AlertTriangle, Pencil, Check,
} from 'lucide-react';
import { tasksApi, taskCategoriesApi, uploadAnyApi, usersApi } from '../../api/client';

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  a_fazer:      { label: 'A fazer',      color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' },
  em_andamento: { label: 'Em andamento', color: '#60a5fa', bg: 'rgba(96,165,250,0.1)'  },
  pausada:      { label: 'Pausada',      color: '#f59e0b', bg: 'rgba(245,158,11,0.1)'  },
  concluida:    { label: 'Concluída',    color: '#34d399', bg: 'rgba(52,211,153,0.1)'  },
};

function fileIcon(mime: string) {
  if (mime.startsWith('image/')) return <ImageIcon size={14} />;
  if (mime.startsWith('video/')) return <Video size={14} />;
  if (mime === 'application/pdf') return <FileText size={14} />;
  return <File size={14} />;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface Props {
  taskId: number;
  onClose: () => void;
  onUpdated?: (task: any) => void;
}

export default function TaskDetailDrawer({ taskId, onClose, onUpdated }: Props) {
  const [task, setTask] = useState<any>(null);
  const [tab, setTab] = useState<'descricao' | 'arquivos' | 'chat'>('descricao');
  const [categories, setCategories] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  // Description tab
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>('');
  const [savingDesc, setSavingDesc] = useState(false);

  // Title editing
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const titleRef = useRef<HTMLInputElement>(null);

  // Assignee editing
  const [editingAssignee, setEditingAssignee] = useState(false);

  // Chat tab
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState('');
  const [sendingComment, setSendingComment] = useState(false);

  // Files tab
  const [files, setFiles] = useState<any[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Timer
  const [acting, setActing] = useState(false);

  useEffect(() => {
    tasksApi.get(taskId).then(r => {
      const t = r.data;
      setTask(t);
      setDescription(t.description || '');
      setCategory(t.category || '');
      setTitleDraft(t.title || '');
    });
    tasksApi.listComments(taskId).then(r => setComments(r.data || []));
    tasksApi.listFiles(taskId).then(r => setFiles(r.data || []));
    taskCategoriesApi.list().then(r => setCategories(r.data || []));
    usersApi.list().then(r => setUsers((r.data || []).filter((u: any) => u.role !== 'client')));
  }, [taskId]);

  useEffect(() => {
    if (editingTitle && titleRef.current) titleRef.current.focus();
  }, [editingTitle]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  const refresh = async () => {
    const r = await tasksApi.get(taskId);
    setTask(r.data);
    onUpdated?.(r.data);
  };

  const saveTitle = async () => {
    if (!titleDraft.trim() || !task) return;
    setEditingTitle(false);
    if (titleDraft.trim() === task.title) return;
    await tasksApi.update(taskId, { ...task, title: titleDraft.trim() });
    setTask((t: any) => ({ ...t, title: titleDraft.trim() }));
    onUpdated?.({ ...task, title: titleDraft.trim() });
  };

  const saveAssignee = async (userId: string) => {
    setEditingAssignee(false);
    const uid = userId ? Number(userId) : null;
    const assignedUser = users.find((u: any) => u.id === uid);
    await tasksApi.update(taskId, { ...task, assigned_to: uid });
    setTask((t: any) => ({ ...t, assigned_to: uid, assigned_name: assignedUser?.name || null }));
    onUpdated?.({ ...task, assigned_to: uid, assigned_name: assignedUser?.name || null });
  };

  const saveDescription = async () => {
    if (!task) return;
    setSavingDesc(true);
    await tasksApi.update(taskId, { ...task, description, category: category || null });
    setTask((t: any) => ({ ...t, description, category: category || null }));
    onUpdated?.({ ...task, description, category: category || null });
    setSavingDesc(false);
  };

  const handleTimer = async (action: 'start' | 'pause' | 'complete') => {
    setActing(true);
    if (action === 'start') await tasksApi.start(taskId);
    else if (action === 'pause') await tasksApi.pause(taskId);
    else await tasksApi.complete(taskId);
    await refresh();
    setActing(false);
  };

  const sendComment = async () => {
    if (!commentText.trim()) return;
    setSendingComment(true);
    const r = await tasksApi.addComment(taskId, commentText.trim());
    setComments(prev => [...prev, r.data]);
    setCommentText('');
    setSendingComment(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (!selected.length) return;
    setUploadingFiles(true);
    try {
      const r = await uploadAnyApi.files(selected);
      for (const f of (r.data.files || [])) {
        const res = await tasksApi.addFile(taskId, { name: f.name, url: f.url, mime_type: f.mime_type, size: f.size });
        setFiles(prev => [...prev, res.data]);
      }
    } finally {
      setUploadingFiles(false);
      e.target.value = '';
    }
  };

  const removeFile = async (fileId: number) => {
    await tasksApi.removeFile(taskId, fileId);
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const descDirty = task && (description !== (task.description || '') || category !== (task.category || ''));

  const reworkCategories = categories.filter(c => c.is_rework);
  const normalCategories = categories.filter(c => !c.is_rework);
  const selectedCategory = categories.find(c => c.id === Number(category) || c.label === category);

  if (!task) return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
      <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
        style={{ borderColor: 'rgba(59,130,246,0.3)', borderTopColor: '#3b82f6' }} />
    </div>,
    document.body
  );

  const sc = STATUS_CFG[task.status] || STATUS_CFG.a_fazer;
  const isRunning = task.status === 'em_andamento';

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>

      <div className="w-full max-w-lg flex flex-col rounded-2xl overflow-hidden"
        style={{
          background: '#0a0a1a',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.8)',
          maxHeight: '85vh',
          animation: 'scaleIn 0.18s ease',
        }}>

        {/* Header */}
        <div className="flex-shrink-0 px-5 pt-5 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="flex items-start gap-2 mb-3">
            <div className="flex-1 min-w-0">
              {editingTitle ? (
                <input
                  ref={titleRef}
                  value={titleDraft}
                  onChange={e => setTitleDraft(e.target.value)}
                  onBlur={saveTitle}
                  onKeyDown={e => {
                    if (e.key === 'Enter') saveTitle();
                    if (e.key === 'Escape') { setEditingTitle(false); setTitleDraft(task.title); }
                  }}
                  className="w-full text-base font-semibold text-white bg-transparent border-b outline-none pb-0.5"
                  style={{ borderColor: 'rgba(59,130,246,0.5)' }}
                />
              ) : (
                <button className="group flex items-center gap-1.5 text-left w-full"
                  onClick={() => setEditingTitle(true)}>
                  <h2 className="text-base font-semibold text-white leading-snug">{task.title}</h2>
                  <Pencil size={11} className="flex-shrink-0 opacity-0 group-hover:opacity-40 transition-opacity" style={{ color: '#94a3b8' }} />
                </button>
              )}
            </div>
            <button onClick={onClose} className="flex-shrink-0 p-1.5 rounded-lg transition-colors"
              style={{ color: 'rgba(100,116,139,0.5)' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#94a3b8')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(100,116,139,0.5)')}>
              <X size={16} />
            </button>
          </div>

          {/* Meta row */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full"
              style={{ color: sc.color, background: sc.bg }}>
              {sc.label}
            </span>

            {/* Editable assignee */}
            {editingAssignee ? (
              <select autoFocus
                defaultValue={task.assigned_to || ''}
                onChange={e => saveAssignee(e.target.value)}
                onBlur={() => setEditingAssignee(false)}
                className="text-[11px] rounded-lg px-2 py-1 outline-none"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(59,130,246,0.3)', color: '#e2e8f0', cursor: 'pointer' }}>
                <option value="">Sem responsável</option>
                {users.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            ) : (
              <button onClick={() => setEditingAssignee(true)}
                className="group flex items-center gap-1 text-[11px] transition-colors"
                style={{ color: task.assigned_name ? 'rgba(148,163,184,0.8)' : 'rgba(100,116,139,0.4)' }}
                title="Clique para mudar responsável">
                {task.assigned_name || 'Sem responsável'}
                <Pencil size={9} className="opacity-0 group-hover:opacity-50 transition-opacity" />
              </button>
            )}

            {task.client_name && (
              <span className="text-[11px]" style={{ color: 'rgba(100,116,139,0.4)' }}>· {task.client_name}</span>
            )}
            {selectedCategory && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                style={{
                  background: `${selectedCategory.color}18`,
                  color: selectedCategory.color,
                  border: `1px solid ${selectedCategory.color}30`,
                }}>
                {selectedCategory.label}
              </span>
            )}
          </div>

          {/* Timer controls */}
          {task.status !== 'concluida' && (
            <div className="flex items-center gap-2 mt-3">
              {isRunning ? (
                <button onClick={() => handleTimer('pause')} disabled={acting}
                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg disabled:opacity-50"
                  style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }}>
                  <Pause size={11} /> Pausar
                </button>
              ) : (
                <button onClick={() => handleTimer('start')} disabled={acting}
                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg disabled:opacity-50"
                  style={{ background: 'rgba(96,165,250,0.1)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.2)' }}>
                  <Play size={11} /> Iniciar
                </button>
              )}
              <button onClick={() => handleTimer('complete')} disabled={acting}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg disabled:opacity-50"
                style={{ background: 'rgba(52,211,153,0.08)', color: '#34d399', border: '1px solid rgba(52,211,153,0.2)' }}>
                <CheckCircle2 size={11} /> Concluir
              </button>
              {task.total_minutes > 0 && (
                <span className="ml-auto flex items-center gap-1 text-[11px]" style={{ color: 'rgba(100,116,139,0.5)' }}>
                  <Clock size={10} />
                  {Math.floor(task.total_minutes / 60) > 0 ? `${Math.floor(task.total_minutes / 60)}h ` : ''}
                  {task.total_minutes % 60}m
                </span>
              )}
            </div>
          )}
          {task.status === 'concluida' && (
            <div className="flex items-center gap-1.5 mt-3 text-xs" style={{ color: '#34d399' }}>
              <CheckCircle2 size={12} /> Concluída
              {task.total_minutes > 0 && (
                <span className="ml-auto flex items-center gap-1" style={{ color: 'rgba(100,116,139,0.5)' }}>
                  <Clock size={10} />
                  {Math.floor(task.total_minutes / 60) > 0 ? `${Math.floor(task.total_minutes / 60)}h ` : ''}
                  {task.total_minutes % 60}m
                </span>
              )}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex-shrink-0 flex" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          {([
            { id: 'descricao', label: 'Descrição' },
            { id: 'arquivos',  label: `Arquivos${files.length > 0 ? ` (${files.length})` : ''}` },
            { id: 'chat',      label: `Chat${comments.length > 0 ? ` (${comments.length})` : ''}` },
          ] as const).map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="px-5 py-3 text-xs font-medium transition-all relative"
              style={{ color: tab === t.id ? '#93c5fd' : 'rgba(100,116,139,0.5)' }}>
              {t.label}
              {tab === t.id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t"
                  style={{ background: '#3b82f6' }} />
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto min-h-0">

          {/* Descrição */}
          {tab === 'descricao' && (
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[11px] font-medium mb-1.5" style={{ color: 'rgba(100,116,139,0.6)' }}>Descrição</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Detalhe o que precisa ser feito..."
                  rows={5}
                  className="w-full rounded-xl px-3 py-2.5 text-sm text-white resize-none outline-none"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', lineHeight: '1.6' }}
                  onFocus={e => (e.currentTarget.style.borderColor = 'rgba(59,130,246,0.4)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)')}
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium mb-1.5" style={{ color: 'rgba(100,116,139,0.6)' }}>Categoria</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full rounded-xl px-3 py-2.5 text-sm outline-none appearance-none"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', color: category ? '#f9fafb' : 'rgba(100,116,139,0.5)' }}>
                  <option value="">Tarefa normal</option>
                  {normalCategories.length > 0 && (
                    <optgroup label="Outras">
                      {normalCategories.map(c => <option key={c.id} value={String(c.id)}>{c.label}</option>)}
                    </optgroup>
                  )}
                  {reworkCategories.length > 0 && (
                    <optgroup label="Retrabalho">
                      {reworkCategories.map(c => <option key={c.id} value={String(c.id)}>{c.label}</option>)}
                    </optgroup>
                  )}
                </select>
              </div>

              {descDirty && (
                <button onClick={saveDescription} disabled={savingDesc}
                  className="flex items-center gap-1.5 text-xs font-medium px-4 py-2 rounded-lg disabled:opacity-50"
                  style={{ background: 'rgba(59,130,246,0.15)', color: '#93c5fd', border: '1px solid rgba(59,130,246,0.25)' }}>
                  <Check size={12} /> {savingDesc ? 'Salvando…' : 'Salvar alterações'}
                </button>
              )}

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-medium mb-1.5" style={{ color: 'rgba(100,116,139,0.6)' }}>Prazo</label>
                  <input type="date" value={task.due_date || ''}
                    onChange={async e => {
                      await tasksApi.update(taskId, { ...task, due_date: e.target.value || null });
                      setTask((t: any) => ({ ...t, due_date: e.target.value || null }));
                    }}
                    className="w-full rounded-xl px-3 py-2 text-xs text-white outline-none"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }} />
                </div>
                <div>
                  <label className="block text-[11px] font-medium mb-1.5" style={{ color: 'rgba(100,116,139,0.6)' }}>Estimativa (min)</label>
                  <input type="number" value={task.estimated_minutes || ''}
                    onChange={async e => {
                      const v = Number(e.target.value) || null;
                      await tasksApi.update(taskId, { ...task, estimated_minutes: v });
                      setTask((t: any) => ({ ...t, estimated_minutes: v }));
                    }}
                    placeholder="—"
                    className="w-full rounded-xl px-3 py-2 text-xs text-white outline-none"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }} />
                </div>
              </div>

              {task.due_date && new Date(task.due_date) < new Date() && task.status !== 'concluida' && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs"
                  style={{ background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.15)', color: '#f87171' }}>
                  <AlertTriangle size={12} /> Prazo vencido
                </div>
              )}
            </div>
          )}

          {/* Arquivos */}
          {tab === 'arquivos' && (
            <div className="p-5 space-y-3">
              <button onClick={() => fileInputRef.current?.click()} disabled={uploadingFiles}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-medium transition-all disabled:opacity-50"
                style={{ background: 'rgba(59,130,246,0.06)', border: '1px dashed rgba(59,130,246,0.25)', color: '#93c5fd' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(59,130,246,0.1)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(59,130,246,0.06)')}>
                <Upload size={13} /> {uploadingFiles ? 'Enviando…' : 'Enviar arquivos'}
              </button>
              <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileUpload} />
              {files.length === 0 ? (
                <p className="text-center text-xs py-8" style={{ color: 'rgba(100,116,139,0.4)' }}>Nenhum arquivo anexado</p>
              ) : files.map(f => (
                <div key={f.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <span style={{ color: 'rgba(100,116,139,0.6)' }}>{fileIcon(f.mime_type || '')}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white truncate">{f.name}</p>
                    {f.size > 0 && <p className="text-[10px]" style={{ color: 'rgba(100,116,139,0.4)' }}>{formatSize(f.size)}</p>}
                  </div>
                  <a href={f.url} target="_blank" rel="noreferrer"
                    className="p-1.5 rounded-lg transition-colors" style={{ color: 'rgba(100,116,139,0.4)' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#93c5fd')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'rgba(100,116,139,0.4)')}>
                    <Download size={13} />
                  </a>
                  <button onClick={() => removeFile(f.id)}
                    className="p-1.5 rounded-lg transition-colors" style={{ color: 'rgba(100,116,139,0.4)' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'rgba(100,116,139,0.4)')}>
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Chat */}
          {tab === 'chat' && (
            <div className="flex flex-col" style={{ minHeight: '300px' }}>
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {comments.length === 0 ? (
                  <p className="text-center text-xs py-8" style={{ color: 'rgba(100,116,139,0.4)' }}>Nenhuma mensagem ainda</p>
                ) : comments.map(c => (
                  <div key={c.id} className="flex gap-2.5">
                    <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white overflow-hidden"
                      style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)' }}>
                      {c.user_avatar
                        ? <img src={c.user_avatar} alt={c.user_name} className="w-7 h-7 object-cover" />
                        : c.user_name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 mb-0.5">
                        <span className="text-xs font-medium text-white">{c.user_name}</span>
                        <span className="text-[10px]" style={{ color: 'rgba(100,116,139,0.4)' }}>
                          {new Date(c.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs text-white leading-relaxed" style={{ wordBreak: 'break-word' }}>{c.content}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex-shrink-0 p-4" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="flex gap-2">
                  <textarea
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendComment(); } }}
                    placeholder="Escreva… (Enter para enviar)"
                    rows={2}
                    className="flex-1 rounded-xl px-3 py-2 text-xs text-white resize-none outline-none"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                    onFocus={e => (e.currentTarget.style.borderColor = 'rgba(59,130,246,0.4)')}
                    onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)')}
                  />
                  <button onClick={sendComment} disabled={sendingComment || !commentText.trim()}
                    className="p-2.5 rounded-xl self-end disabled:opacity-30"
                    style={{ background: 'rgba(59,130,246,0.15)', color: '#93c5fd', border: '1px solid rgba(59,130,246,0.25)' }}>
                    <Send size={14} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes scaleIn {
          from { transform: scale(0.95); opacity: 0; }
          to   { transform: scale(1);    opacity: 1; }
        }
      `}</style>
    </div>,
    document.body
  );
}
