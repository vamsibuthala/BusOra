import mongoose from 'mongoose';
const { Schema, model } = mongoose; const Id = Schema.Types.ObjectId;
const pt = { lat: { type: Number, min: -90, max: 90, required: true }, lng: { type: Number, min: -180, max: 180, required: true } };
export const User = model('User', new Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ['student', 'driver', 'admin'], required: true },
  bus: { type: Id, ref: 'Bus' }, stopId: Id, active: { type: Boolean, default: true }
}, { timestamps: true }));
export const Route = model('Route', new Schema({ name: { type: String, required: true }, stops: [{ name: String, ...pt, order: Number }] }));
export const Bus = model('Bus', new Schema({
  number: { type: String, required: true, unique: true }, route: { type: Id, ref: 'Route' }, driver: { type: Id, ref: 'User' },
  active: { type: Boolean, default: true },
  status: { type: String, enum: ['idle', 'running', 'delayed', 'offline', 'emergency'], default: 'idle' },
  lastLocation: { lat: Number, lng: Number, speed: Number, at: Date }
}, { timestamps: true }));
export const Trip = model('Trip', new Schema({
  bus: { type: Id, ref: 'Bus', index: true }, driver: { type: Id, ref: 'User', index: true },
  status: { type: String, enum: ['active', 'completed'], default: 'active', index: true },
  startedAt: { type: Date, default: Date.now }, endedAt: Date,
  incidents: [{ type: { type: String, enum: ['delay', 'breakdown', 'emergency'] }, note: String, at: { type: Date, default: Date.now } }]
}));
const loc = new Schema({ trip: { type: Id, ref: 'Trip' }, bus: { type: Id, ref: 'Bus' }, ...pt, speed: Number, at: { type: Date, default: Date.now } });
loc.index({ bus: 1, at: -1 }); loc.index({ at: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });
export const BusLocation = model('BusLocation', loc);
const n = new Schema({ user: { type: Id, ref: 'User', index: true }, bus: Id, type: String, message: String, key: String, read: { type: Boolean, default: false } }, { timestamps: true });
n.index({ user: 1, key: 1 }, { unique: true });
export const Notification = model('Notification', n);
