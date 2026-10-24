import { 
  Megaphone, HeartHandshake, Sparkles, ShieldAlert,
  Info, TrafficCone, Droplets, Zap, Bus, Calendar,
  CloudRain, AlertTriangle
} from 'lucide-react';

export const CATEGORY_CONFIG = {
  WELFARE_SCHEME: {
    label: 'Welfare Scheme',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200/80',
    dotClass: 'bg-emerald-600',
    icon: HeartHandshake,
    accent: '#059669',
  },
  CITY_CAMPAIGN: {
    label: 'City Campaign',
    badgeClass: 'bg-teal-50 text-teal-800 border-teal-200/80',
    dotClass: 'bg-teal-600',
    icon: Sparkles,
    accent: '#0d9488',
  },
  EMERGENCY_ALERT: {
    label: 'Emergency Alert',
    badgeClass: 'bg-red-50 text-red-800 border-red-200/90 font-bold animate-pulse',
    dotClass: 'bg-red-600',
    icon: ShieldAlert,
    accent: '#dc2626',
  },
  PUBLIC_NOTICE: {
    label: 'Public Notice',
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-200/90',
    dotClass: 'bg-slate-600',
    icon: Info,
    accent: '#475569',
  },
  ANNOUNCEMENT: {
    label: 'Announcement',
    badgeClass: 'bg-blue-50 text-blue-800 border-blue-200/80',
    dotClass: 'bg-blue-600',
    icon: Megaphone,
    accent: '#2563eb',
  },
  TRAFFIC: {
    label: 'Traffic & Roadwork',
    badgeClass: 'bg-amber-50 text-amber-900 border-amber-200/80',
    dotClass: 'bg-amber-600',
    icon: TrafficCone,
    accent: '#d97706',
  },
  WATER: {
    label: 'Water Supply',
    badgeClass: 'bg-cyan-50 text-cyan-900 border-cyan-200/80',
    dotClass: 'bg-cyan-600',
    icon: Droplets,
    accent: '#0891b2',
  },
  ELECTRICITY: {
    label: 'Power & Grid',
    badgeClass: 'bg-yellow-50 text-yellow-900 border-yellow-200/80',
    dotClass: 'bg-yellow-600',
    icon: Zap,
    accent: '#ca8a04',
  },
  TRANSPORT: {
    label: 'Public Transit',
    badgeClass: 'bg-indigo-50 text-indigo-900 border-indigo-200/80',
    dotClass: 'bg-indigo-600',
    icon: Bus,
    accent: '#4f46e5',
  },
  EVENT: {
    label: 'Civic Event',
    badgeClass: 'bg-purple-50 text-purple-900 border-purple-200/80',
    dotClass: 'bg-purple-600',
    icon: Calendar,
    accent: '#7c3aed',
  },
  WEATHER: {
    label: 'Weather Alert',
    badgeClass: 'bg-sky-50 text-sky-900 border-sky-200/80',
    dotClass: 'bg-sky-600',
    icon: CloudRain,
    accent: '#0284c7',
  },
  DISASTER: {
    label: 'Disaster Notice',
    badgeClass: 'bg-rose-50 text-rose-900 border-rose-200/80',
    dotClass: 'bg-rose-600',
    icon: AlertTriangle,
    accent: '#e11d48',
  },
  CIVIC: {
    label: 'Civic Initiative',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200/80',
    dotClass: 'bg-emerald-600',
    icon: Megaphone,
    accent: '#059669',
  },
};

export default function AnnouncementCategoryBadge({ category, size = 'sm', showDot = true, showIcon = false }) {
  const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.ANNOUNCEMENT;
  const Icon = config.icon;

  const sizeClasses = {
    xs: 'text-[10px] px-2 py-0.5 font-semibold gap-1',
    sm: 'text-xs px-2.5 py-1 font-semibold gap-1.5',
    md: 'text-sm px-3 py-1.5 font-bold gap-2',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border shadow-xs tracking-wide uppercase ${config.badgeClass} ${sizeClasses[size] || sizeClasses.sm}`}
    >
      {showDot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${config.dotClass}`} />}
      {showIcon && <Icon className="w-3.5 h-3.5 shrink-0" />}
      <span>{config.label}</span>
    </span>
  );
}
