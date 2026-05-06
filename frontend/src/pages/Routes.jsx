// Route list page — view, create, and delete planned routes
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';

const STATUS_LABEL = {
  PENDING: 'Pendiente',
  ACTIVE: 'Activa',
  COMPLETED: 'Completada',
};

const STATUS_COLOR = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  ACTIVE: 'bg-green-100 text-green-700',
  COMPLETED: 'bg-slate-100 text-slate-500',
};

export default function Routes() {
  const navigate = useNavigate();
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);
  const [error, setError] = useState(null);

  async function load() {
    try {
      const data = await api.get('/api/routes');
      setRoutes(data);
    } catch {
      setError('No se pudieron cargar las rutas');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(route) {
    if (!confirm(`¿Eliminar la ruta "${route.originName} → ${route.destinationName}"?`)) return;
    setDeleting(route.id);
    try {
      await api.delete(`/api/routes/${route.id}`);
      setRoutes((prev) => prev.filter((r) => r.id !== route.id));
    } catch (e) {
      alert(e.message ?? 'Error al eliminar');
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} aria-label="Volver" className="flex items-center gap-2 text-slate-500 hover:text-slate-800">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M15 18l-6-6 6-6"/>
          </svg>
          <span className="text-base font-semibold text-slate-800">Rutas</span>
        </button>
        <Link to="/rutas/nueva" className="btn-primary text-sm">+ Nueva ruta</Link>
      </div>

      {loading && <p className="text-sm text-slate-500">Cargando...</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}

      {!loading && routes.length === 0 && (
        <div className="card text-center py-8 space-y-2">
          <p className="text-slate-500 text-sm">No hay rutas registradas.</p>
          <Link to="/rutas/nueva" className="btn-primary text-sm inline-block">Crear primera ruta</Link>
        </div>
      )}

      <ul className="space-y-3">
        {routes.map((r) => (
          <li key={r.id} className="card p-0">
            <div className="flex items-start justify-between px-4 pt-3 pb-2 gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">
                  {r.originName} → {r.destinationName}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {r.truck?.plate ?? `Camión #${r.truckId}`} · {r.waypoints?.length ?? 0} waypoints
                </p>
              </div>
              <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLOR[r.status]}`}>
                {STATUS_LABEL[r.status]}
              </span>
            </div>

            {r.status === 'PENDING' && (
              <div className="border-t border-slate-100 px-4 py-2 flex justify-end">
                <button
                  onClick={() => handleDelete(r)}
                  disabled={deleting === r.id}
                  className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
                >
                  {deleting === r.id ? 'Eliminando...' : 'Eliminar'}
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
