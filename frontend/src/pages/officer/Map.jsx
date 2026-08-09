import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent } from '../../components/ui/Card';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { AlertTriangle, Clock, Activity, MapPin } from 'lucide-react';

// Fix for default marker icons in Leaflet with React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom Icons
const createIcon = (color) => {
  return new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });
};

const ICONS = {
  complaint_pending: createIcon('orange'),
  complaint_active: createIcon('blue'),
  incident: createIcon('red'),
  sensor_normal: createIcon('green'),
  sensor_warning: createIcon('yellow'),
  sensor_critical: createIcon('violet'),
};

// Component to recenter map
function MapUpdater({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center && center.length === 2) {
      map.setView(center, map.getZoom());
    }
  }, [center, map]);
  return null;
}

export default function OfficerMap() {
  const { user } = useAuth();
  const [mapData, setMapData] = useState({ complaints: [], incidents: [], sensors: [] });
  const [loading, setLoading] = useState(true);
  const [center, setCenter] = useState([20.2961, 85.8245]); // Default Bhubaneswar

  useEffect(() => {
    const fetchMapData = async () => {
      try {
        const res = await api.get('/dashboard/map/'); // officer map data view
        setMapData(res.data.data);
        
        // Find center based on first item
        const allItems = [...res.data.data.complaints, ...res.data.data.incidents, ...res.data.data.sensors];
        if (allItems.length > 0) {
          setCenter([allItems[0].lat, allItems[0].lng]);
        } else if (user?.profile?.city_lat) {
          setCenter([parseFloat(user.profile.city_lat), parseFloat(user.profile.city_lng)]);
        }
      } catch (err) {
        console.error('Failed to load map data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMapData();
  }, [user]);

  if (loading) {
    return <div className="h-[calc(100vh-120px)] flex items-center justify-center">Loading Operations Map...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-end">
        <div>
           <h1 className="text-2xl font-bold text-slate-900">Operations Map</h1>
           <p className="text-sm text-slate-500">{user?.department?.name} Live Overview</p>
        </div>
        <div className="flex gap-4">
           <div className="flex items-center gap-1.5 text-xs text-slate-600">
             <img src={ICONS.complaint_pending.options.iconUrl} className="h-4" alt="Pending" /> Pending Complaints
           </div>
           <div className="flex items-center gap-1.5 text-xs text-slate-600">
             <img src={ICONS.complaint_active.options.iconUrl} className="h-4" alt="Active" /> Active Work
           </div>
           {mapData.incidents.length > 0 && (
             <div className="flex items-center gap-1.5 text-xs text-slate-600">
               <img src={ICONS.incident.options.iconUrl} className="h-4" alt="Incident" /> Critical Incident
             </div>
           )}
           {mapData.sensors.length > 0 && (
             <div className="flex items-center gap-1.5 text-xs text-slate-600">
               <img src={ICONS.sensor_warning.options.iconUrl} className="h-4" alt="Sensor" /> IoT Sensor
             </div>
           )}
        </div>
      </div>

      <Card className="h-[calc(100vh-160px)] min-h-[600px] border-slate-200 overflow-hidden relative">
        <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap contributors'
          />
          <MapUpdater center={center} />

          {/* Render Complaints */}
          {mapData.complaints?.map(c => (
             <Marker 
                key={`c-${c.id}`} 
                position={[c.lat, c.lng]} 
                icon={c.status === 'PENDING' ? ICONS.complaint_pending : ICONS.complaint_active}
             >
               <Popup className="custom-popup">
                 <div className="p-1 min-w-[200px]">
                    <div className="font-bold text-sm mb-1">{c.title}</div>
                    <div className="text-xs text-slate-500 mb-2">Ref: #{c.reference}</div>
                    <div className="flex gap-2">
                       <StatusBadge status={c.status} />
                       <StatusBadge status={c.priority} />
                    </div>
                    <a href={`/officer/complaints/${c.id}`} className="block mt-3 text-center text-xs font-semibold text-blue-600 bg-blue-50 py-1.5 rounded w-full">View Details</a>
                 </div>
               </Popup>
             </Marker>
          ))}

          {/* Render Incidents */}
          {mapData.incidents?.map(i => (
             <Marker key={`i-${i.id}`} position={[i.lat, i.lng]} icon={ICONS.incident}>
               <Popup>
                 <div className="p-1 min-w-[200px]">
                    <div className="font-bold text-sm text-red-600 flex items-center gap-1 mb-1">
                      <AlertTriangle className="w-4 h-4" /> {i.type}
                    </div>
                    <div className="text-xs text-slate-500 mb-2">Severity: {i.severity}</div>
                    <StatusBadge status={i.status} />
                 </div>
               </Popup>
             </Marker>
          ))}

          {/* Render Sensors */}
          {mapData.sensors?.map(s => {
             let icon = ICONS.sensor_normal;
             if (s.type === 'WASTE_BIN') {
                 if (s.fill > 90) icon = ICONS.sensor_critical;
                 else if (s.fill > 70) icon = ICONS.sensor_warning;
             }
             return (
               <Marker key={`s-${s.id}`} position={[s.lat, s.lng]} icon={icon}>
                 <Popup>
                   <div className="p-1 min-w-[150px]">
                      <div className="font-bold text-sm mb-1">{s.type.replace('_', ' ')}</div>
                      {s.type === 'WASTE_BIN' && (
                         <div className="text-xs font-semibold mt-2 bg-slate-100 p-1.5 rounded flex justify-between">
                            Fill Level: <span className={s.fill > 90 ? 'text-red-600' : ''}>{s.fill}%</span>
                         </div>
                      )}
                   </div>
                 </Popup>
               </Marker>
             );
          })}
        </MapContainer>
      </Card>
    </div>
  );
}
