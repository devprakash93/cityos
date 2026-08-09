import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Wind, Thermometer, Droplets, Volume2, TrendingUp } from 'lucide-react';
import { LineChart } from '../../components/ui/LineChart';

function AqiGauge({ value }) {
  let color = 'bg-green-500';
  let label = 'Good';
  let textColor = 'text-green-600';
  if (value > 150) { color = 'bg-red-500'; label = 'Hazardous'; textColor = 'text-red-600'; }
  else if (value > 100) { color = 'bg-orange-500'; label = 'Unhealthy'; textColor = 'text-orange-600'; }
  else if (value > 50) { color = 'bg-yellow-500'; label = 'Moderate'; textColor = 'text-yellow-600'; }

  return (
    <div className="text-center py-6">
      <div className={`w-32 h-32 rounded-full ${color} flex items-center justify-center mx-auto shadow-lg`}>
        <div className="text-center">
          <p className="text-4xl font-black text-white">{value ?? '—'}</p>
          <p className="text-xs text-white/80 font-medium">AQI</p>
        </div>
      </div>
      <p className={`text-xl font-bold mt-4 ${textColor}`}>{label}</p>
      <p className="text-slate-500 text-sm mt-1">City Air Quality Index</p>
    </div>
  );
}

function StatChip({ icon: Icon, label, value, unit }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3 shadow-sm">
      <div className="p-2 bg-slate-50 rounded-lg">
        <Icon className="w-5 h-5 text-primary-500" />
      </div>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="font-bold text-slate-900">{value} <span className="text-xs font-normal text-slate-400">{unit}</span></p>
      </div>
    </div>
  );
}

export default function Pollution() {
  const [stations, setStations] = useState([]);
  const [selectedStation, setSelectedStation] = useState(null);
  const [reading, setReading] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get('/pollution/stations/city-aqi/');
        const data = res.data;
        if (Array.isArray(data) && data.length > 0) {
          setStations(data);
          setSelectedStation(data[0]);
          setReading(data[0].latest_reading);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (!selectedStation?.station?.id) return;
    const fetchHistory = async () => {
      try {
        const res = await api.get(`/pollution/stations/${selectedStation.station.id}/readings/`);
        const readings = res.data || [];
        setHistory(readings.slice(0, 24).reverse());
      } catch (e) {
        console.error(e);
      }
    };
    fetchHistory();
    setReading(selectedStation.latest_reading);
  }, [selectedStation]);

  const chartData = history.length > 0 ? {
    labels: history.map(r => new Date(r.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })),
    datasets: [{
      label: 'AQI',
      data: history.map(r => r.aqi_value),
      borderColor: '#22c55e',
      backgroundColor: 'rgba(34,197,94,0.08)',
      fill: true,
      tension: 0.4,
    }]
  } : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">🌫️ Pollution Monitoring</h1>
        <p className="text-slate-500 mt-1">Real-time air quality data from IoT sensors across the city.</p>
      </div>

      {/* Station selector */}
      {stations.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {stations.map(s => (
            <button
              key={s.station.id}
              onClick={() => setSelectedStation(s)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                selectedStation?.station?.id === s.station.id
                  ? 'bg-primary-600 text-white'
                  : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {s.station.name}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* AQI Gauge */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
          <AqiGauge value={reading?.aqi_value} />
          {selectedStation && (
            <p className="text-center text-xs text-slate-400 pb-4">
              📍 {selectedStation.station?.area_name || selectedStation.station?.name}
            </p>
          )}
        </div>

        {/* Parameters */}
        <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatChip icon={Wind} label="PM2.5" value={reading?.pm25 ?? '—'} unit="µg/m³" />
          <StatChip icon={Wind} label="PM10" value={reading?.pm10 ?? '—'} unit="µg/m³" />
          <StatChip icon={Wind} label="CO₂" value={reading?.co2 ?? '—'} unit="ppm" />
          <StatChip icon={Thermometer} label="Temperature" value={reading?.temperature ?? '—'} unit="°C" />
          <StatChip icon={Droplets} label="Humidity" value={reading?.humidity ?? '—'} unit="%" />
          <StatChip icon={Volume2} label="Noise Level" value={reading?.noise_level ?? '—'} unit="dB" />
        </div>
      </div>

      {/* Historical Chart */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
        <h3 className="font-semibold text-slate-900 mb-4">24-Hour AQI History</h3>
        <div className="h-64">
          {loading ? (
            <div className="h-full bg-slate-50 animate-pulse rounded-lg" />
          ) : chartData ? (
            <LineChart data={chartData} />
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400 text-sm">No historical data available</div>
          )}
        </div>
      </div>

      {/* AQI Scale reference */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
        <h3 className="font-semibold text-slate-900 mb-3">AQI Scale Reference</h3>
        <div className="flex flex-wrap gap-3">
          {[
            { range: '0–50', label: 'Good', color: 'bg-green-500' },
            { range: '51–100', label: 'Moderate', color: 'bg-yellow-400' },
            { range: '101–150', label: 'Unhealthy (Sensitive)', color: 'bg-orange-400' },
            { range: '151–200', label: 'Unhealthy', color: 'bg-red-500' },
            { range: '201+', label: 'Hazardous', color: 'bg-purple-700' },
          ].map(s => (
            <div key={s.range} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${s.color}`} />
              <span className="text-xs text-slate-600"><strong>{s.range}</strong> — {s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
