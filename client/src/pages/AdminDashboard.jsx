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
  Phone,
  UserPlus, 
  Database, 
  Filter, 
  Radio, 
  FileText,
  Navigation,
  ArrowRight,
  UserCheck,
  UserMinus
} from 'lucide-react';
import BusMap from '../components/BusMap';
import { apiRequest, getSocket } from '../services/api';

export default function AdminDashboard({ user }) {
  const [activeTab, setActiveTab] = useState('groups'); // 'groups' | 'users' | 'fleet' | 'trips'
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [buses, setBuses] = useState([]);
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
    phone: '',
  });

  // Bus Group Modals state
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [newGroup, setNewGroup] = useState({
    number: '',
    name: '',
    capacity: 45,
    driver_id: '',
  });

  const [studentModalBus, setStudentModalBus] = useState(null);
  const [studentFormMode, setStudentFormMode] = useState('new'); // 'new' | 'existing'
  const [existingStudentId, setExistingStudentId] = useState('');
  const [newStudentData, setNewStudentData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
  });

  const [driverModalBus, setDriverModalBus] = useState(null);
  const [selectedDriverId, setSelectedDriverId] = useState('');

  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const loadAllAdminData = async () => {
    try {
      const [s, u, b, t, l] = await Promise.all([
        apiRequest('/admin/stats'),
        apiRequest('/admin/users'),
        apiRequest('/admin/buses'),
        apiRequest('/admin/trips'),
        apiRequest('/admin/live'),
      ]);
      setStats(s);
      setUsers(u || []);
      setBuses(b || []);
      setTrips(t || []);

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

    const interval = setInterval(loadAllAdminData, 12000);

    return () => {
      socket.off('location', handleLocation);
      socket.off('bus-status', handleBusStatus);
      clearInterval(interval);
    };
  }, []);

  const driversList = users.filter((u) => u.role === 'driver');
  const studentsList = users.filter((u) => u.role === 'student');
  const unassignedStudents = studentsList.filter((s) => !s.bus_id);

  const filteredUsers = users.filter((u) => {
    const matchesRole = userRoleFilter === 'all' || u.role === userRoleFilter;
    const matchesSearch =
      !searchQuery ||
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRole && matchesSearch;
  });

  // --- Handlers: Bus Groups ---
  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!newGroup.number.trim()) {
      setFormError('Bus Number (e.g. BUS-03) is required');
      return;
    }

    try {
      setFormError('');
      await apiRequest('/admin/buses', 'POST', newGroup);
      setShowCreateGroupModal(false);
      setNewGroup({ number: '', name: '', capacity: 45, driver_id: '' });
      setFormSuccess('New Bus Group created successfully!');
      loadAllAdminData();
    } catch (err) {
      setFormError(err.message);
    }
  };

  const handleDeleteGroup = async (busId, busNumber) => {
    if (!window.confirm(`Permanently delete Bus Group "${busNumber}"? All assigned students and driver will be unassigned.`)) return;
    try {
      await apiRequest(`/admin/buses/${busId}`, 'DELETE');
      loadAllAdminData();
    } catch (err) {
      alert('Error deleting bus group: ' + err.message);
    }
  };

  const handleOpenAssignDriverModal = (bus) => {
    setDriverModalBus(bus);
    setSelectedDriverId(bus.driver_id || '');
    setFormError('');
  };

  const handleSaveDriverAssignment = async (e) => {
    e.preventDefault();
    if (!driverModalBus) return;

    try {
      setFormError('');
      await apiRequest(`/admin/buses/${driverModalBus.id}`, 'PUT', {
        driver_id: selectedDriverId || null,
      });
      setDriverModalBus(null);
      loadAllAdminData();
    } catch (err) {
      setFormError(err.message);
    }
  };

  const handleOpenAddStudentModal = (bus) => {
    setStudentModalBus(bus);
    setStudentFormMode('new');
    setExistingStudentId(unassignedStudents[0]?.id || '');
    setNewStudentData({ name: '', email: '', password: '', phone: '' });
    setFormError('');
  };

  const handleAddStudentToGroup = async (e) => {
    e.preventDefault();
    if (!studentModalBus) return;

    try {
      setFormError('');
      if (studentFormMode === 'existing') {
        if (!existingStudentId) {
          setFormError('Please select a student.');
          return;
        }
        await apiRequest(`/admin/buses/${studentModalBus.id}/students`, 'POST', {
          user_id: existingStudentId,
        });
      } else {
        if (!newStudentData.name || !newStudentData.email) {
          setFormError('Name and Email are required.');
          return;
        }
        await apiRequest(`/admin/buses/${studentModalBus.id}/students`, 'POST', {
          name: newStudentData.name,
          email: newStudentData.email,
          password: newStudentData.password || 'Student@123',
          phone: newStudentData.phone,
        });
      }

      setStudentModalBus(null);
      loadAllAdminData();
    } catch (err) {
      setFormError(err.message);
    }
  };

  const handleRemoveStudentFromGroup = async (busId, student) => {
    if (!window.confirm(`Remove student ${student.name} from this bus group?`)) return;
    try {
      await apiRequest(`/admin/buses/${busId}/students/${student.id}`, 'DELETE');
      loadAllAdminData();
    } catch (err) {
      alert('Error removing student: ' + err.message);
    }
  };

  // --- Handlers: User Management ---
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
        phone: '',
      });
      setShowAddUserModal(false);
      loadAllAdminData();
    } catch (err) {
      setFormError(err.message);
    }
  };

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
              Bus Group Architecture, Group Student Rosters & Fleet Governance
            </p>
          </div>
        </div>

        {/* Admin Credentials Indicator */}
        <div className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-2.5 backdrop-blur-sm border border-white/10 text-xs">
          <ShieldCheck className="h-4 w-4 text-purple-400" />
          <div>
            <p className="text-[10px] text-slate-300">Logged in as Administrator</p>
            <p className="font-bold text-white">{user.email}</p>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-xs font-semibold text-slate-500">Bus Groups</p>
          <p className="text-2xl font-black text-purple-700 mt-1">{buses.length}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Active transit groups</p>
        </div>

        <div className="card p-4">
          <p className="text-xs font-semibold text-slate-500">Registered Students</p>
          <p className="text-2xl font-black text-sky-600 mt-1">{studentsList.length}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Commuters enrolled</p>
        </div>

        <div className="card p-4">
          <p className="text-xs font-semibold text-slate-500">Assigned Drivers</p>
          <p className="text-2xl font-black text-emerald-600 mt-1">{driversList.length}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Campus operators</p>
        </div>

        <div className="card p-4">
          <p className="text-xs font-semibold text-slate-500">Active Live Trips</p>
          <p className="text-2xl font-black text-amber-600 mt-1">{buses.filter(b => b.status === 'running').length}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Buses broadcasting GPS</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto pb-1 text-sm font-bold">
        <button
          onClick={() => setActiveTab('groups')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${
            activeTab === 'groups'
              ? 'bg-purple-700 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Bus className="h-4 w-4" />
          <span>Bus Groups ({buses.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${
            activeTab === 'users'
              ? 'bg-purple-700 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Users & Drivers ({users.length})</span>
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
          onClick={() => setActiveTab('trips')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${
            activeTab === 'trips'
              ? 'bg-purple-700 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>Trip Logs ({trips.length})</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: BUS GROUPS MANAGEMENT                             */}
      {/* ======================================================== */}
      {activeTab === 'groups' && (
        <div className="space-y-6">
          {/* Top action ribbon */}
          <div className="rounded-2xl bg-gradient-to-r from-purple-50 via-sky-50 to-emerald-50 p-5 border border-purple-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-navy-900 text-base flex items-center gap-2">
                <Bus className="h-5 w-5 text-purple-700" />
                Bus Groups & People Rosters
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                Admin creates groups of people including the bus driver. Students only have access to their assigned bus group.
              </p>
            </div>
            <button
              onClick={() => {
                setFormError('');
                setShowCreateGroupModal(true);
              }}
              className="btn-primary bg-purple-700 hover:bg-purple-800 text-xs py-2.5 px-4 shadow-sm shrink-0"
            >
              <Plus className="h-4 w-4" />
              Create New Bus Group
            </button>
          </div>

          {/* Bus Groups Grid */}
          {buses.length === 0 ? (
            <div className="card p-12 text-center border-dashed border-2 border-slate-300">
              <Bus className="h-12 w-12 text-purple-300 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-navy-900">No Bus Groups Created Yet</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-6">
                Create your first bus group by assigning a bus number, group route name, driver, and group students.
              </p>
              <button
                onClick={() => {
                  setFormError('');
                  setShowCreateGroupModal(true);
                }}
                className="btn-primary bg-purple-700 hover:bg-purple-800 text-xs py-3 px-6 shadow-md"
              >
                <Plus className="h-4 w-4" />
                Create First Bus Group
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {buses.map((bus) => {
                const assignedDriver = bus.driver || driversList.find((d) => d.id === bus.driver_id);
                const assignedStudents = bus.students || studentsList.filter((s) => s.bus_id === bus.id);
                const isRunning = bus.status === 'running';

                return (
                  <div key={bus.id} className="card p-6 border-2 border-slate-200/80 space-y-5 hover:shadow-xl transition-all">
                    {/* Header: Bus Number & Status */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-700 text-white font-black text-xl shadow-md">
                          <Bus className="h-6 w-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-black text-xl text-navy-900">{bus.number}</h4>
                            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                              isRunning
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}>
                              {isRunning ? '🟢 Active On Route' : '⏸️ Idle'}
                            </span>
                          </div>
                          <p className="text-xs font-semibold text-purple-800 mt-0.5">
                            {bus.name || `${bus.number} Group`}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteGroup(bus.id, bus.number)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Bus Group"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Driver Card Row */}
                    <div className="rounded-2xl bg-slate-50 p-3.5 border border-slate-200 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 font-bold">
                          🚍
                        </div>
                        <div>
                          <p className="text-[10px] uppercase font-bold text-slate-400">Assigned Driver</p>
                          <p className="font-black text-xs text-slate-800">
                            {assignedDriver ? assignedDriver.name : 'No Driver Assigned'}
                          </p>
                          {assignedDriver?.phone && (
                            <p className="text-[11px] text-slate-500 font-mono">{assignedDriver.phone}</p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleOpenAssignDriverModal(bus)}
                        className="rounded-xl bg-white border border-slate-300 px-3 py-1.5 text-xs font-bold text-purple-700 hover:bg-purple-50 transition-colors shadow-2xs"
                      >
                        {assignedDriver ? 'Change Driver' : 'Assign Driver'}
                      </button>
                    </div>

                    {/* Group Students Roster */}
                    <div>
                      <div className="flex items-center justify-between mb-2.5">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-sky-600" />
                          <h5 className="font-bold text-xs text-navy-900">
                            Group Students ({assignedStudents.length})
                          </h5>
                        </div>
                        <button
                          onClick={() => handleOpenAddStudentModal(bus)}
                          className="text-xs font-bold text-sky-700 hover:text-sky-800 hover:underline flex items-center gap-1"
                        >
                          <UserPlus className="h-3.5 w-3.5" />
                          Add Student
                        </button>
                      </div>

                      {assignedStudents.length === 0 ? (
                        <div className="rounded-xl bg-slate-50 p-4 text-center border border-dashed border-slate-200 text-xs text-slate-400">
                          No students added to this bus group yet. Click <strong>Add Student</strong> above to enroll students.
                        </div>
                      ) : (
                        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                          {assignedStudents.map((st) => (
                            <div
                              key={st.id}
                              className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs border border-slate-100 hover:border-slate-200"
                            >
                              <div className="flex items-center gap-2.5">
                                <div className="h-6 w-6 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-[10px]">
                                  {st.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <p className="font-bold text-slate-800">{st.name}</p>
                                  <p className="text-[10px] text-slate-400">{st.email} {st.phone && `• ${st.phone}`}</p>
                                </div>
                              </div>
                              <button
                                onClick={() => handleRemoveStudentFromGroup(bus.id, st)}
                                className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                                title="Remove from group"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: USERS & DRIVERS MANAGEMENT                         */}
      {/* ======================================================== */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200 text-xs text-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <p className="font-bold text-navy-900 text-sm mb-0.5">User Hierarchy Management</p>
              <p className="text-slate-600">
                Create new Driver and Student accounts, update passwords, and manage institutional accounts.
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
                  <th className="px-5 py-3.5">Role</th>
                  <th className="px-5 py-3.5">Assigned Bus Group</th>
                  <th className="px-5 py-3.5">Phone</th>
                  <th className="px-5 py-3.5">Status</th>
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
                              👑 Admin
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
                                {assignedBus.name}
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
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: LIVE FLEET RADAR MAP                              */}
      {/* ======================================================== */}
      {activeTab === 'fleet' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-navy-900">Campus-Wide Live Fleet Map</h3>
              <p className="text-xs text-slate-500">Live GPS stream for all active college bus groups</p>
            </div>
            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              GPS Broadcast Active
            </span>
          </div>

          <BusMap
            buses={busPoints}
            stops={[]}
            height="500px"
          />
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: TRIP LOGS & HISTORY                               */}
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
      {/* MODAL 1: CREATE BUS GROUP                                */}
      {/* ======================================================== */}
      {showCreateGroupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-3xl bg-white shadow-2xl p-6 border border-slate-100">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Bus className="h-5 w-5 text-purple-700" />
                <h3 className="font-display text-lg font-black text-navy-900">Create New Bus Group</h3>
              </div>
              <button
                onClick={() => setShowCreateGroupModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="mt-4 rounded-xl bg-red-50 p-3 text-xs text-red-700 border border-red-200">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateGroup} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Bus Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BUS-03"
                  value={newGroup.number}
                  onChange={(e) => setNewGroup({ ...newGroup, number: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-purple-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Group / Area Designation</label>
                <input
                  type="text"
                  placeholder="e.g. Chittoor & Palamaner Group"
                  value={newGroup.name}
                  onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-purple-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Seating Capacity</label>
                <input
                  type="number"
                  value={newGroup.capacity}
                  onChange={(e) => setNewGroup({ ...newGroup, capacity: Number(e.target.value) })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-purple-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Assign Driver</label>
                <select
                  value={newGroup.driver_id}
                  onChange={(e) => setNewGroup({ ...newGroup, driver_id: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-purple-600 focus:outline-none"
                >
                  <option value="">-- Select Driver (Optional) --</option>
                  {driversList.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateGroupModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-purple-700 px-5 py-2 font-bold text-white hover:bg-purple-800 shadow-md"
                >
                  Create Bus Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: ADD STUDENT TO BUS GROUP                        */}
      {/* ======================================================== */}
      {studentModalBus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-3xl bg-white shadow-2xl p-6 border border-slate-100">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-purple-700" />
                <div>
                  <h3 className="font-display text-lg font-black text-navy-900">Add Student to {studentModalBus.number}</h3>
                  <p className="text-[11px] text-slate-500">{studentModalBus.name}</p>
                </div>
              </div>
              <button
                onClick={() => setStudentModalBus(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="mt-4 rounded-xl bg-red-50 p-3 text-xs text-red-700 border border-red-200">
                {formError}
              </div>
            )}

            <div className="mt-4 flex rounded-xl bg-slate-100 p-1 text-xs font-bold">
              <button
                type="button"
                onClick={() => setStudentFormMode('new')}
                className={`flex-1 py-1.5 rounded-lg transition-all ${
                  studentFormMode === 'new' ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-600'
                }`}
              >
                Create New Student
              </button>
              <button
                type="button"
                onClick={() => setStudentFormMode('existing')}
                className={`flex-1 py-1.5 rounded-lg transition-all ${
                  studentFormMode === 'existing' ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-600'
                }`}
              >
                Select Unassigned Student ({unassignedStudents.length})
              </button>
            </div>

            <form onSubmit={handleAddStudentToGroup} className="mt-4 space-y-3.5 text-xs">
              {studentFormMode === 'existing' ? (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Select Student</label>
                  {unassignedStudents.length === 0 ? (
                    <p className="text-xs text-amber-600 bg-amber-50 p-3 rounded-xl border border-amber-200">
                      No unassigned students available. Switch to "Create New Student" to register a student directly into this group.
                    </p>
                  ) : (
                    <select
                      value={existingStudentId}
                      onChange={(e) => setExistingStudentId(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-purple-600 focus:outline-none"
                    >
                      {unassignedStudents.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.email})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              ) : (
                <>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Student Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh Reddy"
                      value={newStudentData.name}
                      onChange={(e) => setNewStudentData({ ...newStudentData, name: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-purple-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Student Email Address *</label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. ramesh@busora.com"
                      value={newStudentData.email}
                      onChange={(e) => setNewStudentData({ ...newStudentData, email: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-purple-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Password</label>
                    <input
                      type="password"
                      placeholder="Default: Student@123"
                      value={newStudentData.password}
                      onChange={(e) => setNewStudentData({ ...newStudentData, password: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-purple-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Phone Number (Optional)</label>
                    <input
                      type="text"
                      placeholder="+91 98765 43210"
                      value={newStudentData.phone}
                      onChange={(e) => setNewStudentData({ ...newStudentData, phone: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-purple-600 focus:outline-none"
                    />
                  </div>
                </>
              )}

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setStudentModalBus(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={studentFormMode === 'existing' && unassignedStudents.length === 0}
                  className="rounded-xl bg-purple-700 px-5 py-2 font-bold text-white hover:bg-purple-800 shadow-md disabled:opacity-50"
                >
                  Add Student to Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: ASSIGN / CHANGE DRIVER                          */}
      {/* ======================================================== */}
      {driverModalBus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-3xl bg-white shadow-2xl p-6 border border-slate-100">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Bus className="h-5 w-5 text-purple-700" />
                <div>
                  <h3 className="font-display text-lg font-black text-navy-900">Assign Driver</h3>
                  <p className="text-[11px] text-slate-500">Bus: {driverModalBus.number} - {driverModalBus.name}</p>
                </div>
              </div>
              <button
                onClick={() => setDriverModalBus(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="mt-4 rounded-xl bg-red-50 p-3 text-xs text-red-700 border border-red-200">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveDriverAssignment} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Select Driver</label>
                <select
                  value={selectedDriverId}
                  onChange={(e) => setSelectedDriverId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-purple-600 focus:outline-none"
                >
                  <option value="">-- No Driver (Unassigned) --</option>
                  {driversList.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDriverModalBus(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-purple-700 px-5 py-2 font-bold text-white hover:bg-purple-800 shadow-md"
                >
                  Save Driver Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 4: ADD NEW USER ACCOUNT                            */}
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
              <div>
                <label className="block font-bold text-slate-700 mb-1">User Role *</label>
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

              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rajesh Kumar"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-purple-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. rajesh@busora.com"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-purple-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Password *</label>
                <input
                  type="password"
                  required
                  placeholder="Set initial password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-purple-600 focus:outline-none"
                />
              </div>

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

              {(newUser.role === 'driver' || newUser.role === 'student') && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Assign Bus Group</label>
                  <select
                    value={newUser.bus_id}
                    onChange={(e) => setNewUser({ ...newUser, bus_id: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-purple-600 focus:outline-none"
                  >
                    <option value="">-- Select Bus Group --</option>
                    {buses.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.number} ({b.name})
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
      {/* MODAL 5: EDIT USER ACCOUNT                               */}
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
                <label className="block font-bold text-slate-700 mb-1">Reset Password (optional)</label>
                <input
                  type="password"
                  placeholder="New password (leave blank to keep current)"
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
                <label className="block font-bold text-slate-700 mb-1">Assigned Bus Group</label>
                <select
                  value={editingUser.bus_id || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, bus_id: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-purple-600 focus:outline-none"
                >
                  <option value="">-- None / Unassigned --</option>
                  {buses.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.number} ({b.name})
                    </option>
                  ))}
                </select>
              </div>

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
