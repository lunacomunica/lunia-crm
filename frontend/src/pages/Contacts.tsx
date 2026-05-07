import { useEffect, useState } from 'react';
import { Plus, Search, Pencil, Trash2, Phone, Mail, X, SlidersHorizontal } from 'lucide-react';
import { contactsApi } from '../api/client';
import { Contact } from '../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const SRC_LABEL: Record<string, string> = { manual: 'Manual', whatsapp: 'WhatsApp', instagram: 'Instagram', ads: 'Anúncio' };
const SRC_BADGE: Record<string, string> = { manual: 'badge-slate', whatsapp: 'badge-green', instagram: 'badge-pink', ads: 'badge-purple' };
const ST_LABEL: Record<string, string> = { lead: 'Lead', qualified: 'Qualificado', customer: 'Cliente', lost: 'Perdido' };
const ST_BADGE: Record<string, string> = { lead: 'badge-blue', qualified: 'badge-amber', customer: 'badge-green', lost: 'badge-red' };

const AVATAR_COLORS = [
  'linear-gradient(135deg,#3b82f6,#6366f1)',
  'linear-gradient(135deg,#8b5cf6,#ec4899)',
  'linear-gradient(135deg,#10b981,#06b6d4)',
  'linear-gradient(135deg,#f59e0b,#ef4444)',
  'linear-gradient(135deg,#ec4899,#8b5cf6)',
];

function Avatar({ name }: { name: string }) {
  const initials = (name || '?').split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
  const bg = AVATAR_COLORS[(name || '?').charCodeAt(0) % AVATAR_COLORS.length];
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
      style={{ background: bg, boxShadow: '0 0 10px rgba(59,130,246,0.2)' }}
    >
      {initials}
    </div>
  );
}

const emptyForm = { name: '', email: '', phone: '', source: 'manual', status: 'lead', tags: '[]', notes: '' };

export default function Contacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterSource, setFilterSource] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const load = () => {
    setLoading(true);
    const p: Record<string, string> = {};
    if (search) p.search = search;
    if (filterSource !== 'all') p.source = filterSource;
    if (filterStatus !== 'all') p.status = filterStatus;
    contactsApi.list(p).then(r => { setContacts(r.data.contacts); setTotal(r.data.total); setLoading(false); });
  };

  useEffect(() => { load(); }, [search, filterSource, filterStatus]);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setModal(true); };
  const openEdit = (c: Contact) => {
    setEditing(c);
    setForm({ name: c.name, email: c.email || '', phone: c.phone || '', source: c.source, status: c.status, tags: c.tags, notes: c.notes || '' });
    setModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    if (editing) await contactsApi.update(editing.id, form);
    else await contactsApi.create(form);
    setSaving(false); setModal(false); load();
  };

  const handleDelete = async (id: number) => {
    await contactsApi.delete(id); setDeleting(null); load();
  };

  const toggleSelect = (id: number) => {
    setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  };
  const toggleAll = () => setSelected(selected.size === contacts.length ? new Set() : new Set(contacts.map(c => c.id)));
  const handleBulkDelete = async () => {
    if (!confirm(`Apagar ${selected.size} contato(s) selecionado(s)?`)) return;
    setBulkDeleting(true);
    await contactsApi.bulkDelete([...selected]);
    setSelected(new Set()); setBulkDeleting(false); load();
  };

  const selectStyle = {
    background: 'rgba(255,255,255,0.025)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '0.75rem',
    padding: '0.625rem 1rem',
    color: '#e2e8f0',
    fontSize: '0.875rem',
    outline: 'none',
    cursor: 'pointer',
  };

  return (
    <div className="p-8 animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="section-label mb-1">Gestão</p>
          <h1 className="text-3xl font-extralight text-white tracking-tight" style={{ textShadow: '0 0 30px rgba(59,130,246,0.2)' }}>
            Contatos
          </h1>
          <p className="text-sm mt-1" style={{ color: 'rgba(100,116,139,0.7)' }}>
            {total} contatos cadastrados
          </p>
        </div>
        <div className="flex gap-2">
          {selected.size > 0 && (
            <button onClick={handleBulkDelete} disabled={bulkDeleting} className="btn-ghost"
              style={{ color: '#f87171', borderColor: 'rgba(239,68,68,0.3)' }}>
              <Trash2 size={14} /> {bulkDeleting ? 'Apagando…' : `Apagar ${selected.size}`}
            </button>
          )}
          <button className="btn-primary" onClick={openCreate}>
            <Plus size={15} /> Novo Contato
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-60">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'rgba(59,130,246,0.4)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome, e-mail ou telefone…"
            className="input-dark pl-9"
          />
        </div>
        <select value={filterSource} onChange={e => setFilterSource(e.target.value)} style={selectStyle}>
          <option value="all">Todas as fontes</option>
          <option value="whatsapp">WhatsApp</option>
          <option value="instagram">Instagram</option>
          <option value="ads">Anúncios</option>
          <option value="manual">Manual</option>
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={selectStyle}>
          <option value="all">Todos os status</option>
          <option value="lead">Lead</option>
          <option value="qualified">Qualificado</option>
          <option value="customer">Cliente</option>
          <option value="lost">Perdido</option>
        </select>
        <button className="btn-ghost">
          <SlidersHorizontal size={14} /> Filtros
        </button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr>
              <th className="th w-8">
                <input type="checkbox" checked={contacts.length > 0 && selected.size === contacts.length}
                  onChange={toggleAll} className="rounded" style={{ accentColor: '#3b82f6', cursor: 'pointer' }} />
              </th>
              <th className="th">Contato</th>
              <th className="th hidden md:table-cell">Telefone</th>
              <th className="th">Fonte</th>
              <th className="th">Status</th>
              <th className="th hidden lg:table-cell">Criado</th>
              <th className="th w-16" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="py-20 text-center">
                  <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin mx-auto"
                    style={{ borderColor: 'rgba(59,130,246,0.3)', borderTopColor: '#3b82f6' }} />
                </td>
              </tr>
            ) : contacts.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-20 text-center text-sm" style={{ color: 'rgba(100,116,139,0.5)' }}>
                  Nenhum contato encontrado
                </td>
              </tr>
            ) : contacts.map(c => (
              <tr key={c.id} className="tr group" style={selected.has(c.id) ? { background: 'rgba(59,130,246,0.05)' } : {}}>
                <td className="td">
                  <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleSelect(c.id)}
                    style={{ accentColor: '#3b82f6', cursor: 'pointer' }} />
                </td>
                <td className="td">
                  <div className="flex items-center gap-3">
                    <Avatar name={c.name} />
                    <div>
                      <p className="text-sm font-medium text-white">{c.name}</p>
                      {c.email && (
                        <p className="flex items-center gap-1 text-xs mt-0.5" style={{ color: 'rgba(100,116,139,0.6)' }}>
                          <Mail size={9} />{c.email}
                        </p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="td hidden md:table-cell">
                  {c.phone
                    ? <span className="flex items-center gap-1.5 text-xs" style={{ color: 'rgba(148,163,184,0.7)' }}><Phone size={11} />{c.phone}</span>
                    : <span style={{ color: 'rgba(100,116,139,0.4)' }}>—</span>}
                </td>
                <td className="td">
                  <span className={`badge ${SRC_BADGE[c.source]}`}>{SRC_LABEL[c.source]}</span>
                </td>
                <td className="td">
                  <span className={`badge ${ST_BADGE[c.status]}`}>{ST_LABEL[c.status]}</span>
                </td>
                <td className="td hidden lg:table-cell text-xs" style={{ color: 'rgba(100,116,139,0.55)' }}>
                  {format(new Date(c.created_at), "d MMM yyyy", { locale: ptBR })}
                </td>
                <td className="td">
                  <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEdit(c)}
                      className="p-1.5 rounded-lg transition-all duration-150"
                      style={{ color: 'rgba(100,116,139,0.6)' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#60a5fa'; (e.currentTarget as HTMLElement).style.background = 'rgba(59,130,246,0.1)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(100,116,139,0.6)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => setDeleting(c.id)}
                      className="p-1.5 rounded-lg transition-all duration-150"
                      style={{ color: 'rgba(100,116,139,0.6)' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#f87171'; (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.1)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(100,116,139,0.6)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal create/edit */}
      {modal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4 animate-fade"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}>
          <div className="modal-card w-full max-w-lg animate-fade-up">
            <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid rgba(59,130,246,0.1)' }}>
              <div>
                <p className="section-label mb-0.5">{editing ? 'Editar' : 'Novo'}</p>
                <h2 className="text-lg font-light text-white">
                  {editing ? editing.name : 'Criar Contato'}
                </h2>
              </div>
              <button onClick={() => setModal(false)} style={{ color: 'rgba(100,116,139,0.6)' }}
                className="p-1.5 rounded-lg hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="label-dark">Nome *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="input-dark" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-dark">E-mail</label>
                  <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="input-dark" />
                </div>
                <div>
                  <label className="label-dark">Telefone</label>
                  <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="input-dark" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-dark">Fonte</label>
                  <select value={form.source} onChange={e => setForm({ ...form, source: e.target.value })}
                    className="input-dark" style={{ cursor: 'pointer' }}>
                    <option value="manual">Manual</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="instagram">Instagram</option>
                    <option value="ads">Anúncio</option>
                  </select>
                </div>
                <div>
                  <label className="label-dark">Status</label>
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                    className="input-dark" style={{ cursor: 'pointer' }}>
                    <option value="lead">Lead</option>
                    <option value="qualified">Qualificado</option>
                    <option value="customer">Cliente</option>
                    <option value="lost">Perdido</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="label-dark">Observações</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                  rows={3} className="input-dark resize-none" />
              </div>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={() => setModal(false)} className="btn-ghost flex-1 justify-center">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 justify-center">
                {saving ? 'Salvando…' : editing ? 'Salvar' : 'Criar Contato'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleting && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4 animate-fade"
          style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}>
          <div className="modal-card w-full max-w-sm p-6 animate-fade-up">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <Trash2 size={16} className="icon-red" />
            </div>
            <h3 className="text-white font-medium mb-1">Excluir contato?</h3>
            <p className="text-sm mb-5" style={{ color: 'rgba(148,163,184,0.6)' }}>
              Esta ação é permanente e não pode ser desfeita.
            </p>
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
