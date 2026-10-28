import React, { useState, useEffect } from 'react';
import { 
  Bus, 
  MapPin, 
  ShieldCheck, 
  Clock, 
  Bell, 
  Radio, 
  ArrowRight, 
  CheckCircle, 
  Users, 
  Smartphone, 
  Activity, 
  Database,
  Navigation,
  Mail,
  Phone,
  Linkedin,
  ExternalLink
} from 'lucide-react';
import BusMap from '../components/BusMap';
import { apiRequest } from '../services/api';

export default function HomePage({ onOpenLogin, onSelectTab }) {
  const [summaryData, setSummaryData] = useState(null);
  const [simSpeed, setSimSpeed] = useState(36);

  useEffect(() => {
    apiRequest('/public/summary')
      .then((data) => setSummaryData(data))
      .catch((err) => console.log('Could not fetch public summary:', err));
  }, []);

  const defaultStops = [
    { id: 's1', name: 'Vemu Institute Main Gate', lat: 13.3420, lng: 79.0830, order: 1 },
    { id: 's2', name: 'Market Complex', lat: 13.635, lng: 79.425, order: 2 },
    { id: 's3', name: 'Central Railway Station', lat: 13.642, lng: 79.43, order: 3 },
    { id: 's4', name: 'North City Terminal', lat: 13.651, lng: 79.438, order: 4 },
  ];

  const demoBuses = [
    {
      id: 'demo-bus-1',
      number: 'BUS-01',
      status: 'running',
      lat: 13.6335,
      lng: 79.4235,
      speed: simSpeed / 3.6,
      at: new Date().toISOString(),
    },
  ];

  const linkedinUrl = "https://www.linkedin.com/in/vamsi-buthala-375859432?utm_source=share_via&utm_content=profile&utm_medium=member_android";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-navy-900 via-navy-800 to-slate-900 text-white pt-12 pb-20 lg:pt-16 lg:pb-28">
        {/* Background decorative grid */}
        <div className="absolute inset-0 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none" />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column: Headline and Actions */}
            <div className="lg:col-span-7 space-y-6 text-left">
              <div className="inline-flex items-center gap-2 rounded-full bg-sky-500/20 px-4 py-1.5 text-xs font-semibold text-sky-300 border border-sky-400/30 backdrop-blur-sm">
                <Radio className="h-3.5 w-3.5 text-sky-400 animate-pulse" />
                <span>Next-Gen College Transit & Live GPS Tracking</span>
              </div>

              <div className="flex items-center gap-4">
                <img 
                  src="/busora-logo.png" 
                  alt="BusOra Logo" 
                  className="h-20 w-20 sm:h-24 sm:w-24 object-contain rounded-2xl bg-white p-2 shadow-2xl border-2 border-sky-400/30"
                />
                <div>
                  <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-tight">
                    Bus<span className="text-sky-400">Ora</span>
                  </h1>
                  <p className="text-sky-200 text-sm font-semibold tracking-wide">Smart College Bus Tracking</p>
                </div>
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-100 leading-snug">
                Never Miss Your College Bus Again. <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-300 to-blue-400">
                  Live GPS, Smart ETA & Instant Stop Alerts.
                </span>
              </h2>

              <p className="text-base text-slate-300 max-w-xl leading-relaxed">
                BusOra unites college commuters, drivers, and transport administrators with sub-second satellite bus tracking, proximity arrival notifications, and role-hierarchical fleet management.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <a
                  href="#bus-groups"
                  className="btn-sky py-3.5 px-6 text-sm font-bold shadow-glow inline-flex items-center gap-2"
                >
                  <Bus className="h-4 w-4" />
                  Select Your Bus Group
                </a>

                <button
                  onClick={() => onOpenLogin('driver')}
                  className="rounded-xl border border-slate-600 bg-navy-900/80 px-5 py-3.5 text-sm font-bold text-white hover:bg-slate-800 transition-colors"
                >
                  <Bus className="h-4 w-4 inline mr-2 text-emerald-400" />
                  Driver Console
                </button>

                <button
                  onClick={() => onOpenLogin('admin')}
                  className="rounded-xl border border-purple-500/30 bg-purple-950/40 px-5 py-3.5 text-sm font-bold text-purple-200 hover:bg-purple-900/50 transition-colors"
                >
                  <ShieldCheck className="h-4 w-4 inline mr-2 text-purple-400" />
                  Admin Console
                </button>
              </div>
            </div>

            {/* Right Column: Live Interactive Simulator Card */}
            <div className="lg:col-span-5">
              <div className="overflow-hidden rounded-3xl bg-slate-900/90 border border-slate-700/80 p-5 shadow-2xl backdrop-blur-md">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="flex h-2.5 w-2.5 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>
                    <span className="font-bold text-slate-200">LIVE SATELLITE FEED</span>
                  </div>
                  <span className="rounded-md bg-navy-800 px-2 py-0.5 font-mono text-[11px] text-sky-400">
                    BUS-01 • ON ROUTE
                  </span>
                </div>

                {/* Map inside Hero */}
                <div className="my-3">
                  <BusMap
                    buses={demoBuses}
                    stops={defaultStops}
                    userStop={defaultStops[1]}
                    height="240px"
                  />
                </div>

                {/* Live telemetry row */}
                <div className="grid grid-cols-3 gap-2 text-center pt-2">
                  <div className="rounded-xl bg-navy-800/80 p-2.5 border border-slate-800">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Current Speed</p>
                    <p className="text-lg font-black text-sky-400">{simSpeed} <span className="text-xs font-normal">km/h</span></p>
                  </div>
                  <div className="rounded-xl bg-navy-800/80 p-2.5 border border-slate-800">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Next Stop</p>
                    <p className="text-sm font-bold text-white truncate">Market Complex</p>
                  </div>
                  <div className="rounded-xl bg-navy-800/80 p-2.5 border border-slate-800">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Est. Arrival</p>
                    <p className="text-lg font-black text-emerald-400">~3 <span className="text-xs font-normal">min</span></p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Fleet Stats Banner */}
      <section className="bg-white border-y border-slate-200 py-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
            <div className="p-3">
              <div className="flex items-center justify-center gap-2 text-navy-800 mb-1">
                <Bus className="h-5 w-5 text-sky-500" />
                <span className="text-2xl sm:text-3xl font-black">{summaryData?.stats?.totalBuses || '12'} Buses</span>
              </div>
              <p className="text-xs font-semibold text-slate-500">Active College Fleet</p>
            </div>

            <div className="p-3">
              <div className="flex items-center justify-center gap-2 text-navy-800 mb-1">
                <Users className="h-5 w-5 text-emerald-500" />
                <span className="text-2xl sm:text-3xl font-black">2,400+</span>
              </div>
              <p className="text-xs font-semibold text-slate-500">Daily Commuter Students</p>
            </div>

            <div className="p-3">
              <div className="flex items-center justify-center gap-2 text-navy-800 mb-1">
                <Clock className="h-5 w-5 text-amber-500" />
                <span className="text-2xl sm:text-3xl font-black">98.5%</span>
              </div>
              <p className="text-xs font-semibold text-slate-500">On-Time Arrival Accuracy</p>
            </div>

            <div className="p-3">
              <div className="flex items-center justify-center gap-2 text-navy-800 mb-1">
                <ShieldCheck className="h-5 w-5 text-purple-600" />
                <span className="text-2xl sm:text-3xl font-black">&lt; 60s</span>
              </div>
              <p className="text-xs font-semibold text-slate-500">Emergency Incident Response</p>
            </div>
          </div>
        </div>
      </section>

      {/* College Bus Groups Grid (Students Click to Log In) */}
      <section id="bus-groups" className="py-20 bg-gradient-to-b from-slate-100 to-slate-50 border-b border-slate-200 scroll-mt-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <div className="inline-flex items-center gap-2 rounded-full bg-sky-100 px-3.5 py-1 text-xs font-bold text-sky-800 border border-sky-200 mb-3">
              <Bus className="h-4 w-4 text-sky-600" />
              <span>Campus Transit Bus Groups</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-navy-900">
              Select Your Bus Group to Sign In
            </h2>
            <p className="text-sm text-slate-600 mt-2.5 max-w-2xl mx-auto leading-relaxed">
              Every student is assigned to a specific bus group by college administration. Click on your bus number card below to authenticate and view live GPS satellite updates.
            </p>
            <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 bg-rose-50 px-3 py-1 rounded-full border border-rose-200">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Note: Students only have access to view their assigned bus group. Other bus details are restricted.</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {(summaryData?.buses && summaryData.buses.length > 0
              ? summaryData.buses
              : [
                  {
                    id: 'bus-01',
                    number: 'BUS-01',
                    name: 'Pakala & Damalcheruvu Group',
                    status: 'idle',
                    studentCount: 2,
                    driver: { name: 'Rajesh Kumar (Driver)', phone: '+91 98765 00002' },
                  },
                  {
                    id: 'bus-02',
                    number: 'BUS-02',
                    name: 'Chandragiri & Panapakam Group',
                    status: 'idle',
                    studentCount: 2,
                    driver: { name: 'Sunil Verma (Driver)', phone: '+91 98765 00003' },
                  },
                ]
            ).map((bus) => {
              const isRunning = bus.status === 'running';
              const isDelayed = bus.status === 'delayed';

              return (
                <div
                  key={bus.id}
                  className="rounded-3xl bg-white p-7 border-2 border-slate-200 hover:border-sky-500 shadow-lg hover:shadow-2xl transition-all duration-300 flex flex-col justify-between group"
                >
                  <div className="space-y-4">
                    {/* Top Row: Bus Number + Status Badge */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-sky-600 to-blue-500 text-white font-black text-xl shadow-md group-hover:scale-105 transition-transform">
                          <Bus className="h-6 w-6" />
                        </div>
                        <div>
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Transit Code</span>
                          <h3 className="text-2xl font-black text-navy-900 group-hover:text-sky-600 transition-colors">
                            {bus.number}
                          </h3>
                        </div>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                          isRunning
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : isDelayed
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {isRunning ? (
                          <>
                            <span className="flex h-2 w-2 relative">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            <span>Live on Route</span>
                          </>
                        ) : isDelayed ? (
                          <>
                            <Clock className="h-3 w-3 text-amber-600" />
                            <span>Delay Reported</span>
                          </>
                        ) : (
                          <>
                            <span className="h-2 w-2 rounded-full bg-slate-400" />
                            <span>Depot Idle</span>
                          </>
                        )}
                      </span>
                    </div>

                    {/* Group Route Name */}
                    <div>
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Group Designation</p>
                      <h4 className="text-base font-extrabold text-slate-800 mt-0.5 leading-snug">
                        {bus.name || `${bus.number} Route Group`}
                      </h4>
                    </div>

                    {/* Driver & Student Metadata */}
                    <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-medium">Assigned Driver:</span>
                        <span className="font-bold text-slate-800">{bus.driver?.name || 'Driver on Duty'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-medium">Group Students:</span>
                        <span className="font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200">
                          {bus.studentCount || 0} Registered
                        </span>
                      </div>
                      {bus.driver?.phone && (
                        <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                          <span className="text-slate-500 font-medium">Contact:</span>
                          <span className="font-mono text-slate-600 text-[11px]">{bus.driver.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Sign In Button for this specific Bus Group */}
                  <div className="pt-6 space-y-2">
                    <button
                      onClick={() => onOpenLogin('student', bus)}
                      className="w-full btn-sky py-3.5 px-4 text-xs font-bold shadow-md hover:shadow-lg flex items-center justify-center gap-2 group-hover:bg-sky-600 transition-all"
                    >
                      <span>Sign In to Track {bus.number}</span>
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </button>
                    <p className="text-[10px] text-center text-slate-400 font-medium">
                      🔒 Only authorized students of {bus.number}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Core Features Grid */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-navy-100 px-3 py-1 text-xs font-bold text-navy-800 mb-3">
              <ShieldCheck className="h-3.5 w-3.5 text-navy-800" />
              <span>Full-Stack Campus Transit Architecture</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-navy-900">
              Built for Campus Safety & Commuter Convenience
            </h2>
            <p className="text-sm text-slate-600 mt-3 leading-relaxed">
              Modern college campuses require reliable, fault-tolerant transit software. BusOra combines high-precision geolocation with instant alerting.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="card card-hover p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-600 mb-4">
                <Radio className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-navy-900">Sub-Second Live GPS Tracking</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Socket.IO and Leaflet stream real-time driver coordinates directly to students' screens every 3 seconds with minimal battery consumption.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="card card-hover p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 mb-4">
                <Bell className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-navy-900">Automated Proximity Arrival Alerts</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                When a bus crosses within 500 meters of a student's designated stop, audio and visual notifications trigger automatically.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="card card-hover p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-100 text-purple-600 mb-4">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-navy-900">Role Hierarchy & Admin Control</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Super Admins hold master control to provision Driver and Student accounts, reassign routes, activate/deactivate users, and view full logs.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="card card-hover p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 mb-4">
                <Activity className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-navy-900">Driver Incident & SOS Dispatch</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Drivers can instantly report traffic delays, vehicle breakdowns, or emergency SOS signals that immediately alert college administration.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="card card-hover p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 mb-4">
                <Database className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-navy-900">Supabase PostgreSQL Database</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Enterprise relational schema with foreign key constraints, indexes, Row Level Security, and Realtime publications for zero latency.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="card card-hover p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 mb-4">
                <Smartphone className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-navy-900">Mobile-First Driver Cockpit</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Designed to operate seamlessly on any phone browser. Features offline detection if GPS freezes or the screen locks.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Role Hierarchy Breakdown */}
      <section className="py-20 bg-slate-100/70 border-t border-slate-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl font-black text-navy-900">
              Role Hierarchy Architecture
            </h2>
            <p className="text-sm text-slate-600 mt-2">
              Strict tier-based access guarantees data integrity and security across the institution.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Admin Tier */}
            <div className="rounded-3xl bg-white p-7 border-2 border-purple-200 shadow-md relative">
              <span className="absolute -top-3.5 left-6 rounded-full bg-purple-700 px-3 py-1 text-[11px] font-black uppercase text-white tracking-wide">
                Level 1: Super Admin
              </span>
              <div className="mt-2 space-y-3">
                <h3 className="text-xl font-black text-navy-900">College Administration</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Has global administrative privilege. Creates and assigns accounts for all other users, manages routes, registers buses, and views live fleet telemetry.
                </p>
                <ul className="text-xs text-slate-700 space-y-1.5 pt-2">
                  <li className="flex items-center gap-2">✓ User Provisioning (Add/Edit Users)</li>
                  <li className="flex items-center gap-2">✓ Fleet & Route Configuration</li>
                  <li className="flex items-center gap-2">✓ Emergency Dispatch & Audit Logs</li>
                </ul>
                <div className="pt-4 border-t border-slate-100">
                  <button
                    onClick={() => onOpenLogin('admin')}
                    className="w-full rounded-xl bg-purple-700 py-2.5 text-xs font-bold text-white hover:bg-purple-800 transition-colors"
                  >
                    Login as Administrator
                  </button>
                </div>
              </div>
            </div>

            {/* Driver Tier */}
            <div className="rounded-3xl bg-white p-7 border-2 border-emerald-200 shadow-md relative">
              <span className="absolute -top-3.5 left-6 rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-black uppercase text-white tracking-wide">
                Level 2: Bus Operator
              </span>
              <div className="mt-2 space-y-3">
                <h3 className="text-xl font-black text-navy-900">Driver Console</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Accounts created by the Administrator. Drivers start assigned trips, stream GPS coordinates, follow stop sequences, and report route alerts.
                </p>
                <ul className="text-xs text-slate-700 space-y-1.5 pt-2">
                  <li className="flex items-center gap-2">✓ Trip Start & End Operations</li>
                  <li className="flex items-center gap-2">✓ Real-time GPS Streaming & Simulator</li>
                  <li className="flex items-center gap-2">✓ Incident & Delay Broadcasting</li>
                </ul>
                <div className="pt-4 border-t border-slate-100">
                  <button
                    onClick={() => onOpenLogin('driver')}
                    className="w-full rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 transition-colors"
                  >
                    Login as Driver
                  </button>
                </div>
              </div>
            </div>

            {/* Student Tier */}
            <div className="rounded-3xl bg-white p-7 border-2 border-sky-200 shadow-md relative">
              <span className="absolute -top-3.5 left-6 rounded-full bg-sky-600 px-3 py-1 text-[11px] font-black uppercase text-white tracking-wide">
                Level 3: Commuter
              </span>
              <div className="mt-2 space-y-3">
                <h3 className="text-xl font-black text-navy-900">Student Commuter</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Accounts created by the Administrator. Students view their assigned bus live on the map, monitor arrival countdowns, and receive arrival chime alerts.
                </p>
                <ul className="text-xs text-slate-700 space-y-1.5 pt-2">
                  <li className="flex items-center gap-2">✓ Live Bus Satellite Tracker</li>
                  <li className="flex items-center gap-2">✓ Accurate Stop ETA & Distance</li>
                  <li className="flex items-center gap-2">✓ Instant Stop Approach Notifications</li>
                </ul>
                <div className="pt-4 border-t border-slate-100">
                  <a
                    href="#bus-groups"
                    className="w-full rounded-xl bg-sky-600 py-2.5 text-xs font-bold text-white hover:bg-sky-700 transition-colors inline-flex items-center justify-center gap-1.5"
                  >
                    Select Bus Group to Sign In
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Developer Profile Section (VAMSI BUTHALA) */}
      <section className="py-20 bg-gradient-to-b from-white to-slate-50 border-t border-slate-200">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-sky-800 mb-3">
              <CheckCircle className="h-3.5 w-3.5 text-sky-600" />
              <span>Project Architect & Lead Developer</span>
            </div>
            <h2 className="text-3xl font-black text-navy-900">
              Meet The Creator
            </h2>
            <p className="text-sm text-slate-600 mt-2">
              Designed and engineered by Vamsi Buthala with modern full-stack technologies.
            </p>
          </div>

          <div className="rounded-3xl bg-white p-6 sm:p-10 shadow-xl border border-slate-200/80 transition-all hover:shadow-2xl">
            <div className="flex flex-col md:flex-row items-center gap-8">
              {/* Photo with stylish border & badge */}
              <div className="relative shrink-0">
                <div className="relative h-44 w-44 sm:h-52 sm:w-52 rounded-2xl overflow-hidden shadow-xl ring-4 ring-sky-500/20 bg-slate-100">
                  <img 
                    src="/vamsi.jpg" 
                    alt="Vamsi Buthala" 
                    className="h-full w-full object-cover object-top"
                  />
                </div>
                <span className="absolute -bottom-2 -right-2 inline-flex items-center gap-1 rounded-full bg-emerald-500 px-3 py-1 text-xs font-bold text-white shadow-md">
                  <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
                  Developer
                </span>
              </div>

              {/* Details & LinkedIn Button */}
              <div className="flex-1 text-center md:text-left space-y-4">
                <div>
                  <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-navy-900">
                    VAMSI BUTHALA
                  </h3>
                  <p className="text-sm font-semibold text-sky-600 mt-1">
                    Full-Stack Software Engineer & System Architect
                  </p>
                </div>

                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-xl">
                  Creator and developer of <b>BusOra</b>, specializing in real-time geospatial applications, scalable backend systems, responsive user interfaces, and cloud transit fleet management platforms.
                </p>

                {/* Contact info grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <a 
                    href="mailto:vamsibuthala@gmail.com"
                    className="flex items-center justify-center md:justify-start gap-2.5 rounded-xl bg-slate-50 hover:bg-sky-50 p-3 text-xs font-semibold text-slate-700 hover:text-sky-700 border border-slate-200/80 transition-colors"
                  >
                    <Mail className="h-4 w-4 text-sky-500 shrink-0" />
                    <span className="truncate">vamsibuthala@gmail.com</span>
                  </a>

                  <a 
                    href="tel:6304652913"
                    className="flex items-center justify-center md:justify-start gap-2.5 rounded-xl bg-slate-50 hover:bg-emerald-50 p-3 text-xs font-semibold text-slate-700 hover:text-emerald-700 border border-slate-200/80 transition-colors"
                  >
                    <Phone className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>+91 6304652913</span>
                  </a>
                </div>

                {/* LinkedIn Action Button */}
                <div className="pt-3">
                  <a
                    href={linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2.5 rounded-xl bg-[#0077b5] px-6 py-3.5 text-sm font-bold text-white shadow-md hover:bg-[#005f93] hover:shadow-lg transition-all active:scale-95"
                  >
                    <Linkedin className="h-5 w-5 fill-white" />
                    <span>Connect with Vamsi on LinkedIn</span>
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Ribbon */}
      <section className="bg-gradient-to-r from-navy-900 via-navy-800 to-sky-900 py-16 text-white text-center">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-6">
          <img 
            src="/busora-logo.png" 
            alt="BusOra" 
            className="h-16 w-16 mx-auto object-contain rounded-2xl bg-white p-2 shadow-xl"
          />
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
            Ready to track your college transit?
          </h2>
          <p className="text-sm text-sky-200 max-w-xl mx-auto leading-relaxed">
            Select your role above to access the student tracker, driver cockpit, or administrator panel.
          </p>
          <div className="pt-4 flex justify-center gap-3">
            <a
              href="#bus-groups"
              className="btn-sky py-3 px-6 text-sm font-bold shadow-lg inline-flex items-center gap-2"
            >
              Select Your Bus Group to Start <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
