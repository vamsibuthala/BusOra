import React, { useState, useEffect, useRef } from 'react';
import { 
  MapContainer, 
  TileLayer, 
  Marker, 
  Popup, 
  Polyline, 
  CircleMarker, 
  Tooltip, 
  useMap, 
  useMapEvents 
} from 'react-leaflet';
import L from 'leaflet';
import {
  Route as RouteIcon,
  MapPin,
  Navigation,
  Search,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Layers,
  ExternalLink,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  Compass,
  Sparkles
} from 'lucide-react';

// Custom icons for Start, Stops, and Destination
const createCustomIcon = (bgColor, label, textColor = '#ffffff') => {
  return L.divIcon({
    className: 'custom-bus-marker',
    html: `
      <div style="
        background-color: ${bgColor};
        color: ${textColor};
        width: 28px;
        height: 28px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 800;
        font-size: 11px;
        box-shadow: 0 4px 10px rgba(0,0,0,0.3);
        border: 2px solid #ffffff;
      ">
        ${label}
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
};

const startIcon = createCustomIcon('#10b981', 'A'); // Green for Start
const endIcon = createCustomIcon('#ef4444', 'B');   // Red for End
const stopIcon = (num) => createCustomIcon('#0284c7', num); // Blue for intermediate stops

// Helper to fit bounds when route or stops change
function MapBoundsUpdater({ points }) {
  const map = useMap();
  useEffect(() => {
    if (points && points.length > 1) {
      try {
        const bounds = L.latLngBounds(points);
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
      } catch (e) {
        // ignore bounds calculation error on initial render
      }
    }
  }, [points, map]);
  return null;
}

// Map click listener to add stopping points directly by clicking on the map
function MapClickHandler({ onAddStop }) {
  useMapEvents({
    click(e) {
      onAddStop(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function RouteInitiatorModal({ isOpen, onClose, onSaveRoute }) {
  // Input fields for Origin & Destination
  const [startQuery, setStartQuery] = useState('');
  const [endQuery, setEndQuery] = useState('');
  
  // Geocoded locations
  const [startPoint, setStartPoint] = useState(null); // { name, lat, lng }
  const [endPoint, setEndPoint] = useState(null);     // { name, lat, lng }
  
  // Stopping points between start and end
  const [stops, setStops] = useState([]); // [{ id, name, lat, lng, order }]
  const [stopQuery, setStopQuery] = useState('');
  
  // Routing options fetched from routing service
  const [routeOptions, setRouteOptions] = useState([]); // array of routes from OSRM
  const [selectedRouteIdx, setSelectedRouteIdx] = useState(0);
  
  // Route metadata
  const [routeName, setRouteName] = useState('');
  const [routeDescription, setRouteDescription] = useState('');
  
  // UI states
  const [isSearching, setIsSearching] = useState(false);
  const [isAddingStop, setIsAddingStop] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [mapType, setMapType] = useState('google'); // 'google' | 'satellite' | 'osm'

  if (!isOpen) return null;

  // Geocode a location/village query using Nominatim
  const geocodeLocation = async (query) => {
    if (!query || !query.trim()) return null;
    const clean = query.trim();
    // Prioritize Andhra Pradesh / South India context if specific village
    const searchUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(clean)}&limit=1`;
    const res = await fetch(searchUrl, {
      headers: {
        'Accept-Language': 'en',
      },
    });
    const data = await res.json();
    if (data && data.length > 0) {
      return {
        name: data[0].name || clean,
        displayName: data[0].display_name,
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
      };
    }
    return null;
  };

  // Reverse geocode a clicked coordinate to a friendly village/road name
  const reverseGeocode = async (lat, lng) => {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
      const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
      const data = await res.json();
      if (data && data.display_name) {
        const parts = data.display_name.split(',');
        return parts.slice(0, 2).join(',').trim();
      }
    } catch {
      // fallback
    }
    return `Stop at (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
  };

  // Fetch real road driving routes between points using OSRM
  const fetchDrivingRoutes = async (start, end, intermediateStops = []) => {
    // Build coordinate list: start -> stop1 -> stop2 -> ... -> end
    const waypoints = [start, ...intermediateStops, end];
    const coordsStr = waypoints.map((p) => `${p.lng},${p.lat}`).join(';');
    
    const url = `https://router.project-osrm.org/route/v1/driving/${coordsStr}?overview=full&geometries=geojson&alternatives=true`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
      return data.routes.map((r, idx) => ({
        id: `route-opt-${idx}`,
        label: idx === 0 ? 'Primary Route (Fastest)' : `Alternative Route ${idx + 1}`,
        distanceKm: (r.distance / 1000).toFixed(1),
        durationMin: Math.round(r.duration / 60),
        coordinates: r.geometry.coordinates.map(([lng, lat]) => [lat, lng]), // Leaflet requires [lat, lng]
      }));
    }
    
    // Fallback: straight line if routing service fails
    return [{
      id: 'fallback-direct',
      label: 'Direct Path',
      distanceKm: '12.0',
      durationMin: 20,
      coordinates: waypoints.map((p) => [p.lat, p.lng]),
    }];
  };

  // 1. Action: Search locations and calculate route options
  const handleFindRoutes = async (e) => {
    if (e) e.preventDefault();
    if (!startQuery.trim() || !endQuery.trim()) {
      setErrorMessage('Please enter both Start Location and Destination.');
      return;
    }

    setIsSearching(true);
    setErrorMessage('');
    setStatusMessage('Locating villages and computing road routes...');

    try {
      const [startRes, endRes] = await Promise.all([
        geocodeLocation(startQuery),
        geocodeLocation(endQuery),
      ]);

      if (!startRes) {
        throw new Error(`Could not find location "${startQuery}". Try adding district or pincode.`);
      }
      if (!endRes) {
        throw new Error(`Could not find destination "${endQuery}". Try adding district or pincode.`);
      }

      setStartPoint(startRes);
      setEndPoint(endRes);

      // Initialize default stop sequence: Start -> End
      const initialStops = [
        { id: `stop-start`, name: startRes.name || startQuery, lat: startRes.lat, lng: startRes.lng, order: 1 },
        { id: `stop-end`, name: endRes.name || endQuery, lat: endRes.lat, lng: endRes.lng, order: 2 },
      ];
      setStops(initialStops);

      // Compute road routes
      const routes = await fetchDrivingRoutes(startRes, endRes, []);
      setRouteOptions(routes);
      setSelectedRouteIdx(0);

      // Auto-populate default route name if blank
      if (!routeName) {
        setRouteName(`${startRes.name} to ${endRes.name} Route`);
      }
      if (!routeDescription) {
        setRouteDescription(`College transit service from ${startRes.name} to ${endRes.name} via official stops.`);
      }

      setStatusMessage(`Found ${routes.length} driving route(s) between ${startRes.name} and ${endRes.name}.`);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to compute route.');
    } finally {
      setIsSearching(false);
    }
  };

  // 2. Action: Add a stopping point by typing a village/stop name
  const handleAddStopBySearch = async (e) => {
    e.preventDefault();
    if (!stopQuery.trim()) return;
    if (!startPoint || !endPoint) {
      setErrorMessage('Please find the route between Start and End locations first.');
      return;
    }

    setIsAddingStop(true);
    setErrorMessage('');
    try {
      const geo = await geocodeLocation(stopQuery);
      if (!geo) {
        throw new Error(`Could not find village/stop "${stopQuery}". Try entering nearby landmark.`);
      }

      // Insert before the last stop (destination)
      const newStop = {
        id: `stop-${Date.now()}`,
        name: geo.name || stopQuery.trim(),
        lat: geo.lat,
        lng: geo.lng,
      };

      const updatedStops = [...stops];
      const insertIdx = updatedStops.length > 1 ? updatedStops.length - 1 : 1;
      updatedStops.splice(insertIdx, 0, newStop);
      
      // Re-index orders
      const sequenced = updatedStops.map((s, idx) => ({ ...s, order: idx + 1 }));
      setStops(sequenced);
      setStopQuery('');

      // Recalculate route passing through this new stop
      const intermediate = sequenced.slice(1, -1);
      const routes = await fetchDrivingRoutes(startPoint, endPoint, intermediate);
      setRouteOptions(routes);
      setSelectedRouteIdx(0);
      setStatusMessage(`Added stopping point: ${newStop.name}`);
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setIsAddingStop(false);
    }
  };

  // 3. Action: Add a stop by clicking anywhere on the map
  const handleMapClick = async (lat, lng) => {
    if (!startPoint || !endPoint) {
      setErrorMessage('Please enter Start and End points first.');
      return;
    }

    setStatusMessage('Reverse geocoding clicked stop...');
    const friendlyName = await reverseGeocode(lat, lng);

    const newStop = {
      id: `stop-${Date.now()}`,
      name: friendlyName,
      lat,
      lng,
    };

    const updatedStops = [...stops];
    const insertIdx = updatedStops.length > 1 ? updatedStops.length - 1 : 1;
    updatedStops.splice(insertIdx, 0, newStop);

    const sequenced = updatedStops.map((s, idx) => ({ ...s, order: idx + 1 }));
    setStops(sequenced);

    // Update routes through all stops
    const intermediate = sequenced.slice(1, -1);
    const routes = await fetchDrivingRoutes(startPoint, endPoint, intermediate);
    setRouteOptions(routes);
    setSelectedRouteIdx(0);
    setStatusMessage(`Added stop on map: ${friendlyName}`);
  };

  // Move stop up in sequence
  const handleMoveStop = (idx, direction) => {
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx <= 0 || targetIdx >= stops.length - 1) return; // Keep start at 0 and end at last

    const updated = [...stops];
    const temp = updated[idx];
    updated[idx] = updated[targetIdx];
    updated[targetIdx] = temp;

    const sequenced = updated.map((s, i) => ({ ...s, order: i + 1 }));
    setStops(sequenced);

    // Recalculate route
    const intermediate = sequenced.slice(1, -1);
    fetchDrivingRoutes(startPoint, endPoint, intermediate).then((routes) => {
      setRouteOptions(routes);
      setSelectedRouteIdx(0);
    });
  };

  // Remove a stop
  const handleRemoveStop = (idx) => {
    if (idx === 0 || idx === stops.length - 1) {
      setErrorMessage('Cannot delete the Start or End point. You can change them in the inputs above.');
      return;
    }

    const updated = stops.filter((_, i) => i !== idx);
    const sequenced = updated.map((s, i) => ({ ...s, order: i + 1 }));
    setStops(sequenced);

    const intermediate = sequenced.slice(1, -1);
    fetchDrivingRoutes(startPoint, endPoint, intermediate).then((routes) => {
      setRouteOptions(routes);
      setSelectedRouteIdx(0);
    });
  };

  // Rename a stop
  const handleRenameStop = (idx, newName) => {
    const updated = [...stops];
    updated[idx].name = newName;
    setStops(updated);
  };

  // Open Route in Google Maps external directions
  const handleOpenGoogleMaps = () => {
    if (!startPoint || !endPoint) return;
    const origin = encodeURIComponent(`${startPoint.lat},${startPoint.lng}`);
    const dest = encodeURIComponent(`${endPoint.lat},${endPoint.lng}`);
    const intermediate = stops.slice(1, -1);
    const waypointsParam = intermediate.length > 0 
      ? `&waypoints=${intermediate.map(s => encodeURIComponent(`${s.lat},${s.lng}`)).join('|')}` 
      : '';
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}${waypointsParam}&travelmode=driving`;
    window.open(googleMapsUrl, '_blank');
  };

  // 4. Save and Create Route
  const handleSubmitFinalRoute = (e) => {
    e.preventDefault();
    if (!routeName.trim()) {
      setErrorMessage('Please give this route a name.');
      return;
    }
    if (stops.length < 2) {
      setErrorMessage('A route must have at least a Start and End location.');
      return;
    }

    const selectedRoute = routeOptions[selectedRouteIdx] || routeOptions[0];

    const finalPayload = {
      name: routeName.trim(),
      description: routeDescription.trim(),
      distanceKm: selectedRoute?.distanceKm || null,
      durationMin: selectedRoute?.durationMin || null,
      path: selectedRoute?.coordinates || stops.map((s) => [s.lat, s.lng]),
      stops: stops.map((s, idx) => ({
        id: s.id,
        name: s.name,
        lat: s.lat,
        lng: s.lng,
        order: idx + 1,
      })),
    };

    onSaveRoute(finalPayload);
    onClose();
  };

  // All points for map bounds
  const activeRoute = routeOptions[selectedRouteIdx] || routeOptions[0];
  const allMapPoints = [
    ...(startPoint ? [[startPoint.lat, startPoint.lng]] : []),
    ...(endPoint ? [[endPoint.lat, endPoint.lng]] : []),
    ...stops.map((s) => [s.lat, s.lng]),
    ...(activeRoute?.coordinates || []),
  ];

  // Tile URL based on selected layer
  const getTileUrl = () => {
    if (mapType === 'satellite') {
      return 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}'; // Google Satellite Hybrid
    }
    if (mapType === 'google') {
      return 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}'; // Google Roadmap
    }
    return 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'; // OpenStreetMap
  };

  const getTileAttribution = () => {
    if (mapType === 'google' || mapType === 'satellite') {
      return '&copy; Google Maps';
    }
    return '&copy; OpenStreetMap contributors';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/75 p-2 sm:p-4 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-6xl rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-4 flex flex-col max-h-[95vh]">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-navy-900 via-navy-800 to-purple-900 px-6 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20">
              <RouteIcon className="h-5 w-5 text-sky-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-lg font-black tracking-tight">Smart Route Initiator</h2>
                <span className="rounded-full bg-purple-500/20 border border-purple-400/30 px-2 py-0.5 text-[10px] font-bold text-purple-300">
                  Google Maps & Road Intelligence
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Type start & destination villages to calculate road routes, pick your route, and select stopping points.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-full bg-white/10 p-2 text-white/80 hover:bg-white/20 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body: 2-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-hidden">
          {/* LEFT COLUMN: Controls & Stop Selection (5 cols) */}
          <div className="lg:col-span-5 p-5 overflow-y-auto border-r border-slate-200 space-y-5 bg-slate-50/50">
            {/* Status & Error Alerts */}
            {errorMessage && (
              <div className="rounded-2xl bg-red-50 p-3 text-xs text-red-700 border border-red-200 flex items-start gap-2 animate-fade-in">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}
            {statusMessage && !errorMessage && (
              <div className="rounded-2xl bg-sky-50 p-3 text-xs text-sky-800 border border-sky-200 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-sky-600" />
                <span>{statusMessage}</span>
              </div>
            )}

            {/* Step 1: Origin & Destination */}
            <div className="card p-4 space-y-3 bg-white shadow-sm border border-slate-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-black text-navy-900">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-navy-900 text-[10px] text-white font-bold">1</span>
                  <span>Origin & Destination Points</span>
                </div>
                <span className="text-[11px] text-slate-400 font-medium">Villages / Towns</span>
              </div>

              <div className="space-y-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Start Location / Village Name *
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-emerald-600" />
                    <input
                      type="text"
                      placeholder="e.g. Chandragiri, Pakala, Tirupati"
                      value={startQuery}
                      onChange={(e) => setStartQuery(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-xs focus:border-purple-600 focus:outline-none bg-slate-50/50 focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Destination / Campus Location *
                  </label>
                  <div className="relative">
                    <Navigation className="absolute left-3 top-3 h-4 w-4 text-red-500" />
                    <input
                      type="text"
                      placeholder="e.g. SV College, Main Campus, Tirupati Station"
                      value={endQuery}
                      onChange={(e) => setEndQuery(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-xs focus:border-purple-600 focus:outline-none bg-slate-50/50 focus:bg-white"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleFindRoutes}
                  disabled={isSearching}
                  className="w-full btn-primary bg-purple-700 hover:bg-purple-800 text-xs py-2.5 flex items-center justify-center gap-2 shadow-sm font-bold"
                >
                  {isSearching ? (
                    <>
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>Computing Driving Routes...</span>
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4" />
                      <span>Find & Calculate Routes</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Step 2: Route Choices (Admin selects the route) */}
            {routeOptions.length > 0 && (
              <div className="card p-4 space-y-3 bg-white shadow-sm border border-slate-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-black text-navy-900">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-navy-900 text-[10px] text-white font-bold">2</span>
                    <span>Select Preferred Route</span>
                  </div>
                  <span className="text-[11px] text-purple-700 font-bold">{routeOptions.length} Options Found</span>
                </div>

                <div className="space-y-2">
                  {routeOptions.map((opt, idx) => {
                    const isSelected = selectedRouteIdx === idx;
                    return (
                      <div
                        key={opt.id}
                        onClick={() => setSelectedRouteIdx(idx)}
                        className={`p-3 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                          isSelected
                            ? 'border-purple-600 bg-purple-50/70 shadow-sm'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-navy-900">{opt.label}</span>
                            {idx === 0 && (
                              <span className="rounded-md bg-emerald-100 text-emerald-800 text-[9px] font-extrabold px-1.5 py-0.5">
                                Recommended
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-slate-500">
                            <span className="flex items-center gap-1">
                              <Compass className="h-3 w-3 text-slate-400" /> {opt.distanceKm} km
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3 text-slate-400" /> ~{opt.durationMin} mins
                            </span>
                          </div>
                        </div>

                        <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                          isSelected ? 'border-purple-600 bg-purple-600 text-white' : 'border-slate-300'
                        }`}>
                          {isSelected && <div className="h-2 w-2 rounded-full bg-white" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 3: Select Stopping Points (Village stops) */}
            {startPoint && endPoint && (
              <div className="card p-4 space-y-3 bg-white shadow-sm border border-slate-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-black text-navy-900">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-navy-900 text-[10px] text-white font-bold">3</span>
                    <span>Select Stopping Points</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-semibold">{stops.length} Total Stops</span>
                </div>

                <div className="text-[11px] text-slate-500 bg-amber-50/80 p-2.5 rounded-xl border border-amber-200 leading-tight">
                  💡 <strong>Tip:</strong> Type a village/stop below or <strong>click anywhere on the map</strong> to drop a bus stopping point directly on the road!
                </div>

                {/* Add stop input */}
                <form onSubmit={handleAddStopBySearch} className="flex gap-1.5">
                  <input
                    type="text"
                    placeholder="Type village / stop name..."
                    value={stopQuery}
                    onChange={(e) => setStopQuery(e.target.value)}
                    className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:border-purple-500 bg-slate-50/50"
                  />
                  <button
                    type="submit"
                    disabled={isAddingStop || !stopQuery.trim()}
                    className="rounded-xl bg-navy-800 hover:bg-navy-900 text-white px-3 py-2 text-xs font-bold flex items-center gap-1 disabled:opacity-50"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add</span>
                  </button>
                </form>

                {/* Sequenced Stops List */}
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {stops.map((stop, idx) => {
                    const isStart = idx === 0;
                    const isEnd = idx === stops.length - 1;
                    return (
                      <div
                        key={stop.id || idx}
                        className={`flex items-center gap-2 rounded-xl p-2 border text-xs transition-all ${
                          isStart 
                            ? 'bg-emerald-50 border-emerald-200'
                            : isEnd 
                            ? 'bg-red-50 border-red-200'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <span className={`flex h-5 w-5 items-center justify-center rounded-lg text-[10px] font-black text-white shrink-0 ${
                          isStart ? 'bg-emerald-600' : isEnd ? 'bg-red-600' : 'bg-sky-600'
                        }`}>
                          {isStart ? 'A' : isEnd ? 'B' : idx}
                        </span>

                        <input
                          type="text"
                          value={stop.name}
                          onChange={(e) => handleRenameStop(idx, e.target.value)}
                          className="flex-1 font-semibold text-slate-800 bg-transparent border-0 focus:ring-0 p-0 text-xs focus:underline"
                        />

                        {/* Controls for intermediate stops */}
                        {!isStart && !isEnd && (
                          <div className="flex items-center gap-1 shrink-0">
                            {idx > 1 && (
                              <button
                                type="button"
                                title="Move up"
                                onClick={() => handleMoveStop(idx, 'up')}
                                className="p-1 text-slate-400 hover:text-slate-700"
                              >
                                <ArrowUp className="h-3.5 w-3.5" />
                              </button>
                            )}
                            {idx < stops.length - 2 && (
                              <button
                                type="button"
                                title="Move down"
                                onClick={() => handleMoveStop(idx, 'down')}
                                className="p-1 text-slate-400 hover:text-slate-700"
                              >
                                <ArrowDown className="h-3.5 w-3.5" />
                              </button>
                            )}
                            <button
                              type="button"
                              title="Delete stop"
                              onClick={() => handleRemoveStop(idx)}
                              className="p-1 text-slate-400 hover:text-red-600"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}

                        {(isStart || isEnd) && (
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
                            {isStart ? 'Origin' : 'Terminal'}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 4: Route Name & Confirmation */}
            {startPoint && endPoint && (
              <div className="card p-4 space-y-3 bg-white shadow-sm border border-slate-200">
                <div className="flex items-center gap-1.5 text-xs font-black text-navy-900">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-navy-900 text-[10px] text-white font-bold">4</span>
                  <span>Route Identity & Save</span>
                </div>

                <div className="space-y-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Route Name *</label>
                    <input
                      type="text"
                      required
                      value={routeName}
                      onChange={(e) => setRouteName(e.target.value)}
                      placeholder="e.g. Route 1 - Chandragiri to Campus Express"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-purple-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Description</label>
                    <input
                      type="text"
                      value={routeDescription}
                      onChange={(e) => setRouteDescription(e.target.value)}
                      placeholder="e.g. Regular morning & evening bus service"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-purple-600 focus:outline-none"
                    />
                  </div>

                  <div className="pt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleOpenGoogleMaps}
                      className="flex-1 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 py-2.5 text-xs font-bold flex items-center justify-center gap-1.5"
                    >
                      <ExternalLink className="h-3.5 w-3.5 text-sky-600" />
                      <span>Verify on Google Maps</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSubmitFinalRoute}
                      className="flex-1 btn-primary bg-emerald-600 hover:bg-emerald-700 text-xs py-2.5 font-bold shadow-md flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Save & Create Route</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Interactive Google Maps Visualization (7 cols) */}
          <div className="lg:col-span-7 relative flex flex-col bg-slate-100 min-h-[400px] lg:min-h-full">
            {/* Map Top Bar: Layer Switcher & Status */}
            <div className="absolute top-4 right-4 z-20 flex items-center gap-2 bg-white/90 backdrop-blur-md p-1.5 rounded-2xl shadow-lg border border-slate-200">
              <span className="text-[11px] font-black text-slate-600 px-2 flex items-center gap-1">
                <Layers className="h-3.5 w-3.5 text-purple-600" /> Map View:
              </span>
              <button
                type="button"
                onClick={() => setMapType('google')}
                className={`text-[11px] font-bold px-2.5 py-1 rounded-xl transition-all ${
                  mapType === 'google' ? 'bg-purple-700 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Google Roads
              </button>
              <button
                type="button"
                onClick={() => setMapType('satellite')}
                className={`text-[11px] font-bold px-2.5 py-1 rounded-xl transition-all ${
                  mapType === 'satellite' ? 'bg-purple-700 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Google Satellite
              </button>
              <button
                type="button"
                onClick={() => setMapType('osm')}
                className={`text-[11px] font-bold px-2.5 py-1 rounded-xl transition-all ${
                  mapType === 'osm' ? 'bg-purple-700 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Standard
              </button>
            </div>

            {/* Hint overlay */}
            <div className="absolute bottom-4 left-4 z-20 bg-navy-900/80 backdrop-blur-md text-white text-[11px] px-3 py-1.5 rounded-xl shadow-lg border border-white/10 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Click on the map at any road point to add a bus stop</span>
            </div>

            {/* Leaflet Map with Google Maps TileLayer */}
            <MapContainer
              center={[13.6288, 79.4192]}
              zoom={13}
              scrollWheelZoom={true}
              style={{ height: '100%', width: '100%', minHeight: '450px' }}
              className="z-10 flex-1"
            >
              <TileLayer
                attribution={getTileAttribution()}
                url={getTileUrl()}
              />

              {/* Bounds auto-adjuster */}
              <MapBoundsUpdater points={allMapPoints} />

              {/* Click listener for placing stops */}
              <MapClickHandler onAddStop={handleMapClick} />

              {/* Render Alternative Routes in dashed gray */}
              {routeOptions.map((opt, idx) => {
                if (idx === selectedRouteIdx) return null; // rendered as active below
                return (
                  <Polyline
                    key={opt.id}
                    positions={opt.coordinates}
                    eventHandlers={{
                      click: () => setSelectedRouteIdx(idx),
                    }}
                    pathOptions={{
                      color: '#94a3b8',
                      weight: 4,
                      dashArray: '6, 8',
                      opacity: 0.6,
                    }}
                  />
                );
              })}

              {/* Render Selected Route in solid vibrant purple/sky */}
              {activeRoute && activeRoute.coordinates && (
                <Polyline
                  positions={activeRoute.coordinates}
                  pathOptions={{
                    color: '#7c3aed', // Purple-600
                    weight: 6,
                    opacity: 0.85,
                  }}
                />
              )}

              {/* Start Point Marker */}
              {startPoint && (
                <Marker position={[startPoint.lat, startPoint.lng]} icon={startIcon}>
                  <Popup>
                    <div className="p-1">
                      <div className="text-[10px] font-bold text-emerald-600 uppercase">Origin Point (A)</div>
                      <div className="font-bold text-xs text-navy-900">{startPoint.name}</div>
                      <div className="text-[10px] text-slate-500">{startPoint.displayName}</div>
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* End Point Marker */}
              {endPoint && (
                <Marker position={[endPoint.lat, endPoint.lng]} icon={endIcon}>
                  <Popup>
                    <div className="p-1">
                      <div className="text-[10px] font-bold text-red-600 uppercase">Terminal Point (B)</div>
                      <div className="font-bold text-xs text-navy-900">{endPoint.name}</div>
                      <div className="text-[10px] text-slate-500">{endPoint.displayName}</div>
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* Intermediate Stopping Points Markers */}
              {stops.slice(1, -1).map((stop, idx) => (
                <Marker
                  key={stop.id || idx}
                  position={[stop.lat, stop.lng]}
                  icon={stopIcon(idx + 1)}
                >
                  <Tooltip direction="top" offset={[0, -14]} permanent>
                    <span className="font-bold text-[11px] text-slate-800">
                      #{idx + 1} {stop.name}
                    </span>
                  </Tooltip>
                  <Popup>
                    <div className="p-1 space-y-1">
                      <div className="text-[10px] font-bold text-sky-600 uppercase">Bus Stop #{idx + 1}</div>
                      <div className="font-bold text-xs text-navy-900">{stop.name}</div>
                      <div className="text-[10px] text-slate-500">
                        {stop.lat.toFixed(4)}, {stop.lng.toFixed(4)}
                      </div>
                      <button
                        onClick={() => handleRemoveStop(idx + 1)}
                        className="text-[10px] text-red-600 hover:underline font-bold"
                      >
                        Remove Stop
                      </button>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
