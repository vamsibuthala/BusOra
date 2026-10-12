import 'dotenv/config'; import mongoose from 'mongoose'; import bcrypt from 'bcryptjs';
import { User, Bus, Route, Trip, BusLocation, Notification } from './models.js';
await mongoose.connect(process.env.MONGODB_URI);
await Promise.all([User, Bus, Route, Trip, BusLocation, Notification].map(m => m.deleteMany()));
const pw = await bcrypt.hash('Demo@1234', 12);
// Placeholder stop coordinates only: edit to your real route. Live bus position always comes from the driver's GPS.
const route = await Route.create({ name: 'Route A', stops: [{ name: 'Main Gate', lat: 13.6288, lng: 79.4192, order: 1 }, { name: 'Market Stop', lat: 13.6350, lng: 79.4250, order: 2 }, { name: 'Station Stop', lat: 13.6420, lng: 79.4300, order: 3 }] });
const driver = await User.create({ name: 'Demo Driver', email: 'driver@busora.test', password: pw, role: 'driver' });
const bus = await Bus.create({ number: 'BUS-01', route: route._id, driver: driver._id });
await User.create({ name: 'Demo Admin', email: 'admin@busora.test', password: pw, role: 'admin' });
await User.create([{ name: 'Demo Student 1', email: 'student1@busora.test', password: pw, role: 'student', bus: bus._id, stopId: route.stops[1]._id },
  { name: 'Demo Student 2', email: 'student2@busora.test', password: pw, role: 'student', bus: bus._id, stopId: route.stops[2]._id }]);
console.log('Seeded. Demo accounts use password Demo@1234'); process.exit(0);
