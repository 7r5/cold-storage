// Help / FAQ page
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

const FAQS = [
  {
    q: '¿Cómo inicio una simulación de ruta?',
    a: 'Ve a "Más → Panel de simulación" (solo administradores), selecciona una ruta de la lista y presiona "Simular ruta". La posición del camión se actualizará en tiempo real en la pantalla de Monitores.',
  },
  {
    q: '¿Qué significan las alertas de temperatura?',
    a: 'Cada caja tiene un rango de temperatura objetivo (por ejemplo -20 °C a -18 °C). Cuando el sensor detecta una lectura fuera de ese rango, se genera una alerta de tipo TEMP con severidad WARNING o CRITICAL.',
  },
  {
    q: '¿Cómo creo una nueva ruta?',
    a: 'Ve a "Más → Rutas → Nueva ruta". Escribe el nombre del origen y destino, presiona "Calcular ruta por carretera" para trazar la ruta automáticamente usando OpenStreetMap, y luego guárdala asignándola a un camión.',
  },
  {
    q: '¿Qué es una "caja" (box)?',
    a: 'Una caja es el contenedor refrigerado montado sobre el camión donde viajan los productos farmacéuticos. Cada caja tiene sensores de temperatura y humedad, y umbrales configurados para generar alertas.',
  },
  {
    q: '¿Puedo simular varias rutas al mismo tiempo?',
    a: 'Sí. El simulador puede correr múltiples rutas en paralelo. Cada una se muestra como una polilínea independiente en el mapa de Monitores.',
  },
  {
    q: '¿Los datos son reales?',
    a: 'No. Esta es una aplicación de demostración (POC). Las posiciones GPS, lecturas de sensores y alertas son generadas por un simulador en el servidor. No hay hardware real conectado.',
  },
  {
    q: '¿Qué es una sucursal (branch)?',
    a: 'Una sucursal representa un punto físico de la cadena de frío: almacén, farmacia, hospital o centro de distribución. Las rutas tienen una sucursal de origen y una de destino para tener trazabilidad completa.',
  },
  {
    q: '¿Cómo se reconoce una alerta?',
    a: 'En la pantalla de Alertas, presiona el botón "Reconocer" junto a la alerta. Esto la marca como resuelta y deja de aparecer en los contadores activos.',
  },
];

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="border-b border-slate-100 last:border-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex justify-between items-start gap-3 px-4 py-3 text-left"
      >
        <span className="text-sm text-slate-800 font-medium">{q}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          className={`shrink-0 mt-0.5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden
        >
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>
      {open && <p className="px-4 pb-3 text-sm text-slate-600 leading-relaxed">{a}</p>}
    </li>
  );
}

export default function Ayuda() {
  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={() => navigate(-1)} aria-label="Volver" className="flex items-center gap-2 text-slate-500 hover:text-slate-800">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M15 18l-6-6 6-6"/>
          </svg>
          <span className="text-base font-semibold text-slate-800">Ayuda</span>
        </button>
      </div>

      <div className="card p-4 flex gap-3 items-start bg-blue-50 border-blue-100">
        <span className="text-2xl" aria-hidden>💡</span>
        <p className="text-sm text-blue-800">
          Cold Chain Control es un sistema de monitoreo de cadena de frío para productos farmacéuticos. Consulta las preguntas frecuentes a continuación.
        </p>
      </div>

      <section className="card p-0">
        <p className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-100">Preguntas frecuentes</p>
        <ul>
          {FAQS.map((f) => <FaqItem key={f.q} {...f} />)}
        </ul>
      </section>

      <section className="card text-center space-y-1 py-5">
        <p className="text-sm font-medium text-slate-700">¿Necesitas más ayuda?</p>
        <p className="text-xs text-slate-500">Contacta al equipo técnico en soporte@coldchain.mx</p>
      </section>
    </div>
  );
}
