import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { RoleProvider } from './hooks/useRole';
import { ToastProvider } from './hooks/useToast';
import Layout from './components/Layout';
import Dashboard from './views/Dashboard';
import Affaires from './views/Affaires';
import ProjectDetail from './views/ProjectDetail';
import GED from './views/GED';
import Utilisateurs from './views/Utilisateurs';
import Integrations from './views/Integrations';
import Conformite from './views/Conformite';
import Signatures from './views/Signatures';
import Carte from './views/Carte';
import Rapports from './views/Rapports';
import Analytics from './views/Analytics';
import PpiDashboard from './views/PpiDashboard';
import CommuneCarte from './views/CommuneCarte';
import CommuneDossiers from './views/CommuneDossiers';
import Maintenance from './views/Maintenance';
import Contacts from './views/Contacts';
import Planning from './views/Planning';
import Login from './views/Login';

function App() {
  return (
    <AuthProvider>
      <RoleProvider>
      <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/affaires" element={<Affaires />} />
            <Route path="/affaires/:id" element={<ProjectDetail />} />
            <Route path="/ged" element={<GED />} />
            <Route path="/signatures" element={<Signatures />} />
            <Route path="/carte" element={<Carte />} />
            <Route path="/maintenance" element={<Maintenance />} />
            <Route path="/planning" element={<Planning />} />
            <Route path="/rapports" element={<Rapports />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/ppi" element={<PpiDashboard />} />
            <Route path="/utilisateurs" element={<Utilisateurs />} />
            <Route path="/contacts" element={<Contacts />} />
            <Route path="/integrations" element={<Integrations />} />
            <Route path="/conformite" element={<Conformite />} />
            <Route path="/commune/carte" element={<CommuneCarte />} />
            <Route path="/commune/dossiers" element={<CommuneDossiers />} />
            <Route path="/commune/dossiers/:id" element={<ProjectDetail />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
      </ToastProvider>
      </RoleProvider>
    </AuthProvider>
  );
}

export default App;
