import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Contacts from './pages/Contacts';
import Conversations from './pages/Conversations';
import Instagram from './pages/Instagram';
import Funnel from './pages/Funnel';
import Products from './pages/Products';
import Settings from './pages/Settings';
import MarketingClients from './pages/marketing/Clients';
import ClientDetail from './pages/marketing/ClientDetail';
import MarketingContent from './pages/marketing/Content';
import ClientPortal from './pages/marketing/ClientPortal';
import Traffic from './pages/marketing/Traffic';
import FeedPreview from './pages/marketing/FeedPreview';
import Production from './pages/marketing/Production';
import Tenants from './pages/admin/Tenants';
import AgencyOverview from './pages/agency/Overview';
import AgencyTeam from './pages/agency/Team';
import AgencyPerformance from './pages/agency/Performance';
import Gerot from './pages/Gerot';
import Login from './pages/Login';

function PrivateRoutes() {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#05050f' }}>
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
        style={{ borderColor: 'rgba(59,130,246,0.3)', borderTopColor: '#3b82f6' }} />
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  return <Layout />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginGuard />} />
          <Route path="/" element={<PrivateRoutes />}>
            <Route index element={<DefaultRedirect />} />
            <Route path="dashboard" element={<InternalOnly><Dashboard /></InternalOnly>} />
            <Route path="contacts" element={<InternalOnly><Contacts /></InternalOnly>} />
            <Route path="conversations" element={<InternalOnly><Conversations /></InternalOnly>} />
            <Route path="instagram" element={<InternalOnly><Instagram /></InternalOnly>} />
            <Route path="funnel" element={<InternalOnly><Funnel /></InternalOnly>} />
            <Route path="products" element={<InternalOnly><Products /></InternalOnly>} />
            <Route path="marketing/production" element={<ManagerAndAbove><Production /></ManagerAndAbove>} />
            <Route path="marketing/clients" element={<ManagerAndAbove><MarketingClients /></ManagerAndAbove>} />
            <Route path="marketing/clients/:id" element={<ManagerAndAbove><ClientDetail /></ManagerAndAbove>} />
            <Route path="marketing/content" element={<MarketingContent />} />
            <Route path="marketing/traffic" element={<Traffic />} />
            <Route path="marketing/portal/:clientId" element={<ClientPortal />} />
            <Route path="marketing/feed/:clientId" element={<FeedPreview />} />
            <Route path="gerot" element={<Gerot />} />
            <Route path="settings" element={<ManagerAndAbove><Settings /></ManagerAndAbove>} />
            <Route path="admin/tenants" element={<AdminOnly><Tenants /></AdminOnly>} />
            <Route path="agency" element={<AdminOnly><AgencyOverview /></AdminOnly>} />
            <Route path="agency/team" element={<AdminOnly><AgencyTeam /></AdminOnly>} />
            <Route path="agency/performance" element={<AdminOnly><AgencyPerformance /></AdminOnly>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

function InternalOnly({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (user?.role === 'client') return <Navigate to={user.client_id ? `/marketing/portal/${user.client_id}` : '/login'} replace />;
  if (user?.role !== 'owner') return <Navigate to="/gerot" replace />;
  return <>{children}</>;
}

function ManagerAndAbove({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (user?.role === 'client') return <Navigate to={user.client_id ? `/marketing/portal/${user.client_id}` : '/login'} replace />;
  if (user?.role === 'team') return <Navigate to="/gerot" replace />;
  return <>{children}</>;
}

function AdminOnly({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (user?.role === 'client') return <Navigate to={user.client_id ? `/marketing/portal/${user.client_id}` : '/login'} replace />;
  if (user?.role !== 'owner') return <Navigate to="/gerot" replace />;
  return <>{children}</>;
}

function DefaultRedirect() {
  const { user } = useAuth();
  if (user?.role === 'client') return <Navigate to={user.client_id ? `/marketing/portal/${user.client_id}` : '/login'} replace />;
  if (user?.role === 'team' || user?.role === 'manager') return <Navigate to="/gerot" replace />;
  return <Navigate to="/dashboard" replace />;
}

function LoginGuard() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;
  return <Login />;
}
