import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { api } from '../api/client';
import { getSocket } from '../api/socket';

// --- UTILIDADES ---

const getTruckColor = (id) => {
  const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
  return colors[parseInt(id) % colors.length];
};

/**
 * Control mejorado: Calcula los límites basados en TODAS las coordenadas
 * de todas las rutas para que nunca se pierda el rastro completo.
 */
function MapController({ allRoutes, autoView, setAutoView }) {
  const map = useMapEvents({
    dragstart: () => { if (autoView) setAutoView(false); },
    zoomstart: () => { if (autoView) setAutoView(false); },
  });

  useEffect(() => {
    if (autoView) {
      // Extraemos todos los puntos de todos los arreglos de rutas
      const allPoints = Object.values(allRoutes).flat();

      if (allPoints.length > 0) {
        const bounds = L.latLngBounds(allPoints);
        map.fitBounds(bounds, { 
          padding: [40, 40], 
          maxZoom: 15, 
          animate: true 
        });
      }
    }
  }, [allRoutes, autoView, map]);

  return null;
}

const createDotIcon = (color) => {
  return L.divIcon({
    className: 'custom-dot-icon',
    html: `<div style="
      background-color: ${color};
      width: 16px;
      height: 16px;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 0 8px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
};

// --- COMPONENTE PRINCIPAL ---

export default function Monitors() {
  const [trucks, setTrucks] = useState([]);
  const [liveRoutes, setLiveRoutes] = useState({});
  const [liveReadings, setLiveReadings] = useState({});
  const [autoView, setAutoView] = useState(true);

  useEffect(() => {
    api.get('/api/trucks').then(setTrucks).catch(() => {});

    const socket = getSocket();

    const onPos = ({ truckId, lat, lng }) => {
      setLiveRoutes((prev) => {
        const currentRoute = prev[truckId] || [];
        return {
          ...prev,
          [truckId]: [...currentRoute, [lat, lng]],
        };
      });
    };

    const onReading = ({ boxId, temperature, humidity }) => {
      setLiveReadings((prev) => ({
        ...prev,
        [boxId]: { temperature, humidity },
      }));
    };

    socket.on('truck:position', onPos);
    socket.on('box:reading', onReading);

    return () => {
      socket.off('truck:position', onPos);
      socket.off('box:reading', onReading);
    };
  }, []);

  const defaultCenter = [20.5879069,-100.3927639];

  return (
    <div className="flex flex-col gap-4 pb-20"> {/* pb-20 evita que el contenido choque con menús inferiores */}
      
      {/* Header con Switch */}
      <div className="flex justify-between items-center bg-white p-3 rounded-lg shadow-sm border border-slate-100 mx-1">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Enfoque automatico</h2>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Auto</span>
          <button 
            onClick={() => setAutoView(!autoView)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
              autoView ? 'bg-blue-500' : 'bg-slate-300'
            }`}
          >
            <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                autoView ? 'translate-x-5' : 'translate-x-1'
            }`} />
          </button>
        </div>
      </div>

      {/* Mapa con altura controlada */}
      <section className="relative z-10 mx-1 border rounded-xl overflow-hidden shadow-inner bg-slate-100 h-72 md:h-80">
        <MapContainer center={defaultCenter} zoom={12} className="h-full w-full">
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          <MapController 
            allRoutes={liveRoutes} 
            autoView={autoView} 
            setAutoView={setAutoView} 
          />
          
          {Object.entries(liveRoutes).map(([truckId, route]) => {
            const truck = trucks.find((t) => String(t.id) === truckId);
            const lastPos = route[route.length - 1];
            const color = getTruckColor(truckId);

            return (
              <div key={truckId}>
                <Polyline 
                  positions={route} 
                  pathOptions={{ color, weight: 5, opacity: 0.8, lineJoin: 'round' }} 
                />
                {lastPos && (
                  <Marker position={lastPos} icon={createDotIcon(color)}>
                    <Popup size="sm">
                      <span className="font-bold text-xs">{truck?.plate}</span>
                    </Popup>
                  </Marker>
                )}
              </div>
            );
          })}
        </MapContainer>
      </section>

      {/* Lista de Camiones */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 px-1">
        {trucks.map((t) => {
          const color = getTruckColor(t.id);
          const isActive = !!liveRoutes[t.id];

          return (
            <div 
              key={t.id} 
              className={`p-3 rounded-xl border-l-4 shadow-sm transition-all bg-white ${!isActive && 'opacity-60'}`} 
              style={{ borderLeftColor: color }}
            >
              <div className="flex justify-between items-center mb-2">
                <span className="font-black text-slate-700 text-xs">{t.plate}</span>
                {isActive && (
                  <span className="flex h-2 w-2 rounded-full animate-pulse" style={{ backgroundColor: color }} />
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                {t.boxes.map((b) => {
                  const r = liveReadings[b.id];
                  return (
                    <div key={b.id} className="bg-slate-50 p-2 rounded-lg text-center">
                      <p className="text-[9px] text-slate-400 font-bold uppercase">{b.code}</p>
                      <p className="text-xs font-mono font-bold text-slate-700">
                        {r ? `${r.temperature.toFixed(1)}°` : '--'}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}