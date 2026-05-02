// "Más" menu: settings, help, logout, and (root only) simulator panel link
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function More() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  const items = [
    { label: 'Ajustes', to: '#', desc: 'Preferencias de la cuenta' },
    { label: '¿Necesitas ayuda?', to: '#', desc: 'Contacto y soporte' },
    { label: 'Acerca de', to: '#', desc: 'Versión y créditos' },
  ];

  return (
    <div className="space-y-4">
      <section className="card">
        <p className="text-xs text-slate-500">Sesión</p>
        <p className="text-sm font-medium text-slate-800">
          {user?.username} <span className="text-xs text-slate-400">({user?.role})</span>
        </p>
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
