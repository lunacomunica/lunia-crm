import { useState, useEffect } from 'react';
import { Save, Check, BookOpen, Users, Palette, Sparkles } from 'lucide-react';
import { clientPortalApi } from '../../api/client';

type PosTab = 'marca' | 'publico' | 'branding';

interface PosData {
  sobre: string; historia: string;
  promessa_completa: string; promessa_curta: string;
  transformacao_narrativa: string; transformacao_procedencia: string;
  diferencial_1: string; diferencial_2: string; diferencial_3: string;
  icp_quem_e: string; icp_quem_nao_e: string; icp_psicologico: string;
  crencas_tentou: string; crencas_nao_acredita: string;
  desejos_secretos: string; desejos_aspiracional: string;
  dores_profundas: string; dores_travando: string;
  objecoes_desculpas: string; objecoes_medos: string;
}

const EMPTY: PosData = {
  sobre: '', historia: '', promessa_completa: '', promessa_curta: '',
  transformacao_narrativa: '', transformacao_procedencia: '',
  diferencial_1: '', diferencial_2: '', diferencial_3: '',
  icp_quem_e: '', icp_quem_nao_e: '', icp_psicologico: '',
  crencas_tentou: '', crencas_nao_acredita: '',
  desejos_secretos: '', desejos_aspiracional: '',
  dores_profundas: '', dores_travando: '',
  objecoes_desculpas: '', objecoes_medos: '',
};

const TABS = [
  { id: 'marca'    as PosTab, label: 'Marca',    icon: BookOpen, color: '#60a5fa', glow: 'rgba(59,130,246,0.15)'  },
  { id: 'publico'  as PosTab, label: 'Público',  icon: Users,    color: '#34d399', glow: 'rgba(52,211,153,0.15)'  },
  { id: 'branding' as PosTab, label: 'Branding', icon: Palette,  color: '#a78bfa', glow: 'rgba(167,139,250,0.15)' },
];

/* ── Field ──────────────────────────────────────────────────────────────────── */
function Field({ label, value, onChange, rows = 3, placeholder, accent = '#60a5fa' }: {
  label: string; value: string; onChange: (v: string) => void;
  rows?: number; placeholder?: string; accent?: string;
}) {
  const accentBg = accent === '#60a5fa' ? 'rgba(59,130,246,0.04)'
    : accent === '#34d399' ? 'rgba(52,211,153,0.04)'
    : 'rgba(167,139,250,0.04)';
  const accentRing = accent === '#60a5fa' ? 'rgba(59,130,246,0.25)'
    : accent === '#34d399' ? 'rgba(52,211,153,0.25)'
    : 'rgba(167,139,250,0.25)';
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-widest mb-2"
        style={{ color: 'rgba(100,116,139,0.5)' }}>{label}</label>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-200"
        style={{
          background: 'rgba(255,255,255,0.025)',
          border: '1px solid rgba(255,255,255,0.06)',
          resize: 'none',
          lineHeight: '1.75',
          color: 'rgba(226,232,240,0.9)',
          fontFamily: 'inherit',
        }}
        onFocus={e => {
          e.currentTarget.style.borderColor = accentRing;
          e.currentTarget.style.background = accentBg;
          e.currentTarget.style.boxShadow = `0 0 0 3px ${accentRing}`;
        }}
        onBlur={e => {
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
          e.currentTarget.style.background = 'rgba(255,255,255,0.025)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      />
    </div>
  );
}

/* ── Card ───────────────────────────────────────────────────────────────────── */
function Card({ num, title, desc, accent, children }: {
  num: string; title: string; desc: string; accent: string; children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: 'linear-gradient(145deg,#0c0c22,#0e0e2a)', border: '1px solid rgba(255,255,255,0.05)' }}>
      <div className="px-6 py-4 flex items-center gap-4"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: 'rgba(255,255,255,0.01)' }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0"
          style={{ background: `${accent}18`, color: accent, border: `1px solid ${accent}30` }}>
          {num}
        </div>
        <div>
          <p className="text-sm font-semibold text-white">{title}</p>
          <p className="text-[11px] mt-0.5 leading-snug" style={{ color: 'rgba(100,116,139,0.5)' }}>{desc}</p>
        </div>
      </div>
      <div className="px-6 py-5 space-y-4">{children}</div>
    </div>
  );
}

/* ── Main ───────────────────────────────────────────────────────────────────── */
export default function ClientPositioning({ clientId }: { clientId: number }) {
  const [tab, setTab] = useState<PosTab>('marca');
  const [data, setData] = useState<PosData>(EMPTY);
  const [orig, setOrig] = useState<PosData>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    clientPortalApi.positioning(clientId).then(r => {
      const d = { ...EMPTY, ...r.data };
      setData(d); setOrig(d);
    });
  }, [clientId]);

  const isDirty = JSON.stringify(data) !== JSON.stringify(orig);

  const set = (key: keyof PosData) => (v: string) => setData(p => ({ ...p, [key]: v }));

  const save = async () => {
    setSaving(true);
    await clientPortalApi.updatePositioning(clientId, data);
    setOrig(data); setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const activeTab = TABS.find(t => t.id === tab)!;

  return (
    <div className="relative">

      {/* ── Tab header ──────────────────────────────────────────────────── */}
      <div className="flex gap-1 p-1 mb-6 rounded-2xl"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
        {TABS.map(t => {
          const active = tab === t.id;
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all duration-300"
              style={{
                color: active ? t.color : 'rgba(100,116,139,0.5)',
                background: active ? `${t.color}12` : 'transparent',
                border: active ? `1px solid ${t.color}25` : '1px solid transparent',
                boxShadow: active ? `0 0 20px ${t.glow}` : 'none',
              }}>
              <Icon size={14} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ── MARCA ───────────────────────────────────────────────────────── */}
      {tab === 'marca' && (
        <div className="space-y-4">
          <Card num="01" title="Sobre a Marca" accent={activeTab.color}
            desc="O que ela faz, onde atua, qual o momento atual. Objetivo e factual, sem adjetivos genéricos.">
            <Field label="Descrição da marca" accent={activeTab.color}
              value={data.sobre} onChange={set('sobre')} rows={4}
              placeholder="Descreva a marca em 2 a 3 frases. O que ela faz, onde atua, qual o momento atual do negócio. Seja objetivo e factual, sem adjetivos genéricos." />
          </Card>

          <Card num="02" title="História & Trajetória" accent={activeTab.color}
            desc="Busque o conflito e a virada — não uma linha do tempo.">
            <Field label="De onde vem? O que construiu?" accent={activeTab.color}
              value={data.historia} onChange={set('historia')} rows={5}
              placeholder="De onde vem? O que construiu e de onde?&#10;O que torna sua trajetória identificável para a audiência?&#10;Busque o conflito e a virada, não uma linha do tempo." />
          </Card>

          <Card num="03" title="Promessa" accent={activeTab.color}
            desc="Específica o suficiente para eliminar qualquer concorrente genérico.">
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Versão completa" accent={activeTab.color}
                value={data.promessa_completa} onChange={set('promessa_completa')} rows={5}
                placeholder="Eu ajudo [quem] a sair de [problema] através de [método], para que [resultado transformador]." />
              <Field label="Versão curta — bio ou stories" accent={activeTab.color}
                value={data.promessa_curta} onChange={set('promessa_curta')} rows={5}
                placeholder="A mesma promessa em 1 frase. Se demorar mais de 5 segundos para entender, refaça." />
            </div>
          </Card>

          <Card num="04" title="Transformação" accent={activeTab.color}
            desc="O mecanismo que justifica o preço — e a prova de que funciona.">
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Narrativa de transformação" accent={activeTab.color}
                value={data.transformacao_narrativa} onChange={set('transformacao_narrativa')} rows={5}
                placeholder="Como a marca entrega a transformação?&#10;Qual é o processo, o método, o caminho que ela usa e que ninguém mais usa do mesmo jeito?" />
              <Field label="Procedência — por que acreditar" accent={activeTab.color}
                value={data.transformacao_procedencia} onChange={set('transformacao_procedencia')} rows={5}
                placeholder="Por que essa marca tem autoridade para entregar isso?&#10;Qual a prova de que o método funciona? Dado real, conquista verificável, frase de impacto." />
            </div>
          </Card>

          <Card num="05" title="Diferenciais Incopiáveis" accent={activeTab.color}
            desc="3 diferenciais validados que nenhum concorrente pode simplesmente copiar.">
            <div className="grid md:grid-cols-3 gap-3">
              {(['diferencial_1','diferencial_2','diferencial_3'] as const).map((k, i) => (
                <div key={k} className="relative">
                  <span className="absolute top-3 left-4 text-3xl font-black leading-none select-none"
                    style={{ color: `${activeTab.color}18` }}>0{i+1}</span>
                  <textarea
                    value={data[k]} onChange={e => set(k)(e.target.value)}
                    rows={4} placeholder={`Diferencial ${i+1}`}
                    className="w-full pt-8 pb-3 px-4 rounded-xl text-sm outline-none transition-all duration-200 relative"
                    style={{
                      background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)',
                      resize: 'none', lineHeight: '1.6', color: 'rgba(226,232,240,0.9)', fontFamily: 'inherit',
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = `${activeTab.color}40`; e.currentTarget.style.boxShadow = `0 0 0 3px ${activeTab.color}15`; }}
                    onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.boxShadow = 'none'; }}
                  />
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ── PÚBLICO ─────────────────────────────────────────────────────── */}
      {tab === 'publico' && (
        <div className="space-y-4">
          <Card num="01" title="Perfil do Cliente Ideal" accent={activeTab.color}
            desc="Quem é, quem definitivamente não é, e o retrato psicológico completo.">
            <Field label="Quem é" accent={activeTab.color}
              value={data.icp_quem_e} onChange={set('icp_quem_e')} rows={3}
              placeholder="Descreva quem é o cliente ideal: perfil, contexto, fase de vida ou negócio..." />
            <Field label="Quem não é" accent={activeTab.color}
              value={data.icp_quem_nao_e} onChange={set('icp_quem_nao_e')} rows={3}
              placeholder="Quem essa marca não atende? Seja específico — não é só 'todo mundo'." />
            <Field label="Descrição psicológica" accent={activeTab.color}
              value={data.icp_psicologico} onChange={set('icp_psicologico')} rows={4}
              placeholder="Como ele pensa? O que o move? Como toma decisões? Qual é o seu mundo interno?" />
          </Card>

          <Card num="02" title="Crenças" accent={activeTab.color}
            desc="O que já tentou e por que não acredita mais em certas soluções.">
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="O que já tentou" accent={activeTab.color}
                value={data.crencas_tentou} onChange={set('crencas_tentou')} rows={5}
                placeholder="Quais soluções, métodos ou promessas ele já tentou antes de chegar aqui?" />
              <Field label="O que não acredita mais" accent={activeTab.color}
                value={data.crencas_nao_acredita} onChange={set('crencas_nao_acredita')} rows={5}
                placeholder="O que ele desacreditou? Que tipo de discurso já não cola mais com ele?" />
            </div>
          </Card>

          <Card num="03" title="Desejos" accent={activeTab.color}
            desc="O que ele realmente quer — por baixo das palavras.">
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Desejos mais secretos" accent={activeTab.color}
                value={data.desejos_secretos} onChange={set('desejos_secretos')} rows={5}
                placeholder="O que ele quer mas não fala em voz alta? O que te diria num jantar íntimo, não numa pesquisa?" />
              <Field label="Sonho aspiracional" accent={activeTab.color}
                value={data.desejos_aspiracional} onChange={set('desejos_aspiracional')} rows={5}
                placeholder="Qual é o cenário dos sonhos que ele deseja alcançar? Seja visual e específico." />
            </div>
          </Card>

          <Card num="04" title="Dores" accent={activeTab.color}
            desc="As feridas que ainda não curaram — e onde a vida trava.">
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Dores mais profundas" accent={activeTab.color}
                value={data.dores_profundas} onChange={set('dores_profundas')} rows={5}
                placeholder="Quais são as dores que ele ainda não conseguiu resolver? O que dói de verdade?" />
              <Field label="Onde sente que está travando" accent={activeTab.color}
                value={data.dores_travando} onChange={set('dores_travando')} rows={5}
                placeholder="Em que parte da vida ou do negócio ele sente que não consegue avançar?" />
            </div>
          </Card>

          <Card num="05" title="Objeções" accent={activeTab.color}
            desc="As desculpas e os medos que impedem a decisão.">
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Desculpas para não comprar" accent={activeTab.color}
                value={data.objecoes_desculpas} onChange={set('objecoes_desculpas')} rows={5}
                placeholder="O que ele diz para justificar a inação? 'Não é o momento certo', 'Preciso pensar mais'..." />
              <Field label="Medos de tomar a decisão errada" accent={activeTab.color}
                value={data.objecoes_medos} onChange={set('objecoes_medos')} rows={5}
                placeholder="O que ele teme que aconteça se investir e não funcionar? Qual é o pior cenário na cabeça dele?" />
            </div>
          </Card>
        </div>
      )}

      {/* ── BRANDING ────────────────────────────────────────────────────── */}
      {tab === 'branding' && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
            style={{ background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)' }}>
            <Sparkles size={28} style={{ color: '#a78bfa' }} />
          </div>
          <p className="text-base font-semibold text-white mb-2">Branding em construção</p>
          <p className="text-sm max-w-xs" style={{ color: 'rgba(100,116,139,0.5)', lineHeight: '1.7' }}>
            Paleta, tipografia, tom de voz e identidade visual chegam em breve.
          </p>
        </div>
      )}

      {/* ── Floating save ───────────────────────────────────────────────── */}
      <div className={`fixed bottom-8 right-8 z-50 transition-all duration-300 ${isDirty || saved ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
        <button onClick={save} disabled={saving || saved}
          className="flex items-center gap-2.5 px-5 py-3 rounded-2xl text-sm font-semibold text-white shadow-2xl transition-all duration-200"
          style={{
            background: saved ? 'linear-gradient(135deg,#34d399,#059669)' : `linear-gradient(135deg,${activeTab.color},#6366f1)`,
            boxShadow: saved ? '0 8px 32px rgba(52,211,153,0.4)' : `0 8px 32px ${activeTab.glow}`,
          }}>
          {saving ? (
            <div className="w-4 h-4 rounded-full border-2 animate-spin"
              style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} />
          ) : saved ? (
            <><Check size={15} /> Salvo</>
          ) : (
            <><Save size={15} /> Salvar alterações</>
          )}
        </button>
      </div>
    </div>
  );
}
