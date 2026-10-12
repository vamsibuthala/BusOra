import React, { useState, useEffect } from 'react';
import { 
  Users, 
  ShieldCheck, 
  Bus, 
  MapPin, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  Activity, 
  Clock, 
  AlertTriangle, 
  Key, 
  Mail, 
  UserPlus, 
  Database,
  Filter,
  Radio,
  FileText
} from 'lucide-react';
import BusMap from '../components/BusMap';
import { apiRequest, getSocket } from '../services/api';

export default function AdminDashboard({ user }) {
  const [activeTab, setActiveTab] = useState('users'); // 'users' | 'fleet' | 'buses' | 'trips'
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [buses, setBuses] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [trips, setTrips] = useState([]);
  const [liveBuses, setLiveBuses] = useState({});
  const [loading, setLoading] = useState(true);

  // User management state
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  // New user form state
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'student',
    bus_id: '',
    stop_id: '',
    phone: '',
  });
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const loadAllAdminData = async () => {
    try {
      const [s, u, b, r, t, l] = await Promise.all([
        apiRequest('/admin/stats'),
        apiRequest('/admin/users'),
        apiRequest('/admin/buses'),
        apiRequest('/admin/routes'),
        apiRequest('/admin/trips'),
        apiRequest('/admin/live'),
      ]);
      setStats(s);
      setUsers(u);
      setBuses(b);
      setRoutes(r);
      setTrips(t);

      const liveMap = {};
      (l || []).forEach((item) => {
        liveMap[item.id] = item;
      });
      setLiveBuses(liveMap);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllAdminData();

    // Socket listeners for real-time fleet map updates
    const socket = getSocket();

    const handleLocation = (payload) => {
      setLiveBuses((prev) => ({
        ...prev,
        [payload.bus]: {
          ...(prev[payload.bus] || {}),
          id: payload.bus,
          number: payload.number,
          status: 'running',
          lastLocation: {
            lat: payload.lat,
            lng: payload.lng,
            speed: payload.speed,
            at: payload.at,
          },
        },
      }));
    };

    const handleBusStatus = ({ bus, status }) => {
      setLiveBuses((prev) => {
        if (!prev[bus]) return prev;
        return {
          ...prev,
          [bus]: {
            ...prev[bus],
            status,
          },
        };
      });
    };

    socket.on('location', handleLocation);
    socket.on('bus-status', handleBusStatus);

    const interval = setInterval(loadAllAdminData, 15000);

    return () => {
      socket.off('location', handleLocation);
      socket.off('bus-status', handleBusStatus);
      clearInterval(interval);
    };
  }, []);

  // Filter users by role and search
  const filteredUsers = users.filter((u) => {
    const matchesRole = userRoleFilter === 'all' || u.role === userRoleFilter;
    const matchesSearch =
      !searchQuery ||
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRole && matchesSearch;
  });

  // Handle Create User
  const handleCreateUser = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!newUser.name || !newUser.email || !newUser.password || !newUser.role) {
      setFormError('Please fill in Name, Email, Password, and Role.');
      return;
    }

    try {
      await apiRequest('/admin/users', 'POST', newUser);
      setFormSuccess(`User ${newUser.name} created successfully!`);
      setNewUser({
        name: '',
        email: '',
        password: '',
        role: 'student',
        bus_id: '',
        stop_id: '',
        phone: '',
      });
      setShowAddUserModal(false);
      loadAllAdminData();
    } catch (err) {
      setFormError(err.message);
    }
  };

  // Handle Edit User
  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    setFormError('');

    try {
      await apiRequest(`/admin/users/${editingUser.id}`, 'PUT', editingUser);
      setEditingUser(null);
      loadAllAdminData();
    } catch (err) {
      setFormError(err.message);
    }
  };

  // Handle Toggle Active / Deactivate
  const handleToggleUserActive = async (targetUser) => {
    if (targetUser.id === user.id) {
      alert('You cannot deactivate your own administrator account.');
      return;
    }

    const action = targetUser.active ? 'deactivate' : 'activate';
    if (!window.confirm(`Are you sure you want to ${action} ${targetUser.name}?`)) return;

    try {
      await apiRequest(`/admin/users/${targetUser.id}`, 'PUT', {
        active: !targetUser.active,
      });
      loadAllAdminData();
    } catch (err) {
      alert('Error updating user: ' + err.message);
    }
  };

  // Handle Delete User
  const handleDeleteUser = async (targetUser) => {
    if (targetUser.id === user.id) {
      alert('You cannot delete your own administrator account.');
      return;
    }

    if (!window.confirm(`Permanently delete account for ${targetUser.name} (${targetUser.email})?`)) return;

    try {
      await apiRequest(`/admin/users/${targetUser.id}`, 'DELETE');
      loadAllAdminData();
    } catch (err) {
      alert('Error deleting user: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500 font-semibold text-sm">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-purple-600 border-t-transparent" />
          <span>Loading College Admin Management Console...</span>
        </div>
      </div>
    );
  }

  const liveBusList = Object.values(liveBuses);
  const busPoints = liveBusList.map((b) => ({
    id: b.id,
    number: b.number,
    status: b.status,
    lat: b.lastLocation?.lat,
    lng: b.lastLocation?.lng,
    speed: b.lastLocation?.speed,
    at: b.lastLocation?.at,
  }));

  // Selected bus route stops for helper dropdown
  const selectedBus = buses.find((b) => b.id === (editingUser ? editingUser.bus_id : newUser.bus_id));
  const availableStops = selectedBus?.route?.stops || [];

  return (
    <div className="space-y-6">
      {/* Top Admin Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-3xl bg-gradient-to-r from-navy-900 via-purple-950 to-navy-900 p-6 text-white shadow-xl">
        <div className="flex items-center gap-4">
          <img 
            src="/busora-logo.png" 
            alt="BusOra Logo" 
            className="h-14 w-14 object-contain rounded-2xl bg-white p-1.5 shadow-md"
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-2xl sm:text-3xl font-black">
                Transport Administration
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/20 px-2.5 py-0.5 text-xs font-bold text-purple-300 border border-purple-400/30">
                👑 Super Admin
              </span>
            </div>
            <p className="text-xs text-purple-200 mt-0.5">
              Campus Fleet Governance, User Hierarchy & Real-Time Telemetry
            </p>
          </div>
        </div>

        {/* Database Mode Pill */}
        <div className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-2.5 backdrop-blur-sm border border-white/10 text-xs">
          <Database className="h-4 w-4 text-emerald-400" />
          <div>
            <p className="text-[10px] text-slate-300">Database Engine</p>
            <p className="font-bold text-white">
              {stats?.isSupabase ? 'Supabase PostgreSQL' : 'Supabase Demo Store'}
            </p>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="card p-4">
          <p className="text-xs font-semibold text-slate-500">Total Buses</p>
          <p className="text-2xl font-black text-navy-900 mt-1">{stats?.buses || 0}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Campus transit fleet</p>
        </div>

        <div className="card p-4">
          <p className="text-xs font-semibold text-slate-500">Active Trips</p>
          <p className="text-2xl font-black text-emerald-600 mt-1">{stats?.activeTrips || 0}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Buses running right now</p>
        </div>

        <div className="card p-4">
          <p className="text-xs font-semibold text-slate-500">Students</p>
          <p className="text-2xl font-black text-sky-600 mt-1">{stats?.students || 0}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Enrolled commuters</p>
        </div>

        <div className="card p-4">
          <p className="text-xs font-semibold text-slate-500">Drivers</p>
          <p className="text-2xl font-black text-amber-600 mt-1">{stats?.drivers || 0}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Certified operators</p>
        </div>

        <div className="card p-4">
          <p className="text-xs font-semibold text-slate-500">Active Routes</p>
          <p className="text-2xl font-black text-purple-700 mt-1">{stats?.routes || 0}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Express corridors</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto pb-1 text-sm font-bold">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${
            activeTab === 'users'
              ? 'bg-purple-700 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>User Hierarchy Management ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('fleet')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${
            activeTab === 'fleet'
              ? 'bg-purple-700 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Radio className="h-4 w-4" />
          <span>Live Fleet Map</span>
        </button>

        <button
          onClick={() => setActiveTab('buses')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${
            activeTab === 'buses'
              ? 'bg-purple-700 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Bus className="h-4 w-4" />
          <span>Fleet Buses ({buses.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('trips')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${
            activeTab === 'trips'
              ? 'bg-purple-700 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>Trip Logs & History ({trips.length})</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: USER HIERARCHY MANAGEMENT (Central Requirement 5) */}
      {/* ======================================================== */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          {/* Hierarchy explanation banner */}
          <div className="rounded-2xl bg-gradient-to-r from-purple-50 via-sky-50 to-emerald-50 p-4 border border-purple-100 text-xs text-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <p className="font-bold text-navy-900 text-sm mb-0.5">Role Hierarchy Provisioning Model</p>
              <p className="text-slate-600">
                As Super Admin, only you can register accounts. Provision Drivers with assigned buses, and Students with designated boarding stops.
              </p>
            </div>
            <button
              onClick={() => {
                setFormError('');
                setShowAddUserModal(true);
              }}
              className="btn-primary bg-purple-700 hover:bg-purple-800 text-xs py-2.5 px-4 shadow-sm shrink-0"
            >
              <UserPlus className="h-4 w-4" />
              Add New User Account
            </button>
          </div>

          {/* User Filtering Toolbar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 card p-4">
            {/* Role Filter Pills */}
            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              <button
                onClick={() => setUserRoleFilter('all')}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                  userRoleFilter === 'all'
                    ? 'bg-navy-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All ({users.length})
              </button>

              <button
                onClick={() => setUserRoleFilter('admin')}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                  userRoleFilter === 'admin'
                    ? 'bg-purple-700 text-white'
                    : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                }`}
              >
                👑 Admins ({users.filter((u) => u.role === 'admin').length})
              </button>

              <button
                onClick={() => setUserRoleFilter('driver')}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                  userRoleFilter === 'driver'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                }`}
              >
                🚍 Drivers ({users.filter((u) => u.role === 'driver').length})
              </button>

              <button
                onClick={() => setUserRoleFilter('student')}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                  userRoleFilter === 'student'
                    ? 'bg-sky-600 text-white'
                    : 'bg-sky-50 text-sky-700 hover:bg-sky-100'
                }`}
              >
                🎓 Students ({users.filter((u) => u.role === 'student').length})
              </button>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search user name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-1.5 text-xs focus:border-purple-600 focus:outline-none"
              />
            </div>
          </div>

          {/* Users Table */}
          <div className="card overflow-x-auto p-0 border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-5 py-3.5">User</th>
                  <th className="px-5 py-3.5">Role Hierarchy</th>
                  <th className="px-5 py-3.5">Assigned Bus / Stop</th>
                  <th className="px-5 py-3.5">Phone</th>
                  <th className="px-5 py-3.5">Account Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.length ? (
                  filteredUsers.map((u) => {
                    const assignedBus = buses.find((b) => b.id === u.bus_id);
                    return (
                      <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-200 text-slate-700 font-bold text-xs">
                              {u.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900">{u.name}</p>
                              <p className="text-[11px] text-slate-400">{u.email}</p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-3.5">
                          {u.role === 'admin' ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-0.5 font-bold text-purple-700">
                              👑 Super Admin
                            </span>
                          ) : u.role === 'driver' ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 font-bold text-emerald-700">
                              🚍 Driver
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-0.5 font-bold text-sky-700">
                              🎓 Student
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-3.5">
                          {assignedBus ? (
                            <div>
                              <span className="font-bold text-slate-800">{assignedBus.number}</span>
                              <span className="text-[11px] text-slate-400 block truncate max-w-[140px]">
                                {assignedBus.route?.name}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        <td className="px-5 py-3.5 text-slate-600">
                          {u.phone || '—'}
                        </td>

                        <td className="px-5 py-3.5">
                          <button
                            onClick={() => handleToggleUserActive(u)}
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              u.active
                                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                : 'bg-red-50 text-red-700 hover:bg-red-100'
                            }`}
                          >
                            {u.active ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                            <span>{u.active ? 'Active' : 'Inactive'}</span>
                          </button>
                        </td>

                        <td className="px-5 py-3.5 text-right space-x-2">
                          <button
                            onClick={() => {
                              setEditingUser({ ...u, password: '' });
                              setFormError('');
                            }}
                            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-navy-800 transition-colors"
                            title="Edit User"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>

                          <button
                            onClick={() => handleDeleteUser(u)}
                            className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                            title="Delete User"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="6" className="text-center py-8 text-slate-400">
                      No users match the search criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: LIVE FLEET RADAR MAP */}
      {/* ======================================================== */}
      {activeTab === 'fleet' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-navy-900">Campus-Wide Live Fleet Map</h3>
              <p className="text-xs text-slate-500">Live positions for all running and idle college buses</p>
            </div>
            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Socket.IO Live Stream Active
            </span>
          </div>

          <BusMap
            buses={busPoints}
            stops={routes[0]?.stops || []}
            height="500px"
          />
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: FLEET BUSES MANAGEMENT */}
      {/* ======================================================== */}
      {activeTab === 'buses' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {buses.map((b) => (
            <div key={b.id} className="card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-black text-xl text-navy-900">{b.number}</span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${
                  b.status === 'running'
                    ? 'bg-emerald-100 text-emerald-800'
                    : b.status === 'delayed'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-slate-100 text-slate-700'
                }`}>
                  {b.status}
                </span>
              </div>

              <div className="text-xs space-y-1 text-slate-600">
                <p>Route: <b className="text-slate-900">{b.route?.name || 'Unassigned'}</b></p>
                <p>Assigned Driver: <b className="text-slate-900">{b.driver?.name || 'Unassigned'}</b></p>
                <p>Capacity: <b>{b.capacity} Students</b></p>
              </div>

              {b.last_lat && (
                <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400 font-mono">
                  GPS: {b.last_lat.toFixed(4)}, {b.last_lng.toFixed(4)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: TRIP LOGS & HISTORY */}
      {/* ======================================================== */}
      {activeTab === 'trips' && (
        <div className="card overflow-x-auto p-0 border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
              <tr>
                <th className="px-5 py-3.5">Bus Number</th>
                <th className="px-5 py-3.5">Driver</th>
                <th className="px-5 py-3.5">Trip Started</th>
                <th className="px-5 py-3.5">Trip Completed</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Reported Incidents</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {trips.length ? (
                trips.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3.5 font-bold text-slate-900">{t.bus?.number || 'Bus'}</td>
                    <td className="px-5 py-3.5 text-slate-700">{t.driver?.name || 'Driver'}</td>
                    <td className="px-5 py-3.5 text-slate-500">{new Date(t.started_at).toLocaleString()}</td>
                    <td className="px-5 py-3.5 text-slate-500">{t.ended_at ? new Date(t.ended_at).toLocaleString() : 'In Progress'}</td>
                    <td className="px-5 py-3.5">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                        t.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {Array.isArray(t.incidents) && t.incidents.length > 0 ? (
                        <span className="text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-full text-[10px]">
                          🚨 {t.incidents.length} incident(s)
                        </span>
                      ) : (
                        <span className="text-slate-400">None</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="text-center py-8 text-slate-400">No trip logs recorded yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: ADD NEW USER ACCOUNT (Super Admin Privilege)      */}
      {/* ======================================================== */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-3xl bg-white shadow-2xl p-6 border border-slate-100">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-purple-700" />
                <h3 className="font-display text-lg font-black text-navy-900">Add New User Account</h3>
              </div>
              <button
                onClick={() => setShowAddUserModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="mt-4 rounded-xl bg-red-50 p-3 text-xs text-red-700 border border-red-200">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="mt-4 space-y-3.5 text-xs">
              {/* Role Selection */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">User Role Hierarchy *</label>
                <div className="grid grid-cols-3 gap-2">
                  {['student', 'driver', 'admin'].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setNewUser({ ...newUser, role: r })}
                      className={`rounded-xl py-2 px-2 text-center font-bold capitalize transition-all ${
                        newUser.role === r
                          ? r === 'admin'
                            ? 'bg-purple-700 text-white'
                            : r === 'driver'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-sky-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {r === 'admin' ? '👑 Admin' : r === 'driver' ? '🚍 Driver' : '🎓 Student'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Patel"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-purple-600 focus:outline-none"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. ramesh@busora.com"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-purple-600 focus:outline-none"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Account Password *</label>
                <input
                  type="password"
                  required
                  placeholder="Set initial password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-purple-600 focus:outline-none"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Phone Number (Optional)</label>
                <input
                  type="text"
                  placeholder="+91 98765 43210"
                  value={newUser.phone}
                  onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-purple-600 focus:outline-none"
                />
              </div>

              {/* Bus Assignment (if Driver or Student) */}
              {(newUser.role === 'driver' || newUser.role === 'student') && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Assign College Bus</label>
                  <select
                    value={newUser.bus_id}
                    onChange={(e) => setNewUser({ ...newUser, bus_id: e.target.value, stop_id: '' })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-purple-600 focus:outline-none"
                  >
                    <option value="">-- Select Bus --</option>
                    {buses.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.number} ({b.route?.name || 'No Route'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Stop Assignment (if Student) */}
              {newUser.role === 'student' && availableStops.length > 0 && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Assign Boarding Stop</label>
                  <select
                    value={newUser.stop_id}
                    onChange={(e) => setNewUser({ ...newUser, stop_id: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-purple-600 focus:outline-none"
                  >
                    <option value="">-- Select Boarding Stop --</option>
                    {availableStops.map((s) => (
                      <option key={s.id || s._id} value={s.id || s._id}>
                        {s.name} (#{s.order})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-purple-700 px-5 py-2 font-bold text-white hover:bg-purple-800 shadow-md"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: EDIT USER ACCOUNT                                 */}
      {/* ======================================================== */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-3xl bg-white shadow-2xl p-6 border border-slate-100">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Edit2 className="h-5 w-5 text-purple-700" />
                <h3 className="font-display text-lg font-black text-navy-900">Edit User Account</h3>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="mt-4 rounded-xl bg-red-50 p-3 text-xs text-red-700 border border-red-200">
                {formError}
              </div>
            )}

            <form onSubmit={handleUpdateUser} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-purple-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={editingUser.email}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-purple-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Reset Password (leave blank to keep current)</label>
                <input
                  type="password"
                  placeholder="New password (optional)"
                  value={editingUser.password || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-purple-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Role Hierarchy</label>
                <select
                  value={editingUser.role}
                  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-purple-600 focus:outline-none"
                >
                  <option value="student">🎓 Student</option>
                  <option value="driver">🚍 Driver</option>
                  <option value="admin">👑 Admin</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Assigned Bus</label>
                <select
                  value={editingUser.bus_id || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, bus_id: e.target.value, stop_id: '' })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-purple-600 focus:outline-none"
                >
                  <option value="">-- None / Unassigned --</option>
                  {buses.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.number} ({b.route?.name})
                    </option>
                  ))}
                </select>
              </div>

              {editingUser.role === 'student' && availableStops.length > 0 && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Assigned Stop</label>
                  <select
                    value={editingUser.stop_id || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, stop_id: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-purple-600 focus:outline-none"
                  >
                    <option value="">-- None --</option>
                    {availableStops.map((s) => (
                      <option key={s.id || s._id} value={s.id || s._id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-purple-700 px-5 py-2 font-bold text-white hover:bg-purple-800 shadow-md"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
