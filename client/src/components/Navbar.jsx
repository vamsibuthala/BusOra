import React, { useState } from 'react';
import { Bus, ShieldCheck, MapPin, User, LogOut, Menu, X, ChevronDown, Bell } from 'lucide-react';

export default function Navbar({ user, onLogout, onOpenLogin, activeTab, setActiveTab }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-bold text-purple-700">👑 Admin</span>;
      case 'driver':
        return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-700">🚍 Driver</span>;
      case 'student':
        return <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-bold text-sky-700">🎓 Student</span>;
      default:
        return null;
    }
  };

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur-md shadow-xs">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Brand Logo & Name */}
        <div 
          onClick={() => setActiveTab('home')}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <img 
            src="/busora-logo.png" 
            alt="BusOra Logo" 
            className="h-10 w-10 sm:h-12 sm:w-12 object-contain rounded-xl shadow-xs transition-transform group-hover:scale-105"
          />
          <div>
            <div className="flex items-center gap-1">
              <span className="font-display text-xl sm:text-2xl font-black tracking-tight text-navy-800">
                Bus<span className="text-sky-500">Ora</span>
              </span>
              <span className="hidden sm:inline-block rounded-md bg-sky-100 px-1.5 py-0.5 text-[10px] font-bold text-sky-700">LIVE</span>
            </div>
            <p className="hidden sm:block text-[11px] font-medium text-slate-500 leading-none">Smart College Bus Tracking</p>
          </div>
        </div>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-1 lg:gap-2">
          <button
            onClick={() => setActiveTab('home')}
            className={`px-3 py-1.5 text-sm font-semibold rounded-lg transition-colors ${
              activeTab === 'home' ? 'text-sky-600 bg-sky-50' : 'text-slate-600 hover:text-navy-800 hover:bg-slate-100'
            }`}
          >
            Home
          </button>
          
          <button
            onClick={() => setActiveTab('routes')}
            className={`px-3 py-1.5 text-sm font-semibold rounded-lg transition-colors ${
              activeTab === 'routes' ? 'text-sky-600 bg-sky-50' : 'text-slate-600 hover:text-navy-800 hover:bg-slate-100'
            }`}
          >
            Bus Groups
          </button>

          {user && (
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-3 py-1.5 text-sm font-semibold rounded-lg transition-colors ${
                activeTab === 'dashboard' ? 'text-sky-600 bg-sky-50' : 'text-slate-600 hover:text-navy-800 hover:bg-slate-100'
              }`}
            >
              My Dashboard
            </button>
          )}
        </nav>

        {/* User State & Action CTA */}
        <div className="hidden sm:flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <div 
                onClick={() => setActiveTab('dashboard')}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 cursor-pointer hover:bg-slate-100 transition-colors"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-navy-800 text-xs font-bold text-white">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="text-left text-xs leading-tight">
                  <p className="font-semibold text-slate-900 truncate max-w-[120px]">{user.name}</p>
                  <p className="text-[10px] text-slate-500 capitalize">{user.role}</p>
                </div>
                {getRoleBadge(user.role)}
              </div>

              <button
                onClick={onLogout}
                title="Log out"
                className="flex items-center justify-center rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onOpenLogin('driver')}
                className="text-xs font-bold text-slate-700 hover:text-emerald-700 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                Driver Console
              </button>
              <button
                onClick={() => onOpenLogin('admin')}
                className="btn-primary text-xs py-2 px-3.5 shadow-sm"
              >
                <ShieldCheck className="h-4 w-4 text-sky-400" />
                Admin Portal
              </button>
            </div>
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex items-center gap-2 md:hidden">
          {user && (
            <button
              onClick={() => setActiveTab('dashboard')}
              className="rounded-lg bg-sky-50 px-2 py-1 text-xs font-bold text-sky-600"
            >
              Dashboard
            </button>
          )}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="border-t border-slate-200 bg-white px-4 py-4 md:hidden space-y-3">
          <div className="flex flex-col space-y-2">
            <button
              onClick={() => { setActiveTab('home'); setMobileMenuOpen(false); }}
              className={`text-left px-3 py-2 rounded-lg font-medium text-sm ${activeTab === 'home' ? 'bg-sky-50 text-sky-600' : 'text-slate-700'}`}
            >
              Home
            </button>
            <button
              onClick={() => { setActiveTab('routes'); setMobileMenuOpen(false); }}
              className={`text-left px-3 py-2 rounded-lg font-medium text-sm ${activeTab === 'routes' ? 'bg-sky-50 text-sky-600' : 'text-slate-700'}`}
            >
              Bus Groups
            </button>
            {user && (
              <button
                onClick={() => { setActiveTab('dashboard'); setMobileMenuOpen(false); }}
                className={`text-left px-3 py-2 rounded-lg font-medium text-sm ${activeTab === 'dashboard' ? 'bg-sky-50 text-sky-600' : 'text-slate-700'}`}
              >
                My Dashboard
              </button>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100">
            {user ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-900 text-sm">{user.name}</p>
                  <p className="text-xs text-slate-500 capitalize">{user.role}</p>
                </div>
                <button
                  onClick={() => { onLogout(); setMobileMenuOpen(false); }}
                  className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600"
                >
                  <LogOut className="h-3.5 w-3.5" /> Logout
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => { onOpenLogin('driver'); setMobileMenuOpen(false); }}
                  className="rounded-lg bg-emerald-50 py-2 text-xs font-semibold text-emerald-700 text-center"
                >
                  Driver Console
                </button>
                <button
                  onClick={() => { onOpenLogin('admin'); setMobileMenuOpen(false); }}
                  className="rounded-lg bg-navy-800 py-2 text-xs font-semibold text-white text-center"
                >
                  Admin Portal
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
