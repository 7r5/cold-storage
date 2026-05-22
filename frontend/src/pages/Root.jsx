// Root-only simulation panel: start/stop routes and inject anomalies live
import { useEffect, useState } from 'react';
import { api } from '../api/client';

export default function Root() {
  const [routes, setRoutes] = useState([]);
  const [active, setActive] = useState([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  async function refresh() {
    const [r, s] = await Promise.all([
      api.get('/api/routes'),
      api.get('/api/simulator/status'),
    ]);
    setRoutes(r);
    setActive(s.active);
  }

  useEffect(() => {
    refresh().catch(() => {});
    const id = setInterval(refresh, 4000);
    return () => clearInterval(id);
  }, []);

  async function run(label, fn) {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
      setMsg(`${label}: OK`);
      await refresh();
    } catch (e) {
      setMsg(`${label}: ${e.message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <section className="card">
        <h2 className="text-sm font-semibold text-slate-700 mb-2">Rutas disponibles</h2>
        {routes.length === 0 && <p className="text-sm text-slate-500">Sin rutas.</p>}
        <ul className="space-y-2">
          {routes.map((r) => (
            <li key={r.id} className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-800">
                  {r.originName} → {r.destinationName}
                </p>
                <p className="text-xs text-slate-500">
                  {r.truck?.plate} · estado: {r.status}
                </p>
              </div>
              <button
                className="btn-primary text-xs"
                disabled={busy || r.status === 'ACTIVE'}
                onClick={() =>
                  run('Iniciar ruta', () =>
                    api.post('/api/simulator/start', { routeId: r.id }),
                  )
                }
              >
                Simular ruta
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h2 className="text-sm font-semibold text-slate-700 mb-2">Simulaciones activas</h2>
        {active.length === 0 && (
          <p className="text-sm text-slate-500">No hay simulaciones en curso.</p>
        )}
        <ul className="space-y-3">
          {active.map((a) => (
            <li key={a.truckId} className="border border-slate-200 rounded-lg p-3 space-y-2">
              <p className="text-sm font-medium text-slate-800">
                Camión #{a.truckId}
              </p>
              <p className="text-xs text-slate-500">
                Offset temp: {a.forcedTempOffset} · Offset humedad: {a.forcedHumOffset}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  className="btn-secondary text-xs"
                  disabled={busy}
                  onClick={() =>
                    run('Alza temperatura (advertencia)', () =>
                      api.post('/api/simulator/spike', {
                        truckId: a.truckId,
                        tempOffset: 6,  // 5°C base + 6 = 11°C → 3°C sobre el límite → WARNING
                      }),
                    )
                  }
                >
                  Alza temperatura (10s)
                </button>
                <button
                  className="btn-secondary text-xs"
                  disabled={busy}
                  onClick={() =>
                    run('Anomalía humedad', () =>
                      api.post('/api/simulator/spike', {
                        truckId: a.truckId,
                        humOffset: 30,
                      }),
                    )
                  }
                >
                  Humedad alta (10s)
                </button>
                <button
                  className="btn-secondary text-xs border-red-300 text-red-700 hover:bg-red-50"
                  disabled={busy}
                  onClick={() =>
                    run('Fallo de refrigeración (crítico)', () =>
                      api.post('/api/simulator/spike', {
                        truckId: a.truckId,
                        tempOffset: 20,  // 5°C base + 20 = 25°C → refrigeración apagada → CRITICAL
                      }),
                    )
                  }
                >
                  Alerta crítica (10s)
                </button>
                <button
                  className="btn-secondary text-xs"
                  disabled={busy}
                  onClick={() =>
                    run('Limpiar anomalías', () =>
                      api.post('/api/simulator/clear', { truckId: a.truckId }),
                    )
                  }
                >
                  Limpiar anomalías
                </button>
                <button
                  className="btn-primary text-xs bg-red-600 hover:bg-red-700 col-span-2"
                  disabled={busy}
                  onClick={() =>
                    run('Detener ruta', () =>
                      api.post('/api/simulator/stop', { truckId: a.truckId }),
                    )
                  }
                >
                  Detener
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {msg && <p className="text-xs text-slate-500">{msg}</p>}
    </div>
  );
}
