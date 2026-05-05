// About page
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const STACK = [
  { layer: 'Frontend', tech: 'React 18 + Vite 5 + Tailwind CSS 3' },
  { layer: 'Mapas', tech: 'Leaflet 1.9 + React-Leaflet 4' },
  { layer: 'Backend', tech: 'Node.js + Express 4' },
  { layer: 'Base de datos', tech: 'PostgreSQL vía Prisma 5' },
  { layer: 'Tiempo real', tech: 'Socket.IO 4' },
  { layer: 'Deploy', tech: 'Render.com (free tier)' },
  { layer: 'Geocodificación', tech: 'Nominatim (OpenStreetMap)' },
  { layer: 'Ruteo', tech: 'OSRM (Project OSRM)' },
];

// Injected at build time from CHANGELOG.md by vite.config.js
const CHANGELOG = __CHANGELOG__;

export default function AcercaDe() {

function ChangelogEntry({ entry }) {
  const [open, setOpen] = useState(entry.version === 'Unreleased');
  const isUnreleased = entry.version === 'Unreleased';
  return (
    <li className="border-b border-slate-100 last:border-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2">
          <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${isUnreleased ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-50 text-blue-700'}`}>
            {isUnreleased ? 'Unreleased' : `v${entry.version}`}
          </span>
          <span className="text-xs text-slate-400">{entry.date}</span>
        </span>
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden>
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>
      {open && (
        <div className="px-4 pb-3 space-y-2">
          {entry.added?.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-green-600 uppercase tracking-widest mb-1">Agregado</p>
              <ul className="space-y-0.5">
                {entry.added.map((item) => (
                  <li key={item} className="text-xs text-slate-600 flex gap-1.5">
                    <span className="text-green-500 shrink-0">+</span>{item}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {entry.fixed?.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1">Corregido</p>
              <ul className="space-y-0.5">
                {entry.fixed.map((item) => (
                  <li key={item} className="text-xs text-slate-600 flex gap-1.5">
                    <span className="text-blue-500 shrink-0">~</span>{item}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={() => navigate(-1)} aria-label="Volver" className="flex items-center gap-2 text-slate-500 hover:text-slate-800">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M15 18l-6-6 6-6"/>
          </svg>
          <span className="text-base font-semibold text-slate-800">Acerca de</span>
        </button>
      </div>

      {/* App identity */}
      <div className="card flex flex-col items-center gap-2 py-6 text-center">
        <img src="/logo.jpeg" alt="ColdTrack logo" className="w-40 h-auto" />
        <p className="text-xs text-slate-500">Versión {__APP_VERSION__}</p>
        <span className="text-xs bg-yellow-100 text-yellow-700 font-medium px-2 py-0.5 rounded-full">
          Proof of Concept
        </span>
      </div>

      {/* Description */}
      <section className="card space-y-2">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Descripción</p>
        <p className="text-sm text-slate-700 leading-relaxed">
          Sistema de monitoreo de cadena de frío para transporte de productos farmacéuticos. Permite rastrear camiones en tiempo real, monitorear temperatura y humedad de las cajas refrigeradas, y generar alertas cuando los parámetros están fuera de rango.
        </p>
      </section>

      {/* Stack */}
      <section className="card p-0">
        <p className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-100">Stack tecnológico</p>
        <ul className="divide-y divide-slate-100">
          {STACK.map((s) => (
            <li key={s.layer} className="flex justify-between items-center px-4 py-3">
              <span className="text-sm text-slate-500">{s.layer}</span>
              <span className="text-sm font-medium text-slate-800 text-right">{s.tech}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Licenses */}
      <section className="card space-y-1">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Licencias de datos</p>
        <p className="text-xs text-slate-600">
          Datos cartográficos © <a href="https://www.openstreetmap.org/copyright" className="text-brand-600 underline" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a> (ODbL)
        </p>
        <p className="text-xs text-slate-600">
          Ruteo: <a href="https://project-osrm.org" className="text-brand-600 underline" target="_blank" rel="noopener noreferrer">OSRM</a> — BSD 2-Clause
        </p>
      </section>

      {/* Changelog */}
      <section className="card p-0">
        <p className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-100">Changelog</p>
        <ul>
          {CHANGELOG.map((entry) => (
            <ChangelogEntry key={entry.version} entry={entry} />
          ))}
        </ul>
      </section>

      {/* Credits */}
      <section className="card flex flex-col items-center gap-1 py-4 text-center">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Desarrollado por</p>
        <p className="text-sm font-black text-slate-800">7r5 Studios</p>
        <a
          href="https://github.com/7r5/cold-storage"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-800 underline mt-1"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577v-2.165c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.63-5.37-12-12-12z"/>
          </svg>
          github.com/7r5/cold-storage
        </a>
      </section>
    </div>
  );
}
