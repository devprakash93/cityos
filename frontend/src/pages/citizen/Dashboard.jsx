import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCity } from '../../context/CityContext';
import { useTranslation } from 'react-i18next';
import api from '../../api/axios';
import {
  TrafficCone, Wind, Droplets, Zap, Trash2, Bus, ShieldAlert,
  FileText, CheckCircle, Clock, Bell, AlertTriangle, MapPin, Phone
} from 'lucide-react';

function StatCard({ icon: Icon, label, value, sub, color = 'primary', loading }) {
  const colorMap = {
    primary: 'bg-primary-50 text-primary-600 border-primary-100',
    green: 'bg-green-50 text-green-600 border-green-100',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-100',
    red: 'bg-red-50 text-red-600 border-red-100',
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    orange: 'bg-orange-50 text-orange-600 border-orange-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
    slate: 'bg-slate-100 text-slate-600 border-slate-200',
  };

  return (
    <div className={`rounded-xl border p-4 bg-white shadow-sm hover:shadow-md transition-shadow ${colorMap[color] || colorMap.primary}`}>
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${colorMap[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-slate-500 truncate">{label}</p>
          <p className={`text-lg font-bold mt-0.5 ${loading ? 'text-slate-300' : 'text-slate-900'}`}>
            {loading ? '—' : value}
          </p>
          {sub && <p className="text-xs text-slate-400 mt-0.5 truncate">{sub}</p>}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    ASSIGNED: 'bg-blue-100 text-blue-800',
    IN_PROGRESS: 'bg-orange-100 text-orange-800',
    RESOLVED: 'bg-green-100 text-green-800',
    CLOSED: 'bg-slate-100 text-slate-600',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${map[status] || 'bg-slate-100 text-slate-600'}`}>
      {status?.replace('_', ' ')}
    </span>
  );
}

export default function CitizenDashboard() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [complaints, setComplaints] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [aqi, setAqi] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ open: 0, resolved: 0, pending: 0 });
  const { selectedCity } = useCity();

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const cityParams = selectedCity ? { city_id: selectedCity.id } : {};
        const [cmpRes, notifRes, aqiRes] = await Promise.allSettled([
          api.get('/complaints/', { params: cityParams }),
          api.get('/notifications/'),
          api.get('/pollution/stations/city-aqi/', { params: cityParams }),
        ]);

        if (cmpRes.status === 'fulfilled') {
          const all = cmpRes.value.data?.results || cmpRes.value.data || [];
          setComplaints(all.slice(0, 5));
          setStats({
            open: all.filter(c => ['PENDING', 'ASSIGNED', 'IN_PROGRESS'].includes(c.status)).length,
            resolved: all.filter(c => ['RESOLVED', 'CLOSED'].includes(c.status)).length,
            pending: all.filter(c => c.status === 'PENDING').length,
          });
        }

        if (notifRes.status === 'fulfilled') {
          const all = notifRes.value.data?.results || notifRes.value.data || [];
          setNotifications(all.slice(0, 4));
        }

        if (aqiRes.status === 'fulfilled') {
          const data = aqiRes.value.data;
          if (Array.isArray(data) && data.length > 0) {
            setAqi(data[0]?.latest_reading?.aqi_value ?? null);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [selectedCity]);

  const aqiStatus = (aqi) => {
    if (!aqi) return { label: 'N/A', color: 'slate' };
    if (aqi <= 50) return { label: `${aqi} Good`, color: 'green' };
    if (aqi <= 100) return { label: `${aqi} Moderate`, color: 'yellow' };
    if (aqi <= 150) return { label: `${aqi} Unhealthy`, color: 'orange' };
    return { label: `${aqi} Hazardous`, color: 'red' };
  };

  const aqiInfo = aqiStatus(aqi);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {t(`Good ${new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'}`)}, {user?.first_name || user?.username} 👋
          </h1>
          <p className="text-slate-500 mt-1">Here's your {selectedCity?.name || 'city'} overview for today.</p>
        </div>
        <Link
          to="/citizen/emergency"
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors shadow-sm"
        >
          <ShieldAlert className="w-4 h-4" /> Emergency SOS
        </Link>
      </div>

      {/* City Status Grid */}
      <div>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">🌐 {t('City Status')}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard icon={TrafficCone} label={t('Traffic Status')} value="Moderate" sub="3 incidents active" color="yellow" loading={loading} />
          <StatCard icon={Wind} label={t('Air Quality (AQI)')} value={aqiInfo.label} sub="City average" color={aqiInfo.color} loading={loading} />
          <StatCard icon={Droplets} label={t('Water Supply')} value="Normal" sub="All zones active" color="blue" loading={loading} />
          <StatCard icon={Zap} label={t('Electricity')} value="Stable" sub="0 active outages" color="primary" loading={loading} />
          <StatCard icon={Trash2} label={t('Waste Collection')} value="On Schedule" sub="Next: Tomorrow 7AM" color="green" loading={loading} />
          <StatCard icon={Bus} label={t('Public Transport')} value="Running" sub="All routes active" color="purple" loading={loading} />
          <StatCard icon={ShieldAlert} label={t('Emergency Alerts')} value="0 Active" sub="All clear" color="slate" loading={loading} />
          <StatCard icon={Bell} label={t('Notifications')} value={notifications.filter(n => !n.is_read).length || 0} sub="Unread" color="orange" loading={loading} />
        </div>
      </div>

      {/* My Complaint Stats */}
      <div>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">📋 {t('My Complaints')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 text-center shadow-sm">
            <p className="text-3xl font-bold text-orange-500">{loading ? '—' : stats.open}</p>
            <p className="text-sm text-slate-500 mt-1">{t('Active')}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 text-center shadow-sm">
            <p className="text-3xl font-bold text-green-600">{loading ? '—' : stats.resolved}</p>
            <p className="text-sm text-slate-500 mt-1">{t('Resolved')}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 text-center shadow-sm">
            <p className="text-3xl font-bold text-yellow-600">{loading ? '—' : stats.pending}</p>
            <p className="text-sm text-slate-500 mt-1">{t('Pending')}</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">⚡ {t('Quick Actions')}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {[
            { to: '/citizen/report', icon: AlertTriangle, label: t('Report Problem'), color: 'bg-red-50 text-red-600 hover:bg-red-100' },
            { to: '/citizen/complaints', icon: FileText, label: t('Track Complaint'), color: 'bg-blue-50 text-blue-600 hover:bg-blue-100' },
            { to: '/citizen/emergency', icon: ShieldAlert, label: t('Emergency SOS'), color: 'bg-red-600 text-white hover:bg-red-700' },
            { to: '/citizen/traffic', icon: TrafficCone, label: t('View Traffic'), color: 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100' },
            { to: '/citizen/pollution', icon: Wind, label: t('View Pollution'), color: 'bg-green-50 text-green-600 hover:bg-green-100' },
            { to: '/citizen/transport', icon: Bus, label: t('Transport'), color: 'bg-purple-50 text-purple-600 hover:bg-purple-100' },
          ].map(({ to, icon: Icon, label, color }) => (
            <Link key={to} to={to} className={`flex flex-col items-center gap-2 p-3 rounded-xl text-center text-sm font-medium transition-colors ${color}`}>
              <Icon className="w-6 h-6" />
              <span className="text-xs leading-tight">{label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Complaints & Notifications side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Complaints */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900">{t('Recent Complaints')}</h3>
            <Link to="/citizen/complaints" className="text-xs text-primary-600 hover:underline font-medium">View all →</Link>
          </div>
          <div className="divide-y divide-slate-50">
            {loading ? (
              [...Array(3)].map((_, i) => (
                <div key={i} className="p-4 animate-pulse">
                  <div className="h-4 bg-slate-100 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-slate-50 rounded w-1/2" />
                </div>
              ))
            ) : complaints.length > 0 ? complaints.map(c => (
              <Link key={c.id} to={`/citizen/complaints/${c.id}`} className="flex items-start gap-3 px-5 py-3 hover:bg-slate-50 transition-colors">
                <FileText className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{c.title}</p>
                  <p className="text-xs text-slate-400">{c.category} · {new Date(c.created_at).toLocaleDateString()}</p>
                </div>
                <StatusBadge status={c.status} />
              </Link>
            )) : (
              <div className="px-5 py-8 text-center text-slate-400 text-sm">No complaints yet.</div>
            )}
          </div>
          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50">
            <Link to="/citizen/report" className="text-xs text-primary-600 hover:underline font-medium">+ Report a new problem</Link>
          </div>
        </div>

        {/* Recent Notifications */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900">{t('Recent Notifications')}</h3>
            <Link to="/citizen/notifications" className="text-xs text-primary-600 hover:underline font-medium">View all →</Link>
          </div>
          <div className="divide-y divide-slate-50">
            {loading ? (
              [...Array(3)].map((_, i) => (
                <div key={i} className="p-4 animate-pulse">
                  <div className="h-4 bg-slate-100 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-slate-50 rounded w-1/2" />
                </div>
              ))
            ) : notifications.length > 0 ? notifications.map(n => (
              <div key={n.id} className={`flex items-start gap-3 px-5 py-3 ${!n.is_read ? 'bg-primary-50/40' : ''}`}>
                <Bell className={`w-4 h-4 mt-0.5 shrink-0 ${!n.is_read ? 'text-primary-500' : 'text-slate-400'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{n.title}</p>
                  <p className="text-xs text-slate-400">{new Date(n.created_at).toLocaleDateString()}</p>
                </div>
                {!n.is_read && <span className="w-2 h-2 bg-primary-500 rounded-full mt-1.5 shrink-0" />}
              </div>
            )) : (
              <div className="px-5 py-8 text-center text-slate-400 text-sm">You're all caught up!</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
