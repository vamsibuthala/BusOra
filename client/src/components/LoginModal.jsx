import React, { useState } from 'react';
import { ShieldCheck, Bus, GraduationCap, X, Lock, Mail, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';
import { apiRequest, setToken, setStoredUser } from '../services/api';

export default function LoginModal({ isOpen, onClose, defaultRole = 'student', onSuccess }) {
  const [role, setRole] = useState(defaultRole);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleRoleChange = (newRole) => {
    setRole(newRole);
    setError('');
    // Auto-prefill demo credentials based on role
    if (newRole === 'admin') {
      setEmail('admin@busora.com');
      setPassword('Admin@123');
    } else if (newRole === 'driver') {
      setEmail('driver@busora.com');
      setPassword('Driver@123');
    } else {
      setEmail('student@busora.com');
      setPassword('Student@123');
    }
  };

  const handleQuickFill = (r) => {
    handleRoleChange(r);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide email and password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = await apiRequest('/auth/login', 'POST', { email, password });
      
      if (data.user.role !== role) {
        throw new Error(`This account role is '${data.user.role}', but you selected '${role}' login.`);
      }

      setToken(data.token);
      setStoredUser(data.user);
      onSuccess(data.user);
      onClose();
    } catch (err) {
      setError(err.message || 'Login failed. Check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/60 p-4 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-100">
        {/* Header with BusOra Logo */}
        <div className="bg-gradient-to-r from-navy-900 via-navy-800 to-sky-700 px-6 py-6 text-white text-center relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 rounded-full bg-white/10 p-1.5 text-white/80 hover:bg-white/20 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>

          <img 
            src="/busora-logo.png" 
            alt="BusOra Logo" 
            className="mx-auto h-14 w-14 object-contain rounded-2xl bg-white p-1.5 shadow-md mb-2"
          />
          <h2 className="font-display text-2xl font-black tracking-tight">BusOra Sign In</h2>
          <p className="text-xs text-sky-200 mt-1">Smart Campus Transit Access</p>
        </div>

        {/* Role Selector Tabs */}
        <div className="p-6">
          <div className="grid grid-cols-3 gap-2 rounded-2xl bg-slate-100 p-1 mb-5">
            <button
              type="button"
              onClick={() => handleRoleChange('student')}
              className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 rounded-xl py-2 px-1 text-xs font-bold transition-all ${
                role === 'student'
                  ? 'bg-white text-sky-600 shadow-sm'
                  : 'text-slate-600 hover:text-navy-900'
              }`}
            >
              <GraduationCap className="h-4 w-4" />
              <span>Student</span>
            </button>

            <button
              type="button"
              onClick={() => handleRoleChange('driver')}
              className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 rounded-xl py-2 px-1 text-xs font-bold transition-all ${
                role === 'driver'
                  ? 'bg-white text-emerald-600 shadow-sm'
                  : 'text-slate-600 hover:text-navy-900'
              }`}
            >
              <Bus className="h-4 w-4" />
              <span>Driver</span>
            </button>

            <button
              type="button"
              onClick={() => handleRoleChange('admin')}
              className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 rounded-xl py-2 px-1 text-xs font-bold transition-all ${
                role === 'admin'
                  ? 'bg-white text-purple-700 shadow-sm'
                  : 'text-slate-600 hover:text-navy-900'
              }`}
            >
              <ShieldCheck className="h-4 w-4" />
              <span>Admin</span>
            </button>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs font-medium text-red-700 border border-red-200">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={`e.g. ${role}@busora.com`}
                  className="w-full rounded-xl border border-slate-200 pl-10 pr-3.5 py-2.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full rounded-xl border border-slate-200 pl-10 pr-3.5 py-2.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 text-sm shadow-md mt-2"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Verifying Credentials...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Log in as {role.charAt(0).toUpperCase() + role.slice(1)} <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials Auto-Fill Section */}
          <div className="mt-6 rounded-2xl bg-sky-50/70 p-3.5 border border-sky-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-sky-900 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-sky-600" />
                1-Click Demo Fill:
              </span>
              <span className="text-[10px] text-sky-700">Click to test instantly</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => handleQuickFill('admin')}
                className="rounded-lg bg-white p-1.5 text-left font-medium text-slate-700 hover:border-purple-300 border border-slate-200 transition-colors shadow-2xs"
              >
                <span className="block font-bold text-purple-700 text-[11px]">👑 Admin</span>
                <span className="block text-[10px] text-slate-400 truncate">admin@busora.com</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('driver')}
                className="rounded-lg bg-white p-1.5 text-left font-medium text-slate-700 hover:border-emerald-300 border border-slate-200 transition-colors shadow-2xs"
              >
                <span className="block font-bold text-emerald-700 text-[11px]">🚍 Driver</span>
                <span className="block text-[10px] text-slate-400 truncate">driver@busora.com</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('student')}
                className="rounded-lg bg-white p-1.5 text-left font-medium text-slate-700 hover:border-sky-300 border border-slate-200 transition-colors shadow-2xs"
              >
                <span className="block font-bold text-sky-700 text-[11px]">🎓 Student</span>
                <span className="block text-[10px] text-slate-400 truncate">student@busora.com</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
