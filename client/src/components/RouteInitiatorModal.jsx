import React, { useState, useEffect, useRef } from 'react';
import { 
  MapContainer, 
  TileLayer, 
  Marker, 
  Popup, 
  Polyline, 
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
  Sparkles,
  Crosshair,
  Bus,
  UserCheck,
  Milestone
} from 'lucide-react';
import GooglePlacesSearchInput from './GooglePlacesSearchInput';
import { 
  searchLocationSuggestions, 
  reverseGeocodeCoord, 
  computeDrivingRoute 
} from '../services/placesService';

// Custom Google Maps-style markers for Start, Via points, Stops, and Destination
const createMarkerIcon = (bgColor, label, textColor = '#ffffff', size = 30) => {
  return L.divIcon({
    className: 'custom-bus-marker',
    html: `
      <div style="
        background-color: ${bgColor};
        color: ${textColor};
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 900;
        font-size: ${size > 26 ? '11px' : '10px'};
        box-shadow: 0 4px 12px rgba(0,0,0,0.35);
        border: 2.5px solid #ffffff;
      ">
        ${label}
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
};

const startIcon = createMarkerIcon('#10b981', 'A'); // Green for Start (Origin)
const endIcon = createMarkerIcon('#ef4444', 'B');   // Red for Destination (Terminal)
const viaIcon = (num) => createMarkerIcon('#8b5cf6', `V${num}`, '#ffffff', 26); // Purple for Via points
const stopIcon = (num) => createMarkerIcon('#0284c7', num, '#ffffff', 28); // Blue for intermediate stops

// Helper to fit bounds smoothly when route, start, or stops update
function MapBoundsUpdater({ points }) {
  const map = useMap();
  useEffect(() => {
    if (points && points.length > 1) {
      try {
        const bounds = L.latLngBounds(points);
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
      } catch (e) {
        // Bounds calc safety
      }
    } else if (points && points.length === 1) {
      map.setView(points[0], 14);
    }
  }, [points, map]);
  return null;
}

// Map click listener for interactive map clicks & pick-on-map mode
function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function RouteInitiatorModal({ 
  isOpen, 
  onClose, 
  onSaveRoute,
  buses = [],
  drivers = []
}) {
  // Search inputs & selected locations
  const [startQuery, setStartQuery] = useState('');
  const [endQuery, setEndQuery] = useState('');
  const [startPlace, setStartPlace] = useState(null); // { name, secondary, lat, lng }
  const [endPlace, setEndPlace] = useState(null);     // { name, secondary, lat, lng }

  // MULTIPLE VIA POINTS: array of { id, query, place: { name, secondary, lat, lng } }
  const [viaPoints, setViaPoints] = useState([]);

  // Map picking mode: 'none' | 'start' | 'end' | 'via-{idx}' | 'stop'
  const [pickingMode, setPickingMode] = useState('none');

  // Intermediate stopping points (passenger bus stops)
  const [stops, setStops] = useState([]); // [{ id, name, lat, lng, order }]
  const [stopInputQuery, setStopInputQuery] = useState('');
  const [selectedStopPlace, setSelectedStopPlace] = useState(null);

  // Computed driving route options from OSRM
  const [routeOptions, setRouteOptions] = useState([]);
  const [selectedRouteIdx, setSelectedRouteIdx] = useState(0);

  // Route identity & Assignment
  const [routeName, setRouteName] = useState('');
  const [routeDescription, setRouteDescription] = useState('');
  const [selectedBusId, setSelectedBusId] = useState('');
  const [selectedDriverId, setSelectedDriverId] = useState('');

  // UI state
  const [isComputing, setIsComputing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [mapType, setMapType] = useState('google'); // 'google' | 'satellite' | 'osm'

  // Pre-select first available bus and driver if available
  useEffect(() => {
    if (buses.length > 0 && !selectedBusId) {
      setSelectedBusId(buses[0].id);
    }
    if (drivers.length > 0 && !selectedDriverId) {
      setSelectedDriverId(drivers[0].id);
    }
  }, [buses, drivers]);

  if (!isOpen) return null;

  // Add a new empty via point
  const handleAddViaPoint = () => {
    setViaPoints((prev) => [
      ...prev,
      {
        id: `via-${Date.now()}-${prev.length + 1}`,
        query: '',
        place: null,
      },
    ]);
  };

  // Update via point query or place
  const handleUpdateViaPoint = (idx, query, place = null) => {
    setViaPoints((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], query, place: place || copy[idx].place };
      return copy;
    });
  };

  // Move via point up or down
  const handleMoveViaPoint = (idx, direction) => {
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= viaPoints.length) return;
    setViaPoints((prev) => {
      const copy = [...prev];
      const temp = copy[idx];
      copy[idx] = copy[targetIdx];
      copy[targetIdx] = temp;
      return copy;
    });
  };

  // Remove via point
  const handleRemoveViaPoint = (idx) => {
    setViaPoints((prev) => prev.filter((_, i) => i !== idx));
  };

  // Calculate driving routes through Start -> Via Points -> End
  const calculateRoutes = async (origin, dest, currentViaPoints = [], currentStops = []) => {
    if (!origin || !dest) return;
    setIsComputing(true);
    setErrorMessage('');
    setStatusMessage('Computing Google Maps driving road paths through all via points...');

    try {
      // Waypoints: origin -> via points -> dest
      const validViaPlaces = currentViaPoints.map((v) => v.place).filter(Boolean);
      const intermediateStops = currentStops.length > 0 ? currentStops : [];

      // Combine intermediate waypoints: via points + additional passenger stops
      const allWaypoints = [origin, ...validViaPlaces, ...intermediateStops, dest];
      const routes = await computeDrivingRoute(allWaypoints);
      setRouteOptions(routes);
      setSelectedRouteIdx(0);

      // Auto-populate route name if empty
      const viaText = validViaPlaces.length > 0 ? ` via ${validViaPlaces.map(v => v.name).join(', ')}` : '';
      if (!routeName) {
        setRouteName(`${origin.name} to ${dest.name}${viaText}`);
      }
      if (!routeDescription) {
        setRouteDescription(`Campus transit corridor from ${origin.name} to ${dest.name}${viaText}.`);
      }

      setStatusMessage(`Found ${routes.length} driving route(s) via ${validViaPlaces.length} via-point(s).`);
    } catch (err) {
      setErrorMessage(err.message || 'Error calculating routes.');
    } finally {
      setIsComputing(false);
    }
  };

  // 1. Action: Handle Find & Calculate Routes button
  const handleFindRoutes = async (e) => {
    if (e) e.preventDefault();
    setErrorMessage('');

    let origin = startPlace;
    let dest = endPlace;

    // Auto-resolve start if not picked from dropdown
    if (!origin && startQuery.trim()) {
      setIsComputing(true);
      setStatusMessage(`Resolving origin "${startQuery}"...`);
      const results = await searchLocationSuggestions(startQuery);
      if (results.length > 0) {
        origin = results[0];
        setStartPlace(origin);
        setStartQuery(origin.name);
      } else {
        setIsComputing(false);
        setErrorMessage(`Could not find "${startQuery}". Try clicking "Pick on Map" or selecting a suggestion.`);
        return;
      }
    }

    // Auto-resolve destination if not picked from dropdown
    if (!dest && endQuery.trim()) {
      setIsComputing(true);
      setStatusMessage(`Resolving destination "${endQuery}"...`);
      const results = await searchLocationSuggestions(endQuery);
      if (results.length > 0) {
        dest = results[0];
        setEndPlace(dest);
        setEndQuery(dest.name);
      } else {
        setIsComputing(false);
        setErrorMessage(`Could not find "${endQuery}". Try clicking "Pick on Map" or selecting a suggestion.`);
        return;
      }
    }

    if (!origin || !dest) {
      setErrorMessage('Please specify both Start Location and Destination.');
      return;
    }

    // Auto-resolve any via points that have text but haven't selected a place
    const resolvedViaPoints = [...viaPoints];
    for (let i = 0; i < resolvedViaPoints.length; i++) {
      if (!resolvedViaPoints[i].place && resolvedViaPoints[i].query.trim()) {
        const matches = await searchLocationSuggestions(resolvedViaPoints[i].query);
        if (matches.length > 0) {
          resolvedViaPoints[i] = {
            ...resolvedViaPoints[i],
            place: matches[0],
            query: matches[0].name,
          };
        }
      }
    }
    setViaPoints(resolvedViaPoints);

    // Build default passenger stops sequence: Origin -> Via points -> Destination
    const validViaPlaces = resolvedViaPoints.map(v => v.place).filter(Boolean);
    const initialStops = [
      { id: 'stop-origin', name: origin.name, lat: origin.lat, lng: origin.lng, order: 1 },
      ...validViaPlaces.map((vp, i) => ({
        id: `stop-via-${i + 1}`,
        name: vp.name,
        lat: vp.lat,
        lng: vp.lng,
        order: i + 2,
      })),
      { id: 'stop-dest', name: dest.name, lat: dest.lat, lng: dest.lng, order: validViaPlaces.length + 2 },
    ];
    setStops(initialStops);

    await calculateRoutes(origin, dest, resolvedViaPoints, []);
  };

  // 2. Action: Add a stopping point from search input
  const handleAddStop = async () => {
    let placeToAdd = selectedStopPlace;

    if (!placeToAdd && stopInputQuery.trim()) {
      const results = await searchLocationSuggestions(stopInputQuery);
      if (results.length > 0) {
        placeToAdd = results[0];
      }
    }

    if (!placeToAdd) {
      setErrorMessage('Please type or select a village/stop name to add.');
      return;
    }

    if (!startPlace || !endPlace) {
      setErrorMessage('Please select Start and End locations first.');
      return;
    }

    const newStop = {
      id: `stop-${Date.now()}`,
      name: placeToAdd.name,
      lat: placeToAdd.lat,
      lng: placeToAdd.lng,
    };

    const currentStops = [...stops];
    const insertIdx = currentStops.length > 1 ? currentStops.length - 1 : 1;
    currentStops.splice(insertIdx, 0, newStop);

    const sequenced = currentStops.map((s, idx) => ({ ...s, order: idx + 1 }));
    setStops(sequenced);
    setStopInputQuery('');
    setSelectedStopPlace(null);
    setStatusMessage(`Added stop: ${newStop.name}`);

    // Recalculate route through all stops and via points
    await calculateRoutes(startPlace, endPlace, viaPoints, sequenced.slice(1, -1));
  };

  // 3. Action: Handle map clicks (for pick on map mode or dropping stops)
  const handleMapClick = async (lat, lng) => {
    if (pickingMode === 'start') {
      const geo = await reverseGeocodeCoord(lat, lng);
      setStartPlace(geo);
      setStartQuery(geo.name);
      setPickingMode('none');
      setStatusMessage(`Start location set to: ${geo.name}`);
      return;
    }

    if (pickingMode === 'end') {
      const geo = await reverseGeocodeCoord(lat, lng);
      setEndPlace(geo);
      setEndQuery(geo.name);
      setPickingMode('none');
      setStatusMessage(`Destination set to: ${geo.name}`);
      return;
    }

    if (pickingMode.startsWith('via-')) {
      const viaIdx = parseInt(pickingMode.replace('via-', ''), 10);
      const geo = await reverseGeocodeCoord(lat, lng);
      handleUpdateViaPoint(viaIdx, geo.name, geo);
      setPickingMode('none');
      setStatusMessage(`Via Point #${viaIdx + 1} set to: ${geo.name}`);
      return;
    }

    // Default: Click to add an intermediate stopping point along the route
    if (!startPlace || !endPlace) {
      setErrorMessage('Please select Start and End points first.');
      return;
    }

    setStatusMessage('Reverse geocoding clicked point on Google Maps...');
    const geo = await reverseGeocodeCoord(lat, lng);

    const newStop = {
      id: `stop-${Date.now()}`,
      name: geo.name,
      lat,
      lng,
    };

    const currentStops = [...stops];
    const insertIdx = currentStops.length > 1 ? currentStops.length - 1 : 1;
    currentStops.splice(insertIdx, 0, newStop);

    const sequenced = currentStops.map((s, idx) => ({ ...s, order: idx + 1 }));
    setStops(sequenced);
    setStatusMessage(`Added stop on map: ${geo.name}`);

    await calculateRoutes(startPlace, endPlace, viaPoints, sequenced.slice(1, -1));
  };

  // Reorder stops
  const handleMoveStop = async (idx, direction) => {
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx <= 0 || targetIdx >= stops.length - 1) return;

    const updated = [...stops];
    const temp = updated[idx];
    updated[idx] = updated[targetIdx];
    updated[targetIdx] = temp;

    const sequenced = updated.map((s, i) => ({ ...s, order: i + 1 }));
    setStops(sequenced);

    await calculateRoutes(startPlace, endPlace, viaPoints, sequenced.slice(1, -1));
  };

  // Remove a stop
  const handleRemoveStop = async (idx) => {
    if (idx === 0 || idx === stops.length - 1) {
      setErrorMessage('Cannot delete the Start or Destination terminal.');
      return;
    }

    const updated = stops.filter((_, i) => i !== idx);
    const sequenced = updated.map((s, i) => ({ ...s, order: i + 1 }));
    setStops(sequenced);

    await calculateRoutes(startPlace, endPlace, viaPoints, sequenced.slice(1, -1));
  };

  // Rename a stop
  const handleRenameStop = (idx, newName) => {
    const updated = [...stops];
    updated[idx].name = newName;
    setStops(updated);
  };

  // Open the route in official Google Maps with all via points & stops
  const handleOpenGoogleMaps = () => {
    if (!startPlace || !endPlace) return;
    const origin = encodeURIComponent(`${startPlace.lat},${startPlace.lng}`);
    const dest = encodeURIComponent(`${endPlace.lat},${endPlace.lng}`);
    const intermediate = stops.slice(1, -1);
    const waypointsParam = intermediate.length > 0 
      ? `&waypoints=${intermediate.map(s => encodeURIComponent(`${s.lat},${s.lng}`)).join('|')}` 
      : '';
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}${waypointsParam}&travelmode=driving`;
    window.open(googleMapsUrl, '_blank');
  };

  // 4. Save Route & Immediately Assign to Bus & Driver
  const handleSubmitFinalRoute = (e) => {
    e.preventDefault();
    if (!routeName.trim()) {
      setErrorMessage('Please give this route a name.');
      return;
    }
    if (stops.length < 2) {
      setErrorMessage('A route must have at least an Origin and Destination.');
      return;
    }

    const selectedRoute = routeOptions[selectedRouteIdx] || routeOptions[0];

    const finalPayload = {
      routeData: {
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
      },
      assignBusId: selectedBusId || null,
      assignDriverId: selectedDriverId || null,
    };

    onSaveRoute(finalPayload);
    onClose();
  };

  // Active route & map points for auto-fit bounds
  const activeRoute = routeOptions[selectedRouteIdx] || routeOptions[0];
  const allMapPoints = [
    ...(startPlace ? [[startPlace.lat, startPlace.lng]] : []),
    ...(endPlace ? [[endPlace.lat, endPlace.lng]] : []),
    ...viaPoints.filter(v => v.place).map(v => [v.place.lat, v.place.lng]),
    ...stops.map((s) => [s.lat, s.lng]),
    ...(activeRoute?.coordinates || []),
  ];

  // Tile layer URL
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/80 p-2 sm:p-4 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-6xl rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-3 flex flex-col max-h-[96vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-navy-900 via-navy-800 to-purple-900 px-6 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20">
              <RouteIcon className="h-5 w-5 text-sky-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-lg font-black tracking-tight">Google Maps Route Initiator</h2>
                <span className="rounded-full bg-emerald-500/20 border border-emerald-400/30 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                  Multiple Via Points & Driver Handover
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Define route path through multiple via villages, select stops, and immediately assign to bus & driver.
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

        {/* 2-Column Body */}
        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-hidden">
          {/* LEFT COLUMN: Search, Via Points, Route Selection, Stops, Assignment (5 cols) */}
          <div className="lg:col-span-5 p-5 overflow-y-auto border-r border-slate-200 space-y-4 bg-slate-50/50">
            {/* Status & Error Alerts */}
            {errorMessage && (
              <div className="rounded-2xl bg-red-50 p-3 text-xs text-red-700 border border-red-200 flex items-start gap-2 animate-fade-in">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
                <span className="flex-1">{errorMessage}</span>
                <button onClick={() => setErrorMessage('')} className="text-red-400 hover:text-red-600">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {statusMessage && !errorMessage && (
              <div className="rounded-2xl bg-sky-50 p-3 text-xs text-sky-800 border border-sky-200 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-sky-600" />
                <span className="flex-1">{statusMessage}</span>
              </div>
            )}

            {/* STEP 1: Origin, Multiple Via Points & Destination */}
            <div className="card p-4 space-y-3 bg-white shadow-xs border border-slate-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-black text-navy-900">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-navy-900 text-[10px] text-white font-bold">1</span>
                  <span>Route Path & Via Points</span>
                </div>
                <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                  Multiple Waypoints
                </span>
              </div>

              <div className="space-y-3">
                {/* 1. Origin Input (A) */}
                <GooglePlacesSearchInput
                  label="Start Location (Origin A)"
                  placeholder="e.g. Chandragiri, Pakala, Tirupati..."
                  value={startQuery}
                  onChange={(val) => {
                    setStartQuery(val);
                    if (!val) setStartPlace(null);
                  }}
                  onSelectPlace={(place) => {
                    setStartPlace(place);
                    setStartQuery(place.name);
                    setStatusMessage(`Start set to: ${place.name}`);
                  }}
                  iconType="origin"
                  required
                  onPickOnMap={() => setPickingMode(pickingMode === 'start' ? 'none' : 'start')}
                  isPickingOnMap={pickingMode === 'start'}
                />

                {/* 2. Multiple Via Points Section */}
                <div className="space-y-2 pt-1 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                      <Milestone className="h-3.5 w-3.5 text-purple-600" />
                      <span>Via Points (Route must go through these villages)</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleAddViaPoint}
                      className="text-purple-700 hover:text-purple-800 text-[11px] font-bold flex items-center gap-1 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-200"
                    >
                      <Plus className="h-3 w-3" />
                      <span>Add Via Point</span>
                    </button>
                  </div>

                  {viaPoints.length === 0 ? (
                    <p className="text-[11px] text-slate-400 italic bg-slate-50 p-2 rounded-xl">
                      Optional: Click "+ Add Via Point" to force the bus route through specific villages or junctions (e.g. Narasingapuram, A.Rangampet).
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {viaPoints.map((vp, idx) => (
                        <div key={vp.id} className="relative rounded-2xl bg-purple-50/40 p-2.5 border border-purple-200">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-black uppercase tracking-wider text-purple-800 flex items-center gap-1">
                              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-purple-700 text-white text-[9px]">
                                {idx + 1}
                              </span>
                              Via Point #{idx + 1}
                            </span>
                            <div className="flex items-center gap-1">
                              {idx > 0 && (
                                <button
                                  type="button"
                                  onClick={() => handleMoveViaPoint(idx, 'up')}
                                  className="p-1 text-slate-400 hover:text-slate-700"
                                  title="Move up"
                                >
                                  <ArrowUp className="h-3 w-3" />
                                </button>
                              )}
                              {idx < viaPoints.length - 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleMoveViaPoint(idx, 'down')}
                                  className="p-1 text-slate-400 hover:text-slate-700"
                                  title="Move down"
                                >
                                  <ArrowDown className="h-3 w-3" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleRemoveViaPoint(idx)}
                                className="p-1 text-slate-400 hover:text-red-600"
                                title="Remove via point"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </div>

                          <GooglePlacesSearchInput
                            placeholder={`e.g. Village / junction for Via #${idx + 1}...`}
                            value={vp.query}
                            onChange={(val) => handleUpdateViaPoint(idx, val, null)}
                            onSelectPlace={(place) => handleUpdateViaPoint(idx, place.name, place)}
                            iconType="stop"
                            onPickOnMap={() => setPickingMode(pickingMode === `via-${idx}` ? 'none' : `via-${idx}`)}
                            isPickingOnMap={pickingMode === `via-${idx}`}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 3. Destination Input (B) */}
                <div className="pt-1 border-t border-slate-100">
                  <GooglePlacesSearchInput
                    label="Destination / College Campus (Terminal B)"
                    placeholder="e.g. SV College, Main Campus, Tirupati Station..."
                    value={endQuery}
                    onChange={(val) => {
                      setEndQuery(val);
                      if (!val) setEndPlace(null);
                    }}
                    onSelectPlace={(place) => {
                      setEndPlace(place);
                      setEndQuery(place.name);
                      setStatusMessage(`Destination set to: ${place.name}`);
                    }}
                    iconType="destination"
                    required
                    onPickOnMap={() => setPickingMode(pickingMode === 'end' ? 'none' : 'end')}
                    isPickingOnMap={pickingMode === 'end'}
                  />
                </div>

                <button
                  type="button"
                  onClick={handleFindRoutes}
                  disabled={isComputing}
                  className="w-full btn-primary bg-purple-700 hover:bg-purple-800 text-xs py-2.5 flex items-center justify-center gap-2 shadow-sm font-bold"
                >
                  {isComputing ? (
                    <>
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>Computing Driving Path via All Points...</span>
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4" />
                      <span>Calculate Route Passing Through Via Points</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* STEP 2: Route Alternatives Selection */}
            {routeOptions.length > 0 && (
              <div className="card p-4 space-y-3 bg-white shadow-xs border border-slate-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-black text-navy-900">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-navy-900 text-[10px] text-white font-bold">2</span>
                    <span>Select Preferred Route Option</span>
                  </div>
                  <span className="text-[11px] text-purple-700 font-bold">{routeOptions.length} Routes</span>
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
                            ? 'border-purple-600 bg-purple-50/80 shadow-xs ring-2 ring-purple-100'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-navy-900">{opt.label}</span>
                            {idx === 0 ? (
                              <span className="rounded-md bg-emerald-100 text-emerald-800 text-[9px] font-black px-1.5 py-0.5">
                                🟢 Fastest Route
                              </span>
                            ) : (
                              <span className="rounded-md bg-slate-100 text-slate-600 text-[9px] font-bold px-1.5 py-0.5">
                                🔵 Alternative
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 font-medium">
                            {opt.via}
                          </div>
                          <div className="flex items-center gap-3 text-[11px] font-bold text-purple-900">
                            <span className="flex items-center gap-1">
                              <Compass className="h-3 w-3 text-purple-600" /> {opt.distanceKm} km
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3 text-purple-600" /> ~{opt.durationMin} mins
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

            {/* STEP 3: Stopping Points Selection (Passenger Bus Stops) */}
            {startPlace && endPlace && (
              <div className="card p-4 space-y-3 bg-white shadow-xs border border-slate-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-black text-navy-900">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-navy-900 text-[10px] text-white font-bold">3</span>
                    <span>Passenger Stopping Points ({stops.length} Stops)</span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-600 bg-amber-50 p-2.5 rounded-xl border border-amber-200 leading-tight">
                  💡 Your Start, Via Points, and Destination are sequenced below. Add more boarding stops or <strong>click directly on the Google Map</strong>!
                </div>

                {/* Add Stop with Autocomplete */}
                <div className="space-y-1.5">
                  <GooglePlacesSearchInput
                    placeholder="Search intermediate village / stop name..."
                    value={stopInputQuery}
                    onChange={(val) => {
                      setStopInputQuery(val);
                      if (!val) setSelectedStopPlace(null);
                    }}
                    onSelectPlace={(place) => {
                      setSelectedStopPlace(place);
                      setStopInputQuery(place.name);
                    }}
                    iconType="stop"
                  />

                  <button
                    type="button"
                    onClick={handleAddStop}
                    disabled={!stopInputQuery.trim()}
                    className="w-full rounded-xl bg-navy-800 hover:bg-navy-900 text-white py-2 text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50 transition-colors shadow-2xs"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Stop to Route Sequence</span>
                  </button>
                </div>

                {/* Sequenced Stop List */}
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {stops.map((stop, idx) => {
                    const isStart = idx === 0;
                    const isEnd = idx === stops.length - 1;
                    return (
                      <div
                        key={stop.id || idx}
                        className={`flex items-center gap-2 rounded-xl p-2 border text-xs transition-all ${
                          isStart 
                            ? 'bg-emerald-50/70 border-emerald-200'
                            : isEnd 
                            ? 'bg-red-50/70 border-red-200'
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

            {/* STEP 4: Route Name & Direct Driver Handover Assignment */}
            {startPlace && endPlace && (
              <div className="card p-4 space-y-3 bg-white shadow-xs border border-slate-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-black text-navy-900">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-navy-900 text-[10px] text-white font-bold">4</span>
                    <span>Route Identity & Driver Handover</span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Direct Handover
                  </span>
                </div>

                <div className="space-y-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Route Name *</label>
                    <input
                      type="text"
                      required
                      value={routeName}
                      onChange={(e) => setRouteName(e.target.value)}
                      placeholder="e.g. Route 1 - Chandragiri to Campus via Narasingapuram"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-purple-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Description</label>
                    <input
                      type="text"
                      value={routeDescription}
                      onChange={(e) => setRouteDescription(e.target.value)}
                      placeholder="e.g. Regular college transit via scheduled stops"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-purple-600 focus:outline-none"
                    />
                  </div>

                  {/* Immediate Bus & Driver Assignment Pickers */}
                  <div className="rounded-2xl bg-slate-50 p-3 border border-slate-200 space-y-2.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-navy-900">
                      <UserCheck className="h-4 w-4 text-purple-600" />
                      <span>Assign Bus & Driver Now (Optional)</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">Select Bus</label>
                        <select
                          value={selectedBusId}
                          onChange={(e) => setSelectedBusId(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:border-purple-600 focus:outline-none"
                        >
                          <option value="">-- No Bus (Assign Later) --</option>
                          {buses.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.number} ({b.capacity || 45} Seats)
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">Select Driver</label>
                        <select
                          value={selectedDriverId}
                          onChange={(e) => setSelectedDriverId(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:border-purple-600 focus:outline-none"
                        >
                          <option value="">-- No Driver (Assign Later) --</option>
                          {drivers.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.name} ({d.email})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleOpenGoogleMaps}
                      className="flex-1 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <ExternalLink className="h-3.5 w-3.5 text-sky-600" />
                      <span>Open in Google Maps</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSubmitFinalRoute}
                      className="flex-1 btn-primary bg-emerald-600 hover:bg-emerald-700 text-xs py-2.5 font-bold shadow-md flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Save & Assign Route</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Interactive Google Maps View (7 cols) */}
          <div className="lg:col-span-7 relative flex flex-col bg-slate-100 min-h-[420px] lg:min-h-full">
            {/* Top Bar: Layer Switcher & Mode indicators */}
            <div className="absolute top-4 right-4 z-20 flex items-center gap-2 bg-white/95 backdrop-blur-md p-1.5 rounded-2xl shadow-lg border border-slate-200">
              <span className="text-[11px] font-black text-slate-600 px-2 flex items-center gap-1">
                <Layers className="h-3.5 w-3.5 text-purple-600" /> View:
              </span>
              <button
                type="button"
                onClick={() => setMapType('google')}
                className={`text-[11px] font-bold px-2.5 py-1 rounded-xl transition-all ${
                  mapType === 'google' ? 'bg-purple-700 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Google Roads
              </button>
              <button
                type="button"
                onClick={() => setMapType('satellite')}
                className={`text-[11px] font-bold px-2.5 py-1 rounded-xl transition-all ${
                  mapType === 'satellite' ? 'bg-purple-700 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Google Satellite
              </button>
              <button
                type="button"
                onClick={() => setMapType('osm')}
                className={`text-[11px] font-bold px-2.5 py-1 rounded-xl transition-all ${
                  mapType === 'osm' ? 'bg-purple-700 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Standard
              </button>
            </div>

            {/* Mode Banner / Instruction Overlay */}
            {pickingMode !== 'none' ? (
              <div className="absolute top-4 left-4 z-20 bg-purple-700 text-white text-xs px-3.5 py-2 rounded-2xl shadow-xl border border-purple-400 flex items-center gap-2 animate-bounce">
                <Crosshair className="h-4 w-4 text-amber-300" />
                <span className="font-bold">
                  Click anywhere on the map to set{' '}
                  {pickingMode === 'start'
                    ? 'Start Location (A)'
                    : pickingMode === 'end'
                    ? 'Destination (B)'
                    : `Via Point #${parseInt(pickingMode.replace('via-', ''), 10) + 1}`}
                </span>
                <button
                  type="button"
                  onClick={() => setPickingMode('none')}
                  className="rounded-full bg-white/20 p-1 text-white hover:bg-white/30 ml-1"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <div className="absolute bottom-4 left-4 z-20 bg-navy-900/85 backdrop-blur-md text-white text-[11px] px-3.5 py-2 rounded-xl shadow-lg border border-white/10 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Click anywhere on the road to place a passenger bus stop</span>
              </div>
            )}

            {/* Interactive Leaflet Map with Google Maps Tiles */}
            <MapContainer
              center={[13.6288, 79.4192]}
              zoom={13}
              scrollWheelZoom={true}
              style={{ height: '100%', width: '100%', minHeight: '480px' }}
              className="z-10 flex-1"
            >
              <TileLayer
                attribution={getTileAttribution()}
                url={getTileUrl()}
              />

              {/* Fit bounds automatically */}
              <MapBoundsUpdater points={allMapPoints} />

              {/* Click handler */}
              <MapClickHandler onMapClick={handleMapClick} />

              {/* Alternative Routes rendered in dashed subtle gray */}
              {routeOptions.map((opt, idx) => {
                if (idx === selectedRouteIdx) return null;
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
                      opacity: 0.65,
                    }}
                  />
                );
              })}

              {/* Selected Route rendered with Google Maps classic double-stroke */}
              {activeRoute && activeRoute.coordinates && (
                <>
                  {/* Outer casing stroke */}
                  <Polyline
                    positions={activeRoute.coordinates}
                    pathOptions={{
                      color: '#ffffff',
                      weight: 9,
                      opacity: 0.95,
                    }}
                  />
                  {/* Inner vibrant stroke */}
                  <Polyline
                    positions={activeRoute.coordinates}
                    pathOptions={{
                      color: '#1a73e8', // Google Blue
                      weight: 5,
                      opacity: 1,
                    }}
                  />
                </>
              )}

              {/* Origin Marker (A) */}
              {startPlace && (
                <Marker position={[startPlace.lat, startPlace.lng]} icon={startIcon}>
                  <Popup>
                    <div className="p-1 space-y-0.5">
                      <div className="text-[10px] font-black text-emerald-600 uppercase">Origin Terminal (A)</div>
                      <div className="font-bold text-xs text-navy-900">{startPlace.name}</div>
                      {startPlace.secondary && (
                        <div className="text-[10px] text-slate-500">{startPlace.secondary}</div>
                      )}
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* Via Points Markers */}
              {viaPoints.filter(v => v.place).map((vp, i) => (
                <Marker
                  key={vp.id}
                  position={[vp.place.lat, vp.place.lng]}
                  icon={viaIcon(i + 1)}
                >
                  <Tooltip direction="top" offset={[0, -14]} permanent>
                    <span className="font-bold text-[11px] text-purple-900">
                      Via #{i + 1}: {vp.place.name}
                    </span>
                  </Tooltip>
                  <Popup>
                    <div className="p-1 space-y-0.5">
                      <div className="text-[10px] font-black text-purple-700 uppercase">Via Point #{i + 1}</div>
                      <div className="font-bold text-xs text-navy-900">{vp.place.name}</div>
                      <div className="text-[10px] text-slate-500">{vp.place.secondary}</div>
                    </div>
                  </Popup>
                </Marker>
              ))}

              {/* Destination Marker (B) */}
              {endPlace && (
                <Marker position={[endPlace.lat, endPlace.lng]} icon={endIcon}>
                  <Popup>
                    <div className="p-1 space-y-0.5">
                      <div className="text-[10px] font-black text-red-600 uppercase">Destination Terminal (B)</div>
                      <div className="font-bold text-xs text-navy-900">{endPlace.name}</div>
                      {endPlace.secondary && (
                        <div className="text-[10px] text-slate-500">{endPlace.secondary}</div>
                      )}
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* Intermediate Bus Stop Markers (#1, #2, #3...) */}
              {stops.slice(1, -1).map((stop, idx) => (
                <Marker
                  key={stop.id || idx}
                  position={[stop.lat, stop.lng]}
                  icon={stopIcon(idx + 1)}
                >
                  <Tooltip direction="top" offset={[0, -15]} permanent>
                    <span className="font-bold text-[11px] text-slate-800">
                      #{idx + 1} {stop.name}
                    </span>
                  </Tooltip>
                  <Popup>
                    <div className="p-1 space-y-1">
                      <div className="text-[10px] font-bold text-sky-600 uppercase">Bus Stop #{idx + 1}</div>
                      <div className="font-bold text-xs text-navy-900">{stop.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
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
