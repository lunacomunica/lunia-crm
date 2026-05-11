import { useState, useEffect } from 'react';
import { Save, Check, BookOpen, Users, Palette, Link2, Image as ImageIcon, Type, LayoutGrid, MessageSquare, Hash, AlertTriangle, ExternalLink, Plus, X, Smile, ChevronRight } from 'lucide-react';
import { clientPortalApi } from '../../api/client';

type PosTab = 'marca' | 'publico' | 'branding';

interface Sensacao { sensacao: string; explicacao: string; }

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
  branding_direcao: string;
  branding_sensacoes: string;
  visual_identidade_link: string;
  visual_logo_url: string; visual_logo_texto: string;
  visual_cores_url: string; visual_cores_texto: string;
  visual_tipografia_url: string; visual_tipografia_texto: string;
  visual_mood_pinterest: string; visual_mood_url: string;
  verbal_tom: string; verbal_jargoes: string; verbal_emojis: string;
  proibido_design: string; proibido_imagens: string;
  proibido_conteudo: string; proibido_copys: string;
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
  branding_direcao: '', branding_sensacoes: '[]',
  visual_identidade_link: '',
  visual_logo_url: '', visual_logo_texto: '',
  visual_cores_url: '', visual_cores_texto: '',
  visual_tipografia_url: '', visual_tipografia_texto: '',
  visual_mood_pinterest: '', visual_mood_url: '',
  verbal_tom: '', verbal_jargoes: '', verbal_emojis: '',
  proibido_design: '', proibido_imagens: '',
  proibido_conteudo: '', proibido_copys: '',
};

const TABS = [
  { id: 'marca'    as PosTab, label: 'Marca',    icon: BookOpen, color: '#60a5fa', glow: 'rgba(59,130,246,0.15)'  },
  { id: 'publico'  as PosTab, label: 'Público',  icon: Users,    color: '#34d399', glow: 'rgba(52,211,153,0.15)'  },
  { id: 'branding' as PosTab, label: 'Branding', icon: Palette,  color: '#a78bfa', glow: 'rgba(167,139,250,0.15)' },
];

type SectionId =
  | 'sobre' | 'historia' | 'promessa' | 'transformacao' | 'diferenciais'
  | 'icp' | 'crencas' | 'desejos' | 'dores' | 'objecoes'
  | 'direcao' | 'visual' | 'verbal' | 'proibido';

interface Section { id: SectionId; label: string; num: string; filledKeys: (keyof PosData)[]; }

const SECTIONS: Record<PosTab, Section[]> = {
  marca: [
    { id: 'sobre',         label: 'Sobre a Marca',         num: '01', filledKeys: ['sobre'] },
    { id: 'historia',      label: 'História & Trajetória',  num: '02', filledKeys: ['historia'] },
    { id: 'promessa',      label: 'Promessa',               num: '03', filledKeys: ['promessa_completa', 'promessa_curta'] },
    { id: 'transformacao', label: 'Transformação',          num: '04', filledKeys: ['transformacao_narrativa', 'transformacao_procedencia'] },
    { id: 'diferenciais',  label: 'Diferenciais',           num: '05', filledKeys: ['diferencial_1', 'diferencial_2', 'diferencial_3'] },
  ],
  publico: [
    { id: 'icp',       label: 'Perfil do Cliente',  num: '01', filledKeys: ['icp_quem_e', 'icp_quem_nao_e', 'icp_psicologico'] },
    { id: 'crencas',   label: 'Crenças',            num: '02', filledKeys: ['crencas_tentou', 'crencas_nao_acredita'] },
    { id: 'desejos',   label: 'Desejos',            num: '03', filledKeys: ['desejos_secretos', 'desejos_aspiracional'] },
    { id: 'dores',     label: 'Dores',              num: '04', filledKeys: ['dores_profundas', 'dores_travando'] },
    { id: 'objecoes',  label: 'Objeções',           num: '05', filledKeys: ['objecoes_desculpas', 'objecoes_medos'] },
  ],
  branding: [
    { id: 'direcao',  label: 'Direção Central',    num: '01', filledKeys: ['branding_direcao'] },
    { id: 'visual',   label: 'Padrão Visual',      num: '02', filledKeys: ['visual_identidade_link', 'visual_logo_url', 'visual_cores_url', 'visual_tipografia_url'] },
    { id: 'verbal',   label: 'Padrão Verbal',      num: '03', filledKeys: ['verbal_tom', 'verbal_jargoes'] },
    { id: 'proibido', label: 'Território Proibido', num: '04', filledKeys: ['proibido_design', 'proibido_imagens', 'proibido_conteudo', 'proibido_copys'] },
  ],
};

/* ── helpers ────────────────────────────────────────────────────────────────── */
function accentRing(c: string) {
  if (c === '#60a5fa') return { ring: 'rgba(59,130,246,0.3)',  bg: 'rgba(59,130,246,0.04)'  };
  if (c === '#34d399') return { ring: 'rgba(52,211,153,0.3)',  bg: 'rgba(52,211,153,0.04)'  };
  if (c === '#a78bfa') return { ring: 'rgba(167,139,250,0.3)', bg: 'rgba(167,139,250,0.04)' };
  return { ring: 'rgba(255,255,255,0.2)', bg: 'rgba(255,255,255,0.02)' };
}

function Field({ label, value, onChange, rows = 3, placeholder, accent = '#60a5fa', mono }: {
  label: string; value: string; onChange: (v: string) => void;
  rows?: number; placeholder?: string; accent?: string; mono?: boolean;
}) {
  const { ring, bg } = accentRing(accent);
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-widest mb-2"
        style={{ color: 'rgba(100,116,139,0.5)' }}>{label}</label>
      <textarea value={value} onChange={e => onChange(e.target.value)}
        rows={rows} placeholder={placeholder}
        className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-200"
        style={{
          background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)',
          resize: 'none', lineHeight: '1.75', color: 'rgba(226,232,240,0.9)', fontFamily: mono ? 'monospace' : 'inherit',
        }}
        onFocus={e => { e.currentTarget.style.borderColor = ring; e.currentTarget.style.background = bg; e.currentTarget.style.boxShadow = `0 0 0 3px ${ring}60`; }}
        onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.background = 'rgba(255,255,255,0.025)'; e.currentTarget.style.boxShadow = 'none'; }}
      />
    </div>
  );
}

function LinkField({ label, value, onChange, placeholder, accent = '#a78bfa' }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; accent?: string;
}) {
  const { ring, bg } = accentRing(accent);
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-widest mb-2"
        style={{ color: 'rgba(100,116,139,0.5)' }}>{label}</label>
      <div className="relative">
        <Link2 size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: accent, opacity: 0.6 }} />
        <input type="url" value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder || 'https://'}
          className="w-full pl-9 pr-10 py-3 rounded-xl text-sm outline-none transition-all duration-200"
          style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(226,232,240,0.9)' }}
          onFocus={e => { e.currentTarget.style.borderColor = ring; e.currentTarget.style.background = bg; e.currentTarget.style.boxShadow = `0 0 0 3px ${ring}60`; }}
          onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.background = 'rgba(255,255,255,0.025)'; e.currentTarget.style.boxShadow = 'none'; }}
        />
        {value && (
          <a href={value} target="_blank" rel="noopener noreferrer"
            className="absolute right-3 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-100 opacity-40">
            <ExternalLink size={13} style={{ color: accent }} />
          </a>
        )}
      </div>
    </div>
  );
}

function ImageField({ label, urlValue, onUrlChange, textLabel, textValue, onTextChange, textPlaceholder, accent = '#a78bfa' }: {
  label: string; urlValue: string; onUrlChange: (v: string) => void;
  textLabel?: string; textValue?: string; onTextChange?: (v: string) => void;
  textPlaceholder?: string; accent?: string;
}) {
  const { ring, bg } = accentRing(accent);
  return (
    <div className="space-y-3">
      <label className="block text-[10px] font-bold uppercase tracking-widest"
        style={{ color: 'rgba(100,116,139,0.5)' }}>{label}</label>
      <div className="relative rounded-2xl overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.02)', border: `1px dashed ${urlValue ? 'transparent' : 'rgba(255,255,255,0.08)'}`, minHeight: '140px' }}>
        {urlValue ? (
          <img src={urlValue} alt="" className="w-full object-cover" style={{ maxHeight: '220px' }}
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        ) : (
          <div className="flex flex-col items-center justify-center h-36 gap-2">
            <ImageIcon size={22} style={{ color: 'rgba(100,116,139,0.2)' }} />
            <p className="text-xs" style={{ color: 'rgba(100,116,139,0.3)' }}>Cole o link da imagem abaixo</p>
          </div>
        )}
      </div>
      <div className="relative">
        <Link2 size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: accent, opacity: 0.5 }} />
        <input type="url" value={urlValue} onChange={e => onUrlChange(e.target.value)}
          placeholder="https://drive.google.com/..."
          className="w-full pl-9 py-2.5 rounded-xl text-sm outline-none transition-all duration-200"
          style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(226,232,240,0.8)' }}
          onFocus={e => { e.currentTarget.style.borderColor = ring; e.currentTarget.style.background = bg; }}
          onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.background = 'rgba(255,255,255,0.025)'; }}
        />
      </div>
      {textLabel && textValue !== undefined && onTextChange && (
        <Field label={textLabel} value={textValue} onChange={onTextChange}
          rows={2} placeholder={textPlaceholder} accent={accent} />
      )}
    </div>
  );
}

function SensacoesEditor({ value, onChange, accent }: { value: string; onChange: (v: string) => void; accent: string }) {
  const items: Sensacao[] = (() => { try { return JSON.parse(value || '[]'); } catch { return []; } })();
  const update = (next: Sensacao[]) => onChange(JSON.stringify(next));
  const add = () => update([...items, { sensacao: '', explicacao: '' }]);
  const set = (i: number, k: keyof Sensacao, v: string) => update(items.map((s, j) => j === i ? { ...s, [k]: v } : s));
  const remove = (i: number) => update(items.filter((_, j) => j !== i));
  const { ring, bg } = accentRing(accent);
  return (
    <div>
      {items.length > 0 && (
        <div className="grid gap-3 mb-2" style={{ gridTemplateColumns: '1fr 2fr 28px' }}>
          <span className="text-[10px] font-bold uppercase tracking-widest px-1" style={{ color: 'rgba(100,116,139,0.4)' }}>Sensação</span>
          <span className="text-[10px] font-bold uppercase tracking-widest px-1" style={{ color: 'rgba(100,116,139,0.4)' }}>Explicação</span>
          <span />
        </div>
      )}
      <div className="space-y-2">
        {items.map((s, i) => (
          <div key={i} className="grid gap-2 items-center" style={{ gridTemplateColumns: '1fr 2fr 28px' }}>
            <input value={s.sensacao} onChange={e => set(i, 'sensacao', e.target.value)}
              placeholder="Ex: Sofisticação"
              className="px-3 py-2.5 rounded-xl text-sm outline-none transition-all"
              style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(226,232,240,0.9)' }}
              onFocus={e => { e.currentTarget.style.borderColor = ring; e.currentTarget.style.background = bg; }}
              onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.background = 'rgba(255,255,255,0.025)'; }}
            />
            <input value={s.explicacao} onChange={e => set(i, 'explicacao', e.target.value)}
              placeholder="O que essa sensação significa para a marca..."
              className="px-3 py-2.5 rounded-xl text-sm outline-none transition-all"
              style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(226,232,240,0.9)' }}
              onFocus={e => { e.currentTarget.style.borderColor = ring; e.currentTarget.style.background = bg; }}
              onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.background = 'rgba(255,255,255,0.025)'; }}
            />
            <button onClick={() => remove(i)} className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
              style={{ color: 'rgba(100,116,139,0.4)' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(100,116,139,0.4)')}>
              <X size={13} />
            </button>
          </div>
        ))}
      </div>
      <button onClick={add}
        className="flex items-center gap-2 mt-3 px-4 py-2 rounded-xl text-xs font-medium transition-all"
        style={{ background: `${accent}12`, color: accent, border: `1px solid ${accent}25` }}
        onMouseEnter={e => (e.currentTarget.style.background = `${accent}20`)}
        onMouseLeave={e => (e.currentTarget.style.background = `${accent}12`)}>
        <Plus size={12} /> Adicionar sensação
      </button>
    </div>
  );
}

function EmojiChips({ value, onChange, accent }: { value: string; onChange: (v: string) => void; accent: string }) {
  const [input, setInput] = useState('');
  const emojis = value ? value.split(' ').filter(Boolean) : [];
  const add = () => { const e = input.trim(); if (!e) return; onChange([...emojis, e].join(' ')); setInput(''); };
  const { ring, bg } = accentRing(accent);
  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-3 min-h-[36px]">
        {emojis.map((e, i) => (
          <span key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-base"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
            {e}
            <button onClick={() => onChange(emojis.filter((_, j) => j !== i).join(' '))}
              className="text-xs opacity-30 hover:opacity-80 transition-opacity">×</button>
          </span>
        ))}
        {emojis.length === 0 && (
          <span className="text-xs italic" style={{ color: 'rgba(100,116,139,0.3)' }}>Nenhum emoji adicionado ainda</span>
        )}
      </div>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Smile size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: accent, opacity: 0.5 }} />
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && add()}
            placeholder="Cole ou escreva o emoji e pressione Enter"
            className="w-full pl-9 py-2.5 rounded-xl text-sm outline-none transition-all"
            style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(226,232,240,0.9)' }}
            onFocus={e => { e.currentTarget.style.borderColor = ring; e.currentTarget.style.background = bg; }}
            onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.background = 'rgba(255,255,255,0.025)'; }}
          />
        </div>
        <button onClick={add}
          className="px-4 rounded-xl text-sm font-medium transition-all"
          style={{ background: `${accent}15`, color: accent, border: `1px solid ${accent}25` }}>
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}

function Card({ num, icon: Icon, title, desc, accent, children }: {
  num?: string; icon?: any; title: string; desc: string; accent: string; children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: 'linear-gradient(145deg,#0c0c22,#0e0e2a)', border: '1px solid rgba(255,255,255,0.05)' }}>
      <div className="px-6 py-4 flex items-center gap-4"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: 'rgba(255,255,255,0.01)' }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${accent}18`, border: `1px solid ${accent}30` }}>
          {Icon ? <Icon size={15} style={{ color: accent }} /> : (
            <span className="text-xs font-bold" style={{ color: accent }}>{num}</span>
          )}
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

function ProibidoCard({ icon: Icon, title, value, onChange, placeholder }: {
  icon: any; title: string; value: string; onChange: (v: string) => void; placeholder: string;
}) {
  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: 'linear-gradient(145deg,#130d0d,#180f0f)', border: '1px solid rgba(248,113,113,0.1)' }}>
      <div className="px-5 py-3.5 flex items-center gap-3"
        style={{ borderBottom: '1px solid rgba(248,113,113,0.07)', background: 'rgba(248,113,113,0.03)' }}>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)' }}>
          <Icon size={13} style={{ color: '#f87171' }} />
        </div>
        <div>
          <p className="text-xs font-semibold" style={{ color: '#f87171' }}>{title}</p>
          <p className="text-[10px]" style={{ color: 'rgba(248,113,113,0.4)' }}>O que nunca deve aparecer</p>
        </div>
      </div>
      <div className="p-4">
        <textarea value={value} onChange={e => onChange(e.target.value)}
          rows={5} placeholder={placeholder}
          className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-200"
          style={{
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
            resize: 'none', lineHeight: '1.7', color: 'rgba(226,232,240,0.8)',
          }}
          onFocus={e => { e.currentTarget.style.borderColor = 'rgba(248,113,113,0.25)'; e.currentTarget.style.background = 'rgba(248,113,113,0.03)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(248,113,113,0.08)'; }}
          onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'; e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; e.currentTarget.style.boxShadow = 'none'; }}
        />
      </div>
    </div>
  );
}

/* ── Section content ─────────────────────────────────────────────────────────── */
function SectionContent({ sectionId, data, set, accent }: {
  sectionId: SectionId; data: PosData; set: (k: keyof PosData) => (v: string) => void; accent: string;
}) {
  switch (sectionId) {
    case 'sobre':
      return (
        <Card num="01" title="Sobre a Marca" accent={accent}
          desc="O que ela faz, onde atua, qual o momento atual. Objetivo e factual.">
          <Field label="Descrição da marca" accent={accent} value={data.sobre} onChange={set('sobre')} rows={6}
            placeholder="Descreva a marca em 2 a 3 frases. O que ela faz, onde atua, qual o momento atual do negócio. Seja objetivo e factual, sem adjetivos genéricos." />
        </Card>
      );
    case 'historia':
      return (
        <Card num="02" title="História & Trajetória" accent={accent}
          desc="Busque o conflito e a virada — não uma linha do tempo.">
          <Field label="De onde vem? O que construiu?" accent={accent} value={data.historia} onChange={set('historia')} rows={8}
            placeholder="De onde vem? O que construiu e de onde?&#10;O que torna sua trajetória identificável para a audiência?&#10;Busque o conflito e a virada, não uma linha do tempo." />
        </Card>
      );
    case 'promessa':
      return (
        <Card num="03" title="Promessa" accent={accent}
          desc="Específica o suficiente para eliminar qualquer concorrente genérico.">
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Versão completa" accent={accent} value={data.promessa_completa} onChange={set('promessa_completa')} rows={6}
              placeholder="Eu ajudo [quem] a sair de [problema] através de [método], para que [resultado transformador]." />
            <Field label="Versão curta — bio ou stories" accent={accent} value={data.promessa_curta} onChange={set('promessa_curta')} rows={6}
              placeholder="A mesma promessa em 1 frase. Se demorar mais de 5 segundos para entender, refaça." />
          </div>
        </Card>
      );
    case 'transformacao':
      return (
        <Card num="04" title="Transformação" accent={accent}
          desc="O mecanismo que justifica o preço — e a prova de que funciona.">
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Narrativa de transformação" accent={accent} value={data.transformacao_narrativa} onChange={set('transformacao_narrativa')} rows={8}
              placeholder="Como a marca entrega a transformação?&#10;Qual é o processo, o método, o caminho que ela usa e que ninguém mais usa do mesmo jeito?" />
            <Field label="Procedência — por que acreditar" accent={accent} value={data.transformacao_procedencia} onChange={set('transformacao_procedencia')} rows={8}
              placeholder="Por que essa marca tem autoridade para entregar isso?&#10;Dado real, conquista verificável, frase de impacto." />
          </div>
        </Card>
      );
    case 'diferenciais':
      return (
        <Card num="05" title="Diferenciais Incopiáveis" accent={accent}
          desc="3 diferenciais validados que nenhum concorrente pode simplesmente copiar.">
          <div className="grid md:grid-cols-3 gap-3">
            {(['diferencial_1','diferencial_2','diferencial_3'] as const).map((k, i) => (
              <div key={k} className="relative">
                <span className="absolute top-3 left-4 text-3xl font-black leading-none select-none"
                  style={{ color: `${accent}18` }}>0{i+1}</span>
                <textarea value={data[k]} onChange={e => set(k)(e.target.value)}
                  rows={5} placeholder={`Diferencial ${i+1}`}
                  className="w-full pt-8 pb-3 px-4 rounded-xl text-sm outline-none transition-all duration-200"
                  style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', resize: 'none', lineHeight: '1.6', color: 'rgba(226,232,240,0.9)' }}
                  onFocus={e => { e.currentTarget.style.borderColor = `${accent}40`; e.currentTarget.style.boxShadow = `0 0 0 3px ${accent}15`; }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.boxShadow = 'none'; }}
                />
              </div>
            ))}
          </div>
        </Card>
      );
    case 'icp':
      return (
        <Card num="01" title="Perfil do Cliente Ideal" accent={accent}
          desc="Quem é, quem definitivamente não é, e o retrato psicológico completo.">
          <Field label="Quem é" accent={accent} value={data.icp_quem_e} onChange={set('icp_quem_e')} rows={4}
            placeholder="Descreva quem é o cliente ideal: perfil, contexto, fase de vida ou negócio..." />
          <Field label="Quem não é" accent={accent} value={data.icp_quem_nao_e} onChange={set('icp_quem_nao_e')} rows={4}
            placeholder="Quem essa marca não atende? Seja específico — não é só 'todo mundo'." />
          <Field label="Descrição psicológica" accent={accent} value={data.icp_psicologico} onChange={set('icp_psicologico')} rows={5}
            placeholder="Como ele pensa? O que o move? Como toma decisões? Qual é o seu mundo interno?" />
        </Card>
      );
    case 'crencas':
      return (
        <Card num="02" title="Crenças" accent={accent}
          desc="O que já tentou e por que não acredita mais em certas soluções.">
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="O que já tentou" accent={accent} value={data.crencas_tentou} onChange={set('crencas_tentou')} rows={7}
              placeholder="Quais soluções, métodos ou promessas ele já tentou antes de chegar aqui?" />
            <Field label="O que não acredita mais" accent={accent} value={data.crencas_nao_acredita} onChange={set('crencas_nao_acredita')} rows={7}
              placeholder="O que ele desacreditou? Que tipo de discurso já não cola mais com ele?" />
          </div>
        </Card>
      );
    case 'desejos':
      return (
        <Card num="03" title="Desejos" accent={accent}
          desc="O que ele realmente quer — por baixo das palavras.">
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Desejos mais secretos" accent={accent} value={data.desejos_secretos} onChange={set('desejos_secretos')} rows={7}
              placeholder="O que ele quer mas não fala em voz alta?" />
            <Field label="Sonho aspiracional" accent={accent} value={data.desejos_aspiracional} onChange={set('desejos_aspiracional')} rows={7}
              placeholder="Qual é o cenário dos sonhos que ele deseja alcançar? Seja visual e específico." />
          </div>
        </Card>
      );
    case 'dores':
      return (
        <Card num="04" title="Dores" accent={accent}
          desc="As feridas que ainda não curaram — e onde a vida trava.">
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Dores mais profundas" accent={accent} value={data.dores_profundas} onChange={set('dores_profundas')} rows={7}
              placeholder="Quais são as dores que ele ainda não conseguiu resolver?" />
            <Field label="Onde sente que está travando" accent={accent} value={data.dores_travando} onChange={set('dores_travando')} rows={7}
              placeholder="Em que parte da vida ou do negócio ele sente que não consegue avançar?" />
          </div>
        </Card>
      );
    case 'objecoes':
      return (
        <Card num="05" title="Objeções" accent={accent}
          desc="As desculpas e os medos que impedem a decisão.">
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Desculpas para não comprar" accent={accent} value={data.objecoes_desculpas} onChange={set('objecoes_desculpas')} rows={7}
              placeholder="O que ele diz para justificar a inação?" />
            <Field label="Medos de tomar a decisão errada" accent={accent} value={data.objecoes_medos} onChange={set('objecoes_medos')} rows={7}
              placeholder="O que ele teme que aconteça se investir e não funcionar?" />
          </div>
        </Card>
      );
    case 'direcao':
      return (
        <Card icon={Palette} title="Direção Central do Branding" accent={accent}
          desc="O norte criativo que guia todas as decisões visuais e verbais da marca.">
          <Field label="Direção" accent={accent} value={data.branding_direcao} onChange={set('branding_direcao')} rows={5}
            placeholder="Qual é a intenção criativa central? O que a identidade da marca deve comunicar antes de qualquer palavra?" />
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest mb-3"
              style={{ color: 'rgba(100,116,139,0.5)' }}>Sensações que deve transmitir</label>
            <SensacoesEditor value={data.branding_sensacoes} onChange={set('branding_sensacoes')} accent={accent} />
          </div>
        </Card>
      );
    case 'visual':
      return (
        <div className="space-y-4">
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(167,139,250,0.12)' }}>
            <div className="px-6 py-4 flex items-center gap-3"
              style={{ background: 'rgba(167,139,250,0.05)', borderBottom: '1px solid rgba(167,139,250,0.1)' }}>
              <LayoutGrid size={14} style={{ color: '#a78bfa' }} />
              <p className="text-sm font-bold tracking-wide" style={{ color: '#a78bfa' }}>PADRÃO VISUAL</p>
            </div>
            <div className="p-5 space-y-5" style={{ background: 'linear-gradient(145deg,#0c0c22,#0e0e2a)' }}>
              <div className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="flex items-center gap-2.5 mb-3">
                  <Link2 size={13} style={{ color: accent }} />
                  <span className="text-xs font-semibold text-white">Identidade Visual completa</span>
                </div>
                <LinkField label="Link do Drive" value={data.visual_identidade_link} onChange={set('visual_identidade_link')}
                  placeholder="https://drive.google.com/drive/folders/..." accent={accent} />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="flex items-center gap-2.5 mb-3">
                    <ImageIcon size={13} style={{ color: accent }} />
                    <span className="text-xs font-semibold text-white">Logotipo</span>
                  </div>
                  <ImageField label="Imagem" urlValue={data.visual_logo_url} onUrlChange={set('visual_logo_url')}
                    textLabel="Direcionamento de uso" textValue={data.visual_logo_texto} onTextChange={set('visual_logo_texto')}
                    textPlaceholder="Quando usar versão principal, alternativa, monocromática..." accent={accent} />
                </div>
                <div className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="flex gap-1">
                      {['#f87171','#fbbf24','#34d399','#60a5fa'].map(c => (
                        <div key={c} className="w-3 h-3 rounded-full" style={{ background: c }} />
                      ))}
                    </div>
                    <span className="text-xs font-semibold text-white">Cores</span>
                  </div>
                  <ImageField label="Paleta" urlValue={data.visual_cores_url} onUrlChange={set('visual_cores_url')}
                    textLabel="Como devem ser usadas" textValue={data.visual_cores_texto} onTextChange={set('visual_cores_texto')}
                    textPlaceholder="Primária para CTAs, secundária para fundos, neutras para texto..." accent={accent} />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="flex items-center gap-2.5 mb-3">
                    <Type size={13} style={{ color: accent }} />
                    <span className="text-xs font-semibold text-white">Tipografias</span>
                  </div>
                  <ImageField label="Imagem" urlValue={data.visual_tipografia_url} onUrlChange={set('visual_tipografia_url')}
                    textLabel="Uso e hierarquia" textValue={data.visual_tipografia_texto} onTextChange={set('visual_tipografia_texto')}
                    textPlaceholder="Título, subtítulo, corpo de texto, legendas — fonte e peso para cada um..." accent={accent} />
                </div>
                <div className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="flex items-center gap-2.5 mb-3">
                    <LayoutGrid size={13} style={{ color: accent }} />
                    <span className="text-xs font-semibold text-white">Moodvisual Feed</span>
                  </div>
                  <LinkField label="Pasta Pinterest" value={data.visual_mood_pinterest} onChange={set('visual_mood_pinterest')}
                    placeholder="https://pinterest.com/..." accent={accent} />
                  <div className="mt-3">
                    <ImageField label="Prévia do feed referência" urlValue={data.visual_mood_url} onUrlChange={set('visual_mood_url')} accent={accent} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    case 'verbal':
      return (
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(167,139,250,0.12)' }}>
          <div className="px-6 py-4 flex items-center gap-3"
            style={{ background: 'rgba(167,139,250,0.05)', borderBottom: '1px solid rgba(167,139,250,0.1)' }}>
            <MessageSquare size={14} style={{ color: '#a78bfa' }} />
            <p className="text-sm font-bold tracking-wide" style={{ color: '#a78bfa' }}>PADRÃO VERBAL</p>
          </div>
          <div className="p-5 space-y-4" style={{ background: 'linear-gradient(145deg,#0c0c22,#0e0e2a)' }}>
            <div className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="flex items-center gap-2.5 mb-3">
                <MessageSquare size={13} style={{ color: accent }} />
                <span className="text-xs font-semibold text-white">Como a marca fala</span>
              </div>
              <Field label="Tom de voz, ritmo, formalidade e humor" accent={accent}
                value={data.verbal_tom} onChange={set('verbal_tom')} rows={6}
                placeholder="Tom de voz: próximo, direto, sem jargões técnicos...&#10;Ritmo: frases curtas, pausas para impacto...&#10;Formalidade: tuteia, evita termos formais...&#10;Humor: ironia leve, nunca debochado..." />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="flex items-center gap-2.5 mb-3">
                  <Hash size={13} style={{ color: accent }} />
                  <span className="text-xs font-semibold text-white">Jargões e bordões</span>
                </div>
                <Field label="Repetições da marca" accent={accent}
                  value={data.verbal_jargoes} onChange={set('verbal_jargoes')} rows={6}
                  placeholder="Expressões, frases ou palavras que se repetem e se tornam assinatura da marca..." />
              </div>
              <div className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="flex items-center gap-2.5 mb-3">
                  <Smile size={13} style={{ color: accent }} />
                  <span className="text-xs font-semibold text-white">Emojis permitidos</span>
                </div>
                <EmojiChips value={data.verbal_emojis} onChange={set('verbal_emojis')} accent={accent} />
              </div>
            </div>
          </div>
        </div>
      );
    case 'proibido':
      return (
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(248,113,113,0.15)' }}>
          <div className="px-6 py-4 flex items-center gap-3"
            style={{ background: 'rgba(248,113,113,0.05)', borderBottom: '1px solid rgba(248,113,113,0.1)' }}>
            <AlertTriangle size={14} style={{ color: '#f87171' }} />
            <div>
              <p className="text-sm font-bold tracking-wide" style={{ color: '#f87171' }}>TERRITÓRIO PROIBIDO</p>
              <p className="text-[10px] mt-0.5" style={{ color: 'rgba(248,113,113,0.45)' }}>O que nunca deve aparecer — em nenhuma execução</p>
            </div>
          </div>
          <div className="p-4 grid md:grid-cols-2 gap-3"
            style={{ background: 'linear-gradient(145deg,#100a0a,#130c0c)' }}>
            <ProibidoCard icon={Palette} title="Design"
              value={data.proibido_design} onChange={set('proibido_design')}
              placeholder="Estilos visuais proibidos, paletas que não podem ser usadas, elementos gráficos banidos..." />
            <ProibidoCard icon={ImageIcon} title="Imagens"
              value={data.proibido_imagens} onChange={set('proibido_imagens')}
              placeholder="Tipos de foto proibidos, estética que não representa a marca, referências visuais a evitar..." />
            <ProibidoCard icon={LayoutGrid} title="Conteúdo"
              value={data.proibido_conteudo} onChange={set('proibido_conteudo')}
              placeholder="Assuntos, temas, formatos ou abordagens que a marca nunca deve tratar..." />
            <ProibidoCard icon={MessageSquare} title="Copys"
              value={data.proibido_copys} onChange={set('proibido_copys')}
              placeholder="Palavras banidas, expressões proibidas, tons de comunicação que nunca devem aparecer..." />
          </div>
        </div>
      );
    default:
      return null;
  }
}

/* ── Main ───────────────────────────────────────────────────────────────────── */
export default function ClientPositioning({ clientId }: { clientId: number }) {
  const [tab, setTab] = useState<PosTab>('marca');
  const [section, setSection] = useState<SectionId>('sobre');
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

  const ac = TABS.find(t => t.id === tab)!;
  const sections = SECTIONS[tab];

  const isFilled = (s: Section) => s.filledKeys.some(k => {
    const v = data[k];
    if (!v) return false;
    if (v === '[]') return false;
    return true;
  });

  const switchTab = (newTab: PosTab) => {
    setTab(newTab);
    setSection(SECTIONS[newTab][0].id);
  };

  return (
    <div className="relative">

      {/* ── Tab header ──────────────────────────────────────────────────── */}
      <div className="flex gap-1 p-1 mb-5 rounded-2xl"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
        {TABS.map(t => {
          const active = tab === t.id;
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => switchTab(t.id)}
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

      {/* ── Layout: sidebar + content ────────────────────────────────────── */}
      <div className="flex gap-4 items-start">

        {/* Sidebar */}
        <div className="flex-shrink-0 rounded-2xl overflow-hidden"
          style={{
            width: '200px',
            background: 'rgba(255,255,255,0.015)',
            border: '1px solid rgba(255,255,255,0.05)',
          }}>
          <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(100,116,139,0.4)' }}>
              {tab === 'marca' ? 'Marca' : tab === 'publico' ? 'Público' : 'Branding'}
            </p>
          </div>
          <div className="py-1.5">
            {sections.map(s => {
              const active = section === s.id;
              const filled = isFilled(s);
              return (
                <button key={s.id} onClick={() => setSection(s.id)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all duration-150 group"
                  style={{
                    background: active ? `${ac.color}10` : 'transparent',
                    borderLeft: `2px solid ${active ? ac.color : 'transparent'}`,
                  }}>
                  {/* Number */}
                  <span className="text-[11px] font-bold tabular-nums flex-shrink-0"
                    style={{ color: active ? ac.color : 'rgba(100,116,139,0.3)' }}>
                    {s.num}
                  </span>
                  {/* Label */}
                  <span className="text-xs font-medium leading-tight flex-1 min-w-0"
                    style={{ color: active ? 'rgba(226,232,240,0.95)' : 'rgba(148,163,184,0.55)' }}>
                    {s.label}
                  </span>
                  {/* Filled dot */}
                  {filled && !active && (
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ background: ac.color, opacity: 0.5 }} />
                  )}
                  {/* Arrow when active */}
                  {active && (
                    <ChevronRight size={12} style={{ color: ac.color, opacity: 0.6, flexShrink: 0 }} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 min-w-0">
          <SectionContent sectionId={section} data={data} set={set} accent={ac.color} />
        </div>

      </div>

      {/* ── Floating save ───────────────────────────────────────────────── */}
      <div className={`fixed bottom-8 right-8 z-50 transition-all duration-300 ${isDirty || saved ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
        <button onClick={save} disabled={saving || saved}
          className="flex items-center gap-2.5 px-5 py-3 rounded-2xl text-sm font-semibold text-white shadow-2xl transition-all duration-200"
          style={{
            background: saved ? 'linear-gradient(135deg,#34d399,#059669)' : `linear-gradient(135deg,${ac.color},#6366f1)`,
            boxShadow: saved ? '0 8px 32px rgba(52,211,153,0.4)' : `0 8px 32px ${ac.glow}`,
          }}>
          {saving
            ? <div className="w-4 h-4 rounded-full border-2 animate-spin" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} />
            : saved ? <><Check size={15} /> Salvo</> : <><Save size={15} /> Salvar alterações</>}
        </button>
      </div>
    </div>
  );
}
