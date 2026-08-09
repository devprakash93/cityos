import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, Map, Clock, ShieldAlert, AlertTriangle,
  Car, Trash2, Droplets, Zap, Bus, Wind, MapPin, Users, Building,
  PlayCircle, BarChart2, FileText, ScrollText, Heart,
  Megaphone, Bell, Settings, User,
  ChevronDown, ChevronRight, X, Command
} from 'lucide-react';
import { cn } from '../../lib/utils';

const navGroups = [
  {
    id: 'overview',
    label: 'Overview',
    items: [
      { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
      { name: 'Command Map', href: '/admin/map', icon: Map },
    ],
  },
  {
    id: 'operations',
    label: 'Operations',
    items: [
      { name: 'Complaints', href: '/admin/complaints', icon: Clock },
      { name: 'Emergency', href: '/admin/emergency', icon: ShieldAlert },
      { name: 'Disaster Alerts', href: '/admin/disaster', icon: AlertTriangle },
    ],
  },
  {
    id: 'city_services',
    label: 'City Services',
    items: [
      { name: 'Traffic', href: '/admin/traffic', icon: Car },
      { name: 'Waste', href: '/admin/waste', icon: Trash2 },
      { name: 'Water', href: '/admin/water', icon: Droplets },
      { name: 'Electricity', href: '/admin/electricity', icon: Zap },
      { name: 'Transport', href: '/admin/transport', icon: Bus },
      { name: 'Pollution', href: '/admin/pollution', icon: Wind },
    ],
  },
  {
    id: 'administration',
    label: 'Administration',
    items: [
      { name: 'Geography', href: '/admin/geography', icon: MapPin },
      { name: 'Users & Roles', href: '/admin/users', icon: Users },
      { name: 'Departments', href: '/admin/departments', icon: Building },
    ],
  },
  {
    id: 'monitoring',
    label: 'Monitoring',
    items: [
      { name: 'IoT Control Center', href: '/admin/simulator', icon: PlayCircle },
      { name: 'Analytics', href: '/admin/analytics', icon: BarChart2 },
      { name: 'Reports', href: '/admin/reports', icon: FileText },
      { name: 'Audit Logs', href: '/admin/audit-logs', icon: ScrollText },
      { name: 'System Health', href: '/admin/health', icon: Heart },
    ],
  },
  {
    id: 'content',
    label: 'Content',
    items: [
      { name: 'Announcements', href: '/admin/announcements', icon: Megaphone },
      { name: 'Notifications', href: '/admin/notifications', icon: Bell },
    ],
  },
  {
    id: 'system',
    label: 'System',
    items: [
      { name: 'Settings', href: '/admin/settings', icon: Settings },
      { name: 'Profile', href: '/admin/profile', icon: User },
    ],
  },
];

export function AdminSidebar({ onClose }) {
  // Default all expanded; user can collapse any group
  const [collapsed, setCollapsed] = useState({});

  const toggle = (id) => {
    setCollapsed(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border-r border-slate-800">
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center shadow">
            <Command className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-bold text-white">Odisha CityOS</span>
            <span className="text-[10px] text-slate-400 font-medium">Command Center</span>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-800 text-slate-400">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
        {navGroups.map((group) => {
          const isCollapsed = collapsed[group.id];
          return (
            <div key={group.id} className="mb-1">
              {/* Group Label */}
              <button
                onClick={() => toggle(group.id)}
                className="flex items-center justify-between w-full px-2 py-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-slate-400 transition-colors rounded"
              >
                <span>{group.label}</span>
                {isCollapsed
                  ? <ChevronRight className="w-3 h-3" />
                  : <ChevronDown className="w-3 h-3" />
                }
              </button>

              {/* Items */}
              {!isCollapsed && (
                <div className="mt-0.5 space-y-0.5">
                  {group.items.map((item) => (
                    <NavLink
                      key={item.href}
                      to={item.href}
                      onClick={onClose}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                          isActive
                            ? 'bg-green-600/20 text-green-400 border border-green-600/30'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800'
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <item.icon className={cn('w-4 h-4 shrink-0', isActive ? 'text-green-400' : 'text-slate-500')} />
                          <span>{item.name}</span>
                        </>
                      )}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-slate-800 shrink-0">
        <p className="text-[10px] text-slate-600 text-center">Odisha Smart City Digital OS</p>
      </div>
    </div>
  );
}
