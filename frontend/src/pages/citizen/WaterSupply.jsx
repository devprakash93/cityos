import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Droplets, AlertTriangle, Clock, CheckCircle } from 'lucide-react';

function StatusBadge({ status }) {
  const map = {
    NORMAL: 'bg-green-100 text-green-700',
    LOW: 'bg-yellow-100 text-yellow-700',
    CRITICAL: 'bg-red-100 text-red-700',
    MAINTENANCE: 'bg-orange-100 text-orange-700',
  };
  return (
    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${map[status] || 'bg-slate-100 text-slate-600'}`}>
      {status}
    </span>
  );
}

export default function WaterSupply() {
  const [sources, setSources] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sRes, aRes] = await Promise.allSettled([
          api.get('/water/sources/'),
          api.get('/water/alerts/'),
        ]);
        if (sRes.status === 'fulfilled') {
          setSources(sRes.value.data?.results || sRes.value.data || []);
        }
        if (aRes.status === 'fulfilled') {
          setAlerts(aRes.value.data?.results || aRes.value.data || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">💧 Water Supply</h1>
        <p className="text-slate-500 mt-1">Live water supply status, tank levels, and maintenance alerts.</p>
      </div>

      {/* Active Alerts */}
      {alerts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <h3 className="font-semibold text-red-800">Active Water Alerts</h3>
          </div>
          {alerts.map(a => (
            <div key={a.id} className="flex items-start gap-2 mt-2">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-800">{a.alert_type}</p>
                <p className="text-xs text-red-600">{a.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Water Sources Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm animate-pulse h-48" />
          ))
        ) : sources.length > 0 ? sources.map(source => (
          <div key={source.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                <Droplets className="w-5 h-5 text-blue-600" />
              </div>
              <StatusBadge status={source.status} />
            </div>
            <h4 className="font-bold text-slate-900">{source.name}</h4>
            <p className="text-xs text-slate-500 mt-0.5">{source.area_name || 'General Area'}</p>

            <div className="mt-4 space-y-2">
              {source.tank_level !== undefined && (
                <div>
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>Tank Level</span>
                    <span className="font-medium text-slate-700">{source.tank_level}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${source.tank_level > 60 ? 'bg-blue-500' : source.tank_level > 30 ? 'bg-yellow-400' : 'bg-red-500'}`}
                      style={{ width: `${source.tank_level}%` }}
                    />
                  </div>
                </div>
              )}
              {source.next_supply_time && (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Next Supply: <span className="font-medium text-slate-700">{source.next_supply_time}</span></span>
                </div>
              )}
              {source.pressure && (
                <p className="text-xs text-slate-500">Pressure: <span className="font-medium text-slate-700">{source.pressure} psi</span></p>
              )}
            </div>
          </div>
        )) : (
          <div className="col-span-full p-12 bg-white border border-slate-200 rounded-xl text-center">
            <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
            <p className="text-slate-600 font-medium">All water systems are operational</p>
            <p className="text-slate-400 text-sm mt-1">No stations are currently registered.</p>
          </div>
        )}
      </div>
    </div>
  );
}
