import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, X, Package, Tag, ToggleLeft, ToggleRight, Search } from 'lucide-react';
import { productsApi } from '../api/client';
import { Product } from '../types';

const UNITS = ['un', 'hr', 'mês', 'kg', 'lt', 'serviço', 'licença'];

function fmt(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

const emptyForm = { name: '', description: '', price: '', unit: 'un', category: '', active: true };

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    productsApi.list().then(r => { setProducts(r.data); setLoading(false); });
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setModal(true); };
  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({ name: p.name, description: p.description || '', price: String(p.price), unit: p.unit, category: p.category || '', active: Boolean(p.active) });
    setModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const payload = { ...form, price: parseFloat(form.price) || 0, active: form.active ? 1 : 0 };
    if (editing) await productsApi.update(editing.id, payload);
    else await productsApi.create(payload);
    setSaving(false); setModal(false); load();
  };

  const handleDelete = async (id: number) => {
    await productsApi.delete(id); setDeleting(null); load();
  };

  const handleToggle = async (p: Product) => {
    await productsApi.update(p.id, { active: p.active ? 0 : 1 }); load();
  };

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.category || '').toLowerCase().includes(search.toLowerCase())
  );

  const categories = [...new Set(products.map(p => p.category).filter(Boolean))];
  const activeCount = products.filter(p => p.active).length;

  return (
    <div className="p-8 animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="section-label mb-1">Catálogo</p>
          <h1 className="text-3xl font-extralight text-white tracking-tight" style={{ textShadow: '0 0 30px rgba(59,130,246,0.2)' }}>
            Produtos & Serviços
          </h1>
          <p className="text-sm mt-1" style={{ color: 'rgba(100,116,139,0.7)' }}>
            {products.length} cadastrados · <span style={{ color: '#34d399' }}>{activeCount} ativos</span>
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary"><Plus size={15} /> Novo Produto</button>
      </div>

      {/* Search */}
      <div className="relative mb-6 max-w-sm">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'rgba(59,130,246,0.4)' }} />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar produto ou categoria…" className="input-dark pl-9" />
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr>
              <th className="th">Produto</th>
              <th className="th hidden md:table-cell">Categoria</th>
              <th className="th">Preço</th>
              <th className="th hidden sm:table-cell">Unidade</th>
              <th className="th">Status</th>
              <th className="th w-20" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="py-20 text-center">
                <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin mx-auto"
                  style={{ borderColor: 'rgba(59,130,246,0.3)', borderTopColor: '#3b82f6' }} />
              </td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="py-20 text-center">
                <Package size={32} className="mx-auto mb-3" style={{ color: 'rgba(100,116,139,0.2)' }} />
                <p className="text-sm" style={{ color: 'rgba(100,116,139,0.5)' }}>
                  {search ? 'Nenhum produto encontrado' : 'Nenhum produto cadastrado ainda'}
                </p>
                {!search && <button onClick={openCreate} className="btn-primary mt-4 mx-auto"><Plus size={14} /> Criar primeiro produto</button>}
              </td></tr>
            ) : filtered.map(p => (
              <tr key={p.id} className="tr group">
                <td className="td">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: p.active ? 'rgba(59,130,246,0.1)' : 'rgba(100,116,139,0.06)', border: `1px solid ${p.active ? 'rgba(59,130,246,0.2)' : 'rgba(100,116,139,0.1)'}` }}>
                      <Package size={14} style={{ color: p.active ? '#60a5fa' : 'rgba(100,116,139,0.4)' }} />
                    </div>
                    <div>
                      <p className="text-sm font-medium" style={{ color: p.active ? '#e2e8f0' : 'rgba(100,116,139,0.5)' }}>{p.name}</p>
                      {p.description && <p className="text-xs truncate max-w-xs" style={{ color: 'rgba(100,116,139,0.5)' }}>{p.description}</p>}
                    </div>
                  </div>
                </td>
                <td className="td hidden md:table-cell">
                  {p.category
                    ? <span className="badge badge-slate flex items-center gap-1 w-fit"><Tag size={9} />{p.category}</span>
                    : <span style={{ color: 'rgba(100,116,139,0.3)' }}>—</span>}
                </td>
                <td className="td">
                  <span className="text-sm font-semibold" style={{ color: p.active ? '#34d399' : 'rgba(100,116,139,0.5)' }}>
                    {fmt(p.price)}
                  </span>
                </td>
                <td className="td hidden sm:table-cell">
                  <span className="text-xs px-2 py-0.5 rounded-md" style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(148,163,184,0.6)' }}>{p.unit}</span>
                </td>
                <td className="td">
                  <button onClick={() => handleToggle(p)} className="flex items-center gap-1.5 transition-opacity hover:opacity-80">
                    {p.active
                      ? <><ToggleRight size={18} style={{ color: '#34d399' }} /><span className="text-xs" style={{ color: '#34d399' }}>Ativo</span></>
                      : <><ToggleLeft size={18} style={{ color: 'rgba(100,116,139,0.4)' }} /><span className="text-xs" style={{ color: 'rgba(100,116,139,0.4)' }}>Inativo</span></>}
                  </button>
                </td>
                <td className="td">
                  <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg transition-all"
                      style={{ color: 'rgba(100,116,139,0.6)' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#60a5fa'; (e.currentTarget as HTMLElement).style.background = 'rgba(59,130,246,0.1)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(100,116,139,0.6)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                      <Pencil size={13} />
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

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4 animate-fade"
          style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)' }}>
          <div className="modal-card w-full max-w-md animate-fade-up">
            <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid rgba(59,130,246,0.1)' }}>
              <div>
                <p className="section-label mb-0.5">{editing ? 'Editar' : 'Novo'}</p>
                <h2 className="text-lg font-light text-white">{editing ? editing.name : 'Criar Produto'}</h2>
              </div>
              <button onClick={() => setModal(false)} className="p-1.5 rounded-lg transition-colors"
                style={{ color: 'rgba(100,116,139,0.6)' }}><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="label-dark">Nome *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="input-dark" placeholder="Ex: Gestão de Instagram" />
              </div>
              <div>
                <label className="label-dark">Descrição</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                  rows={2} className="input-dark resize-none" placeholder="Descrição breve do produto ou serviço" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-dark">Preço (R$)</label>
                  <input type="number" min="0" step="0.01" value={form.price}
                    onChange={e => setForm({ ...form, price: e.target.value })} className="input-dark" placeholder="0,00" />
                </div>
                <div>
                  <label className="label-dark">Unidade</label>
                  <select value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} className="input-dark" style={{ cursor: 'pointer' }}>
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="label-dark">Categoria</label>
                <input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                  className="input-dark" placeholder="Ex: Social Media, Tráfego Pago…"
                  list="cat-suggestions" />
                <datalist id="cat-suggestions">
                  {categories.map(c => <option key={c} value={c!} />)}
                </datalist>
              </div>
              <div className="flex items-center justify-between rounded-xl px-4 py-3"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <span className="text-sm" style={{ color: 'rgba(226,232,240,0.7)' }}>Produto ativo</span>
                <button onClick={() => setForm({ ...form, active: !form.active })} className="transition-opacity hover:opacity-80">
                  {form.active
                    ? <ToggleRight size={24} style={{ color: '#34d399' }} />
                    : <ToggleLeft size={24} style={{ color: 'rgba(100,116,139,0.4)' }} />}
                </button>
              </div>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={() => setModal(false)} className="btn-ghost flex-1 justify-center">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 justify-center">
                {saving ? 'Salvando…' : editing ? 'Salvar' : 'Criar Produto'}
              </button>
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
            <h3 className="text-white font-medium mb-2">Excluir produto?</h3>
            <p className="text-sm mb-5" style={{ color: 'rgba(148,163,184,0.55)' }}>
              O produto será removido dos deals onde está vinculado.
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
