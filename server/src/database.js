import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { supabase, isSupabaseConfigured } from './supabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'supabase_db.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

let localStore = null;

function saveLocalStore() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(localStore, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to persist local database:', err.message);
  }
}

async function initLocalStore() {
  if (fs.existsSync(DB_FILE)) {
    try {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      localStore = JSON.parse(content);
      if (localStore.users?.length) {
        return;
      }
    } catch (e) {
      console.warn('Re-initializing corrupted database file');
    }
  }

  const adminPass = await bcrypt.hash('Admin@123', 10);
  const driverPass = await bcrypt.hash('Driver@123', 10);
  const studentPass = await bcrypt.hash('Student@123', 10);

  const bus1 = {
    id: 'bus-01',
    number: 'BUS-01',
    route_id: null,
    driver_id: 'user-driver-1',
    capacity: 45,
    status: 'idle',
    last_lat: 13.6288,
    last_lng: 79.4192,
    last_speed: 0,
    last_location_at: new Date().toISOString(),
    active: true,
    created_at: new Date().toISOString(),
  };

  const bus2 = {
    id: 'bus-02',
    number: 'BUS-02',
    route_id: null,
    driver_id: 'user-driver-2',
    capacity: 45,
    status: 'idle',
    last_lat: 13.6200,
    last_lng: 79.4120,
    last_speed: 0,
    last_location_at: new Date().toISOString(),
    active: true,
    created_at: new Date().toISOString(),
  };

  const users = [
    {
      id: 'user-admin-1',
      name: 'College Transport Administrator',
      email: 'admin@busora.com',
      password_hash: adminPass,
      role: 'admin',
      phone: '+91 98765 00001',
      active: true,
      created_at: new Date().toISOString(),
    },
    {
      id: 'user-driver-1',
      name: 'Rajesh Kumar (Driver 1)',
      email: 'driver@busora.com',
      password_hash: driverPass,
      role: 'driver',
      bus_id: 'bus-01',
      phone: '+91 98765 00002',
      active: true,
      created_at: new Date().toISOString(),
    },
    {
      id: 'user-driver-2',
      name: 'Sunil Verma (Driver 2)',
      email: 'driver2@busora.com',
      password_hash: driverPass,
      role: 'driver',
      bus_id: 'bus-02',
      phone: '+91 98765 00003',
      active: true,
      created_at: new Date().toISOString(),
    },
    {
      id: 'user-student-1',
      name: 'Aarav Sharma',
      email: 'student@busora.com',
      password_hash: studentPass,
      role: 'student',
      bus_id: 'bus-01',
      stop_id: null,
      phone: '+91 98765 11111',
      active: true,
      created_at: new Date().toISOString(),
    },
    {
      id: 'user-student-2',
      name: 'Priya Patel',
      email: 'student2@busora.com',
      password_hash: studentPass,
      role: 'student',
      bus_id: 'bus-01',
      stop_id: null,
      phone: '+91 98765 22222',
      active: true,
      created_at: new Date().toISOString(),
    },
  ];

  localStore = {
    users,
    routes: [], // Starts completely empty so Admin adds them
    buses: [bus1, bus2],
    trips: [],
    bus_locations: [],
    notifications: [],
  };

  saveLocalStore();
}

// Initialize on module load
await initLocalStore();

export const db = {
  getEngineName() {
    return isSupabaseConfigured ? 'Supabase Cloud PostgreSQL' : 'Supabase (Local Persistent Engine)';
  },

  async findUserByEmail(email) {
    const cleanEmail = String(email || '').trim().toLowerCase();
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('users').select('*').eq('email', cleanEmail).maybeSingle();
      if (error) console.error('Supabase findUserByEmail error:', error);
      return data;
    }
    return localStore.users.find((u) => u.email.toLowerCase() === cleanEmail && u.active);
  },

  async findUserById(id) {
    if (isSupabaseConfigured) {
      const { data } = await supabase.from('users').select('*').eq('id', id).maybeSingle();
      return data;
    }
    return localStore.users.find((u) => u.id === id);
  },

  async getAllUsers() {
    if (isSupabaseConfigured) {
      const { data } = await supabase.from('users').select('*').order('created_at', { ascending: false });
      return data || [];
    }
    return localStore.users;
  },

  async createUser(userData) {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('users').insert(userData).select().single();
      if (error) throw error;
      return data;
    }
    const newUser = {
      id: 'user-' + Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...userData,
    };
    localStore.users.unshift(newUser);
    saveLocalStore();
    return newUser;
  },

  async updateUser(id, updateData) {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('users').update(updateData).eq('id', id).select().single();
      if (error) throw error;
      return data;
    }
    const idx = localStore.users.findIndex((u) => u.id === id);
    if (idx === -1) return null;
    localStore.users[idx] = { ...localStore.users[idx], ...updateData, updated_at: new Date().toISOString() };
    saveLocalStore();
    return localStore.users[idx];
  },

  async deleteUser(id) {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('users').delete().eq('id', id);
      if (error) throw error;
      return true;
    }
    localStore.users = localStore.users.filter((u) => u.id !== id);
    saveLocalStore();
    return true;
  },

  // ---- Buses ----
  async getBuses() {
    if (isSupabaseConfigured) {
      const { data } = await supabase.from('buses').select('*, routes(*), users(name, email, phone)').order('number');
      return (data || []).map((b) => ({
        ...b,
        route: b.routes,
        driver: b.users,
      }));
    }
    return localStore.buses.map((b) => ({
      ...b,
      route: localStore.routes.find((r) => r.id === b.route_id),
      driver: localStore.users.find((u) => u.id === b.driver_id),
    }));
  },

  async getBusById(id) {
    if (isSupabaseConfigured) {
      const { data } = await supabase.from('buses').select('*, routes(*), users(name, email, phone)').eq('id', id).maybeSingle();
      if (!data) return null;
      return { ...data, route: data.routes, driver: data.users };
    }
    const bus = localStore.buses.find((b) => b.id === id);
    if (!bus) return null;
    return {
      ...bus,
      route: localStore.routes.find((r) => r.id === bus.route_id),
      driver: localStore.users.find((u) => u.id === bus.driver_id),
    };
  },

  async getBusByDriverId(driverId) {
    if (isSupabaseConfigured) {
      const { data } = await supabase.from('buses').select('*, routes(*)').eq('driver_id', driverId).maybeSingle();
      if (!data) return null;
      return { ...data, route: data.routes };
    }
    const bus = localStore.buses.find((b) => b.driver_id === driverId);
    if (!bus) return null;
    return {
      ...bus,
      route: localStore.routes.find((r) => r.id === bus.route_id),
    };
  },

  async createBus(busData) {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('buses').insert(busData).select().single();
      if (error) throw error;
      return data;
    }
    const newBus = {
      id: 'bus-' + Date.now(),
      number: busData.number,
      route_id: busData.route_id || null,
      driver_id: busData.driver_id || null,
      capacity: busData.capacity || 45,
      status: 'idle',
      last_lat: busData.last_lat || 13.6288,
      last_lng: busData.last_lng || 79.4192,
      last_speed: 0,
      active: true,
      created_at: new Date().toISOString(),
    };
    localStore.buses.push(newBus);
    saveLocalStore();
    return newBus;
  },

  async updateBus(id, updateData) {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('buses').update(updateData).eq('id', id).select().single();
      if (error) throw error;
      return data;
    }
    const idx = localStore.buses.findIndex((b) => b.id === id);
    if (idx === -1) return null;
    localStore.buses[idx] = { ...localStore.buses[idx], ...updateData, updated_at: new Date().toISOString() };
    saveLocalStore();
    return localStore.buses[idx];
  },

  async deleteBus(id) {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('buses').delete().eq('id', id);
      if (error) throw error;
      return true;
    }
    localStore.buses = localStore.buses.filter((b) => b.id !== id);
    saveLocalStore();
    return true;
  },

  // ---- Routes ----
  async getRoutes() {
    if (isSupabaseConfigured) {
      const { data } = await supabase.from('routes').select('*').order('name');
      return data || [];
    }
    return localStore.routes || [];
  },

  async getRouteById(id) {
    if (isSupabaseConfigured) {
      const { data } = await supabase.from('routes').select('*').eq('id', id).maybeSingle();
      return data;
    }
    return (localStore.routes || []).find((r) => r.id === id);
  },

  async createRoute(routeData) {
    const formattedStops = (routeData.stops || []).map((s, idx) => ({
      id: s.id || `stop-${Date.now()}-${idx + 1}`,
      name: s.name,
      lat: Number(s.lat) || 13.6288,
      lng: Number(s.lng) || 79.4192,
      order: idx + 1,
    }));

    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('routes').insert({
        name: routeData.name,
        description: routeData.description || '',
        stops: formattedStops,
        active: true,
      }).select().single();
      if (error) throw error;
      return data;
    }

    const newRoute = {
      id: 'route-' + Date.now(),
      name: routeData.name,
      description: routeData.description || '',
      stops: formattedStops,
      active: true,
      created_at: new Date().toISOString(),
    };
    localStore.routes.push(newRoute);
    saveLocalStore();
    return newRoute;
  },

  async updateRoute(id, updateData) {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('routes').update(updateData).eq('id', id).select().single();
      if (error) throw error;
      return data;
    }
    const idx = localStore.routes.findIndex((r) => r.id === id);
    if (idx === -1) return null;
    localStore.routes[idx] = { ...localStore.routes[idx], ...updateData, updated_at: new Date().toISOString() };
    saveLocalStore();
    return localStore.routes[idx];
  },

  async deleteRoute(id) {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('routes').delete().eq('id', id);
      if (error) throw error;
      return true;
    }
    localStore.routes = localStore.routes.filter((r) => r.id !== id);
    // Unassign this route from all buses
    localStore.buses.forEach((b) => {
      if (b.route_id === id) b.route_id = null;
    });
    saveLocalStore();
    return true;
  },

  // Convenient helper to assign Route to Bus & Driver
  async assignRoute(routeId, busId, driverId) {
    if (!busId) throw new Error('Please select a bus');
    const updatePayload = { route_id: routeId };
    if (driverId) updatePayload.driver_id = driverId;
    await this.updateBus(busId, updatePayload);

    if (driverId) {
      await this.updateUser(driverId, { bus_id: busId });
    }
    return true;
  },

  // ---- Trips ----
  async getActiveTripByDriver(driverId) {
    if (isSupabaseConfigured) {
      const { data } = await supabase.from('trips').select('*').eq('driver_id', driverId).eq('status', 'active').maybeSingle();
      return data;
    }
    return localStore.trips.find((t) => t.driver_id === driverId && t.status === 'active');
  },

  async getActiveTripByBus(busId) {
    if (isSupabaseConfigured) {
      const { data } = await supabase.from('trips').select('*').eq('bus_id', busId).eq('status', 'active').maybeSingle();
      return data;
    }
    return localStore.trips.find((t) => t.bus_id === busId && t.status === 'active');
  },

  async startTrip(busId, driverId) {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('trips')
        .insert({ bus_id: busId, driver_id: driverId, status: 'active', started_at: new Date().toISOString() })
        .select()
        .single();
      if (error) throw error;
      return data;
    }
    const trip = {
      id: 'trip-' + Date.now(),
      bus_id: busId,
      driver_id: driverId,
      status: 'active',
      started_at: new Date().toISOString(),
      incidents: [],
    };
    localStore.trips.push(trip);
    saveLocalStore();
    return trip;
  },

  async endTrip(tripId) {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('trips')
        .update({ status: 'completed', ended_at: new Date().toISOString() })
        .eq('id', tripId)
        .select()
        .single();
      if (error) throw error;
      return data;
    }
    const trip = localStore.trips.find((t) => t.id === tripId);
    if (trip) {
      trip.status = 'completed';
      trip.ended_at = new Date().toISOString();
      saveLocalStore();
    }
    return trip;
  },

  async recordLocation(tripId, busId, lat, lng, speed) {
    const at = new Date().toISOString();
    if (isSupabaseConfigured) {
      await supabase.from('bus_locations').insert({ trip_id: tripId, bus_id: busId, lat, lng, speed, created_at: at });
    } else {
      localStore.bus_locations.push({ id: 'loc-' + Date.now(), trip_id: tripId, bus_id: busId, lat, lng, speed, created_at: at });
      if (localStore.bus_locations.length > 1000) {
        localStore.bus_locations.shift();
      }
      saveLocalStore();
    }
  },

  async addTripIncident(tripId, incident) {
    if (isSupabaseConfigured) {
      const { data: trip } = await supabase.from('trips').select('incidents').eq('id', tripId).single();
      const list = Array.isArray(trip?.incidents) ? trip.incidents : [];
      list.push(incident);
      await supabase.from('trips').update({ incidents: list }).eq('id', tripId);
    } else {
      const trip = localStore.trips.find((t) => t.id === tripId);
      if (trip) {
        if (!trip.incidents) trip.incidents = [];
        trip.incidents.push(incident);
        saveLocalStore();
      }
    }
  },

  async getRecentTrips() {
    if (isSupabaseConfigured) {
      const { data } = await supabase.from('trips').select('*, buses(number), users(name)').order('started_at', { ascending: false }).limit(50);
      return (data || []).map((t) => ({ ...t, bus: t.buses, driver: t.users }));
    }
    return localStore.trips.slice(-50).reverse().map((t) => ({
      ...t,
      bus: localStore.buses.find((b) => b.id === t.bus_id),
      driver: localStore.users.find((u) => u.id === t.driver_id),
    }));
  },

  async getNotifications(userId) {
    if (isSupabaseConfigured) {
      const { data } = await supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(30);
      return data || [];
    }
    return localStore.notifications.filter((n) => n.user_id === userId).reverse().slice(0, 30);
  },

  async markNotificationsRead(userId) {
    if (isSupabaseConfigured) {
      await supabase.from('notifications').update({ read: true }).eq('user_id', userId);
    } else {
      localStore.notifications.forEach((n) => {
        if (n.user_id === userId) n.read = true;
      });
      saveLocalStore();
    }
  },

  async createNotification(userId, busId, type, message, key) {
    const n = {
      id: 'notif-' + Date.now(),
      user_id: userId,
      bus_id: busId,
      type,
      message,
      notification_key: key,
      read: false,
      created_at: new Date().toISOString(),
    };
    if (isSupabaseConfigured) {
      await supabase.from('notifications').insert(n);
    } else {
      localStore.notifications.push(n);
      saveLocalStore();
    }
  },
};
