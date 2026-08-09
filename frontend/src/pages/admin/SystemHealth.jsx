import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Heart, CheckCircle, AlertTriangle, XCircle, RefreshCw, Database, Server, Cpu, HardDrive } from 'lucide-react';

function HealthRow({ label, icon: Icon, status, detail }) {
  const isGreen = status?.includes('🟢') || status?.includes('Healthy') || status?.includes('Connected') || status?.includes('Available') || status?.includes('Running');
  const isYellow = status?.includes('🟡') || status?.includes('Idle') || status?.includes('Near Full') || status?.includes('Warning');
  
  const color = isGreen ? 'text-green-600 bg-green-50' : isYellow ? 'text-yellow-600 bg-yellow-50' : 'text-red-600 bg-red-50';
  const dot = isGreen ? 'bg-green-500' : isYellow ? 'bg-yellow-500' : 'bg-red-500';
  const StatusIcon = isGreen ? CheckCircle : isYellow ? AlertTriangle : XCircle;

  return (
    <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-800">{label}</p>
          {detail && <p className="text-xs text-slate-400 mt-0.5">{detail}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${dot} animate-pulse`} />
        <span className={`text-sm font-semibold ${isGreen ? 'text-green-700' : isYellow ? 'text-yellow-700' : 'text-red-700'}`}>
          {status?.replace(/🟢|🟡|🔴/g, '').trim() || 'Unknown'}
        </span>
      </div>
    </div>
  );
}

export default function SystemHealth() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState(null);

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const res = await api.get('/analytics/system/health/');
      setHealth(res.data);
      setLastChecked(new Date());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchHealth(); }, []);

  const rows = health ? [
    { label: 'Django API', icon: Server, status: health.django_api, detail: 'REST API backend' },
    { label: 'MySQL Database', icon: Database, status: health.mysql, detail: 'Primary database' },
    { label: 'Storage', icon: HardDrive, status: health.storage, detail: 'File system' },
    { label: 'IoT Simulator', icon: Cpu, status: health.iot_simulator, detail: 'Demo engine' },
  ] : [];

  const allHealthy = rows.every(r => r.status?.includes('🟢') || r.status?.includes('Healthy') || r.status?.includes('Connected'));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">System Health</h1>
          {lastChecked && <p className="text-sm text-slate-400 mt-0.5">Last checked: {lastChecked.toLocaleTimeString()}</p>}
        </div>
        <button onClick={fetchHealth} className="flex items-center gap-2 px-4 py-2 border border-slate-200 bg-white rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 shadow-sm">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Check Now
        </button>
      </div>

      {/* Overall status banner */}
      {!loading && health && (
        <div className={`flex items-center gap-3 p-4 rounded-xl border ${allHealthy ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
          <Heart className={`w-5 h-5 ${allHealthy ? 'text-green-600' : 'text-yellow-600'}`} />
          <div>
            <p className={`text-sm font-bold ${allHealthy ? 'text-green-700' : 'text-yellow-700'}`}>
              {allHealthy ? 'All systems operational' : 'Some systems need attention'}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">Odisha CityOS infrastructure status</p>
          </div>
        </div>
      )}

      {/* Health rows */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />
          ))
        ) : (
          rows.map(row => <HealthRow key={row.label} {...row} />)
        )}
      </div>

      {/* Resource usage */}
      {health && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wide">Resource Usage</h2>
          <div className="grid grid-cols-2 gap-6">
            {[
              { label: 'CPU Usage', value: health.cpu_usage },
              { label: 'Memory Usage', value: health.memory_usage },
            ].map(item => {
              const pct = parseInt(item.value) || 0;
              const color = pct > 80 ? 'bg-red-500' : pct > 60 ? 'bg-yellow-500' : 'bg-green-500';
              return (
                <div key={item.label}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-slate-600 font-medium">{item.label}</span>
                    <span className={`font-bold ${pct > 80 ? 'text-red-600' : pct > 60 ? 'text-yellow-600' : 'text-green-600'}`}>
                      {item.value}
                    </span>
                  </div>
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.min(100, pct)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
