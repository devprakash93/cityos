import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import {
  Building, Users, AlertTriangle, TrendingUp, RefreshCw,
  Car, Trash2, Droplets, Zap, Bus, Wind, ShieldAlert, BarChart2
} from 'lucide-react';

const deptIcons = {
  TRAFFIC: Car, WASTE: Trash2, WATER: Droplets,
  ELECTRICITY: Zap, TRANSPORT: Bus, POLLUTION: Wind,
  EMERGENCY: ShieldAlert,
};

function getIcon(code) {
  const key = Object.keys(deptIcons).find(k => code?.toUpperCase().includes(k));
  return key ? deptIcons[key] : Building;
}

export default function DepartmentsManagement() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDepts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/departments/');
      const data = res.data.results ?? res.data;
      setDepartments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDepts(); }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Departments</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage city administrative departments</p>
        </div>
        <button onClick={fetchDepts} className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-6 animate-pulse">
              <div className="h-4 bg-slate-100 rounded w-3/4 mb-4" />
              <div className="space-y-2">
                <div className="h-3 bg-slate-100 rounded" />
                <div className="h-3 bg-slate-100 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : departments.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
          <Building className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p>No departments found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {departments.map(dept => {
            const Icon = getIcon(dept.code || dept.name);
            const resRate = dept.total_complaints
              ? Math.round(dept.resolved_complaints / dept.total_complaints * 100)
              : 0;

            return (
              <div key={dept.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden group">
                {/* Header */}
                <div className="p-5 border-b border-slate-100">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-lg bg-green-50 text-green-600 group-hover:bg-green-100 transition-colors">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-slate-900 truncate">{dept.name}</h3>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">{dept.code}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${dept.is_active !== false ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                      {dept.is_active !== false ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 divide-x divide-slate-100">
                  <div className="p-4 text-center">
                    <p className="text-xl font-bold text-slate-800">{dept.officer_count ?? '—'}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Officers</p>
                  </div>
                  <div className="p-4 text-center">
                    <p className="text-xl font-bold text-slate-800">{dept.worker_count ?? '—'}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Workers</p>
                  </div>
                  <div className="p-4 text-center">
                    <p className={`text-xl font-bold ${dept.sla_breach_count > 0 ? 'text-red-600' : 'text-slate-800'}`}>
                      {dept.sla_breach_count ?? '—'}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">SLA Breach</p>
                  </div>
                </div>

                {/* Contact + Action */}
                <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="text-xs text-slate-400">
                    {dept.contact_email && (
                      <span className="truncate">{dept.contact_email}</span>
                    )}
                  </div>
                  <button className="text-xs text-green-600 hover:text-green-700 font-semibold flex items-center gap-1">
                    <BarChart2 className="w-3 h-3" /> Details
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
