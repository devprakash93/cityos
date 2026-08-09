import { useState, useEffect } from 'react';
import api from '../../api/axios';
import {
  TrendingUp, TrendingDown, Users, AlertTriangle, CheckCircle,
  BarChart3, PieChart, Clock, Zap, RefreshCw
} from 'lucide-react';

function KPICard({ label, value, sub, icon: Icon, trend, color = 'blue' }) {
  const colors = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-100', icon: 'text-blue-500' },
    green: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-100', icon: 'text-green-500' },
    orange: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-100', icon: 'text-orange-500' },
    red: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-100', icon: 'text-red-500' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-100', icon: 'text-purple-500' },
  };
  const c = colors[color] || colors.blue;
  return (
    <div className={`rounded-xl border p-5 ${c.bg} ${c.border}`}>
      <div className="flex items-start justify-between mb-3">
        <p className={`text-xs font-bold uppercase tracking-wider ${c.text} opacity-80`}>{label}</p>
        {Icon && <Icon className={`w-5 h-5 ${c.icon}`} />}
      </div>
      <p className={`text-3xl font-bold ${c.text}`}>{value ?? '—'}</p>
      {sub && <p className={`text-xs mt-1 ${c.text} opacity-70`}>{sub}</p>}
      {trend !== undefined && (
        <div className={`flex items-center gap-1 mt-2 text-xs font-semibold ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {Math.abs(trend)}% from last period
        </div>
      )}
    </div>
  );
}

function BarChartRow({ label, value, max, colorClass = 'bg-blue-500', showValue = true }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-sm text-slate-600 truncate max-w-[60%]">{label}</span>
        {showValue && <span className="text-sm font-bold text-slate-900">{value}</span>}
      </div>
      <div className="w-full bg-slate-100 rounded-full h-2.5">
        <div className={`h-2.5 rounded-full transition-all duration-700 ${colorClass}`}
          style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
    </div>
  );
}

export default function AdminAnalytics() {
  const [dashData, setDashData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/dashboard/');
      setDashData(res.data?.data || null);
      setLastUpdated(new Date());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
    </div>
  );

  const d = dashData || {};
  const users = d.users || {};
  const complaints = d.complaints || {};
  const deptPerf = d.department_performance || [];
  const recentIncidents = d.recent_incidents || [];
  const iot = d.iot || {};

  const totalComplaints = complaints.total || 0;
  const resolvedComplaints = complaints.resolved || 0;
  const pendingComplaints = complaints.pending || 0;
  const resolutionRate = totalComplaints > 0 ? Math.round((resolvedComplaints / totalComplaints) * 100) : 0;

  const maxDeptTotal = Math.max(1, ...deptPerf.map(d => d.total));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">System Analytics</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Real-time overview of Odisha CityOS operations
            {lastUpdated && ` · Updated ${lastUpdated.toLocaleTimeString()}`}
          </p>
        </div>
        <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Top KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Total Users" value={users.total} icon={Users} color="blue"
          sub={`${users.active || 0} active`} />
        <KPICard label="Resolution Rate" value={`${resolutionRate}%`} icon={CheckCircle} color="green"
          sub={`${resolvedComplaints} of ${totalComplaints} resolved`} />
        <KPICard label="SLA Breaches" value={complaints.sla_breaches || 0} icon={AlertTriangle} color="red"
          sub="Complaints past deadline" />
        <KPICard label="Active Incidents" value={d.active_emergency_incidents || 0} icon={Zap} color="orange"
          sub="Emergency incidents open" />
      </div>

      {/* Complaint Breakdown + User Roles */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Complaint Status */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-5">
            <PieChart className="w-5 h-5 text-blue-500" />
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Complaint Status</h3>
          </div>
          <div className="space-y-4">
            <BarChartRow label="Pending" value={pendingComplaints} max={totalComplaints} colorClass="bg-orange-400" />
            <BarChartRow label="Resolved" value={resolvedComplaints} max={totalComplaints} colorClass="bg-emerald-500" />
            <BarChartRow label="SLA Breached" value={complaints.sla_breaches || 0} max={totalComplaints} colorClass="bg-red-500" />
            <div className="pt-2 border-t border-slate-100">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Total Complaints</span>
                <span className="font-bold text-slate-900">{totalComplaints}</span>
              </div>
            </div>
          </div>
        </div>

        {/* User Role Breakdown */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-5">
            <Users className="w-5 h-5 text-purple-500" />
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">User Distribution</h3>
          </div>
          <div className="space-y-4">
            {[
              { label: 'Citizens', value: users.citizens || 0, color: 'bg-blue-400' },
              { label: 'Department Officers', value: users.officers || 0, color: 'bg-purple-500' },
              { label: 'Field Workers', value: users.workers || 0, color: 'bg-cyan-500' },
            ].map(({ label, value, color }) => (
              <BarChartRow key={label} label={label} value={value} max={users.total || 1} colorClass={color} />
            ))}
            <div className="pt-2 border-t border-slate-100">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Total Users</span>
                <span className="font-bold text-slate-900">{users.total || 0}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-slate-500">Active Users</span>
                <span className="font-bold text-green-600">{users.active || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Department Performance */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-5">
          <BarChart3 className="w-5 h-5 text-indigo-500" />
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Department Performance</h3>
        </div>
        {deptPerf.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-8">No department data available.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-bold text-slate-500 uppercase border-b border-slate-100">
                  <th className="pb-3 pr-4">Department</th>
                  <th className="pb-3 pr-4 text-right">Total</th>
                  <th className="pb-3 pr-4 text-right">Open</th>
                  <th className="pb-3 pr-4 text-right">Resolved</th>
                  <th className="pb-3 pr-4 text-right">SLA Breaches</th>
                  <th className="pb-3">Resolution Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {deptPerf.sort((a, b) => b.resolution_rate - a.resolution_rate).map(dept => (
                  <tr key={dept.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 pr-4 font-semibold text-slate-800">{dept.name}</td>
                    <td className="py-3 pr-4 text-right text-slate-600">{dept.total}</td>
                    <td className="py-3 pr-4 text-right">
                      <span className={dept.open > 0 ? 'text-orange-600 font-semibold' : 'text-slate-400'}>{dept.open}</span>
                    </td>
                    <td className="py-3 pr-4 text-right text-green-600 font-semibold">{dept.resolved}</td>
                    <td className="py-3 pr-4 text-right">
                      <span className={dept.sla_breaches > 0 ? 'text-red-600 font-semibold' : 'text-slate-400'}>{dept.sla_breaches}</span>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                          <div className={`h-1.5 rounded-full ${dept.resolution_rate >= 70 ? 'bg-emerald-500' : dept.resolution_rate >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                            style={{ width: `${dept.resolution_rate}%` }} />
                        </div>
                        <span className="text-xs font-bold text-slate-700 w-9 text-right">{dept.resolution_rate}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Infrastructure Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" /> Infrastructure
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
              <span className="text-sm text-slate-600">Total Districts</span>
              <span className="text-lg font-bold text-slate-900">{d.districts || 0}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
              <span className="text-sm text-slate-600">Total Cities</span>
              <span className="text-lg font-bold text-slate-900">{d.cities || 0}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
              <span className="text-sm text-green-700">IoT Devices Online</span>
              <span className="text-lg font-bold text-green-700">{iot.online || 0}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
              <span className="text-sm text-red-700">IoT Devices Offline</span>
              <span className="text-lg font-bold text-red-700">{iot.offline || 0}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
              <span className="text-sm text-orange-700">Active Power Outages</span>
              <span className="text-lg font-bold text-orange-700">{d.active_power_outages || 0}</span>
            </div>
          </div>
        </div>

        {/* Recent Incidents */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-red-500" /> Recent Emergency Incidents
          </h3>
          {recentIncidents.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">No active emergencies.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentIncidents.slice(0, 6).map((inc, i) => (
                <div key={inc.id || i} className={`flex items-start gap-3 p-3 rounded-lg border ${
                  inc.severity === 'CRITICAL' ? 'bg-red-50 border-red-100' :
                  inc.severity === 'HIGH' ? 'bg-orange-50 border-orange-100' :
                  'bg-slate-50 border-slate-100'}`}>
                  <div className="text-lg shrink-0">
                    {inc.incident_type === 'FIRE' ? '🔥' : inc.incident_type === 'ACCIDENT' ? '🚗' :
                     inc.incident_type === 'FLOOD' ? '🌊' : inc.incident_type === 'CYCLONE' ? '🌀' : '⚠️'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800">
                      {inc.incident_type?.replace(/_/g, ' ')}
                    </p>
                    <p className="text-xs text-slate-500 truncate">{inc.location__address || inc.location__city__name || 'Location unknown'}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                        inc.severity === 'CRITICAL' ? 'bg-red-200 text-red-800' :
                        inc.severity === 'HIGH' ? 'bg-orange-200 text-orange-800' :
                        'bg-slate-200 text-slate-700'}`}>
                        {inc.severity}
                      </span>
                      <span className="text-xs text-slate-400">{inc.status?.replace(/_/g, ' ')}</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 shrink-0">
                    {inc.reported_at ? new Date(inc.reported_at).toLocaleDateString() : ''}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
