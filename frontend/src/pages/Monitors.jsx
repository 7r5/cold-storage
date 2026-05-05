import { useEffect, useState, Fragment } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { getSocket } from "../api/socket";

// --- UTILIDADES ---

const getTruckColor = (id) => {
  const colors = ["#f43f5e", "#10b981", "#ee1ba5", "#6366f1"];
  const index = (parseInt(id) * 7) % colors.length;
  return colors[index];
};

// Calls map.invalidateSize() after CSS transitions finish so tiles render correctly
function MapResizer({ trigger }) {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 250);
    return () => clearTimeout(t);
  }, [trigger, map]);
  return null;
}

// Follows the locked truck by panning without changing zoom level
function CameraLock({ lockedRouteId, liveRoutes }) {
  const map = useMap();
  useEffect(() => {
    if (!lockedRouteId) return;
    const points = liveRoutes[String(lockedRouteId)] || [];
    if (points.length === 0) return;
    const last = points[points.length - 1];
    map.setView(last, map.getZoom(), { animate: true, duration: 0.8 });
  }, [liveRoutes, lockedRouteId, map]);
  return null;
}

const createDotIcon = (color) => {
  return L.divIcon({
    className: "custom-dot-icon",
    html: `<div style="background-color: ${color}; width: 18px; height: 18px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.4);"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
};

const createLetterIcon = (letter, color) => {
  return L.divIcon({
    className: "custom-letter-icon",
    html: `<div style="background-color: white; color: ${color}; width: 24px; height: 24px; border-radius: 6px; border: 2px solid ${color}; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 13px; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">${letter}</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

// --- COMPONENTE PRINCIPAL ---

export default function Monitors() {
  const [routes, setRoutes] = useState([]);
  const [liveRoutes, setLiveRoutes] = useState({});
  const [liveReadings, setLiveReadings] = useState({});
  const [lockedRouteId, setLockedRouteId] = useState(null);
  const [visiblePlannedRoutes, setVisiblePlannedRoutes] = useState({});
  const [mapFullscreen, setMapFullscreen] = useState(false);

  useEffect(() => {
    // 1. Cargar Datos Iniciales (Rutas, Historial y Lecturas de sensores)
    const initData = async () => {
      try {
        const routesData = await api.get("/api/routes");
        setRoutes(routesData);

        const history = await api.get("/api/routes/live-history");
        // history is keyed by routeId — set directly, no cleanup needed for zeros
        const cleanHistory = {};
        Object.entries(history).forEach(([rid, points]) => {
          cleanHistory[rid] = points.filter((p) => p[0] !== 0 && p[1] !== 0);
        });
        setLiveRoutes(cleanHistory);

        // Opcional: Cargar últimas lecturas si tienes el endpoint
        const readings = await api
          .get("/api/boxes/latest-readings")
          .catch(() => []);
        const initialReadings = {};
        readings.forEach((r) => {
          initialReadings[String(r.boxId)] = {
            temperature: r.temperature,
            humidity: r.humidity,
          };
        });
        setLiveReadings(initialReadings);
      } catch (err) {
        console.error("Error cargando monitores:", err);
      }
    };

    initData();

    // 2. Configuración de Socket
    const socket = getSocket();

    // When a route starts, clear the stale in-memory polyline so the map
    // builds the path progressively from scratch (not from old socket frames).
    const onRouteStarted = ({ routeId }) => {
      if (routeId == null) return;
      setLiveRoutes((prev) => {
        const next = { ...prev };
        delete next[String(routeId)];
        return next;
      });
    };

    const onPos = ({ routeId, lat, lng }) => {
      // Engine always emits { lat, lng } in [lat, lng] order (Leaflet-ready)
      // Keyed by routeId to prevent mixing points from different routes of the same truck
      if (lat == null || lng == null || routeId == null) return;

      setLiveRoutes((prev) => {
        const rid = String(routeId);
        const current = prev[rid] || [];
        const last = current[current.length - 1];
        if (last && last[0] === lat && last[1] === lng) return prev;
        return { ...prev, [rid]: [...current, [lat, lng]] };
      });
    };

    const onReading = ({ boxId, temperature, humidity }) => {
      setLiveReadings((prev) => ({
        ...prev,
        [String(boxId)]: { temperature, humidity },
      }));
    };

    // When a new alert fires, refresh routes so the alert badge updates immediately
    const onAlert = () => {
      api.get("/api/routes").then(setRoutes).catch(() => {});
    };

    // When a route stops, refresh routes and clear stale live readings for its boxes
    const onRouteStopped = ({ routeId }) => {
      api.get("/api/routes").then((updated) => {
        setRoutes(updated);
        // Find the completed route's boxes and wipe their live readings
        const stopped = updated.find((rt) => String(rt.id) === String(routeId));
        if (stopped?.truck?.boxes) {
          setLiveReadings((prev) => {
            const next = { ...prev };
            stopped.truck.boxes.forEach((b) => { delete next[String(b.id)]; });
            return next;
          });
        }
      }).catch(() => {});
    };

    socket.on("route:started", onRouteStarted);
    socket.on("route:stopped", onRouteStopped);
    socket.on("truck:position", onPos);
    socket.on("box:reading", onReading);
    socket.on("alert:new", onAlert);

    return () => {
      socket.off("route:started", onRouteStarted);
      socket.off("route:stopped", onRouteStopped);
      socket.off("truck:position", onPos);
      socket.off("box:reading", onReading);
      socket.off("alert:new", onAlert);
    };
  }, []);

  const togglePlannedView = (routeId) => {
    const rid = String(routeId);
    const willBeVisible = !visiblePlannedRoutes[routeId];
    setVisiblePlannedRoutes((prev) => ({ ...prev, [routeId]: willBeVisible }));
    if (willBeVisible) {
      setLockedRouteId(rid);
    } else {
      setLockedRouteId((prev) => (prev === rid ? null : prev));
    }
  };

  const sortedRoutes = [...routes].sort((a, b) => {
    const order = { ACTIVE: 0, PENDING: 1, COMPLETED: 2 };
    return (order[a.status] ?? 1) - (order[b.status] ?? 1);
  });

  const defaultCenter = [20.5879, -100.3927];

  return (
    <div className="flex flex-col gap-4 pb-20">
      {/* Header */}
      <div className="bg-white p-3 rounded-lg shadow-sm border border-slate-100 mx-1">
        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest">
          Panel de Monitoreo
        </h2>
      </div>

      {/* Unlock camera button — visible only when a truck is being followed */}
      {lockedRouteId && (
        <div className="mx-1">
          <button
            onClick={() => setLockedRouteId(null)}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-blue-600 text-white text-sm font-bold shadow-sm hover:bg-blue-700 active:bg-blue-800 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 9.9-1"/>
            </svg>
            Desbloquear cámara
          </button>
        </div>
      )}

      {/* Mapa */}
      <section
        className={`relative border overflow-hidden shadow-inner bg-slate-100 transition-all duration-200 ${
          mapFullscreen
            ? "fixed inset-0 z-50 rounded-none mx-0 h-screen"
            : "z-10 mx-1 rounded-xl h-80"
        }`}
      >
        {/* Fullscreen toggle button */}
        <button
          onClick={() => setMapFullscreen((v) => !v)}
          aria-label={mapFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
          className="absolute top-2 right-2 z-[1000] bg-white/90 backdrop-blur-sm border border-slate-200 rounded-lg p-1.5 shadow-md text-slate-600 hover:text-slate-900 hover:bg-white transition-colors"
        >
          {mapFullscreen ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M8 3v3a2 2 0 0 1-2 2H3"/>
              <path d="M21 8h-3a2 2 0 0 1-2-2V3"/>
              <path d="M3 16h3a2 2 0 0 1 2 2v3"/>
              <path d="M16 21v-3a2 2 0 0 1 2-2h3"/>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M3 7V5a2 2 0 0 1 2-2h2"/>
              <path d="M17 3h2a2 2 0 0 1 2 2v2"/>
              <path d="M21 17v2a2 2 0 0 1-2 2h-2"/>
              <path d="M7 21H5a2 2 0 0 1-2-2v-2"/>
            </svg>
          )}
        </button>
        <MapContainer
          center={defaultCenter}
          zoom={12}
          className="h-full w-full"
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          />{" "}          <MapResizer trigger={mapFullscreen} />
          <CameraLock lockedRouteId={lockedRouteId} liveRoutes={liveRoutes} />
          {routes.map((route) => {
            const truck = route.truck;
            const truckId = truck ? String(truck.id) : null;
            // Use routeId as key — prevents cross-route polyline contamination
            const livePoints = liveRoutes[String(route.id)] || [];
            const color = truckId ? getTruckColor(truckId) : "#2c22f1";

            const showLive =
              livePoints.length > 0 && route.status === "ACTIVE";
            const isManualToggle = !!visiblePlannedRoutes[route.id];
            const waypoints = route.waypoints
              ? route.waypoints.map((p) => [p[1], p[0]])
              : [];

            return (
              <Fragment key={route.id}>
                {isManualToggle && waypoints.length > 0 && (
                  <>
                    <Polyline
                      positions={waypoints}
                      pathOptions={{
                        color,
                        weight: 4,
                        opacity: 0.5,
                        dashArray: "10, 15",
                      }}
                    />
                    <Marker
                      position={waypoints[0]}
                      icon={createLetterIcon("A", color)}
                    />
                    <Marker
                      position={waypoints[waypoints.length - 1]}
                      icon={createLetterIcon("B", color)}
                    />
                  </>
                )}
                {showLive && (
                  <>
                    <Polyline
                      positions={livePoints}
                      pathOptions={{
                        color,
                        weight: 6,
                        opacity: 1,
                        lineJoin: "round",
                      }}
                    />
                    <Marker
                      position={livePoints[livePoints.length - 1]}
                      icon={createDotIcon(color)}
                    >
                      <Popup>
                        <div className="text-center font-bold">
                          <p className="text-sm">{truck?.plate}</p>
                          <p className="text-[10px] text-blue-600 uppercase">
                            {route.status}
                          </p>
                        </div>
                      </Popup>
                    </Marker>
                  </>
                )}
              </Fragment>
            );
          })}
        </MapContainer>
      </section>

      {/* Grid de Tarjetas */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-3 px-1">
        {sortedRoutes.map((r) => {
          const truck = r.truck;
          const isSelected = !!visiblePlannedRoutes[r.id];
          const isActive = r.status === "ACTIVE";
          const isCompleted = r.status === "COMPLETED";
          const color = truck ? getTruckColor(truck.id) : "#cbd5e1";
          const hasActiveAlert = truck?.boxes?.some(
            (box) => box.alerts && box.alerts.length > 0,
          );

          return (
            <div
              key={r.id}
              onClick={() => togglePlannedView(r.id)}
              className={`p-4 rounded-xl border-t-4 shadow-sm transition-all cursor-pointer select-none relative ${
                isSelected
                  ? "bg-white ring-4 ring-blue-500/10 shadow-md"
                  : "bg-slate-50"
              } ${isCompleted ? "opacity-70" : ""}`}
              style={{ borderTopColor: color }}
            >
              {hasActiveAlert && !isCompleted && (
                <div className="absolute -top-3 right-4 bg-red-600 text-white text-[11px] font-black px-2 py-1 rounded-full animate-bounce shadow-lg border-2 border-white uppercase">
                  ⚠️ Alerta Activa
                </div>
              )}

              <div className="flex justify-between items-start mb-3">
                <div className="max-w-[70%]">
                  <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                    {isActive ? "En Tránsito" : "Inactivo"}
                  </h3>
                  <p className="text-base font-bold text-slate-800 leading-tight">
                    {r.originName.split(",")[0]} →{" "}
                    {r.destinationName.split(",")[0]}
                  </p>
                </div>
                <div className="text-right">
                  <Link
                    to={truck ? `/camiones/${truck.id}` : "#"}
                    onClick={(e) => e.stopPropagation()}
                    className="text-xs bg-slate-800 text-white px-2 py-0.5 rounded font-mono font-bold hover:bg-slate-600 transition-colors"
                  >
                    {truck?.plate || "S/N"}
                  </Link>
                </div>
              </div>

              {isActive && truck?.boxes && truck.boxes.length > 0 && (
                <div className="grid grid-cols-1 gap-2 mt-2">
                  {truck.boxes.map((box) => {
                    const data = liveReadings[String(box.id)];
                    const tempOk =
                      data == null ||
                      (data.temperature >= box.targetTempMin &&
                        data.temperature <= box.targetTempMax);
                    const humOk =
                      data == null ||
                      (data.humidity >= box.targetHumMin &&
                        data.humidity <= box.targetHumMax);
                    const boxAlerts = box.alerts || [];

                    return (
                      <div
                        key={box.id}
                        className={`border p-2 rounded-lg shadow-sm ${
                          boxAlerts.length > 0
                            ? "bg-red-50 border-red-200"
                            : "bg-white border-slate-100"
                        }`}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[10px] font-black text-slate-400 uppercase">
                            {box.code}
                          </span>
                          {boxAlerts.length > 0 && (
                            <span className="text-[10px] font-black text-red-600 uppercase">
                              ⚠ {boxAlerts.map((a) => a.type).join(" · ")}
                            </span>
                          )}
                        </div>
                        <div className="flex gap-4 justify-end">
                          <div className="text-right">
                            <span className="block text-[10px] uppercase font-bold text-slate-400">
                              Temp
                            </span>
                            <span
                              className={`text-sm font-mono font-black ${
                                !tempOk ? "text-red-500" : "text-blue-600"
                              }`}
                            >
                              {data ? `${data.temperature.toFixed(1)}°C` : "—"}
                            </span>
                          </div>
                          <div className="text-right border-l pl-3 border-slate-100">
                            <span className="block text-[10px] uppercase font-bold text-slate-400">
                              Hum
                            </span>
                            <span
                              className={`text-sm font-mono font-black ${
                                !humOk ? "text-yellow-600" : "text-teal-600"
                              }`}
                            >
                              {data ? `${Math.round(data.humidity)}%` : "—"}
                            </span>
                          </div>
                        </div>
                        {boxAlerts.length > 0 && (
                          <p className="text-[10px] text-red-500 mt-1 leading-tight">
                            {boxAlerts[0].message}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {isActive && (!truck?.boxes || truck.boxes.length === 0) && (
                <p className="text-xs text-slate-400 mt-2 text-center">
                  Sin cajas registradas
                </p>
              )}
              <p
                className={`text-[11px] font-bold mt-3 text-center uppercase tracking-tighter ${isSelected ? "text-blue-500" : "text-slate-400"}`}
              >
                {isSelected ? "Ocultar ruta · soltar cámara" : "Ver ruta · seguir camión"}
              </p>
            </div>
          );
        })}
      </section>
    </div>
  );
}
