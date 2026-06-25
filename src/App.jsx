import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Shell from './components/Shell';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Week from './pages/Week';
import Taken from './pages/Taken';
import Gezondheid from './pages/Gezondheid';
import Beheer from './pages/Beheer';

function Laden() {
  return (
    <div style={{ display: 'grid', placeItems: 'center', height: '100vh', color: 'var(--text-dim)' }}>
      Laden…
    </div>
  );
}

function Beveiligd({ children }) {
  const { user, laden } = useAuth();
  if (laden) return <Laden />;
  if (!user) return <Navigate to="/login" replace />;
  return <Shell>{children}</Shell>;
}

export default function App() {
  const { user, laden } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={laden ? <Laden /> : user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/" element={<Beveiligd><Dashboard /></Beveiligd>} />
      <Route path="/week" element={<Beveiligd><Week /></Beveiligd>} />
      <Route path="/taken" element={<Beveiligd><Taken /></Beveiligd>} />
      <Route path="/gezondheid" element={<Beveiligd><Gezondheid /></Beveiligd>} />
      <Route path="/beheer/*" element={<Beveiligd><Beheer /></Beveiligd>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
