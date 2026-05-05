import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { getSocket } from "../api/socket";

// --- Sparkline (inline SVG, no deps) ---
function Sparkline({ values, color = "#3b82f6", width = 200, height = 60 }) {
  if (!values || values.length < 2)
    return <span className="text-slate-300 text-xs">Sin datos</span>;

  const W = width;
  const H = height;
  const pad = 4;
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const range = hi - lo || 0.01;

  const pts = values
    .map((v, i) => {
      const x = pad + (i / (values.length - 1)) * (W - pad * 2);
      const y = H - pad - ((v - lo) / range) * (H - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const lastPt = pts.split(" ").pop().split(",");

  // area fill path
  const firstPt = pts.split(" ")[0].split(",");
  const area = `${pts} ${lastPt[0]},${H - pad} ${firstPt[0]},${H - pad}`;

  return (
    <svg width={W} height={H} aria-hidden className="w-full">
      <polygon points={area} fill={color} fillOpacity="0.12" />
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={lastPt[0]} cy={lastPt[1]} r="4" fill={color} stroke="white" strokeWidth="1.5" />
      {/* min/max labels */}
      <text x={pad} y={H - 1} fontSize="8" fill={color} fillOpacity="0.6">{lo.toFixed(1)}</text>
      <text x={W - pad} y={H - 1} fontSize="8" fill={color} fillOpacity="0.6" textAnchor="end">{hi.toFixed(1)}</text>
    </svg>
  );
}

// --- Time filter helpers ---
const FILTERS = [
  { key: 'live', label: 'En vivo', limit: 100, since: null },
  { key: 'day',  label: 'Hoy',    limit: 2000, sinceMs: 24 * 60 * 60 * 1000 },
  { key: 'week', label: 'Semana', limit: 2000, sinceMs: 7 * 24 * 60 * 60 * 1000 },
  { key: 'month', label: 'Mes',   limit: 2000, sinceMs: 30 * 24 * 60 * 60 * 1000 },
];

export default function TruckDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [truck, setTruck] = useState(null);
  const [boxReadings, setBoxReadings] = useState({});
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState('live');

  // Load readings for all boxes with the selected filter
  async function loadReadings(t, filterKey) {
    const f = FILTERS.find((x) => x.key === filterKey) ?? FILTERS[0];
    const since = f.sinceMs ? new Date(Date.now() - f.sinceMs).toISOString() : undefined;
    const qs = since ? `?limit=${f.limit}&since=${since}` : `?limit=${f.limit}`;

    const entries = await Promise.all(
      (t.boxes || []).map(async (box) => {
        const readings = await api.get(`/api/boxes/${box.id}/readings${qs}`);
        return [String(box.id), readings];
      }),
    );
    setBoxReadings(Object.fromEntries(entries));
  }

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const t = await api.get(`/api/trucks/${id}`);
        if (cancelled) return;
        setTruck(t);
        await loadReadings(t, timeFilter);
      } catch {
        // handled by loading/null state
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();

    const socket = getSocket();
    const onReading = ({ boxId, temperature, humidity, recordedAt }) => {
      setBoxReadings((prev) => {
        const key = String(boxId);
        const current = prev[key] || [];
        return {
          ...prev,
          [key]: [...current, { temperature, humidity, recordedAt }].slice(-500),
        };
      });
    };
    socket.on("box:reading", onReading);

    return () => {
      cancelled = true;
      socket.off("box:reading", onReading);
    };
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reload readings when filter changes (truck already loaded)
  useEffect(() => {
    if (truck) loadReadings(truck, timeFilter);
  }, [timeFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading)
    return <div className="p-4 text-sm text-slate-500">Cargando camión…</div>;
  if (!truck)
    return <div className="p-4 text-sm text-red-500">Camión no encontrado.</div>;

  const statusLabel = {
    ON_ROUTE: "En ruta", IDLE: "Disponible", MAINTENANCE: "Mantenimiento",
  }[truck.status] ?? truck.status;
  const statusColor = {
    ON_ROUTE: "bg-green-100 text-green-700",
    MAINTENANCE: "bg-yellow-100 text-yellow-700",
    IDLE: "bg-slate-100 text-slate-600",
  }[truck.status] ?? "bg-slate-100 text-slate-600";

  return (
    <div className="space-y-4 pb-20">
      {/* Header — driver name big, plate small */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 space-y-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            className="text-slate-400 hover:text-slate-700 shrink-0"
            aria-label="Volver"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button>
          <span className={`ml-auto text-xs px-2 py-1 rounded-full font-semibold uppercase shrink-0 ${statusColor}`}>
            {statusLabel}
          </span>
        </div>
        <div>
          <p className="text-2xl font-black text-slate-800 leading-tight">{truck.driverName}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{truck.plate}</span>
            <span className="text-xs text-slate-400">{truck.model}</span>
          </div>
        </div>
      </div>

      {/* Time filter */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setTimeFilter(f.key)}
            className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              timeFilter === f.key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Box cards */}
      {(truck.boxes || []).length === 0 && (
        <p className="text-sm text-slate-400 text-center py-6">Este camión no tiene cajas registradas.</p>
      )}

      {(truck.boxes || []).map((box) => {
        const readings = boxReadings[String(box.id)] || [];
        const last = readings[readings.length - 1];
        const temps = readings.map((r) => r.temperature);
        const hums = readings.map((r) => r.humidity);

        const tempOk = last == null || (last.temperature >= box.targetTempMin && last.temperature <= box.targetTempMax);
        const humOk  = last == null || (last.humidity >= box.targetHumMin && last.humidity <= box.targetHumMax);

        return (
          <div key={box.id} className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 space-y-4">
            {/* Box header */}
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Caja</p>
                <p className="text-sm font-bold text-slate-800">{box.code}</p>
              </div>
              <p className="text-[10px] text-slate-400 text-right">
                Temp: {box.targetTempMin}°C – {box.targetTempMax}°C<br/>
                Hum: {box.targetHumMin}% – {box.targetHumMax}%
              </p>
            </div>

            {/* Last reading tiles */}
            <div className="grid grid-cols-2 gap-2">
              <div className={`p-3 rounded-xl border ${tempOk ? "border-slate-100 bg-slate-50" : "border-red-200 bg-red-50"}`}>
                <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Temperatura</p>
                <p className={`text-3xl font-black font-mono ${tempOk ? "text-blue-600" : "text-red-500"}`}>
                  {last ? `${last.temperature.toFixed(1)}°` : "—"}
                </p>
                <p className="text-xs text-slate-400">°C</p>
              </div>
              <div className={`p-3 rounded-xl border ${humOk ? "border-slate-100 bg-slate-50" : "border-yellow-200 bg-yellow-50"}`}>
                <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Humedad</p>
                <p className={`text-3xl font-black font-mono ${humOk ? "text-teal-600" : "text-yellow-600"}`}>
                  {last ? `${Math.round(last.humidity)}` : "—"}
                </p>
                <p className="text-xs text-slate-400">%</p>
              </div>
            </div>

            {/* Sparklines — larger */}
            {readings.length >= 2 && (
              <div className="space-y-3">
                <div>
                  <p className="text-[9px] text-slate-400 font-bold uppercase mb-1">
                    Temperatura — {readings.length} lecturas
                  </p>
                  <Sparkline values={temps} color={tempOk ? "#3b82f6" : "#ef4444"} height={70} />
                </div>
                <div>
                  <p className="text-[9px] text-slate-400 font-bold uppercase mb-1">Humedad relativa</p>
                  <Sparkline values={hums} color="#14b8a6" height={70} />
                </div>
              </div>
            )}

            {/* History table */}
            {readings.length > 0 ? (
              <div>
                <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Últimas lecturas</p>
                <div className="overflow-x-auto rounded-lg border border-slate-100">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-slate-400 text-[9px] uppercase font-bold bg-slate-50">
                        <th className="py-1.5 px-2 text-left">Hora</th>
                        <th className="py-1.5 px-2 text-right">Temp (°C)</th>
                        <th className="py-1.5 px-2 text-right">Hum (%)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...readings].reverse().slice(0, 20).map((r, i) => {
                        const tOk = r.temperature >= box.targetTempMin && r.temperature <= box.targetTempMax;
                        const hOk = r.humidity >= box.targetHumMin && r.humidity <= box.targetHumMax;
                        return (
                          <tr key={i} className="border-t border-slate-50 even:bg-slate-50/50">
                            <td className="py-1.5 px-2 text-slate-400 tabular-nums">
                              {new Date(r.recordedAt).toLocaleString("es-MX", {
                                month: "short", day: "numeric",
                                hour: "2-digit", minute: "2-digit",
                              })}
                            </td>
                            <td className={`py-1.5 px-2 text-right font-mono font-bold tabular-nums ${tOk ? "text-blue-600" : "text-red-500"}`}>
                              {r.temperature.toFixed(2)}
                            </td>
                            <td className={`py-1.5 px-2 text-right font-mono tabular-nums ${hOk ? "text-teal-600" : "text-yellow-600"}`}>
                              {r.humidity.toFixed(1)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 text-center py-2">Sin lecturas en este período.</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Inline SVG sparkline — no external library needed
function Sparkline({ values, color = "#3b82f6" }) {
  if (!values || values.length < 2)
    return <span className="text-slate-300 text-xs">—</span>;

  const W = 110;
  const H = 34;
  const pad = 3;
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const range = hi - lo || 0.01;

  const pts = values
    .map((v, i) => {
      const x = pad + (i / (values.length - 1)) * (W - pad * 2);
      const y = H - pad - ((v - lo) / range) * (H - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const lastPt = pts.split(" ").pop().split(",");

  return (
    <svg width={W} height={H} aria-hidden>
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={lastPt[0]} cy={lastPt[1]} r="3" fill={color} />
    </svg>
  );
}

export default function TruckDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [truck, setTruck] = useState(null);
  const [boxReadings, setBoxReadings] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const t = await api.get(`/api/trucks/${id}`);
        if (cancelled) return;
        setTruck(t);

        // Load last 50 readings for each box in parallel
        const entries = await Promise.all(
          (t.boxes || []).map(async (box) => {
            const readings = await api.get(
              `/api/boxes/${box.id}/readings?limit=50`,
            );
            return [String(box.id), readings];
          }),
        );
        if (!cancelled) setBoxReadings(Object.fromEntries(entries));
      } catch {
        // handled by loading/null state
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    // Append live readings as they arrive
    const socket = getSocket();
    const onReading = ({ boxId, temperature, humidity, recordedAt }) => {
      setBoxReadings((prev) => {
        const key = String(boxId);
        const current = prev[key] || [];
        return {
          ...prev,
          [key]: [...current, { temperature, humidity, recordedAt }].slice(-50),
        };
      });
    };
    socket.on("box:reading", onReading);

    return () => {
      cancelled = true;
      socket.off("box:reading", onReading);
    };
  }, [id]);

  if (loading)
    return (
      <div className="p-4 text-sm text-slate-500">Cargando camión…</div>
    );
  if (!truck)
    return (
      <div className="p-4 text-sm text-red-500">Camión no encontrado.</div>
    );

  const statusLabel = {
    ON_ROUTE: "En ruta",
    IDLE: "Disponible",
    MAINTENANCE: "Mantenimiento",
  }[truck.status] ?? truck.status;

  const statusColor = {
    ON_ROUTE: "bg-green-100 text-green-700",
    MAINTENANCE: "bg-yellow-100 text-yellow-700",
    IDLE: "bg-slate-100 text-slate-600",
  }[truck.status] ?? "bg-slate-100 text-slate-600";

  return (
    <div className="space-y-4 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3 bg-white rounded-xl p-3 shadow-sm border border-slate-100">
        <button
          onClick={() => navigate(-1)}
          className="text-slate-400 hover:text-slate-700 text-xl leading-none px-1"
          aria-label="Volver"
        >
          ←
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
            Detalle de camión
          </p>
          <h1 className="text-base font-black text-slate-800 font-mono">
            {truck.plate}
          </h1>
          <p className="text-xs text-slate-500 truncate">
            {truck.model} · {truck.driverName}
          </p>
        </div>
        <span
          className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase shrink-0 ${statusColor}`}
        >
          {statusLabel}
        </span>
      </div>

      {/* Box cards */}
      {(truck.boxes || []).length === 0 && (
        <p className="text-sm text-slate-400 text-center py-6">
          Este camión no tiene cajas registradas.
        </p>
      )}

      {(truck.boxes || []).map((box) => {
        const readings = boxReadings[String(box.id)] || [];
        const last = readings[readings.length - 1];
        const temps = readings.map((r) => r.temperature);
        const hums = readings.map((r) => r.humidity);

        const tempOk =
          last == null ||
          (last.temperature >= box.targetTempMin &&
            last.temperature <= box.targetTempMax);
        const humOk =
          last == null ||
          (last.humidity >= box.targetHumMin &&
            last.humidity <= box.targetHumMax);

        return (
          <div
            key={box.id}
            className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 space-y-3"
          >
            {/* Box header */}
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  Caja
                </p>
                <p className="text-sm font-bold text-slate-800">{box.code}</p>
              </div>
              <p className="text-[10px] text-slate-400 text-right">
                Temp: {box.targetTempMin}°C – {box.targetTempMax}°C
                <br />
                Hum: {box.targetHumMin}% – {box.targetHumMax}%
              </p>
            </div>

            {/* Last reading tiles */}
            <div className="grid grid-cols-2 gap-2">
              <div
                className={`p-2 rounded-lg border ${tempOk ? "border-slate-100 bg-slate-50" : "border-red-200 bg-red-50"}`}
              >
                <p className="text-[9px] font-bold text-slate-400 uppercase">
                  Temperatura
                </p>
                <p
                  className={`text-2xl font-black font-mono ${tempOk ? "text-blue-600" : "text-red-500"}`}
                >
                  {last ? `${last.temperature.toFixed(1)}°C` : "—"}
                </p>
              </div>
              <div
                className={`p-2 rounded-lg border ${humOk ? "border-slate-100 bg-slate-50" : "border-yellow-200 bg-yellow-50"}`}
              >
                <p className="text-[9px] font-bold text-slate-400 uppercase">
                  Humedad
                </p>
                <p
                  className={`text-2xl font-black font-mono ${humOk ? "text-teal-600" : "text-yellow-600"}`}
                >
                  {last ? `${Math.round(last.humidity)}%` : "—"}
                </p>
              </div>
            </div>

            {/* Sparklines */}
            {readings.length >= 2 && (
              <div className="flex gap-6 items-end pt-1">
                <div>
                  <p className="text-[9px] text-slate-400 font-bold uppercase mb-1">
                    Temperatura ({readings.length})
                  </p>
                  <Sparkline
                    values={temps}
                    color={tempOk ? "#3b82f6" : "#ef4444"}
                  />
                </div>
                <div>
                  <p className="text-[9px] text-slate-400 font-bold uppercase mb-1">
                    Humedad
                  </p>
                  <Sparkline values={hums} color="#14b8a6" />
                </div>
              </div>
            )}

            {/* History table */}
            {readings.length > 0 ? (
              <div>
                <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">
                  Últimas lecturas
                </p>
                <div className="overflow-x-auto rounded-lg border border-slate-100">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-slate-400 text-[9px] uppercase font-bold bg-slate-50">
                        <th className="py-1.5 px-2 text-left">Hora</th>
                        <th className="py-1.5 px-2 text-right">Temp (°C)</th>
                        <th className="py-1.5 px-2 text-right">Hum (%)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...readings]
                        .reverse()
                        .slice(0, 15)
                        .map((r, i) => {
                          const tOk =
                            r.temperature >= box.targetTempMin &&
                            r.temperature <= box.targetTempMax;
                          const hOk =
                            r.humidity >= box.targetHumMin &&
                            r.humidity <= box.targetHumMax;
                          return (
                            <tr
                              key={i}
                              className="border-t border-slate-50 even:bg-slate-50/50"
                            >
                              <td className="py-1.5 px-2 text-slate-400 tabular-nums">
                                {new Date(r.recordedAt).toLocaleTimeString(
                                  "es-MX",
                                  {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    second: "2-digit",
                                  },
                                )}
                              </td>
                              <td
                                className={`py-1.5 px-2 text-right font-mono font-bold tabular-nums ${tOk ? "text-blue-600" : "text-red-500"}`}
                              >
                                {r.temperature.toFixed(2)}
                              </td>
                              <td
                                className={`py-1.5 px-2 text-right font-mono tabular-nums ${hOk ? "text-teal-600" : "text-yellow-600"}`}
                              >
                                {r.humidity.toFixed(1)}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 text-center py-2">
                Sin lecturas registradas.
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
