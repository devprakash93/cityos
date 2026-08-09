import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { Clock, AlertTriangle, CheckCircle2, Navigation, PlayCircle, Eye, RefreshCw } from 'lucide-react';

const STATUS_META = {
  ASSIGNED: { label: 'New Task', color: 'bg-indigo-100 text-indigo-700 border-indigo-200', icon: '📋' },
  ACCEPTED: { label: 'Accepted', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: '✅' },
  ON_SITE: { label: 'On the Way', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: '🚗' },
  IN_PROGRESS: { label: 'Working', color: 'bg-cyan-100 text-cyan-700 border-cyan-200', icon: '🔧' },
  REVIEW: { label: 'Awaiting Review', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: '⏳' },
  RESOLVED: { label: 'Resolved', color: 'bg-green-100 text-green-700 border-green-200', icon: '✓' },
};

const PRIORITY_COLOR = {
  CRITICAL: 'bg-red-100 text-red-700',
  HIGH: 'bg-orange-100 text-orange-700',
  MEDIUM: 'bg-yellow-100 text-yellow-700',
  LOW: 'bg-slate-100 text-slate-600',
};

const TABS = ['ALL', 'ASSIGNED', 'ACCEPTED', 'ON_SITE', 'IN_PROGRESS', 'REVIEW', 'RESOLVED'];

export default function WorkerTasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL');
  const [search, setSearch] = useState('');
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const params = { page, page_size: 20 };
      if (search) params.search = search;
      if (activeTab !== 'ALL') params.status = activeTab;
      const res = await api.get('/complaints/worker/tasks/', { params });
      const data = res.data.results ?? res.data;
      setTasks(Array.isArray(data) ? data : []);
      setTotalCount(res.data.count ?? (Array.isArray(data) ? data.length : 0));
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTasks(); }, [activeTab, search, page]);

  const getSLAStatus = (task) => {
    if (!task.sla_due_at) return null;
    const now = new Date();
    const due = new Date(task.sla_due_at);
    const hoursLeft = (due - now) / 1000 / 3600;
    if (task.sla_breached) return { label: 'SLA Breached', cls: 'text-red-600' };
    if (hoursLeft < 4) return { label: `Due in ${Math.round(hoursLeft)}h`, cls: 'text-orange-600' };
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Tasks</h1>
          <p className="text-sm text-slate-500 mt-0.5">{totalCount} tasks assigned to you</p>
        </div>
        <button onClick={fetchTasks} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
          <RefreshCw className={`w-4 h-4 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit flex-wrap">
        {TABS.map(tab => (
          <button key={tab}
            onClick={() => { setActiveTab(tab); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === tab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}>
            {STATUS_META[tab]?.icon} {STATUS_META[tab]?.label || tab}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <input
          type="text"
          placeholder="Search tasks..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          className="w-full pl-4 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Task cards */}
      {loading ? (
        <div className="grid gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-white rounded-xl border border-slate-200 animate-pulse" />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <CheckCircle2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No tasks found.</p>
          <p className="text-sm text-slate-400 mt-1">
            {activeTab !== 'ALL' ? 'Try selecting "All" to see all tasks.' : 'You have no assigned tasks.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {tasks.map(task => {
            const statusMeta = STATUS_META[task.status] || { label: task.status, color: 'bg-slate-100 text-slate-600', icon: '•' };
            const sla = getSLAStatus(task);
            return (
              <div key={task.id}
                className={`bg-white rounded-xl border shadow-sm p-5 hover:shadow-md transition-all ${
                  task.sla_breached ? 'border-red-200 bg-red-50/20' : 'border-slate-200'
                }`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap gap-2 mb-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusMeta.color}`}>
                        {statusMeta.icon} {statusMeta.label}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${PRIORITY_COLOR[task.priority] || 'bg-slate-100'}`}>
                        {task.priority}
                      </span>
                      {sla && (
                        <span className={`flex items-center gap-1 text-xs font-semibold ${sla.cls}`}>
                          <AlertTriangle className="w-3 h-3" /> {sla.label}
                        </span>
                      )}
                    </div>
                    <p className="font-semibold text-slate-900 truncate">{task.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5 font-mono">#{task.reference_number}</p>
                    {task.address && (
                      <p className="text-xs text-slate-400 mt-1 truncate">📍 {task.address}</p>
                    )}
                    {task.active_assignment?.deadline && (
                      <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Deadline: {new Date(task.active_assignment.deadline).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <Link
                    to={`/worker/tasks/${task.id}`}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
                    <Eye className="w-4 h-4" /> View
                  </Link>
                </div>

                {/* Quick next action indicator */}
                {task.status === 'ASSIGNED' && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <p className="text-xs text-indigo-600 font-semibold flex items-center gap-1">
                      → Go to task to ACCEPT this assignment
                    </p>
                  </div>
                )}
                {task.status === 'ACCEPTED' && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <p className="text-xs text-blue-600 font-semibold flex items-center gap-1">
                      <Navigation className="w-3 h-3" /> → Ready to Start Travel
                    </p>
                  </div>
                )}
                {task.status === 'ON_SITE' && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <p className="text-xs text-purple-600 font-semibold flex items-center gap-1">
                      <PlayCircle className="w-3 h-3" /> → Ready to Start Work
                    </p>
                  </div>
                )}
                {task.status === 'IN_PROGRESS' && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <p className="text-xs text-cyan-600 font-semibold flex items-center gap-1">
                      → Ready to submit completion proof
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalCount > 20 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">Page {page} of {Math.ceil(totalCount / 20)}</p>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50 bg-white">
              Previous
            </button>
            <button onClick={() => setPage(p => p + 1)} disabled={page * 20 >= totalCount}
              className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50 bg-white">
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
