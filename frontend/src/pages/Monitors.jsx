// Live monitor: map (Leaflet) + last readings per box, fed by Socket.IO
import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { api } from '../api/client';
import { getSocket } from '../api/socket';

// Default Leaflet icon fix (CDN-hosted)
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

export default function Monitors() {
  const [trucks, setTrucks] = useState([]);
  // truckId -> [lat, lng]
  const [livePos, setLivePos] = useState({});
  // boxId -> { temperature, humidity, recordedAt }
  const [liveReadings, setLiveReadings] = useState({});

  useEffect(() => {
    api.get('/api/trucks').then(setTrucks).catch(() => {});

    const socket = getSocket();
    const onPos = ({ truckId, lat, lng }) => {
      setLivePos((prev) => ({ ...prev, [truckId]: [lat, lng] }));
    };
    const onReading = ({ boxId, temperature, humidity, recordedAt }) => {
      setLiveReadings((prev) => ({
        ...prev,
        [boxId]: { temperature, humidity, recordedAt },
      }));
    };
    socket.on('truck:position', onPos);
    socket.on('box:reading', onReading);
    return () => {
      socket.off('truck:position', onPos);
      socket.off('box:reading', onReading);
    };
  }, []);

  const center = useMemo(() => [19.4326, -99.1332], []); // CDMX default

  return (
    <div className="space-y-4">
      <section className="card p-0 overflow-hidden h-72">
        <MapContainer center={center} zoom={9} className="h-full w-full">
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {Object.entries(livePos).map(([truckId, pos]) => {
            const truck = trucks.find((t) => String(t.id) === truckId);
            return (
              <Marker key={truckId} position={pos} icon={defaultIcon}>
                <Popup>{truck ? truck.plate : `Camión ${truckId}`}</Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-700">Lecturas en vivo</h2>
        {trucks.length === 0 && (
          <p className="text-sm text-slate-500">Cargando camiones…</p>
        )}
        {trucks.map((t) => (
          <div key={t.id} className="card">
            <p className="text-sm font-medium text-slate-800">{t.plate}</p>
            <p className="text-xs text-slate-500 mb-2">{t.driverName}</p>
            <ul className="space-y-1">
              {t.boxes.map((b) => {
                const r = liveReadings[b.id];
                return (
                  <li key={b.id} className="flex justify-between text-sm">
                    <span className="text-slate-600">{b.code}</span>
                    <span className="tabular-nums text-slate-800">
                      {r
                        ? `${r.temperature.toFixed(1)} °C · ${r.humidity.toFixed(0)} %`
                        : '— °C · — %'}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </section>
    </div>
  );
}
