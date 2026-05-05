// About page
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

export default function AcercaDe() {
  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={() => navigate(-1)} className="text-slate-500 hover:text-slate-800">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <h1 className="text-base font-semibold text-slate-800">Acerca de</h1>
      </div>

      {/* App identity */}
      <div className="card flex flex-col items-center gap-2 py-6 text-center">
        <img src="/logo.jpeg" alt="ColdTrack logo" className="w-40 h-auto" />
        <p className="text-xs text-slate-500">Versión 0.1.0-poc</p>
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
    </div>
  );
}
