// Home / dashboard summary
import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { getSocket } from '../api/socket';

const STATUS_LABEL = { ON_ROUTE: 'En ruta', IDLE: 'Disponible', MAINTENANCE: 'Mantenimiento' };
const STATUS_COLOR = {
  ON_ROUTE: 'bg-green-100 text-green-700',
  IDLE: 'bg-slate-100 text-slate-600',
  MAINTENANCE: 'bg-yellow-100 text-yellow-700',
};

export default function Home() {
  const [trucks, setTrucks] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [livePos, setLivePos] = useState({}); // { [routeId]: pointCount }
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      api.get('/api/trucks'),
      api.get('/api/alerts?onlyActive=true'),
      api.get('/api/routes'),
    ])
      .then(([t, a, r]) => {
        if (cancelled) return;
        setTrucks(t);
        setAlerts(a);
        setRoutes(r);
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));

    // Seed position counts from live-history so progress bar shows on mount
    api.get('/api/routes/live-history').then((history) => {
      if (cancelled) return;
      const counts = {};
      Object.entries(history).forEach(([rid, pts]) => {
        counts[rid] = pts.filter((p) => p[0] !== 0 && p[1] !== 0).length;
      });
      setLivePos(counts);
    }).catch(() => {});

    const socket = getSocket();

    const onPos = ({ routeId }) => {
      if (routeId == null) return;
      setLivePos((prev) => ({ ...prev, [String(routeId)]: (prev[String(routeId)] || 0) + 1 }));
    };

    const onRouteStarted = ({ routeId }) => {
      if (routeId != null) setLivePos((prev) => { const n = { ...prev }; delete n[String(routeId)]; return n; });
      api.get('/api/routes').then((r) => { if (!cancelled) setRoutes(r); }).catch(() => {});
    };

    const onRouteStopped = () => {
      api.get('/api/routes').then((r) => { if (!cancelled) setRoutes(r); }).catch(() => {});
    };

    const onAlert = (a) => setAlerts((prev) => [a, ...prev]);

    socket.on('truck:position', onPos);
    socket.on('route:started', onRouteStarted);
    socket.on('route:stopped', onRouteStopped);
    socket.on('alert:new', onAlert);

    return () => {
      cancelled = true;
      socket.off('truck:position', onPos);
      socket.off('route:started', onRouteStarted);
      socket.off('route:stopped', onRouteStopped);
      socket.off('alert:new', onAlert);
    };
  }, []);

  const onRouteCount = trucks.filter((t) => t.status === 'ON_ROUTE').length;

  // truckId → active route
  const activeRouteByTruck = useMemo(() => {
    const map = {};
    routes.filter((r) => r.status === 'ACTIVE').forEach((r) => {
      if (r.truckId) map[String(r.truckId)] = r;
    });
    return map;
  }, [routes]);

  return (
    <div className="space-y-4">
      {/* Summary chips */}
      <section className="grid grid-cols-3 gap-3">
        <div className="card text-center py-3">
          <p className="text-2xl font-black text-slate-800">{trucks.length}</p>
          <p className="text-[10px] text-slate-400 uppercase font-bold mt-0.5">Camiones</p>
        </div>
        <div className="card text-center py-3">
          <p className="text-2xl font-black text-green-600">{onRouteCount}</p>
          <p className="text-[10px] text-slate-400 uppercase font-bold mt-0.5">En ruta</p>
        </div>
        <div className="card text-center py-3">
          <p className={`text-2xl font-black ${alerts.length > 0 ? 'text-amber-500' : 'text-slate-800'}`}>
            {alerts.length}
          </p>
          <p className="text-[10px] text-slate-400 uppercase font-bold mt-0.5">Alertas</p>
        </div>
      </section>

      {/* Truck list */}
      <section className="space-y-2">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Flota</h2>
        {loading && <p className="text-sm text-slate-500 text-center py-6">Cargando…</p>}
        {!loading && trucks.length === 0 && (
          <p className="text-sm text-slate-500 text-center">Sin camiones registrados.</p>
        )}
        {trucks.map((t) => {
          const activeRoute = activeRouteByTruck[String(t.id)];
          const hasAlert = t.boxes?.some((b) => alerts.some((a) => a.boxId === b.id));
          const totalWaypoints = activeRoute?.waypoints?.length || 1;
          const progress = activeRoute
            ? Math.min(100, Math.round(((livePos[String(activeRoute.id)] || 0) / totalWaypoints) * 100))
            : null;

          return (
            <Link
              key={t.id}
              to={`/camiones/${t.id}`}
              className="card block relative"
            >
              {hasAlert && (
                <span className="absolute -top-2 right-3 bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm uppercase">
                  ⚠ Alerta
                </span>
              )}

              {/* Driver name — primary */}
              <p className="text-lg font-black text-slate-800 leading-tight">{t.driverName}</p>

              {/* Secondary row */}
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  {t.plate}
                </span>
                <span className="text-xs text-slate-400">{t.model}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ml-auto ${STATUS_COLOR[t.status]}`}>
                  {STATUS_LABEL[t.status] ?? t.status}
                </span>
              </div>

              {/* Progress bar — only for active routes */}
              {activeRoute && progress !== null && (
                <div className="mt-3 space-y-1">
                  <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                    <span>{activeRoute.originName.split(',')[0]}</span>
                    <span className="font-bold text-blue-600">{progress}%</span>
                    <span>{activeRoute.destinationName.split(',')[0]}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-2 rounded-full bg-blue-600 transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}
            </Link>
          );
        })}
      </section>
    </div>
  );
}
