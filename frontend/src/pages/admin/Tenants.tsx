import { useEffect, useState } from 'react';
import { Building2, Plus, Trash2, Users, Contact, X, Eye, EyeOff, Copy, Check } from 'lucide-react';
import { adminApi } from '../../api/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Tenant {
  id: number;
  name: string;
  slug: string;
  created_at: string;
  user_count: number;
  contact_count: number;
  admin_name: string | null;
  admin_email: string | null;
}

const EMPTY_FORM = { name: '', admin_name: '', admin_email: '', admin_password: '' };

export default function Tenants() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showPass, setShowPass] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const load = () => {
    setLoading(true);
    adminApi.listTenants().then(r => { setTenants(r.data); setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.name || !form.admin_name || !form.admin_email || !form.admin_password) {
      setError('Todos os campos são obrigatórios'); return;
    }
    setSaving(true); setError('');
    try {
      const r = await adminApi.createTenant(form);
      setTenants(prev => [r.data, ...prev]);
      setModal(false); setForm(EMPTY_FORM);
    } catch (e: any) {
      setError(e.response?.data?.error || 'Erro ao criar workspace');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Excluir este workspace? Todos os dados serão apagados permanentemente.')) return;
    setDeletingId(id);
    await adminApi.deleteTenant(id);
    setTenants(prev => prev.filter(t => t.id !== id));
    setDeletingId(null);
  };

  const copyCredentials = (t: Tenant) => {
    const text = `Workspace: ${t.name}\nLogin: ${t.admin_email}\nSenha: (definida no cadastro)\nAcesso: ${window.location.origin}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="section-label mb-1">Plataforma</p>
          <h1 className="text-2xl font-semibold text-white">Workspaces</h1>
        </div>
        <button onClick={() => { setModal(true); setForm(EMPTY_FORM); setError(''); }}
          className="btn-primary flex items-center gap-2">
          <Plus size={15} /> Novo workspace
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Workspaces ativos', value: tenants.length, icon: Building2 },
          { label: 'Total de usuários', value: tenants.reduce((s, t) => s + t.user_count, 0), icon: Users },
          { label: 'Total de contatos', value: tenants.reduce((s, t) => s + t.contact_count, 0), icon: Contact },
        ].map(s => (
          <div key={s.label} className="card flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(59,130,246,0.1)' }}>
              <s.icon size={18} style={{ color: '#60a5fa' }} />
            </div>
            <div>
              <p className="text-xl font-bold text-white">{loading ? '…' : s.value}</p>
              <p className="text-xs" style={{ color: 'rgba(100,116,139,0.6)' }}>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: 'rgba(59,130,246,0.3)', borderTopColor: '#3b82f6' }} />
        </div>
      ) : tenants.length === 0 ? (
        <div className="text-center py-24">
          <Building2 size={40} className="mx-auto mb-3" style={{ color: 'rgba(100,116,139,0.2)' }} />
          <p style={{ color: 'rgba(100,116,139,0.5)' }}>Nenhum workspace ainda.</p>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(59,130,246,0.08)' }}>
                {['Workspace', 'Admin', 'Usuários', 'Contatos', 'Criado em', ''].map(h => (
                  <th key={h} className="px-5 py-3 text-left">
                    <span className="text-xs font-semibold uppercase tracking-wider"
                      style={{ color: 'rgba(100,116,139,0.5)' }}>{h}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tenants.map((t, i) => (
                <tr key={t.id}
                  style={{ borderBottom: i < tenants.length - 1 ? '1px solid rgba(59,130,246,0.05)' : 'none' }}>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)' }}>
                        {t.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{t.name}</p>
                        <p className="text-xs font-mono" style={{ color: 'rgba(100,116,139,0.45)' }}>{t.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-sm text-white">{t.admin_name || '—'}</p>
                    <p className="text-xs" style={{ color: 'rgba(100,116,139,0.5)' }}>{t.admin_email || ''}</p>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-sm font-medium text-white">{t.user_count}</span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-sm font-medium text-white">{t.contact_count}</span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-sm" style={{ color: 'rgba(100,116,139,0.6)' }}>
                      {format(new Date(t.created_at), "d MMM yyyy", { locale: ptBR })}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => copyCredentials(t)} title="Copiar acesso"
                        className="p-1.5 rounded-lg transition-colors"
                        style={{ color: 'rgba(100,116,139,0.4)' }}
                        onMouseEnter={e => (e.currentTarget.style.color = '#60a5fa')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'rgba(100,116,139,0.4)')}>
                        {copied ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                      {t.id !== 1 && (
                        <button onClick={() => handleDelete(t.id)} disabled={deletingId === t.id}
                          title="Excluir workspace"
                          className="p-1.5 rounded-lg transition-colors"
                          style={{ color: 'rgba(100,116,139,0.4)' }}
                          onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
                          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(100,116,139,0.4)')}>
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create modal */}
      {modal && (
        <div className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
          onClick={() => setModal(false)}>
          <div className="w-full max-w-md rounded-2xl p-6"
            style={{ background: '#07071a', border: '1px solid rgba(59,130,246,0.15)', boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }}
            onClick={e => e.stopPropagation()}>

            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">Novo workspace</h2>
              <button onClick={() => setModal(false)} style={{ color: 'rgba(100,116,139,0.5)' }}>
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="label-dark">Nome da empresa</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Ex: Studio Z" className="input-dark w-full mt-1" />
              </div>
              <div className="pt-2" style={{ borderTop: '1px solid rgba(59,130,246,0.06)' }}>
                <p className="text-xs font-semibold uppercase tracking-wider mb-3"
                  style={{ color: 'rgba(59,130,246,0.5)' }}>Usuário administrador</p>
                <div className="space-y-3">
                  <div>
                    <label className="label-dark">Nome</label>
                    <input value={form.admin_name} onChange={e => setForm(f => ({ ...f, admin_name: e.target.value }))}
                      placeholder="Nome do admin" className="input-dark w-full mt-1" />
                  </div>
                  <div>
                    <label className="label-dark">Email</label>
                    <input type="email" value={form.admin_email} onChange={e => setForm(f => ({ ...f, admin_email: e.target.value }))}
                      placeholder="email@empresa.com" className="input-dark w-full mt-1" />
                  </div>
                  <div>
                    <label className="label-dark">Senha de acesso</label>
                    <div className="relative mt-1">
                      <input type={showPass ? 'text' : 'password'} value={form.admin_password}
                        onChange={e => setForm(f => ({ ...f, admin_password: e.target.value }))}
                        placeholder="Senha inicial" className="input-dark w-full pr-10" />
                      <button onClick={() => setShowPass(s => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                        style={{ color: 'rgba(100,116,139,0.5)' }}>
                        {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {error && (
                <p className="text-sm px-3 py-2 rounded-lg"
                  style={{ background: 'rgba(239,68,68,0.08)', color: '#f87171', border: '1px solid rgba(239,68,68,0.15)' }}>
                  {error}
                </p>
              )}

              <div className="flex gap-3 pt-2">
                <button onClick={() => setModal(false)} className="btn-ghost flex-1 justify-center">Cancelar</button>
                <button onClick={handleCreate} disabled={saving} className="btn-primary flex-1 justify-center">
                  {saving ? 'Criando…' : 'Criar workspace'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
