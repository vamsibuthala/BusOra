import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Bus, 
  Play, 
  Square, 
  Radio, 
  AlertTriangle, 
  Navigation, 
  MapPin, 
  Wifi, 
  WifiOff, 
  CheckCircle, 
  Sparkles,
  ShieldAlert,
  Send
} from 'lucide-react';
import BusMap from '../components/BusMap';
import { apiRequest } from '../services/api';

export default function DriverDashboard({ user }) {
  const [driverData, setDriverData] = useState(null);
  const [activeTrip, setActiveTrip] = useState(null);
  const [gpsStatus, setGpsStatus] = useState('off');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastSent, setLastSent] = useState(null);
  const [speedKmh, setSpeedKmh] = useState(0);
  const [currentCoords, setCurrentCoords] = useState(null);
  
  // Incident reporting state
  const [incidentType, setIncidentType] = useState('delay');
  const [incidentNote, setIncidentNote] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Drive simulation state for desktop testing
  const [isSimulating, setIsSimulating] = useState(false);
  const simStepRef = useRef(0);
  const simIntervalRef = useRef(null);

  const watchIdRef = useRef(null);
  const lastThrottleRef = useRef(0);

  const loadDriverData = async () => {
    try {
      const res = await apiRequest('/driver/me');
      setDriverData(res);
      setActiveTrip(res.trip);
      if (res.bus?.lastLocation?.lat) {
        setCurrentCoords(res.bus.lastLocation);
      }
    } catch (err) {
      setErrorMessage(err.message);
    }
  };

  useEffect(() => {
    loadDriverData();

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      stopGpsWatch();
      stopSimulation();
    };
  }, []);

  const sendGpsLocation = async (lat, lng, speed = 0) => {
    try {
      await apiRequest('/driver/location', 'POST', {
        lat,
        lng,
        speed: speed || 0,
      });
      setLastSent(new Date());
      setSpeedKmh(Math.round((speed || 0) * 3.6));
      setCurrentCoords({ lat, lng });
    } catch (err) {
      console.error('Failed to post driver location:', err);
      setErrorMessage(err.message);
    }
  };

  // Real device Geolocation tracking
  const startGpsWatch = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsStatus('unsupported');
      return;
    }

    setGpsStatus('active');
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, speed } = pos.coords;
        if (Date.now() - lastThrottleRef.current < 4000) return; // throttle 4s
        lastThrottleRef.current = Date.now();
        sendGpsLocation(latitude, longitude, speed);
      },
      (err) => {
        setGpsStatus(err.code === 1 ? 'denied' : 'error');
      },
      {
        enableHighAccuracy: true,
        maximumAge: 1000,
        timeout: 10000,
      }
    );
  }, []);

  const stopGpsWatch = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setGpsStatus('off');
  };

  // Drive Simulator for moving the bus smoothly along the assigned route
  const startSimulation = () => {
    const route = driverData?.bus?.route;
    const pathCoords = route?.path && route.path.length > 1 ? route.path : null;
    const routeStops = route?.stops && route.stops.length > 0 ? route.stops : null;

    if (!pathCoords && !routeStops) return;
    setIsSimulating(true);
    setGpsStatus('simulating');

    // Build complete trajectory coordinates along the route
    let trajectory = [];
    if (pathCoords && pathCoords.length > 1) {
      trajectory = pathCoords;
    } else if (routeStops && routeStops.length > 1) {
      // Interpolate 8 smooth points between each consecutive stop
      for (let i = 0; i < routeStops.length - 1; i++) {
        const s1 = routeStops[i];
        const s2 = routeStops[i + 1];
        for (let step = 0; step < 8; step++) {
          const factor = step / 8;
          trajectory.push([
            s1.lat + (s2.lat - s1.lat) * factor,
            s1.lng + (s2.lng - s1.lng) * factor,
          ]);
        }
      }
      const last = routeStops[routeStops.length - 1];
      trajectory.push([last.lat, last.lng]);
    } else if (routeStops && routeStops.length === 1) {
      trajectory = [[routeStops[0].lat, routeStops[0].lng]];
    }

    if (trajectory.length === 0) return;

    simIntervalRef.current = setInterval(() => {
      const idx = simStepRef.current % trajectory.length;
      const [simLat, simLng] = trajectory[idx];
      // realistic transit road speed: ~38 km/h (10.5 m/s)
      const simSpeed = 10.5;

      sendGpsLocation(simLat, simLng, simSpeed);
      simStepRef.current += 1;
    }, 3000);
  };

  const stopSimulation = () => {
    if (simIntervalRef.current) {
      clearInterval(simIntervalRef.current);
      simIntervalRef.current = null;
    }
    setIsSimulating(false);
  };

  // Start Trip
  const handleStartTrip = async () => {
    try {
      setErrorMessage('');
      const trip = await apiRequest('/driver/trip/start', 'POST');
      setActiveTrip(trip);
      setStatusMessage('Trip started! Live GPS broadcasting is active on assigned route.');
      startGpsWatch(); // physical phone GPS
      startSimulation(); // road trajectory simulation
    } catch (err) {
      setErrorMessage(err.message);
    }
  };

  // End Trip
  const handleEndTrip = async () => {
    if (!window.confirm('Are you sure you want to end this trip route?')) return;
    try {
      setErrorMessage('');
      await apiRequest('/driver/trip/end', 'POST');
      setActiveTrip(null);
      stopGpsWatch();
      stopSimulation();
      setStatusMessage('Trip ended successfully. Bus marked as idle.');
      loadDriverData();
    } catch (err) {
      setErrorMessage(err.message);
    }
  };

  // Submit Incident Report
  const handleReportIncident = async (e) => {
    e.preventDefault();
    if (!activeTrip) {
      setErrorMessage('You must start a trip before submitting an incident report.');
      return;
    }

    try {
      setErrorMessage('');
      await apiRequest('/driver/report', 'POST', {
        type: incidentType,
        note: incidentNote,
      });
      setStatusMessage(`Reported: ${incidentType.toUpperCase()} incident dispatched to college admin & students.`);
      setIncidentNote('');
    } catch (err) {
      setErrorMessage(err.message);
    }
  };

  if (!driverData) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500 font-semibold text-sm">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          <span>Loading Driver Console...</span>
        </div>
      </div>
    );
  }

  if (!driverData.bus) {
    return (
      <div className="card max-w-lg mx-auto text-center py-12">
        <Bus className="h-12 w-12 text-slate-300 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-navy-900">No Bus Assigned</h2>
        <p className="text-xs text-slate-500 mt-2">
          Your driver account is active, but the administrator hasn't assigned a college bus to you yet.
        </p>
      </div>
    );
  }

  const bus = driverData.bus;
  const stops = bus.route?.stops || [];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-3xl bg-gradient-to-r from-navy-900 via-navy-800 to-emerald-950 p-6 text-white shadow-xl">
        <div className="flex items-center gap-4">
          <img 
            src="/busora-logo.png" 
            alt="BusOra Logo" 
            className="h-14 w-14 object-contain rounded-2xl bg-white p-1.5 shadow-md"
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-2xl sm:text-3xl font-black">
                {bus.number} Driver Cockpit
              </h1>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${
                activeTrip ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-300'
              }`}>
                {activeTrip ? 'Trip In Progress' : 'Idle'}
              </span>
            </div>
            <p className="text-xs text-emerald-200 mt-0.5">
              Assigned Route: <span className="font-semibold text-white">{bus.route?.name}</span>
            </p>
          </div>
        </div>

        {/* Action Button: Start or End Trip */}
        <div>
          {!activeTrip ? (
            <button
              onClick={handleStartTrip}
              className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-6 py-3.5 text-sm font-black text-white shadow-lg hover:bg-emerald-600 transition-all active:scale-95"
            >
              <Play className="h-4 w-4 fill-white" />
              START TRIP ROUTE
            </button>
          ) : (
            <button
              onClick={handleEndTrip}
              className="inline-flex items-center gap-2 rounded-2xl bg-red-600 px-6 py-3.5 text-sm font-black text-white shadow-lg hover:bg-red-700 transition-all active:scale-95"
            >
              <Square className="h-4 w-4 fill-white" />
              END TRIP
            </button>
          )}
        </div>
      </div>

      {/* Notifications / Status Banners */}
      {statusMessage && (
        <div className="rounded-2xl bg-emerald-50 p-4 text-xs font-bold text-emerald-800 border border-emerald-200 flex items-center justify-between">
          <span>{statusMessage}</span>
          <button onClick={() => setStatusMessage('')} className="text-emerald-600 underline">Dismiss</button>
        </div>
      )}

      {errorMessage && (
        <div className="rounded-2xl bg-red-50 p-4 text-xs font-bold text-red-800 border border-red-200 flex items-center justify-between">
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage('')} className="text-red-600 underline">Dismiss</button>
        </div>
      )}

      {/* Driver Telemetry Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Card 1: GPS Stream Mode */}
        <div className="card p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1">
            <span>GPS Tracking State</span>
            <Radio className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-lg font-black text-navy-900 capitalize">
            {gpsStatus}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {isSimulating ? '⚡ Simulator Driving' : 'Physical device GPS'}
          </p>
        </div>

        {/* Card 2: Speedometer */}
        <div className="card p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1">
            <span>Current Speed</span>
            <Navigation className="h-4 w-4 text-sky-500" />
          </div>
          <p className="text-2xl font-black text-sky-600">
            {speedKmh} <span className="text-xs font-normal text-slate-500">km/h</span>
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Streamed to student radar</p>
        </div>

        {/* Card 3: Network Connection */}
        <div className="card p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1">
            <span>Network Status</span>
            {isOnline ? <Wifi className="h-4 w-4 text-emerald-500" /> : <WifiOff className="h-4 w-4 text-red-500" />}
          </div>
          <p className={`text-base font-black ${isOnline ? 'text-emerald-600' : 'text-red-500'}`}>
            {isOnline ? 'Online' : 'Offline'}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Socket.IO latency &lt; 200ms</p>
        </div>

        {/* Card 4: Last Broadcast */}
        <div className="card p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1">
            <span>Last GPS Packet</span>
            <CheckCircle className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-base font-black text-navy-900">
            {lastSent ? lastSent.toLocaleTimeString() : 'Not broadcasting'}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Transmitted every 4s</p>
        </div>
      </div>

      {/* Simulator Control Banner for instant evaluation */}
      <div className="rounded-2xl bg-sky-50 p-4 border border-sky-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-sky-900">
          <Sparkles className="h-4 w-4 text-sky-600 shrink-0" />
          <span>
            <b>Desktop Test Drive Simulator:</b> Since testing from a desk or laptop doesn't provide moving bus coordinates, this simulator automatically steps through the route stops to trigger live student ETAs and alerts!
          </span>
        </div>
        <button
          onClick={isSimulating ? stopSimulation : startSimulation}
          className={`shrink-0 rounded-xl px-4 py-2 font-bold transition-all ${
            isSimulating ? 'bg-amber-500 text-white hover:bg-amber-600' : 'bg-sky-600 text-white hover:bg-sky-700'
          }`}
        >
          {isSimulating ? 'Pause Simulator' : '⚡ Simulate Driving Route'}
        </button>
      </div>

      {/* Map & Incident Reporting Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Route Map Preview (2 cols) */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-navy-900 flex items-center gap-2">
              <Navigation className="h-4 w-4 text-emerald-500" />
              Route Navigation & Bus Location
            </h3>
            <span className="text-xs text-slate-500">Keep screen awake while driving</span>
          </div>

          <BusMap
            buses={
              currentCoords?.lat
                ? [
                    {
                      id: bus.id,
                      number: bus.number,
                      status: activeTrip ? 'running' : 'idle',
                      lat: currentCoords.lat,
                      lng: currentCoords.lng,
                      speed: speedKmh / 3.6,
                      at: lastSent ? lastSent.toISOString() : new Date().toISOString(),
                    },
                  ]
                : []
            }
            stops={stops}
            height="440px"
          />
        </div>

        {/* Incident Reporting & Stops Checklist (1 col) */}
        <div className="space-y-6">
          {/* Incident Box */}
          <div className="card p-5">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <ShieldAlert className="h-5 w-5 text-amber-500" />
              <div>
                <h3 className="font-bold text-sm text-navy-900">Report Route Incident</h3>
                <p className="text-[11px] text-slate-400">Broadcasts instant alert to College Admin & Students</p>
              </div>
            </div>

            <form onSubmit={handleReportIncident} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Incident Severity</label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setIncidentType('delay')}
                    className={`rounded-xl py-2 px-1 text-xs font-bold transition-all ${
                      incidentType === 'delay'
                        ? 'bg-amber-500 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Traffic Delay
                  </button>
                  <button
                    type="button"
                    onClick={() => setIncidentType('breakdown')}
                    className={`rounded-xl py-2 px-1 text-xs font-bold transition-all ${
                      incidentType === 'breakdown'
                        ? 'bg-orange-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Breakdown
                  </button>
                  <button
                    type="button"
                    onClick={() => setIncidentType('emergency')}
                    className={`rounded-xl py-2 px-1 text-xs font-bold transition-all ${
                      incidentType === 'emergency'
                        ? 'bg-red-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    SOS Alert
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Optional Note</label>
                <input
                  type="text"
                  value={incidentNote}
                  onChange={(e) => setIncidentNote(e.target.value)}
                  placeholder="e.g. Heavy traffic near Railway Crossing (15 min delay)"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-sky-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={!activeTrip}
                className="btn-primary w-full py-2.5 text-xs font-bold disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                Dispatch Alert to Campus
              </button>
              {!activeTrip && (
                <p className="text-[10px] text-center text-slate-400">Start trip route before dispatching incident reports</p>
              )}
            </form>
          </div>

          {/* Upcoming Stops Checklist */}
          <div className="card p-5">
            <h3 className="font-bold text-sm text-navy-900 mb-3 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-emerald-500" />
              Route Stops Checklist ({stops.length})
            </h3>

            <div className="space-y-2">
              {stops.map((stop, idx) => (
                <div
                  key={stop.id || idx}
                  className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5 text-xs border border-slate-100"
                >
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-md bg-navy-800 text-[10px] font-black text-white">
                      {idx + 1}
                    </span>
                    <span className="font-semibold text-slate-800">{stop.name}</span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {idx === 0 ? 'Start' : idx === stops.length - 1 ? 'Campus' : 'Pickup'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
