import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar';
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

      <main className="flex-1 md:ml-64 overflow-y-auto min-w-0">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 sticky top-0 z-20"
          style={{ background: '#05050f', borderBottom: '1px solid rgba(59,130,246,0.08)' }}>
          <button onClick={() => setSidebarOpen(true)} className="p-1.5 rounded-lg"
            style={{ color: 'rgba(100,116,139,0.7)' }}>
            <Menu size={20} />
          </button>
          <p className="font-bold text-white" style={{ textShadow: '0 0 20px rgba(59,130,246,0.4)' }}>lun.ia</p>
        </div>
        <Outlet />
      </main>
    </div>
  );
}
