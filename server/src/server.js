import 'dotenv/config';
import http from 'http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Server } from 'socket.io';
import { supabase, isSupabaseConfigured } from './supabase.js';

const JWT_SECRET = process.env.JWT_SECRET || 'busora-super-secret-jwt-key-2026';
const PORT = process.env.PORT || 5000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || '*';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: CLIENT_ORIGIN === '*' ? true : CLIENT_ORIGIN,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  },
});

app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);
app.use(
  cors({
    origin: CLIENT_ORIGIN === '*' ? true : CLIENT_ORIGIN,
    credentials: true,
  })
);
app.use(express.json({ limit: '50kb' }));

// Rate limiters
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100, message: { error: 'Too many auth requests' } });
const apiLimiter = rateLimit({ windowMs: 60 * 1000, max: 600 });
app.use('/api/auth', authLimiter);
app.use('/api', apiLimiter);

// -------------------------------------------------------------
// In-Memory Database Fallback (used if Supabase is not configured yet)
// -------------------------------------------------------------
let memoryStore = {
  users: [],
  routes: [],
  buses: [],
  trips: [],
  busLocations: [],
  notifications: [],
};

async function initInMemoryData() {
  const adminPass = await bcrypt.hash('Admin@123', 10);
  const driverPass = await bcrypt.hash('Driver@123', 10);
  const studentPass = await bcrypt.hash('Student@123', 10);

  const route1 = {
    id: 'route-north-1',
    name: 'Route A (North Campus Express)',
    description: 'Main Campus to North City via Station',
    active: true,
    stops: [
      { id: 'stop-1', name: 'Main Campus Gate', lat: 13.6288, lng: 79.4192, order: 1 },
      { id: 'stop-2', name: 'Market Complex', lat: 13.6350, lng: 79.4250, order: 2 },
      { id: 'stop-3', name: 'Central Railway Station', lat: 13.6420, lng: 79.4300, order: 3 },
      { id: 'stop-4', name: 'North City Terminal', lat: 13.6510, lng: 79.4380, order: 4 },
    ],
  };

  const route2 = {
    id: 'route-south-2',
    name: 'Route B (South Tech Shuttle)',
    description: 'South Campus to Tech Park and City Mall',
    active: true,
    stops: [
      { id: 'stop-5', name: 'South Campus Gate', lat: 13.6200, lng: 79.4120, order: 1 },
      { id: 'stop-6', name: 'Tech Park Circle', lat: 13.6150, lng: 79.4050, order: 2 },
      { id: 'stop-7', name: 'City Mall Junction', lat: 13.6080, lng: 79.3980, order: 3 },
    ],
  };

  const bus1 = {
    id: 'bus-01',
    number: 'BUS-01',
    route_id: route1.id,
    driver_id: 'user-driver-1',
    capacity: 45,
    status: 'idle',
    last_lat: 13.6288,
    last_lng: 79.4192,
    last_speed: 0,
    last_location_at: new Date().toISOString(),
    active: true,
  };

  const bus2 = {
    id: 'bus-02',
    number: 'BUS-02',
    route_id: route2.id,
    driver_id: 'user-driver-2',
    capacity: 45,
    status: 'idle',
    last_lat: 13.6200,
    last_lng: 79.4120,
    last_speed: 0,
    last_location_at: new Date().toISOString(),
    active: true,
  };

  memoryStore.routes = [route1, route2];
  memoryStore.buses = [bus1, bus2];

  memoryStore.users = [
    {
      id: 'user-admin-1',
      name: 'College Transport Administrator',
      email: 'admin@busora.com',
      password_hash: adminPass,
      role: 'admin',
      phone: '+91 98765 00001',
      active: true,
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
    },
    {
      id: 'user-student-1',
      name: 'Aarav Sharma',
      email: 'student@busora.com',
      password_hash: studentPass,
      role: 'student',
      bus_id: 'bus-01',
      stop_id: 'stop-2',
      phone: '+91 98765 11111',
      active: true,
    },
    {
      id: 'user-student-2',
      name: 'Priya Patel',
      email: 'student2@busora.com',
      password_hash: studentPass,
      role: 'student',
      bus_id: 'bus-01',
      stop_id: 'stop-3',
      phone: '+91 98765 22222',
      active: true,
    },
    {
      id: 'user-student-3',
      name: 'Rohan Gupta',
      email: 'student3@busora.com',
      password_hash: studentPass,
      role: 'student',
      bus_id: 'bus-02',
      stop_id: 'stop-6',
      phone: '+91 98765 33333',
      active: true,
    },
  ];
}
initInMemoryData();

// -------------------------------------------------------------
// Unified Data Access Layer (Supabase vs Memory Store)
// -------------------------------------------------------------
const db = {
  async findUserByEmail(email) {
    const cleanEmail = String(email || '').trim().toLowerCase();
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('users').select('*').eq('email', cleanEmail).maybeSingle();
      if (error) console.error('Supabase findUserByEmail error:', error);
      return data;
    }
    return memoryStore.users.find((u) => u.email.toLowerCase() === cleanEmail && u.active);
  },

  async findUserById(id) {
    if (isSupabaseConfigured) {
      const { data } = await supabase.from('users').select('*').eq('id', id).maybeSingle();
      return data;
    }
    return memoryStore.users.find((u) => u.id === id);
  },

  async getAllUsers() {
    if (isSupabaseConfigured) {
      const { data } = await supabase.from('users').select('*').order('created_at', { ascending: false });
      return data || [];
    }
    return memoryStore.users;
  },

  async createUser(userData) {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('users').insert(userData).select().single();
      if (error) throw error;
      return data;
    }
    const newUser = { id: 'user-' + Date.now(), created_at: new Date().toISOString(), ...userData };
    memoryStore.users.push(newUser);
    return newUser;
  },

  async updateUser(id, updateData) {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('users').update(updateData).eq('id', id).select().single();
      if (error) throw error;
      return data;
    }
    const idx = memoryStore.users.findIndex((u) => u.id === id);
    if (idx === -1) return null;
    memoryStore.users[idx] = { ...memoryStore.users[idx], ...updateData };
    return memoryStore.users[idx];
  },

  async deleteUser(id) {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('users').delete().eq('id', id);
      if (error) throw error;
      return true;
    }
    memoryStore.users = memoryStore.users.filter((u) => u.id !== id);
    return true;
  },

  async getBuses() {
    if (isSupabaseConfigured) {
      const { data } = await supabase.from('buses').select('*, routes(*), users(name, email, phone)').order('number');
      return (data || []).map((b) => ({
        ...b,
        route: b.routes,
        driver: b.users,
      }));
    }
    return memoryStore.buses.map((b) => ({
      ...b,
      route: memoryStore.routes.find((r) => r.id === b.route_id),
      driver: memoryStore.users.find((u) => u.id === b.driver_id),
    }));
  },

  async getBusById(id) {
    if (isSupabaseConfigured) {
      const { data } = await supabase.from('buses').select('*, routes(*), users(name, email, phone)').eq('id', id).maybeSingle();
      if (!data) return null;
      return { ...data, route: data.routes, driver: data.users };
    }
    const bus = memoryStore.buses.find((b) => b.id === id);
    if (!bus) return null;
    return {
      ...bus,
      route: memoryStore.routes.find((r) => r.id === bus.route_id),
      driver: memoryStore.users.find((u) => u.id === bus.driver_id),
    };
  },

  async getBusByDriverId(driverId) {
    if (isSupabaseConfigured) {
      const { data } = await supabase.from('buses').select('*, routes(*)').eq('driver_id', driverId).maybeSingle();
      if (!data) return null;
      return { ...data, route: data.routes };
    }
    const bus = memoryStore.buses.find((b) => b.driver_id === driverId);
    if (!bus) return null;
    return {
      ...bus,
      route: memoryStore.routes.find((r) => r.id === bus.route_id),
    };
  },

  async updateBus(id, updateData) {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('buses').update(updateData).eq('id', id).select().single();
      if (error) throw error;
      return data;
    }
    const idx = memoryStore.buses.findIndex((b) => b.id === id);
    if (idx === -1) return null;
    memoryStore.buses[idx] = { ...memoryStore.buses[idx], ...updateData };
    return memoryStore.buses[idx];
  },

  async getRoutes() {
    if (isSupabaseConfigured) {
      const { data } = await supabase.from('routes').select('*').order('name');
      return data || [];
    }
    return memoryStore.routes;
  },

  async getActiveTripByDriver(driverId) {
    if (isSupabaseConfigured) {
      const { data } = await supabase.from('trips').select('*').eq('driver_id', driverId).eq('status', 'active').maybeSingle();
      return data;
    }
    return memoryStore.trips.find((t) => t.driver_id === driverId && t.status === 'active');
  },

  async getActiveTripByBus(busId) {
    if (isSupabaseConfigured) {
      const { data } = await supabase.from('trips').select('*').eq('bus_id', busId).eq('status', 'active').maybeSingle();
      return data;
    }
    return memoryStore.trips.find((t) => t.bus_id === busId && t.status === 'active');
  },

  async startTrip(busId, driverId) {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('trips').insert({ bus_id: busId, driver_id: driverId, status: 'active', started_at: new Date().toISOString() }).select().single();
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
    memoryStore.trips.push(trip);
    return trip;
  },

  async endTrip(tripId) {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('trips').update({ status: 'completed', ended_at: new Date().toISOString() }).eq('id', tripId).select().single();
      if (error) throw error;
      return data;
    }
    const trip = memoryStore.trips.find((t) => t.id === tripId);
    if (trip) {
      trip.status = 'completed';
      trip.ended_at = new Date().toISOString();
    }
    return trip;
  },

  async recordLocation(tripId, busId, lat, lng, speed) {
    const at = new Date().toISOString();
    if (isSupabaseConfigured) {
      await supabase.from('bus_locations').insert({ trip_id: tripId, bus_id: busId, lat, lng, speed, created_at: at });
    } else {
      memoryStore.busLocations.push({ id: 'loc-' + Date.now(), trip_id: tripId, bus_id: busId, lat, lng, speed, created_at: at });
    }
  },

  async addTripIncident(tripId, incident) {
    if (isSupabaseConfigured) {
      const { data: trip } = await supabase.from('trips').select('incidents').eq('id', tripId).single();
      const list = Array.isArray(trip?.incidents) ? trip.incidents : [];
      list.push(incident);
      await supabase.from('trips').update({ incidents: list }).eq('id', tripId);
    } else {
      const trip = memoryStore.trips.find((t) => t.id === tripId);
      if (trip) {
        if (!trip.incidents) trip.incidents = [];
        trip.incidents.push(incident);
      }
    }
  },

  async getRecentTrips() {
    if (isSupabaseConfigured) {
      const { data } = await supabase.from('trips').select('*, buses(number), users(name)').order('started_at', { ascending: false }).limit(50);
      return (data || []).map((t) => ({ ...t, bus: t.buses, driver: t.users }));
    }
    return memoryStore.trips.slice(-50).reverse().map((t) => ({
      ...t,
      bus: memoryStore.buses.find((b) => b.id === t.bus_id),
      driver: memoryStore.users.find((u) => u.id === t.driver_id),
    }));
  },

  async getNotifications(userId) {
    if (isSupabaseConfigured) {
      const { data } = await supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(30);
      return data || [];
    }
    return memoryStore.notifications.filter((n) => n.user_id === userId).reverse().slice(0, 30);
  },

  async markNotificationsRead(userId) {
    if (isSupabaseConfigured) {
      await supabase.from('notifications').update({ read: true }).eq('user_id', userId);
    } else {
      memoryStore.notifications.forEach((n) => {
        if (n.user_id === userId) n.read = true;
      });
    }
  },

  async createNotification(userId, busId, type, message, key) {
    const n = {
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
      memoryStore.notifications.push({ id: 'notif-' + Date.now(), ...n });
    }
  },
};

// -------------------------------------------------------------
// Helper functions
// -------------------------------------------------------------
const signToken = (user) => jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '12h' });

const auth = (...roles) => async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (!token) return res.status(401).json({ error: 'No authorization token provided' });

    const payload = jwt.verify(token, JWT_SECRET);
    const user = await db.findUserById(payload.id);
    if (!user || !user.active) return res.status(401).json({ error: 'User inactive or not found' });
    if (roles.length && !roles.includes(user.role)) {
      return res.status(403).json({ error: `Forbidden: requires role (${roles.join(', ')})` });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

const km = (a, b) => {
  const r = (x) => (x * Math.PI) / 180;
  const d = r(b.lat - a.lat);
  const e = r(b.lng - a.lng);
  return 12742 * Math.asin(Math.sqrt(Math.sin(d / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(e / 2) ** 2));
};

async function broadcastNotify(busId, type, message, key) {
  const allUsers = await db.getAllUsers();
  const targets = allUsers.filter((u) => u.active && (u.role === 'admin' || (u.role === 'student' && u.bus_id === busId)));

  for (const u of targets) {
    await db.createNotification(u.id, busId, type, message, key);
    io.to(`user:${u.id}`).emit('notification', { type, message, busId, createdAt: new Date() });
  }
}

// -------------------------------------------------------------
// API Endpoints
// -------------------------------------------------------------

// 1. Health check & DB status
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    database: isSupabaseConfigured ? 'supabase-postgresql' : 'in-memory-demo',
    timestamp: new Date().toISOString(),
  });
});

// 2. Public Fleet & Route summary (for Homepage)
app.get('/api/public/summary', async (req, res) => {
  try {
    const buses = await db.getBuses();
    const routes = await db.getRoutes();
    const allUsers = await db.getAllUsers();

    const activeCount = buses.filter((b) => b.status === 'running').length;
    const idleCount = buses.filter((b) => b.status === 'idle').length;
    const delayedCount = buses.filter((b) => b.status === 'delayed').length;
    const studentsCount = allUsers.filter((u) => u.role === 'student').length;

    res.json({
      database: isSupabaseConfigured ? 'supabase' : 'demo',
      stats: {
        totalBuses: buses.length,
        activeBuses: activeCount,
        idleBuses: idleCount,
        delayedBuses: delayedCount,
        routesCount: routes.length,
        totalStudents: studentsCount,
        onTimeRate: '98.5%',
      },
      buses: buses.map((b) => ({
        id: b.id,
        number: b.number,
        status: b.status,
        last_lat: b.last_lat,
        last_lng: b.last_lng,
        last_speed: b.last_speed,
        last_location_at: b.last_location_at,
        routeName: b.route?.name || 'Unassigned',
      })),
      routes: routes.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        stopsCount: Array.isArray(r.stops) ? r.stops.length : 0,
        stops: r.stops,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Auth
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const user = await db.findUserByEmail(email);
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });

    const passMatch = await bcrypt.compare(String(password), user.password_hash);
    if (!passMatch) return res.status(401).json({ error: 'Invalid email or password' });

    const token = signToken(user);
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        bus_id: user.bus_id,
        stop_id: user.stop_id,
        phone: user.phone,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/auth/me', auth(), (req, res) => {
  const { password_hash, ...safeUser } = req.user;
  res.json({ user: safeUser });
});

// 4. Notifications
app.get('/api/notifications', auth(), async (req, res) => {
  try {
    const notifs = await db.getNotifications(req.user.id);
    res.json(notifs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/notifications/read', auth(), async (req, res) => {
  try {
    await db.markNotificationsRead(req.user.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Student Portal
app.get('/api/student/bus', auth('student'), async (req, res) => {
  try {
    if (!req.user.bus_id) return res.json({ bus: null, message: 'No bus assigned' });

    const bus = await db.getBusById(req.user.bus_id);
    if (!bus) return res.json({ bus: null, message: 'Bus not found' });

    const trip = await db.getActiveTripByBus(bus.id);
    const stops = Array.isArray(bus.route?.stops) ? bus.route.stops : [];
    const stop = stops.find((s) => s.id === req.user.stop_id || s._id === req.user.stop_id);

    res.json({
      bus: {
        id: bus.id,
        number: bus.number,
        status: bus.status,
        lastLocation: {
          lat: bus.last_lat,
          lng: bus.last_lng,
          speed: bus.last_speed,
          at: bus.last_location_at,
        },
        route: bus.route,
        driver: bus.driver,
      },
      stop: stop || null,
      tripActive: Boolean(trip),
      trip,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Driver Portal
app.get('/api/driver/me', auth('driver'), async (req, res) => {
  try {
    const bus = await db.getBusByDriverId(req.user.id);
    const trip = bus ? await db.getActiveTripByDriver(req.user.id) : null;
    res.json({
      bus: bus
        ? {
            id: bus.id,
            number: bus.number,
            status: bus.status,
            route: bus.route,
            lastLocation: {
              lat: bus.last_lat,
              lng: bus.last_lng,
              speed: bus.last_speed,
              at: bus.last_location_at,
            },
          }
        : null,
      trip: trip || null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/driver/trip/start', auth('driver'), async (req, res) => {
  try {
    const bus = await db.getBusByDriverId(req.user.id);
    if (!bus) return res.status(404).json({ error: 'No bus assigned to this driver' });

    const existingTrip = await db.getActiveTripByDriver(req.user.id);
    if (existingTrip) return res.status(409).json({ error: 'A trip is already in progress' });

    const trip = await db.startTrip(bus.id, req.user.id);
    await db.updateBus(bus.id, { status: 'running' });

    await broadcastNotify(bus.id, 'trip_started', `Bus ${bus.number} has started its trip route`, `start:${trip.id}`);
    io.to('admins').emit('bus-status', { bus: bus.id, status: 'running' });

    res.json(trip);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/driver/trip/end', auth('driver'), async (req, res) => {
  try {
    const trip = await db.getActiveTripByDriver(req.user.id);
    if (!trip) return res.status(409).json({ error: 'No active trip to end' });

    await db.endTrip(trip.id);
    const bus = await db.getBusById(trip.bus_id);
    if (bus) {
      await db.updateBus(bus.id, { status: 'idle' });
      await broadcastNotify(bus.id, 'trip_completed', `Bus ${bus.number} completed its trip successfully`, `end:${trip.id}`);
      io.to(`bus:${bus.id}`).to('admins').emit('bus-status', { bus: bus.id, status: 'idle' });
    }

    res.json({ ok: true, message: 'Trip completed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/driver/location', auth('driver'), async (req, res) => {
  try {
    const { lat, lng, speed } = req.body;
    if (![lat, lng].every(Number.isFinite) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      return res.status(400).json({ error: 'Invalid coordinates' });
    }

    const trip = await db.getActiveTripByDriver(req.user.id);
    if (!trip) return res.status(409).json({ error: 'No active trip — start trip before sending GPS' });

    const bus = await db.getBusById(trip.bus_id);
    if (!bus) return res.status(404).json({ error: 'Bus not found' });

    const at = new Date().toISOString();
    const sp = Number.isFinite(speed) ? speed : 0;

    await db.updateBus(bus.id, {
      last_lat: lat,
      last_lng: lng,
      last_speed: sp,
      last_location_at: at,
      status: 'running',
    });
    await db.recordLocation(trip.id, bus.id, lat, lng, sp);

    const locationPayload = {
      bus: bus.id,
      number: bus.number,
      lat,
      lng,
      speed: sp,
      at,
    };

    io.to(`bus:${bus.id}`).to('admins').emit('location', locationPayload);

    // Check proximity to stops (< 500m)
    const stops = Array.isArray(bus.route?.stops) ? bus.route.stops : [];
    for (const st of stops) {
      if (st.lat && st.lng && km({ lat, lng }, st) < 0.5) {
        await broadcastNotify(
          bus.id,
          'approaching',
          `Bus ${bus.number} is approaching ${st.name}!`,
          `near:${trip.id}:${st.id || st.name}`
        );
      }
    }

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/driver/report', auth('driver'), async (req, res) => {
  try {
    const { type, note } = req.body;
    if (!['delay', 'breakdown', 'emergency'].includes(type)) {
      return res.status(400).json({ error: 'Invalid incident type' });
    }

    const trip = await db.getActiveTripByDriver(req.user.id);
    if (!trip) return res.status(409).json({ error: 'No active trip' });

    const incident = {
      type,
      note: String(note || '').slice(0, 300),
      at: new Date().toISOString(),
    };
    await db.addTripIncident(trip.id, incident);

    const newStatus = type === 'delay' ? 'delayed' : 'emergency';
    await db.updateBus(trip.bus_id, { status: newStatus });

    const bus = await db.getBusById(trip.bus_id);
    await broadcastNotify(
      trip.bus_id,
      type,
      `🚨 Bus ${bus?.number || 'alert'}: ${type.toUpperCase()} reported! ${note ? '— ' + note : ''}`,
      `inc:${trip.id}:${type}:${Date.now()}`
    );
    io.to(`bus:${trip.bus_id}`).to('admins').emit('bus-status', { bus: trip.bus_id, status: newStatus });

    res.json({ ok: true, message: 'Incident reported and broadcasted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Admin Portal & User Hierarchy Management
app.get('/api/admin/stats', auth('admin'), async (req, res) => {
  try {
    const buses = await db.getBuses();
    const allUsers = await db.getAllUsers();
    const routes = await db.getRoutes();

    const activeTrips = buses.filter((b) => b.status === 'running').length;
    const students = allUsers.filter((u) => u.role === 'student' && u.active).length;
    const drivers = allUsers.filter((u) => u.role === 'driver' && u.active).length;
    const admins = allUsers.filter((u) => u.role === 'admin' && u.active).length;

    res.json({
      buses: buses.filter((b) => b.active).length,
      students,
      drivers,
      admins,
      activeTrips,
      routes: routes.length,
      isSupabase: isSupabaseConfigured,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/live', auth('admin'), async (req, res) => {
  try {
    const buses = await db.getBuses();
    res.json(
      buses.map((b) => ({
        id: b.id,
        number: b.number,
        status: b.status,
        lastLocation: {
          lat: b.last_lat,
          lng: b.last_lng,
          speed: b.last_speed,
          at: b.last_location_at,
        },
        route: b.route,
        driver: b.driver,
      }))
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/trips', auth('admin'), async (req, res) => {
  try {
    const trips = await db.getRecentTrips();
    res.json(trips);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin User Hierarchy Management:
// Super admin creates & configures accounts for Admins, Drivers, and Students
app.get('/api/admin/users', auth('admin'), async (req, res) => {
  try {
    const users = await db.getAllUsers();
    const safeUsers = users.map(({ password_hash, ...u }) => u);
    res.json(safeUsers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/users', auth('admin'), async (req, res) => {
  try {
    const { name, email, password, role, bus_id, stop_id, phone } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Name, email, password, and role are required' });
    }
    if (!['admin', 'driver', 'student'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be admin, driver, or student' });
    }

    const existing = await db.findUserByEmail(email);
    if (existing) return res.status(409).json({ error: 'A user with this email already exists' });

    const password_hash = await bcrypt.hash(String(password), 10);
    const newUser = await db.createUser({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password_hash,
      role,
      bus_id: bus_id || null,
      stop_id: stop_id || null,
      phone: phone || '',
      active: true,
    });

    // If driver, assign bus
    if (role === 'driver' && bus_id) {
      await db.updateBus(bus_id, { driver_id: newUser.id });
    }

    const { password_hash: _, ...safeUser } = newUser;
    res.status(201).json(safeUser);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/users/:id', auth('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, bus_id, stop_id, phone, active, password } = req.body;

    const updatePayload = {};
    if (name !== undefined) updatePayload.name = name.trim();
    if (email !== undefined) updatePayload.email = email.trim().toLowerCase();
    if (role !== undefined) updatePayload.role = role;
    if (bus_id !== undefined) updatePayload.bus_id = bus_id || null;
    if (stop_id !== undefined) updatePayload.stop_id = stop_id || null;
    if (phone !== undefined) updatePayload.phone = phone;
    if (active !== undefined) updatePayload.active = Boolean(active);
    if (password) updatePayload.password_hash = await bcrypt.hash(String(password), 10);

    const updated = await db.updateUser(id, updatePayload);
    if (!updated) return res.status(404).json({ error: 'User not found' });

    const { password_hash: _, ...safeUser } = updated;
    res.json(safeUser);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/users/:id', auth('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    if (req.user.id === id) {
      return res.status(400).json({ error: 'Cannot delete your own admin account' });
    }
    await db.deleteUser(id);
    res.json({ ok: true, message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin Buses & Routes
app.get('/api/admin/buses', auth('admin'), async (req, res) => {
  try {
    const buses = await db.getBuses();
    res.json(buses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/routes', auth('admin'), async (req, res) => {
  try {
    const routes = await db.getRoutes();
    res.json(routes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// Socket.IO Handlers
// -------------------------------------------------------------
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(); // allow anonymous public sockets if needed
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await db.findUserById(payload.id);
    if (user && user.active) {
      socket.user = user;
    }
    next();
  } catch (err) {
    next();
  }
});

io.on('connection', (socket) => {
  const user = socket.user;
  if (user) {
    socket.join(`user:${user.id}`);
    if (user.role === 'admin') socket.join('admins');
    if (user.role === 'student' && user.bus_id) socket.join(`bus:${user.bus_id}`);
    if (user.role === 'driver' && user.bus_id) socket.join(`bus:${user.bus_id}`);
  }

  // Allow anonymous joining for homepage live tracker
  socket.on('join-bus', (busId) => {
    socket.join(`bus:${busId}`);
  });
});

// -------------------------------------------------------------
// Offline Detector Interval: detects GPS loss > 60s
// -------------------------------------------------------------
setInterval(async () => {
  try {
    const buses = await db.getBuses();
    const now = Date.now();
    for (const b of buses) {
      if (b.status === 'running') {
        const lastAt = b.last_location_at ? new Date(b.last_location_at).getTime() : 0;
        if (now - lastAt > 60000) {
          await db.updateBus(b.id, { status: 'offline' });
          await broadcastNotify(
            b.id,
            'offline',
            `⚠️ Bus ${b.number} stopped sending GPS updates (device offline or screen locked).`,
            `off:${b.id}:${Math.floor(now / 60000)}`
          );
          io.to(`bus:${b.id}`).to('admins').emit('bus-status', { bus: b.id, status: 'offline' });
        }
      }
    }
  } catch (e) {
    console.error('Offline detector error:', e.message);
  }
}, 30000);

server.listen(PORT, () => {
  console.log(`🚀 BusOra Server running on port ${PORT}`);
  console.log(`📡 Database mode: ${isSupabaseConfigured ? 'Supabase PostgreSQL' : 'Fast In-Memory'}`);
});
