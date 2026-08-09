import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import api from '../../api/axios';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { useNavigate } from 'react-router-dom';

// Fix for default leaflet icons in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function WorkerMap() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  // Bhubaneswar roughly
  const [center] = useState([20.2961, 85.8245]);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const response = await api.get('/complaints/worker/tasks/');
        if (response.data?.results) {
          // Filter out tasks without coordinates or completed/closed tasks
          const activeMapTasks = response.data.results.filter(
             t => t.location_lat && t.location_lng && !['RESOLVED', 'CLOSED'].includes(t.status)
          );
          setTasks(activeMapTasks);
        }
      } catch (error) {
        console.error("Error fetching map tasks:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchTasks();
  }, []);

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col space-y-4">
      <div>
         <h1 className="text-2xl font-bold text-slate-900">My Operations Map</h1>
         <p className="text-sm text-slate-500 mt-1">Live view of your assigned tasks</p>
      </div>
      
      <div className="flex-1 rounded-xl overflow-hidden border border-slate-200 shadow-sm relative">
        {loading && (
          <div className="absolute inset-0 z-50 bg-white/50 backdrop-blur-sm flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
          </div>
        )}
        <MapContainer center={center} zoom={12} className="h-full w-full">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {tasks.map(task => (
            <Marker 
              key={task.id} 
              position={[task.location_lat, task.location_lng]}
            >
              <Popup>
                <div className="p-1 min-w-[200px]">
                  <div className="flex justify-between items-start mb-2 gap-2">
                     <span className="font-bold text-slate-900 text-sm">#{task.reference_number}</span>
                     <StatusBadge status={task.priority} />
                  </div>
                  <p className="text-sm font-medium text-slate-800 mb-1 line-clamp-2">{task.title}</p>
                  <div className="text-xs text-slate-500 mb-3">{task.address}</div>
                  
                  <div className="flex gap-2">
                     <Button 
                        size="sm" 
                        className="flex-1 bg-amber-600 hover:bg-amber-700 text-white text-xs h-8"
                        onClick={() => navigate(`/worker/tasks/${task.id}`)}
                     >
                        Open Task
                     </Button>
                     <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1 text-xs h-8"
                        onClick={() => window.open(`https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=current%3B${task.location_lat}%2C${task.location_lng}`, '_blank')}
                     >
                        Navigate
                     </Button>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
