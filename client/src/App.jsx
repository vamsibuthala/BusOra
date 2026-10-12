import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import LoginModal from './components/LoginModal';
import HomePage from './pages/HomePage';
import RoutesPage from './pages/RoutesPage';
import StudentDashboard from './pages/StudentDashboard';
import DriverDashboard from './pages/DriverDashboard';
import AdminDashboard from './pages/AdminDashboard';
import { getStoredUser, setToken, setStoredUser, resetSocket } from './services/api';

export default function App() {
  const [user, setUser] = useState(() => getStoredUser());
  const [activeTab, setActiveTab] = useState('home'); // 'home' | 'routes' | 'dashboard'
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [loginRole, setLoginRole] = useState('student');

  const handleOpenLogin = (role = 'student') => {
    setLoginRole(role);
    setIsLoginOpen(true);
  };

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    setToken(null);
    setStoredUser(null);
    resetSocket();
    setUser(null);
    setActiveTab('home');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans text-slate-800">
      {/* Top Navbar */}
      <Navbar
        user={user}
        onLogout={handleLogout}
        onOpenLogin={handleOpenLogin}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {activeTab === 'home' && (
          <HomePage
            onOpenLogin={handleOpenLogin}
            onSelectTab={setActiveTab}
          />
        )}

        {activeTab === 'routes' && (
          <RoutesPage
            onOpenLogin={handleOpenLogin}
          />
        )}

        {activeTab === 'dashboard' && user && (
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            {user.role === 'admin' && <AdminDashboard user={user} />}
            {user.role === 'driver' && <DriverDashboard user={user} />}
            {user.role === 'student' && <StudentDashboard user={user} />}
          </div>
        )}

        {activeTab === 'dashboard' && !user && (
          <div className="mx-auto max-w-md my-20 card text-center p-8">
            <h2 className="text-xl font-bold text-navy-900 mb-2">Authentication Required</h2>
            <p className="text-xs text-slate-500 mb-6">
              Please sign in with your role account to access the dashboard.
            </p>
            <button
              onClick={() => handleOpenLogin('student')}
              className="btn-primary w-full py-2.5 text-xs font-bold"
            >
              Sign In to BusOra
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <Footer onOpenLogin={handleOpenLogin} />

      {/* Login Modal */}
      <LoginModal
        isOpen={isLoginOpen}
        defaultRole={loginRole}
        onClose={() => setIsLoginOpen(false)}
        onSuccess={handleLoginSuccess}
      />
    </div>
  );
}
