import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { CheckCircle2, Clock, AlertTriangle, TrendingUp, Star, Award } from 'lucide-react';

function StatCard({ label, value, sub, icon: Icon, color = 'blue' }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    green: 'bg-green-50 text-green-700 border-green-100',
    orange: 'bg-orange-50 text-orange-700 border-orange-100',
    red: 'bg-red-50 text-red-700 border-red-100',
    purple: 'bg-purple-50 text-purple-700 border-purple-100',
  };
  return (
    <div className={`rounded-xl border p-5 ${colors[color]}`}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-sm font-semibold opacity-80">{label}</p>
        {Icon && <Icon className="w-5 h-5 opacity-60" />}
      </div>
      <p className="text-3xl font-bold">{value ?? '—'}</p>
      {sub && <p className="text-xs mt-1 opacity-70">{sub}</p>}
    </div>
  );
}

function ProgressBar({ value, max, color = 'bg-blue-500' }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 bg-slate-100 rounded-full h-2">
        <div className={`h-2 rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm font-bold text-slate-700 w-10 text-right">{pct}%</span>
    </div>
  );
}

export default function WorkerPerformance() {
  const [stats, setStats] = useState(null);
  const [recentTasks, setRecentTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const [dashRes, taskRes] = await Promise.all([
          api.get('/dashboard/'),
          api.get('/complaints/worker/tasks/', { params: { page_size: 5, ordering: '-updated_at' } }),
        ]);
        if (dashRes.data?.data?.stats) {
          setStats(dashRes.data.data.stats);
        }
        const data = taskRes.data.results ?? taskRes.data;
        setRecentTasks(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
    </div>
  );

  const total = (stats?.new_tasks || 0) + (stats?.accepted || 0) + (stats?.on_the_way || 0) +
    (stats?.working || 0) + (stats?.completed_today || 0);
  const completionRate = total > 0 ? Math.round(((stats?.completed_today || 0) / total) * 100) : 0;
  const urgentTasks = stats?.urgent || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Performance</h1>
        <p className="text-sm text-slate-500 mt-0.5">Your task statistics and completion record</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Completed Today" value={stats?.completed_today ?? 0} icon={CheckCircle2} color="green"
          sub="Tasks marked complete or under review" />
        <StatCard label="In Progress" value={stats?.working ?? 0} icon={TrendingUp} color="blue"
          sub="Currently being worked on" />
        <StatCard label="New / Pending" value={stats?.new_tasks ?? 0} icon={Clock} color="orange"
          sub="Awaiting your acceptance" />
        <StatCard label="On the Way" value={stats?.on_the_way ?? 0} icon={TrendingUp} color="purple"
          sub="Traveling to site" />
        <StatCard label="Urgent Tasks" value={urgentTasks} icon={AlertTriangle} color={urgentTasks > 0 ? 'red' : 'blue'}
          sub="HIGH or CRITICAL priority" />
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-start justify-between mb-3">
            <p className="text-sm font-semibold text-slate-600">Completion Rate</p>
            <Award className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900">{completionRate}%</p>
          <div className="mt-2">
            <ProgressBar value={stats?.completed_today || 0} max={total} color="bg-emerald-500" />
          </div>
          <p className="text-xs text-slate-400 mt-1">{stats?.completed_today || 0} of {total} tasks today</p>
        </div>
      </div>

      {/* Task Breakdown */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-5">Task Status Breakdown</h3>
        <div className="space-y-4">
          {[
            { label: 'New (Assigned to me)', value: stats?.new_tasks || 0, color: 'bg-indigo-500', max: total },
            { label: 'Accepted', value: stats?.accepted || 0, color: 'bg-blue-500', max: total },
            { label: 'On the Way', value: stats?.on_the_way || 0, color: 'bg-purple-500', max: total },
            { label: 'Working', value: stats?.working || 0, color: 'bg-cyan-500', max: total },
            { label: 'Completed / Under Review', value: stats?.completed_today || 0, color: 'bg-emerald-500', max: total },
          ].map(({ label, value, color, max }) => (
            <div key={label}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-slate-600">{label}</span>
                <span className="text-sm font-bold text-slate-900">{value}</span>
              </div>
              <ProgressBar value={value} max={max || 1} color={color} />
            </div>
          ))}
        </div>
      </div>

      {/* Recent Task Activity */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Recent Task Activity</h3>
        {recentTasks.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-8">No recent tasks.</p>
        ) : (
          <div className="space-y-3">
            {recentTasks.map(task => (
              <div key={task.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{task.title}</p>
                  <p className="text-xs text-slate-400 font-mono">#{task.reference_number}</p>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold
                    ${task.status === 'RESOLVED' ? 'bg-green-100 text-green-700' :
                      task.status === 'REVIEW' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-blue-100 text-blue-700'}`}>
                    {task.status}
                  </span>
                  <p className="text-xs text-slate-400 mt-0.5">{new Date(task.updated_at).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Motivational Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 text-white">
        <div className="flex items-center gap-3">
          <Star className="w-8 h-8 text-yellow-300 shrink-0" />
          <div>
            <p className="font-bold text-lg">Keep up the great work!</p>
            <p className="text-blue-100 text-sm">
              Every task you complete helps the citizens of Odisha. You are doing important work.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
