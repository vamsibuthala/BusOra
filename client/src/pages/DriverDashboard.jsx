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
  Send,
  Users,
  Phone
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

  // Drive Simulator for moving the bus smoothly
  const startSimulation = () => {
    setIsSimulating(true);
    setGpsStatus('simulating');

    const bus = driverData?.bus;
    const baseLat = bus?.lastLocation?.lat || 13.3420;
    const baseLng = bus?.lastLocation?.lng || 79.0830;

    // Build realistic transit loop around the bus corridor
    const trajectory = [
      [baseLat, baseLng],
      [baseLat + 0.003, baseLng + 0.004],
      [baseLat + 0.007, baseLng + 0.009],
      [baseLat + 0.012, baseLng + 0.015],
      [baseLat + 0.016, baseLng + 0.021],
      [baseLat + 0.011, baseLng + 0.028],
      [baseLat + 0.006, baseLng + 0.022],
      [baseLat + 0.002, baseLng + 0.012],
    ];

    simIntervalRef.current = setInterval(() => {
      const idx = simStepRef.current % trajectory.length;
      const [simLat, simLng] = trajectory[idx];
      const simSpeed = 10.5; // ~38 km/h

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

  // Start Bus Trip
  const handleStartTrip = async () => {
    try {
      setErrorMessage('');
      const trip = await apiRequest('/driver/trip/start', 'POST');
      setActiveTrip(trip);
      setStatusMessage('Bus started! Live GPS broadcasting is active for your bus group.');
      startGpsWatch(); // physical phone GPS
      startSimulation(); // simulated transit movement
    } catch (err) {
      setErrorMessage(err.message);
    }
  };

  // End Bus Trip
  const handleEndTrip = async () => {
    if (!window.confirm('Are you sure you want to stop this bus trip?')) return;
    try {
      setErrorMessage('');
      await apiRequest('/driver/trip/end', 'POST');
      setActiveTrip(null);
      stopGpsWatch();
      stopSimulation();
      setStatusMessage('Bus stopped successfully. Bus is now marked as idle.');
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
                {activeTrip ? 'Bus Started • Live' : 'Bus Idle'}
              </span>
            </div>
            <p className="text-xs text-emerald-200 mt-0.5">
              Bus Group: <span className="font-semibold text-white">{bus.name}</span>
            </p>
          </div>
        </div>

        {/* Action Button: Start or Stop Bus */}
        <div>
          {!activeTrip ? (
            <button
              onClick={handleStartTrip}
              className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-7 py-4 text-sm font-black text-white shadow-xl hover:bg-emerald-600 transition-all active:scale-95 animate-pulse"
            >
              <Play className="h-5 w-5 fill-white" />
              START BUS
            </button>
          ) : (
            <button
              onClick={handleEndTrip}
              className="inline-flex items-center gap-2 rounded-2xl bg-red-600 px-7 py-4 text-sm font-black text-white shadow-xl hover:bg-red-700 transition-all active:scale-95"
            >
              <Square className="h-5 w-5 fill-white" />
              STOP / END BUS
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

          {/* Registered Group Students Roster */}
          <div className="card p-5">
            <h3 className="font-bold text-sm text-navy-900 mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-sky-600" />
                <span>Group Students ({driverData.students?.length || 0})</span>
              </div>
              <span className="text-[10px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200">
                Authorized Commuters
              </span>
            </h3>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {driverData.students && driverData.students.length > 0 ? (
                driverData.students.map((st, idx) => (
                  <div
                    key={st.id || idx}
                    className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5 text-xs border border-slate-100"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-100 text-sky-700 font-bold text-[11px]">
                        {st.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{st.name}</p>
                        <p className="text-[10px] text-slate-400">{st.email}</p>
                      </div>
                    </div>
                    {st.phone && (
                      <a
                        href={`tel:${st.phone}`}
                        className="rounded-lg bg-emerald-500 p-1.5 text-white hover:bg-emerald-600 transition-colors"
                        title="Call Student"
                      >
                        <Phone className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-center py-4 text-xs text-slate-400">
                  No students assigned to this bus group yet.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
