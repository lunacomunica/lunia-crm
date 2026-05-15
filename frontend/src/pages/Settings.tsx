import { useEffect, useState, useRef } from 'react';
import { Key, Copy, CheckCircle2, AlertCircle, ExternalLink, RefreshCw, Zap, MessageSquare, Instagram, Shield, Users, Plus, Trash2, X, User, Camera, Building2, AlertTriangle, Eye, Pencil, Tag } from 'lucide-react';
import { settingsApi, usersApi, profileApi, agencyClientsApi, taskCategoriesApi, uploadAnyApi, metaApi } from '../api/client';
import { useAuth } from '../context/AuthContext';

function Field({ label, id, value, onChange, placeholder, type = 'text', hint, mono = false }: {
  label: string; id: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; hint?: string; mono?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="label-dark">{label}</label>
      <input id={id} type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} className={`input-dark ${mono ? 'input-mono' : ''}`} />
      {hint && <p className="text-xs mt-1" style={{ color: 'rgba(100,116,139,0.5)' }}>{hint}</p>}
    </div>
  );
}

function Section({ icon: Icon, title, iconStyle, children, testType, onTest, testResult }: {
  icon: any; title: string; iconStyle?: string; children: React.ReactNode;
  testType?: string; onTest?: (t: string) => void; testResult?: { success: boolean; message: string };
}) {
  const [testing, setTesting] = useState(false);
  const handleTest = async () => { if (!onTest || !testType) return; setTesting(true); await onTest(testType); setTesting(false); };
  return (
    <div className="card p-6 mb-5">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <Icon size={15} className={iconStyle} />
          </div>
          <h2 className="text-base font-light text-white">{title}</h2>
        </div>
        <div className="flex items-center gap-3">
          {testResult && (
            <span className={`flex items-center gap-1.5 text-xs ${testResult.success ? 'text-emerald-400' : 'text-red-400'}`}>
              {testResult.success ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
              {testResult.message}
            </span>
          )}
          {testType && (
            <button onClick={handleTest} disabled={testing} className="btn-ghost px-3 py-1.5 text-xs" style={{ fontSize: '0.7rem' }}>
              <RefreshCw size={10} className={testing ? 'animate-spin' : ''} /> Testar conexão
            </button>
          )}
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function ProfileTab() {
  const { user, refreshUser } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [company, setCompany] = useState({ name: user?.company?.name || '', cnpj: user?.company?.cnpj || '', phone: user?.company?.phone || '', website: user?.company?.website || '', address: user?.company?.address || '' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const handleAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setAvatar(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (password && password !== confirmPassword) { setError('As senhas não coincidem'); return; }
    if (password && password.length < 6) { setError('Senha deve ter pelo menos 6 caracteres'); return; }
    setError(''); setSaving(true);
    try {
      await profileApi.update({ name, email, ...(password ? { password } : {}), avatar, company });
      await refreshUser();
      setSaved(true); setTimeout(() => setSaved(false), 3000);
      setPassword(''); setConfirmPassword('');
    } catch (e: any) {
      setError(e.response?.data?.error || 'Erro ao salvar');
    }
    setSaving(false);
  };

  const initials = name.charAt(0).toUpperCase();

  return (
    <div className="max-w-2xl space-y-5">
      {/* Avatar */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <User size={15} className="icon-blue" />
          </div>
          <h2 className="text-base font-light text-white">Foto de Perfil</h2>
        </div>
        <div className="flex items-center gap-6">
          <div className="relative group cursor-pointer" onClick={() => fileRef.current?.click()}>
            {avatar ? (
              <img src={avatar} alt="avatar" className="w-20 h-20 rounded-full object-cover" style={{ border: '2px solid rgba(59,130,246,0.3)' }} />
            ) : (
              <div className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold"
                style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)', border: '2px solid rgba(59,130,246,0.3)' }}>
                {initials}
              </div>
            )}
            <div className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: 'rgba(0,0,0,0.55)' }}>
              <Camera size={18} className="text-white" />
            </div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatar} />
          <div>
            <p className="text-sm text-white font-medium">Clique na foto para alterar</p>
            <p className="text-xs mt-1" style={{ color: 'rgba(100,116,139,0.5)' }}>JPG, PNG ou GIF · Máx 2MB</p>
            {avatar && (
              <button onClick={() => setAvatar('')} className="text-xs mt-2 transition-colors"
                style={{ color: 'rgba(239,68,68,0.6)' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(239,68,68,0.6)')}>
                Remover foto
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Dados pessoais */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <Key size={15} className="icon-blue" />
          </div>
          <h2 className="text-base font-light text-white">Dados Pessoais</h2>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nome" id="p-name" value={name} onChange={setName} placeholder="Seu nome" />
            <Field label="E-mail" id="p-email" value={email} onChange={setEmail} placeholder="seu@email.com" type="email" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nova Senha" id="p-pass" value={password} onChange={setPassword} placeholder="Deixe vazio para não alterar" type="password" />
            <Field label="Confirmar Senha" id="p-pass2" value={confirmPassword} onChange={setConfirmPassword} placeholder="Repita a nova senha" type="password" />
          </div>
        </div>
      </div>

      {/* Dados da empresa */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <Building2 size={15} className="icon-blue" />
          </div>
          <h2 className="text-base font-light text-white">Dados da Empresa</h2>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Razão Social / Nome" id="c-name" value={company.name} onChange={v => setCompany({ ...company, name: v })} placeholder="Luna Comunicação Ltda" />
            <Field label="CNPJ" id="c-cnpj" value={company.cnpj} onChange={v => setCompany({ ...company, cnpj: v })} placeholder="00.000.000/0001-00" mono />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Telefone / WhatsApp" id="c-phone" value={company.phone} onChange={v => setCompany({ ...company, phone: v })} placeholder="+55 11 99999-9999" />
            <Field label="Website" id="c-website" value={company.website} onChange={v => setCompany({ ...company, website: v })} placeholder="https://lunacomunica.com" />
          </div>
          <Field label="Endereço" id="c-address" value={company.address} onChange={v => setCompany({ ...company, address: v })} placeholder="Rua Exemplo, 123 — São Paulo, SP" />
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm px-4 py-3 rounded-xl"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
          <AlertCircle size={14} /> {error}
        </div>
      )}

      <div className="flex items-center gap-4">
        <button onClick={handleSave} disabled={saving} className="btn-primary px-8">
          {saving ? <RefreshCw size={14} className="animate-spin" /> : <Key size={14} />}
          {saving ? 'Salvando…' : 'Salvar Perfil'}
        </button>
        {saved && (
          <span className="flex items-center gap-2 text-sm animate-fade-up" style={{ color: '#34d399' }}>
            <CheckCircle2 size={15} /> Salvo com sucesso!
          </span>
        )}
      </div>
    </div>
  );
}

const ROLE_LABEL: Record<string, string> = { owner: 'Proprietária', manager: 'Gestão', team: 'Time', client: 'Cliente' };
const ROLE_BADGE: Record<string, string> = { owner: 'badge-blue', manager: 'badge-slate', team: 'badge-purple', client: 'badge-amber' };

function UsersTab() {
  const { user: me } = useAuth();
  const [userTab, setUserTab] = useState<'team' | 'client'>('team');
  const [users, setUsers] = useState<any[]>([]);
  const [agencyClients, setAgencyClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'manager', agency_client_id: '', job_title: '', avatar: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarRef = useRef<HTMLInputElement>(null);
  const [clientModal, setClientModal] = useState<any | null>(null);
  const [clientPerms, setClientPerms] = useState<number[]>([]);
  const [savingPerms, setSavingPerms] = useState(false);

  const teamUsers = users.filter(u => u.role !== 'client');
  const clientUsers = users.filter(u => u.role === 'client');
  const displayed = userTab === 'team' ? teamUsers : clientUsers;

  const load = () => { setLoading(true); usersApi.list().then(r => { setUsers(r.data); setLoading(false); }); };
  useEffect(() => { load(); agencyClientsApi.list().then(r => setAgencyClients(r.data.filter((c: any) => c.active))); }, []);

  const openClientModal = async (u: any) => {
    const r = await usersApi.getClients(u.id);
    setClientPerms(r.data);
    setClientModal(u);
  };
  const toggleClient = (id: number) => setClientPerms(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const saveClientPerms = async () => {
    if (!clientModal) return;
    setSavingPerms(true);
    await usersApi.setClients(clientModal.id, clientPerms);
    setSavingPerms(false);
    setClientModal(null);
  };

  const handleAvatarUpload = async (file: File) => {
    setUploadingAvatar(true);
    try {
      const r = await uploadAnyApi.files([file]);
      setForm(f => ({ ...f, avatar: r.data.files[0].url }));
    } finally {
      setUploadingAvatar(false);
    }
  };

  const openCreate = () => {
    setEditingUser(null);
    setForm({ name: '', email: '', password: '', role: userTab === 'client' ? 'client' : 'manager', agency_client_id: '', job_title: '', avatar: '' });
    setError('');
    setModal(true);
  };

  const openEdit = (u: any) => {
    setEditingUser(u);
    setForm({ name: u.name, email: u.email, password: '', role: u.role, agency_client_id: u.agency_client_id ? String(u.agency_client_id) : '', job_title: u.job_title || '', avatar: u.avatar || '' });
    setError('');
    setModal(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.email) { setError('Nome e e-mail são obrigatórios'); return; }
    if (!editingUser && !form.password) { setError('Senha é obrigatória para novo usuário'); return; }
    setSaving(true); setError('');
    try {
      const payload: any = { name: form.name, email: form.email, role: form.role, job_title: form.job_title, agency_client_id: form.agency_client_id || null, avatar: form.avatar || null };
      if (form.password) payload.password = form.password;
      if (editingUser) {
        await usersApi.update(editingUser.id, payload);
      } else {
        await usersApi.create({ ...payload, password: form.password });
      }
      setModal(false); load();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Erro ao salvar usuário');
    }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Remover acesso deste usuário?')) return;
    await usersApi.delete(id); load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-light text-white">Usuários com acesso</h2>
          <p className="text-sm mt-1" style={{ color: 'rgba(100,116,139,0.6)' }}>Gerencie quem pode acessar o lun.ia</p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <Plus size={14} /> {userTab === 'client' ? 'Novo Acesso Cliente' : 'Novo Usuário'}
        </button>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-2 mb-5">
        {([['team', 'Equipe', teamUsers.length], ['client', 'Clientes', clientUsers.length]] as const).map(([id, label, count]) => (
          <button key={id} onClick={() => setUserTab(id)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
            style={userTab === id
              ? { background: 'rgba(59,130,246,0.12)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.25)' }
              : { background: 'rgba(255,255,255,0.03)', color: 'rgba(100,116,139,0.6)', border: '1px solid rgba(255,255,255,0.06)' }}>
            {label}
            {count > 0 && (
              <span className="text-[11px] px-1.5 py-0.5 rounded-full"
                style={{ background: userTab === id ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.06)', color: userTab === id ? '#60a5fa' : 'rgba(100,116,139,0.5)' }}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="py-16 flex justify-center">
            <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: 'rgba(59,130,246,0.3)', borderTopColor: '#3b82f6' }} />
          </div>
        ) : displayed.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm" style={{ color: 'rgba(100,116,139,0.4)' }}>
              {userTab === 'client' ? 'Nenhum acesso de cliente criado ainda' : 'Nenhum usuário na equipe'}
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr>
                <th className="th">Usuário</th>
                <th className="th">E-mail</th>
                <th className="th">{userTab === 'client' ? 'Cliente' : 'Papel'}</th>
                <th className="th w-12" />
              </tr>
            </thead>
            <tbody>
              {displayed.map(u => (
                <tr key={u.id} className="tr group">
                  <td className="td">
                    <div className="flex items-center gap-3">
                      {u.avatar ? (
                        <img src={u.avatar} alt={u.name} className="w-8 h-8 rounded-full object-cover flex-shrink-0" style={{ border: '1px solid rgba(59,130,246,0.2)' }} />
                      ) : (
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                          style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)' }}>
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-white">{u.name}</p>
                        {u.job_title && <p className="text-[10px]" style={{ color: 'rgba(100,116,139,0.5)' }}>{u.job_title}</p>}
                        {u.id === me?.id && <p className="text-[10px]" style={{ color: 'rgba(59,130,246,0.6)' }}>você</p>}
                      </div>
                    </div>
                  </td>
                  <td className="td text-sm" style={{ color: 'rgba(148,163,184,0.7)' }}>{u.email}</td>
                  <td className="td">
                    <div className="flex flex-col gap-1">
                      <span className={`badge ${ROLE_BADGE[u.role] || 'badge-slate'}`}>{ROLE_LABEL[u.role] || u.role}</span>
                      {u.agency_client_name && <span className="text-[10px]" style={{ color: 'rgba(100,116,139,0.5)' }}>{u.agency_client_name}</span>}
                    </div>
                  </td>
                  <td className="td">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      {u.role === 'manager' && (
                        <button onClick={() => openClientModal(u)} title="Clientes visíveis no Modo Cliente"
                          className="p-1.5 rounded-lg transition-colors"
                          style={{ color: 'rgba(100,116,139,0.6)' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#60a5fa'; (e.currentTarget as HTMLElement).style.background = 'rgba(59,130,246,0.1)'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(100,116,139,0.6)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                          <Eye size={13} />
                        </button>
                      )}
                      <button onClick={() => openEdit(u)} title="Editar usuário"
                        className="p-1.5 rounded-lg transition-colors"
                        style={{ color: 'rgba(100,116,139,0.6)' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#60a5fa'; (e.currentTarget as HTMLElement).style.background = 'rgba(59,130,246,0.1)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(100,116,139,0.6)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                        <Pencil size={13} />
                      </button>
                      {u.id !== me?.id && (
                        <button onClick={() => handleDelete(u.id)}
                          className="p-1.5 rounded-lg transition-colors"
                          style={{ color: 'rgba(100,116,139,0.6)' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#f87171'; (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.1)'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(100,116,139,0.6)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>


      {clientModal && (
        <div className="fixed inset-0 flex items-start justify-center z-50 p-4 pt-8 overflow-y-auto animate-fade"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}>
          <div className="modal-card w-full max-w-sm animate-fade-up my-auto">
            <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid rgba(59,130,246,0.1)' }}>
              <div>
                <h2 className="text-base font-light text-white">Modo Cliente</h2>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(100,116,139,0.5)' }}>{clientModal.name}</p>
              </div>
              <button onClick={() => setClientModal(null)} style={{ color: 'rgba(100,116,139,0.6)' }}
                className="p-1.5 rounded-lg hover:text-white transition-colors"><X size={18} /></button>
            </div>
            <div className="p-6">
              <p className="text-xs mb-4" style={{ color: 'rgba(100,116,139,0.6)' }}>
                Selecione quais clientes este gestor pode visualizar no Modo Cliente:
              </p>
              <div className="space-y-2">
                {agencyClients.map((c: any) => (
                  <button key={c.id} onClick={() => toggleClient(c.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left"
                    style={{ background: clientPerms.includes(c.id) ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.02)', border: clientPerms.includes(c.id) ? '1px solid rgba(59,130,246,0.25)' : '1px solid rgba(255,255,255,0.05)' }}>
                    <div className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0"
                      style={{ background: clientPerms.includes(c.id) ? '#3b82f6' : 'rgba(255,255,255,0.06)', border: clientPerms.includes(c.id) ? 'none' : '1px solid rgba(255,255,255,0.1)' }}>
                      {clientPerms.includes(c.id) && <CheckCircle2 size={10} className="text-white" />}
                    </div>
                    {c.logo ? (
                      <img src={c.logo} alt={c.name} className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>{c.name.charAt(0)}</div>
                    )}
                    <span className="text-sm text-white">{c.name}</span>
                  </button>
                ))}
                {agencyClients.length === 0 && (
                  <p className="text-sm text-center py-4" style={{ color: 'rgba(100,116,139,0.4)' }}>Nenhum cliente cadastrado</p>
                )}
              </div>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={() => setClientModal(null)} className="btn-ghost flex-1 justify-center">Cancelar</button>
              <button onClick={saveClientPerms} disabled={savingPerms} className="btn-primary flex-1 justify-center">
                {savingPerms ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 flex items-start justify-center z-50 p-4 pt-8 overflow-y-auto animate-fade"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}>
          <div className="modal-card w-full max-w-md animate-fade-up my-auto">
            <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid rgba(59,130,246,0.1)' }}>
              <h2 className="text-lg font-light text-white">{editingUser ? 'Editar Usuário' : 'Novo Usuário'}</h2>
              <button onClick={() => { setModal(false); setError(''); }} style={{ color: 'rgba(100,116,139,0.6)' }}
                className="p-1.5 rounded-lg hover:text-white transition-colors"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              {/* Avatar upload */}
              <div className="flex justify-center">
                <input ref={avatarRef} type="file" accept="image/*" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleAvatarUpload(f); e.target.value = ''; }} />
                <button onClick={() => avatarRef.current?.click()}
                  className="relative w-20 h-20 rounded-full overflow-hidden transition-all group"
                  style={{ background: 'rgba(59,130,246,0.08)', border: '2px dashed rgba(59,130,246,0.25)' }}>
                  {uploadingAvatar ? (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'rgba(59,130,246,0.3)', borderTopColor: '#3b82f6' }} />
                    </div>
                  ) : form.avatar ? (
                    <>
                      <img src={form.avatar} alt="avatar" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ background: 'rgba(0,0,0,0.5)' }}>
                        <Camera size={16} color="white" />
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                      <Camera size={18} style={{ color: 'rgba(59,130,246,0.6)' }} />
                      <span className="text-[10px]" style={{ color: 'rgba(100,116,139,0.5)' }}>Foto</span>
                    </div>
                  )}
                </button>
              </div>
              <Field label="Nome" id="u-name" value={form.name} onChange={v => setForm({ ...form, name: v })} placeholder="Ex: João Silva" />
              <Field label="E-mail" id="u-email" value={form.email} onChange={v => setForm({ ...form, email: v })} placeholder="joao@empresa.com" type="email" />
              <Field label={editingUser ? 'Nova senha (deixe em branco para manter)' : 'Senha'} id="u-pass" value={form.password} onChange={v => setForm({ ...form, password: v })} placeholder={editingUser ? 'Opcional' : 'Mínimo 6 caracteres'} type="password" />
              <div>
                <label className="label-dark">Papel</label>
                <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value, agency_client_id: '' })} className="input-dark" style={{ cursor: 'pointer' }}>
                  <option value="manager">Gestão</option>
                  <option value="team">Time</option>
                  <option value="client">Cliente</option>
                </select>
              </div>
              {(form.role === 'team' || form.role === 'manager') && (
                <Field label="Função" id="u-job" value={form.job_title} onChange={v => setForm({ ...form, job_title: v })} placeholder="Ex: Designer, Gestora de Tráfego…" />
              )}
              {form.role === 'client' && (
                <div>
                  <label className="label-dark">Cliente vinculado *</label>
                  <select value={form.agency_client_id} onChange={e => setForm({ ...form, agency_client_id: e.target.value })} className="input-dark" style={{ cursor: 'pointer' }}>
                    <option value="">Selecione o cliente</option>
                    {agencyClients.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}
              {error && (
                <div className="flex items-center gap-2 text-sm px-3 py-2.5 rounded-xl"
                  style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
                  <AlertCircle size={13} /> {error}
                </div>
              )}
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={() => { setModal(false); setError(''); }} className="btn-ghost flex-1 justify-center">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 justify-center">
                {saving ? 'Salvando…' : editingUser ? 'Salvar alterações' : 'Criar Usuário'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const COLORS = ['#94a3b8','#f87171','#fb923c','#facc15','#4ade80','#34d399','#22d3ee','#60a5fa','#a78bfa','#f472b6'];

function TaskCategoriesTab() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newLabel, setNewLabel] = useState('');
  const [newColor, setNewColor] = useState('#94a3b8');
  const [newIsRework, setNewIsRework] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<any>({});

  useEffect(() => {
    taskCategoriesApi.list().then(r => { setCategories(r.data || []); setLoading(false); });
  }, []);

  const addCategory = async () => {
    if (!newLabel.trim()) return;
    setAdding(true);
    const r = await taskCategoriesApi.create({ label: newLabel.trim(), color: newColor, is_rework: newIsRework });
    setCategories(prev => [...prev, r.data]);
    setNewLabel(''); setNewColor('#94a3b8'); setNewIsRework(false);
    setAdding(false);
  };

  const startEdit = (c: any) => { setEditingId(c.id); setEditDraft({ label: c.label, color: c.color, is_rework: !!c.is_rework }); };

  const saveEdit = async (id: number) => {
    await taskCategoriesApi.update(id, editDraft);
    setCategories(prev => prev.map(c => c.id === id ? { ...c, ...editDraft } : c));
    setEditingId(null);
  };

  const remove = async (id: number) => {
    await taskCategoriesApi.remove(id);
    setCategories(prev => prev.filter(c => c.id !== id));
  };

  if (loading) return <div className="py-12 text-center text-sm" style={{ color: 'rgba(100,116,139,0.5)' }}>Carregando…</div>;

  const rework = categories.filter(c => c.is_rework);
  const normal = categories.filter(c => !c.is_rework);

  return (
    <div className="space-y-6">
      {/* Add new */}
      <div className="card p-5">
        <h3 className="text-sm font-medium text-white mb-4">Nova categoria</h3>
        <div className="flex gap-2 flex-wrap items-end">
          <div className="flex-1 min-w-48">
            <label className="label-dark">Nome</label>
            <input value={newLabel} onChange={e => setNewLabel(e.target.value)}
              placeholder="Ex: Urgência externa"
              className="input-dark"
              onKeyDown={e => { if (e.key === 'Enter') addCategory(); }} />
          </div>
          <div>
            <label className="label-dark">Cor</label>
            <div className="flex gap-1.5 mt-1.5">
              {COLORS.map(c => (
                <button key={c} onClick={() => setNewColor(c)}
                  className="w-6 h-6 rounded-full transition-transform hover:scale-110"
                  style={{ background: c, outline: newColor === c ? `2px solid ${c}` : 'none', outlineOffset: '2px' }} />
              ))}
            </div>
          </div>
          <div>
            <label className="label-dark">Tipo</label>
            <button onClick={() => setNewIsRework(r => !r)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all mt-1.5"
              style={newIsRework
                ? { background: 'rgba(248,113,113,0.12)', color: '#f87171', border: '1px solid rgba(248,113,113,0.25)' }
                : { background: 'rgba(255,255,255,0.03)', color: 'rgba(100,116,139,0.6)', border: '1px solid rgba(255,255,255,0.07)' }}>
              {newIsRework ? '⟳ Retrabalho' : '○ Normal'}
            </button>
          </div>
          <button onClick={addCategory} disabled={adding || !newLabel.trim()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium disabled:opacity-40"
            style={{ background: 'rgba(59,130,246,0.15)', color: '#93c5fd', border: '1px solid rgba(59,130,246,0.25)' }}>
            <Plus size={12} /> {adding ? 'Salvando…' : 'Adicionar'}
          </button>
        </div>
      </div>

      {/* List */}
      {[{ title: 'Retrabalho', items: rework }, { title: 'Normal', items: normal }].map(group => group.items.length > 0 && (
        <div key={group.title} className="card p-5">
          <h3 className="text-sm font-medium mb-4" style={{ color: 'rgba(100,116,139,0.7)' }}>{group.title}</h3>
          <div className="space-y-2">
            {group.items.map((c: any) => (
              <div key={c.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                {editingId === c.id ? (
                  <>
                    <div className="flex gap-1">
                      {COLORS.map(col => (
                        <button key={col} onClick={() => setEditDraft((d: any) => ({ ...d, color: col }))}
                          className="w-5 h-5 rounded-full transition-transform hover:scale-110"
                          style={{ background: col, outline: editDraft.color === col ? `2px solid ${col}` : 'none', outlineOffset: '2px' }} />
                      ))}
                    </div>
                    <input value={editDraft.label} onChange={e => setEditDraft((d: any) => ({ ...d, label: e.target.value }))}
                      className="flex-1 px-2 py-1 rounded-lg text-sm text-white outline-none"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(59,130,246,0.3)' }}
                      onKeyDown={e => { if (e.key === 'Enter') saveEdit(c.id); if (e.key === 'Escape') setEditingId(null); }} />
                    <button onClick={() => setEditDraft((d: any) => ({ ...d, is_rework: !d.is_rework }))}
                      className="text-[10px] px-2 py-1 rounded-lg"
                      style={editDraft.is_rework
                        ? { background: 'rgba(248,113,113,0.12)', color: '#f87171' }
                        : { background: 'rgba(255,255,255,0.04)', color: 'rgba(100,116,139,0.6)' }}>
                      {editDraft.is_rework ? 'Retrabalho' : 'Normal'}
                    </button>
                    <button onClick={() => saveEdit(c.id)}
                      className="p-1.5 rounded-lg" style={{ color: '#34d399' }}>
                      <CheckCircle2 size={14} />
                    </button>
                    <button onClick={() => setEditingId(null)}
                      className="p-1.5 rounded-lg" style={{ color: 'rgba(100,116,139,0.5)' }}>
                      <X size={14} />
                    </button>
                  </>
                ) : (
                  <>
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: c.color }} />
                    <span className="flex-1 text-sm text-white">{c.label}</span>
                    <button onClick={() => startEdit(c)}
                      className="p-1.5 rounded-lg transition-colors" style={{ color: 'rgba(100,116,139,0.4)' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#93c5fd')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'rgba(100,116,139,0.4)')}>
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => remove(c.id)}
                      className="p-1.5 rounded-lg transition-colors" style={{ color: 'rgba(100,116,139,0.4)' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'rgba(100,116,139,0.4)')}>
                      <Trash2 size={13} />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {categories.length === 0 && (
        <p className="text-center text-sm py-8" style={{ color: 'rgba(100,116,139,0.4)' }}>Nenhuma categoria ainda</p>
      )}
    </div>
  );
}

export default function Settings() {
  const { user } = useAuth();
  const isOwner   = user?.role === 'owner';
  const isManager = user?.role === 'manager';
  const isTeam    = user?.role === 'team';
  const isSuperAdmin = isOwner;
  const [tab, setTab] = useState<'profile' | 'api' | 'users' | 'producao' | 'danger'>('profile');
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [webhookInfo, setWebhookInfo] = useState<{ webhookUrl: string; verifyToken: string } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string }>>({});
  const [resetConfirm, setResetConfirm] = useState('');
  const [resetting, setResetting] = useState(false);
  const [resetDone, setResetDone] = useState(false);
  const [agencyToken, setAgencyToken] = useState<{ connected: boolean; expires_at: string | null }>({ connected: false, expires_at: null });
  const [agencyTokenInput, setAgencyTokenInput] = useState('');
  const [agencyTokenSaving, setAgencyTokenSaving] = useState(false);
  const [agencyTokenResult, setAgencyTokenResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleReset = async () => {
    if (resetConfirm !== 'LIMPAR') return;
    setResetting(true);
    await fetch('/api/admin/reset-tenant', {
      method: 'POST',
      headers: { Authorization: `Bearer ${localStorage.getItem('lunia_token')}` },
    });
    setResetting(false);
    setResetDone(true);
    setResetConfirm('');
  };;

  useEffect(() => {
    settingsApi.get().then(r => setSettings(r.data));
    settingsApi.getWebhookInfo().then(r => setWebhookInfo(r.data));
    metaApi.getAgencyToken().then(r => setAgencyToken(r.data)).catch(() => {});
  }, []);

  const saveAgencyToken = async () => {
    if (!agencyTokenInput.trim()) return;
    setAgencyTokenSaving(true);
    setAgencyTokenResult(null);
    try {
      const r = await metaApi.saveAgencyToken(agencyTokenInput.trim());
      setAgencyToken({ connected: true, expires_at: null });
      setAgencyTokenResult({ success: true, message: `Conectado como ${r.data.name}` });
      setAgencyTokenInput('');
    } catch (e: any) {
      setAgencyTokenResult({ success: false, message: e.response?.data?.error || 'Token inválido' });
    }
    setAgencyTokenSaving(false);
  };

  const exchangeAgencyToken = async () => {
    if (!agencyTokenInput.trim()) return;
    setAgencyTokenSaving(true);
    setAgencyTokenResult(null);
    try {
      const r = await metaApi.exchangeToken(agencyTokenInput.trim());
      setAgencyToken({ connected: true, expires_at: r.data.expires_at });
      const days = r.data.expires_in ? Math.round(r.data.expires_in / 86400) : 60;
      setAgencyTokenResult({ success: true, message: `Token longo salvo — ${r.data.name} · válido por ${days} dias` });
      setAgencyTokenInput('');
    } catch (e: any) {
      setAgencyTokenResult({ success: false, message: e.response?.data?.error || 'Erro ao converter token' });
    }
    setAgencyTokenSaving(false);
  };

  const set = (key: string, value: string) => setSettings(prev => ({ ...prev, [key]: value }));
  const handleSave = async () => {
    setSaving(true); await settingsApi.update(settings);
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 3000);
  };
  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(null), 2000);
  };
  const handleTest = async (type: string) => {
    const r = await settingsApi.testConnection(type);
    setTestResults(prev => ({ ...prev, [type]: r.data }));
  };

  return (
    <div className="p-4 md:p-8 animate-fade-up max-w-3xl">
      <div className="mb-8">
        <p className="section-label mb-1">Sistema</p>
        <h1 className="text-3xl font-extralight text-white tracking-tight" style={{ textShadow: '0 0 30px rgba(59,130,246,0.2)' }}>
          Configurações
        </h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-8 w-full overflow-x-auto rounded-xl p-1" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
        {[
          { id: 'profile', label: 'Meu Perfil',      icon: User,          show: true },
          { id: 'api',      label: 'Integrações API', icon: Zap,           show: isOwner },
          { id: 'users',    label: 'Usuários',        icon: Users,         show: isOwner || isManager },
          { id: 'producao', label: 'Produção',        icon: Tag,           show: isOwner || isManager },
          { id: 'danger',   label: 'Zona de Perigo',  icon: AlertTriangle, show: isOwner },
        ].filter(t => t.show).map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all"
            style={tab === t.id
              ? { background: 'rgba(59,130,246,0.12)', color: '#93c5fd', border: '1px solid rgba(59,130,246,0.2)' }
              : { color: 'rgba(100,116,139,0.7)', border: '1px solid transparent' }}>
            <t.icon size={13} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'profile' ? <ProfileTab /> : tab === 'users' ? <UsersTab /> : tab === 'producao' ? <TaskCategoriesTab /> : tab === 'danger' ? (
        <div className="card p-6" style={{ borderColor: 'rgba(248,113,113,0.2)' }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)' }}>
              <AlertTriangle size={15} style={{ color: '#f87171' }} />
            </div>
            <h2 className="text-base font-light text-white">Zona de Perigo</h2>
          </div>

          <div className="rounded-xl p-5" style={{ background: 'rgba(248,113,113,0.04)', border: '1px solid rgba(248,113,113,0.15)' }}>
            <p className="text-sm font-medium text-white mb-1">Limpar todos os dados</p>
            <p className="text-xs mb-4" style={{ color: 'rgba(100,116,139,0.6)' }}>
              Remove todos os contatos, clientes, conteúdos, tarefas, campanhas e usuários do sistema. Essa ação não pode ser desfeita.
            </p>

            {resetDone ? (
              <div className="flex items-center gap-2 text-sm" style={{ color: '#34d399' }}>
                <CheckCircle2 size={15} /> Dados limpos com sucesso! Recarregue a página.
              </div>
            ) : (
              <>
                <p className="text-xs mb-2" style={{ color: 'rgba(248,113,113,0.7)' }}>Digite <strong>LIMPAR</strong> para confirmar:</p>
                <div className="flex gap-3">
                  <input
                    value={resetConfirm}
                    onChange={e => setResetConfirm(e.target.value)}
                    placeholder="LIMPAR"
                    className="input-dark flex-1"
                    style={{ borderColor: resetConfirm === 'LIMPAR' ? 'rgba(248,113,113,0.5)' : undefined }}
                  />
                  <button
                    onClick={handleReset}
                    disabled={resetConfirm !== 'LIMPAR' || resetting}
                    className="px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-all"
                    style={{
                      background: resetConfirm === 'LIMPAR' ? 'rgba(248,113,113,0.15)' : 'rgba(100,116,139,0.08)',
                      color: resetConfirm === 'LIMPAR' ? '#f87171' : 'rgba(100,116,139,0.4)',
                      border: `1px solid ${resetConfirm === 'LIMPAR' ? 'rgba(248,113,113,0.3)' : 'rgba(100,116,139,0.1)'}`,
                      cursor: resetConfirm !== 'LIMPAR' ? 'not-allowed' : 'pointer',
                    }}>
                    {resetting ? <RefreshCw size={13} className="animate-spin" /> : <Trash2 size={13} />}
                    {resetting ? 'Limpando…' : 'Limpar tudo'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Webhook Info */}
          <div className="card p-6 mb-5" style={{ borderColor: 'rgba(59,130,246,0.2)' }}>
            <div className="flex items-center gap-2 mb-5">
              <Zap size={14} className="icon-blue" />
              <p className="section-label">Webhook da Meta</p>
              <span className="badge badge-blue ml-auto">Necessário no painel Meta Developers</span>
            </div>
            {webhookInfo && (
              <div className="space-y-4">
                <div>
                  <label className="label-dark">URL do Webhook</label>
                  <div className="flex gap-2">
                    <div className="flex-1 rounded-xl px-4 py-2.5 font-mono text-xs truncate"
                      style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)', color: '#93c5fd' }}>
                      {webhookInfo.webhookUrl}
                    </div>
                    <button onClick={() => handleCopy(webhookInfo.webhookUrl, 'url')} className="btn-ghost px-3 flex-shrink-0">
                      {copied === 'url' ? <CheckCircle2 size={14} className="icon-green" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="label-dark">Token de Verificação</label>
                  <div className="flex gap-2">
                    <div className="flex-1 rounded-xl px-4 py-2.5 font-mono text-xs"
                      style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', color: '#fcd34d' }}>
                      {webhookInfo.verifyToken}
                    </div>
                    <button onClick={() => handleCopy(webhookInfo.verifyToken, 'token')} className="btn-ghost px-3 flex-shrink-0">
                      {copied === 'token' ? <CheckCircle2 size={14} className="icon-green" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
              </div>
            )}
            <div className="mt-4 flex items-start gap-2.5 rounded-xl px-4 py-3"
              style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.12)' }}>
              <AlertCircle size={13} className="icon-amber flex-shrink-0 mt-0.5" />
              <p className="text-xs" style={{ color: 'rgba(245,158,11,0.75)' }}>
                Para receber mensagens reais, configure esta URL no{' '}
                <a href="https://developers.facebook.com" target="_blank" rel="noreferrer"
                  className="underline inline-flex items-center gap-0.5 hover:text-amber-300 transition-colors">
                  Meta Developers <ExternalLink size={9} />
                </a>
              </p>
            </div>
          </div>

          <Section icon={MessageSquare} title="WhatsApp Business API" iconStyle="icon-green"
            testType="whatsapp" onTest={handleTest} testResult={testResults.whatsapp}>
            <Field label="Access Token" id="whatsapp_token" value={settings.whatsapp_token || ''} onChange={v => set('whatsapp_token', v)} placeholder="EAABsbCS…" mono />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Phone Number ID" id="whatsapp_phone_id" value={settings.whatsapp_phone_id || ''} onChange={v => set('whatsapp_phone_id', v)} placeholder="123456789012345" mono />
              <Field label="Business Account ID" id="whatsapp_business_id" value={settings.whatsapp_business_id || ''} onChange={v => set('whatsapp_business_id', v)} placeholder="123456789" mono />
            </div>
          </Section>

          {/* Meta — Token da Agência */}
          <div className="card p-6 mb-5" style={{ borderColor: agencyToken.connected ? 'rgba(52,211,153,0.2)' : 'rgba(236,72,153,0.15)' }}>
            <div className="flex items-center gap-2 mb-4">
              <Instagram size={14} style={{ color: '#ec4899' }} />
              <p className="section-label">Meta — Token da Agência</p>
              <span className={`badge ml-auto ${agencyToken.connected ? 'badge-green' : 'badge-red'}`}>
                {agencyToken.connected ? 'Conectado' : 'Não configurado'}
              </span>
            </div>
            {agencyToken.connected && agencyToken.expires_at && (() => {
              const days = Math.ceil((new Date(agencyToken.expires_at).getTime() - Date.now()) / 86400000);
              const urgent = days <= 7;
              const warning = days <= 14;
              return (
                <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-xl text-xs"
                  style={{ background: urgent ? 'rgba(239,68,68,0.07)' : warning ? 'rgba(251,191,36,0.07)' : 'rgba(52,211,153,0.06)', border: `1px solid ${urgent ? 'rgba(239,68,68,0.2)' : warning ? 'rgba(251,191,36,0.2)' : 'rgba(52,211,153,0.15)'}`, color: urgent ? '#f87171' : warning ? '#fbbf24' : '#34d399' }}>
                  {urgent ? '⚠️' : warning ? '⏳' : '✓'}
                  <span>Token expira em <strong>{days} {days === 1 ? 'dia' : 'dias'}</strong> — {new Date(agencyToken.expires_at).toLocaleDateString('pt-BR')}. {(urgent || warning) ? 'Renove agora colando um novo token abaixo.' : 'Lembre de renovar antes dessa data.'}</span>
                </div>
              );
            })()}

            {agencyToken.connected ? (
              <div className="space-y-2">
                <p className="text-xs" style={{ color: 'rgba(100,116,139,0.6)' }}>
                  Token ativo — compartilhado por todos os clientes para buscar métricas do Instagram.
                  {agencyToken.expires_at && ` Expira em ${new Date(agencyToken.expires_at).toLocaleDateString('pt-BR')}.`}
                </p>
                <p className="text-xs" style={{ color: 'rgba(100,116,139,0.4)' }}>
                  Para renovar, cole um novo token abaixo ou faça OAuth em qualquer cliente → aba Integração.
                </p>
                <div className="flex gap-2 mt-3">
                  <input
                    type="password"
                    value={agencyTokenInput}
                    onChange={e => setAgencyTokenInput(e.target.value)}
                    placeholder="Novo token (EAABsbCS…)"
                    className="flex-1 rounded-xl px-4 py-2.5 text-xs font-mono outline-none"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(148,163,184,0.85)' }}
                  />
                  <button onClick={exchangeAgencyToken} disabled={agencyTokenSaving || !agencyTokenInput.trim()}
                    className="px-4 text-xs rounded-xl font-medium disabled:opacity-40 flex items-center gap-1.5 transition-all"
                    style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)', color: '#fbbf24' }}
                    title="Converte token curto em longo (~60 dias)">
                    {agencyTokenSaving ? <RefreshCw size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                    Converter
                  </button>
                  <button onClick={saveAgencyToken} disabled={agencyTokenSaving || !agencyTokenInput.trim()}
                    className="btn-primary px-4 text-xs disabled:opacity-40">
                    {agencyTokenSaving ? <RefreshCw size={13} className="animate-spin" /> : <Key size={13} />}
                    Salvar
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs" style={{ color: 'rgba(100,116,139,0.5)' }}>
                  Cole o token de acesso Meta (gerado via OAuth ou Graph API Explorer). Será usado para buscar métricas de Instagram de todos os clientes.
                </p>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={agencyTokenInput}
                    onChange={e => setAgencyTokenInput(e.target.value)}
                    placeholder="EAABsbCS…"
                    className="flex-1 rounded-xl px-4 py-2.5 text-xs font-mono outline-none"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(148,163,184,0.85)' }}
                  />
                  <button onClick={exchangeAgencyToken} disabled={agencyTokenSaving || !agencyTokenInput.trim()}
                    className="px-4 text-xs rounded-xl font-medium disabled:opacity-40 flex items-center gap-1.5 transition-all"
                    style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)', color: '#fbbf24' }}
                    title="Converte token curto em longo (~60 dias)">
                    {agencyTokenSaving ? <RefreshCw size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                    Converter
                  </button>
                  <button onClick={saveAgencyToken} disabled={agencyTokenSaving || !agencyTokenInput.trim()}
                    className="btn-primary px-4 text-xs disabled:opacity-40">
                    {agencyTokenSaving ? <RefreshCw size={13} className="animate-spin" /> : <Key size={13} />}
                    Salvar
                  </button>
                </div>
              </div>
            )}

            {agencyTokenResult && (
              <p className={`text-xs mt-2 flex items-center gap-1.5 ${agencyTokenResult.success ? 'text-emerald-400' : 'text-red-400'}`}>
                {agencyTokenResult.success ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                {agencyTokenResult.message}
              </p>
            )}
          </div>

          <Section icon={Instagram} title="Instagram API (legado)" iconStyle="icon-pink"
            testType="instagram" onTest={handleTest} testResult={testResults.instagram}>
            <Field label="Access Token" id="instagram_token" value={settings.instagram_token || ''} onChange={v => set('instagram_token', v)} placeholder="EAABsbCS…" mono />
            <Field label="Instagram Account ID" id="instagram_account_id" value={settings.instagram_account_id || ''} onChange={v => set('instagram_account_id', v)} placeholder="123456789" mono />
          </Section>

          <Section icon={Shield} title="Meta Ads API" iconStyle="icon-purple">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="App ID" id="meta_app_id" value={settings.meta_app_id || ''} onChange={v => set('meta_app_id', v)} placeholder="123456789012345" mono />
              <Field label="App Secret" id="meta_app_secret" value={settings.meta_app_secret || ''} onChange={v => set('meta_app_secret', v)} placeholder="abc123…" type="password" mono />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Ad Account ID" id="meta_ads_account_id" value={settings.meta_ads_account_id || ''} onChange={v => set('meta_ads_account_id', v)} placeholder="act_123456789" mono />
              <Field label="Verify Token (Webhook)" id="meta_verify_token" value={settings.meta_verify_token || ''} onChange={v => set('meta_verify_token', v)} placeholder="lunia_webhook_token" mono />
            </div>
          </Section>

          <div className="flex items-center gap-4 mt-2">
            <button onClick={handleSave} disabled={saving} className="btn-primary px-8">
              {saving ? <RefreshCw size={14} className="animate-spin" /> : <Key size={14} />}
              {saving ? 'Salvando…' : 'Salvar Configurações'}
            </button>
            {saved && (
              <span className="flex items-center gap-2 text-sm animate-fade-up" style={{ color: '#34d399' }}>
                <CheckCircle2 size={15} /> Salvo com sucesso!
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
