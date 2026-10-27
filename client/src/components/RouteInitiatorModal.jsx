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
  computeDrivingRoute,
  VERIFIED_PLACES,
  kmDistance
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

// Compact Numbered Village Pin Icon for rural roads & hamlets (so villages don't cover each other or the map)
const numberedVillageIcon = (num) => L.divIcon({
  className: 'village-number-pin',
  html: `
    <div style="
      background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%);
      color: #ffffff;
      width: 22px;
      height: 22px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 900;
      border: 2px solid #ffffff;
      box-shadow: 0 2px 6px rgba(0,0,0,0.35);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      user-select: none;
      line-height: 1;
    ">
      ${num}
    </div>
  `,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
  popupAnchor: [0, -12],
});

// Helper to fit bounds smoothly ONLY when routes or explicit recenter occurs (prevents snapping during zoom/pan)
function MapBoundsUpdater({ triggerKey, points }) {
  const map = useMap();
  const lastKeyRef = useRef(null);

  useEffect(() => {
    if (!triggerKey || triggerKey === lastKeyRef.current) return;
    lastKeyRef.current = triggerKey;

    if (points && points.length > 1) {
      try {
        const bounds = L.latLngBounds(points);
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15, animate: true, duration: 0.6 });
      } catch (e) {
        // Bounds calc safety
      }
    } else if (points && points.length === 1) {
      map.setView(points[0], 14, { animate: true });
    }
  }, [triggerKey, points, map]);

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

  // Trigger key for map bounds fitting (only updates when route changes or recenter requested)
  const [fitBoundsTrigger, setFitBoundsTrigger] = useState(1);

  // Route identity & Assignment
  const [routeName, setRouteName] = useState('');
  const [routeDescription, setRouteDescription] = useState('');
  const [selectedBusId, setSelectedBusId] = useState('');
  const [selectedDriverId, setSelectedDriverId] = useState('');

  // UI state
  const [isComputing, setIsComputing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [mapType, setMapType] = useState('hot'); // Default to 'hot' (Humanitarian OSM - High Contrast Narrow Village Roads)
  const [showVillagePins, setShowVillagePins] = useState(true);
  const [showVillageList, setShowVillageList] = useState(false);

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

  // Nearby small villages within regional radius to display as clickable numbered pins on the map
  const centerPoint = startPlace || endPlace || { lat: 13.3420, lng: 79.0830 };
  const nearbyVillages = VERIFIED_PLACES.filter((p) => {
    if (p.type !== 'village' && p.type !== 'transit_hub' && p.type !== 'landmark' && p.type !== 'college') return false;
    // Don't show pin if already selected as start, end, or in via points
    if (startPlace && Math.abs(startPlace.lat - p.lat) < 0.001 && Math.abs(startPlace.lng - p.lng) < 0.001) return false;
    if (endPlace && Math.abs(endPlace.lat - p.lat) < 0.001 && Math.abs(endPlace.lng - p.lng) < 0.001) return false;
    if (viaPoints.some(v => v.place && Math.abs(v.place.lat - p.lat) < 0.001 && Math.abs(v.place.lng - p.lng) < 0.001)) return false;
    const d = kmDistance(centerPoint, p);
    return d !== null && d <= 70;
  }).slice(0, 60);

  // Helper: Bias suggestions for via points around the previous point or origin
  const getBiasForVia = (idx) => {
    if (idx > 0 && viaPoints[idx - 1]?.place) {
      return { lat: viaPoints[idx - 1].place.lat, lng: viaPoints[idx - 1].place.lng };
    }
    if (startPlace) {
      return { lat: startPlace.lat, lng: startPlace.lng };
    }
    return null;
  };

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

  // Quick-add a village pin directly from the map into the bus route
  const handleAddVillageToRoute = (villagePlace) => {
    const newVia = {
      id: `via-vil-${Date.now()}`,
      query: villagePlace.name,
      place: {
        name: villagePlace.name,
        secondary: villagePlace.secondary,
        lat: villagePlace.lat,
        lng: villagePlace.lng,
      },
    };
    const updated = [...viaPoints, newVia];
    setViaPoints(updated);
    setStatusMessage(`Added village "${villagePlace.name}" to route.`);
    if (startPlace && endPlace) {
      calculateRoutes(startPlace, endPlace, updated);
    }
  };

  // Update via point query or place (immediately triggers route recalculation if place chosen)
  const handleUpdateViaPoint = (idx, query, place = null) => {
    setViaPoints((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], query, place: place !== undefined ? place : copy[idx].place };
      
      if (place && startPlace && endPlace) {
        setTimeout(() => {
          calculateRoutes(startPlace, endPlace, copy);
        }, 50);
      }
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
      if (startPlace && endPlace) {
        setTimeout(() => {
          calculateRoutes(startPlace, endPlace, copy);
        }, 50);
      }
      return copy;
    });
  };

  // Remove via point
  const handleRemoveViaPoint = (idx) => {
    setViaPoints((prev) => {
      const filtered = prev.filter((_, i) => i !== idx);
      if (startPlace && endPlace) {
        setTimeout(() => {
          calculateRoutes(startPlace, endPlace, filtered);
        }, 50);
      }
      return filtered;
    });
  };

  // Calculate driving routes through Start -> Via Points -> End (follows small village roads)
  const calculateRoutes = async (origin, dest, currentViaPoints = []) => {
    if (!origin || !dest) return;
    setIsComputing(true);
    setErrorMessage('');
    setStatusMessage('Computing Google Maps driving road paths through all small villages & routes...');

    try {
      // Waypoints: origin -> via points -> dest
      const validViaPlaces = (currentViaPoints || []).map((v) => v.place).filter(Boolean);

      // Clean sequential waypoint list following physical travel path
      const allWaypoints = [origin, ...validViaPlaces, dest];
      const routes = await computeDrivingRoute(allWaypoints);
      setRouteOptions(routes);
      setSelectedRouteIdx(0);
      setFitBoundsTrigger((prev) => prev + 1);

      // Keep passenger stops sequence in sync with the route
      const newStops = [
        { id: 'stop-origin', name: origin.name, lat: origin.lat, lng: origin.lng, order: 1 },
        ...validViaPlaces.map((vp, i) => ({
          id: `stop-via-${vp.id || i + 1}`,
          name: vp.name,
          lat: vp.lat,
          lng: vp.lng,
          order: i + 2,
        })),
        { id: 'stop-dest', name: dest.name, lat: dest.lat, lng: dest.lng, order: validViaPlaces.length + 2 },
      ];
      setStops(newStops);

      // Auto-populate route name if empty or generic
      const viaText = validViaPlaces.length > 0 ? ` via ${validViaPlaces.map(v => v.name).join(', ')}` : '';
      if (!routeName || routeName.includes('to')) {
        setRouteName(`${origin.name} to ${dest.name}${viaText}`);
      }
      if (!routeDescription || routeDescription.includes('transit corridor')) {
        setRouteDescription(`Transit corridor from ${origin.name} to ${dest.name}${viaText} for Vemu Institute of Technology.`);
      }

      setStatusMessage(`Found ${routes.length} driving route(s) via ${validViaPlaces.length} via-point(s).`);
    } catch (err) {
      setErrorMessage(err.message || 'Error calculating routes.');
    } finally {
      setIsComputing(false);
    }
  };

  // Drag handler for Starting Point Marker (A)
  const handleStartDragEnd = async (e) => {
    const latlng = e.target.getLatLng();
    setStatusMessage('Relocating Starting Point (A)...');
    const geo = await reverseGeocodeCoord(latlng.lat, latlng.lng);
    setStartPlace(geo);
    setStartQuery(geo.name);
    setStatusMessage(`Starting Point (A) updated to: ${geo.name}`);
    if (endPlace) {
      await calculateRoutes(geo, endPlace, viaPoints);
    }
  };

  // Drag handler for Destination Marker (B)
  const handleEndDragEnd = async (e) => {
    const latlng = e.target.getLatLng();
    setStatusMessage('Relocating Destination (B)...');
    const geo = await reverseGeocodeCoord(latlng.lat, latlng.lng);
    setEndPlace(geo);
    setEndQuery(geo.name);
    setStatusMessage(`Destination (B) updated to: ${geo.name}`);
    if (startPlace) {
      await calculateRoutes(startPlace, geo, viaPoints);
    }
  };

  // Drag handler for Via Point Markers
  const handleViaDragEnd = async (e, idx) => {
    const latlng = e.target.getLatLng();
    setStatusMessage(`Relocating Via Point #${idx + 1}...`);
    const geo = await reverseGeocodeCoord(latlng.lat, latlng.lng);
    const updatedVias = [...viaPoints];
    updatedVias[idx] = { ...updatedVias[idx], place: geo, query: geo.name };
    setViaPoints(updatedVias);
    setStatusMessage(`Via Point #${idx + 1} updated to: ${geo.name}`);
    if (startPlace && endPlace) {
      await calculateRoutes(startPlace, endPlace, updatedVias);
    }
  };

  // Drag handler for intermediate bus stops
  const handleStopDragEnd = async (e, stopIdx) => {
    const latlng = e.target.getLatLng();
    const geo = await reverseGeocodeCoord(latlng.lat, latlng.lng);
    const updatedStops = [...stops];
    if (updatedStops[stopIdx]) {
      updatedStops[stopIdx] = {
        ...updatedStops[stopIdx],
        lat: latlng.lat,
        lng: latlng.lng,
        name: geo.name,
      };
      setStops(updatedStops);
      setStatusMessage(`Stop #${stopIdx} moved to: ${geo.name}`);
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
    const newVia = {
      id: `via-stop-${Date.now()}`,
      query: placeToAdd.name,
      place: placeToAdd,
    };

    const updated = [...viaPoints, newVia];
    setViaPoints(updated);
    setStopInputQuery('');
    setSelectedStopPlace(null);
    setStatusMessage(`Added stop: ${placeToAdd.name}`);

    await calculateRoutes(startPlace, endPlace, updated);
  };

  // 3. Action: Handle map clicks (for pick on map mode or clicking small roads/villages)
  const handleMapClick = async (lat, lng) => {
    if (pickingMode === 'start') {
      const geo = await reverseGeocodeCoord(lat, lng);
      setStartPlace(geo);
      setStartQuery(geo.name);
      setPickingMode('none');
      setStatusMessage(`Start location set to: ${geo.name}`);
      if (endPlace) {
        await calculateRoutes(geo, endPlace, viaPoints);
      }
      return;
    }

    if (pickingMode === 'end') {
      const geo = await reverseGeocodeCoord(lat, lng);
      setEndPlace(geo);
      setEndQuery(geo.name);
      setPickingMode('none');
      setStatusMessage(`Destination set to: ${geo.name}`);
      if (startPlace) {
        await calculateRoutes(startPlace, geo, viaPoints);
      }
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

    // Default: Click anywhere on a small village road or junction to add it into the bus route!
    if (!startPlace || !endPlace) {
      setErrorMessage('Please select Start and End locations first, then click on any village or small road to route through it.');
      return;
    }

    setStatusMessage('Reverse geocoding clicked road / village...');
    const geo = await reverseGeocodeCoord(lat, lng);

    const newVia = {
      id: `via-road-${Date.now()}`,
      query: geo.name,
      place: geo,
    };

    const updated = [...viaPoints, newVia];
    setViaPoints(updated);
    setStatusMessage(`Added small route point: ${geo.name}`);

    await calculateRoutes(startPlace, endPlace, updated);
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

  // Tile layer URL supporting high-detail narrow village roads & aerial satellite view
  const getTileUrl = () => {
    if (mapType === 'hot') {
      return 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png'; // Humanitarian OSM (Bold High-Contrast Narrow Village Roads & Tracks)
    }
    if (mapType === 'satellite') {
      return 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}'; // Google Satellite Hybrid (Aerial visible village roads & alleys)
    }
    if (mapType === 'cyclosm') {
      return 'https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png'; // CyclOSM (Narrow Lanes & Paths)
    }
    if (mapType === 'google') {
      return 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}'; // Google Roadmap
    }
    if (mapType === 'terrain') {
      return 'https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}'; // Google Terrain
    }
    return 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'; // Standard OpenStreetMap
  };

  const getTileAttribution = () => {
    if (mapType === 'google' || mapType === 'satellite' || mapType === 'terrain') {
      return '&copy; Google Maps';
    }
    if (mapType === 'hot') {
      return '&copy; OpenStreetMap contributors, Humanitarian OpenStreetMap Team (Narrow Village Roads)';
    }
    if (mapType === 'cyclosm') {
      return '&copy; OpenStreetMap contributors, CyclOSM';
    }
    return '&copy; OpenStreetMap contributors (Detailed Village Panchayat Roads)';
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
                    if (endPlace) {
                      calculateRoutes(place, endPlace, viaPoints);
                    }
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
                            biasCoords={getBiasForVia(idx)}
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
                    label="Destination / College (e.g. Vemu Institute of Technology)"
                    placeholder="e.g. Vemu Institute of Technology, P.Kothakota..."
                    value={endQuery}
                    onChange={(val) => {
                      setEndQuery(val);
                      if (!val) setEndPlace(null);
                    }}
                    onSelectPlace={(place) => {
                      setEndPlace(place);
                      setEndQuery(place.name);
                      setStatusMessage(`Destination set to: ${place.name}`);
                      if (startPlace) {
                        calculateRoutes(startPlace, place, viaPoints);
                      }
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
                      placeholder="e.g. Route 1 - Pakala to Vemu Institute of Technology via Damalcheruvu"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-purple-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Description</label>
                    <input
                      type="text"
                      value={routeDescription}
                      onChange={(e) => setRouteDescription(e.target.value)}
                      placeholder="e.g. Vemu Institute of Technology transit via scheduled village stops"
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
            <div className="absolute top-4 right-4 z-20 flex flex-wrap items-center gap-1.5 bg-white/95 backdrop-blur-md p-1.5 rounded-2xl shadow-lg border border-slate-200 max-w-[calc(100%-2rem)]">
              <span className="text-[11px] font-black text-slate-600 px-1.5 flex items-center gap-1">
                <Layers className="h-3.5 w-3.5 text-purple-600" /> Map:
              </span>

              <button
                type="button"
                onClick={() => setMapType('hot')}
                className={`text-[11px] font-bold px-2.5 py-1 rounded-xl transition-all ${
                  mapType === 'hot' ? 'bg-purple-700 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                }`}
                title="Humanitarian OpenStreetMap: high-contrast narrow village roads, tracks, hamlets & paths"
              >
                Narrow Roads (HOT)
              </button>

              <button
                type="button"
                onClick={() => setMapType('satellite')}
                className={`text-[11px] font-bold px-2.5 py-1 rounded-xl transition-all ${
                  mapType === 'satellite' ? 'bg-purple-700 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                }`}
                title="Aerial satellite imagery: reveals real narrow village dirt tracks, alleys and houses"
              >
                Satellite (Aerial)
              </button>

              <button
                type="button"
                onClick={() => setMapType('cyclosm')}
                className={`text-[11px] font-bold px-2.5 py-1 rounded-xl transition-all ${
                  mapType === 'cyclosm' ? 'bg-purple-700 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                }`}
                title="CyclOSM: detailed narrow rural lanes and connectors"
              >
                Rural Lanes
              </button>

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
                onClick={() => setMapType('osm')}
                className={`text-[11px] font-bold px-2.5 py-1 rounded-xl transition-all ${
                  mapType === 'osm' ? 'bg-purple-700 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Standard
              </button>

              {/* Toggle Village Numbers on Map */}
              <button
                type="button"
                onClick={() => setShowVillagePins(!showVillagePins)}
                className={`text-[11px] font-bold px-2.5 py-1 rounded-xl flex items-center gap-1 transition-all border ${
                  showVillagePins
                    ? 'bg-purple-50 text-purple-800 border-purple-300 shadow-xs'
                    : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                }`}
                title="Toggle numbered village markers on the map"
              >
                <span>🏡</span>
                <span>{showVillagePins ? `Villages (${nearbyVillages.length})` : 'Show Villages'}</span>
              </button>

              {/* Toggle Village Numbers Quick Index Directory */}
              <button
                type="button"
                onClick={() => setShowVillageList(!showVillageList)}
                className={`text-[11px] font-bold px-2.5 py-1 rounded-xl flex items-center gap-1 transition-all border ${
                  showVillageList
                    ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
                title="Open index directory of all numbered villages"
              >
                <span>📋</span>
                <span>Numbers Index</span>
              </button>

              {/* Fit Route / Recenter Button */}
              <button
                type="button"
                onClick={() => setFitBoundsTrigger((prev) => prev + 1)}
                className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 flex items-center gap-1 transition-all"
                title="Recenter and fit route in view"
              >
                <Crosshair className="h-3.5 w-3.5 text-purple-600" />
                <span>Fit Route</span>
              </button>
            </div>

            {/* Floating Village Numbers Index Directory Card */}
            {showVillageList && (
              <div className="absolute top-16 right-4 z-30 w-72 max-h-[380px] bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-fade-in">
                <div className="p-2.5 bg-gradient-to-r from-purple-900 to-indigo-900 text-white flex items-center justify-between text-xs font-bold">
                  <span className="flex items-center gap-1.5">
                    <span>🏡</span>
                    <span>Village Numbers Directory ({nearbyVillages.length})</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowVillageList(false)}
                    className="text-slate-300 hover:text-white text-xs px-1"
                  >
                    ✕
                  </button>
                </div>
                <div className="p-1.5 overflow-y-auto divide-y divide-slate-100 text-xs max-h-[320px]">
                  {nearbyVillages.map((v, idx) => (
                    <div key={v.id || idx} className="py-1.5 px-1.5 flex items-center justify-between gap-2 hover:bg-purple-50/60 rounded-xl transition-colors">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="shrink-0 w-5 h-5 rounded-full bg-purple-700 text-white font-black text-[10px] flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <div className="truncate">
                          <div className="font-bold text-slate-800 text-[11px] truncate">{v.name}</div>
                          <div className="text-[9px] text-slate-400 truncate">{v.secondary}</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAddVillageToRoute(v)}
                        className="shrink-0 text-[10px] bg-purple-100 hover:bg-purple-200 text-purple-800 font-bold px-2 py-1 rounded-lg"
                        title={`Add #${idx + 1} ${v.name} to route`}
                      >
                        + Add
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
              <div className="absolute bottom-4 left-4 z-20 bg-navy-900/95 backdrop-blur-md text-white text-[11px] px-3.5 py-2 rounded-xl shadow-lg border border-white/10 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>🏡 Click any village pin or road to add to route • Drag pins (A, B, Via) to adjust</span>
              </div>
            )}

            {/* Interactive Leaflet Map with High-Zoom Village & Rural Road Capability */}
            <MapContainer
              center={startPlace ? [startPlace.lat, startPlace.lng] : [13.3420, 79.0830]}
              zoom={13}
              maxZoom={20}
              scrollWheelZoom={true}
              style={{ height: '100%', width: '100%', minHeight: '480px' }}
              className="z-10 flex-1"
            >
              <TileLayer
                attribution={getTileAttribution()}
                url={getTileUrl()}
                maxZoom={20}
                maxNativeZoom={19}
              />

              {/* Fit bounds smoothly only when new route is computed or Fit Route is clicked */}
              <MapBoundsUpdater triggerKey={fitBoundsTrigger} points={allMapPoints} />

              {/* Click handler */}
              <MapClickHandler onMapClick={handleMapClick} />

              {/* Clickable Small Village Pins across the region rendered as clean numbers */}
              {showVillagePins && nearbyVillages.map((v, idx) => (
                <Marker
                  key={v.id || idx}
                  position={[v.lat, v.lng]}
                  icon={numberedVillageIcon(idx + 1)}
                >
                  <Tooltip direction="top" offset={[0, -12]} opacity={0.95} permanent={false}>
                    <span className="font-extrabold text-[11px] text-purple-950 bg-white/95 px-1.5 py-0.5 rounded shadow">
                      #{idx + 1} {v.name}
                    </span>
                  </Tooltip>
                  <Popup>
                    <div className="p-1 space-y-1.5 text-xs max-w-[215px]">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                        <span className="font-black text-purple-700 uppercase text-[10px] flex items-center gap-1">
                          <span className="w-4 h-4 rounded-full bg-purple-700 text-white flex items-center justify-center text-[9px] font-black">{idx + 1}</span>
                          Village #{idx + 1}
                        </span>
                        <span className="text-[9px] bg-purple-50 text-purple-700 px-1 py-0.5 rounded font-bold">{v.type || 'Village'}</span>
                      </div>
                      <div className="font-bold text-slate-900 leading-tight">{v.name}</div>
                      {v.secondary && <div className="text-[10px] text-slate-500 leading-normal">{v.secondary}</div>}
                      <button
                        type="button"
                        onClick={() => handleAddVillageToRoute(v)}
                        className="w-full mt-1.5 btn-primary bg-purple-700 hover:bg-purple-800 text-white text-[10px] py-1.5 px-2.5 font-bold flex items-center justify-center gap-1 rounded-xl shadow-xs transition-all"
                      >
                        <Plus className="h-3 w-3" />
                        <span>Add #{idx + 1} to Route</span>
                      </button>
                    </div>
                  </Popup>
                </Marker>
              ))}

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

              {/* Origin Marker (A) - Draggable */}
              {startPlace && (
                <Marker
                  position={[startPlace.lat, startPlace.lng]}
                  icon={startIcon}
                  draggable={true}
                  eventHandlers={{
                    dragend: handleStartDragEnd,
                  }}
                >
                  <Tooltip direction="top" offset={[0, -18]} permanent={false}>
                    <span className="font-black text-[11px] text-emerald-800 bg-white/95 px-1.5 py-0.5 rounded-lg shadow-sm border border-emerald-200">
                      A: {startPlace.name} (Drag to change)
                    </span>
                  </Tooltip>
                  <Popup>
                    <div className="p-1 space-y-0.5">
                      <div className="text-[10px] font-black text-emerald-600 uppercase flex items-center justify-between">
                        <span>Origin Terminal (A)</span>
                        <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1 py-0.2 rounded font-bold">Draggable</span>
                      </div>
                      <div className="font-bold text-xs text-navy-900">{startPlace.name}</div>
                      {startPlace.secondary && (
                        <div className="text-[10px] text-slate-500">{startPlace.secondary}</div>
                      )}
                      <div className="text-[10px] text-emerald-700 font-semibold pt-1">
                        Drag this pin anywhere to change the starting point!
                      </div>
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* Via Points Markers - Draggable */}
              {viaPoints.filter(v => v.place).map((vp, i) => (
                <Marker
                  key={vp.id}
                  position={[vp.place.lat, vp.place.lng]}
                  icon={viaIcon(i + 1)}
                  draggable={true}
                  eventHandlers={{
                    dragend: (e) => handleViaDragEnd(e, i),
                  }}
                >
                  <Tooltip direction="top" offset={[0, -16]} permanent={false}>
                    <span className="font-bold text-[11px] text-purple-900 bg-white/95 px-1.5 py-0.5 rounded-lg shadow-sm border border-purple-200">
                      Via #{i + 1}: {vp.place.name} (Draggable)
                    </span>
                  </Tooltip>
                  <Popup>
                    <div className="p-1 space-y-0.5">
                      <div className="text-[10px] font-black text-purple-700 uppercase flex items-center justify-between">
                        <span>Via Point #{i + 1}</span>
                        <span className="text-[9px] bg-purple-100 text-purple-800 px-1 py-0.2 rounded font-bold">Draggable</span>
                      </div>
                      <div className="font-bold text-xs text-navy-900">{vp.place.name}</div>
                      {vp.place.secondary && (
                        <div className="text-[10px] text-slate-500">{vp.place.secondary}</div>
                      )}
                      <div className="text-[10px] text-purple-700 font-semibold pt-1">
                        Drag pin to reposition via point on road!
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}

              {/* Destination Marker (B) - Draggable */}
              {endPlace && (
                <Marker
                  position={[endPlace.lat, endPlace.lng]}
                  icon={endIcon}
                  draggable={true}
                  eventHandlers={{
                    dragend: handleEndDragEnd,
                  }}
                >
                  <Tooltip direction="top" offset={[0, -18]} permanent={false}>
                    <span className="font-black text-[11px] text-red-800 bg-white/95 px-1.5 py-0.5 rounded-lg shadow-sm border border-red-200">
                      B: {endPlace.name} (Drag to change)
                    </span>
                  </Tooltip>
                  <Popup>
                    <div className="p-1 space-y-0.5">
                      <div className="text-[10px] font-black text-red-600 uppercase flex items-center justify-between">
                        <span>Destination Terminal (B)</span>
                        <span className="text-[9px] bg-red-100 text-red-800 px-1 py-0.2 rounded font-bold">Draggable</span>
                      </div>
                      <div className="font-bold text-xs text-navy-900">{endPlace.name}</div>
                      {endPlace.secondary && (
                        <div className="text-[10px] text-slate-500">{endPlace.secondary}</div>
                      )}
                      <div className="text-[10px] text-red-700 font-semibold pt-1">
                        Drag this pin anywhere to change the destination!
                      </div>
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* Intermediate Bus Stop Markers (#1, #2, #3...) - Draggable */}
              {stops.slice(1, -1).map((stop, idx) => (
                <Marker
                  key={stop.id || idx}
                  position={[stop.lat, stop.lng]}
                  icon={stopIcon(idx + 1)}
                  draggable={true}
                  eventHandlers={{
                    dragend: (e) => handleStopDragEnd(e, idx + 1),
                  }}
                >
                  <Tooltip direction="top" offset={[0, -15]} permanent={false}>
                    <span className="font-bold text-[11px] text-slate-800 bg-white/95 px-1 py-0.5 rounded shadow">
                      #{idx + 1} {stop.name}
                    </span>
                  </Tooltip>
                  <Popup>
                    <div className="p-1 space-y-1">
                      <div className="text-[10px] font-bold text-sky-600 uppercase flex items-center justify-between">
                        <span>Bus Stop #{idx + 1}</span>
                        <span className="text-[9px] bg-sky-100 text-sky-800 px-1 py-0.2 rounded font-bold">Draggable</span>
                      </div>
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
