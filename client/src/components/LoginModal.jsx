import React, { useState, useEffect } from 'react';
import { ShieldCheck, Bus, GraduationCap, X, Lock, Mail, ArrowRight, AlertCircle, Info } from 'lucide-react';
import { apiRequest, setToken, setStoredUser } from '../services/api';

export default function LoginModal({ isOpen, onClose, defaultRole = 'student', targetBus = null, onSuccess }) {
  const [role, setRole] = useState(defaultRole);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (targetBus) {
      setRole('student');
    } else {
      setRole(defaultRole === 'student' ? 'driver' : defaultRole);
    }
    setEmail('');
    setPassword('');
    setError('');
  }, [isOpen, targetBus, defaultRole]);

  if (!isOpen) return null;

  const handleRoleChange = (newRole) => {
    setRole(newRole);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide both email and password.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = {
        email,
        password,
        ...(targetBus ? { bus_id: targetBus.id } : {}),
      };

      const data = await apiRequest('/auth/login', 'POST', payload);
      
      if (data.user.role !== role) {
        throw new Error(`This account role is '${data.user.role}', but you selected '${role}' login.`);
      }

      setToken(data.token);
      setStoredUser(data.user);
      onSuccess(data.user);
      onClose();
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/70 p-4 backdrop-blur-sm animate-fade-in">
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

          {targetBus ? (
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-400/20 text-sky-200 border border-sky-300/30 text-xs font-black uppercase tracking-wider mb-1">
                <Bus className="h-3.5 w-3.5" />
                <span>Bus Group: {targetBus.number}</span>
              </div>
              <h2 className="font-display text-xl sm:text-2xl font-black tracking-tight">
                Student Sign In
              </h2>
              <p className="text-xs text-sky-200 mt-1 truncate max-w-xs mx-auto">
                {targetBus.name || 'Authorized Group Members'}
              </p>
            </div>
          ) : (
            <div>
              <h2 className="font-display text-2xl font-black tracking-tight">BusOra Sign In</h2>
              <p className="text-xs text-sky-200 mt-1">Staff & Fleet Administration Portal</p>
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="p-6">
          {/* Target Bus Notification */}
          {targetBus ? (
            <div className="mb-4 rounded-2xl bg-sky-50 border border-sky-200 p-3 text-xs text-sky-900 flex items-start gap-2.5">
              <Info className="h-4 w-4 text-sky-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Bus Group Access Control</p>
                <p className="text-[11px] text-sky-700 mt-0.5 leading-relaxed">
                  Only students registered in <strong>{targetBus.number}</strong> can access this live tracking feed. Other bus students do not have permission.
                </p>
              </div>
            </div>
          ) : (
            /* Role Selector Tabs (Only shown when not bound to a specific bus) */
            <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1 mb-5">
              <button
                type="button"
                onClick={() => handleRoleChange('driver')}
                className={`flex items-center justify-center gap-1.5 rounded-xl py-2 px-1 text-xs font-bold transition-all ${
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
                className={`flex items-center justify-center gap-1.5 rounded-xl py-2 px-1 text-xs font-bold transition-all ${
                  role === 'admin'
                    ? 'bg-white text-purple-700 shadow-sm'
                    : 'text-slate-600 hover:text-navy-900'
                }`}
              >
                <ShieldCheck className="h-4 w-4" />
                <span>Admin</span>
              </button>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs font-medium text-red-700 border border-red-200 animate-shake">
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
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={
                    targetBus
                      ? 'e.g. student@busora.com'
                      : role === 'driver'
                      ? 'e.g. driver@busora.com'
                      : 'e.g. admin@busora.com'
                  }
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
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full rounded-xl border border-slate-200 pl-10 pr-3.5 py-2.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 text-sm font-bold shadow-md rounded-xl transition-all flex items-center justify-center gap-2 ${
                targetBus || role === 'student'
                  ? 'btn-sky'
                  : role === 'driver'
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-purple-700 hover:bg-purple-800 text-white'
              }`}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Verifying Group Access...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Sign In to {targetBus ? targetBus.number : role.charAt(0).toUpperCase() + role.slice(1)} <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
