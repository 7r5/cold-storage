import { useEffect, useState } from "react";
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

function MapController({ allRoutes, autoView }) {
  const map = useMap();
  useEffect(() => {
    if (autoView) {
      const allPoints = Object.values(allRoutes).flat();
      if (allPoints.length > 0) {
        const bounds = L.latLngBounds(allPoints);
        map.fitBounds(bounds, {
          padding: [50, 50],
          maxZoom: 15,
          animate: true,
        });
      }
    }
  }, [allRoutes, autoView, map]);
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
  const [autoView, setAutoView] = useState(true);
  const [visiblePlannedRoutes, setVisiblePlannedRoutes] = useState({});

  useEffect(() => {
    // 1. Cargar Datos Iniciales (Rutas, Historial y Lecturas de sensores)
    const initData = async () => {
      try {
        const routesData = await api.get("/api/routes");
        setRoutes(routesData);

        const history = await api.get("/api/routes/live-history");
        const cleanHistory = {};
        Object.entries(history).forEach(([tid, points]) => {
          cleanHistory[tid] = points.filter((p) => p[0] !== 0 && p[1] !== 0);
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

    const onPos = ({ truckId, lat, lng }) => {
      // Engine always emits { lat, lng } in [lat, lng] order (Leaflet-ready)
      if (lat == null || lng == null) return;

      setLiveRoutes((prev) => {
        const tid = String(truckId);
        const current = prev[tid] || [];
        const last = current[current.length - 1];
        if (last && last[0] === lat && last[1] === lng) return prev;
        return { ...prev, [tid]: [...current, [lat, lng]] };
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

    socket.on("truck:position", onPos);
    socket.on("box:reading", onReading);
    socket.on("alert:new", onAlert);

    return () => {
      socket.off("truck:position", onPos);
      socket.off("box:reading", onReading);
      socket.off("alert:new", onAlert);
    };
  }, []);

  const togglePlannedView = (routeId) => {
    setVisiblePlannedRoutes((prev) => ({ ...prev, [routeId]: !prev[routeId] }));
  };

  const defaultCenter = [20.5879, -100.3927];

  return (
    <div className="flex flex-col gap-4 pb-20">
      {/* Header */}
      <div className="flex justify-between items-center bg-white p-3 rounded-lg shadow-sm border border-slate-100 mx-1">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
          Panel de Monitoreo
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase">
            Auto-Zoom
          </span>
          <button
            onClick={() => setAutoView(!autoView)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${autoView ? "bg-blue-600" : "bg-slate-300"}`}
          >
            <span
              className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${autoView ? "translate-x-5" : "translate-x-1"}`}
            />
          </button>
        </div>
      </div>

      {/* Mapa */}
      <section className="relative z-10 mx-1 border rounded-xl overflow-hidden shadow-inner bg-slate-100 h-80">
        <MapContainer
          center={defaultCenter}
          zoom={12}
          className="h-full w-full"
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          />{" "}
          <MapController allRoutes={liveRoutes} autoView={autoView} />
          {routes.map((route) => {
            const truck = route.truck;
            const truckId = truck ? String(truck.id) : null;
            const livePoints = truckId ? liveRoutes[truckId] || [] : [];
            const color = truckId ? getTruckColor(truckId) : "#2c22f1";

            const showLive =
              livePoints.length > 0 && route.status === "ACTIVE";
            const isManualToggle = !!visiblePlannedRoutes[route.id];
            const waypoints = route.waypoints
              ? route.waypoints.map((p) => [p[1], p[0]])
              : [];

            return (
              <div key={route.id}>
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
              </div>
            );
          })}
        </MapContainer>
      </section>

      {/* Grid de Tarjetas */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-3 px-1">
        {routes.map((r) => {
          const truck = r.truck;
          const isSelected = !!visiblePlannedRoutes[r.id];
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
                <div className="absolute -top-3 right-4 bg-red-600 text-white text-[9px] font-black px-2 py-1 rounded-full animate-bounce shadow-lg border-2 border-white uppercase">
                  ⚠️ Alerta Activa
                </div>
              )}

              <div className="flex justify-between items-start mb-3">
                <div className="max-w-[70%]">
                  <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    {isCompleted ? "Finalizado" : "En Tránsito"}
                  </h3>
                  <p className="text-sm font-bold text-slate-800 leading-tight">
                    {r.originName.split(",")[0]} →{" "}
                    {r.destinationName.split(",")[0]}
                  </p>
                </div>
                <div className="text-right">
                  <Link
                    to={truck ? `/camiones/${truck.id}` : "#"}
                    onClick={(e) => e.stopPropagation()}
                    className="text-[10px] bg-slate-800 text-white px-2 py-0.5 rounded font-mono font-bold hover:bg-slate-600 transition-colors"
                  >
                    {truck?.plate || "S/N"}
                  </Link>
                </div>
              </div>

              {!isCompleted && truck?.boxes && truck.boxes.length > 0 && (
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
                          <span className="text-[8px] font-black text-slate-400 uppercase">
                            {box.code}
                          </span>
                          {boxAlerts.length > 0 && (
                            <span className="text-[8px] font-black text-red-600 uppercase">
                              ⚠ {boxAlerts.map((a) => a.type).join(" · ")}
                            </span>
                          )}
                        </div>
                        <div className="flex gap-4 justify-end">
                          <div className="text-right">
                            <span className="block text-[8px] uppercase font-bold text-slate-400">
                              Temp
                            </span>
                            <span
                              className={`text-xs font-mono font-black ${
                                !tempOk ? "text-red-500" : "text-blue-600"
                              }`}
                            >
                              {data ? `${data.temperature.toFixed(1)}°C` : "—"}
                            </span>
                          </div>
                          <div className="text-right border-l pl-3 border-slate-100">
                            <span className="block text-[8px] uppercase font-bold text-slate-400">
                              Hum
                            </span>
                            <span
                              className={`text-xs font-mono font-black ${
                                !humOk ? "text-yellow-600" : "text-teal-600"
                              }`}
                            >
                              {data ? `${Math.round(data.humidity)}%` : "—"}
                            </span>
                          </div>
                        </div>
                        {boxAlerts.length > 0 && (
                          <p className="text-[8px] text-red-500 mt-1 leading-tight">
                            {boxAlerts[0].message}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {!isCompleted && (!truck?.boxes || truck.boxes.length === 0) && (
                <p className="text-[10px] text-slate-400 mt-2 text-center">
                  Sin cajas registradas
                </p>
              )}
              <p
                className={`text-[9px] font-bold mt-3 text-center uppercase tracking-tighter ${isSelected ? "text-blue-500" : "text-slate-400"}`}
              >
                {isSelected ? "Cerrar Detalles" : "Ver Guía de Ruta"}
              </p>
            </div>
          );
        })}
      </section>
    </div>
  );
}
