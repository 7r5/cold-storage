// Home / dashboard summary
import { useEffect, useState } from 'react';
import { api } from '../api/client';

export default function Home() {
  const [trucks, setTrucks] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.get('/api/trucks'), api.get('/api/alerts?onlyActive=true')])
      .then(([t, a]) => {
        if (cancelled) return;
        setTrucks(t);
        setAlerts(a);
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const onRoute = trucks.filter((t) => t.status === 'ON_ROUTE').length;

  return (
    <div className="space-y-4">
      <section className="grid grid-cols-2 gap-3">
        <div className="card">
          <p className="text-xs text-slate-500">Camiones</p>
          <p className="text-2xl font-semibold text-slate-800">{trucks.length}</p>
        </div>
        <div className="card">
          <p className="text-xs text-slate-500">En ruta</p>
          <p className="text-2xl font-semibold text-brand-600">{onRoute}</p>
        </div>
        <div className="card col-span-2">
          <p className="text-xs text-slate-500">Alertas activas</p>
          <p className="text-2xl font-semibold text-red-600">{alerts.length}</p>
        </div>
      </section>

      <section className="card">
        <h2 className="text-sm font-semibold text-slate-700 mb-2">Camiones</h2>
        {loading && <p className="text-sm text-slate-500">Cargando…</p>}
        {!loading && trucks.length === 0 && (
          <p className="text-sm text-slate-500">Sin camiones registrados.</p>
        )}
        <ul className="divide-y divide-slate-100">
          {trucks.map((t) => (
            <li key={t.id} className="py-2 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-800">{t.plate}</p>
                <p className="text-xs text-slate-500">{t.model} · {t.driverName}</p>
              </div>
              <span
                className={`text-xs px-2 py-1 rounded-full ${
                  t.status === 'ON_ROUTE'
                    ? 'bg-brand-50 text-brand-700'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {t.status === 'ON_ROUTE' ? 'En ruta' : t.status === 'IDLE' ? 'Disponible' : 'Mantenimiento'}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
