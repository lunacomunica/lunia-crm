import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
import MarketingContent from './pages/marketing/Content';
import MarketingCalendar from './pages/marketing/Calendar';
import ClientPortal from './pages/marketing/ClientPortal';
import FeedPreview from './pages/marketing/FeedPreview';
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
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="contacts" element={<Contacts />} />
            <Route path="conversations" element={<Conversations />} />
            <Route path="instagram" element={<Instagram />} />
            <Route path="funnel" element={<Funnel />} />
            <Route path="products" element={<Products />} />
            <Route path="marketing/clients" element={<MarketingClients />} />
            <Route path="marketing/content" element={<MarketingContent />} />
            <Route path="marketing/calendar" element={<MarketingCalendar />} />
            <Route path="marketing/portal/:clientId" element={<ClientPortal />} />
            <Route path="marketing/feed/:clientId" element={<FeedPreview />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

function DefaultRedirect() {
  const { user } = useAuth();
  return <Navigate to={user?.role === 'team' ? '/marketing/clients' : '/dashboard'} replace />;
}

function LoginGuard() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;
  return <Login />;
}
