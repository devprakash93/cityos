import { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import Topbar from '../components/layout/Topbar';
import {
  LayoutDashboard, User, FileText, AlertTriangle, MessageSquare, Clock,
  TrafficCone, Bus, Droplets, Zap, Trash2, Wind, ShieldAlert, PhoneCall,
  Hospital, Shield, Flame, Megaphone, Bell, BarChart2, Settings, LogOut,
  ChevronDown, ChevronRight, Menu, X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const NavGroup = ({ label, icon: Icon, children, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-3 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md text-sm font-semibold transition-colors"
      >
        <Icon className="w-5 h-5 shrink-0" />
        <span className="flex-1 text-left">{label}</span>
        {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>
      {open && <div className="ml-4 mt-1 space-y-1 border-l border-slate-700 pl-3">{children}</div>}
    </div>
  );
};

const NavItem = ({ to, icon: Icon, label, end = false }) => (
  <NavLink
    to={to}
    end={end}
    className={({ isActive }) =>
      `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
        isActive
          ? 'bg-primary-600 text-white'
          : 'text-slate-400 hover:text-white hover:bg-slate-800'
      }`
    }
  >
    <Icon className="w-5 h-5 shrink-0" />
    {label}
  </NavLink>
);

function CitizenSidebar({ onClose }) {
  const { logout } = useAuth();
  return (
    <div className="flex flex-col h-full bg-slate-900 px-4 pb-4 overflow-y-auto">
      <div className="flex h-16 shrink-0 items-center justify-between text-white">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
            <LayoutDashboard className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-sm leading-none">CityOS</p>
            <p className="text-xs text-slate-400 leading-none mt-0.5">Citizen Portal</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-slate-400 hover:text-white lg:hidden">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <nav className="flex flex-col gap-1 flex-1">
        <NavItem to="/citizen/dashboard" icon={LayoutDashboard} label="Dashboard" end />
        <NavItem to="/citizen/profile" icon={User} label="My Profile" />

        <div className="pt-2 pb-1">
          <p className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Complaints</p>
        </div>
        <NavItem to="/citizen/report" icon={AlertTriangle} label="Report a Problem" />
        <NavItem to="/citizen/complaints" icon={FileText} label="My Complaints" />
        <NavItem to="/citizen/activity" icon={Clock} label="Activity History" />

        <div className="pt-2 pb-1">
          <p className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">City Services</p>
        </div>
        <NavItem to="/citizen/traffic" icon={TrafficCone} label="Traffic" />
        <NavItem to="/citizen/transport" icon={Bus} label="Public Transport" />
        <NavItem to="/citizen/water" icon={Droplets} label="Water Supply" />
        <NavItem to="/citizen/electricity" icon={Zap} label="Electricity" />
        <NavItem to="/citizen/waste" icon={Trash2} label="Waste Management" />
        <NavItem to="/citizen/pollution" icon={Wind} label="Pollution" />

        <div className="pt-2 pb-1">
          <p className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Emergency</p>
        </div>
        <NavItem to="/citizen/emergency" icon={ShieldAlert} label="Emergency & SOS" />

        <div className="pt-2 pb-1">
          <p className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">City Info</p>
        </div>
        <NavItem to="/citizen/announcements" icon={Megaphone} label="Announcements" />
        <NavItem to="/citizen/notifications" icon={Bell} label="Notifications" />
        <NavItem to="/citizen/statistics" icon={BarChart2} label="City Statistics" />

        <div className="pt-2 pb-1">
          <p className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Account</p>
        </div>
        <NavItem to="/citizen/settings" icon={Settings} label="Settings" />

        <div className="flex-1" />

        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-md text-sm font-medium transition-colors mt-4"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </button>
      </nav>
    </div>
  );
}

export default function CitizenLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col flex-shrink-0">
        <CitizenSidebar />
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div className="fixed inset-0 bg-slate-900/60" onClick={() => setSidebarOpen(false)} />
          <div className="relative flex w-64 flex-col bg-slate-900 z-50">
            <CitizenSidebar onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex flex-col flex-1 w-0 overflow-hidden">
        <Topbar setSidebarOpen={setSidebarOpen} />
        <main className="flex-1 relative z-0 overflow-y-auto focus:outline-none">
          <div className="py-6 px-4 sm:px-6 md:px-8 max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
