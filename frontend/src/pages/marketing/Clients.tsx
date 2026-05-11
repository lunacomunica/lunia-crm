import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, X, Briefcase, Instagram, Clock, Eye, Camera } from 'lucide-react';
import { agencyClientsApi, uploadAnyApi } from '../../api/client';
import { AgencyClient } from '../../types';
import { useAuth } from '../../context/AuthContext';

const emptyForm = { name: '', segment: '', contact_name: '', contact_email: '', instagram_handle: '', logo: '' };

export default function MarketingClients() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [clients, setClients] = useState<AgencyClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<AgencyClient | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const load = () => { setLoading(true); agencyClientsApi.list().then(r => { setClients(r.data); setLoading(false); }); };
  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setModal(true); };
  const openEdit = (c: AgencyClient) => {
    setEditing(c);
    setForm({ name: c.name, segment: c.segment || '', contact_name: c.contact_name || '', contact_email: c.contact_email || '', instagram_handle: c.instagram_handle || '', logo: c.logo || '' });
    setModal(true);
  };

  const handleLogoUpload = async (file: File) => {
    setUploadingLogo(true);
    try {
      const r = await uploadAnyApi.files([file]);
      setForm(f => ({ ...f, logo: r.data.files[0].url }));
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    if (editing) await agencyClientsApi.update(editing.id, form);
    else await agencyClientsApi.create(form);
    setSaving(false); setModal(false); load();
  };

  const handleDelete = async (id: number) => {
    await agencyClientsApi.delete(id); setDeleting(null); load();
  };

  const canEdit = user?.role !== 'team';

  return (
    <div className="p-4 md:p-8 animate-fade-up">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="section-label mb-1">Marketing</p>
          <h1 className="text-3xl font-extralight text-white tracking-tight" style={{ textShadow: '0 0 30px rgba(59,130,246,0.2)' }}>
            Clientes
          </h1>
          <p className="text-sm mt-1" style={{ color: 'rgba(100,116,139,0.7)' }}>
            {clients.filter(c => c.active).length} clientes ativos
          </p>
        </div>
        {canEdit && (
          <button onClick={openCreate} className="btn-primary"><Plus size={15} /> Novo Cliente</button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: 'rgba(59,130,246,0.3)', borderTopColor: '#3b82f6' }} />
        </div>
      ) : clients.length === 0 ? (
        <div className="flex flex-col items-center py-24" style={{ color: 'rgba(100,116,139,0.5)' }}>
          <Briefcase size={40} className="mb-4" style={{ color: 'rgba(100,116,139,0.2)' }} />
          <p className="text-sm mb-4">Nenhum cliente cadastrado ainda</p>
          {canEdit && <button onClick={openCreate} className="btn-primary"><Plus size={14} /> Cadastrar primeiro cliente</button>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map(c => (
            <div key={c.id} onClick={() => navigate(`/marketing/clients/${c.id}`)}
              className="card p-5 cursor-pointer group transition-all duration-200 hover:border-blue-500/20"
              style={{ borderColor: c.active ? 'rgba(59,130,246,0.1)' : 'rgba(100,116,139,0.06)' }}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  {c.logo ? (
                    <img src={c.logo} alt={c.name} className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)' }}>
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-semibold text-white">{c.name}</p>
                    {c.segment && <p className="text-xs" style={{ color: 'rgba(100,116,139,0.55)' }}>{c.segment}</p>}
                  </div>
                </div>
                {(
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                    <button onClick={() => navigate(`/marketing/portal/${c.id}`)}
                      className="p-1.5 rounded-lg transition-all" title="Visualizar como cliente"
                      style={{ color: 'rgba(100,116,139,0.5)' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#f59e0b'; (e.currentTarget as HTMLElement).style.background = 'rgba(245,158,11,0.1)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(100,116,139,0.5)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                      <Eye size={13} />
                    </button>
                    <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg transition-all"
                      style={{ color: 'rgba(100,116,139,0.5)' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#60a5fa'; (e.currentTarget as HTMLElement).style.background = 'rgba(59,130,246,0.1)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(100,116,139,0.5)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => setDeleting(c.id)} className="p-1.5 rounded-lg transition-all"
                      style={{ color: 'rgba(100,116,139,0.5)' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#f87171'; (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.1)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(100,116,139,0.5)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                )}
              </div>

              {c.instagram_handle && (
                <div className="flex items-center gap-1.5 mb-4">
                  <Instagram size={11} style={{ color: 'rgba(236,72,153,0.6)' }} />
                  <span className="text-xs" style={{ color: 'rgba(236,72,153,0.6)' }}>@{c.instagram_handle}</span>
                </div>
              )}

              <div className="flex items-center gap-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                <div className="flex items-center gap-1.5">
                  <FileImageIcon size={11} style={{ color: 'rgba(100,116,139,0.5)' }} />
                  <span className="text-xs" style={{ color: 'rgba(100,116,139,0.6)' }}>{c.content_count || 0} peças</span>
                </div>
                {(c.pending_approvals || 0) > 0 && (
                  <div className="flex items-center gap-1 ml-auto">
                    <Clock size={11} style={{ color: '#f59e0b' }} />
                    <span className="text-xs font-medium" style={{ color: '#f59e0b' }}>{c.pending_approvals} aguardando</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4 animate-fade"
          style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)' }}>
          <div className="modal-card w-full max-w-md animate-fade-up">
            <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid rgba(59,130,246,0.1)' }}>
              <div>
                <p className="section-label mb-0.5">{editing ? 'Editar' : 'Novo'}</p>
                <h2 className="text-lg font-light text-white">{editing ? editing.name : 'Cadastrar Cliente'}</h2>
              </div>
              <button onClick={() => setModal(false)} className="p-1.5 rounded-lg transition-colors"
                style={{ color: 'rgba(100,116,139,0.6)' }}><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              {/* Logo upload */}
              <div className="flex justify-center">
                <input ref={logoInputRef} type="file" accept="image/*" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f); e.target.value = ''; }} />
                <button onClick={() => logoInputRef.current?.click()}
                  className="relative w-20 h-20 rounded-2xl overflow-hidden transition-all group"
                  style={{ background: 'rgba(59,130,246,0.08)', border: '2px dashed rgba(59,130,246,0.25)' }}>
                  {uploadingLogo ? (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'rgba(59,130,246,0.3)', borderTopColor: '#3b82f6' }} />
                    </div>
                  ) : form.logo ? (
                    <>
                      <img src={form.logo} alt="logo" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ background: 'rgba(0,0,0,0.5)' }}>
                        <Camera size={16} color="white" />
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                      <Camera size={18} style={{ color: 'rgba(59,130,246,0.6)' }} />
                      <span className="text-[10px]" style={{ color: 'rgba(100,116,139,0.5)' }}>Logo</span>
                    </div>
                  )}
                </button>
              </div>
              <div>
                <label className="label-dark">Nome da empresa *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="input-dark" placeholder="Ex: Studio Z" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-dark">Segmento</label>
                  <input value={form.segment} onChange={e => setForm({ ...form, segment: e.target.value })} className="input-dark" placeholder="Ex: Moda, Gastronomia" />
                </div>
                <div>
                  <label className="label-dark">Instagram</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'rgba(100,116,139,0.5)' }}>@</span>
                    <input value={form.instagram_handle} onChange={e => setForm({ ...form, instagram_handle: e.target.value })} className="input-dark pl-7" placeholder="handle" />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-dark">Contato</label>
                  <input value={form.contact_name} onChange={e => setForm({ ...form, contact_name: e.target.value })} className="input-dark" placeholder="Nome do responsável" />
                </div>
                <div>
                  <label className="label-dark">E-mail</label>
                  <input type="email" value={form.contact_email} onChange={e => setForm({ ...form, contact_email: e.target.value })} className="input-dark" placeholder="email@cliente.com" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={() => setModal(false)} className="btn-ghost flex-1 justify-center">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 justify-center">
                {saving ? 'Salvando…' : editing ? 'Salvar' : 'Cadastrar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleting && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4 animate-fade"
          style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)' }}>
          <div className="modal-card w-full max-w-sm p-6 animate-fade-up">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)' }}>
              <Trash2 size={16} className="icon-red" />
            </div>
            <h3 className="text-white font-medium mb-2">Remover cliente?</h3>
            <p className="text-sm mb-5" style={{ color: 'rgba(148,163,184,0.55)' }}>
              Todos os conteúdos vinculados serão removidos também.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleting(null)} className="btn-ghost flex-1 justify-center">Cancelar</button>
              <button onClick={() => handleDelete(deleting)} className="btn-danger flex-1 justify-center">Remover</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FileImageIcon({ size, style }: { size: number; style?: any }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={style}>
      <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
    </svg>
  );
}
