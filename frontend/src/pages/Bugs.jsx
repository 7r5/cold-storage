// Bug report page — submit bugs and view the open list
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';

const STATUS_LABEL = { OPEN: 'Abierto', IN_PROGRESS: 'En progreso', CLOSED: 'Cerrado' };
const STATUS_COLOR = {
  OPEN: 'bg-red-100 text-red-700',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
  CLOSED: 'bg-slate-100 text-slate-500',
};

const LOCATIONS = [
  'Inicio',
  'Monitores',
  'Inventario',
  'Alertas',
  'Rutas',
  'Nueva ruta',
  'Detalle de camión',
  'Ajustes',
  'Ayuda',
  'Acerca de',
  'Documentación',
  'Panel de simulación',
  'Otro',
];

const EMPTY = { title: '', location: '', expected: '', actual: '' };

export default function Bugs() {
  const navigate = useNavigate();
  const [bugs, setBugs] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [tab, setTab] = useState('list'); // 'list' | 'new'
  const [updatingId, setUpdatingId] = useState(null);

  async function load() {
    const data = await api.get('/api/bugs').catch(() => []);
    setBugs(data);
  }

  useEffect(() => { load(); }, []);

  function setField(key, val) {
    setForm((prev) => ({ ...prev, [key]: val }));
    setFormError(null);
    setSuccess(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim() || !form.location || !form.expected.trim() || !form.actual.trim()) {
      setFormError('Todos los campos son obligatorios');
      return;
    }
    setSending(true);
    setFormError(null);
    try {
      await api.post('/api/bugs', form);
      setForm(EMPTY);
      setSuccess(true);
      await load();
      setTab('list');
    } catch (e) {
      setFormError(e.message ?? 'Error al enviar');
    } finally {
      setSending(false);
    }
  }

  async function handleStatusChange(bug, status) {
    setUpdatingId(bug.id);
    try {
      await api.patch(`/api/bugs/${bug.id}/status`, { status });
      await load();
    } catch {
      // silent
    } finally {
      setUpdatingId(null);
    }
  }

  const openBugs = bugs.filter((b) => b.status !== 'CLOSED');
  const closedBugs = bugs.filter((b) => b.status === 'CLOSED');

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="text-slate-500 hover:text-slate-800">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button>
          <h1 className="text-base font-semibold text-slate-800">Reporte de bugs</h1>
        </div>
        {openBugs.length > 0 && (
          <span className="text-xs font-medium bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
            {openBugs.length} abierto{openBugs.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
        {[{ key: 'list', label: 'Lista de bugs' }, { key: 'new', label: '+ Reportar bug' }].map((t) => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setSuccess(false); setFormError(null); }}
            className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              tab === t.key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* New bug form */}
      {tab === 'new' && (
        <form onSubmit={handleSubmit} className="card space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Título del bug</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setField('title', e.target.value)}
              placeholder="Ej. El mapa se queda en blanco al cambiar de pestaña"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Ubicación (pantalla o sección)</label>
            <select
              value={form.location}
              onChange={(e) => setField('location', e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Seleccionar...</option>
              {LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Comportamiento esperado</label>
            <textarea
              rows={2}
              value={form.expected}
              onChange={(e) => setField('expected', e.target.value)}
              placeholder="¿Qué debería pasar?"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Comportamiento actual (el bug)</label>
            <textarea
              rows={2}
              value={form.actual}
              onChange={(e) => setField('actual', e.target.value)}
              placeholder="¿Qué pasó en realidad?"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {formError && <p className="text-xs text-red-500">{formError}</p>}
          {success && <p className="text-xs text-green-600 font-medium">Bug reportado correctamente.</p>}

          <button
            type="submit"
            disabled={sending}
            className="btn-primary w-full disabled:opacity-50"
          >
            {sending ? 'Enviando...' : 'Enviar reporte'}
          </button>
        </form>
      )}

      {/* Bug list */}
      {tab === 'list' && (
        <div className="space-y-3">
          {bugs.length === 0 && (
            <div className="card text-center py-8 text-slate-400 text-sm">
              No hay bugs reportados.
            </div>
          )}

          {openBugs.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide px-1">Abiertos / En progreso</p>
              {openBugs.map((b) => <BugCard key={b.id} bug={b} onStatusChange={handleStatusChange} loading={updatingId === b.id} />)}
            </div>
          )}

          {closedBugs.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide px-1">Cerrados</p>
              {closedBugs.map((b) => <BugCard key={b.id} bug={b} onStatusChange={handleStatusChange} loading={updatingId === b.id} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function BugCard({ bug, onStatusChange, loading }) {
  const [expanded, setExpanded] = useState(false);
  const date = new Date(bug.createdAt).toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

  return (
    <div className="card p-0">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-start justify-between gap-3 px-4 py-3 text-left"
      >
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-800 truncate">{bug.title}</p>
          <p className="text-xs text-slate-400 mt-0.5">{bug.location} · {date}{bug.reportedBy ? ` · @${bug.reportedBy}` : ''}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLOR[bug.status]}`}>
            {STATUS_LABEL[bug.status]}
          </span>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            className={`text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`} aria-hidden>
            <path d="M6 9l6 6 6-6"/>
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-slate-100 px-4 py-3 space-y-3">
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-0.5">Esperado</p>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{bug.expected}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-0.5">Actual (bug)</p>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{bug.actual}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {['OPEN', 'IN_PROGRESS', 'CLOSED'].filter((s) => s !== bug.status).map((s) => (
              <button
                key={s}
                disabled={loading}
                onClick={() => onStatusChange(bug, s)}
                className={`text-xs font-medium px-3 py-1 rounded-lg border transition-colors disabled:opacity-50 ${STATUS_COLOR[s]} border-transparent`}
              >
                {loading ? '...' : `Marcar como ${STATUS_LABEL[s]}`}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
