// Bottom navigation bar (mobile-first, 5 items) — minimalist SVG icons
import { NavLink } from 'react-router-dom';

// Inline SVG icons (24px viewBox, stroke-based, minimalist)
const IconHome = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9.5z"/>
    <path d="M9 21V12h6v9"/>
  </svg>
);

const IconMonitor = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <rect x="2" y="3" width="20" height="14" rx="2"/>
    <path d="M8 21h8M12 17v4"/>
    <path d="M7 8l3 3 2-2 3 3"/>
  </svg>
);

const IconInventory = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
    <path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12"/>
  </svg>
);

const IconAlerts = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
  </svg>
);

const IconMore = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <circle cx="12" cy="5" r="1" fill="currentColor"/>
    <circle cx="12" cy="12" r="1" fill="currentColor"/>
    <circle cx="12" cy="19" r="1" fill="currentColor"/>
  </svg>
);

const items = [
  { to: '/', label: 'Inicio',     Icon: IconHome },
  { to: '/monitores', label: 'Monitores', Icon: IconMonitor },
  { to: '/inventario', label: 'Inventario', Icon: IconInventory },
  { to: '/alertas', label: 'Alertas',   Icon: IconAlerts },
  { to: '/mas', label: 'Más',       Icon: IconMore },
];

export default function BottomNav() {
  return (
    <nav
      aria-label="Navegación principal"
      className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-100
                 pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="grid grid-cols-5">
        {items.map(({ to, label, Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `relative flex flex-col items-center gap-1 py-2 text-[10px] font-medium transition-colors ${
                  isActive ? 'text-brand-600' : 'text-slate-400 hover:text-slate-600'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {/* Active pill indicator */}
                  {isActive && (
                    <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-brand-500" aria-hidden />
                  )}
                  <Icon />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
