import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { getSocket } from "../api/socket";

// ─── Chart layout constants ───────────────────────────────────────
const CW = 320;
const CH = 140;
const PAD = { top: 10, right: 16, bottom: 30, left: 44 };
// Inner chart area corners
const IX0 = PAD.left;
const IX1 = CW - PAD.right;
const IY0 = PAD.top;
const IY1 = CH - PAD.bottom;
const ICW = IX1 - IX0;
const ICH = IY1 - IY0;

function niceRange(lo, hi) {
  const span = hi - lo || 1;
  const p = span * 0.18;
  return [lo - p, hi + p];
}

function gridValues(yMin, yMax, n = 4) {
  const step = (yMax - yMin) / n;
  return Array.from({ length: n + 1 }, (_, i) => yMin + i * step);
}

// Full line chart: axes, grid, range band, area fill, labels
function SensorChart({ values, timestamps, color, minRange, maxRange }) {
  if (!values || values.length < 2)
    return <p className="text-xs text-slate-300 text-center py-6">Sin datos suficientes</p>;

  const dataLo = Math.min(...values, minRange);
  const dataHi = Math.max(...values, maxRange);
  const [yMin, yMax] = niceRange(dataLo, dataHi);
  const yRange = yMax - yMin;

  const toX = (i) => IX0 + (i / (values.length - 1)) * ICW;
  const toY = (v) => IY1 - ((v - yMin) / yRange) * ICH;

  const pts = values.map((v, i) => `${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(" ");
  const lastX = toX(values.length - 1);
  const lastY = toY(values[values.length - 1]);
  const areaPath = `${pts} ${lastX.toFixed(1)},${IY1} ${IX0},${IY1}`;

  // acceptable range band
  const bandTop = Math.max(IY0, Math.min(IY1, toY(maxRange)));
  const bandBot = Math.max(IY0, Math.min(IY1, toY(minRange)));

  const grid = gridValues(yMin, yMax, 4);

  // 3 x-axis labels: first, middle, last
  const xIdxs = [0, Math.floor((values.length - 1) / 2), values.length - 1];
  const xLabels = xIdxs.map((i) => ({
    x: toX(i),
    label: timestamps[i]
      ? new Date(timestamps[i]).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })
      : "",
  }));

  return (
    <svg viewBox={`0 0 ${CW} ${CH}`} className="w-full" aria-hidden>
      {/* Acceptable range band */}
      <rect
        x={IX0} y={bandTop}
        width={ICW} height={Math.max(0, bandBot - bandTop)}
        fill={color} fillOpacity="0.08"
      />

      {/* Grid lines + Y labels */}
      {grid.map((v, i) => {
        const y = toY(v);
        return (
          <g key={i}>
            <line x1={IX0} y1={y} x2={IX1} y2={y} stroke="#e2e8f0" strokeWidth="1" />
            <text x={IX0 - 5} y={y + 3.5} fontSize="9" fill="#94a3b8" textAnchor="end">
              {v.toFixed(1)}
            </text>
          </g>
        );
      })}

      {/* Axes */}
      <line x1={IX0} y1={IY0} x2={IX0} y2={IY1} stroke="#cbd5e1" strokeWidth="1" />
      <line x1={IX0} y1={IY1} x2={IX1} y2={IY1} stroke="#cbd5e1" strokeWidth="1" />

      {/* X labels */}
      {xLabels.map(({ x, label }, i) => (
        <text key={i} x={x} y={CH - 4} fontSize="9" fill="#94a3b8" textAnchor="middle">
          {label}
        </text>
      ))}

      {/* Area fill */}
      <polygon points={areaPath} fill={color} fillOpacity="0.10" />

      {/* Line */}
      <polyline
        points={pts} fill="none"
        stroke={color} strokeWidth="2"
        strokeLinejoin="round" strokeLinecap="round"
      />

      {/* Last point + value */}
      <circle cx={lastX} cy={lastY} r="4" fill={color} stroke="white" strokeWidth="1.5" />
      <text x={lastX + 7} y={lastY + 4} fontSize="9" fill={color} fontWeight="bold">
        {values[values.length - 1].toFixed(1)}
      </text>
    </svg>
  );
}

// Bar chart for grouped averages
function AggregateChart({ data, color }) {
  if (!data || data.length === 0)
    return <p className="text-xs text-slate-300 text-center py-6">Sin datos suficientes</p>;

  const vals = data.map((d) => d.value);
  const [yMin, yMax] = niceRange(Math.min(...vals), Math.max(...vals));
  const yRange = yMax - yMin;
  const toY = (v) => IY1 - ((v - yMin) / yRange) * ICH;
  const grid = gridValues(yMin, yMax, 4);

  const barGap = ICW / data.length;
  const barW = barGap * 0.6;

  return (
    <svg viewBox={`0 0 ${CW} ${CH}`} className="w-full" aria-hidden>
      {/* Grid + Y labels */}
      {grid.map((v, i) => {
        const y = toY(v);
        return (
          <g key={i}>
            <line x1={IX0} y1={y} x2={IX1} y2={y} stroke="#e2e8f0" strokeWidth="1" />
            <text x={IX0 - 5} y={y + 3.5} fontSize="9" fill="#94a3b8" textAnchor="end">
              {v.toFixed(1)}
            </text>
          </g>
        );
      })}

      {/* Axes */}
      <line x1={IX0} y1={IY0} x2={IX0} y2={IY1} stroke="#cbd5e1" strokeWidth="1" />
      <line x1={IX0} y1={IY1} x2={IX1} y2={IY1} stroke="#cbd5e1" strokeWidth="1" />

      {/* Bars */}
      {data.map(({ label, value }, i) => {
        const x = IX0 + i * barGap + (barGap - barW) / 2;
        const barTop = toY(value);
        return (
          <g key={i}>
            <rect x={x} y={barTop} width={barW} height={IY1 - barTop}
              fill={color} fillOpacity="0.75" rx="2" />
            <text x={x + barW / 2} y={CH - 4} fontSize="8" fill="#94a3b8" textAnchor="middle">
              {label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── Aggregate helpers ────────────────────────────────────────────
function arrAvg(arr) {
  return arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;
}

function groupReadings(readings, getKey, allKeys) {
  const buckets = {};
  allKeys.forEach((k) => { buckets[k] = []; });
  readings.forEach((r) => {
    const k = getKey(r);
    if (buckets[k] !== undefined) buckets[k].push(r);
  });
  return allKeys.map((k) => ({ key: k, items: buckets[k] }));
}

const HOUR_KEYS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const DAY_KEYS = [0, 1, 2, 3, 4, 5, 6];
const DAY_NAMES = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"];
const MONTH_KEYS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const MONTH_NAMES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function aggregateByHour(readings, field) {
  return groupReadings(
    readings,
    (r) => String(new Date(r.recordedAt).getHours()).padStart(2, "0"),
    HOUR_KEYS,
  )
    .filter((b) => b.items.length > 0)
    .map((b) => ({ label: b.key, value: arrAvg(b.items.map((r) => r[field])) }));
}

function aggregateByDay(readings, field) {
  return groupReadings(readings, (r) => new Date(r.recordedAt).getDay(), DAY_KEYS)
    .filter((b) => b.items.length > 0)
    .map((b) => ({ label: DAY_NAMES[b.key], value: arrAvg(b.items.map((r) => r[field])) }));
}

function aggregateByMonth(readings, field) {
  return groupReadings(readings, (r) => new Date(r.recordedAt).getMonth(), MONTH_KEYS)
    .filter((b) => b.items.length > 0)
    .map((b) => ({ label: MONTH_NAMES[b.key], value: arrAvg(b.items.map((r) => r[field])) }));
}

// ─── Time + aggregate view options ───────────────────────────────
const FILTERS = [
  { key: "live",  label: "En vivo", limit: 100,  sinceMs: null },
  { key: "day",   label: "Hoy",     limit: 2000, sinceMs: 24 * 60 * 60 * 1000 },
  { key: "week",  label: "Semana",  limit: 2000, sinceMs: 7 * 24 * 60 * 60 * 1000 },
  { key: "month", label: "Mes",     limit: 2000, sinceMs: 30 * 24 * 60 * 60 * 1000 },
];

const AGG_VIEWS = [
  { key: "raw",   label: "Historial" },
  { key: "hour",  label: "x Hora" },
  { key: "day",   label: "x Dia" },
  { key: "month", label: "x Mes" },
];

// ─── BoxCard ──────────────────────────────────────────────────────
function BoxCard({ box, readings }) {
  const [aggView, setAggView] = useState("raw");

  const last = readings[readings.length - 1];
  const tempOk = last == null || (last.temperature >= box.targetTempMin && last.temperature <= box.targetTempMax);
  const humOk  = last == null || (last.humidity >= box.targetHumMin && last.humidity <= box.targetHumMax);
  const tempColor = tempOk ? "#3b82f6" : "#ef4444";
  const humColor  = humOk  ? "#14b8a6" : "#ca8a04";

  const timestamps  = useMemo(() => readings.map((r) => r.recordedAt), [readings]);
  const temps       = useMemo(() => readings.map((r) => r.temperature), [readings]);
  const hums        = useMemo(() => readings.map((r) => r.humidity), [readings]);

  const tempHour  = useMemo(() => aggregateByHour(readings, "temperature"),  [readings]);
  const tempDay   = useMemo(() => aggregateByDay(readings, "temperature"),   [readings]);
  const tempMonth = useMemo(() => aggregateByMonth(readings, "temperature"), [readings]);
  const humHour   = useMemo(() => aggregateByHour(readings, "humidity"),     [readings]);
  const humDay    = useMemo(() => aggregateByDay(readings, "humidity"),      [readings]);
  const humMonth  = useMemo(() => aggregateByMonth(readings, "humidity"),    [readings]);

  const tempStats = temps.length ? { min: Math.min(...temps), max: Math.max(...temps), avg: arrAvg(temps) } : null;
  const humStats  = hums.length  ? { min: Math.min(...hums),  max: Math.max(...hums),  avg: arrAvg(hums)  } : null;

  function renderTempChart() {
    if (aggView === "hour")  return <AggregateChart data={tempHour}  color={tempColor} />;
    if (aggView === "day")   return <AggregateChart data={tempDay}   color={tempColor} />;
    if (aggView === "month") return <AggregateChart data={tempMonth} color={tempColor} />;
    return <SensorChart values={temps} timestamps={timestamps} color={tempColor} minRange={box.targetTempMin} maxRange={box.targetTempMax} />;
  }

  function renderHumChart() {
    if (aggView === "hour")  return <AggregateChart data={humHour}  color={humColor} />;
    if (aggView === "day")   return <AggregateChart data={humDay}   color={humColor} />;
    if (aggView === "month") return <AggregateChart data={humMonth} color={humColor} />;
    return <SensorChart values={hums} timestamps={timestamps} color={humColor} minRange={box.targetHumMin} maxRange={box.targetHumMax} />;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 space-y-4">
      {/* Box header */}
      <div className="flex justify-between items-start">
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Caja</p>
          <p className="text-sm font-bold text-slate-800">{box.code}</p>
        </div>
        <p className="text-[10px] text-slate-400 text-right leading-relaxed">
          Temp: {box.targetTempMin}&deg; – {box.targetTempMax}&deg;C<br />
          Hum: {box.targetHumMin}% – {box.targetHumMax}%
        </p>
      </div>

      {/* Last reading tiles */}
      <div className="grid grid-cols-2 gap-2">
        <div className={`p-3 rounded-xl border ${tempOk ? "border-slate-100 bg-slate-50" : "border-red-200 bg-red-50"}`}>
          <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Temperatura</p>
          <p className={`text-3xl font-black font-mono ${tempOk ? "text-blue-600" : "text-red-500"}`}>
            {last ? `${last.temperature.toFixed(1)}°` : "—"}
          </p>
          <p className="text-xs text-slate-400">°C</p>
        </div>
        <div className={`p-3 rounded-xl border ${humOk ? "border-slate-100 bg-slate-50" : "border-yellow-200 bg-yellow-50"}`}>
          <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Humedad</p>
          <p className={`text-3xl font-black font-mono ${humOk ? "text-teal-600" : "text-yellow-600"}`}>
            {last ? `${Math.round(last.humidity)}` : "—"}
          </p>
          <p className="text-xs text-slate-400">%</p>
        </div>
      </div>

      {/* View mode selector */}
      <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
        {AGG_VIEWS.map((v) => (
          <button
            key={v.key}
            onClick={() => setAggView(v.key)}
            className={`flex-1 py-1 text-[11px] font-medium rounded-md transition-colors ${
              aggView === v.key ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* Charts */}
      {readings.length >= 2 ? (
        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-baseline mb-1">
              <p className="text-[10px] text-slate-400 font-bold uppercase">Temperatura</p>
              {tempStats && (
                <span className="text-[10px] text-slate-400 tabular-nums">
                  min {tempStats.min.toFixed(1)} · avg {tempStats.avg.toFixed(1)} · max {tempStats.max.toFixed(1)} °C
                </span>
              )}
            </div>
            {renderTempChart()}
          </div>
          <div>
            <div className="flex justify-between items-baseline mb-1">
              <p className="text-[10px] text-slate-400 font-bold uppercase">Humedad relativa</p>
              {humStats && (
                <span className="text-[10px] text-slate-400 tabular-nums">
                  min {humStats.min.toFixed(1)} · avg {humStats.avg.toFixed(1)} · max {humStats.max.toFixed(1)} %
                </span>
              )}
            </div>
            {renderHumChart()}
          </div>
        </div>
      ) : (
        <p className="text-xs text-slate-400 text-center py-2">Sin datos para graficar en este periodo.</p>
      )}

      {/* History table */}
      {readings.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Ultimas lecturas</p>
          <div className="overflow-x-auto rounded-lg border border-slate-100">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-400 text-[10px] uppercase font-bold bg-slate-50">
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
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────
export default function TruckDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [truck, setTruck] = useState(null);
  const [boxReadings, setBoxReadings] = useState({});
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState("live");

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
        // handled by null state
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
        return { ...prev, [key]: [...current, { temperature, humidity, recordedAt }].slice(-500) };
      });
    };
    socket.on("box:reading", onReading);
    return () => { cancelled = true; socket.off("box:reading", onReading); };
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (truck) loadReadings(truck, timeFilter);
  }, [timeFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <div className="p-4 text-sm text-slate-500">Cargando camion...</div>;
  if (!truck)  return <div className="p-4 text-sm text-red-500">Camion no encontrado.</div>;

  const statusLabel = { ON_ROUTE: "En ruta", IDLE: "Disponible", MAINTENANCE: "Mantenimiento" }[truck.status] ?? truck.status;
  const statusColor = {
    ON_ROUTE: "bg-green-100 text-green-700",
    MAINTENANCE: "bg-yellow-100 text-yellow-700",
    IDLE: "bg-slate-100 text-slate-600",
  }[truck.status] ?? "bg-slate-100 text-slate-600";

  return (
    <div className="space-y-4 pb-20">
      {/* Header */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 space-y-2">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-slate-700 shrink-0" aria-label="Volver">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M15 18l-6-6 6-6" />
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
              timeFilter === f.key ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Box cards */}
      {(truck.boxes || []).length === 0 && (
        <p className="text-sm text-slate-400 text-center py-6">Este camion no tiene cajas registradas.</p>
      )}
      {(truck.boxes || []).map((box) => (
        <BoxCard key={box.id} box={box} readings={boxReadings[String(box.id)] || []} />
      ))}
    </div>
  );
}

