// Bottom navigation bar (mobile-first, 5 items)
import { NavLink } from 'react-router-dom';

const items = [
  { to: '/', label: 'Inicio', icon: '🏠' },
  { to: '/monitores', label: 'Monitores', icon: '📡' },
  { to: '/inventario', label: 'Inventario', icon: '📦' },
  { to: '/alertas', label: 'Alertas', icon: '🔔' },
  { to: '/mas', label: 'Más', icon: '☰' },
];

export default function BottomNav() {
  return (
    <nav
      aria-label="Navegación principal"
      className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200
                 pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="grid grid-cols-5">
        {items.map((it) => (
          <li key={it.to}>
            <NavLink
              to={it.to}
              end={it.to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 py-2 text-xs ${
                  isActive ? 'text-brand-600 font-medium' : 'text-slate-500'
                }`
              }
            >
              <span aria-hidden className="text-lg leading-none">{it.icon}</span>
              <span>{it.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
