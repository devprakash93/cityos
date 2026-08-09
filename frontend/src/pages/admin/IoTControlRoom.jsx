import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { PlayCircle, StopCircle, Car, Trash2, Droplets, Zap, Bus, Wind, ShieldAlert, Tornado } from 'lucide-react';
import { useCity } from '../../context/CityContext';

export default function IoTControlRoom() {
  const [config, setConfig] = useState(null);
  const { selectedCity } = useCity();

  const fetchConfig = async () => {
    try {
      const res = await api.get('/simulator/demo-mode/');
      setConfig(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const toggleDemoMode = async () => {
    try {
      await api.post('/simulator/demo-mode/', {
        is_enabled: !config.is_enabled
      });
      fetchConfig();
    } catch (err) {
      alert("Error toggling demo mode.");
    }
  };

  const triggerEvent = async (eventType) => {
    if (!selectedCity) {
      alert("Please select a specific city from the top bar first.");
      return;
    }
    try {
      await api.post('/simulator/events/', {
        event_type: eventType,
        city_id: selectedCity.id
      });
      alert(`Event ${eventType} triggered for ${selectedCity.name}`);
    } catch (err) {
      alert("Error triggering event.");
    }
  };

  const events = [
    { type: 'TRAFFIC_ACCIDENT', label: 'Traffic Accident', icon: Car, color: 'bg-orange-500' },
    { type: 'BIN_FULL', label: 'Waste Bin Full', icon: Trash2, color: 'bg-stone-500' },
    { type: 'WATER_LEAKAGE', label: 'Water Leakage', icon: Droplets, color: 'bg-blue-500' },
    { type: 'POWER_OUTAGE', label: 'Power Outage', icon: Zap, color: 'bg-yellow-500' },
    { type: 'BUS_BREAKDOWN', label: 'Bus Breakdown', icon: Bus, color: 'bg-indigo-500' },
    { type: 'AQI_HIGH', label: 'Hazardous AQI', icon: Wind, color: 'bg-teal-500' },
    { type: 'EMERGENCY', label: 'General Emergency', icon: ShieldAlert, color: 'bg-red-500' },
    { type: 'CYCLONE', label: 'Cyclone Alert', icon: Tornado, color: 'bg-rose-600' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-100">IoT Simulator Control Room</h1>

      <Card className="glass-dark border-slate-700">
        <CardHeader>
          <CardTitle>Continuous Demo Engine</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg border border-slate-700">
            <div>
              <h3 className="text-lg font-medium text-white">Engine Status: {config?.is_enabled ? '🟢 RUNNING' : '🔴 STOPPED'}</h3>
              <p className="text-sm text-slate-400 mt-1">
                When enabled, the backend continuously generates simulated sensor data and minor fluctuations.
              </p>
            </div>
            <Button 
              onClick={toggleDemoMode}
              variant={config?.is_enabled ? 'danger' : 'primary'}
              className="w-32"
            >
              {config?.is_enabled ? (
                <><StopCircle className="w-4 h-4 mr-2"/> Stop</>
              ) : (
                <><PlayCircle className="w-4 h-4 mr-2"/> Start</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-dark border-slate-700">
        <CardHeader>
          <CardTitle>Trigger Specific Events</CardTitle>
          <p className="text-sm text-slate-400">Instantly generate a specific critical event in {selectedCity ? selectedCity.name : 'a selected city'}.</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {events.map((evt) => {
              const Icon = evt.icon;
              return (
                <button
                  key={evt.type}
                  onClick={() => triggerEvent(evt.type)}
                  className="flex flex-col items-center justify-center p-6 border border-slate-700 rounded-lg hover:border-slate-500 hover:bg-slate-800 transition-all group"
                >
                  <div className={`p-4 rounded-full ${evt.color} text-white mb-3 shadow-lg group-hover:scale-110 transition-transform`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="font-medium text-slate-200">{evt.label}</span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
