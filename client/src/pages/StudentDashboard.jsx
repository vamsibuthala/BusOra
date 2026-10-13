import React, { useState, useEffect } from 'react';
import { 
  Bus, 
  MapPin, 
  Clock, 
  Navigation, 
  AlertTriangle, 
  CheckCircle2, 
  Bell, 
  Phone, 
  Radio, 
  RotateCw,
  ShieldAlert
} from 'lucide-react';
import BusMap from '../components/BusMap';
import { apiRequest, getSocket } from '../services/api';

const kmDistance = (a, b) => {
  if (!a || !b || !a.lat || !b.lat) return null;
  const r = (x) => (x * Math.PI) / 180;
  const d = r(b.lat - a.lat);
  const e = r(b.lng - a.lng);
  return 12742 * Math.asin(Math.sqrt(Math.sin(d / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(e / 2) ** 2));
};

const formatTimeAgo = (iso) => {
  if (!iso) return 'never';
  const sec = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.round(sec / 60);
  return `${min} min ago`;
};

export default function StudentDashboard({ user }) {
  const [data, setData] = useState(null);
  const [busLocation, setBusLocation] = useState(null);
  const [busStatus, setBusStatus] = useState('idle');
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  const fetchStudentData = async () => {
    try {
      const res = await apiRequest('/student/bus');
      setData(res);
      if (res.bus?.lastLocation?.lat) {
        setBusLocation(res.bus.lastLocation);
      }
      if (res.bus?.status) {
        setBusStatus(res.bus.status);
      }
      setLastRefreshed(new Date());
    } catch (err) {
      console.error('Failed to fetch student bus info:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const list = await apiRequest('/notifications');
      setNotifications(list || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchStudentData();
    fetchNotifications();

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Connect socket for real-time live location & notifications
    const socket = getSocket();

    const handleLocation = (payload) => {
      setBusLocation({
        lat: payload.lat,
        lng: payload.lng,
        speed: payload.speed,
        at: payload.at,
      });
      setBusStatus('running');
    };

    const handleStatus = (payload) => {
      setBusStatus(payload.status);
    };

    const handleNotification = (notif) => {
      setNotifications((prev) => [notif, ...prev]);
      if ('Notification' in window && Notification.permission === 'granted') {
        new window.Notification('BusOra Alert', { body: notif.message, icon: '/busora-logo.png' });
      }
    };

    socket.on('location', handleLocation);
    socket.on('bus-status', handleStatus);
    socket.on('notification', handleNotification);

    // Periodic heartbeat sync
    const interval = setInterval(fetchStudentData, 8000);

    return () => {
      socket.off('location', handleLocation);
      socket.off('bus-status', handleStatus);
      socket.off('notification', handleNotification);
      clearInterval(interval);
    };
  }, []);

  const handleMarkNotificationsRead = async () => {
    try {
      await apiRequest('/notifications/read', 'POST');
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500 font-semibold text-sm">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
          <span>Connecting to BusOra Satellite Feed...</span>
        </div>
      </div>
    );
  }

  if (!data?.bus) {
    return (
      <div className="mx-auto max-w-2xl text-center py-16 card">
        <Bus className="h-12 w-12 text-slate-300 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-navy-900">No College Bus Assigned Yet</h2>
        <p className="text-xs text-slate-500 mt-2 max-w-md mx-auto">
          Your student profile is active, but an administrator has not yet assigned you to a specific bus route or boarding stop.
        </p>
      </div>
    );
  }

  const bus = data.bus;
  const userStop = data.stop;
  const stops = bus.route?.stops || [];
  
  // Calculate distance & ETA
  const dist = busLocation?.lat && userStop?.lat ? kmDistance(busLocation, userStop) : null;
  const speedKmh = busLocation?.speed ? busLocation.speed * 3.6 : 25; // default 25 km/h if static
  const etaMinutes = dist != null ? Math.max(1, Math.round((dist / (speedKmh > 5 ? speedKmh : 25)) * 60)) : null;

  const isStale = busLocation?.at && Date.now() - new Date(busLocation.at).getTime() > 60000;

  return (
    <div className="space-y-6">
      {/* Top Banner with Bus & Driver Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-3xl bg-gradient-to-r from-navy-900 via-navy-800 to-sky-900 p-6 text-white shadow-xl">
        <div className="flex items-center gap-4">
          <img 
            src="/busora-logo.png" 
            alt="BusOra Logo" 
            className="h-14 w-14 object-contain rounded-2xl bg-white p-1.5 shadow-md"
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-2xl sm:text-3xl font-black">
                Bus {bus.number}
              </h1>
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${
                busStatus === 'running' && !isStale
                  ? 'bg-emerald-500 text-white'
                  : busStatus === 'delayed'
                  ? 'bg-amber-500 text-white'
                  : 'bg-slate-700 text-slate-300'
              }`}>
                <Radio className="h-3 w-3" />
                {isStale ? 'GPS Offline' : busStatus}
              </span>
            </div>
            <p className="text-xs text-sky-200 mt-0.5">
              Route: <span className="font-semibold text-white">{bus.route?.name}</span>
            </p>
          </div>
        </div>

        {/* Driver contact badge */}
        <div className="flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-2.5 backdrop-blur-sm border border-white/10">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500 text-white font-bold text-sm">
            🚍
          </div>
          <div className="text-xs">
            <p className="text-slate-300">Driver on Duty</p>
            <p className="font-bold text-white">{bus.driver?.name || 'Assigned Driver'}</p>
          </div>
          {bus.driver?.phone && (
            <a
              href={`tel:${bus.driver.phone}`}
              className="ml-2 rounded-lg bg-emerald-500 p-2 text-white hover:bg-emerald-600 transition-colors"
              title="Call Driver"
            >
              <Phone className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </div>

      {/* Telemetry Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Metric 1: Boarding Stop */}
        <div className="card p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1">
            <span>Your Boarding Stop</span>
            <MapPin className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-lg font-black text-navy-900 truncate">
            {userStop?.name || 'Not assigned'}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Assigned pickup location</p>
        </div>

        {/* Metric 2: Live Distance */}
        <div className="card p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1">
            <span>Live Distance</span>
            <Navigation className="h-4 w-4 text-sky-500" />
          </div>
          <p className="text-lg font-black text-navy-900">
            {dist != null ? `${dist.toFixed(2)} km` : 'Calculating...'}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Straight line radar</p>
        </div>

        {/* Metric 3: Estimated Time of Arrival (ETA) */}
        <div className="card p-4 bg-gradient-to-br from-white to-sky-50/50 border-sky-200/80">
          <div className="flex items-center justify-between text-xs text-sky-700 font-bold mb-1">
            <span>Est. Arrival (ETA)</span>
            <Clock className="h-4 w-4 text-sky-600" />
          </div>
          <p className="text-2xl font-black text-sky-600">
            {etaMinutes != null ? `~${etaMinutes} mins` : 'Waiting for GPS'}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Based on live traffic speed</p>
        </div>

        {/* Metric 4: GPS Telemetry Freshness */}
        <div className="card p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1">
            <span>Satellite Sync</span>
            <RotateCw className="h-4 w-4 text-slate-400" />
          </div>
          <p className={`text-base font-black ${isStale ? 'text-red-500' : 'text-emerald-600'}`}>
            {isStale ? 'Signal Paused' : 'Live (< 5s)'}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Updated {formatTimeAgo(busLocation?.at)}</p>
        </div>
      </div>

      {/* GPS Stale Warning Banner if applicable */}
      {isStale && (
        <div className="flex items-center gap-3 rounded-2xl bg-amber-50 p-4 text-xs font-medium text-amber-800 border border-amber-200">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
          <span>
            <b>Signal Notice:</b> The driver's device has paused sending location updates (likely screen is locked or tab minimized). The bus's last recorded position is displayed on the map.
          </span>
        </div>
      )}

      {/* Map & Live Notifications Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Satellite Map (2 cols) */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-navy-900 flex items-center gap-2">
              <Radio className="h-4 w-4 text-sky-500" />
              Live Interactive Bus & Stop Radar
            </h3>
            <span className="text-xs text-slate-400">Auto-refresh active</span>
          </div>

          <BusMap
            buses={
              busLocation?.lat
                ? [
                    {
                      id: bus.id,
                      number: bus.number,
                      status: isStale ? 'offline' : busStatus,
                      lat: busLocation.lat,
                      lng: busLocation.lng,
                      speed: busLocation.speed,
                      at: busLocation.at,
                    },
                  ]
                : []
            }
            stops={stops}
            userStop={userStop}
            routePath={bus?.route?.path || null}
            mapType="google"
            height="440px"
          />
        </div>

        {/* Real-time Notifications & Route Sequence (1 col) */}
        <div className="space-y-6">
          {/* Notification List */}
          <div className="card p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-sky-500" />
                <h3 className="font-bold text-sm text-navy-900">Stop & Trip Alerts</h3>
              </div>
              <button
                onClick={handleMarkNotificationsRead}
                className="text-xs text-sky-600 hover:text-sky-700 font-semibold"
              >
                Mark read
              </button>
            </div>

            <div className="mt-3 max-h-56 overflow-y-auto space-y-2 pr-1">
              {notifications.length ? (
                notifications.map((n, i) => (
                  <div
                    key={n.id || i}
                    className={`rounded-xl p-3 text-xs transition-colors ${
                      n.read ? 'bg-slate-50 text-slate-600' : 'bg-sky-50/80 text-sky-950 border border-sky-100 font-medium'
                    }`}
                  >
                    <p>{n.message}</p>
                    <span className="block text-[10px] text-slate-400 mt-1">
                      {formatTimeAgo(n.created_at || n.createdAt)}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-center py-6 text-xs text-slate-400">
                  No alerts yet. You will be notified when your bus starts and approaches your stop.
                </p>
              )}
            </div>
          </div>

          {/* Route Stops Sequence Checklist */}
          <div className="card p-5">
            <h3 className="font-bold text-sm text-navy-900 mb-3 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              Route Stop Sequence
            </h3>

            <div className="space-y-2.5">
              {stops.map((stop, idx) => {
                const isMyStop = userStop && (userStop.id === stop.id || userStop.name === stop.name);
                return (
                  <div
                    key={stop.id || idx}
                    className={`flex items-center justify-between rounded-xl p-2.5 text-xs transition-all ${
                      isMyStop
                        ? 'bg-emerald-50 border-2 border-emerald-300 font-bold text-emerald-900'
                        : 'bg-slate-50 border border-slate-100 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`flex h-5 w-5 items-center justify-center rounded-md text-[10px] font-black ${
                        isMyStop ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {idx + 1}
                      </span>
                      <span>{stop.name}</span>
                    </div>
                    {isMyStop && (
                      <span className="rounded-full bg-emerald-200 px-2 py-0.5 text-[10px] font-black text-emerald-800">
                        YOUR STOP
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
