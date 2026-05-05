// "Más" menu: settings, help, logout, and (root only) simulator panel link
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

const ROLE_LABEL = { USER: 'Operador', ROOT: 'Administrador' };

export default function More() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

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
    { label: 'Ajustes', to: '/ajustes', desc: 'Perfil y preferencias de la cuenta' },
    { label: '¿Necesitas ayuda?', to: '/ayuda', desc: 'Preguntas frecuentes y soporte' },
    { label: 'Acerca de', to: '/acerca-de', desc: 'Versión, stack y licencias' },
  ];

  return (
    <div className="space-y-4">
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

        <li>
          <button
            onClick={handleLogout}
            className="block w-full text-left px-4 py-3 hover:bg-slate-50"
          >
            <p className="text-sm text-red-600 font-medium">Cerrar sesión</p>
          </button>
        </li>
      </ul>
    </div>
  );
}
