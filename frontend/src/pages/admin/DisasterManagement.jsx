import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { useCity } from '../../context/CityContext';
import { AlertTriangle, RefreshCw, Plus, Tornado } from 'lucide-react';

const DISASTER_TYPES = [
  'CYCLONE', 'HEAVY_RAIN', 'FLOOD', 'WATERLOGGING',
  'HEATWAVE', 'THUNDERSTORM', 'STRONG_WIND'
];

const SEVERITY_COLORS = {
  RED: 'bg-red-100 text-red-700 border-red-200',
  ORANGE: 'bg-orange-100 text-orange-700 border-orange-200',
  YELLOW: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  GREEN: 'bg-green-100 text-green-700 border-green-200',
};

export default function DisasterManagement() {
  const { selectedCity, cities } = useCity();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', disaster_type: 'CYCLONE',
    severity: 'RED', city: '', expires_at: '', category: 'DISASTER',
    scope_level: 'CITY',
  });

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/notifications/announcements/', { params: { category: 'DISASTER' } });
      const data = res.data.results ?? res.data ?? [];
      setAlerts(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAlerts(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/notifications/announcements/', {
        title: `[${form.disaster_type.replace('_', ' ')}] ${form.title}`,
        message: form.description,
        category: 'DISASTER',
        scope_level: form.scope_level,
        expires_at: form.expires_at || null,
      });
      setShowForm(false);
      fetchAlerts();
    } catch (err) { alert('Error creating alert'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Disaster Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage disaster alerts for Odisha</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" /> Create Alert
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-red-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
            <Tornado className="w-5 h-5 text-red-600" />
            <h2 className="font-bold text-slate-900">Create Disaster Alert</h2>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Title</label>
                <input type="text" required value={form.title} onChange={e => setForm({...form, title: e.target.value})}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Disaster Type</label>
                <select value={form.disaster_type} onChange={e => setForm({...form, disaster_type: e.target.value})}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-white">
                  {DISASTER_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Scope</label>
                <select value={form.scope_level} onChange={e => setForm({...form, scope_level: e.target.value})}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-white">
                  <option value="STATE">Statewide (Odisha)</option>
                  <option value="DISTRICT">District Level</option>
                  <option value="CITY">City Level</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Expires At (optional)</label>
                <input type="datetime-local" value={form.expires_at} onChange={e => setForm({...form, expires_at: e.target.value})}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Description / Instructions</label>
              <textarea required rows={4} value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                placeholder="Describe the situation and any public safety instructions..."
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 resize-none" />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700">
                Publish Alert
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-200">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Alerts List */}
      <div className="space-y-3">
        {loading ? (
          [...Array(3)].map((_, i) => <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />)
        ) : alerts.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-400">
            <AlertTriangle className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p>No disaster alerts found.</p>
          </div>
        ) : (
          alerts.map(alert => (
            <div key={alert.id} className="bg-white rounded-xl border border-red-200 border-l-4 border-l-red-500 p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-slate-800">{alert.title}</h3>
                  <p className="text-sm text-slate-600 mt-1 line-clamp-2">{alert.message}</p>
                  <p className="text-xs text-slate-400 mt-2">
                    Posted {new Date(alert.created_at).toLocaleString()}
                    {alert.expires_at && ` · Expires ${new Date(alert.expires_at).toLocaleString()}`}
                  </p>
                </div>
                <span className="text-xs font-semibold px-2 py-1 rounded-full bg-red-100 text-red-700 shrink-0">
                  {alert.scope_display || alert.scope_level}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
