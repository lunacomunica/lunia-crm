import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user } = useAuth();
  if (user?.role === 'client') {
    return (
      <div className="min-h-screen overflow-y-auto" style={{ background: '#05050f' }}>
        <Outlet />
      </div>
    );
  }
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#05050f' }}>
      <Sidebar />
      <main className="flex-1 ml-64 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
