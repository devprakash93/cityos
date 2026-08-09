import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../../../api/axios';
import {
  MapPin, ChevronRight, Building, Users, Map, Edit, ArrowLeft,
  AlertTriangle, Shield, CheckCircle2, Activity,
} from 'lucide-react';
import GeographyModal from './GeographyModal';

export default function DistrictDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [district, setDistrict] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchDistrict = async () => {
    try {
      setLoading(true);
      const [distRes, statsRes] = await Promise.all([
        api.get(`/geography/districts/${id}/`),
        api.get(`/geography/districts/${id}/stats/`),
      ]);
      setDistrict(distRes.data);
      setStats(statsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDistrict();
  }, [id]);

  if (loading) return <div className="p-10 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div></div>;
  if (!district) return <div className="p-10 text-center text-slate-500">Geography record not found.</div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Breadcrumbs & Back */}
      <div className="flex items-center gap-4 text-sm text-slate-500">
        <button onClick={() => navigate('/admin/geography')} className="flex items-center hover:text-slate-900 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </button>
        <span>/</span>
        <Link to="/admin/geography" className="hover:text-slate-900">Geography</Link>
        <span>/</span>
        <span className="text-slate-900 font-medium">Districts</span>
        <span>/</span>
        <span className="text-slate-900 font-medium">{district.name}</span>
      </div>

      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">{district.name} District</h1>
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${district.is_active !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {district.is_active !== false ? 'Active' : 'Inactive'}
            </span>
          </div>
          <p className="text-slate-500 mt-1 flex items-center gap-1">
            <MapPin className="w-4 h-4" /> {district.state_name}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors">
            <Edit className="w-4 h-4" /> Edit District
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Cities', value: stats?.cities, icon: Building, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Zones', value: stats?.zones, icon: Map, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Wards', value: stats?.wards, icon: MapPin, color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: 'Citizens', value: stats?.citizens, icon: Users, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Officers', value: stats?.officers, icon: Shield, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Workers', value: stats?.workers, icon: Activity, color: 'text-cyan-600', bg: 'bg-cyan-50' },
          { label: 'Active Complaints', value: stats?.active_complaints, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Open Incidents', value: stats?.open_incidents, icon: CheckCircle2, color: 'text-rose-600', bg: 'bg-rose-50' },
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

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link to={`/admin/geography?tab=Cities&search=${district.name}`} className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">
            View Cities
          </Link>
          <Link to={`/admin/geography?tab=Zones&search=${district.name}`} className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">
            View Zones
          </Link>
          <Link to={`/admin/geography?tab=Wards&search=${district.name}`} className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">
            View Wards
          </Link>
        </div>
      </div>

      {isModalOpen && (
        <GeographyModal 
          type="district" 
          item={district} 
          onClose={() => setIsModalOpen(false)} 
          onSuccess={fetchDistrict} 
        />
      )}
    </div>
  );
}
