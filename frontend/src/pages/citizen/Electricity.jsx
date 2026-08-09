import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Zap, AlertTriangle, Clock, CheckCircle } from 'lucide-react';

function StatusBadge({ status }) {
  const map = {
    STABLE: 'bg-green-100 text-green-700',
    OUTAGE: 'bg-red-100 text-red-700',
    MAINTENANCE: 'bg-orange-100 text-orange-700',
    PARTIAL: 'bg-yellow-100 text-yellow-700',
  };
  return (
    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${map[status] || 'bg-slate-100 text-slate-600'}`}>
      {status}
    </span>
  );
}

export default function Electricity() {
  const [zones, setZones] = useState([]);
  const [outages, setOutages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [zRes, oRes] = await Promise.allSettled([
          api.get('/electricity/zones/'),
          api.get('/electricity/outages/'),
        ]);
        if (zRes.status === 'fulfilled') setZones(zRes.value.data?.results || zRes.value.data || []);
        if (oRes.status === 'fulfilled') setOutages(oRes.value.data?.results || oRes.value.data || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const activeOutages = outages.filter(o => o.status !== 'RESTORED');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">⚡ Electricity Status</h1>
        <p className="text-slate-500 mt-1">Power grid zones, active outages, and restoration estimates.</p>
      </div>

      {/* Active Outages Banner */}
      {activeOutages.length > 0 ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <h3 className="font-semibold text-red-800">{activeOutages.length} Active Outage{activeOutages.length > 1 ? 's' : ''}</h3>
          </div>
          <div className="space-y-3">
            {activeOutages.map(o => (
              <div key={o.id} className="bg-white border border-red-200 rounded-lg p-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">⚡ Power Outage</p>
                    <p className="text-xs text-slate-500 mt-0.5">Zone: {o.zone_name || o.affected_area}</p>
                    {o.reason && <p className="text-xs text-slate-600 mt-1">Reason: {o.reason}</p>}
                  </div>
                  <div className="text-right text-xs text-slate-500">
                    {o.estimated_restoration && (
                      <p className="flex items-center gap-1"><Clock className="w-3 h-3" /> ETA: {new Date(o.estimated_restoration).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle className="w-6 h-6 text-green-600" />
          <div>
            <p className="font-semibold text-green-800">All Power Systems Operational</p>
            <p className="text-green-700 text-sm">No active outages reported.</p>
          </div>
        </div>
      )}

      {/* Grid Zones */}
      <div>
        <h2 className="font-semibold text-slate-800 mb-3">Grid Zones</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            [...Array(4)].map((_, i) => <div key={i} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm animate-pulse h-32" />)
          ) : zones.length > 0 ? zones.map(zone => (
            <div key={zone.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-2">
                <div className="w-9 h-9 bg-yellow-50 rounded-lg flex items-center justify-center">
                  <Zap className="w-5 h-5 text-yellow-600" />
                </div>
                <StatusBadge status={zone.status} />
              </div>
              <h4 className="font-bold text-slate-900 mt-2">{zone.name}</h4>
              <p className="text-xs text-slate-500">{zone.area_covered || 'City Zone'}</p>
              {zone.current_load !== undefined && (
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>Load</span>
                    <span>{zone.current_load}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full ${zone.current_load > 80 ? 'bg-red-500' : zone.current_load > 60 ? 'bg-yellow-400' : 'bg-green-500'}`}
                      style={{ width: `${zone.current_load}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )) : (
            <div className="col-span-full p-12 bg-white border border-slate-200 rounded-xl text-center">
              <Zap className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No grid zone data available.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
