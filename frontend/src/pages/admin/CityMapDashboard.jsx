import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { CityMap } from '../../components/maps/CityMap';
import api from '../../api/axios';
import { useCity } from '../../context/CityContext';

export default function CityMapDashboard() {
  const { selectedCity } = useCity();
  const [markers, setMarkers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchSensorData = async () => {
    try {
      // Mock fetching from various IoT endpoints
      // In a full implementation, you would call /api/traffic/cameras/ and map them
      // We will generate some mock pins around Bhubaneswar for demonstration
      
      const mockMarkers = [
        { lat: 20.2961, lng: 85.8245, type: 'TRAFFIC', title: 'Traffic Cam 01', description: 'Heavy congestion detected.' },
        { lat: 20.301, lng: 85.815, type: 'WASTE', title: 'Smart Bin A', description: 'Fill level: 85%' },
        { lat: 20.285, lng: 85.830, type: 'WATER', title: 'Water Quality Sensor', description: 'pH: 7.2, Safe' },
      ];
      setMarkers(mockMarkers);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSensorData();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Live City Map</h1>
        <p className="text-slate-400 mt-1">Geographic overview of IoT sensors and incidents for {selectedCity?.name || 'Odisha'}.</p>
      </div>

      <Card className="glass-dark border-slate-700">
        <CardHeader>
          <CardTitle>Map View</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full relative z-0">
            {loading ? (
              <div className="h-[600px] bg-slate-800/50 animate-pulse rounded-lg flex items-center justify-center text-slate-400">
                Loading map data...
              </div>
            ) : (
              <div className="rounded-lg overflow-hidden border border-slate-700">
                <CityMap 
                  center={selectedCity ? [selectedCity.center_lat || 20.2961, selectedCity.center_lng || 85.8245] : [20.2961, 85.8245]} 
                  markers={markers} 
                  height="600px" 
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
