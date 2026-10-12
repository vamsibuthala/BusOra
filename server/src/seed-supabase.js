import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { supabase, isSupabaseConfigured } from './supabase.js';

export async function runSupabaseSeed() {
  if (!isSupabaseConfigured) {
    console.log('⚠️ Supabase credentials not found. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to seed Supabase.');
    return;
  }

  console.log('🌱 Starting Supabase database seeding...');

  try {
    // 1. Clear existing test data
    await supabase.from('notifications').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('bus_locations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('trips').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('users').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('buses').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('routes').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // 2. Create Routes
    const stopsA = [
      { id: 'stop-1', name: 'Main Campus Gate', lat: 13.6288, lng: 79.4192, order: 1 },
      { id: 'stop-2', name: 'Market Complex', lat: 13.6350, lng: 79.4250, order: 2 },
      { id: 'stop-3', name: 'Central Railway Station', lat: 13.6420, lng: 79.4300, order: 3 },
      { id: 'stop-4', name: 'North City Terminal', lat: 13.6510, lng: 79.4380, order: 4 }
    ];

    const stopsB = [
      { id: 'stop-5', name: 'South Campus Gate', lat: 13.6200, lng: 79.4120, order: 1 },
      { id: 'stop-6', name: 'Tech Park Circle', lat: 13.6150, lng: 79.4050, order: 2 },
      { id: 'stop-7', name: 'City Mall Junction', lat: 13.6080, lng: 79.3980, order: 3 }
    ];

    const { data: routeA, error: errRA } = await supabase.from('routes').insert({
      name: 'Route A (North Campus Express)',
      description: 'Main Campus to North City via Station',
      stops: stopsA,
      active: true
    }).select().single();
    if (errRA) throw errRA;

    const { data: routeB, error: errRB } = await supabase.from('routes').insert({
      name: 'Route B (South Tech Shuttle)',
      description: 'South Campus to Tech Park and City Mall',
      stops: stopsB,
      active: true
    }).select().single();
    if (errRB) throw errRB;

    // 3. Create Admin
    const adminPass = await bcrypt.hash('Admin@123', 10);
    const { data: adminUser, error: errAdmin } = await supabase.from('users').insert({
      name: 'College Transport Administrator',
      email: 'admin@busora.com',
      password_hash: adminPass,
      role: 'admin',
      phone: '+91 98765 00001',
      active: true
    }).select().single();
    if (errAdmin) throw errAdmin;

    // 4. Create Drivers
    const driverPass = await bcrypt.hash('Driver@123', 10);
    const { data: driver1, error: errD1 } = await supabase.from('users').insert({
      name: 'Rajesh Kumar (Driver 1)',
      email: 'driver@busora.com',
      password_hash: driverPass,
      role: 'driver',
      phone: '+91 98765 00002',
      active: true
    }).select().single();
    if (errD1) throw errD1;

    const { data: driver2, error: errD2 } = await supabase.from('users').insert({
      name: 'Sunil Verma (Driver 2)',
      email: 'driver2@busora.com',
      password_hash: driverPass,
      role: 'driver',
      phone: '+91 98765 00003',
      active: true
    }).select().single();
    if (errD2) throw errD2;

    // 5. Create Buses
    const { data: bus1, error: errB1 } = await supabase.from('buses').insert({
      number: 'BUS-01',
      route_id: routeA.id,
      driver_id: driver1.id,
      capacity: 45,
      status: 'idle',
      last_lat: 13.6288,
      last_lng: 79.4192,
      last_speed: 0,
      last_location_at: new Date().toISOString(),
      active: true
    }).select().single();
    if (errB1) throw errB1;

    const { data: bus2, error: errB2 } = await supabase.from('buses').insert({
      number: 'BUS-02',
      route_id: routeB.id,
      driver_id: driver2.id,
      capacity: 45,
      status: 'idle',
      last_lat: 13.6200,
      last_lng: 79.4120,
      last_speed: 0,
      last_location_at: new Date().toISOString(),
      active: true
    }).select().single();
    if (errB2) throw errB2;

    // Update driver assigned buses
    await supabase.from('users').update({ bus_id: bus1.id }).eq('id', driver1.id);
    await supabase.from('users').update({ bus_id: bus2.id }).eq('id', driver2.id);

    // 6. Create Students
    const studentPass = await bcrypt.hash('Student@123', 10);
    const { error: errS } = await supabase.from('users').insert([
      {
        name: 'Aarav Sharma',
        email: 'student@busora.com',
        password_hash: studentPass,
        role: 'student',
        bus_id: bus1.id,
        stop_id: 'stop-2', // Market Complex
        phone: '+91 98765 11111',
        active: true
      },
      {
        name: 'Priya Patel',
        email: 'student2@busora.com',
        password_hash: studentPass,
        role: 'student',
        bus_id: bus1.id,
        stop_id: 'stop-3', // Central Railway Station
        phone: '+91 98765 22222',
        active: true
      },
      {
        name: 'Rohan Gupta',
        email: 'student3@busora.com',
        password_hash: studentPass,
        role: 'student',
        bus_id: bus2.id,
        stop_id: 'stop-6', // Tech Park
        phone: '+91 98765 33333',
        active: true
      }
    ]);
    if (errS) throw errS;

    console.log('✅ Supabase database seeded successfully!');
    console.log('----------------------------------------------------');
    console.log('Role Hierarchy & Demo Credentials:');
    console.log('1. Admin:   admin@busora.com    / Admin@123');
    console.log('2. Driver:  driver@busora.com   / Driver@123');
    console.log('3. Student: student@busora.com  / Student@123');
    console.log('----------------------------------------------------');
  } catch (error) {
    console.error('❌ Supabase seeding error:', error.message);
  }
}

if (process.argv[1]?.endsWith('seed-supabase.js')) {
  runSupabaseSeed().then(() => process.exit(0));
}
