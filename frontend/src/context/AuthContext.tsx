import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';

interface Company { name?: string; cnpj?: string; phone?: string; website?: string; address?: string; }
interface User { id: number; name: string; email: string; role: string; tenant: string; avatar?: string; company?: Company; }
interface AuthCtx { user: User | null; token: string | null; login: (email: string, password: string) => Promise<void>; logout: () => void; loading: boolean; refreshUser: () => Promise<void>; setUser: (u: User) => void; }

const AuthContext = createContext<AuthCtx>(null!);

const BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('lunia_token'));
  const [loading, setLoading] = useState(true);

  const fetchMe = async (t: string) => {
    const r = await axios.get(`${BASE}/auth/me`, { headers: { Authorization: `Bearer ${t}` } });
    setUser(r.data);
  };

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    fetchMe(token).catch(() => { localStorage.removeItem('lunia_token'); setToken(null); }).finally(() => setLoading(false));
  }, [token]);

  const login = async (email: string, password: string) => {
    const r = await axios.post(`${BASE}/auth/login`, { email, password });
    const { token: t, user: u } = r.data;
    localStorage.setItem('lunia_token', t);
    setToken(t);
    setUser(u);
    await fetchMe(t);
  };

  const logout = () => { localStorage.removeItem('lunia_token'); setToken(null); setUser(null); };
  const refreshUser = async () => { if (token) await fetchMe(token); };

  return <AuthContext.Provider value={{ user, token, login, logout, loading, refreshUser, setUser }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
