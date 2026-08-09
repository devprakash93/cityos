import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import { BoxSelect, Search, RefreshCw, Calendar, Eye, User } from 'lucide-react';
import { StatusBadge } from '../../components/ui/StatusBadge';

export default function OfficerTasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await api.get('/complaints/tasks/', {
        params: { search, is_active: true }
      });
      setTasks(res.data.results || res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTasks(); }, [search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Task Assignments</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Active field worker assignments
          </p>
        </div>
        <button onClick={fetchTasks} className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search by complaint reference or title..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {loading ? (
          [...Array(6)].map((_, i) => (
            <div key={i} className="h-48 bg-slate-100 rounded-xl animate-pulse"></div>
          ))
        ) : tasks.length === 0 ? (
          <div className="col-span-full py-12 text-center bg-white rounded-xl border border-slate-200 shadow-sm">
            <BoxSelect className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No active tasks found.</p>
          </div>
        ) : (
          tasks.map(t => (
            <div key={t.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col h-full overflow-hidden">
               <div className="p-5 flex-1">
                 <div className="flex justify-between items-start mb-3">
                   <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-slate-500 px-2 py-1 bg-slate-100 rounded">
                        #{t.complaint?.reference_number || t.id}
                      </span>
                   </div>
                   <StatusBadge status={t.complaint?.status} />
                 </div>
                 
                 <h3 className="font-semibold text-slate-900 line-clamp-2 mb-4" title={t.complaint?.title}>
                   {t.complaint?.title}
                 </h3>

                 <div className="space-y-3 mt-auto">
                    <div className="flex items-center gap-3 p-3 bg-blue-50/50 rounded-lg border border-blue-100/50">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                         <User className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="min-w-0">
                         <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Assigned To</p>
                         <p className="text-sm font-bold text-slate-900 truncate">{t.assigned_to?.full_name}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-600 pl-1">
                      <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>Assigned: {new Date(t.assigned_at).toLocaleDateString()}</span>
                    </div>
                 </div>
               </div>
               
               <div className="border-t border-slate-100 bg-slate-50 p-3 flex justify-between items-center mt-auto">
                 <Link to={`/officer/complaints/${t.complaint?.id}`} className="text-sm font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1.5 transition-colors">
                   <Eye className="w-4 h-4" /> View Details
                 </Link>
               </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
