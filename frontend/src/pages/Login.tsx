import { useState, FormEvent } from 'react';
import { Mail, Lock, Building2, User, AlertCircle, TrendingUp, FileImage, BarChart3, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

type Mode = 'agency' | 'client';

const MODE = {
  agency: {
    label: 'Agência',
    icon: Building2,
    accent: '#60a5fa',
    glow: 'rgba(59,130,246,0.4)',
    ring: 'rgba(59,130,246,0.25)',
    bg: 'rgba(59,130,246,0.07)',
    tagline: 'Gerencie clientes, campanhas e resultados em um só lugar.',
    placeholder: 'agencia@email.com',
    orb1: 'radial-gradient(circle, rgba(59,130,246,0.25) 0%, transparent 70%)',
    orb2: 'radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 70%)',
  },
  client: {
    label: 'Cliente',
    icon: User,
    accent: '#60a5fa',
    glow: 'rgba(59,130,246,0.4)',
    ring: 'rgba(59,130,246,0.25)',
    bg: 'rgba(59,130,246,0.07)',
    tagline: 'Acompanhe seu projeto, aprovações e resultados em tempo real.',
    placeholder: 'cliente@email.com',
    orb1: 'radial-gradient(circle, rgba(59,130,246,0.25) 0%, transparent 70%)',
    orb2: 'radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 70%)',
  },
} satisfies Record<Mode, any>;

const FEATURES = [
  { icon: FileImage, label: 'Conteúdo',    desc: 'Aprovação de posts e feed visual' },
  { icon: TrendingUp, label: 'Tráfego',    desc: 'Campanhas e criativos com métricas' },
  { icon: BarChart3,  label: 'Performance', desc: 'Metas, resultados e relatórios' },
  { icon: Zap,        label: 'Automação',   desc: 'Notificações e fluxos inteligentes' },
];

export default function Login() {
  const { login } = useAuth();
  const [mode, setMode] = useState<Mode>('agency');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const cfg = MODE[mode];

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch {
      setError('Email ou senha incorretos');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (m: Mode) => { setMode(m); setError(''); };

  return (
    <div className="min-h-screen flex" style={{ background: '#04041a', fontFamily: 'inherit' }}>

      {/* ── Orbs background ─────────────────────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div style={{
          position: 'absolute', width: '600px', height: '600px',
          top: '-100px', left: '-100px',
          background: cfg.orb1,
          transition: 'background 0.6s ease',
          borderRadius: '50%', filter: 'blur(60px)',
        }} />
        <div style={{
          position: 'absolute', width: '500px', height: '500px',
          bottom: '-80px', right: '30%',
          background: cfg.orb2,
          transition: 'background 0.6s ease',
          borderRadius: '50%', filter: 'blur(80px)',
        }} />
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'linear-gradient(rgba(59,130,246,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.03) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }} />
      </div>

      {/* ── Left panel — brand ──────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[52%] flex-col justify-between p-14 relative"
        style={{ borderRight: '1px solid rgba(255,255,255,0.04)' }}>

        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <img src="/logo.png" alt="lun.ia" className="w-10 h-10 rounded-full object-cover"
              style={{ boxShadow: `0 0 20px ${cfg.glow}`, transition: 'box-shadow 0.6s ease' }} />
          </div>
          <div>
            <p className="font-bold text-xl text-white tracking-tight leading-none"
              style={{ textShadow: `0 0 24px ${cfg.glow}`, transition: 'text-shadow 0.6s ease' }}>lun.ia</p>
            <p className="text-[10px] mt-0.5" style={{ color: 'rgba(100,116,139,0.5)' }}>ERP by @lunacomunica</p>
          </div>
        </div>

        {/* Hero text */}
        <div>
          <div className="mb-6">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-semibold tracking-widest uppercase mb-6"
              style={{
                background: cfg.bg, color: cfg.accent, border: `1px solid ${cfg.ring}`,
                transition: 'all 0.6s ease',
              }}>
              <Zap size={10} /> Marketing · Vendas · Performance
            </span>
          </div>
          <h2 className="text-4xl xl:text-5xl font-extralight text-white leading-tight mb-4"
            style={{ letterSpacing: '-0.02em' }}>
            Escale com<br />
            <span className="font-semibold" style={{ color: cfg.accent, transition: 'color 0.6s ease' }}>
              inteligência
            </span>{' '}
            de negócio.
          </h2>
          <p className="text-base font-light max-w-sm" style={{ color: 'rgba(148,163,184,0.6)', lineHeight: '1.7' }}>
            {cfg.tagline}
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-2 gap-3 max-w-sm">
          {FEATURES.map(f => (
            <div key={f.label} className="flex items-start gap-3 p-3.5 rounded-2xl"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
              <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: cfg.bg, transition: 'background 0.6s ease' }}>
                <f.icon size={13} style={{ color: cfg.accent, transition: 'color 0.6s ease' }} />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">{f.label}</p>
                <p className="text-[10px] leading-snug mt-0.5" style={{ color: 'rgba(100,116,139,0.55)' }}>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <p className="text-[10px]" style={{ color: 'rgba(100,116,139,0.3)' }}>lun.ia CRM © 2026</p>
      </div>

      {/* ── Right panel — form ──────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-14 relative">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="flex flex-col items-center mb-10 lg:hidden">
            <img src="/logo.png" alt="lun.ia" className="w-14 h-14 rounded-full object-cover mb-3"
              style={{ boxShadow: `0 0 28px ${cfg.glow}`, transition: 'box-shadow 0.6s ease' }} />
            <p className="font-bold text-2xl text-white" style={{ textShadow: `0 0 20px ${cfg.glow}` }}>lun.ia</p>
            <p className="text-xs mt-1" style={{ color: 'rgba(100,116,139,0.5)' }}>ERP by @lunacomunica</p>
          </div>

          {/* Mode switcher */}
          <div className="flex gap-1.5 p-1 rounded-2xl mb-8"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            {(['agency', 'client'] as Mode[]).map(m => {
              const c = MODE[m];
              const active = mode === m;
              const Icon = c.icon;
              return (
                <button key={m} onClick={() => switchMode(m)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-medium transition-all duration-300"
                  style={{
                    background: active ? cfg.bg : 'transparent',
                    color: active ? c.accent : 'rgba(100,116,139,0.5)',
                    border: active ? `1px solid ${c.ring}` : '1px solid transparent',
                    boxShadow: active ? `0 0 16px ${c.glow}` : 'none',
                  }}>
                  <Icon size={14} />
                  {c.label}
                </button>
              );
            })}
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-2xl font-light text-white mb-1.5">
              {mode === 'agency' ? 'Bem-vinda de volta' : 'Acesse seu portal'}
            </h1>
            <p className="text-sm" style={{ color: 'rgba(100,116,139,0.55)' }}>
              {mode === 'agency'
                ? 'Entre na sua conta para continuar gerenciando.'
                : 'Acompanhe aprovações e resultados do seu projeto.'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-widest mb-2"
                style={{ color: 'rgba(100,116,139,0.5)' }}>Email</label>
              <div className="relative">
                <Mail size={14} className="absolute left-4 top-1/2 -translate-y-1/2"
                  style={{ color: cfg.accent, opacity: 0.6, transition: 'color 0.6s ease' }} />
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder={cfg.placeholder} required autoFocus
                  className="w-full pl-10 pr-4 py-3.5 rounded-xl text-sm text-white placeholder-slate-600 outline-none transition-all duration-200"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: `1px solid rgba(255,255,255,0.07)`,
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = cfg.ring; e.currentTarget.style.boxShadow = `0 0 0 3px ${cfg.bg}`; }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.boxShadow = 'none'; }}
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-widest mb-2"
                style={{ color: 'rgba(100,116,139,0.5)' }}>Senha</label>
              <div className="relative">
                <Lock size={14} className="absolute left-4 top-1/2 -translate-y-1/2"
                  style={{ color: cfg.accent, opacity: 0.6, transition: 'color 0.6s ease' }} />
                <input
                  type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" required
                  className="w-full pl-10 pr-4 py-3.5 rounded-xl text-sm text-white placeholder-slate-600 outline-none transition-all duration-200"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.07)',
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = cfg.ring; e.currentTarget.style.boxShadow = `0 0 0 3px ${cfg.bg}`; }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.boxShadow = 'none'; }}
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm px-4 py-3 rounded-xl"
                style={{ background: 'rgba(248,113,113,0.07)', border: '1px solid rgba(248,113,113,0.18)', color: '#f87171' }}>
                <AlertCircle size={13} /> {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-semibold text-white mt-2 transition-all duration-300"
              style={{
                background: `linear-gradient(135deg, ${cfg.accent}, #6366f1)`,
                boxShadow: `0 4px 24px ${cfg.glow}`,
                opacity: loading ? 0.7 : 1,
                transition: 'all 0.6s ease',
              }}
              onMouseEnter={e => !loading && (e.currentTarget.style.transform = 'translateY(-1px)', e.currentTarget.style.boxShadow = `0 8px 32px ${cfg.glow}`)}
              onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)', e.currentTarget.style.boxShadow = `0 4px 24px ${cfg.glow}`)}>
              {loading ? (
                <div className="w-4 h-4 rounded-full border-2 animate-spin"
                  style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} />
              ) : `Entrar como ${cfg.label}`}
            </button>
          </form>

          <p className="text-center text-[10px] mt-8" style={{ color: 'rgba(100,116,139,0.28)' }}>
            lun.ia CRM © 2026 · @lunacomunica
          </p>
        </div>
      </div>
    </div>
  );
}
