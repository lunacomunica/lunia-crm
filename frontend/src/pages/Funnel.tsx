import { useEffect, useState } from 'react';
import { Plus, X, ChevronRight, ChevronLeft, Trash2, Target, Package, Search } from 'lucide-react';
import { dealsApi, contactsApi, productsApi } from '../api/client';
import { Deal, Contact, Product, DealProduct } from '../types';

const STAGES = [
  { id: 'prospecting', label: 'Prospecção', color: '#6366f1', glow: 'rgba(99,102,241,0.35)' },
  { id: 'proposal',    label: 'Proposta',   color: '#f59e0b', glow: 'rgba(245,158,11,0.35)' },
  { id: 'negotiation', label: 'Negociação', color: '#f97316', glow: 'rgba(249,115,22,0.35)' },
  { id: 'closing',     label: 'Fechamento', color: '#10b981', glow: 'rgba(16,185,129,0.35)' },
];
const STAGE_ORDER = STAGES.map(s => s.id);

function fmt(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);
}

const AVATAR_COLORS = [
  'linear-gradient(135deg,#3b82f6,#6366f1)',
  'linear-gradient(135deg,#8b5cf6,#ec4899)',
  'linear-gradient(135deg,#10b981,#06b6d4)',
  'linear-gradient(135deg,#f59e0b,#ef4444)',
];

function Avatar({ name }: { name: string }) {
  const initials = (name || '?').split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
  return (
    <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0"
      style={{ background: AVATAR_COLORS[(name || '?').charCodeAt(0) % AVATAR_COLORS.length] }}>
      {initials}
    </div>
  );
}

function DealCard({ deal, stage, onStageChange, onEdit, onDelete }: {
  deal: Deal; stage: typeof STAGES[0];
  onStageChange: (id: number, s: string) => void;
  onEdit: (d: Deal) => void;
  onDelete: (id: number) => void;
}) {
  const idx = STAGE_ORDER.indexOf(deal.stage);
  const canBack = idx > 0;
  const canFwd  = idx < STAGE_ORDER.length - 1;

  return (
    <div
      className="rounded-xl p-4 cursor-pointer group transition-all duration-200"
      style={{
        background: 'linear-gradient(145deg, #0c0c28 0%, #0e0e2e 100%)',
        border: '1px solid rgba(59,130,246,0.1)',
        boxShadow: '0 2px 16px rgba(0,0,0,0.4)',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.borderColor = `${stage.color}33`;
        (e.currentTarget as HTMLElement).style.boxShadow = `0 0 20px ${stage.glow.replace('0.35','0.1')}, 0 4px 20px rgba(0,0,0,0.5)`;
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(59,130,246,0.1)';
        (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 16px rgba(0,0,0,0.4)';
      }}
      onClick={() => onEdit(deal)}
    >
      {/* Top */}
      <div className="flex items-start justify-between mb-2">
        <p className="text-sm font-medium text-white leading-tight flex-1 pr-2 line-clamp-2">{deal.title}</p>
        <button
          onClick={e => { e.stopPropagation(); onDelete(deal.id); }}
          className="opacity-0 group-hover:opacity-100 p-1 rounded-lg transition-all flex-shrink-0"
          style={{ color: 'rgba(100,116,139,0.6)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#f87171'; (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.1)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(100,116,139,0.6)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
        >
          <Trash2 size={11} />
        </button>
      </div>

      {/* Contact */}
      {deal.contact_name && (
        <div className="flex items-center gap-1.5 mb-3">
          <Avatar name={deal.contact_name} />
          <p className="text-xs truncate" style={{ color: 'rgba(100,116,139,0.65)' }}>{deal.contact_name}</p>
        </div>
      )}

      {/* Products count */}
      {deal.products && deal.products.length > 0 && (
        <div className="flex items-center gap-1 mb-2">
          <Package size={10} style={{ color: 'rgba(96,165,250,0.6)' }} />
          <span className="text-[10px]" style={{ color: 'rgba(96,165,250,0.6)' }}>
            {deal.products.length} produto{deal.products.length > 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Value + probability */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold" style={{ color: stage.color, textShadow: `0 0 12px ${stage.glow}` }}>
          {fmt(deal.value)}
        </span>
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={{
            background: `${stage.color}15`,
            color: stage.color,
            border: `1px solid ${stage.color}30`,
          }}
        >
          {deal.probability}%
        </span>
      </div>

      {/* Stage arrows */}
      <div className="flex gap-1.5" onClick={e => e.stopPropagation()}>
        <button
          onClick={() => canBack && onStageChange(deal.id, STAGE_ORDER[idx - 1])}
          disabled={!canBack}
          className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] transition-all"
          style={{ color: canBack ? 'rgba(100,116,139,0.6)' : 'rgba(100,116,139,0.2)', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}
        >
          <ChevronLeft size={10} /> Voltar
        </button>
        <button
          onClick={() => canFwd && onStageChange(deal.id, STAGE_ORDER[idx + 1])}
          disabled={!canFwd}
          className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] transition-all"
          style={canFwd
            ? { color: stage.color, background: `${stage.color}10`, border: `1px solid ${stage.color}25` }
            : { color: 'rgba(100,116,139,0.2)', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}
        >
          Avançar <ChevronRight size={10} />
        </button>
      </div>
    </div>
  );
}

const emptyDeal = { contact_id: '' as any, title: '', value: '', stage: 'prospecting', probability: '20', expected_close_date: '', notes: '' };

function ProductSelector({ items, onChange, allProducts }: {
  items: DealProduct[]; onChange: (items: DealProduct[]) => void; allProducts: Product[];
}) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  const active = allProducts.filter(p => p.active);
  const filtered = active.filter(p =>
    !items.find(i => i.product_id === p.id) &&
    (p.name.toLowerCase().includes(search.toLowerCase()) || (p.category || '').toLowerCase().includes(search.toLowerCase()))
  ).slice(0, 6);

  const add = (p: Product) => {
    onChange([...items, { product_id: p.id, name: p.name, unit: p.unit, category: p.category, quantity: 1, unit_price: p.price }]);
    setSearch(''); setOpen(false);
  };
  const remove = (pid: number) => onChange(items.filter(i => i.product_id !== pid));
  const updateQty = (pid: number, qty: number) => onChange(items.map(i => i.product_id === pid ? { ...i, quantity: qty } : i));
  const updatePrice = (pid: number, price: number) => onChange(items.map(i => i.product_id === pid ? { ...i, unit_price: price } : i));

  return (
    <div>
      {items.length > 0 && (
        <div className="space-y-2 mb-3">
          {items.map(item => (
            <div key={item.product_id} className="flex items-center gap-2 rounded-xl px-3 py-2"
              style={{ background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.12)' }}>
              <Package size={12} style={{ color: '#60a5fa', flexShrink: 0 }} />
              <span className="text-sm text-white flex-1 truncate">{item.name}</span>
              <span className="text-xs" style={{ color: 'rgba(100,116,139,0.5)' }}>{item.unit}</span>
              <input type="number" min="0.01" step="0.01" value={item.quantity}
                onChange={e => updateQty(item.product_id, parseFloat(e.target.value) || 1)}
                className="w-16 text-center rounded-lg px-2 py-1 text-xs"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#e2e8f0' }} />
              <span className="text-xs" style={{ color: 'rgba(100,116,139,0.5)' }}>×</span>
              <input type="number" min="0" step="0.01" value={item.unit_price}
                onChange={e => updatePrice(item.product_id, parseFloat(e.target.value) || 0)}
                className="w-24 text-right rounded-lg px-2 py-1 text-xs"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#34d399' }} />
              <button onClick={() => remove(item.product_id)} style={{ color: 'rgba(100,116,139,0.5)', flexShrink: 0 }}
                onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(100,116,139,0.5)')}>
                <X size={12} />
              </button>
            </div>
          ))}
          <div className="flex justify-between items-center px-3 pt-1">
            <span className="text-xs" style={{ color: 'rgba(100,116,139,0.5)' }}>Total calculado</span>
            <span className="text-sm font-semibold" style={{ color: '#34d399' }}>
              {fmt(items.reduce((s, i) => s + i.quantity * i.unit_price, 0))}
            </span>
          </div>
        </div>
      )}
      <div className="relative">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(59,130,246,0.4)' }} />
        <input value={search} onChange={e => { setSearch(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Buscar e adicionar produto…" className="input-dark pl-8 text-sm" />
        {open && (filtered.length > 0 || search) && (
          <div className="absolute z-50 w-full mt-1 rounded-xl overflow-hidden"
            style={{ background: '#0d0d1f', border: '1px solid rgba(59,130,246,0.2)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
            {filtered.length === 0
              ? <p className="px-4 py-3 text-sm" style={{ color: 'rgba(100,116,139,0.5)' }}>Nenhum produto encontrado</p>
              : filtered.map(p => (
                <button key={p.id} onMouseDown={() => add(p)}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors"
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(59,130,246,0.08)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <div className="flex items-center gap-2">
                    <Package size={12} style={{ color: '#60a5fa' }} />
                    <span className="text-sm text-white">{p.name}</span>
                    {p.category && <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(148,163,184,0.5)' }}>{p.category}</span>}
                  </div>
                  <span className="text-xs font-medium" style={{ color: '#34d399' }}>{fmt(p.price)}/{p.unit}</span>
                </button>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Funnel() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Deal | null>(null);
  const [form, setForm] = useState(emptyDeal);
  const [dealProducts, setDealProducts] = useState<DealProduct[]>([]);
  const [valueOverride, setValueOverride] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);

  const load = () => { dealsApi.list().then(r => { setDeals(r.data); setLoading(false); }); };
  useEffect(() => {
    load();
    contactsApi.list({ limit: '200' }).then(r => setContacts(r.data.contacts));
    productsApi.list().then(r => setAllProducts(r.data));
  }, []);

  const calcTotal = (items: DealProduct[]) => items.reduce((s, i) => s + i.quantity * i.unit_price, 0);

  const openCreate = (stage = 'prospecting') => {
    setEditing(null); setDealProducts([]); setValueOverride(false);
    setForm({ ...emptyDeal, stage }); setModal(true);
  };
  const openEdit = async (d: Deal) => {
    setEditing(d);
    setForm({
      contact_id: d.contact_id || '',
      title: d.title, value: String(d.value), stage: d.stage,
      probability: String(d.probability), expected_close_date: d.expected_close_date || '', notes: d.notes || '',
    });
    const full = await dealsApi.get(d.id);
    const prods: DealProduct[] = full.data.products || [];
    setDealProducts(prods);
    setValueOverride(prods.length === 0 || Math.abs(d.value - calcTotal(prods)) > 0.01);
    setModal(true);
  };

  const handleProductsChange = (items: DealProduct[]) => {
    setDealProducts(items);
    if (!valueOverride) setForm(f => ({ ...f, value: String(calcTotal(items)) }));
  };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    const finalValue = valueOverride ? parseFloat(form.value) || 0 : calcTotal(dealProducts);
    const payload = {
      ...form,
      contact_id: form.contact_id ? Number(form.contact_id) : null,
      value: finalValue,
      probability: parseInt(form.probability) || 0,
      products: dealProducts.map(p => ({ product_id: p.product_id, quantity: p.quantity, unit_price: p.unit_price })),
    };
    if (editing) await dealsApi.update(editing.id, payload);
    else await dealsApi.create(payload);
    setSaving(false); setModal(false); load();
  };

  const handleStage = async (id: number, stage: string) => {
    setDeals(prev => prev.map(d => d.id === id ? { ...d, stage: stage as any } : d));
    await dealsApi.updateStage(id, stage);
  };

  const handleDelete = async (id: number) => { await dealsApi.delete(id); setDeleting(null); load(); };

  const total = deals.reduce((a, d) => a + d.value, 0);

  return (
    <div className="p-8 h-full" style={{ minHeight: '100vh' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-8 animate-fade-up">
        <div>
          <p className="section-label mb-1">Pipeline</p>
          <h1 className="text-3xl font-extralight text-white tracking-tight" style={{ textShadow: '0 0 30px rgba(59,130,246,0.2)' }}>
            Funil de Vendas
          </h1>
          <p className="text-sm mt-1" style={{ color: 'rgba(100,116,139,0.65)' }}>
            {deals.length} deals · <span style={{ color: '#34d399' }}>{fmt(total)}</span>
          </p>
        </div>
        <button onClick={() => openCreate()} className="btn-primary"><Plus size={15} /> Novo Deal</button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: 'rgba(59,130,246,0.3)', borderTopColor: '#3b82f6' }} />
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-4 h-[calc(100vh-220px)]">
          {STAGES.map((stage, si) => {
            const stageDeals = deals.filter(d => d.stage === stage.id);
            const stageValue = stageDeals.reduce((a, d) => a + d.value, 0);
            return (
              <div
                key={stage.id}
                className="flex flex-col rounded-2xl overflow-hidden animate-fade-up"
                style={{
                  animationDelay: `${si * 60}ms`,
                  background: 'rgba(255,255,255,0.012)',
                  border: '1px solid rgba(59,130,246,0.07)',
                }}
              >
                {/* Column header */}
                <div className="px-4 py-4" style={{ borderBottom: `1px solid ${stage.color}18` }}>
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className="text-xs font-bold px-2.5 py-1 rounded-lg"
                      style={{
                        background: `${stage.color}12`,
                        color: stage.color,
                        border: `1px solid ${stage.color}25`,
                        textShadow: `0 0 8px ${stage.glow}`,
                      }}
                    >
                      {stage.label}
                    </span>
                    <span className="text-xs font-semibold" style={{ color: 'rgba(100,116,139,0.6)' }}>
                      {stageDeals.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Target size={12} style={{ color: stage.color, opacity: 0.7 }} />
                    <span className="text-sm font-semibold" style={{ color: stage.color }}>
                      {fmt(stageValue)}
                    </span>
                  </div>
                </div>

                {/* Cards */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {stageDeals.map(deal => (
                    <DealCard key={deal.id} deal={deal} stage={stage}
                      onStageChange={handleStage} onEdit={openEdit} onDelete={setDeleting} />
                  ))}
                  <button
                    onClick={() => openCreate(stage.id)}
                    className="w-full py-2.5 rounded-xl text-xs transition-all duration-150 flex items-center justify-center gap-1.5"
                    style={{
                      border: `1px dashed ${stage.color}20`,
                      color: 'rgba(100,116,139,0.4)',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = `${stage.color}40`;
                      (e.currentTarget as HTMLElement).style.color = stage.color;
                      (e.currentTarget as HTMLElement).style.background = `${stage.color}06`;
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = `${stage.color}20`;
                      (e.currentTarget as HTMLElement).style.color = 'rgba(100,116,139,0.4)';
                      (e.currentTarget as HTMLElement).style.background = 'transparent';
                    }}
                  >
                    <Plus size={11} /> Adicionar deal
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Deal modal */}
      {modal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4 animate-fade"
          style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)' }}>
          <div className="modal-card w-full max-w-lg animate-fade-up">
            <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid rgba(59,130,246,0.1)' }}>
              <div>
                <p className="section-label mb-0.5">{editing ? 'Editar' : 'Novo'}</p>
                <h2 className="text-lg font-light text-white">{editing ? editing.title : 'Criar Deal'}</h2>
              </div>
              <button onClick={() => setModal(false)} className="p-1.5 rounded-lg transition-colors"
                style={{ color: 'rgba(100,116,139,0.6)' }}><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="label-dark">Título *</label>
                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="input-dark" />
              </div>
              <div>
                <label className="label-dark">Contato</label>
                <select value={form.contact_id} onChange={e => setForm({ ...form, contact_id: e.target.value })} className="input-dark" style={{ cursor: 'pointer' }}>
                  <option value="">Sem contato</option>
                  {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              {/* Products */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Package size={13} style={{ color: '#60a5fa' }} />
                  <label className="label-dark mb-0">Produtos / Serviços</label>
                </div>
                <ProductSelector items={dealProducts} onChange={handleProductsChange} allProducts={allProducts} />
              </div>

              {/* Value */}
              <div className="rounded-xl p-4 space-y-3" style={{ background: 'rgba(52,211,153,0.04)', border: '1px solid rgba(52,211,153,0.12)' }}>
                <div className="flex items-center justify-between">
                  <label className="label-dark mb-0">Valor do Deal (R$)</label>
                  {dealProducts.length > 0 && (
                    <button onClick={() => { setValueOverride(v => !v); if (valueOverride) setForm(f => ({ ...f, value: String(calcTotal(dealProducts)) })); }}
                      className="text-xs transition-colors"
                      style={{ color: valueOverride ? 'rgba(100,116,139,0.5)' : '#34d399' }}>
                      {valueOverride ? 'Usar total dos produtos' : 'Editar manualmente'}
                    </button>
                  )}
                </div>
                <input type="number" value={form.value}
                  onChange={e => { setValueOverride(true); setForm({ ...form, value: e.target.value }); }}
                  readOnly={!valueOverride && dealProducts.length > 0}
                  className="input-dark"
                  style={!valueOverride && dealProducts.length > 0 ? { opacity: 0.6, cursor: 'default' } : {}} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-dark">Probabilidade (%)</label>
                  <input type="number" min="0" max="100" value={form.probability} onChange={e => setForm({ ...form, probability: e.target.value })} className="input-dark" />
                </div>
                <div>
                  <label className="label-dark">Previsão de Fechamento</label>
                  <input type="date" value={form.expected_close_date} onChange={e => setForm({ ...form, expected_close_date: e.target.value })} className="input-dark" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-dark">Estágio</label>
                  <select value={form.stage} onChange={e => setForm({ ...form, stage: e.target.value })} className="input-dark" style={{ cursor: 'pointer' }}>
                    {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="label-dark">Observações</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} className="input-dark resize-none" />
              </div>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={() => setModal(false)} className="btn-ghost flex-1 justify-center">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 justify-center">
                {saving ? 'Salvando…' : editing ? 'Salvar' : 'Criar Deal'}
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
            <h3 className="text-white font-medium mb-2">Excluir deal?</h3>
            <p className="text-sm mb-5" style={{ color: 'rgba(148,163,184,0.55)' }}>Esta ação é permanente.</p>
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
