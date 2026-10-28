import React, { useState, useEffect } from 'react';
import { Bus, MapPin, CheckCircle, Navigation, Clock, ShieldCheck, Users, ArrowRight } from 'lucide-react';
import BusMap from '../components/BusMap';
import { apiRequest } from '../services/api';

export default function RoutesPage({ onOpenLogin }) {
  const [buses, setBuses] = useState([]);
  const [selectedBusIdx, setSelectedBusIdx] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest('/public/summary')
      .then((data) => {
        if (data.buses) {
          setBuses(data.buses);
        }
      })
      .catch((err) => console.log(err))
      .finally(() => setLoading(false));
  }, []);

  const activeBus = buses[selectedBusIdx] || buses[0];

  return (
    <div className="py-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Title */}
      <div className="text-center max-w-3xl mx-auto space-y-2">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-sky-800">
          <Bus className="h-3.5 w-3.5" />
          <span>Campus Transit Fleet Groups</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-navy-900 tracking-tight">
          College Bus Groups Directory
        </h1>
        <p className="text-xs sm:text-sm text-slate-600">
          Browse active campus bus groups, assigned drivers, and registered commuter rosters. Select your bus number to sign in.
        </p>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="flex items-center gap-3 text-slate-500 font-semibold text-sm">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
            <span>Loading College Bus Groups...</span>
          </div>
        </div>
      ) : buses.length === 0 ? (
        <div className="card p-12 text-center max-w-xl mx-auto border-dashed border-2 border-slate-300">
          <Bus className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-navy-900">No Bus Groups Published Yet</h2>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            The transport administrator has not configured any bus groups yet.
          </p>
          <div className="mt-6">
            <button
              onClick={() => onOpenLogin('admin')}
              className="btn-primary text-xs py-2.5 px-5 shadow-sm"
            >
              Sign In as Admin to Add Bus Groups
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Bus Selector Tabs */}
          <div className="flex flex-wrap justify-center gap-2">
            {buses.map((b, i) => (
              <button
                key={b.id || i}
                onClick={() => setSelectedBusIdx(i)}
                className={`flex items-center gap-2 rounded-2xl px-5 py-3 text-xs sm:text-sm font-bold transition-all ${
                  selectedBusIdx === i
                    ? 'bg-navy-900 text-white shadow-md'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Bus className={`h-4 w-4 ${selectedBusIdx === i ? 'text-sky-400' : 'text-slate-400'}`} />
                <span>{b.number}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                  b.status === 'running' ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {b.status === 'running' ? 'Live' : 'Idle'}
                </span>
              </button>
            ))}
          </div>

          {/* Active Bus Details Grid */}
          {activeBus && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left: Group Info Card (5 cols) */}
              <div className="lg:col-span-5 space-y-4">
                <div className="card p-6 space-y-5">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-[11px] font-bold text-sky-700 uppercase">
                        Bus Group Details
                      </span>
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase ${
                        activeBus.status === 'running'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {activeBus.status === 'running' ? '🟢 Live on Route' : '⏸️ Idle at Depot'}
                      </span>
                    </div>

                    <h2 className="text-2xl font-black text-navy-900 mt-2">{activeBus.number}</h2>
                    <p className="text-sm font-semibold text-purple-800 mt-0.5">{activeBus.name}</p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Assigned Driver:</span>
                      <span className="font-bold text-slate-800">{activeBus.driver?.name || 'Driver on Duty'}</span>
                    </div>
                    {activeBus.driver?.phone && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-medium">Driver Contact:</span>
                        <span className="font-mono text-slate-700">{activeBus.driver.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Group Students:</span>
                      <span className="font-bold text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
                        {activeBus.studentCount || 0} Registered
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Bus Capacity:</span>
                      <span className="font-bold text-slate-800">{activeBus.capacity || 45} Seats</span>
                    </div>
                  </div>

                  <div className="rounded-xl bg-amber-50 p-3 text-[11px] text-amber-800 border border-amber-200">
                    🔒 <strong>Strict Access Notice:</strong> Other group students do not have access to view this bus. You must log in with credentials registered to {activeBus.number}.
                  </div>

                  <div className="pt-2 border-t border-slate-100">
                    <button
                      onClick={() => onOpenLogin('student', activeBus)}
                      className="btn-sky w-full py-3 text-xs font-bold flex items-center justify-center gap-2"
                    >
                      <span>Sign In to Track {activeBus.number}</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Right: Map Preview (7 cols) */}
              <div className="lg:col-span-7 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-navy-900 flex items-center gap-2">
                    <Navigation className="h-4 w-4 text-sky-500" />
                    Live Satellite Bus Map ({activeBus.number})
                  </h3>
                  <span className="text-xs text-purple-700 font-bold">
                    {activeBus.status === 'running' ? '⚡ Moving' : 'Depot Position'}
                  </span>
                </div>

                <BusMap
                  buses={
                    activeBus.last_lat
                      ? [
                          {
                            id: activeBus.id,
                            number: activeBus.number,
                            status: activeBus.status,
                            lat: activeBus.last_lat,
                            lng: activeBus.last_lng,
                            speed: activeBus.last_speed,
                            at: activeBus.last_location_at,
                          },
                        ]
                      : []
                  }
                  stops={[
                    {
                      id: 'vemu-college',
                      name: 'Vemu Institute of Technology Campus',
                      lat: 13.3420,
                      lng: 79.0830,
                    },
                  ]}
                  height="480px"
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
