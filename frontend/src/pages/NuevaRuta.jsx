// New route creation: geocode origin/destination with Nominatim, route with OSRM,
// preview on map, and optionally add manual click-waypoints.
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Polyline, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { api } from '../api/client';

// Fix Leaflet default icon paths broken by Vite bundling
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const NOMINATIM = 'https://nominatim.openstreetmap.org';
const OSRM = 'https://router.project-osrm.org/route/v1/driving';

async function geocode(query) {
  const url = `${NOMINATIM}/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=mx`;
  const res = await fetch(url, { headers: { 'Accept-Language': 'es' } });
  if (!res.ok) throw new Error('Error al geocodificar');
  const data = await res.json();
  if (!data.length) throw new Error(`No se encontró "${query}"`);
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), label: data[0].display_name };
}

async function fetchRoute(from, to) {
  // OSRM expects lng,lat
  const url = `${OSRM}/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('OSRM no respondió');
  const data = await res.json();
  if (data.code !== 'Ok' || !data.routes?.length) throw new Error('No se encontró ruta por carretera');
  // GeoJSON coords are [lng, lat] — keep that order for our DB
  return data.routes[0].geometry.coordinates; // [[lng, lat], ...]
}

// Sub-component that listens for map clicks to add manual waypoints
function ClickLayer({ enabled, onAdd }) {
  useMapEvents({
    click(e) {
      if (enabled) onAdd([e.latlng.lng, e.latlng.lat]);
    },
  });
  return null;
}

export default function NuevaRuta() {
  const navigate = useNavigate();

  const [trucks, setTrucks] = useState([]);
  const [truckId, setTruckId] = useState('');
  const [originText, setOriginText] = useState('');
  const [destText, setDestText] = useState('');
  // waypoints stored as [lng, lat] (GeoJSON / DB order)
  const [waypoints, setWaypoints] = useState([]);
  // [lat, lng] pairs for Leaflet display
  const leafletPoints = waypoints.map(([lng, lat]) => [lat, lng]);

  const [manualMode, setManualMode] = useState(false);
  const [calcStatus, setCalcStatus] = useState(null); // null | 'loading' | 'ok' | 'error'
  const [calcMsg, setCalcMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const mapRef = useRef(null);

  useEffect(() => {
    api.get('/api/trucks').then(setTrucks).catch(() => {});
  }, []);

  async function handleCalcRoute() {
    if (!originText.trim() || !destText.trim()) {
      setCalcMsg('Escribe origen y destino');
      setCalcStatus('error');
      return;
    }
    setCalcStatus('loading');
    setCalcMsg('Geocodificando...');
    try {
      const [from, to] = await Promise.all([geocode(originText), geocode(destText)]);
      setCalcMsg('Calculando ruta por carretera...');
      const coords = await fetchRoute(from, to);
      setWaypoints(coords);
      setCalcStatus('ok');
      setCalcMsg(`${coords.length} waypoints calculados`);

      // Fit map to route
      if (mapRef.current) {
        const bounds = L.latLngBounds(coords.map(([lng, lat]) => [lat, lng]));
        mapRef.current.fitBounds(bounds, { padding: [24, 24] });
      }
    } catch (e) {
      setCalcStatus('error');
      setCalcMsg(e.message);
    }
  }

  function handleMapClick(lngLat) {
    setWaypoints((prev) => [...prev, lngLat]);
  }

  function handleUndo() {
    setWaypoints((prev) => prev.slice(0, -1));
  }

  function handleClear() {
    setWaypoints([]);
    setCalcStatus(null);
    setCalcMsg('');
  }

  async function handleSave() {
    if (!truckId) { setSaveError('Selecciona un camión'); return; }
    if (!originText.trim()) { setSaveError('Escribe el nombre del origen'); return; }
    if (!destText.trim()) { setSaveError('Escribe el nombre del destino'); return; }
    if (waypoints.length < 2) { setSaveError('La ruta necesita al menos 2 puntos'); return; }

    setSaving(true);
    setSaveError(null);
    try {
      await api.post('/api/routes', {
        truckId: parseInt(truckId, 10),
        originName: originText.trim(),
        destinationName: destText.trim(),
        waypoints,
      });
      navigate('/rutas');
    } catch (e) {
      setSaveError(e.message ?? 'Error al guardar');
      setSaving(false);
    }
  }

  const center = leafletPoints.length ? leafletPoints[Math.floor(leafletPoints.length / 2)] : [20.5888, -100.3899];

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center gap-2">
        <button onClick={() => navigate(-1)} className="text-slate-500 hover:text-slate-800">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <h1 className="text-base font-semibold text-slate-800">Nueva ruta</h1>
      </div>

      {/* Truck selector */}
      <div className="card space-y-3">
        <label className="block">
          <span className="text-xs font-medium text-slate-600">Camión</span>
          <select
            value={truckId}
            onChange={(e) => setTruckId(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">Seleccionar camión...</option>
            {trucks.map((t) => (
              <option key={t.id} value={t.id}>{t.plate} — {t.driverName}</option>
            ))}
          </select>
        </label>
      </div>

      {/* Origin / Destination + auto-calculate */}
      <div className="card space-y-3">
        <h2 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Calcular ruta automática</h2>
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="text-xs text-slate-500">Origen</span>
            <input
              type="text"
              value={originText}
              onChange={(e) => setOriginText(e.target.value)}
              placeholder="Ej. San Juan del Río, Qro"
              className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </label>
          <label className="block">
            <span className="text-xs text-slate-500">Destino</span>
            <input
              type="text"
              value={destText}
              onChange={(e) => setDestText(e.target.value)}
              placeholder="Ej. Querétaro Centro"
              className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </label>
        </div>

        <button
          onClick={handleCalcRoute}
          disabled={calcStatus === 'loading'}
          className="btn-primary w-full text-sm disabled:opacity-50"
        >
          {calcStatus === 'loading' ? calcMsg : 'Calcular ruta por carretera'}
        </button>

        {calcStatus === 'ok' && (
          <p className="text-xs text-green-600 font-medium">{calcMsg}</p>
        )}
        {calcStatus === 'error' && (
          <p className="text-xs text-red-500">{calcMsg}</p>
        )}
      </div>

      {/* Map preview */}
      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs font-medium text-slate-600">
            {waypoints.length === 0
              ? 'Sin waypoints'
              : `${waypoints.length} waypoint${waypoints.length !== 1 ? 's' : ''}`}
          </span>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={manualMode}
                onChange={(e) => setManualMode(e.target.checked)}
                className="rounded"
              />
              <span className="text-xs text-slate-600">Clic para agregar puntos</span>
            </label>
            {waypoints.length > 0 && (
              <>
                <button onClick={handleUndo} className="text-xs text-slate-500 hover:text-slate-800">Deshacer</button>
                <button onClick={handleClear} className="text-xs text-red-400 hover:text-red-600">Limpiar</button>
              </>
            )}
          </div>
        </div>

        <MapContainer
          center={center}
          zoom={11}
          className="h-64 w-full"
          ref={mapRef}
          style={{ cursor: manualMode ? 'crosshair' : '' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickLayer enabled={manualMode} onAdd={handleMapClick} />
          {leafletPoints.length >= 2 && (
            <Polyline positions={leafletPoints} pathOptions={{ color: '#2563eb', weight: 3 }} />
          )}
          {leafletPoints.length > 0 && (
            <Marker position={leafletPoints[0]} title="Origen" />
          )}
          {leafletPoints.length > 1 && (
            <Marker position={leafletPoints[leafletPoints.length - 1]} title="Destino" />
          )}
        </MapContainer>

        {manualMode && (
          <p className="px-4 py-2 text-xs text-blue-600 bg-blue-50 border-t border-blue-100">
            Modo manual activo — haz clic en el mapa para agregar puntos
          </p>
        )}
      </div>

      {/* Save */}
      <div className="card space-y-2">
        {saveError && <p className="text-xs text-red-500">{saveError}</p>}
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary w-full disabled:opacity-50"
        >
          {saving ? 'Guardando...' : 'Guardar ruta'}
        </button>
      </div>
    </div>
  );
}
