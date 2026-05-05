// Routing
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

import Login from './pages/Login';
import Home from './pages/Home';
import Monitors from './pages/Monitors';
import Inventory from './pages/Inventory';
import Alerts from './pages/Alerts';
import More from './pages/More';
import Root from './pages/Root';
import TruckDetail from './pages/TruckDetail';
import Rutas from './pages/Rutas';
import NuevaRuta from './pages/NuevaRuta';
import Ajustes from './pages/Ajustes';
import Ayuda from './pages/Ayuda';
import AcercaDe from './pages/AcercaDe';
import Documentacion from './pages/Documentacion';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Home />} />
        <Route path="/monitores" element={<Monitors />} />
        <Route path="/inventario" element={<Inventory />} />
        <Route path="/alertas" element={<Alerts />} />
        <Route path="/mas" element={<More />} />
        <Route path="/camiones/:id" element={<TruckDetail />} />
        <Route path="/rutas" element={<Rutas />} />
        <Route path="/rutas/nueva" element={<NuevaRuta />} />
        <Route path="/ajustes" element={<Ajustes />} />
        <Route path="/ayuda" element={<Ayuda />} />
        <Route path="/acerca-de" element={<AcercaDe />} />
        <Route path="/documentacion" element={<Documentacion />} />
        <Route
          path="/root"
          element={
            <ProtectedRoute requireRole="ROOT">
              <Root />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
