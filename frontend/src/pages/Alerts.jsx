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

function AlertBarChart({ data, color = '#2563eb' }) {
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

// Local date string YYYY-MM-DD
function localDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Today's hours from 00 up to current hour
function byHourToday(alerts) {
  const now = new Date();
  const todayStr = localDateStr(now);
  const currentHour = now.getHours();
  const keys = Array.from({ length: currentHour + 1 }, (_, i) => String(i).padStart(2, '0'));
  const todayAlerts = alerts.filter((a) => localDateStr(new Date(a.recordedAt)) === todayStr);
  return groupBy(
    todayAlerts,
    (a) => String(new Date(a.recordedAt).getHours()).padStart(2, '0'),
    keys,
  );
}

// Today + last 7 calendar days with real date labels
function byDate(alerts) {
  const days = [];
  for (let i = 7; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = localDateStr(d);
    const label = i === 0
      ? 'Hoy'
      : d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }).replace(/\./g, '');
    days.push({ dateStr, label });
  }
  const counts = {};
  days.forEach(({ dateStr }) => { counts[dateStr] = 0; });
  alerts.forEach((a) => {
    const dateStr = localDateStr(new Date(a.recordedAt));
    if (counts[dateStr] !== undefined) counts[dateStr]++;
  });
  return days.map(({ dateStr, label }) => ({ label, value: counts[dateStr] }));
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
    // start of day 7 days ago → covers today + last 7 full days
    const _since = new Date(); _since.setDate(_since.getDate() - 7); _since.setHours(0, 0, 0, 0);
    const since = _since.toISOString();
    api.get(`/api/alerts?limit=1000&since=${since}`)
      .then((data) => { setHistory(data); setHistoryLoaded(true); })
      .finally(() => setLoadingHistory(false));
  }, [tab, historyLoaded]);

  async function ack(id) {
    await api.post(`/api/alerts/${id}/ack`);
    setActive((prev) => prev.filter((a) => a.id !== id));
    setHistoryLoaded(false);
  }

  const hourData = useMemo(() => byHourToday(history), [history]);
  const dateData = useMemo(() => byDate(history), [history]);
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
                  <p className="text-2xl font-black text-violet-600">{tempCount}</p>
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
                  {/* By hour — today only */}
                  <div className="card space-y-2">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Hoy por hora (00:00 – ahora)</p>
                    <AlertBarChart data={hourData} color="#2563eb" />
                  </div>

                  {/* By date — today + last 7 days */}
                  <div className="card space-y-2">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Hoy + ultimos 7 dias</p>
                    <AlertBarChart data={dateData} color="#0891b2" />
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
