import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Bus, MapPin, Clock, Route, ChevronRight } from 'lucide-react';

function BusStatusBadge({ status }) {
  const map = {
    ACTIVE: 'bg-green-100 text-green-700',
    DELAYED: 'bg-yellow-100 text-yellow-700',
    OUT_OF_SERVICE: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${map[status] || 'bg-slate-100 text-slate-600'}`}>
      {status?.replace('_', ' ')}
    </span>
  );
}

export default function PublicTransport() {
  const [routes, setRoutes] = useState([]);
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoute, setSelectedRoute] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [rRes, bRes] = await Promise.allSettled([
          api.get('/transport/routes/'),
          api.get('/transport/buses/'),
        ]);
        if (rRes.status === 'fulfilled') {
          const data = rRes.value.data?.results || rRes.value.data || [];
          setRoutes(data);
          if (data.length > 0) setSelectedRoute(data[0]);
        }
        if (bRes.status === 'fulfilled') {
          setBuses(bRes.value.data?.results || bRes.value.data || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const routeBuses = buses.filter(b => b.route === selectedRoute?.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">🚌 Public Transport</h1>
        <p className="text-slate-500 mt-1">Bus routes, live tracking, and estimated arrival times.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Route List */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900">All Routes</h3>
          </div>
          <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
            {loading ? (
              [...Array(4)].map((_, i) => <div key={i} className="p-4 animate-pulse h-16 bg-slate-50" />)
            ) : routes.length > 0 ? routes.map(r => (
              <button
                key={r.id}
                onClick={() => setSelectedRoute(r)}
                className={`w-full text-left p-4 flex items-center gap-3 hover:bg-slate-50 transition-colors ${selectedRoute?.id === r.id ? 'bg-primary-50 border-l-4 border-primary-500' : ''}`}
              >
                <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
                  <span className="font-bold text-primary-700 text-sm">{r.route_number}</span>
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-slate-900 text-sm truncate">{r.name}</p>
                  <p className="text-xs text-slate-500 truncate">{r.origin} → {r.destination}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 ml-auto shrink-0" />
              </button>
            )) : (
              <div className="p-8 text-center text-slate-400 text-sm">No routes available.</div>
            )}
          </div>
        </div>

        {/* Route Details */}
        <div className="lg:col-span-2 space-y-4">
          {selectedRoute ? (
            <>
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="bg-primary-600 text-white text-sm font-bold px-2 py-0.5 rounded">Route {selectedRoute.route_number}</span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">{selectedRoute.name}</h3>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600 mb-3">
                  <MapPin className="w-4 h-4 text-green-500" /> <span className="font-medium">{selectedRoute.origin}</span>
                  <div className="flex-1 border-t border-dashed border-slate-300 mx-2" />
                  <MapPin className="w-4 h-4 text-red-500" /> <span className="font-medium">{selectedRoute.destination}</span>
                </div>
                {selectedRoute.stops && (
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-2">Stops</p>
                    <div className="flex flex-wrap gap-2">
                      {(typeof selectedRoute.stops === 'string' ? selectedRoute.stops.split(',') : selectedRoute.stops).map((stop, i) => (
                        <span key={i} className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs">{stop.trim()}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Buses on this route */}
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100">
                  <h3 className="font-semibold text-slate-900">Buses on Route {selectedRoute.route_number}</h3>
                </div>
                <div className="divide-y divide-slate-100">
                  {routeBuses.length > 0 ? routeBuses.map(bus => (
                    <div key={bus.id} className="p-4 flex items-center gap-4">
                      <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                        <Bus className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-slate-900 text-sm">{bus.bus_number}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Current: {bus.current_stop || 'In Transit'} · Next: {bus.next_stop || '—'}
                        </p>
                      </div>
                      <div className="text-right">
                        <BusStatusBadge status={bus.status} />
                        {bus.eta_minutes && (
                          <p className="text-xs text-slate-400 mt-1 flex items-center gap-1 justify-end">
                            <Clock className="w-3 h-3" /> ETA {bus.eta_minutes} min
                          </p>
                        )}
                      </div>
                    </div>
                  )) : (
                    <div className="p-8 text-center text-slate-400 text-sm">No buses assigned to this route yet.</div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl p-16 text-center shadow-sm">
              <Bus className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">Select a route to view details.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
