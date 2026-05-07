import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, MessageSquare, Instagram,
  TrendingUp, Settings, Moon
} from 'lucide-react';

const navItems = [
  { path: '/dashboard',     label: 'Dashboard',      icon: LayoutDashboard },
  { path: '/contacts',      label: 'Contatos',        icon: Users },
  { path: '/conversations', label: 'Conversas',       icon: MessageSquare },
  { path: '/instagram',     label: 'Instagram',       icon: Instagram },
  { path: '/funnel',        label: 'Funil de Vendas', icon: TrendingUp },
  { path: '/settings',      label: 'Configurações',   icon: Settings },
];

export default function Sidebar() {
  const { pathname } = useLocation();

  return (
    <aside
      className="w-64 flex flex-col h-screen fixed left-0 top-0 z-40"
      style={{
        background: 'linear-gradient(180deg, #030314 0%, #04041a 100%)',
        borderRight: '1px solid rgba(59,130,246,0.08)',
        boxShadow: '4px 0 40px rgba(0,0,0,0.6)',
      }}
    >
      {/* ── Logo ── */}
      <div className="px-5 py-6" style={{ borderBottom: '1px solid rgba(59,130,246,0.07)' }}>
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
              boxShadow: '0 0 18px rgba(59,130,246,0.55), 0 0 40px rgba(99,102,241,0.25)',
            }}
          >
            <Moon size={16} className="text-white" fill="white" />
          </div>
          <div>
            <p
              className="font-bold text-xl tracking-tight leading-none text-white"
              style={{ textShadow: '0 0 20px rgba(59,130,246,0.4)' }}
            >
              lun.ia
            </p>
            <p className="text-[10px] mt-0.5" style={{ color: 'rgba(59,130,246,0.45)' }}>
              CRM Inteligente
            </p>
          </div>
        </div>
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="section-label px-3 mb-3">Menu</p>

        {navItems.map(({ path, label, icon: Icon }) => {
          const active = pathname.startsWith(path);
          return (
            <Link
              key={path}
              to={path}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative"
              style={
                active
                  ? {
                      background: 'linear-gradient(90deg, rgba(59,130,246,0.13) 0%, rgba(59,130,246,0.04) 100%)',
                      borderLeft: '2px solid #3b82f6',
                      boxShadow: 'inset 0 0 20px rgba(59,130,246,0.04)',
                    }
                  : {
                      borderLeft: '2px solid transparent',
                    }
              }
            >
              <Icon
                size={16}
                className="flex-shrink-0 transition-all duration-200"
                style={
                  active
                    ? { color: '#60a5fa', filter: 'drop-shadow(0 0 6px rgba(59,130,246,0.7))' }
                    : { color: 'rgba(100,116,139,0.7)' }
                }
              />
              <span
                className="text-sm font-medium transition-colors duration-200"
                style={{ color: active ? '#e2e8f0' : 'rgba(100,116,139,0.8)' }}
              >
                {label}
              </span>
              {active && (
                <div
                  className="ml-auto w-1.5 h-1.5 rounded-full"
                  style={{
                    background: '#3b82f6',
                    boxShadow: '0 0 6px rgba(59,130,246,0.9)',
                  }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── Status ── */}
      <div className="p-3" style={{ borderTop: '1px solid rgba(59,130,246,0.07)' }}>
        <div
          className="rounded-xl p-3"
          style={{
            background: 'rgba(59,130,246,0.04)',
            border: '1px solid rgba(59,130,246,0.1)',
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <div
              className="w-1.5 h-1.5 rounded-full animate-glow"
              style={{ background: '#f59e0b', boxShadow: '0 0 6px rgba(245,158,11,0.8)' }}
            />
            <span className="text-xs font-semibold" style={{ color: 'rgba(245,158,11,0.8)' }}>
              Meta API
            </span>
          </div>
          <p className="text-[10px]" style={{ color: 'rgba(100,116,139,0.6)' }}>
            Configure em Configurações
          </p>
        </div>
      </div>
    </aside>
  );
}
