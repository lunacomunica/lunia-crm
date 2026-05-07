import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, MessageSquare, Instagram,
  TrendingUp, Settings, LogOut, Package, Briefcase, FileImage, CalendarDays
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const commercialItems = [
  { path: '/dashboard',     label: 'Dashboard',      icon: LayoutDashboard },
  { path: '/contacts',      label: 'Contatos',        icon: Users },
  { path: '/conversations', label: 'Conversas',       icon: MessageSquare },
  { path: '/instagram',     label: 'Instagram',       icon: Instagram },
  { path: '/funnel',        label: 'Funil de Vendas', icon: TrendingUp },
  { path: '/products',      label: 'Produtos',        icon: Package },
];

const marketingItems = [
  { path: '/marketing/clients',  label: 'Clientes',    icon: Briefcase },
  { path: '/marketing/content',  label: 'Conteúdos',   icon: FileImage },
  { path: '/marketing/calendar', label: 'Calendário',  icon: CalendarDays },
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

export default function Sidebar() {
  const { user, logout } = useAuth();
  const isTeam = user?.role === 'team';

  return (
    <aside className="w-64 flex flex-col h-screen fixed left-0 top-0 z-40"
      style={{ background: 'linear-gradient(180deg, #030314 0%, #04041a 100%)', borderRight: '1px solid rgba(59,130,246,0.08)', boxShadow: '4px 0 40px rgba(0,0,0,0.6)' }}>

      {/* Logo */}
      <div className="px-5 py-6" style={{ borderBottom: '1px solid rgba(59,130,246,0.07)' }}>
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="lun.ia" className="w-9 h-9 rounded-full flex-shrink-0 object-cover"
            style={{ boxShadow: '0 0 18px rgba(59,130,246,0.55)' }} />
          <div>
            <p className="font-bold text-xl tracking-tight leading-none text-white"
              style={{ textShadow: '0 0 20px rgba(59,130,246,0.4)' }}>lun.ia</p>
            <p className="text-[10px] mt-0.5" style={{ color: 'rgba(59,130,246,0.45)' }}>ERP by @lunacomunica</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-4">
        {/* Comercial — hidden for team */}
        {!isTeam && (
          <div>
            <p className="section-label px-3 mb-2">Comercial</p>
            <div className="space-y-0.5">
              {commercialItems.map(item => <NavItem key={item.path} {...item} />)}
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

        {/* Config — hidden for team */}
        {!isTeam && (
          <div>
            <div className="space-y-0.5">
              <NavItem path="/settings" label="Configurações" icon={Settings} />
            </div>
          </div>
        )}
      </nav>

      {/* User */}
      <div className="p-3 space-y-2" style={{ borderTop: '1px solid rgba(59,130,246,0.07)' }}>
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
                  {user.role === 'team' ? 'Time' : user.role === 'admin' ? 'Admin' : user.tenant}
                </p>
              </div>
            </div>
            <button onClick={logout} title="Sair" className="p-1.5 rounded-lg flex-shrink-0 transition-colors"
              style={{ color: 'rgba(100,116,139,0.5)' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(100,116,139,0.5)')}>
              <LogOut size={13} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
