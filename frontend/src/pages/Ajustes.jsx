// Settings page — shows profile info, no real editing in POC
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

const ROLE_LABEL = { USER: 'Operador', ROOT: 'Administrador' };

export default function Ajustes() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const fullName =
    user?.firstName || user?.lastName
      ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim()
      : user?.username ?? '—';

  const fields = [
    { label: 'Nombre completo', value: fullName },
    { label: 'Usuario', value: user?.username },
    { label: 'Rol', value: ROLE_LABEL[user?.role] ?? user?.role },
    { label: 'Puesto', value: user?.position ?? '—' },
    { label: 'Teléfono', value: user?.phone ?? '—' },
    { label: 'Edad', value: user?.age != null ? `${user.age} años` : '—' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={() => navigate(-1)} className="text-slate-500 hover:text-slate-800">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <h1 className="text-base font-semibold text-slate-800">Ajustes</h1>
      </div>

      {/* Avatar placeholder */}
      <div className="card flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-brand-600 flex items-center justify-center text-white text-xl font-bold shrink-0">
          {(user?.firstName?.[0] ?? user?.username?.[0] ?? '?').toUpperCase()}
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-800">{fullName}</p>
          <p className="text-xs text-slate-500">{user?.username}</p>
        </div>
      </div>

      {/* Profile fields */}
      <section className="card p-0 divide-y divide-slate-100">
        <p className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Perfil</p>
        {fields.map((f) => (
          <div key={f.label} className="flex justify-between items-center px-4 py-3">
            <span className="text-sm text-slate-500">{f.label}</span>
            <span className="text-sm font-medium text-slate-800">{f.value}</span>
          </div>
        ))}
      </section>

      {/* Notification prefs (dummy) */}
      <section className="card p-0 divide-y divide-slate-100">
        <p className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Notificaciones</p>
        {[
          { label: 'Alertas de temperatura', on: true },
          { label: 'Alertas de humedad', on: true },
          { label: 'Inicio de ruta', on: false },
          { label: 'Fin de ruta', on: true },
        ].map((n) => (
          <div key={n.label} className="flex justify-between items-center px-4 py-3">
            <span className="text-sm text-slate-700">{n.label}</span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${n.on ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
              {n.on ? 'Activo' : 'Inactivo'}
            </span>
          </div>
        ))}
      </section>

      <p className="text-center text-xs text-slate-400">Edición de perfil no disponible en esta versión</p>
    </div>
  );
}
