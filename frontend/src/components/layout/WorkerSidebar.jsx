import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  LayoutDashboard, Map, ClipboardList,
  Bell, User, Briefcase, X, ShieldAlert, CheckCircle, Clock
} from 'lucide-react';
import { cn } from '../../lib/utils';

export function WorkerSidebar({ onClose }) {
  const { user } = useAuth();

  const navGroups = [
    {
      id: 'overview',
      label: 'Overview',
      items: [
        { name: 'Dashboard', href: '/worker/dashboard', icon: LayoutDashboard },
        { name: 'My Map', href: '/worker/map', icon: Map },
      ],
    },
    {
      id: 'work',
      label: 'Work',
      items: [
        { name: 'My Tasks', href: '/worker/tasks', icon: ClipboardList },
      ],
    },
    {
      id: 'monitoring',
      label: 'Monitoring',
      items: [
        { name: 'My Performance', href: '/worker/performance', icon: CheckCircle },
        { name: 'Notifications', href: '/worker/notifications', icon: Bell },
        { name: 'Profile', href: '/worker/profile', icon: User },
      ],
    },
  ];

  return (
    <div className="flex flex-col h-full bg-slate-900 border-r border-slate-800">
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-amber-600 rounded-lg flex items-center justify-center shadow">
            <Briefcase className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-bold text-white">Field Worker</span>
            <span className="text-[10px] text-slate-400 font-medium">{user?.department?.name || 'Operations'}</span>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-800 text-slate-400">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-4 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
        {navGroups.map((group) => (
          <div key={group.id} className="mb-1">
            <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">
              {group.label}
            </div>

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
                        ? 'bg-amber-600/20 text-amber-400 border border-amber-600/30'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <item.icon className={cn('w-4 h-4 shrink-0', isActive ? 'text-amber-400' : 'text-slate-500')} />
                      <span>{item.name}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-slate-800 shrink-0">
        <p className="text-[10px] text-slate-600 text-center">CityOS Worker Terminal</p>
      </div>
    </div>
  );
}
