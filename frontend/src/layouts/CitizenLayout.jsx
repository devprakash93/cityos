import { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import {
  Home, FileText, User, Menu, X, Bell, ChevronRight,
  AlertTriangle, MapPin, TrafficCone, Trash2, Droplets,
  Zap, Bus, Wind, ShieldAlert, Megaphone, Settings,
  LogOut, Activity, Phone, HelpCircle, Info, Clock,
  LayoutGrid, Building2, Shield
} from 'lucide-react';

/* ─────────────────────────────────────────────
   CITIZEN HEADER
───────────────────────────────────────────── */
function CitizenHeader({ onNotifClick, unreadCount, user }) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
  const firstName = user?.first_name || user?.username || 'Citizen';

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-100 shadow-sm">
      {/* Top bar: logo + notification */}
      <div className="flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-navy-600 flex items-center justify-center shadow-sm flex-shrink-0">
            <Building2 className="w-4.5 h-4.5 text-white" style={{ width: 18, height: 18 }} />
          </div>
          <div className="leading-none">
            <p className="text-sm font-bold text-slate-900 tracking-tight">Odisha CityOS</p>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">Citizen Portal</p>
          </div>
        </div>

        <button
          onClick={onNotifClick}
          className="relative touch-btn w-10 h-10 rounded-xl hover:bg-slate-100 transition-colors"
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5 text-slate-600" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Greeting bar */}
      <div className="px-4 pb-3">
        <p className="text-base font-bold text-slate-900">
          {greeting}, {firstName} 👋
        </p>
        <p className="text-xs text-slate-500 mt-0.5">Stay informed. Help make your city better.</p>
      </div>
    </header>
  );
}

/* ─────────────────────────────────────────────
   BOTTOM NAVIGATION
───────────────────────────────────────────── */
function BottomNav({ onMenuOpen }) {
  const location = useLocation();
  const path = location.pathname;

  const isHome = path === '/citizen/dashboard';
  const isComplaints = path.startsWith('/citizen/complaints') || path.startsWith('/citizen/report');
  const isProfile = path.startsWith('/citizen/profile');
  const isMenu = !isHome && !isComplaints && !isProfile;

  const Tab = ({ label, icon: Icon, active, onClick, to }) => {
    const navigate = useNavigate();
    return (
      <button
        onClick={() => { if (to) navigate(to); if (onClick) onClick(); }}
        className="flex-1 flex flex-col items-center gap-0.5 py-2 px-1 touch-btn rounded-xl transition-all"
        style={{ minHeight: 56 }}
      >
        <div className={`w-8 h-8 flex items-center justify-center rounded-xl transition-all ${
          active ? 'bg-blue-600 shadow-sm' : 'bg-transparent'
        }`}>
          <Icon className={`w-5 h-5 transition-colors ${active ? 'text-white' : 'text-slate-400'}`} />
        </div>
        <span className={`text-[10px] font-semibold transition-colors ${active ? 'text-blue-600' : 'text-slate-400'}`}>
          {label}
        </span>
      </button>
    );
  };

  return (
    <div className="bottom-nav" style={{ background: 'transparent' }}>
      <div className="bottom-nav-inner">
        <Tab label="Home" icon={Home} active={isHome} to="/citizen/dashboard" />
        <Tab label="Complaints" icon={FileText} active={isComplaints} to="/citizen/complaints" />
        <Tab label="Profile" icon={User} active={isProfile} to="/citizen/profile" />
        <Tab label="Menu" icon={Menu} active={isMenu} onClick={onMenuOpen} />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   FULL-SCREEN MENU OVERLAY
───────────────────────────────────────────── */
const MENU_SECTIONS = [
  {
    title: 'CIVIC SERVICES',
    items: [
      { label: 'Report a Problem', icon: AlertTriangle, to: '/citizen/report', color: 'text-red-500 bg-red-50' },
      { label: 'My Complaints', icon: FileText, to: '/citizen/complaints', color: 'text-blue-600 bg-blue-50' },
      { label: 'City Services', icon: LayoutGrid, to: '/citizen/services', color: 'text-indigo-600 bg-indigo-50' },
      { label: 'Activity History', icon: Clock, to: '/citizen/activity', color: 'text-purple-600 bg-purple-50' },
    ],
  },
  {
    title: 'SMART CITY',
    items: [
      { label: 'Traffic', icon: TrafficCone, to: '/citizen/traffic', color: 'text-amber-600 bg-amber-50' },
      { label: 'Air Quality', icon: Wind, to: '/citizen/pollution', color: 'text-teal-600 bg-teal-50' },
      { label: 'Waste Management', icon: Trash2, to: '/citizen/waste', color: 'text-stone-600 bg-stone-100' },
      { label: 'Water Supply', icon: Droplets, to: '/citizen/water', color: 'text-cyan-600 bg-cyan-50' },
      { label: 'Electricity', icon: Zap, to: '/citizen/electricity', color: 'text-yellow-600 bg-yellow-50' },
      { label: 'Public Transport', icon: Bus, to: '/citizen/transport', color: 'text-violet-600 bg-violet-50' },
    ],
  },
  {
    title: 'ALERTS & SAFETY',
    items: [
      { label: 'Emergency Services', icon: ShieldAlert, to: '/citizen/emergency', color: 'text-red-600 bg-red-50' },
      { label: 'Announcements', icon: Megaphone, to: '/citizen/announcements', color: 'text-orange-600 bg-orange-50' },
      { label: 'City Statistics', icon: Activity, to: '/citizen/statistics', color: 'text-green-600 bg-green-50' },
    ],
  },
  {
    title: 'ACCOUNT',
    items: [
      { label: 'My Profile', icon: User, to: '/citizen/profile', color: 'text-slate-600 bg-slate-100' },
      { label: 'Notifications', icon: Bell, to: '/citizen/notifications', color: 'text-blue-600 bg-blue-50' },
      { label: 'Settings', icon: Settings, to: '/citizen/settings', color: 'text-slate-600 bg-slate-100' },
    ],
  },
];

function FullScreenMenu({ open, onClose }) {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const menuRef = useRef(null);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  const handleNav = (to) => {
    onClose();
    navigate(to);
  };

  const handleLogout = () => {
    onClose();
    logout();
    navigate('/login');
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col fade-in" style={{ background: 'rgba(0,0,0,0.5)' }}>
      {/* Backdrop tap to close */}
      <div className="flex-1 min-h-0" onClick={onClose} />

      {/* Menu panel */}
      <div
        ref={menuRef}
        className="slide-up bg-white rounded-t-3xl max-h-[90vh] flex flex-col"
        style={{ boxShadow: '0 -8px 40px rgb(0 0 0 / 0.18)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100 flex-shrink-0">
          <div>
            <p className="font-bold text-slate-900 text-base">Menu</p>
            <p className="text-xs text-slate-400 mt-0.5">{user?.email}</p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 px-4 py-4 space-y-5" style={{ paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0px))' }}>
          {MENU_SECTIONS.map(section => (
            <div key={section.title}>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">
                {section.title}
              </p>
              <div className="space-y-1">
                {section.items.map(item => (
                  <button
                    key={item.to}
                    onClick={() => handleNav(item.to)}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl hover:bg-slate-50 active:bg-slate-100 transition-colors text-left"
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${item.color.split(' ')[1]}`}>
                      <item.icon className={`w-4.5 h-4.5 ${item.color.split(' ')[0]}`} style={{ width: 18, height: 18 }} />
                    </div>
                    <span className="flex-1 text-sm font-semibold text-slate-800">{item.label}</span>
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* Logout */}
          <div className="pt-2 border-t border-slate-100">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl hover:bg-red-50 active:bg-red-100 transition-colors text-left"
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-red-50 flex-shrink-0">
                <LogOut className="w-4.5 h-4.5 text-red-500" style={{ width: 18, height: 18 }} />
              </div>
              <span className="flex-1 text-sm font-semibold text-red-600">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   MAIN CITIZEN LAYOUT
───────────────────────────────────────────── */
export default function CitizenLayout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const res = await api.get('/notifications/unread-count/');
        setUnreadCount(res.data?.unread_count || 0);
      } catch {}
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col max-w-screen-md mx-auto relative">
      {/* Header */}
      <CitizenHeader
        user={user}
        unreadCount={unreadCount}
        onNotifClick={() => navigate('/citizen/notifications')}
      />

      {/* Page content */}
      <main className="flex-1 overflow-y-auto" style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' }}>
        <div className="px-4 py-4">
          <Outlet />
        </div>
      </main>

      {/* Bottom navigation */}
      <BottomNav onMenuOpen={() => setMenuOpen(true)} />

      {/* Full-screen menu overlay */}
      <FullScreenMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </div>
  );
}
