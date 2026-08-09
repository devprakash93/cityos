import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Trash2, Calendar, MapPin, CheckCircle, Clock } from 'lucide-react';

function StatusBadge({ status }) {
  const map = {
    SCHEDULED: 'bg-blue-100 text-blue-700',
    COMPLETED: 'bg-green-100 text-green-700',
    SKIPPED: 'bg-red-100 text-red-700',
    IN_PROGRESS: 'bg-orange-100 text-orange-700',
  };
  return (
    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${map[status] || 'bg-slate-100 text-slate-600'}`}>
      {status?.replace('_', ' ')}
    </span>
  );
}

export default function WasteManagement() {
  const [bins, setBins] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [bRes, rRes, lRes] = await Promise.allSettled([
          api.get('/waste/bins/'),
          api.get('/waste/routes/'),
          api.get('/waste/logs/'),
        ]);
        if (bRes.status === 'fulfilled') setBins(bRes.value.data?.results || bRes.value.data || []);
        if (rRes.status === 'fulfilled') setRoutes(rRes.value.data?.results || rRes.value.data || []);
        if (lRes.status === 'fulfilled') setLogs((lRes.value.data?.results || lRes.value.data || []).slice(0, 6));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const fullBins = bins.filter(b => b.fill_level >= 75);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">🗑️ Waste Management</h1>
        <p className="text-slate-500 mt-1">Garbage collection schedules, bin status, and routes.</p>
      </div>

      {/* Alert for full bins */}
      {fullBins.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <p className="text-orange-800 font-semibold text-sm">⚠️ {fullBins.length} waste bin{fullBins.length > 1 ? 's are' : ' is'} nearly full and needs collection.</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Smart Bins */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900">Smart Waste Bins</h3>
          </div>
          <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
            {loading ? (
              [...Array(3)].map((_, i) => <div key={i} className="p-4 animate-pulse h-16 bg-slate-50" />)
            ) : bins.length > 0 ? bins.map(bin => (
              <div key={bin.id} className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center shrink-0">
                  <Trash2 className={`w-5 h-5 ${bin.fill_level >= 75 ? 'text-red-500' : 'text-slate-500'}`} />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-slate-900 text-sm">{bin.bin_id || `Bin #${bin.id}`}</p>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3" /> {bin.location_name || bin.address || 'Unknown location'}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold ${bin.fill_level >= 75 ? 'text-red-600' : bin.fill_level >= 50 ? 'text-yellow-600' : 'text-green-600'}`}>{bin.fill_level}%</p>
                  <div className="w-20 bg-slate-100 rounded-full h-1.5 mt-1">
                    <div
                      className={`h-1.5 rounded-full ${bin.fill_level >= 75 ? 'bg-red-500' : bin.fill_level >= 50 ? 'bg-yellow-400' : 'bg-green-500'}`}
                      style={{ width: `${bin.fill_level}%` }}
                    />
                  </div>
                </div>
              </div>
            )) : (
              <div className="p-8 text-center text-slate-400 text-sm">No bin data available.</div>
            )}
          </div>
        </div>

        {/* Collection Routes */}
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900">Collection Routes</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {loading ? (
                [...Array(2)].map((_, i) => <div key={i} className="p-4 animate-pulse h-16 bg-slate-50" />)
              ) : routes.length > 0 ? routes.slice(0, 4).map(r => (
                <div key={r.id} className="p-4 flex items-start gap-3">
                  <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center shrink-0">
                    <Calendar className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 text-sm">{r.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{r.area_covered}</p>
                    {r.schedule && <p className="text-xs text-primary-600 mt-0.5">{r.schedule}</p>}
                  </div>
                </div>
              )) : (
                <div className="p-8 text-center text-slate-400 text-sm">No collection routes found.</div>
              )}
            </div>
          </div>

          {/* Recent Collection Logs */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900">Recent Collections</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {loading ? (
                [...Array(3)].map((_, i) => <div key={i} className="p-3 animate-pulse h-12 bg-slate-50" />)
              ) : logs.length > 0 ? logs.map(log => (
                <div key={log.id} className="p-3 flex items-center gap-3">
                  <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700 truncate">{log.route_name || 'Collection'}</p>
                    <p className="text-xs text-slate-400">{new Date(log.collected_at || log.created_at).toLocaleDateString()}</p>
                  </div>
                  <StatusBadge status={log.status} />
                </div>
              )) : (
                <div className="p-6 text-center text-slate-400 text-sm">No recent collection logs.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
