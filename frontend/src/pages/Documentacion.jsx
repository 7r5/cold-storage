// Documentation page — entity reference, relationships, and project overview
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

function Section({ title, children }) {
  const [open, setOpen] = useState(true);
  return (
    <section className="card p-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex justify-between items-center px-4 py-3 text-left border-b border-slate-100"
      >
        <span className="text-sm font-semibold text-slate-800">{title}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden
        >
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>
      {open && <div className="px-4 py-3 space-y-3">{children}</div>}
    </section>
  );
}

function Field({ name, type, required, desc }) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-0.5 items-baseline py-1 border-b border-slate-50 last:border-0">
      <code className="text-xs font-mono font-semibold text-brand-700 bg-brand-50 px-1 py-0.5 rounded">{name}</code>
      <span className="text-xs text-slate-400 font-mono">{type}</span>
      {required && <span className="text-xs text-red-500 font-medium">requerido</span>}
      <span className="text-xs text-slate-600 flex-1">{desc}</span>
    </div>
  );
}

function Rel({ from, to, desc }) {
  return (
    <p className="text-xs text-slate-700">
      <span className="font-semibold text-slate-800">{from}</span>
      <span className="text-slate-400 mx-1">→</span>
      <span className="font-semibold text-slate-800">{to}</span>
      <span className="text-slate-500"> — {desc}</span>
    </p>
  );
}

export default function Documentacion() {
  const navigate = useNavigate();

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center gap-2">
        <button onClick={() => navigate(-1)} aria-label="Volver" className="flex items-center gap-2 text-slate-500 hover:text-slate-800">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M15 18l-6-6 6-6"/>
          </svg>
          <span className="text-base font-semibold text-slate-800">Documentación</span>
        </button>
      </div>

      {/* Overview */}
      <div className="card bg-blue-50 border-blue-100 space-y-1">
        <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Descripción general</p>
        <p className="text-sm text-blue-900 leading-relaxed">
          Cold Chain Control modela la cadena de frío farmacéutica: camiones refrigerados transportan productos
          entre sucursales. Cada camión tiene cajas con sensores. Una ruta activa genera lecturas de temperatura/humedad
          en tiempo real y crea alertas cuando los valores salen del rango objetivo.
        </p>
      </div>

      {/* Entities */}
      <Section title="Entidades — User (Usuario)">
        <p className="text-xs text-slate-500">Usuario del sistema. La autenticación usa tokens simples (POC).</p>
        <div className="space-y-0.5">
          <Field name="id" type="Int" desc="Identificador único autoincremental." />
          <Field name="username" type="String" required desc="Nombre de usuario único para login." />
          <Field name="password" type="String" required desc="Contraseña en texto plano (solo POC)." />
          <Field name="role" type="Role" required desc="USER (operador) o ROOT (administrador con acceso al simulador)." />
          <Field name="firstName" type="String?" desc="Nombre(s) del usuario." />
          <Field name="lastName" type="String?" desc="Apellidos del usuario." />
          <Field name="phone" type="String?" desc="Teléfono de contacto." />
          <Field name="age" type="Int?" desc="Edad en años." />
          <Field name="position" type="String?" desc="Puesto o cargo dentro de la organización." />
        </div>
      </Section>

      <Section title="Entidades — Truck (Camión)">
        <p className="text-xs text-slate-500">Vehículo refrigerado. Tiene cajas montadas y puede tener rutas asignadas.</p>
        <div className="space-y-0.5">
          <Field name="id" type="Int" desc="Identificador único." />
          <Field name="plate" type="String" required desc="Placa del vehículo — única en el sistema." />
          <Field name="model" type="String" required desc="Modelo del camión (ej. Volvo FH16)." />
          <Field name="driverName" type="String" required desc="Nombre del conductor asignado." />
          <Field name="status" type="TruckStatus" desc="IDLE, ON_ROUTE o MAINTENANCE. Se actualiza automáticamente al iniciar/terminar simulación." />
        </div>
      </Section>

      <Section title="Entidades — Box (Caja)">
        <p className="text-xs text-slate-500">Contenedor refrigerado montado en un camión. Es la unidad de monitoreo de sensores.</p>
        <div className="space-y-0.5">
          <Field name="id" type="Int" desc="Identificador único." />
          <Field name="code" type="String" required desc="Código identificador único (ej. UKG-001-B1)." />
          <Field name="truckId" type="Int" required desc="FK al camión que porta esta caja." />
          <Field name="targetTempMin" type="Float" required desc="Temperatura mínima aceptable (°C). Debajo = alerta TEMP." />
          <Field name="targetTempMax" type="Float" required desc="Temperatura máxima aceptable (°C). Arriba = alerta TEMP." />
          <Field name="targetHumMin" type="Float" required desc="Humedad relativa mínima aceptable (%). Debajo = alerta HUM." />
          <Field name="targetHumMax" type="Float" required desc="Humedad relativa máxima aceptable (%). Arriba = alerta HUM." />
        </div>
      </Section>

      <Section title="Entidades — Route (Ruta)">
        <p className="text-xs text-slate-500">Un viaje planificado de origen a destino. Contiene los waypoints de navegación.</p>
        <div className="space-y-0.5">
          <Field name="id" type="Int" desc="Identificador único." />
          <Field name="truckId" type="Int" required desc="FK al camión asignado a esta ruta." />
          <Field name="originName" type="String" required desc="Nombre descriptivo del punto de origen (ej. San Juan del Río, Qro)." />
          <Field name="destinationName" type="String" required desc="Nombre descriptivo del destino." />
          <Field name="waypoints" type="Json" required desc="Array de coordenadas [lng, lat] que definen el trayecto. Se obtienen con OSRM o se dibujan manualmente. Mínimo 2 puntos." />
          <Field name="status" type="RouteStatus" desc="PENDING (lista para simular), ACTIVE (simulación en curso), COMPLETED (finalizada)." />
          <Field name="originBranchId" type="Int?" desc="FK opcional a la sucursal de origen." />
          <Field name="destinationBranchId" type="Int?" desc="FK opcional a la sucursal de destino." />
          <Field name="startedAt" type="DateTime?" desc="Timestamp de inicio de la simulación. Se asigna automáticamente." />
          <Field name="finishedAt" type="DateTime?" desc="Timestamp de fin. Se asigna al completar." />
        </div>
      </Section>

      <Section title="Entidades — Reading (Lectura)">
        <p className="text-xs text-slate-500">Lectura de sensor generada por el simulador durante una ruta activa.</p>
        <div className="space-y-0.5">
          <Field name="id" type="Int" desc="Identificador único." />
          <Field name="boxId" type="Int" required desc="FK a la caja que generó la lectura." />
          <Field name="routeId" type="Int?" desc="FK a la ruta activa al momento de la lectura (para trazabilidad)." />
          <Field name="temperature" type="Float" required desc="Temperatura registrada en °C." />
          <Field name="humidity" type="Float" required desc="Humedad relativa registrada en %." />
          <Field name="recordedAt" type="DateTime" desc="Timestamp automático de la lectura." />
        </div>
      </Section>

      <Section title="Entidades — Position (Posición GPS)">
        <p className="text-xs text-slate-500">Coordenada GPS registrada durante la simulación de una ruta.</p>
        <div className="space-y-0.5">
          <Field name="id" type="Int" desc="Identificador único." />
          <Field name="truckId" type="Int" required desc="FK al camión." />
          <Field name="routeId" type="Int?" desc="FK a la ruta activa. Usado para separar polylines en el mapa cuando hay varias rutas simultáneas." />
          <Field name="lat" type="Float" required desc="Latitud (sistema Leaflet/WGS84)." />
          <Field name="lng" type="Float" required desc="Longitud." />
          <Field name="recordedAt" type="DateTime" desc="Timestamp automático." />
        </div>
      </Section>

      <Section title="Entidades — Alert (Alerta)">
        <p className="text-xs text-slate-500">Alerta generada cuando una lectura sale del rango objetivo de una caja. Se deduplica: solo existe una alerta abierta por caja y tipo a la vez.</p>
        <div className="space-y-0.5">
          <Field name="id" type="Int" desc="Identificador único." />
          <Field name="boxId" type="Int" required desc="FK a la caja que generó la alerta." />
          <Field name="type" type="AlertType" required desc="TEMP (temperatura) o HUM (humedad)." />
          <Field name="severity" type="AlertSeverity" desc="WARNING o CRITICAL." />
          <Field name="message" type="String" required desc="Mensaje descriptivo con el valor fuera de rango." />
          <Field name="acknowledged" type="Boolean" desc="false = activa. true = reconocida por un operador." />
        </div>
      </Section>

      <Section title="Entidades — Branch (Sucursal)">
        <p className="text-xs text-slate-500">Punto físico de la cadena de frío: almacén, farmacia, hospital o centro de distribución.</p>
        <div className="space-y-0.5">
          <Field name="id" type="Int" desc="Identificador único." />
          <Field name="name" type="String" required desc="Nombre de la sucursal." />
          <Field name="city" type="String" required desc="Ciudad donde se ubica." />
          <Field name="address" type="String?" desc="Dirección completa (opcional)." />
          <Field name="type" type="BranchType" desc="WAREHOUSE, PHARMACY, HOSPITAL o DISTRIBUTION_CENTER." />
        </div>
      </Section>

      <Section title="Entidades — Product (Producto)">
        <p className="text-xs text-slate-500">Producto farmacéutico que puede cargarse en una caja para un viaje.</p>
        <div className="space-y-0.5">
          <Field name="id" type="Int" desc="Identificador único." />
          <Field name="sku" type="String" required desc="Código SKU único del producto." />
          <Field name="name" type="String" required desc="Nombre comercial del producto." />
          <Field name="description" type="String?" desc="Descripción del producto." />
          <Field name="category" type="String?" desc="Categoría (ej. Vacuna, Insulina, Oncológico)." />
        </div>
      </Section>

      <Section title="Entidades — BoxLoad (Carga)">
        <p className="text-xs text-slate-500">Registro de qué producto, en qué cantidad, viajó en qué caja durante qué ruta. Pivote entre Box, Product y Route.</p>
        <div className="space-y-0.5">
          <Field name="boxId" type="Int" required desc="FK a la caja contenedora." />
          <Field name="productId" type="Int" required desc="FK al producto cargado." />
          <Field name="routeId" type="Int" required desc="FK a la ruta del viaje." />
          <Field name="quantity" type="Float" required desc="Cantidad del producto (número)." />
          <Field name="unit" type="String" required desc="Unidad de medida (ej. unidades, kg, dosis). Default: units." />
        </div>
        <p className="text-xs text-slate-400">Restricción única: (boxId, productId, routeId) — no se puede duplicar la misma carga en el mismo viaje.</p>
      </Section>

      {/* Relationships */}
      <Section title="Relaciones entre entidades">
        <div className="space-y-2">
          <Rel from="Truck" to="Box[]" desc="Un camión tiene una o más cajas refrigeradas." />
          <Rel from="Truck" to="Route[]" desc="Un camión puede tener muchas rutas (historial de viajes)." />
          <Rel from="Route" to="Truck" desc="Cada ruta está asignada a exactamente un camión." />
          <Rel from="Route" to="Branch (origen)" desc="Sucursal de donde sale el camión (opcional)." />
          <Rel from="Route" to="Branch (destino)" desc="Sucursal a donde llega el camión (opcional)." />
          <Rel from="Box" to="Reading[]" desc="Una caja acumula lecturas de sensor a lo largo del tiempo." />
          <Rel from="Box" to="Alert[]" desc="Una caja puede tener alertas activas o históricas." />
          <Rel from="Box" to="BoxLoad[]" desc="Una caja puede cargar distintos productos en distintas rutas." />
          <Rel from="Reading" to="Route" desc="Cada lectura recuerda en qué ruta se generó (trazabilidad)." />
          <Rel from="Position" to="Truck + Route" desc="Cada posición GPS registra el camión y la ruta activa para separar las trazas en el mapa." />
          <Rel from="BoxLoad" to="Box + Product + Route" desc="Tabla pivot: relaciona caja, producto y viaje en un solo registro." />
        </div>
      </Section>

      {/* Flow */}
      <Section title="Flujo de una simulación">
        <ol className="space-y-2 list-none">
          {[
            'Un administrador (ROOT) crea una ruta con waypoints desde "Más → Rutas → Nueva ruta".',
            'Desde el "Panel de simulación" presiona "Simular ruta" en la ruta deseada.',
            'El motor del simulador (engine.js) interpola los waypoints y emite posiciones cada 5 segundos por Socket.IO.',
            'Al mismo tiempo genera lecturas de temperatura/humedad para cada caja del camión.',
            'Si una lectura está fuera del rango objetivo de la caja, se crea una alerta (deduplicada: 1 alerta abierta por caja+tipo).',
            'El mapa en Monitores muestra la posición en tiempo real. Las tarjetas de ruta muestran los últimos valores de los sensores.',
            'Al completarse la ruta (2 minutos), el estado cambia a COMPLETED y el camión regresa a IDLE.',
          ].map((step, i) => (
            <li key={i} className="flex gap-2 text-sm text-slate-700">
              <span className="shrink-0 w-5 h-5 rounded-full bg-brand-600 text-white text-xs font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </Section>

      {/* Conventions */}
      <Section title="Convenciones técnicas">
        <div className="space-y-2">
          <div>
            <p className="text-xs font-semibold text-slate-700 mb-1">Coordenadas</p>
            <p className="text-xs text-slate-600">Los waypoints se almacenan como <code className="font-mono">[lng, lat]</code> (orden GeoJSON). El motor los convierte a <code className="font-mono">[lat, lng]</code> para Leaflet. Los sockets emiten <code className="font-mono">{'{ lat, lng }'}</code>.</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-700 mb-1">Autenticación</p>
            <p className="text-xs text-slate-600">Tokens dummy codificados en base64. Sin JWT ni cifrado. Válido solo para POC.</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-700 mb-1">Base de datos</p>
            <p className="text-xs text-slate-600">PostgreSQL + Prisma. Las migraciones se aplican con <code className="font-mono">prisma db push</code> automáticamente en cada deploy a Render.</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-700 mb-1">Idiomas</p>
            <p className="text-xs text-slate-600">La interfaz de usuario está en español. El código fuente, comentarios y la base de datos están en inglés.</p>
          </div>
        </div>
      </Section>
    </div>
  );
}
