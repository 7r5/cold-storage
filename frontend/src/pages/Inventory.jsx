// Inventory page — shows cargo loads (products per box per route) and branches
import { useEffect, useState } from 'react';
import { api } from '../api/client';

const BRANCH_TYPE_LABEL = {
  WAREHOUSE: 'Almacén',
  PHARMACY: 'Farmacia',
  HOSPITAL: 'Hospital',
  DISTRIBUTION_CENTER: 'CEDIS',
};

const BRANCH_TYPE_COLOR = {
  WAREHOUSE: 'bg-orange-100 text-orange-700',
  PHARMACY: 'bg-blue-100 text-blue-700',
  HOSPITAL: 'bg-red-100 text-red-700',
  DISTRIBUTION_CENTER: 'bg-purple-100 text-purple-700',
};

const ROUTE_STATUS_LABEL = { PENDING: 'Pendiente', ACTIVE: 'Activa', COMPLETED: 'Completada' };
const ROUTE_STATUS_COLOR = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  ACTIVE: 'bg-green-100 text-green-700',
  COMPLETED: 'bg-slate-100 text-slate-500',
};

function RouteLoadCard({ route }) {
  const [expanded, setExpanded] = useState(false);

  // Group loads by box
  const byBox = route.loads.reduce((acc, load) => {
    const key = load.box.id;
    if (!acc[key]) acc[key] = { box: load.box, items: [] };
    acc[key].items.push(load);
    return acc;
  }, {});

  const totalItems = route.loads.length;

  return (
    <div className="card p-0">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full px-4 py-3 text-left flex items-start justify-between gap-3"
      >
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-800 truncate">
            {route.originName} → {route.destinationName}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            {route.truck?.plate ?? '—'} · {route.truck?.driverName ?? '—'} · {totalItems} producto{totalItems !== 1 ? 's' : ''}
          </p>
          {(route.originBranch || route.destinationBranch) && (
            <p className="text-xs text-slate-400 mt-0.5">
              {route.originBranch ? `Desde: ${route.originBranch.name}` : ''}
              {route.originBranch && route.destinationBranch ? ' · ' : ''}
              {route.destinationBranch ? `Hacia: ${route.destinationBranch.name}` : ''}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ROUTE_STATUS_COLOR[route.status]}`}>
            {ROUTE_STATUS_LABEL[route.status]}
          </span>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            className={`text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`} aria-hidden>
            <path d="M6 9l6 6 6-6"/>
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-slate-100 divide-y divide-slate-50">
          {Object.values(byBox).map(({ box, items }) => (
            <div key={box.id} className="px-4 py-3 space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Caja {box.code}
              </p>
              <div className="space-y-1.5">
                {items.map((load) => (
                  <div key={load.id} className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm text-slate-800 truncate">{load.product.name}</p>
                      <p className="text-xs text-slate-400">{load.product.sku} · {load.product.category ?? '—'}</p>
                    </div>
                    <p className="text-sm font-semibold text-slate-700 shrink-0 tabular-nums">
                      {load.quantity} <span className="text-xs font-normal text-slate-400">{load.unit}</span>
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {route.loads.length === 0 && (
            <p className="px-4 py-3 text-sm text-slate-400">Sin carga registrada para esta ruta.</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function Inventory() {
  const [routes, setRoutes] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('carga'); // 'carga' | 'sucursales'
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    Promise.all([
      api.get('/api/boxes/inventory'),
      api.get('/api/branches'),
    ])
      .then(([r, b]) => { setRoutes(r); setBranches(b); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filteredRoutes = filter === 'all' ? routes : routes.filter((r) => r.status === filter);
  const routesWithLoad = filteredRoutes.filter((r) => r.loads.length > 0);
  const routesNoLoad = filteredRoutes.filter((r) => r.loads.length === 0);

  return (
    <div className="space-y-4 pb-4">
      <h1 className="text-base font-semibold text-slate-800">Inventario</h1>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
        {[{ key: 'carga', label: 'Carga por ruta' }, { key: 'sucursales', label: 'Sucursales' }].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              tab === t.key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && <p className="text-sm text-slate-500 text-center py-6">Cargando...</p>}

      {/* Carga tab */}
      {!loading && tab === 'carga' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            {[
              { key: 'all', label: 'Todas' },
              { key: 'ACTIVE', label: 'Activas' },
              { key: 'PENDING', label: 'Pendientes' },
              { key: 'COMPLETED', label: 'Completadas' },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`text-xs font-medium px-3 py-1 rounded-full border transition-colors ${
                  filter === f.key
                    ? 'bg-slate-800 text-white border-slate-800'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {filteredRoutes.length === 0 && (
            <div className="card text-center py-8 text-slate-400 text-sm">No hay rutas con ese filtro.</div>
          )}

          {routesWithLoad.length > 0 && (
            <div className="space-y-2">
              {routesWithLoad.map((r) => <RouteLoadCard key={r.id} route={r} />)}
            </div>
          )}

          {routesNoLoad.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-slate-400 font-medium px-1">Sin carga asignada</p>
              {routesNoLoad.map((r) => (
                <div key={r.id} className="card py-2.5 px-4 flex justify-between items-center">
                  <div>
                    <p className="text-sm text-slate-700">{r.originName} → {r.destinationName}</p>
                    <p className="text-xs text-slate-400">{r.truck?.plate ?? '—'}</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ROUTE_STATUS_COLOR[r.status]}`}>
                    {ROUTE_STATUS_LABEL[r.status]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Sucursales tab */}
      {!loading && tab === 'sucursales' && (
        <div className="space-y-2">
          {branches.length === 0 && (
            <div className="card text-center py-8 text-slate-400 text-sm">No hay sucursales registradas.</div>
          )}
          {branches.map((b) => (
            <div key={b.id} className="card flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-slate-800">{b.name}</p>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${BRANCH_TYPE_COLOR[b.type]}`}>
                    {BRANCH_TYPE_LABEL[b.type]}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{b.city}</p>
                {b.address && <p className="text-xs text-slate-400 mt-0.5">{b.address}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
