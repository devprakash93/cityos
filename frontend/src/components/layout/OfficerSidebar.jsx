import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  LayoutDashboard, Map, Clock, Users, PlayCircle, BarChart2, 
  FileText, ShieldAlert, Heart, Activity,
  Bell, Settings, User, BoxSelect,
  ChevronDown, ChevronRight, X, Briefcase
} from 'lucide-react';
import { cn } from '../../lib/utils';

export function OfficerSidebar({ onClose }) {
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState({});

  const toggle = (id) => {
    setCollapsed(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const navGroups = [
    {
      id: 'operations',
      label: 'Operations',
      items: [
        { name: 'Dashboard', href: '/officer/dashboard', icon: LayoutDashboard },
        { name: 'Operations Map', href: '/officer/map', icon: Map },
        { name: 'Department Services', href: '/officer/service', icon: Activity },
      ],
    },
    {
      id: 'management',
      label: 'Management',
      items: [
        { name: 'Complaints', href: '/officer/complaints', icon: Clock },
        { name: 'Tasks & Assignments', href: '/officer/tasks', icon: BoxSelect },
        { name: 'Field Workers', href: '/officer/workers', icon: Users },
      ],
    },
    {
      id: 'performance',
      label: 'Performance',
      items: [
        { name: 'SLA Monitoring', href: '/officer/sla', icon: ShieldAlert },
        { name: 'Analytics', href: '/officer/analytics', icon: BarChart2 },
        { name: 'Reports', href: '/officer/reports', icon: FileText },
      ],
    },
    {
      id: 'personal',
      label: 'Personal',
      items: [
        { name: 'Notifications', href: '/officer/notifications', icon: Bell },
        { name: 'Profile', href: '/officer/profile', icon: User },
      ],
    },
  ];

  return (
    <div className="flex flex-col h-full bg-slate-900 border-r border-slate-800">
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow">
            <Briefcase className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-bold text-white">Department Ops</span>
            <span className="text-[10px] text-slate-400 font-medium">{user?.department?.name || 'Officer'}</span>
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
                            ? 'bg-blue-600/20 text-blue-400 border border-blue-600/30'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800'
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <item.icon className={cn('w-4 h-4 shrink-0', isActive ? 'text-blue-400' : 'text-slate-500')} />
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
        <p className="text-[10px] text-slate-600 text-center">CityOS Officer Terminal</p>
      </div>
    </div>
  );
}
