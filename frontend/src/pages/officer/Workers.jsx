import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import { Users, Mail, MapPin, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';

export default function OfficerWorkers() {
  const { user } = useAuth();
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchWorkers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/accounts/officer-workers/');
      setWorkers(res.data.results || res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchWorkers(); }, []);

  const filteredWorkers = workers.filter(w => 
    w.full_name?.toLowerCase().includes(search.toLowerCase()) || 
    w.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Field Workers</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {workers.length} workers in {user?.department?.name || 'Department'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Search workers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
          />
          <button onClick={fetchWorkers} className="p-2.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {loading ? (
          [...Array(8)].map((_, i) => (
            <div key={i} className="h-48 bg-slate-100 rounded-xl animate-pulse"></div>
          ))
        ) : filteredWorkers.length === 0 ? (
          <div className="col-span-full py-12 text-center bg-white rounded-xl border border-slate-200 shadow-sm">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No field workers found.</p>
          </div>
        ) : (
          filteredWorkers.map(w => (
            <div key={w.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-shadow relative overflow-hidden">
               {/* Status indicator line */}
               <div className={`absolute top-0 left-0 w-full h-1.5 ${w.is_active ? 'bg-green-500' : 'bg-red-500'}`}></div>
               
               <div className="flex items-center gap-4 mb-4 mt-2">
                 <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                    <span className="text-xl font-bold text-blue-700">
                      {w.first_name?.[0]}{w.last_name?.[0]}
                    </span>
                 </div>
                 <div>
                   <h3 className="font-bold text-slate-900 leading-tight">{w.full_name}</h3>
                   <div className="flex items-center gap-1 mt-1">
                     {w.is_active ? (
                       <span className="flex items-center text-[10px] uppercase tracking-wider font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                         <CheckCircle2 className="w-3 h-3 mr-1" /> Active
                       </span>
                     ) : (
                       <span className="flex items-center text-[10px] uppercase tracking-wider font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                         <XCircle className="w-3 h-3 mr-1" /> Inactive
                       </span>
                     )}
                   </div>
                 </div>
               </div>
               
               <div className="space-y-2 mt-6 border-t border-slate-100 pt-4">
                 <div className="flex items-center gap-2 text-sm text-slate-600">
                   <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                   <span className="truncate">{w.email}</span>
                 </div>
                 <div className="flex items-center gap-2 text-sm text-slate-600">
                   <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                   <span className="truncate">{w.profile?.ward_name || w.profile?.city_name || 'Not assigned'}</span>
                 </div>
               </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
