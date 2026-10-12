import React, { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Marker, Popup, Tooltip, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Bus, MapPin, Navigation } from 'lucide-react';

// Fix for default Leaflet icon paths in Vite builds
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Helper component to auto-pan or fit bounds
function MapUpdater({ center, zoom, bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length > 1) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    } else if (center && center[0] && center[1]) {
      map.setView(center, zoom || 14);
    }
  }, [center, bounds]);
  return null;
}

export default function BusMap({
  buses = [],
  stops = [],
  userStop = null,
  center = [13.6288, 79.4192],
  zoom = 14,
  height = '420px',
  showPolyline = true,
}) {
  // Compute bounds if stops exist
  const stopPoints = stops.filter((s) => s.lat && s.lng).map((s) => [s.lat, s.lng]);
  const busPoints = buses.filter((b) => b.lat && b.lng).map((b) => [b.lat, b.lng]);
  const allPoints = [...stopPoints, ...busPoints];

  const getStatusColor = (status) => {
    switch (status) {
      case 'running':
        return '#0ea5e9'; // sky-500
      case 'delayed':
        return '#f59e0b'; // amber-500
      case 'emergency':
        return '#ef4444'; // red-500
      case 'offline':
        return '#94a3b8'; // slate-400
      default:
        return '#3b82f6'; // blue-500
    }
  };

  const polylineCoords = stops
    .slice()
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .filter((s) => s.lat && s.lng)
    .map((s) => [s.lat, s.lng]);

  const mapCenter =
    buses[0]?.lat && buses[0]?.lng
      ? [buses[0].lat, buses[0].lng]
      : userStop?.lat
      ? [userStop.lat, userStop.lng]
      : center;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 shadow-md">
      <MapContainer
        center={mapCenter}
        zoom={zoom}
        scrollWheelZoom={false}
        style={{ height, width: '100%' }}
        className="z-10"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapUpdater center={mapCenter} zoom={zoom} bounds={allPoints.length > 1 ? allPoints : null} />

        {/* Route Polyline connecting stops */}
        {showPolyline && polylineCoords.length > 1 && (
          <Polyline
            positions={polylineCoords}
            pathOptions={{
              color: '#0284c7',
              weight: 4,
              dashArray: '8, 8',
              opacity: 0.7,
            }}
          />
        )}

        {/* Regular Route Stops */}
        {stops.map((stop, idx) => {
          if (!stop.lat || !stop.lng) return null;
          const isUserStop = userStop && (userStop.id === stop.id || userStop._id === stop.id || userStop.name === stop.name);

          if (isUserStop) return null; // rendered separately below

          return (
            <CircleMarker
              key={stop.id || idx}
              center={[stop.lat, stop.lng]}
              radius={6}
              pathOptions={{
                color: '#1e293b',
                fillColor: '#94a3b8',
                fillOpacity: 0.9,
                weight: 2,
              }}
            >
              <Tooltip direction="top" offset={[0, -6]}>
                <span className="font-semibold text-xs text-slate-800">
                  {stop.order ? `#${stop.order} ` : ''}{stop.name}
                </span>
              </Tooltip>
            </CircleMarker>
          );
        })}

        {/* User's Boarding Stop Highlight */}
        {userStop?.lat && userStop?.lng && (
          <>
            <CircleMarker
              center={[userStop.lat, userStop.lng]}
              radius={14}
              pathOptions={{
                color: '#10b981',
                fillColor: '#10b981',
                fillOpacity: 0.25,
                weight: 1,
              }}
            />
            <CircleMarker
              center={[userStop.lat, userStop.lng]}
              radius={8}
              pathOptions={{
                color: '#047857',
                fillColor: '#10b981',
                fillOpacity: 1,
                weight: 3,
              }}
            >
              <Tooltip permanent direction="top" offset={[0, -10]}>
                <div className="font-bold text-xs text-emerald-800 flex items-center gap-1">
                  📍 {userStop.name} (Your Stop)
                </div>
              </Tooltip>
            </CircleMarker>
          </>
        )}

        {/* Live Buses */}
        {buses.map((bus) => {
          if (!bus.lat || !bus.lng) return null;
          const color = getStatusColor(bus.status);

          return (
            <React.Fragment key={bus.id || bus.number}>
              {/* Pulsing outer aura if running */}
              {bus.status === 'running' && (
                <CircleMarker
                  center={[bus.lat, bus.lng]}
                  radius={20}
                  pathOptions={{
                    color,
                    fillColor: color,
                    fillOpacity: 0.2,
                    weight: 1,
                  }}
                />
              )}

              {/* Main Bus Marker */}
              <CircleMarker
                center={[bus.lat, bus.lng]}
                radius={11}
                pathOptions={{
                  color: '#060f26',
                  fillColor: color,
                  fillOpacity: 1,
                  weight: 3,
                }}
              >
                <Tooltip permanent direction="bottom" offset={[0, 10]}>
                  <div className="font-black text-xs px-1.5 py-0.5 rounded shadow-sm bg-navy-900 text-white flex items-center gap-1">
                    🚍 {bus.number}
                  </div>
                </Tooltip>
                <Popup>
                  <div className="p-1 space-y-1 text-xs">
                    <p className="font-bold text-sm text-navy-800">Bus {bus.number}</p>
                    <p className="text-slate-600">Status: <span className="font-semibold uppercase" style={{ color }}>{bus.status}</span></p>
                    {bus.speed != null && <p className="text-slate-600">Speed: <b>{(bus.speed * 3.6).toFixed(0)} km/h</b></p>}
                    {bus.at && <p className="text-[10px] text-slate-400">Updated: {new Date(bus.at).toLocaleTimeString()}</p>}
                  </div>
                </Popup>
              </CircleMarker>
            </React.Fragment>
          );
        })}
      </MapContainer>

      {/* Map Legend Bar */}
      <div className="absolute bottom-2 left-2 right-2 z-20 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/90 px-3 py-1.5 text-[11px] font-medium backdrop-blur-sm shadow-xs border border-slate-200">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-sky-500 inline-block"></span>
            <span>Running</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500 inline-block"></span>
            <span>Delayed</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 inline-block"></span>
            <span>Your Stop</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-slate-400 inline-block"></span>
            <span>Stop Point</span>
          </div>
        </div>
        <span className="text-slate-400 hidden sm:inline">OpenStreetMap Satellite Data</span>
      </div>
    </div>
  );
}
