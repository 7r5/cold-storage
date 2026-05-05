// Alerts — active list + history charts
import { useEffect, useState, useMemo } from 'react';
import { api } from '../api/client';
import { getSocket } from '../api/socket';

// ── Tiny bar chart (no external deps) ─────────────────────────────
const CW = 300, CH = 100;
const PAD = { top: 8, right: 12, bottom: 24, left: 28 };
const IX0 = PAD.left, IX1 = CW - PAD.right;
const IY0 = PAD.top,  IY1 = CH - PAD.bottom;
const ICW = IX1 - IX0, ICH = IY1 - IY0;

function AlertBarChart({ data, color = '#ef4444' }) {
  if (!data || data.length === 0)
    return <p className="text-xs text-slate-300 text-center py-4">Sin datos</p>;

  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const toY = (v) => IY1 - (v / maxVal) * ICH;
  const gridVals = [0, Math.ceil(maxVal / 2), maxVal];
  const barGap = ICW / data.length;
  const barW = barGap * 0.65;

  return (
    <svg viewBox={`0 0 ${CW} ${CH}`} className="w-full" aria-hidden>
      {/* grid */}
      {gridVals.map((v, i) => {
        const y = toY(v);
        return (
          <g key={i}>
            <line x1={IX0} y1={y} x2={IX1} y2={y} stroke="#e2e8f0" strokeWidth="1" />
            <text x={IX0 - 4} y={y + 3.5} fontSize="8" fill="#94a3b8" textAnchor="end">{v}</text>
          </g>
        );
      })}
      {/* axes */}
      <line x1={IX0} y1={IY0} x2={IX0} y2={IY1} stroke="#cbd5e1" strokeWidth="1" />
      <line x1={IX0} y1={IY1} x2={IX1} y2={IY1} stroke="#cbd5e1" strokeWidth="1" />
      {/* bars */}
      {data.map(({ label, value }, i) => {
        const x = IX0 + i * barGap + (barGap - barW) / 2;
        const barTop = toY(value);
        return (
          <g key={i}>
            <rect x={x} y={barTop} width={barW} height={IY1 - barTop}
              fill={color} fillOpacity={value > 0 ? '0.8' : '0.15'} rx="2" />
            <text x={x + barW / 2} y={CH - 4} fontSize="8" fill="#94a3b8" textAnchor="middle">{label}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Aggregation helpers ────────────────────────────────────────────
function groupBy(alerts, getKey, allKeys) {
  const counts = {};
  allKeys.forEach((k) => { counts[k] = 0; });
  alerts.forEach((a) => {
    const k = getKey(a);
    if (counts[k] !== undefined) counts[k]++;
  });
  return allKeys.map((k) => ({ label: k, value: counts[k] }));
}

const HOUR_KEYS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
const DAY_KEYS = [0, 1, 2, 3, 4, 5, 6];

function byHour(alerts) {
  return groupBy(
    alerts,
    (a) => String(new Date(a.recordedAt).getHours()).padStart(2, '0'),
    HOUR_KEYS,
  ).filter((_, i) => i % 2 === 0 || alerts.some(
    (a) => String(new Date(a.recordedAt).getHours()).padStart(2, '0') === HOUR_KEYS[i]
  )); // show all 24 hours condensed
}

function byDay(alerts) {
  return groupBy(
    alerts,
    (a) => new Date(a.recordedAt).getDay(),
    DAY_KEYS,
  ).map((b) => ({ label: DAY_NAMES[b.label], value: b.value }));
}

// ── Alert card ─────────────────────────────────────────────────────
const TYPE_LABEL = { TEMP: 'Temperatura', HUM: 'Humedad' };
const SEVERITY_COLOR = {
  INFO: 'text-blue-600', WARNING: 'text-amber-600', CRITICAL: 'text-red-600',
};

function AlertCard({ alert: a, onAck }) {
  return (
    <li className="card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={`text-xs uppercase tracking-wide font-semibold ${SEVERITY_COLOR[a.severity] || 'text-red-600'}`}>
            {TYPE_LABEL[a.type] || a.type} · {a.severity}
          </p>
          <p className="text-sm text-slate-800">{a.message}</p>
          <p className="text-xs text-slate-400 mt-1">
            Caja {a.box?.code || a.boxId} ·{' '}
            {new Date(a.recordedAt).toLocaleString('es-MX', {
              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
            })}
          </p>
        </div>
        {onAck && (
          <button className="btn-secondary text-xs shrink-0" onClick={() => onAck(a.id)}>
            Atender
          </button>
        )}
      </div>
    </li>
  );
}

// ── Main page ──────────────────────────────────────────────────────
const HISTORY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days for history tab

export default function Alerts() {
  const [tab, setTab] = useState('activas'); // 'activas' | 'historial'
  const [active, setActive] = useState([]);
  const [history, setHistory] = useState([]);
  const [loadingActive, setLoadingActive] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  // Active alerts on mount + socket
  useEffect(() => {
    api.get('/api/alerts?onlyActive=true')
      .then(setActive)
      .finally(() => setLoadingActive(false));

    const socket = getSocket();
    const onNew = (a) => {
      setActive((prev) => [a, ...prev]);
      // invalidate history so it reloads next time
      setHistoryLoaded(false);
    };
    socket.on('alert:new', onNew);
    return () => socket.off('alert:new', onNew);
  }, []);

  // Load history lazily when tab is opened
  useEffect(() => {
    if (tab !== 'historial' || historyLoaded) return;
    setLoadingHistory(true);
    const since = new Date(Date.now() - HISTORY_MS).toISOString();
    api.get(`/api/alerts?limit=1000&since=${since}`)
      .then((data) => { setHistory(data); setHistoryLoaded(true); })
      .finally(() => setLoadingHistory(false));
  }, [tab, historyLoaded]);

  async function ack(id) {
    await api.post(`/api/alerts/${id}/ack`);
    setActive((prev) => prev.filter((a) => a.id !== id));
    setHistoryLoaded(false);
  }

  const hourData = useMemo(() => byHour(history), [history]);
  const dayData  = useMemo(() => byDay(history),  [history]);
  const tempCount = useMemo(() => history.filter((a) => a.type === 'TEMP').length, [history]);
  const humCount  = useMemo(() => history.filter((a) => a.type === 'HUM').length,  [history]);

  return (
    <div className="space-y-3 pb-4">
      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
        {[{ key: 'activas', label: 'Activas' }, { key: 'historial', label: 'Historial (7 dias)' }].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              tab === t.key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
            {t.key === 'activas' && active.length > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold">
                {active.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Activas ── */}
      {tab === 'activas' && (
        <>
          {loadingActive && <p className="text-sm text-slate-500 text-center py-6">Cargando...</p>}
          {!loadingActive && active.length === 0 && (
            <div className="card text-center py-10">
              <p className="text-sm text-slate-500">Sin alertas activas</p>
            </div>
          )}
          {!loadingActive && active.length > 0 && (
            <ul className="space-y-2">
              {active.map((a) => <AlertCard key={a.id} alert={a} onAck={ack} />)}
            </ul>
          )}
        </>
      )}

      {/* ── Historial ── */}
      {tab === 'historial' && (
        <>
          {loadingHistory && <p className="text-sm text-slate-500 text-center py-6">Cargando historial...</p>}

          {!loadingHistory && (
            <>
              {/* Summary chips */}
              <div className="grid grid-cols-3 gap-2">
                <div className="card text-center py-3">
                  <p className="text-2xl font-black text-slate-800">{history.length}</p>
                  <p className="text-[10px] text-slate-400 uppercase font-bold mt-0.5">Total</p>
                </div>
                <div className="card text-center py-3">
                  <p className="text-2xl font-black text-red-500">{tempCount}</p>
                  <p className="text-[10px] text-slate-400 uppercase font-bold mt-0.5">Temp</p>
                </div>
                <div className="card text-center py-3">
                  <p className="text-2xl font-black text-amber-500">{humCount}</p>
                  <p className="text-[10px] text-slate-400 uppercase font-bold mt-0.5">Hum</p>
                </div>
              </div>

              {history.length === 0 ? (
                <div className="card text-center py-8">
                  <p className="text-sm text-slate-400">Sin alertas en los ultimos 7 dias.</p>
                </div>
              ) : (
                <>
                  {/* By hour */}
                  <div className="card space-y-2">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Por hora del dia</p>
                    <AlertBarChart data={hourData} color="#ef4444" />
                  </div>

                  {/* By day of week */}
                  <div className="card space-y-2">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Por dia de la semana</p>
                    <AlertBarChart data={dayData} color="#f97316" />
                  </div>

                  {/* Recent list */}
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-400 uppercase px-1">Ultimas 20 alertas</p>
                    <ul className="space-y-2">
                      {history.slice(0, 20).map((a) => (
                        <AlertCard key={a.id} alert={a} onAck={null} />
                      ))}
                    </ul>
                  </div>
                </>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
