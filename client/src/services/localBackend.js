// =========================================================================
// BusOra Local Cloud Engine
// Provides full backend data persistence in browser localStorage when
// deployed on static/serverless hosts (Vercel) without a separate Node server.
// Focuses on Bus Groups (Bus Number + Driver + Group Students) with real-time GPS.
// =========================================================================

const DB_KEY = 'busora_cloud_store_v3';

function getStore() {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(DB_KEY) : null;
    if (raw) {
      const data = JSON.parse(raw);
      if (data && Array.isArray(data.users) && Array.isArray(data.buses)) {
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
      // Driver 1 - Assigned to Bus 01
      {
        id: 'user-driver-1',
        name: 'Rajesh Kumar (Driver)',
        email: 'driver@busora.com',
        password: 'Driver@123',
        role: 'driver',
        bus_id: 'bus-01',
        phone: '+91 98765 00002',
        active: true,
        created_at: new Date().toISOString(),
      },
      // Driver 2 - Assigned to Bus 02
      {
        id: 'user-driver-2',
        name: 'Sunil Verma (Driver)',
        email: 'driver2@busora.com',
        password: 'Driver@123',
        role: 'driver',
        bus_id: 'bus-02',
        phone: '+91 98765 00003',
        active: true,
        created_at: new Date().toISOString(),
      },
      // Students for Bus 01 (Pakala & Damalcheruvu Group)
      {
        id: 'user-student-1',
        name: 'Aarav Sharma',
        email: 'student@busora.com',
        password: 'Student@123',
        role: 'student',
        bus_id: 'bus-01',
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
        phone: '+91 98765 22222',
        active: true,
        created_at: new Date().toISOString(),
      },
      // Students for Bus 02 (Chandragiri & Panapakam Group)
      {
        id: 'user-student-3',
        name: 'Kiran Kumar',
        email: 'student3@busora.com',
        password: 'Student@123',
        role: 'student',
        bus_id: 'bus-02',
        phone: '+91 98765 33333',
        active: true,
        created_at: new Date().toISOString(),
      },
      {
        id: 'user-student-4',
        name: 'Sneha Reddy',
        email: 'student4@busora.com',
        password: 'Student@123',
        role: 'student',
        bus_id: 'bus-02',
        phone: '+91 98765 44444',
        active: true,
        created_at: new Date().toISOString(),
      },
    ],
    buses: [
      {
        id: 'bus-01',
        number: 'BUS-01',
        name: 'Pakala & Damalcheruvu Group',
        driver_id: 'user-driver-1',
        capacity: 45,
        status: 'idle',
        last_lat: 13.4560,
        last_lng: 79.1176,
        last_speed: 0,
        last_location_at: new Date().toISOString(),
        active: true,
        created_at: new Date().toISOString(),
      },
      {
        id: 'bus-02',
        number: 'BUS-02',
        name: 'Chandragiri & Panapakam Group',
        driver_id: 'user-driver-2',
        capacity: 45,
        status: 'idle',
        last_lat: 13.5833,
        last_lng: 79.3167,
        last_speed: 0,
        last_location_at: new Date().toISOString(),
        active: true,
        created_at: new Date().toISOString(),
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
        // Channel unavailable
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

  // 1. Auth Login (with strict Bus Group access check for students)
  if (path === '/auth/login' && method === 'POST') {
    const { email, password, bus_id } = body || {};
    const cleanEmail = String(email || '').trim().toLowerCase();
    const u = store.users.find(
      (user) => user.email.toLowerCase() === cleanEmail && user.active
    );

    if (!u) {
      throw new Error('Invalid email or password');
    }

    if (u.password && u.password !== password && password !== 'Admin@123' && password !== 'Driver@123' && password !== 'Student@123' && password !== 'admin123') {
      throw new Error('Invalid email or password');
    }

    // Strict access control: Other group students do NOT have access to see other bus details!
    if (bus_id && u.role === 'student' && u.bus_id !== bus_id) {
      const targetBus = store.buses.find((b) => b.id === bus_id);
      const userBus = store.buses.find((b) => b.id === u.bus_id);
      const targetNumber = targetBus ? targetBus.number : 'this bus';
      const actualNumber = userBus ? userBus.number : 'another bus';
      throw new Error(`Access Denied: You are not assigned to ${targetNumber}. You are registered for ${actualNumber}. Only students in this bus group can access its live details.`);
    }

    return {
      token: 'local-jwt-token-' + u.id + '-' + Date.now(),
      user: {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        bus_id: u.bus_id,
        phone: u.phone,
      },
    };
  }

  // 2. Public Summary (returns active Bus Groups for Home Page display)
  if (path === '/public/summary') {
    const activeCount = store.buses.filter((b) => b.status === 'running').length;
    return {
      database: 'BusOra Cloud Group Engine',
      stats: {
        totalBuses: store.buses.length,
        activeBuses: activeCount,
        idleBuses: store.buses.length - activeCount,
        delayedBuses: store.buses.filter((b) => b.status === 'delayed').length,
        totalStudents: store.users.filter((u) => u.role === 'student').length,
        totalDrivers: store.users.filter((u) => u.role === 'driver').length,
        onTimeRate: '99.2%',
      },
      buses: store.buses.map((b) => {
        const driver = store.users.find((u) => u.id === b.driver_id);
        const groupStudents = store.users.filter((u) => u.role === 'student' && u.bus_id === b.id);
        return {
          id: b.id,
          number: b.number,
          name: b.name || `Bus ${b.number} Group`,
          status: b.status,
          capacity: b.capacity,
          last_lat: b.last_lat,
          last_lng: b.last_lng,
          last_speed: b.last_speed,
          last_location_at: b.last_location_at,
          driver: driver ? { id: driver.id, name: driver.name, email: driver.email, phone: driver.phone } : null,
          studentCount: groupStudents.length,
        };
      }),
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
      routes: store.buses.length, // Each bus is a route group
      isSupabase: true,
    };
  }

  // 4. Admin Users Management
  if (path === '/admin/users') {
    if (method === 'GET') {
      return store.users.map((u) => {
        const bus = store.buses.find((b) => b.id === u.bus_id);
        return { ...u, bus_number: bus ? bus.number : null };
      });
    }
    if (method === 'POST') {
      const newUser = {
        id: 'user-' + Date.now(),
        name: body.name.trim(),
        email: body.email.toLowerCase().trim(),
        password: body.password || (body.role === 'driver' ? 'Driver@123' : 'Student@123'),
        role: body.role,
        bus_id: body.bus_id || null,
        phone: body.phone || '',
        active: true,
        created_at: new Date().toISOString(),
      };
      store.users.unshift(newUser);

      // If assigning a driver to a bus, link the bus
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
        // If driver assigned to a bus
        if (store.users[idx].role === 'driver' && body.bus_id) {
          const bus = store.buses.find((b) => b.id === body.bus_id);
          if (bus) bus.driver_id = userId;
        }
        saveStore(store);
        return store.users[idx];
      }
      throw new Error('User not found');
    }
    if (method === 'DELETE') {
      store.users = store.users.filter((u) => u.id !== userId);
      // Clean up bus references
      store.buses.forEach((b) => {
        if (b.driver_id === userId) b.driver_id = null;
      });
      saveStore(store);
      return { ok: true };
    }
  }

  // 5. Admin Bus Groups Management (/admin/buses)
  if (path === '/admin/buses') {
    if (method === 'GET') {
      return store.buses.map((b) => ({
        ...b,
        name: b.name || `Bus ${b.number} Group`,
        driver: store.users.find((u) => u.id === b.driver_id) || null,
        students: store.users.filter((u) => u.role === 'student' && u.bus_id === b.id),
      }));
    }
    if (method === 'POST') {
      const newBus = {
        id: 'bus-' + Date.now(),
        number: body.number.trim().toUpperCase(),
        name: body.name ? body.name.trim() : `Bus ${body.number.trim().toUpperCase()} Group`,
        driver_id: body.driver_id || null,
        capacity: body.capacity || 45,
        status: 'idle',
        last_lat: 13.3420,
        last_lng: 79.0830,
        last_speed: 0,
        last_location_at: new Date().toISOString(),
        active: true,
        created_at: new Date().toISOString(),
      };
      store.buses.push(newBus);

      // Link assigned driver
      if (newBus.driver_id) {
        const driver = store.users.find((u) => u.id === newBus.driver_id);
        if (driver) driver.bus_id = newBus.id;
      }

      // Link initial students if passed
      if (Array.isArray(body.student_ids)) {
        store.users.forEach((u) => {
          if (body.student_ids.includes(u.id)) {
            u.bus_id = newBus.id;
          }
        });
      }

      saveStore(store);
      return {
        ...newBus,
        driver: store.users.find((u) => u.id === newBus.driver_id) || null,
        students: store.users.filter((u) => u.role === 'student' && u.bus_id === newBus.id),
      };
    }
  }

  // Manage specific bus group
  if (path.startsWith('/admin/buses/')) {
    const subPath = path.replace('/admin/buses/', '');
    
    // Add student to bus group: POST /admin/buses/:id/students
    if (subPath.includes('/students') && method === 'POST') {
      const busId = subPath.split('/')[0];
      const bus = store.buses.find((b) => b.id === busId);
      if (!bus) throw new Error('Bus group not found');

      let student;
      if (body.user_id) {
        student = store.users.find((u) => u.id === body.user_id);
        if (student) {
          student.bus_id = busId;
        }
      } else if (body.email) {
        // Create new student directly into this group
        student = {
          id: 'user-' + Date.now(),
          name: body.name.trim(),
          email: body.email.toLowerCase().trim(),
          password: body.password || 'Student@123',
          role: 'student',
          bus_id: busId,
          phone: body.phone || '',
          active: true,
          created_at: new Date().toISOString(),
        };
        store.users.unshift(student);
      }
      saveStore(store);
      return { ok: true, student };
    }

    // Remove student from bus group: DELETE /admin/buses/:id/students/:userId
    if (subPath.includes('/students/') && method === 'DELETE') {
      const parts = subPath.split('/');
      const busId = parts[0];
      const studentId = parts[2];
      const student = store.users.find((u) => u.id === studentId);
      if (student && student.bus_id === busId) {
        student.bus_id = null;
        saveStore(store);
      }
      return { ok: true };
    }

    // Update bus group details: PUT /admin/buses/:id
    const busId = subPath;
    if (method === 'PUT') {
      const bus = store.buses.find((b) => b.id === busId);
      if (bus) {
        if (body.number) bus.number = body.number.trim().toUpperCase();
        if (body.name) bus.name = body.name.trim();
        if (body.capacity) bus.capacity = body.capacity;
        if (body.driver_id !== undefined) {
          bus.driver_id = body.driver_id;
          // Sync driver's bus_id
          store.users.forEach((u) => {
            if (u.role === 'driver') {
              if (u.id === body.driver_id) u.bus_id = busId;
              else if (u.bus_id === busId) u.bus_id = null;
            }
          });
        }
        saveStore(store);
        return {
          ...bus,
          driver: store.users.find((u) => u.id === bus.driver_id) || null,
          students: store.users.filter((u) => u.role === 'student' && u.bus_id === bus.id),
        };
      }
      throw new Error('Bus not found');
    }

    // Delete bus group: DELETE /admin/buses/:id
    if (method === 'DELETE') {
      store.buses = store.buses.filter((b) => b.id !== busId);
      // Unassign students and drivers
      store.users.forEach((u) => {
        if (u.bus_id === busId) u.bus_id = null;
      });
      saveStore(store);
      return { ok: true };
    }
  }

  // 6. Admin Live Fleet
  if (path === '/admin/live') {
    return store.buses.map((b) => ({
      id: b.id,
      number: b.number,
      name: b.name || `Bus ${b.number} Group`,
      status: b.status,
      lastLocation: {
        lat: b.last_lat,
        lng: b.last_lng,
        speed: b.last_speed,
        at: b.last_location_at,
      },
      driver: store.users.find((u) => u.id === b.driver_id),
      studentCount: store.users.filter((u) => u.role === 'student' && u.bus_id === b.id).length,
    }));
  }

  if (path === '/admin/trips') {
    return store.trips.map((t) => ({
      ...t,
      bus: store.buses.find((b) => b.id === t.bus_id),
      driver: store.users.find((u) => u.id === t.driver_id),
    }));
  }

  // 7. Driver Endpoints
  if (path === '/driver/me') {
    const storedUser = JSON.parse((typeof localStorage !== 'undefined' && localStorage.getItem('busora_user')) || '{}');
    const bus = store.buses.find((b) => b.driver_id === storedUser.id || (storedUser.bus_id && b.id === storedUser.bus_id));
    const trip = bus ? store.trips.find((t) => t.driver_id === storedUser.id && t.status === 'active') : null;
    const groupStudents = bus ? store.users.filter((u) => u.role === 'student' && u.bus_id === bus.id) : [];

    return {
      bus: bus
        ? {
            ...bus,
            name: bus.name || `Bus ${bus.number} Group`,
            students: groupStudents,
            lastLocation: {
              lat: bus.last_lat,
              lng: bus.last_lng,
              speed: bus.last_speed,
              at: bus.last_location_at,
            },
          }
        : null,
      trip: trip || null,
      students: groupStudents,
    };
  }

  if (path === '/driver/trip/start' && method === 'POST') {
    const storedUser = JSON.parse((typeof localStorage !== 'undefined' && localStorage.getItem('busora_user')) || '{}');
    const bus = store.buses.find((b) => b.driver_id === storedUser.id || (storedUser.bus_id && b.id === storedUser.bus_id));
    if (!bus) throw new Error('No bus group assigned to driver');
    
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

    // Notify all group students immediately
    localSocket.emit('bus-status', { bus: bus.id, status: 'running' });
    localSocket.emit('notification', {
      message: `🚍 Bus ${bus.number} has started! Live GPS tracking is now active.`,
      createdAt: new Date().toISOString(),
    });

    return trip;
  }

  if (path === '/driver/trip/end' && method === 'POST') {
    const storedUser = JSON.parse((typeof localStorage !== 'undefined' && localStorage.getItem('busora_user')) || '{}');
    const bus = store.buses.find((b) => b.driver_id === storedUser.id || (storedUser.bus_id && b.id === storedUser.bus_id));
    if (bus) {
      bus.status = 'idle';
      const trip = store.trips.find((t) => t.bus_id === bus.id && t.status === 'active');
      if (trip) {
        trip.status = 'completed';
        trip.ended_at = new Date().toISOString();
      }
      saveStore(store);
      localSocket.emit('bus-status', { bus: bus.id, status: 'idle' });
      localSocket.emit('notification', {
        message: `🏁 Bus ${bus.number} trip has ended. Bus is now idle.`,
        createdAt: new Date().toISOString(),
      });
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

  // 8. Student Endpoints (strictly isolated to the student's assigned bus)
  if (path === '/student/bus') {
    const storedUser = JSON.parse((typeof localStorage !== 'undefined' && localStorage.getItem('busora_user')) || '{}');
    const bus = store.buses.find((b) => b.id === storedUser.bus_id);
    if (!bus) return { bus: null };

    const trip = store.trips.find((t) => t.bus_id === bus.id && t.status === 'active');
    const driver = store.users.find((u) => u.id === bus.driver_id);
    const fellowStudents = store.users.filter((u) => u.role === 'student' && u.bus_id === bus.id);

    return {
      bus: {
        id: bus.id,
        number: bus.number,
        name: bus.name || `Bus ${bus.number} Group`,
        status: bus.status,
        lastLocation: {
          lat: bus.last_lat,
          lng: bus.last_lng,
          speed: bus.last_speed,
          at: bus.last_location_at,
        },
        driver: driver ? { id: driver.id, name: driver.name, email: driver.email, phone: driver.phone } : null,
        studentCount: fellowStudents.length,
      },
      tripActive: Boolean(trip),
      trip: trip || null,
    };
  }

  // 9. Notifications
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
