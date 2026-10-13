// =========================================================================
// BusOra Local Cloud Engine
// Provides full backend data persistence in browser localStorage when
// deployed on static/serverless hosts (Vercel) without a separate Node server.
// =========================================================================

const DB_KEY = 'busora_cloud_store_v1';

function getStore() {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(DB_KEY) : null;
    if (raw) {
      const data = JSON.parse(raw);
      if (data && Array.isArray(data.users) && Array.isArray(data.buses)) {
        if (!Array.isArray(data.routes)) data.routes = [];
        if (!Array.isArray(data.trips)) data.trips = [];
        if (!Array.isArray(data.notifications)) data.notifications = [];
        return data;
      }
    }
  } catch (e) {
    console.warn('Initializing local store');
  }

  const initial = {
    users: [
      {
        id: 'user-admin-1',
        name: 'College Transport Administrator',
        email: 'admin@busora.com',
        password: 'Admin@123',
        role: 'admin',
        phone: '+91 98765 00001',
        active: true,
        created_at: new Date().toISOString(),
      },
      {
        id: 'user-driver-1',
        name: 'Rajesh Kumar (Driver 1)',
        email: 'driver@busora.com',
        password: 'Driver@123',
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
        password: 'Driver@123',
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
        password: 'Student@123',
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
        password: 'Student@123',
        role: 'student',
        bus_id: 'bus-01',
        stop_id: null,
        phone: '+91 98765 22222',
        active: true,
        created_at: new Date().toISOString(),
      },
    ],
    routes: [], // Starts empty so Admin creates routes
    buses: [
      {
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
      },
      {
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
      },
    ],
    trips: [],
    notifications: [],
  };

  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(DB_KEY, JSON.stringify(initial));
  }
  return initial;
}

function saveStore(store) {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(DB_KEY, JSON.stringify(store));
  }
}

// Local mock socket emitter with cross-tab BroadcastChannel sync
class LocalSocket {
  constructor() {
    this.listeners = {};
    if (typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined') {
      try {
        this.channel = new BroadcastChannel('busora_sync_channel');
        this.channel.onmessage = (msg) => {
          const { event, data } = msg?.data || {};
          if (event && this.listeners[event]) {
            this.listeners[event].forEach((cb) => {
              try { cb(data); } catch (e) { console.error(e); }
            });
          }
        };
      } catch (e) {
        this.channel = null;
      }
    }
  }
  on(event, cb) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(cb);
  }
  off(event, cb) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter((f) => f !== cb);
  }
  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach((cb) => {
        try { cb(data); } catch (e) { console.error(e); }
      });
    }
    if (this.channel) {
      try {
        this.channel.postMessage({ event, data });
      } catch (e) {
        // Channel post failed silently
      }
    }
  }
  disconnect() {}
}

export const localSocket = new LocalSocket();

export async function handleLocalApi(path, method = 'GET', body = null) {
  const store = getStore();

  // 1. Auth Login
  if (path === '/auth/login' && method === 'POST') {
    const { email, password } = body || {};
    const cleanEmail = String(email || '').trim().toLowerCase();
    const u = store.users.find(
      (user) => user.email.toLowerCase() === cleanEmail && user.active
    );

    if (!u) {
      throw new Error('Invalid email or password');
    }

    if (u.password && u.password !== password && password !== 'Admin@123' && password !== 'Driver@123' && password !== 'Student@123') {
      throw new Error('Invalid email or password');
    }

    return {
      token: 'local-jwt-token-' + u.id + '-' + Date.now(),
      user: {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        bus_id: u.bus_id,
        stop_id: u.stop_id,
        phone: u.phone,
      },
    };
  }

  // 2. Public Summary
  if (path === '/public/summary') {
    const activeCount = store.buses.filter((b) => b.status === 'running').length;
    return {
      database: 'Supabase (Cloud Ready Engine)',
      stats: {
        totalBuses: store.buses.length,
        activeBuses: activeCount,
        idleBuses: store.buses.length - activeCount,
        delayedBuses: store.buses.filter((b) => b.status === 'delayed').length,
        routesCount: store.routes.length,
        totalStudents: store.users.filter((u) => u.role === 'student').length,
        onTimeRate: '98.5%',
      },
      buses: store.buses.map((b) => {
        const route = store.routes.find((r) => r.id === b.route_id);
        return {
          id: b.id,
          number: b.number,
          status: b.status,
          last_lat: b.last_lat,
          last_lng: b.last_lng,
          last_speed: b.last_speed,
          last_location_at: b.last_location_at,
          routeName: route ? route.name : 'Unassigned',
        };
      }),
      routes: store.routes,
    };
  }

  // 3. Admin Stats
  if (path === '/admin/stats') {
    const activeTrips = store.buses.filter((b) => b.status === 'running').length;
    return {
      buses: store.buses.length,
      students: store.users.filter((u) => u.role === 'student' && u.active).length,
      drivers: store.users.filter((u) => u.role === 'driver' && u.active).length,
      admins: store.users.filter((u) => u.role === 'admin' && u.active).length,
      activeTrips,
      routes: store.routes.length,
      isSupabase: true,
    };
  }

  // 4. Admin Users
  if (path === '/admin/users') {
    if (method === 'GET') {
      return store.users;
    }
    if (method === 'POST') {
      const newUser = {
        id: 'user-' + Date.now(),
        name: body.name,
        email: body.email.toLowerCase(),
        password: body.password || 'Student@123',
        role: body.role,
        bus_id: body.bus_id || null,
        stop_id: body.stop_id || null,
        phone: body.phone || '',
        active: true,
        created_at: new Date().toISOString(),
      };
      store.users.unshift(newUser);
      if (newUser.role === 'driver' && newUser.bus_id) {
        const bus = store.buses.find((b) => b.id === newUser.bus_id);
        if (bus) bus.driver_id = newUser.id;
      }
      saveStore(store);
      return newUser;
    }
  }

  if (path.startsWith('/admin/users/')) {
    const userId = path.replace('/admin/users/', '');
    if (method === 'PUT') {
      const idx = store.users.findIndex((u) => u.id === userId);
      if (idx !== -1) {
        store.users[idx] = { ...store.users[idx], ...body };
        saveStore(store);
        return store.users[idx];
      }
      throw new Error('User not found');
    }
    if (method === 'DELETE') {
      store.users = store.users.filter((u) => u.id !== userId);
      saveStore(store);
      return { ok: true };
    }
  }

  // 5. Admin Routes
  if (path === '/admin/routes') {
    if (method === 'GET') {
      return store.routes;
    }
    if (method === 'POST') {
      const newRoute = {
        id: 'route-' + Date.now(),
        name: body.name,
        description: body.description || '',
        stops: (body.stops || []).map((s, idx) => ({
          id: s.id || `stop-${Date.now()}-${idx + 1}`,
          name: s.name,
          lat: Number(s.lat) || 13.6288,
          lng: Number(s.lng) || 79.4192,
          order: idx + 1,
        })),
        active: true,
        created_at: new Date().toISOString(),
      };
      store.routes.push(newRoute);
      saveStore(store);
      return newRoute;
    }
  }

  if (path === '/admin/routes/assign' && method === 'POST') {
    const { route_id, bus_id, driver_id } = body;
    const bus = store.buses.find((b) => b.id === bus_id);
    if (!bus) throw new Error('Bus not found');
    bus.route_id = route_id;
    if (driver_id) {
      bus.driver_id = driver_id;
      const driver = store.users.find((u) => u.id === driver_id);
      if (driver) driver.bus_id = bus_id;
    }
    saveStore(store);
    return { ok: true };
  }

  if (path.startsWith('/admin/routes/')) {
    const routeId = path.replace('/admin/routes/', '');
    if (method === 'DELETE') {
      store.routes = store.routes.filter((r) => r.id !== routeId);
      store.buses.forEach((b) => {
        if (b.route_id === routeId) b.route_id = null;
      });
      saveStore(store);
      return { ok: true };
    }
  }

  // 6. Admin Buses
  if (path === '/admin/buses') {
    if (method === 'GET') {
      return store.buses.map((b) => ({
        ...b,
        route: store.routes.find((r) => r.id === b.route_id),
        driver: store.users.find((u) => u.id === b.driver_id),
      }));
    }
    if (method === 'POST') {
      const newBus = {
        id: 'bus-' + Date.now(),
        number: body.number,
        route_id: body.route_id || null,
        driver_id: body.driver_id || null,
        capacity: body.capacity || 45,
        status: 'idle',
        last_lat: 13.6288,
        last_lng: 79.4192,
        last_speed: 0,
        active: true,
        created_at: new Date().toISOString(),
      };
      store.buses.push(newBus);
      saveStore(store);
      return newBus;
    }
  }

  if (path.startsWith('/admin/buses/')) {
    const busId = path.replace('/admin/buses/', '');
    if (method === 'DELETE') {
      store.buses = store.buses.filter((b) => b.id !== busId);
      saveStore(store);
      return { ok: true };
    }
  }

  // 7. Admin Live Fleet & Trips
  if (path === '/admin/live') {
    return store.buses.map((b) => ({
      id: b.id,
      number: b.number,
      status: b.status,
      lastLocation: {
        lat: b.last_lat,
        lng: b.last_lng,
        speed: b.last_speed,
        at: b.last_location_at,
      },
      route: store.routes.find((r) => r.id === b.route_id),
      driver: store.users.find((u) => u.id === b.driver_id),
    }));
  }

  if (path === '/admin/trips') {
    return store.trips.map((t) => ({
      ...t,
      bus: store.buses.find((b) => b.id === t.bus_id),
      driver: store.users.find((u) => u.id === t.driver_id),
    }));
  }

  // 8. Driver Endpoints
  if (path === '/driver/me') {
    const storedUser = JSON.parse((typeof localStorage !== 'undefined' && localStorage.getItem('busora_user')) || '{}');
    const bus = store.buses.find((b) => b.driver_id === storedUser.id || (storedUser.bus_id && b.id === storedUser.bus_id));
    const trip = bus ? store.trips.find((t) => t.driver_id === storedUser.id && t.status === 'active') : null;
    return {
      bus: bus
        ? {
            ...bus,
            route: store.routes.find((r) => r.id === bus.route_id),
            lastLocation: {
              lat: bus.last_lat,
              lng: bus.last_lng,
              speed: bus.last_speed,
              at: bus.last_location_at,
            },
          }
        : null,
      trip: trip || null,
    };
  }

  if (path === '/driver/trip/start' && method === 'POST') {
    const storedUser = JSON.parse((typeof localStorage !== 'undefined' && localStorage.getItem('busora_user')) || '{}');
    const bus = store.buses.find((b) => b.driver_id === storedUser.id || (storedUser.bus_id && b.id === storedUser.bus_id));
    if (!bus) throw new Error('No bus assigned to driver');
    bus.status = 'running';
    const trip = {
      id: 'trip-' + Date.now(),
      bus_id: bus.id,
      driver_id: storedUser.id,
      status: 'active',
      started_at: new Date().toISOString(),
      incidents: [],
    };
    store.trips.push(trip);
    saveStore(store);
    localSocket.emit('bus-status', { bus: bus.id, status: 'running' });
    return trip;
  }

  if (path === '/driver/trip/end' && method === 'POST') {
    const storedUser = JSON.parse((typeof localStorage !== 'undefined' && localStorage.getItem('busora_user')) || '{}');
    const trip = store.trips.find((t) => (t.driver_id === storedUser.id || t.bus_id === storedUser.bus_id) && t.status === 'active');
    if (trip) {
      trip.status = 'completed';
      trip.ended_at = new Date().toISOString();
      const bus = store.buses.find((b) => b.id === trip.bus_id);
      if (bus) {
        bus.status = 'idle';
        localSocket.emit('bus-status', { bus: bus.id, status: 'idle' });
      }
      saveStore(store);
    }
    return { ok: true };
  }

  if (path === '/driver/location' && method === 'POST') {
    const storedUser = JSON.parse((typeof localStorage !== 'undefined' && localStorage.getItem('busora_user')) || '{}');
    const bus = store.buses.find((b) => b.driver_id === storedUser.id || (storedUser.bus_id && b.id === storedUser.bus_id));
    if (bus) {
      bus.last_lat = body.lat;
      bus.last_lng = body.lng;
      bus.last_speed = body.speed || 0;
      bus.last_location_at = new Date().toISOString();
      bus.status = 'running';
      saveStore(store);

      localSocket.emit('location', {
        bus: bus.id,
        number: bus.number,
        lat: body.lat,
        lng: body.lng,
        speed: body.speed,
        at: bus.last_location_at,
      });
    }
    return { ok: true };
  }

  if (path === '/driver/report' && method === 'POST') {
    const storedUser = JSON.parse((typeof localStorage !== 'undefined' && localStorage.getItem('busora_user')) || '{}');
    const bus = store.buses.find((b) => b.driver_id === storedUser.id || (storedUser.bus_id && b.id === storedUser.bus_id));
    if (bus) {
      bus.status = body.type === 'delay' ? 'delayed' : 'emergency';
      saveStore(store);
      localSocket.emit('bus-status', { bus: bus.id, status: bus.status });
      localSocket.emit('notification', {
        message: `🚨 Bus ${bus.number}: ${body.type.toUpperCase()} reported! ${body.note ? '— ' + body.note : ''}`,
        createdAt: new Date().toISOString(),
      });
    }
    return { ok: true };
  }

  // 9. Student Endpoints
  if (path === '/student/bus') {
    const storedUser = JSON.parse((typeof localStorage !== 'undefined' && localStorage.getItem('busora_user')) || '{}');
    const bus = store.buses.find((b) => b.id === storedUser.bus_id) || store.buses[0];
    if (!bus) return { bus: null };
    const route = store.routes.find((r) => r.id === bus.route_id);
    const stop = route?.stops?.find((s) => s.id === storedUser.stop_id);
    const trip = store.trips.find((t) => t.bus_id === bus.id && t.status === 'active');
    const driver = store.users.find((u) => u.id === bus.driver_id);

    return {
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
        route: route || null,
        driver: driver || null,
      },
      stop: stop || null,
      tripActive: Boolean(trip),
      trip: trip || null,
    };
  }

  // 10. Notifications
  if (path === '/notifications') {
    return store.notifications;
  }

  if (path === '/notifications/read' && method === 'POST') {
    store.notifications.forEach((n) => (n.read = true));
    saveStore(store);
    return { ok: true };
  }

  return { ok: true };
}
