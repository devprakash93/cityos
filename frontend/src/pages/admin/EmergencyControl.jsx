import { useState, useEffect } from 'react';
import { useCity } from '../../context/CityContext';
import api from '../../api/axios';
import { ShieldAlert, RefreshCw, MapPin, Clock, CheckCircle } from 'lucide-react';

const SEVERITY_COLORS = {
  CRITICAL: 'border-red-500 bg-red-50',
  HIGH: 'border-orange-500 bg-orange-50',
  MEDIUM: 'border-yellow-500 bg-yellow-50',
  LOW: 'border-green-500 bg-green-50',
};

const SEVERITY_DOT = {
  CRITICAL: 'bg-red-500', HIGH: 'bg-orange-500',
  MEDIUM: 'bg-yellow-500', LOW: 'bg-green-500',
};

function IncidentCard({ incident }) {
  const colorClass = SEVERITY_COLORS[incident.severity] || 'border-slate-300 bg-slate-50';
  const dot = SEVERITY_DOT[incident.severity] || 'bg-slate-400';
  return (
    <div className={`rounded-xl border-l-4 p-4 ${colorClass} shadow-sm`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
            <h3 className="font-semibold text-slate-800 text-sm">{incident.incident_type?.replace(/_/g, ' ') || 'Emergency'}</h3>
            <span className="text-xs font-semibold text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200">{incident.severity}</span>
          </div>
          <p className="text-sm text-slate-600 mb-2 line-clamp-2">{incident.description || 'No description provided.'}</p>
          <div className="flex flex-wrap gap-3 text-xs text-slate-500">
            {incident['location__city__name'] && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {incident['location__city__name']}
              </span>
            )}
            {incident.created_at && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" /> {new Date(incident.created_at).toLocaleString()}
              </span>
            )}
          </div>
        </div>
        <span className={`text-xs font-bold px-2 py-1 rounded-full ${
          incident.status === 'RESOLVED' ? 'bg-green-100 text-green-700' :
          incident.status === 'RESPONDING' ? 'bg-blue-100 text-blue-700' :
          'bg-orange-100 text-orange-700'
        }`}>
          {incident.status}
        </span>
      </div>
    </div>
  );
}

export default function EmergencyControl() {
  const { selectedCity } = useCity();
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('ACTIVE');

  const fetchIncidents = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedCity) params.city_id = selectedCity.id;
      if (tab === 'ACTIVE') params.status__in = 'REPORTED,RESPONDING';
      if (tab === 'RESOLVED') params.status = 'RESOLVED';
      const res = await api.get('/emergency/incidents/', { params });
      const data = res.data.results ?? res.data ?? [];
      setIncidents(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchIncidents(); }, [selectedCity, tab]);

  const activeCount = incidents.filter(i => ['REPORTED', 'RESPONDING'].includes(i.status)).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Emergency Control Center</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {selectedCity ? selectedCity.name : 'All Odisha'} · {activeCount} active emergencies
          </p>
        </div>
        <button onClick={fetchIncidents} className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
        {['ACTIVE', 'RESOLVED', 'ALL'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : incidents.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
          <p className="font-medium text-slate-700">No {tab.toLowerCase()} emergencies</p>
          <p className="text-sm text-slate-400 mt-1">for {selectedCity ? selectedCity.name : 'All Odisha'}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {incidents.map(inc => (
            <IncidentCard key={inc.id} incident={inc} />
          ))}
        </div>
      )}
    </div>
  );
}
