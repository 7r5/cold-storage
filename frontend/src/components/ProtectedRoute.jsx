// Wraps a route, redirecting to /login when not authenticated
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function ProtectedRoute({ children, requireRole }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (requireRole && user.role !== requireRole) {
    return <Navigate to="/" replace />;
  }
  return children;
}
