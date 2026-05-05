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
