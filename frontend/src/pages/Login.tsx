import { useState, FormEvent } from 'react';
import { Mail, Lock, LogIn, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(59,130,246,0.08) 0%, #05050f 60%)' }}>
      <div className="w-full max-w-sm animate-fade-up">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <img
            src="/logo.png"
            alt="lun.ia"
            className="w-16 h-16 rounded-full object-cover mb-4"
            style={{ boxShadow: '0 0 30px rgba(59,130,246,0.5)' }}
          />
          <h1 className="text-3xl font-extralight text-white tracking-tight"
            style={{ textShadow: '0 0 30px rgba(59,130,246,0.3)' }}>lun.ia</h1>
          <p className="text-sm mt-1" style={{ color: 'rgba(100,116,139,0.65)' }}>CRM by @lunacomunica</p>
          <p className="text-base font-medium mt-4 text-center" style={{ color: 'rgba(226,232,240,0.85)' }}>Escale com inteligência de negócio.</p>
          <p className="text-xs mt-1 text-center tracking-widest uppercase" style={{ color: 'rgba(100,116,139,0.45)' }}>Marketing | Vendas | Performance</p>
        </div>

        {/* Form */}
        <div className="card p-8">
          <h2 className="text-lg font-light text-white mb-6">Entrar na sua conta</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label-dark">Email</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'rgba(59,130,246,0.5)' }} />
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="admin@lunia.com" required autoFocus
                  className="input-dark pl-9"
                />
              </div>
            </div>
            <div>
              <label className="label-dark">Senha</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'rgba(59,130,246,0.5)' }} />
                <input
                  type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" required
                  className="input-dark pl-9"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm px-3 py-2.5 rounded-xl"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
                <AlertCircle size={14} /> {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center mt-2">
              {loading ? (
                <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin"
                  style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} />
              ) : <><LogIn size={15} /> Entrar</>}
            </button>
          </form>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: 'rgba(100,116,139,0.4)' }}>
          lun.ia CRM © 2026
        </p>
      </div>
    </div>
  );
}
