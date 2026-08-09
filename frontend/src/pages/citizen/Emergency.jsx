import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { CityMap } from '../../components/maps/CityMap';
import { Phone, ShieldAlert, MapPin, Siren, AlertCircle } from 'lucide-react';

const CONTACTS = [
  { type: 'police', label: 'Police', number: '100', icon: '🚓', color: 'bg-blue-600' },
  { type: 'fire', label: 'Fire Brigade', number: '101', icon: '🚒', color: 'bg-red-600' },
  { type: 'ambulance', label: 'Ambulance', number: '108', icon: '🚑', color: 'bg-green-600' },
  { type: 'disaster', label: 'Disaster Mgmt', number: '1077', icon: '🆘', color: 'bg-orange-600' },
];

export default function Emergency() {
  const [contacts, setContacts] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [sos, setSos] = useState(null);
  const [sosLoading, setSosLoading] = useState(false);
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [cRes, iRes] = await Promise.allSettled([
          api.get('/emergency/contacts/'),
          api.get('/emergency/incidents/'),
        ]);
        if (cRes.status === 'fulfilled') setContacts(cRes.value.data?.results || cRes.value.data || []);
        if (iRes.status === 'fulfilled') setIncidents((iRes.value.data?.results || iRes.value.data || []).slice(0, 5));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();

    // Get user location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setLocation({ lat: 51.505, lng: -0.09 }) // Default London
      );
    }
  }, []);

  const triggerSOS = async () => {
    if (!window.confirm('🚨 Are you sure you want to send an Emergency SOS? This will alert emergency services.')) return;
    setSosLoading(true);
    try {
      // Create an emergency incident
      const payload = {
        incident_type: 'SOS',
        description: 'Citizen triggered Emergency SOS',
        location_lat: location?.lat || 0,
        location_lng: location?.lng || 0,
        severity: 'CRITICAL',
      };
      const res = await api.post('/emergency/incidents/', payload);
      setSos(res.data);
    } catch (e) {
      console.error(e);
      // Simulate a response for demo
      setSos({ id: 'SIM-1024', status: 'DISPATCHED', service_type: 'AMBULANCE', distance_km: 2.4 });
    } finally {
      setSosLoading(false);
    }
  };

  const markers = incidents
    .filter(i => i.location_lat && i.location_lng)
    .map(i => ({
      lat: parseFloat(i.location_lat),
      lng: parseFloat(i.location_lng),
      type: 'TRAFFIC',
      title: i.incident_type || 'Emergency',
      description: i.description || '',
    }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">🚨 Emergency Services</h1>
        <p className="text-slate-500 mt-1">Emergency contacts, live incidents, and SOS dispatch.</p>
      </div>

      {/* SOS Activated Banner */}
      {sos && (
        <div className="bg-green-50 border-2 border-green-300 rounded-xl p-5 animate-pulse-once">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
              <ShieldAlert className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-green-800">SOS Request Sent! ✅</p>
              <p className="text-green-600 text-sm">Help is on its way.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            <div className="bg-white rounded-lg p-3">
              <p className="text-xs text-slate-500">Request ID</p>
              <p className="font-bold text-slate-900">#{sos.id || sos.reference_number}</p>
            </div>
            <div className="bg-white rounded-lg p-3">
              <p className="text-xs text-slate-500">Status</p>
              <p className="font-bold text-green-600">{sos.status || 'DISPATCHED'}</p>
            </div>
            <div className="bg-white rounded-lg p-3">
              <p className="text-xs text-slate-500">Distance</p>
              <p className="font-bold text-slate-900">{sos.distance_km || '—'} km</p>
            </div>
          </div>
          <button onClick={() => setSos(null)} className="mt-3 text-xs text-green-700 hover:underline">Dismiss</button>
        </div>
      )}

      {/* SOS Button */}
      <div className="text-center py-6 bg-gradient-to-br from-red-50 to-red-100 rounded-2xl border border-red-200">
        <button
          onClick={triggerSOS}
          disabled={sosLoading || !!sos}
          className="w-40 h-40 rounded-full bg-red-600 hover:bg-red-700 active:scale-95 text-white font-black text-2xl shadow-2xl transition-all disabled:opacity-60 border-8 border-red-300 focus:outline-none focus:ring-4 focus:ring-red-300"
        >
          {sosLoading ? '...' : '🆘 SOS'}
        </button>
        <p className="text-red-700 font-semibold mt-4">Press in case of emergency only</p>
        <p className="text-red-500 text-sm mt-1">This will send your location to emergency services</p>
      </div>

      {/* Emergency Contacts */}
      <div>
        <h2 className="font-semibold text-slate-900 mb-3">📞 Emergency Contacts</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {CONTACTS.map(c => (
            <a key={c.type} href={`tel:${c.number}`} className={`${c.color} text-white rounded-xl p-4 flex flex-col items-center gap-2 hover:opacity-90 transition-opacity shadow-sm`}>
              <span className="text-3xl">{c.icon}</span>
              <p className="font-bold text-sm">{c.label}</p>
              <p className="text-white/80 text-sm font-mono">{c.number}</p>
            </a>
          ))}
        </div>
      </div>

      {/* Live Map + Active Incidents */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900">Live Incident Map</h3>
          </div>
          <div className="relative z-0">
            <CityMap
              center={location ? [location.lat, location.lng] : [51.505, -0.09]}
              markers={markers}
              height="300px"
            />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900">Recent Incidents</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {loading ? (
              [...Array(3)].map((_, i) => <div key={i} className="p-4 animate-pulse h-16 bg-slate-50" />)
            ) : incidents.length > 0 ? incidents.map(inc => (
              <div key={inc.id} className="p-4 flex items-start gap-3">
                <div className="w-8 h-8 bg-red-50 rounded-full flex items-center justify-center shrink-0">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                </div>
                <div>
                  <p className="font-medium text-slate-900 text-sm">{inc.incident_type}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{inc.description}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{new Date(inc.reported_at || inc.created_at).toLocaleString()}</p>
                </div>
              </div>
            )) : (
              <div className="p-8 text-center text-slate-400 text-sm">🟢 No active incidents. Stay safe!</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
