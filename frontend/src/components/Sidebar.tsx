import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, MessageSquare,
  TrendingUp, Settings, LogOut, Package, Briefcase, FileImage, Bell, Megaphone, Building2, CheckSquare, X, LayoutGrid
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useEffect, useState, useRef } from 'react';
import { notificationsApi } from '../api/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const platformItems = [
  { path: '/admin/tenants', label: 'Workspaces', icon: Building2 },
];

const negocioItems = [
  { path: '/dashboard', label: 'Dashboard',  icon: LayoutDashboard },
  { path: '/gerot',     label: 'Gerot',      icon: CheckSquare },
  { path: '/products',  label: 'Produtos',   icon: Package },
];

const comercialItems = [
  { path: '/contacts',      label: 'Contatos',        icon: Users },
  { path: '/conversations', label: 'Conversas',       icon: MessageSquare },
  { path: '/funnel',        label: 'Funil de Vendas', icon: TrendingUp },
];

const marketingItems = [
  { path: '/marketing/production', label: 'Produção',    icon: LayoutGrid },
  { path: '/marketing/clients',    label: 'Clientes',    icon: Briefcase },
  { path: '/marketing/content',    label: 'Conteúdos',   icon: FileImage },
  { path: '/marketing/traffic',    label: 'Tráfego Pago',icon: Megaphone },
];

function NavItem({ path, label, icon: Icon }: { path: string; label: string; icon: any }) {
  const { pathname } = useLocation();
  const active = pathname.startsWith(path);
  return (
    <Link to={path}
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative"
      style={active
        ? { background: 'linear-gradient(90deg, rgba(59,130,246,0.13) 0%, rgba(59,130,246,0.04) 100%)', borderLeft: '2px solid #3b82f6', boxShadow: 'inset 0 0 20px rgba(59,130,246,0.04)' }
        : { borderLeft: '2px solid transparent' }}>
      <Icon size={16} className="flex-shrink-0 transition-all duration-200"
        style={active ? { color: '#60a5fa', filter: 'drop-shadow(0 0 6px rgba(59,130,246,0.7))' } : { color: 'rgba(100,116,139,0.7)' }} />
      <span className="text-sm font-medium transition-colors duration-200"
        style={{ color: active ? '#e2e8f0' : 'rgba(100,116,139,0.8)' }}>
        {label}
      </span>
      {active && <div className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background: '#3b82f6', boxShadow: '0 0 6px rgba(59,130,246,0.9)' }} />}
    </Link>
  );
}

function NotificationBell() {
  const [unread, setUnread] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const load = () => notificationsApi.list().then(r => { setUnread(r.data.unread); setNotifications(r.data.notifications); });

  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, []);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
  }, []);

  const handleOpen = () => { setOpen(o => !o); if (!open && unread > 0) { notificationsApi.readAll().then(() => { setUnread(0); setNotifications(prev => prev.map(n => ({ ...n, read: 1 }))); }); } };

  const TYPE_COLOR: Record<string, string> = { aprovado: '#34d399', ajuste_solicitado: '#f97316' };
  const TYPE_LABEL: Record<string, string> = { aprovado: 'Aprovado', ajuste_solicitado: 'Ajuste solicitado' };

  return (
    <div ref={ref} className="relative">
      <button onClick={handleOpen} className="relative p-2 rounded-lg transition-colors flex-shrink-0"
        style={{ color: unread > 0 ? '#f59e0b' : 'rgba(100,116,139,0.5)' }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
        <Bell size={15} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
            style={{ background: '#f59e0b' }}>{unread > 9 ? '9+' : unread}</span>
        )}
      </button>
      {open && (
        <div className="absolute bottom-full right-0 mb-2 w-72 rounded-2xl overflow-hidden"
          style={{ background: '#0d0d1f', border: '1px solid rgba(59,130,246,0.15)', boxShadow: '0 -8px 32px rgba(0,0,0,0.6)' }}>
          <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(59,130,246,0.08)' }}>
            <span className="text-sm font-medium text-white">Notificações</span>
            {notifications.some(n => !n.read) && (
              <button onClick={() => notificationsApi.readAll().then(() => { setUnread(0); setNotifications(p => p.map(n => ({ ...n, read: 1 }))); })}
                className="text-xs transition-colors" style={{ color: 'rgba(100,116,139,0.5)' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#e2e8f0')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(100,116,139,0.5)')}>
                Marcar tudo como lido
              </button>
            )}
          </div>
          <div className="max-h-72 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-6 text-sm text-center" style={{ color: 'rgba(100,116,139,0.4)' }}>Nenhuma notificação</p>
            ) : notifications.map(n => {
              const meta = typeof n.meta === 'string' ? JSON.parse(n.meta) : n.meta;
              return (
                <button key={n.id} onClick={() => { setOpen(false); if (meta?.client_id) navigate(`/marketing/content?client=${meta.client_id}`); }}
                  className="w-full flex items-start gap-3 px-4 py-3 text-left transition-colors"
                  style={{ background: n.read ? 'transparent' : 'rgba(59,130,246,0.04)', borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(59,130,246,0.07)')}
                  onMouseLeave={e => (e.currentTarget.style.background = n.read ? 'transparent' : 'rgba(59,130,246,0.04)')}>
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5" style={{ background: TYPE_COLOR[n.type] || '#60a5fa' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-white truncate">{n.title}</p>
                    {n.body && <p className="text-[10px] mt-0.5 truncate" style={{ color: 'rgba(100,116,139,0.6)' }}>{n.body}</p>}
                    <p className="text-[10px] mt-1" style={{ color: 'rgba(100,116,139,0.4)' }}>
                      {format(new Date(n.created_at), "d MMM HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

const ROLE_LABEL: Record<string, string> = { owner: 'Owner', manager: 'Alta Gestão', team: 'Time', client: 'Cliente' };

export default function Sidebar({ open, onClose }: { open?: boolean; onClose?: () => void }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isSuperAdmin = user?.role === 'owner';
  const isAdmin = user?.role === 'owner';
  const isAltaGestao = user?.role === 'manager';
  const isTeam = user?.role === 'team';

  useEffect(() => { onClose?.(); }, [pathname]);

  return (
    <aside className={`w-64 flex flex-col h-screen fixed left-0 top-0 z-40 transition-transform duration-300 ${open ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
      style={{ background: 'linear-gradient(180deg, #030314 0%, #04041a 100%)', borderRight: '1px solid rgba(59,130,246,0.08)', boxShadow: '4px 0 40px rgba(0,0,0,0.6)' }}>

      {/* Logo */}
      <div className="px-5 py-6 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(59,130,246,0.07)' }}>
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="lun.ia" className="w-9 h-9 rounded-full flex-shrink-0 object-cover"
            style={{ boxShadow: '0 0 18px rgba(59,130,246,0.55)' }} />
          <div>
            <p className="font-bold text-xl tracking-tight leading-none text-white"
              style={{ textShadow: '0 0 20px rgba(59,130,246,0.4)' }}>lun.ia</p>
            <p className="text-[10px] mt-0.5" style={{ color: 'rgba(59,130,246,0.45)' }}>ERP by @lunacomunica</p>
          </div>
        </div>
        <button onClick={onClose} className="md:hidden p-1.5 rounded-lg" style={{ color: 'rgba(100,116,139,0.5)' }}>
          <X size={16} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-4">
        {/* Plataforma — superadmin only */}
        {isSuperAdmin && (
          <div>
            <p className="section-label px-3 mb-2">Plataforma</p>
            <div className="space-y-0.5">
              {platformItems.map(item => <NavItem key={item.path} {...item} />)}
            </div>
          </div>
        )}

        {/* Meu Espaço — team (execução básica) */}
        {isTeam && (
          <div>
            <p className="section-label px-3 mb-2">Meu Espaço</p>
            <div className="space-y-0.5">
              <NavItem path="/gerot" label="Gerot" icon={CheckSquare} />
            </div>
          </div>
        )}

        {/* Equipe — alta gestão (user) */}
        {isAltaGestao && (
          <div>
            <p className="section-label px-3 mb-2">Equipe</p>
            <div className="space-y-0.5">
              <NavItem path="/gerot" label="Gerot" icon={CheckSquare} />
            </div>
          </div>
        )}

        {/* Negócio — admin/superadmin only */}
        {isAdmin && (
          <div>
            <p className="section-label px-3 mb-2">Negócio</p>
            <div className="space-y-0.5">
              {negocioItems.map(item => <NavItem key={item.path} {...item} />)}
            </div>
          </div>
        )}

        {/* Comercial — admin/superadmin only */}
        {isAdmin && (
          <div>
            <p className="section-label px-3 mb-2">Comercial</p>
            <div className="space-y-0.5">
              {comercialItems.map(item => <NavItem key={item.path} {...item} />)}
            </div>
          </div>
        )}

        {/* Marketing */}
        <div>
          <p className="section-label px-3 mb-2">Marketing</p>
          <div className="space-y-0.5">
            {marketingItems.map(item => <NavItem key={item.path} {...item} />)}
          </div>
        </div>
      </nav>

      {/* User */}
      <div className="p-3" style={{ borderTop: '1px solid rgba(59,130,246,0.07)' }}>
        {user && (
          <div className="rounded-xl px-3 py-2.5 flex items-center justify-between"
            style={{ background: 'rgba(59,130,246,0.04)', border: '1px solid rgba(59,130,246,0.1)' }}>
            <div className="flex items-center gap-2.5 min-w-0">
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-7 h-7 rounded-full object-cover flex-shrink-0"
                  style={{ border: '1px solid rgba(59,130,246,0.3)' }} />
              ) : (
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)' }}>
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs font-medium text-white truncate">{user.name}</p>
                <p className="text-[10px] truncate" style={{ color: 'rgba(100,116,139,0.6)' }}>
                  {(user as any).job_title || ROLE_LABEL[user.role] || user.tenant}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-0.5 flex-shrink-0">
              <NotificationBell />
              {isAdmin && (
                <button onClick={() => navigate('/settings')} title="Configurações"
                  className="p-1.5 rounded-lg transition-colors"
                  style={{ color: 'rgba(100,116,139,0.5)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#e2e8f0')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(100,116,139,0.5)')}>
                  <Settings size={13} />
                </button>
              )}
              <button onClick={logout} title="Sair" className="p-1.5 rounded-lg transition-colors"
                style={{ color: 'rgba(100,116,139,0.5)' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(100,116,139,0.5)')}>
                <LogOut size={13} />
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
