import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../../../api/axios';
import {
  MapPin, Building, Users, Map, Edit, ArrowLeft,
  AlertTriangle, Shield, CheckCircle2, Activity, Wifi
} from 'lucide-react';
import GeographyModal from './GeographyModal';

export default function CityDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [city, setCity] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchCity = async () => {
    try {
      setLoading(true);
      const [cityRes, statsRes] = await Promise.all([
        api.get(`/geography/cities/${id}/`),
        api.get(`/geography/cities/${id}/stats/`),
      ]);
      setCity(cityRes.data);
      setStats(statsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCity();
  }, [id]);

  if (loading) return <div className="p-10 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div></div>;
  if (!city) return <div className="p-10 text-center text-slate-500">Geography record not found.</div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4 text-sm text-slate-500">
        <button onClick={() => navigate('/admin/geography')} className="flex items-center hover:text-slate-900 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </button>
        <span>/</span>
        <Link to="/admin/geography" className="hover:text-slate-900">Geography</Link>
        <span>/</span>
        <span className="text-slate-900 font-medium">Cities</span>
        <span>/</span>
        <span className="text-slate-900 font-medium">{city.name}</span>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">{city.name} City</h1>
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${city.is_active !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {city.is_active !== false ? 'Active' : 'Inactive'}
            </span>
            {city.is_default && (
              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                Default Boot City
              </span>
            )}
          </div>
          <p className="text-slate-500 mt-1 flex items-center gap-1">
            <MapPin className="w-4 h-4" /> {city.district_name}, {city.state_name}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors">
            <Edit className="w-4 h-4" /> Edit City
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Zones', value: stats?.zones, icon: Map, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Wards', value: stats?.wards, icon: MapPin, color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: 'Citizens', value: stats?.citizens, icon: Users, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Officers', value: stats?.officers, icon: Shield, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Workers', value: stats?.workers, icon: Activity, color: 'text-cyan-600', bg: 'bg-cyan-50' },
          { label: 'Active Complaints', value: stats?.active_complaints, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Open Incidents', value: stats?.open_incidents, icon: CheckCircle2, color: 'text-rose-600', bg: 'bg-rose-50' },
          { label: 'IoT Devices', value: stats?.iot_devices, icon: Wifi, color: 'text-blue-600', bg: 'bg-blue-50' },
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center gap-3">
            <div className={`p-2 rounded-lg ${stat.bg} ${stat.color}`}>
              <stat.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">{stat.label}</p>
              <p className="text-xl font-bold text-slate-900">{stat.value ?? '—'}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link to={`/admin/geography?tab=Zones&search=${city.name}`} className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">
            View Zones
          </Link>
          <Link to={`/admin/geography?tab=Wards&search=${city.name}`} className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">
            View Wards
          </Link>
          <Link to={`/admin/map?city=${city.id}`} className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">
            View City on Map
          </Link>
        </div>
      </div>

      {isModalOpen && (
        <GeographyModal 
          type="city" 
          item={city} 
          onClose={() => setIsModalOpen(false)} 
          onSuccess={fetchCity} 
        />
      )}
    </div>
  );
}
