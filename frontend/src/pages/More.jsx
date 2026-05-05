// "Más" menu: settings, help, logout, and (root only) simulator panel link
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';

const ROLE_LABEL = { USER: 'Operador', ROOT: 'Administrador' };

export default function More() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [confirmLogout, setConfirmLogout] = useState(false);

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  const fullName =
    user?.firstName || user?.lastName
      ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim()
      : user?.username ?? '—';

  const items = [
    { label: 'Rutas', to: '/rutas', desc: 'Registrar y administrar rutas' },
    { label: 'Documentación', to: '/documentacion', desc: 'Entidades, relaciones y guía técnica' },
    { label: 'Reporte de bugs', to: '/bugs', desc: 'Reportar y ver errores conocidos' },
    { label: 'Ajustes', to: '/ajustes', desc: 'Perfil y preferencias de la cuenta' },
    { label: '¿Necesitas ayuda?', to: '/ayuda', desc: 'Preguntas frecuentes y soporte' },
    { label: 'Acerca de', to: '/acerca-de', desc: 'Versión, stack y licencias' },
  ];

  return (
    <div className="space-y-4">
      {/* User card */}
      <section className="card flex items-center gap-3">
        <div className="w-11 h-11 rounded-full bg-brand-600 flex items-center justify-center text-white text-lg font-bold shrink-0">
          {(user?.firstName?.[0] ?? user?.username?.[0] ?? '?').toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-800 truncate">{fullName}</p>
          <p className="text-xs text-slate-500 truncate">
            @{user?.username ?? '—'} · {ROLE_LABEL[user?.role] ?? user?.role}
          </p>
          {user?.position && (
            <p className="text-xs text-slate-400 truncate">{user.position}</p>
          )}
        </div>
      </section>

      {/* Nav items */}
      <ul className="card divide-y divide-slate-100 p-0">
        {items.map((it) => (
          <li key={it.label}>
            <Link to={it.to} className="block px-4 py-3 hover:bg-slate-50">
              <p className="text-sm text-slate-800">{it.label}</p>
              <p className="text-xs text-slate-500">{it.desc}</p>
            </Link>
          </li>
        ))}

        {user?.role === 'ROOT' && (
          <li>
            <Link to="/root" className="block px-4 py-3 hover:bg-slate-50">
              <p className="text-sm text-brand-700 font-medium">Panel de simulación</p>
              <p className="text-xs text-slate-500">Solo administradores</p>
            </Link>
          </li>
        )}
      </ul>

      {/* Version + logout — separated from main nav */}
      <div className="space-y-2">
        <p className="text-center text-xs text-slate-400">Cold Chain Control v{__APP_VERSION__}</p>

        <button
          onClick={() => setConfirmLogout(true)}
          className="w-full card py-3 text-sm text-red-600 font-medium text-center hover:bg-red-50 transition-colors"
        >
          Cerrar sesión
        </button>
      </div>

      {/* Logout confirmation dialog */}
      {confirmLogout && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-xl">
            <p className="text-base font-semibold text-slate-800 text-center">¿Cerrar sesión?</p>
            <p className="text-sm text-slate-500 text-center">
              Se cerrará tu sesión en este dispositivo.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmLogout(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-sm font-medium text-white hover:bg-red-700"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
