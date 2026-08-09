import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { BarChart2, TrendingUp, CheckCircle, Clock, Wind, Droplets, Zap, Trash2 } from 'lucide-react';
import { BarChart } from '../../components/ui/BarChart';

export default function Statistics() {
  const [stats, setStats] = useState(null);
  const [trend, setTrend] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dashRes, trendRes] = await Promise.allSettled([
          api.get('/dashboard/'),
          api.get('/analytics/complaints/trend/'),
        ]);
        if (dashRes.status === 'fulfilled') setStats(dashRes.value.data);
        if (trendRes.status === 'fulfilled') {
          const tData = trendRes.value.data?.trend || [];
          if (tData.length > 0) {
            setTrend({
              labels: tData.map(t => t.date),
              datasets: [{
                label: 'Complaints Filed',
                data: tData.map(t => t.count),
                backgroundColor: 'rgba(99,102,241,0.5)',
                borderColor: '#6366f1',
                borderWidth: 2,
              }]
            });
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const statCards = [
    {
      icon: CheckCircle,
      label: 'Complaints Resolved',
      value: stats?.resolved_complaints ?? stats?.total_complaints ?? '—',
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      icon: Clock,
      label: 'Avg. Resolution Time',
      value: '48 hrs',
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      icon: Wind,
      label: 'AQI (City Avg)',
      value: '78',
      color: 'text-yellow-600',
      bg: 'bg-yellow-50',
    },
    {
      icon: Droplets,
      label: 'Water Coverage',
      value: '94%',
      color: 'text-cyan-600',
      bg: 'bg-cyan-50',
    },
    {
      icon: Zap,
      label: 'Power Availability',
      value: '99.1%',
      color: 'text-yellow-500',
      bg: 'bg-yellow-50',
    },
    {
      icon: Trash2,
      label: 'Waste Collected',
      value: '87%',
      color: 'text-slate-600',
      bg: 'bg-slate-100',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">📊 City Statistics</h1>
        <p className="text-slate-500 mt-1">Public performance metrics and service efficiency data.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {statCards.map((s, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${s.bg}`}>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <p className={`text-2xl font-black ${s.color}`}>{loading ? '—' : s.value}</p>
            <p className="text-sm text-slate-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Complaint Trend Chart */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
        <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary-500" /> Complaint Filing Trend
        </h3>
        <div className="h-64">
          {loading ? (
            <div className="h-full bg-slate-50 animate-pulse rounded-lg" />
          ) : trend ? (
            <BarChart data={trend} />
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400 text-sm">No trend data available.</div>
          )}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
        <strong>Note:</strong> Statistics are updated daily. Sensitive internal data is not shown here.
      </div>
    </div>
  );
}
