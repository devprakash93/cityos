import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { CityMap } from '../../components/maps/CityMap';
import { TrafficCone, AlertTriangle, Clock } from 'lucide-react';

const SEVERITY_CONFIG = {
  LOW: { label: 'Low', color: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
  MODERATE: { label: 'Moderate', color: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500' },
  HIGH: { label: 'High', color: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500' },
  SEVERE: { label: 'Severe', color: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
};

export default function Traffic() {
  const [zones, setZones] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [zRes, iRes] = await Promise.allSettled([
          api.get('/traffic/zones/'),
          api.get('/traffic/incidents/'),
        ]);
        if (zRes.status === 'fulfilled') {
          setZones(zRes.value.data?.results || zRes.value.data || []);
        }
        if (iRes.status === 'fulfilled') {
          setIncidents(iRes.value.data?.results || iRes.value.data || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Build map markers from incidents
  const markers = incidents
    .filter(i => i.location_lat && i.location_lng)
    .map(i => ({
      lat: parseFloat(i.location_lat),
      lng: parseFloat(i.location_lng),
      type: 'TRAFFIC',
      title: i.incident_type || 'Traffic Incident',
      description: i.description || 'No details',
    }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">🚦 Traffic Monitoring</h1>
        <p className="text-slate-500 mt-1">Live traffic status across all city zones and roads.</p>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(SEVERITY_CONFIG).map(([key, { label, dot }]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded-full ${dot}`} />
            <span className="text-sm text-slate-600">{label}</span>
          </div>
        ))}
      </div>

      {/* Map */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900">Live Traffic Map</h3>
        </div>
        <div className="relative z-0">
          <CityMap markers={markers} height="400px" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Traffic Zones */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <TrafficCone className="w-4 h-4 text-orange-500" /> Traffic Zones
            </h3>
          </div>
          <div className="divide-y divide-slate-100">
            {loading ? (
              [...Array(4)].map((_, i) => (
                <div key={i} className="p-4 animate-pulse">
                  <div className="h-4 bg-slate-100 rounded w-2/3 mb-1" />
                  <div className="h-3 bg-slate-50 rounded w-1/2" />
                </div>
              ))
            ) : zones.length > 0 ? zones.map(zone => {
              const config = SEVERITY_CONFIG[zone.congestion_level] || SEVERITY_CONFIG.LOW;
              return (
                <div key={zone.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-900 text-sm">{zone.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{zone.road_name || 'City Road'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${config.dot}`} />
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${config.color}`}>{config.label}</span>
                  </div>
                </div>
              );
            }) : (
              <div className="p-8 text-center text-slate-400 text-sm">No traffic zone data available.</div>
            )}
          </div>
        </div>

        {/* Active Incidents */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" /> Active Incidents
            </h3>
          </div>
          <div className="divide-y divide-slate-100">
            {loading ? (
              [...Array(3)].map((_, i) => (
                <div key={i} className="p-4 animate-pulse">
                  <div className="h-4 bg-slate-100 rounded w-3/4 mb-1" />
                  <div className="h-3 bg-slate-50 rounded w-1/2" />
                </div>
              ))
            ) : incidents.length > 0 ? incidents.slice(0, 8).map(inc => (
              <div key={inc.id} className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 text-sm">{inc.incident_type || 'Incident'}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{inc.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span className="text-xs text-slate-400">{new Date(inc.reported_at).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            )) : (
              <div className="p-8 text-center text-slate-400 text-sm">🟢 No active incidents. Roads are clear.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
