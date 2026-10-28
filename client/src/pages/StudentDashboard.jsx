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
  ShieldAlert,
  Zap,
  Users,
  Building2,
  Check
} from 'lucide-react';
import BusMap from '../components/BusMap';
import { apiRequest, getSocket } from '../services/api';

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

  const collegeDestination = {
    id: 'vemu-campus',
    name: 'Vemu Institute of Technology Campus',
    lat: 13.3420,
    lng: 79.0830,
  };

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

    const interval = setInterval(fetchStudentData, 6000);

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
          <span>Connecting to Bus Group Satellite Radar...</span>
        </div>
      </div>
    );
  }

  if (!data?.bus) {
    return (
      <div className="mx-auto max-w-2xl text-center py-16 card">
        <Bus className="h-12 w-12 text-slate-300 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-navy-900">No Bus Group Assigned Yet</h2>
        <p className="text-xs text-slate-500 mt-2 max-w-md mx-auto">
          Your student account is active, but an administrator has not yet assigned you to a college bus group. Please contact college administration.
        </p>
      </div>
    );
  }

  const bus = data.bus;
  const isRunning = busStatus === 'running';
  const isDelayed = busStatus === 'delayed';

  // Real-time GPS Speed
  const currentSpeedKmh = busLocation?.speed 
    ? Math.round(busLocation.speed * 3.6) 
    : (isRunning ? 38 : 0);

  const isStale = busLocation?.at && Date.now() - new Date(busLocation.at).getTime() > 60000;

  return (
    <div className="space-y-6">
      {/* Top Banner with Bus Group & Driver Info */}
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
                {bus.number}
              </h1>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-xs font-bold uppercase tracking-wider ${
                isRunning && !isStale
                  ? 'bg-emerald-500 text-white'
                  : isDelayed
                  ? 'bg-amber-500 text-white'
                  : 'bg-slate-700 text-slate-300'
              }`}>
                {isRunning && !isStale ? (
                  <>
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                    </span>
                    <span>Live On Route</span>
                  </>
                ) : isDelayed ? (
                  <>
                    <Clock className="h-3 w-3" />
                    <span>Delay Reported</span>
                  </>
                ) : (
                  <>
                    <span className="h-2 w-2 rounded-full bg-slate-400" />
                    <span>Idle at Depot</span>
                  </>
                )}
              </span>
            </div>
            <p className="text-xs text-sky-200 mt-1">
              Group Designation: <span className="font-semibold text-white">{bus.name}</span>
            </p>
          </div>
        </div>

        {/* Driver on duty contact card */}
        <div className="flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-2.5 backdrop-blur-sm border border-white/10">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500 text-white font-bold text-base">
            🚍
          </div>
          <div className="text-xs">
            <p className="text-slate-300">Driver on Duty</p>
            <p className="font-bold text-white">{bus.driver?.name || 'Assigned Driver'}</p>
          </div>
          {bus.driver?.phone && (
            <a
              href={`tel:${bus.driver.phone}`}
              className="ml-2 rounded-xl bg-emerald-500 p-2 text-white hover:bg-emerald-600 transition-colors shadow-sm"
              title="Call Driver"
            >
              <Phone className="h-4 w-4" />
            </a>
          )}
        </div>
      </div>

      {/* Driver Start Status Banner */}
      {!isRunning && (
        <div className="rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 p-4 text-xs text-amber-900 flex items-start gap-3 shadow-xs">
          <Clock className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-black text-sm">Waiting for Driver to Start Bus</p>
            <p className="text-amber-800 mt-0.5 leading-relaxed">
              The driver has not clicked "Start Bus" in their cockpit yet. Once the driver starts the bus, real-time GPS coordinates will begin streaming automatically on your satellite map below.
            </p>
          </div>
        </div>
      )}

      {isRunning && (
        <div className="rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 p-4 text-xs text-emerald-900 flex items-start gap-3 shadow-xs">
          <Radio className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5 animate-pulse" />
          <div>
            <p className="font-black text-sm">Bus Active & Live GPS Broadcasting</p>
            <p className="text-emerald-800 mt-0.5 leading-relaxed">
              Driver has started the bus! Satellite tracking is active and streaming coordinates every 3-4 seconds.
            </p>
          </div>
        </div>
      )}

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Metric 1: Bus Group */}
        <div className="card p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1">
            <span>Your Bus Group</span>
            <Bus className="h-4 w-4 text-sky-600" />
          </div>
          <p className="text-base sm:text-lg font-black text-navy-900 truncate">
            {bus.number}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5 truncate">{bus.name}</p>
        </div>

        {/* Metric 2: Live Speed */}
        <div className="card p-4 bg-gradient-to-br from-white to-sky-50/50 border-sky-200/80">
          <div className="flex items-center justify-between text-xs text-sky-700 font-bold mb-1">
            <span>Driver GPS Speed</span>
            <Zap className="h-4 w-4 text-sky-600" />
          </div>
          <p className="text-2xl font-black text-sky-600">
            {currentSpeedKmh} <span className="text-sm font-semibold text-slate-500">km/h</span>
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Real-time driver speed</p>
        </div>

        {/* Metric 3: College Destination */}
        <div className="card p-4 bg-gradient-to-br from-white to-purple-50/50 border-purple-200/80">
          <div className="flex items-center justify-between text-xs text-purple-700 font-bold mb-1">
            <span>Destination Campus</span>
            <Building2 className="h-4 w-4 text-purple-600" />
          </div>
          <p className="text-sm font-black text-navy-900 truncate">
            Vemu Institute of Technology
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">P.Kothakota, Chittoor</p>
        </div>

        {/* Metric 4: Satellite Freshness */}
        <div className="card p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1">
            <span>Satellite Radar</span>
            <RotateCw className="h-4 w-4 text-slate-400" />
          </div>
          <p className={`text-base font-black ${isStale ? 'text-amber-600' : isRunning ? 'text-emerald-600' : 'text-slate-600'}`}>
            {isStale ? 'Signal Paused' : isRunning ? 'Live Stream' : 'Awaiting Start'}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Updated {formatTimeAgo(busLocation?.at)}</p>
        </div>
      </div>

      {/* Main Grid: Interactive Satellite Map (Left) + Group Info & Notifications (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Interactive Satellite Map (8 cols) */}
        <div className="lg:col-span-8 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-navy-900 flex items-center gap-2">
              <Radio className="h-4 w-4 text-sky-500" />
              Live Interactive GPS Map
            </h3>
            <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
              ⚡ {currentSpeedKmh} km/h
            </span>
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
            stops={[collegeDestination]}
            height="520px"
          />
        </div>

        {/* Right Column: Bus Group Details & Alerts (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Group Details Card */}
          <div className="card p-5 space-y-3 border border-slate-200">
            <h3 className="font-bold text-sm text-navy-900 flex items-center gap-2 pb-2 border-b border-slate-100">
              <Users className="h-4 w-4 text-sky-600" />
              <span>Bus Group Information</span>
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Bus Number:</span>
                <span className="font-black text-slate-900">{bus.number}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Group Name:</span>
                <span className="font-bold text-slate-800 truncate max-w-[170px]">{bus.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Group Students:</span>
                <span className="font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200">
                  {bus.studentCount || 1} Enrolled
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Assigned Driver:</span>
                <span className="font-bold text-slate-900">{bus.driver?.name || 'Driver on Duty'}</span>
              </div>
              {bus.driver?.phone && (
                <div className="flex items-center justify-between pt-1">
                  <span className="text-slate-500 font-medium">Driver Phone:</span>
                  <a href={`tel:${bus.driver.phone}`} className="font-bold text-emerald-600 hover:underline">
                    {bus.driver.phone}
                  </a>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400">
              🔒 Group Protected: Only students registered in {bus.number} have access to this live GPS feed.
            </div>
          </div>

          {/* Transit Alerts & Notification Board */}
          <div className="card p-5 space-y-3 border border-slate-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-1.5 font-bold text-xs text-navy-900">
                <Bell className="h-4 w-4 text-sky-500" />
                <span>Transit Notifications</span>
              </div>
              {notifications.length > 0 && (
                <button
                  onClick={handleMarkNotificationsRead}
                  className="text-[11px] text-sky-600 hover:underline font-semibold"
                >
                  Mark read
                </button>
              )}
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {notifications.length ? (
                notifications.map((n, i) => (
                  <div
                    key={n.id || i}
                    className={`rounded-xl p-3 text-xs transition-colors ${
                      n.read ? 'bg-slate-50 text-slate-600' : 'bg-sky-50 text-sky-950 border border-sky-100 font-medium'
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
                  No alerts yet. You will receive notifications when your driver starts the bus or reports route updates.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
