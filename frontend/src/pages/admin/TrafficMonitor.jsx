import { useState, useEffect } from 'react';
import { useCity } from '../../context/CityContext';
import api from '../../api/axios';
import { Car, AlertTriangle, RefreshCw, TrendingUp, MapPin } from 'lucide-react';

export default function TrafficMonitor() {
  const { selectedCity } = useCity();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = selectedCity ? { city_id: selectedCity.id } : {};
      const res = await api.get('/traffic/incidents/', { params });
      const incidents = res.data.results ?? res.data ?? [];
      setData({ incidents: Array.isArray(incidents) ? incidents : [] });
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [selectedCity]);

  const incidents = data?.incidents || [];
  const critical = incidents.filter(i => i.severity === 'CRITICAL').length;
  const high = incidents.filter(i => i.severity === 'HIGH').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Traffic Monitoring</h1>
          <p className="text-sm text-slate-500">{selectedCity?.name || 'All Odisha'} · Real-time traffic data</p>
        </div>
        <button onClick={fetchData} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50">
          <RefreshCw className={`w-4 h-4 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Incidents', value: incidents.length, color: 'bg-blue-500', icon: Car },
          { label: 'Critical', value: critical, color: 'bg-red-500', icon: AlertTriangle },
          { label: 'High Priority', value: high, color: 'bg-orange-500', icon: TrendingUp },
          { label: 'Resolved', value: incidents.filter(i => i.status === 'RESOLVED').length, color: 'bg-green-500', icon: Car },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3 shadow-sm">
            <div className={`p-2 rounded-lg ${stat.color}`}>
              <stat.icon className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-xs text-slate-500">{stat.label}</p>
              <p className="text-xl font-bold text-slate-900">{loading ? '—' : stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Recent Incidents</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Type</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Severity</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Location</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Source</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                [...Array(3)].map((_, i) => <tr key={i}><td colSpan="6" className="px-6 py-4"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td></tr>)
              ) : incidents.length === 0 ? (
                <tr><td colSpan="6" className="px-6 py-10 text-center text-slate-400">No incidents found.</td></tr>
              ) : (
                incidents.slice(0, 20).map(inc => (
                  <tr key={inc.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3 font-medium text-slate-700">{inc.incident_type?.replace(/_/g, ' ') || '—'}</td>
                    <td className="px-6 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        inc.severity === 'CRITICAL' ? 'bg-red-100 text-red-700' :
                        inc.severity === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>{inc.severity}</span>
                    </td>
                    <td className="px-6 py-3 text-xs text-slate-500">{inc['location__name'] || '—'}</td>
                    <td className="px-6 py-3 text-xs text-slate-600">{inc.status}</td>
                    <td className="px-6 py-3">
                      {inc.is_demo && <span className="text-[10px] font-bold bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">SIMULATED</span>}
                    </td>
                    <td className="px-6 py-3 text-xs text-slate-400">{inc.created_at ? new Date(inc.created_at).toLocaleString() : '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
