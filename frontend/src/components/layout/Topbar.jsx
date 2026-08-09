import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCity } from '../../context/CityContext';
import { 
  Bell, ChevronDown, User, Settings, LogOut, 
  Activity, Globe, MapPin, Menu, Command
} from 'lucide-react';
import api from '../../api/axios';

export default function Topbar({ setSidebarOpen }) {
  const { user, logout } = useAuth();
  const { cities, selectedCity, changeCity } = useCity();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const profileRef = useRef(null);
  const notifRef = useRef(null);

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const res = await api.get('/notifications/unread-count/');
        setUnreadCount(res.data.unread_count || 0);
      } catch (e) {}
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const userInitial = user?.full_name ? user.full_name.charAt(0).toUpperCase() 
    : user?.email ? user.email.charAt(0).toUpperCase() : 'A';
  const userName = user?.full_name || user?.email || 'Admin';

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-6 z-30 sticky top-0 shadow-sm">
      {/* Left: Branding + Mobile menu */}
      <div className="flex items-center gap-4">
        {setSidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 lg:hidden"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <Command className="w-4 h-4 text-green-600" />
            Odisha CityOS
          </span>
          <span className="text-xs text-slate-400 font-medium">Central Command Center</span>
        </div>
      </div>

      {/* Right: City Selector, Notifications, Profile */}
      <div className="flex items-center gap-2">
        
        {/* Global Scope Badge */}
        <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-full bg-slate-100 text-slate-500 text-xs font-medium">
          <Globe className="w-3 h-3 text-green-600" />
          <span>Odisha</span>
        </div>

        {/* City Selector */}
        {cities?.length > 0 && (
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition-colors">
            <MapPin className="w-3.5 h-3.5 text-green-600 shrink-0" />
            <select
              className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer max-w-[120px]"
              value={selectedCity?.id || ''}
              onChange={(e) => {
                if (e.target.value === '') changeCity(null);
                else changeCity(e.target.value);
              }}
            >
              <option value="">All Cities</option>
              {cities.map(city => (
                <option key={city.id} value={city.id}>{city.name}</option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </div>
        )}

        {/* Notification Bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="relative p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
          {notifOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-semibold text-slate-900 text-sm">Notifications</h3>
                <span className="text-xs text-slate-400">{unreadCount} unread</span>
              </div>
              <div className="p-4 text-center text-slate-400 text-sm">
                <Link 
                  to="/admin/notifications" 
                  className="text-green-600 hover:text-green-700 font-medium"
                  onClick={() => setNotifOpen(false)}
                >
                  View all notifications →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Profile */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white text-xs font-bold shadow">
              {userInitial}
            </div>
            <div className="hidden sm:flex flex-col items-start leading-tight">
              <span className="text-xs font-semibold text-slate-800">{userName}</span>
              <span className="text-[10px] text-slate-400">Super Admin</span>
            </div>
            <ChevronDown className="w-3 h-3 text-slate-400 hidden sm:block" />
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-50">
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="text-sm font-semibold text-slate-900">{userName}</p>
                <p className="text-xs text-slate-400 truncate">{user?.email}</p>
              </div>
              <Link
                to="/admin/profile"
                className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                onClick={() => setProfileOpen(false)}
              >
                <User className="w-4 h-4 text-slate-400" /> My Profile
              </Link>
              <Link
                to="/admin/settings"
                className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                onClick={() => setProfileOpen(false)}
              >
                <Settings className="w-4 h-4 text-slate-400" /> System Settings
              </Link>
              <Link
                to="/admin/audit-logs"
                className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                onClick={() => setProfileOpen(false)}
              >
                <Activity className="w-4 h-4 text-slate-400" /> Activity
              </Link>
              <div className="border-t border-slate-100 mt-1">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" /> Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
