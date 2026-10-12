import React from 'react';
import { Bus, MapPin, Phone, ShieldCheck, Database, Zap } from 'lucide-react';

export default function Footer({ onOpenLogin }) {
  return (
    <footer className="border-t border-slate-200 bg-navy-900 text-slate-300">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Brand info */}
          <div className="md:col-span-1 space-y-4">
            <div className="flex items-center gap-3">
              <img 
                src="/busora-logo.png" 
                alt="BusOra Logo" 
                className="h-10 w-10 object-contain rounded-xl bg-white p-1"
              />
              <span className="font-display text-2xl font-black text-white">
                Bus<span className="text-sky-400">Ora</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Smart College Bus GPS Tracking & Fleet Management Platform. Powered by Supabase PostgreSQL, Express, and React.
            </p>
            <div className="inline-flex items-center gap-2 rounded-lg bg-navy-800 px-3 py-1.5 text-xs text-sky-400 border border-slate-800">
              <Database className="h-3.5 w-3.5 text-emerald-400" />
              <span>Supabase DB & Realtime Active</span>
            </div>
          </div>

          {/* Role Portals */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Role Portals</h4>
            <ul className="mt-4 space-y-2 text-xs">
              <li>
                <button onClick={() => onOpenLogin('student')} className="hover:text-sky-400 transition-colors">
                  🎓 Student Live Tracking
                </button>
              </li>
              <li>
                <button onClick={() => onOpenLogin('driver')} className="hover:text-sky-400 transition-colors">
                  🚍 Driver Route Console
                </button>
              </li>
              <li>
                <button onClick={() => onOpenLogin('admin')} className="hover:text-sky-400 transition-colors">
                  👑 College Admin Dashboard
                </button>
              </li>
              <li>
                <span className="text-slate-500">Role-Hierarchical Access Control</span>
              </li>
            </ul>
          </div>

          {/* Safety & Support */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Campus Transit Safety</h4>
            <ul className="mt-4 space-y-2 text-xs text-slate-400">
              <li className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-sky-400" />
                <span>Dispatch Desk: +91 98765 00000</span>
              </li>
              <li className="flex items-center gap-2">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span>24/7 Incident Emergency SOS</span>
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-sky-400" />
                <span>Campus Transport Control Room</span>
              </li>
            </ul>
          </div>

          {/* Quick Info */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">About BusOra</h4>
            <p className="mt-4 text-xs text-slate-400 leading-relaxed">
              Designed for colleges and universities to eliminate student commute anxiety, monitor driver routes, calculate precise arrival ETAs, and guarantee campus student safety.
            </p>
            <p className="mt-3 text-[11px] text-slate-500">
              Version 2.4.0 • Built with Vite, React, Tailwind CSS & Supabase
            </p>
          </div>
        </div>

        <div className="mt-10 border-t border-navy-800 pt-6 text-center text-xs text-slate-500">
          <p>© {new Date().getFullYear()} BusOra Campus Transit System. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
