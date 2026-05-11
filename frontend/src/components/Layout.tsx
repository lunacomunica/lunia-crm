import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar, { BottomNav } from './Sidebar';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (user?.role === 'client') {
    return (
      <div className="min-h-screen overflow-y-auto" style={{ background: '#05050f' }}>
        <Outlet />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#05050f' }}>
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 md:hidden" style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={() => setSidebarOpen(false)} />
      )}

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 md:ml-64 overflow-y-auto min-w-0 pb-16 md:pb-0">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center gap-2.5 px-4 py-3 sticky top-0 z-20"
          style={{ background: 'rgba(3,3,20,0.97)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(59,130,246,0.07)' }}>
          <img src="/logo.png" alt="lun.ia" className="w-7 h-7 rounded-full object-cover flex-shrink-0"
            style={{ boxShadow: '0 0 12px rgba(59,130,246,0.5)' }} />
          <p className="font-bold text-white" style={{ textShadow: '0 0 16px rgba(59,130,246,0.35)' }}>lun.ia</p>
        </div>
        <Outlet />
      </main>

      <BottomNav onMore={() => setSidebarOpen(true)} />
    </div>
  );
}
