// Active alerts list
import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { getSocket } from '../api/socket';

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/alerts?onlyActive=true')
      .then(setAlerts)
      .finally(() => setLoading(false));

    const socket = getSocket();
    const onNew = (a) => setAlerts((prev) => [a, ...prev]);
    socket.on('alert:new', onNew);
    return () => socket.off('alert:new', onNew);
  }, []);

  async function ack(id) {
    await api.post(`/api/alerts/${id}/ack`);
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }

  if (loading) return <p className="text-sm text-slate-500">Cargando…</p>;
  if (alerts.length === 0) {
    return (
      <div className="card text-center py-10">
        <p className="text-sm text-slate-500">Sin alertas activas 🎉</p>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {alerts.map((a) => (
        <li key={a.id} className="card">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-red-600 font-medium">
                {a.type === 'TEMP' ? 'Temperatura' : 'Humedad'} · {a.severity}
              </p>
              <p className="text-sm text-slate-800">{a.message}</p>
              <p className="text-xs text-slate-400 mt-1">
                Caja {a.box?.code || a.boxId}
              </p>
            </div>
            <button className="btn-secondary text-xs" onClick={() => ack(a.id)}>
              Atender
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
