import { Link } from 'react-router-dom';
import {
  TrafficCone, Trash2, Droplets, Zap,
  Bus, Wind, ShieldAlert, ChevronRight
} from 'lucide-react';

const SERVICES = [
  {
    icon: TrafficCone,
    label: 'Traffic',
    desc: 'Live traffic updates',
    to: '/citizen/traffic',
    color: '#d97706',
    bg: '#fef9c3',
    grad: 'linear-gradient(135deg, #d97706, #f59e0b)',
  },
  {
    icon: Wind,
    label: 'Air Quality',
    desc: 'AQI & pollution levels',
    to: '/citizen/pollution',
    color: '#0d9488',
    bg: '#ccfbf1',
    grad: 'linear-gradient(135deg, #0d9488, #14b8a6)',
  },
  {
    icon: Trash2,
    label: 'Waste',
    desc: 'Collection schedule',
    to: '/citizen/waste',
    color: '#78716c',
    bg: '#f5f5f4',
    grad: 'linear-gradient(135deg, #78716c, #a8a29e)',
  },
  {
    icon: Droplets,
    label: 'Water',
    desc: 'Supply & pressure',
    to: '/citizen/water',
    color: '#0369a1',
    bg: '#e0f2fe',
    grad: 'linear-gradient(135deg, #0369a1, #0284c7)',
  },
  {
    icon: Zap,
    label: 'Electricity',
    desc: 'Outages & status',
    to: '/citizen/electricity',
    color: '#b45309',
    bg: '#fef3c7',
    grad: 'linear-gradient(135deg, #b45309, #d97706)',
  },
  {
    icon: Bus,
    label: 'Transport',
    desc: 'Bus routes & timing',
    to: '/citizen/transport',
    color: '#7c3aed',
    bg: '#ede9fe',
    grad: 'linear-gradient(135deg, #7c3aed, #8b5cf6)',
  },
  {
    icon: ShieldAlert,
    label: 'Emergency',
    desc: 'Police, ambulance, fire',
    to: '/citizen/emergency',
    color: '#dc2626',
    bg: '#fee2e2',
    grad: 'linear-gradient(135deg, #dc2626, #ef4444)',
  },
];

export default function CityServices() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">City Services</h1>
        <p className="text-sm text-slate-500 mt-1">Public smart-city services for citizens</p>
      </div>

      {/* Grid of service cards */}
      <div className="grid grid-cols-2 gap-3">
        {SERVICES.map(s => (
          <Link key={s.to} to={s.to} className="block">
            <div
              className="citizen-card-hover rounded-3xl overflow-hidden"
              style={{ background: s.grad, boxShadow: `0 4px 16px ${s.color}40` }}
            >
              <div className="p-4">
                <div className="w-10 h-10 rounded-2xl bg-white/25 flex items-center justify-center mb-3">
                  <s.icon className="w-5 h-5 text-white" />
                </div>
                <p className="text-base font-bold text-white leading-tight">{s.label}</p>
                <p className="text-xs text-white/75 mt-0.5 leading-snug">{s.desc}</p>
                <div className="mt-3 flex justify-end">
                  <div className="w-7 h-7 rounded-xl bg-white/20 flex items-center justify-center">
                    <ChevronRight className="w-4 h-4 text-white" />
                  </div>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Tip box */}
      <div className="citizen-card p-4 flex items-start gap-3 bg-blue-50 border border-blue-100">
        <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
          <span className="text-base">💡</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-blue-800">Did you know?</p>
          <p className="text-xs text-blue-600 mt-0.5 leading-relaxed">
            You can report a civic problem directly from the Home screen or from any service page using the Report button.
          </p>
        </div>
      </div>
    </div>
  );
}
