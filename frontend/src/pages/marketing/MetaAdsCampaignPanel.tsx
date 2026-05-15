import { useEffect, useState } from 'react';
import { X, RotateCcw, ChevronDown, ChevronRight, Play, Pause, AlertCircle, Image } from 'lucide-react';
import { metaApi } from '../../api/client';

interface Props {
  clientId: number;
  campaign: { id: string; name: string; status: string; objective?: string };
  onClose: () => void;
}

const fmtR = (v: any) => `R$ ${parseFloat(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
const fmtN = (v: any) => parseInt(v || 0).toLocaleString('pt-BR');
const fmtPct = (v: any) => `${parseFloat(v || 0).toFixed(2)}%`;

function StatusBadge({ status }: { status: string }) {
  const active = status === 'ACTIVE';
  return (
    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
      style={{ color: active ? '#34d399' : 'rgba(100,116,139,0.6)', background: active ? 'rgba(52,211,153,0.1)' : 'rgba(255,255,255,0.04)', border: `1px solid ${active ? 'rgba(52,211,153,0.2)' : 'rgba(255,255,255,0.08)'}` }}>
      {active ? 'Ativa' : 'Pausada'}
    </span>
  );
}

function ToggleBtn({ status, loading, onToggle }: { status: string; loading: boolean; onToggle: () => any }) {
  const active = status === 'ACTIVE';
  return (
    <button onClick={onToggle} disabled={loading}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all disabled:opacity-40"
      style={active
        ? { color: '#fbbf24', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)' }
        : { color: '#34d399', background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)' }}>
      {loading ? <RotateCcw size={11} className="animate-spin" /> : active ? <Pause size={11} /> : <Play size={11} />}
      {active ? 'Pausar' : 'Ativar'}
    </button>
  );
}

function InsightRow({ items }: { items: { label: string; value: string; color?: string }[] }) {
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}>
      {items.map(m => (
        <div key={m.label} className="px-2.5 py-2 rounded-xl text-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <p className="text-sm font-semibold" style={{ color: m.color || '#94a3b8' }}>{m.value}</p>
          <p className="text-[9px] mt-0.5" style={{ color: 'rgba(100,116,139,0.45)' }}>{m.label}</p>
        </div>
      ))}
    </div>
  );
}

function AdCard({ ad, clientId }: { ad: any; clientId: number }) {
  const [status, setStatus] = useState(ad.status);
  const [toggling, setToggling] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const ins = ad.insights || {};
  const creative = ad.creative || {};

  // Try to extract image from creative
  const thumb = creative.thumbnail_url || creative.image_url
    || creative.object_story_spec?.link_data?.image_hash
    || null;

  const toggle = async () => {
    setToggling(true); setErr(null);
    const next = status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    try {
      await metaApi.toggleAd(clientId, ad.id, next);
      setStatus(next);
    } catch (e: any) { setErr(e?.response?.data?.error || 'Erro'); }
    setToggling(false);
  };

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
      <div className="flex gap-3 p-3">
        {/* Creative thumbnail */}
        <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
          {thumb ? (
            <img src={thumb} className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          ) : (
            <Image size={18} style={{ color: 'rgba(100,116,139,0.3)' }} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className="text-xs font-medium text-white truncate">{ad.name}</p>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <StatusBadge status={status} />
              <ToggleBtn status={status} loading={toggling} onToggle={toggle} />
            </div>
          </div>
          {creative.title && <p className="text-[11px] font-medium mb-0.5 truncate" style={{ color: 'rgba(148,163,184,0.8)' }}>{creative.title}</p>}
          {creative.body && <p className="text-[10px] line-clamp-2" style={{ color: 'rgba(100,116,139,0.6)' }}>{creative.body}</p>}
        </div>
      </div>
      {(ins.spend || ins.reach || ins.clicks) && (
        <div className="px-3 pb-3">
          <InsightRow items={[
            { label: 'Gasto', value: fmtR(ins.spend), color: '#f87171' },
            { label: 'Alcance', value: fmtN(ins.reach), color: '#60a5fa' },
            { label: 'Cliques', value: fmtN(ins.clicks), color: '#34d399' },
            { label: 'CTR', value: fmtPct(ins.ctr), color: '#a78bfa' },
          ]} />
        </div>
      )}
      {err && <p className="px-3 pb-2 text-[10px]" style={{ color: '#f87171' }}>{err}</p>}
    </div>
  );
}

function AdsetSection({ adset, clientId }: { adset: any; clientId: number }) {
  const [open, setOpen] = useState(false);
  const [ads, setAds] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [status, setStatus] = useState(adset.status);
  const [toggling, setToggling] = useState(false);
  const ins = adset.insights || {};

  const loadAds = async () => {
    if (ads !== null) { setOpen(o => !o); return; }
    setOpen(true); setLoading(true);
    try {
      const r = await metaApi.getAdsetDetail(clientId, adset.id);
      setAds(r.data.ads);
    } catch (e: any) { setErr(e?.response?.data?.error || 'Erro ao carregar anúncios'); }
    setLoading(false);
  };

  const toggle = async () => {
    setToggling(true);
    const next = status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    try {
      await metaApi.toggleAdset(clientId, adset.id, next);
      setStatus(next);
    } catch {}
    setToggling(false);
  };

  const budget = adset.daily_budget
    ? `${fmtR(parseInt(adset.daily_budget) / 100)}/dia`
    : adset.lifetime_budget
    ? `${fmtR(parseInt(adset.lifetime_budget) / 100)} total`
    : null;

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
      {/* Header */}
      <button onClick={loadAds} className="w-full px-4 py-3 text-left transition-all" style={{ background: open ? 'rgba(255,255,255,0.03)' : 'transparent' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {open ? <ChevronDown size={13} style={{ color: 'rgba(100,116,139,0.5)', flexShrink: 0 }} /> : <ChevronRight size={13} style={{ color: 'rgba(100,116,139,0.5)', flexShrink: 0 }} />}
            <div className="min-w-0">
              <p className="text-xs font-medium text-white truncate">{adset.name}</p>
              {budget && <p className="text-[10px]" style={{ color: 'rgba(100,116,139,0.45)' }}>{budget}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
            <StatusBadge status={status} />
            <ToggleBtn status={status} loading={toggling} onToggle={toggle} />
          </div>
        </div>
        {(ins.spend || ins.reach) && (
          <div className="mt-2.5 grid grid-cols-4 gap-1.5">
            {[
              { label: 'Gasto', value: fmtR(ins.spend), color: '#f87171' },
              { label: 'Alcance', value: fmtN(ins.reach), color: '#60a5fa' },
              { label: 'Cliques', value: fmtN(ins.clicks), color: '#34d399' },
              { label: 'CTR', value: fmtPct(ins.ctr), color: '#a78bfa' },
            ].map(m => (
              <div key={m.label} className="px-2 py-1.5 rounded-lg text-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                <p className="text-xs font-semibold" style={{ color: m.color }}>{m.value}</p>
                <p className="text-[8px]" style={{ color: 'rgba(100,116,139,0.4)' }}>{m.label}</p>
              </div>
            ))}
          </div>
        )}
      </button>

      {/* Ads list */}
      {open && (
        <div className="px-3 pb-3 space-y-2" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          {loading && (
            <div className="flex items-center justify-center py-4 gap-2">
              <RotateCcw size={13} className="animate-spin" style={{ color: 'rgba(100,116,139,0.4)' }} />
              <p className="text-xs" style={{ color: 'rgba(100,116,139,0.4)' }}>Carregando anúncios…</p>
            </div>
          )}
          {err && <p className="text-xs py-2" style={{ color: '#f87171' }}>{err}</p>}
          {ads !== null && !loading && ads.length === 0 && (
            <p className="text-xs text-center py-4" style={{ color: 'rgba(100,116,139,0.35)' }}>Nenhum anúncio neste conjunto</p>
          )}
          {ads !== null && !loading && ads.map((ad: any) => (
            <AdCard key={ad.id} ad={ad} clientId={clientId} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function MetaAdsCampaignPanel({ clientId, campaign, onClose }: Props) {
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [campStatus, setCampStatus] = useState(campaign.status);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    setLoading(true); setErr(null);
    metaApi.getCampaignDetail(clientId, campaign.id)
      .then(r => setDetail(r.data))
      .catch((e: any) => setErr(e?.response?.data?.error || e?.message || 'Erro ao carregar'))
      .finally(() => setLoading(false));
  }, [campaign.id]);

  const toggleCampaign = async () => {
    setToggling(true);
    const next = campStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    try {
      await metaApi.toggleCampaign(clientId, campaign.id, next);
      setCampStatus(next);
    } catch {}
    setToggling(false);
  };

  const ins = detail?.insights || {};

  return (
    <div className="fixed inset-0 z-50 flex" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="ml-auto h-full flex flex-col w-full max-w-xl overflow-hidden"
        style={{ background: 'linear-gradient(180deg,#0a0a1a,#080814)', borderLeft: '1px solid rgba(255,255,255,0.07)' }}>

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-2 mb-1">
              <StatusBadge status={campStatus} />
              {campaign.objective && (
                <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ color: '#60a5fa', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)' }}>
                  {campaign.objective.replace(/_/g, ' ').toLowerCase()}
                </span>
              )}
            </div>
            <h2 className="text-base font-semibold text-white leading-snug">{campaign.name}</h2>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <ToggleBtn status={campStatus} loading={toggling} onToggle={toggleCampaign} />
            <button onClick={onClose} className="p-2 rounded-xl transition-all"
              style={{ color: 'rgba(100,116,139,0.5)', background: 'rgba(255,255,255,0.04)' }}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {loading && (
            <div className="flex items-center justify-center py-16 gap-2">
              <RotateCcw size={16} className="animate-spin" style={{ color: 'rgba(100,116,139,0.4)' }} />
              <p className="text-sm" style={{ color: 'rgba(100,116,139,0.4)' }}>Carregando campanha…</p>
            </div>
          )}

          {err && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
              style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.18)', color: '#f87171' }}>
              <AlertCircle size={14} /> {err}
            </div>
          )}

          {detail && !loading && (
            <>
              {/* ROI card — só aparece se tiver receita do Pixel */}
              {ins.revenue > 0 && (
                <div className="rounded-xl p-4 space-y-3" style={{ background: 'linear-gradient(135deg,rgba(52,211,153,0.07),rgba(59,130,246,0.05))', border: '1px solid rgba(52,211,153,0.2)' }}>
                  <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(52,211,153,0.7)' }}>ROI da Campanha</p>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: 'Gasto', value: fmtR(ins.spend), color: '#f87171' },
                      { label: 'Receita', value: fmtR(ins.revenue), color: '#34d399' },
                      { label: 'ROAS', value: `${(ins.roas || 0).toFixed(2)}x`, color: '#60a5fa' },
                      { label: 'ROI', value: ins.roi !== null ? `${ins.roi >= 0 ? '+' : ''}${ins.roi.toFixed(0)}%` : '—', color: ins.roi >= 0 ? '#34d399' : '#f87171' },
                    ].map(m => (
                      <div key={m.label} className="text-center px-2 py-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                        <p className="text-sm font-bold" style={{ color: m.color }}>{m.value}</p>
                        <p className="text-[9px] mt-0.5" style={{ color: 'rgba(100,116,139,0.45)' }}>{m.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Métricas gerais */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-2.5" style={{ color: 'rgba(100,116,139,0.4)' }}>Últimos 30 dias</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Gasto', value: fmtR(ins.spend), color: '#f87171' },
                    { label: 'Alcance', value: fmtN(ins.reach), color: '#60a5fa' },
                    { label: 'Impressões', value: fmtN(ins.impressions), color: '#a78bfa' },
                    { label: 'Cliques', value: fmtN(ins.clicks), color: '#34d399' },
                    { label: 'CTR', value: fmtPct(ins.ctr), color: '#fbbf24' },
                    { label: 'CPM', value: fmtR(ins.cpm), color: '#fb923c' },
                  ].map(m => (
                    <div key={m.label} className="px-3 py-2.5 rounded-xl text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <p className="text-base font-semibold" style={{ color: m.color }}>{m.value}</p>
                      <p className="text-[9px] mt-0.5" style={{ color: 'rgba(100,116,139,0.45)' }}>{m.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Ad Sets */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-2.5" style={{ color: 'rgba(100,116,139,0.4)' }}>
                  Conjuntos de anúncios ({detail.adsets?.length || 0})
                </p>
                {detail.adsets?.length === 0 && (
                  <p className="text-xs text-center py-6" style={{ color: 'rgba(100,116,139,0.35)' }}>Nenhum conjunto encontrado</p>
                )}
                <div className="space-y-2">
                  {(detail.adsets || []).map((adset: any) => (
                    <AdsetSection key={adset.id} adset={adset} clientId={clientId} />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
