import React, { useState, useEffect } from 'react';
import { Bus, MapPin, CheckCircle, Navigation, Clock, Route as RouteIcon } from 'lucide-react';
import BusMap from '../components/BusMap';
import { apiRequest } from '../services/api';

export default function RoutesPage({ onOpenLogin }) {
  const [routes, setRoutes] = useState([]);
  const [selectedRouteIdx, setSelectedRouteIdx] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest('/public/summary')
      .then((data) => {
        if (data.routes) {
          setRoutes(data.routes);
        }
      })
      .catch((err) => console.log(err))
      .finally(() => setLoading(false));
  }, []);

  const activeRoute = routes[selectedRouteIdx] || routes[0];

  return (
    <div className="py-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Title */}
      <div className="text-center max-w-3xl mx-auto space-y-2">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-sky-800">
          <MapPin className="h-3.5 w-3.5" />
          <span>Campus Transport Network</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-navy-900 tracking-tight">
          College Bus Routes & Stop Directory
        </h1>
        <p className="text-xs sm:text-sm text-slate-600">
          Official schedules, sequenced boarding stops, and real-time route path visualizations.
        </p>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="flex items-center gap-3 text-slate-500 font-semibold text-sm">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
            <span>Loading Campus Routes...</span>
          </div>
        </div>
      ) : routes.length === 0 ? (
        <div className="card p-12 text-center max-w-xl mx-auto border-dashed border-2 border-slate-300">
          <RouteIcon className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-navy-900">No Routes Published Yet</h2>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            The transport administrator has not configured any routes yet. As soon as the administrator creates routes and assigns them to drivers, they will be listed here.
          </p>
          <div className="mt-6">
            <button
              onClick={() => onOpenLogin('admin')}
              className="btn-primary text-xs py-2.5 px-5 shadow-sm"
            >
              Sign In as Admin to Add Routes
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Route Selector Tabs */}
          <div className="flex flex-wrap justify-center gap-2">
            {routes.map((r, i) => (
              <button
                key={r.id || i}
                onClick={() => setSelectedRouteIdx(i)}
                className={`flex items-center gap-2 rounded-2xl px-5 py-3 text-xs sm:text-sm font-bold transition-all ${
                  selectedRouteIdx === i
                    ? 'bg-navy-900 text-white shadow-md'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Bus className={`h-4 w-4 ${selectedRouteIdx === i ? 'text-sky-400' : 'text-slate-400'}`} />
                <span>{r.name}</span>
              </button>
            ))}
          </div>

          {/* Active Route Details Grid */}
          {activeRoute && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left: Stops sequence list (5 cols) */}
              <div className="lg:col-span-5 space-y-4">
                <div className="card p-6 space-y-4">
                  <div>
                    <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-[11px] font-bold text-sky-700 uppercase">
                      Active Corridor
                    </span>
                    <h2 className="text-xl font-black text-navy-900 mt-2">{activeRoute.name}</h2>
                    {activeRoute.description && (
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">{activeRoute.description}</p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-100">
                    <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500 mb-3">
                      Stop Sequence ({activeRoute.stops?.length || 0} stops)
                    </h3>

                    <div className="space-y-3">
                      {activeRoute.stops?.map((stop, idx) => (
                        <div
                          key={stop.id || idx}
                          className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-xs border border-slate-100"
                        >
                          <div className="flex items-center gap-3">
                            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-navy-800 text-xs font-black text-white">
                              {idx + 1}
                            </span>
                            <div>
                              <p className="font-bold text-slate-900">{stop.name}</p>
                              <p className="text-[10px] text-slate-400 font-mono">
                                {stop.lat?.toFixed(4)}, {stop.lng?.toFixed(4)}
                              </p>
                            </div>
                          </div>
                          <span className="text-[11px] font-semibold text-sky-600">
                            {idx === 0 ? '🏁 Origin' : idx === activeRoute.stops.length - 1 ? '🎯 Campus' : '📍 Stop'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100">
                    <button
                      onClick={() => onOpenLogin('student')}
                      className="btn-primary w-full text-xs py-3"
                    >
                      Sign In to Track Assigned Bus
                    </button>
                  </div>
                </div>
              </div>

              {/* Right: Route Map Preview (7 cols) */}
              <div className="lg:col-span-7 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-navy-900 flex items-center gap-2">
                    <Navigation className="h-4 w-4 text-sky-500" />
                    Route Path & Geolocation Points
                  </h3>
                  <span className="text-xs text-slate-400">OpenStreetMap GPS Grid</span>
                </div>

                <BusMap
                  stops={activeRoute.stops || []}
                  height="500px"
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
