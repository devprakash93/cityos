import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { Link } from 'react-router-dom';
import { Clock, CheckCircle2, ShieldAlert, ArrowRight, CheckCircle, Navigation, PlayCircle } from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await api.get('/dashboard/');
        if (response.data?.success) {
          setData(response.data.data);
        }
      } catch (error) {
        console.error("Error fetching worker dashboard:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse max-w-5xl mx-auto">
        <div className="h-8 w-64 bg-slate-200 rounded"></div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-24 bg-slate-200 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!data) return <div>Failed to load dashboard data.</div>;

  const { stats, recent_tasks } = data;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Field Worker Operations
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {user?.full_name} • {user?.department?.name} • {user?.profile?.city_name || 'City'}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="bg-white border-slate-200/60 shadow-sm">
          <CardContent className="p-4 flex flex-col items-center text-center">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-full mb-2">
              <Clock className="w-5 h-5" />
            </div>
            <p className="text-2xl font-black text-slate-900">{stats.new_tasks || 0}</p>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">New Tasks</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200/60 shadow-sm">
          <CardContent className="p-4 flex flex-col items-center text-center">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-full mb-2">
              <CheckCircle className="w-5 h-5" />
            </div>
            <p className="text-2xl font-black text-slate-900">{stats.accepted || 0}</p>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Accepted</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200/60 shadow-sm">
          <CardContent className="p-4 flex flex-col items-center text-center">
            <div className="p-2 bg-purple-50 text-purple-600 rounded-full mb-2">
              <Navigation className="w-5 h-5" />
            </div>
            <p className="text-2xl font-black text-slate-900">{stats.on_the_way || 0}</p>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">On The Way</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200/60 shadow-sm">
          <CardContent className="p-4 flex flex-col items-center text-center">
            <div className="p-2 bg-orange-50 text-orange-600 rounded-full mb-2">
              <PlayCircle className="w-5 h-5" />
            </div>
            <p className="text-2xl font-black text-slate-900">{stats.working || 0}</p>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Working</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200/60 shadow-sm">
          <CardContent className="p-4 flex flex-col items-center text-center">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-full mb-2">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <p className="text-2xl font-black text-slate-900">{stats.completed_today || 0}</p>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Completed Today</p>
          </CardContent>
        </Card>

        <Card className={`border shadow-sm ${stats.urgent > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200/60'}`}>
          <CardContent className="p-4 flex flex-col items-center text-center">
            <div className={`p-2 rounded-full mb-2 ${stats.urgent > 0 ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-400'}`}>
              <ShieldAlert className="w-5 h-5" />
            </div>
            <p className={`text-2xl font-black ${stats.urgent > 0 ? 'text-red-700' : 'text-slate-900'}`}>{stats.urgent || 0}</p>
            <p className={`text-xs font-semibold uppercase tracking-wider ${stats.urgent > 0 ? 'text-red-600' : 'text-slate-500'}`}>Urgent</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-4">
         <Button onClick={() => window.location.href='/worker/tasks'} className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white">
            View All Tasks
         </Button>
         <Button variant="outline" onClick={() => window.location.href='/worker/map'} className="w-full sm:w-auto">
            Open Map
         </Button>
      </div>

      <Card>
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-bold text-slate-800">Recent Assignments</CardTitle>
          <Link to="/worker/tasks" className="text-sm font-medium text-amber-600 hover:underline">See All</Link>
        </CardHeader>
        <CardContent className="p-0">
          {recent_tasks?.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {recent_tasks.map((task) => (
                <div key={task.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-slate-900">#{task.reference_number}</span>
                      <StatusBadge status={task.status === 'ON_SITE' ? 'ON_THE_WAY' : (task.status === 'IN_PROGRESS' ? 'WORKING' : task.status)} />
                      {['HIGH', 'CRITICAL'].includes(task.priority) && (
                         <StatusBadge status={task.priority} />
                      )}
                    </div>
                    <p className="text-sm text-slate-600 truncate max-w-sm">{task.title}</p>
                    <p className="text-xs text-slate-400 mt-1">Location: {task.address || 'Not specified'}</p>
                  </div>
                  <Link to={`/worker/tasks/${task.id}`} className="p-2 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition-colors">
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500">
               No active tasks! Enjoy your break.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
