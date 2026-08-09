import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCity } from '../../context/CityContext';
import api from '../../api/axios';
import {
  ShieldAlert, Zap, AlertTriangle, Clock, Cpu, WifiOff,
  TrendingUp, TrendingDown, CheckCircle, RefreshCw,
  ArrowRight, Circle
} from 'lucide-react';

// Status Badge component
function StatusBadge({ status }) {
  const map = {
    REPORTED: 'bg-orange-100 text-orange-700 border-orange-200',
    RESPONDING: 'bg-blue-100 text-blue-700 border-blue-200',
    RESOLVED: 'bg-green-100 text-green-700 border-green-200',
    CLOSED: 'bg-slate-100 text-slate-700 border-slate-200',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${map[status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
      {status}
    </span>
  );
}

// Severity dot
function SeverityDot({ severity }) {
  const colors = { CRITICAL: 'bg-red-500', HIGH: 'bg-orange-500', MEDIUM: 'bg-yellow-500', LOW: 'bg-green-500' };
  return <span className={`w-2 h-2 rounded-full shrink-0 ${colors[severity] || 'bg-slate-400'}`} />;
}

// Compact KPI Card
function KpiCard({ label, value, icon: Icon, color, sub }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
      <div className={`p-2.5 rounded-lg ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500 truncate">{label}</p>
        <p className="text-2xl font-bold text-slate-900 leading-tight">{value ?? '—'}</p>
        {sub && <p className="text-[11px] text-slate-400">{sub}</p>}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { selectedCity } = useCity();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = selectedCity ? { city_id: selectedCity.id } : {};
      const res = await api.get('/dashboard/', { params });
      if (res.data.success) {
        setStats(res.data.data);
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [selectedCity]);

  const scopeLabel = selectedCity ? selectedCity.name : 'All Odisha';
  const complaints = stats?.complaints || {};
  const iot = stats?.iot || {};
  const depts = stats?.department_performance || [];
  const incidents = stats?.recent_incidents || [];

  const inProgress = (complaints.total || 0) - (complaints.pending || 0) - (complaints.resolved || 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Odisha Command Center</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Current Scope: <span className="font-semibold text-green-600">{scopeLabel}</span>
            {lastUpdated && <span className="ml-2 text-slate-400">· Updated {lastUpdated.toLocaleTimeString()}</span>}
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Compact KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard label="Active Emergencies" value={stats?.active_emergency_incidents} icon={ShieldAlert} color="bg-red-500" />
        <KpiCard label="SLA Breaches" value={complaints.sla_breaches} icon={AlertTriangle} color="bg-orange-500" />
        <KpiCard label="Power Outages" value={stats?.active_power_outages} icon={Zap} color="bg-yellow-500" />
        <KpiCard label="Pending Complaints" value={complaints.pending} icon={Clock} color="bg-blue-500" />
        <KpiCard label="Online IoT Devices" value={iot.online} icon={Cpu} color="bg-green-500" sub="Sensors active" />
        <KpiCard label="Offline IoT" value={iot.offline} icon={WifiOff} color="bg-slate-500" sub="Need attention" />
      </div>

      {/* Complaint Overview + Department Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Complaint Overview */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Complaint Overview</h2>
            <Link to="/admin/complaints" className="text-xs text-green-600 hover:text-green-700 font-semibold flex items-center gap-1">
              View All <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="p-6 space-y-4">
            {loading ? (
              <div className="animate-pulse space-y-3">
                {[1,2,3,4,5].map(i => <div key={i} className="h-8 bg-slate-100 rounded" />)}
              </div>
            ) : (
              <>
                {[
                  { label: 'Pending', value: complaints.pending || 0, color: 'bg-orange-500', pct: complaints.total ? Math.round((complaints.pending||0)/complaints.total*100) : 0 },
                  { label: 'In Progress', value: Math.max(0, inProgress), color: 'bg-blue-500', pct: complaints.total ? Math.round(Math.max(0, inProgress)/complaints.total*100) : 0 },
                  { label: 'Resolved', value: complaints.resolved || 0, color: 'bg-green-500', pct: complaints.total ? Math.round((complaints.resolved||0)/complaints.total*100) : 0 },
                  { label: 'SLA Breached', value: complaints.sla_breaches || 0, color: 'bg-red-500', pct: complaints.total ? Math.round((complaints.sla_breaches||0)/complaints.total*100) : 0 },
                ].map(row => (
                  <div key={row.label} className="flex items-center gap-3">
                    <span className="text-sm text-slate-600 w-24 shrink-0">{row.label}</span>
                    <div className="flex-1 bg-slate-100 rounded-full h-2">
                      <div className={`h-2 rounded-full ${row.color} transition-all`} style={{ width: `${row.pct}%` }} />
                    </div>
                    <span className="text-sm font-bold text-slate-800 w-12 text-right">{row.value.toLocaleString()}</span>
                  </div>
                ))}
                <div className="pt-2 border-t border-slate-100 flex justify-between text-xs text-slate-400">
                  <span>Total: <span className="font-semibold text-slate-700">{(complaints.total||0).toLocaleString()}</span></span>
                  <span>Resolution Rate: <span className="font-semibold text-green-600">
                    {complaints.total ? Math.round((complaints.resolved||0) / complaints.total * 100) : 0}%
                  </span></span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Department Performance */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Department Performance</h2>
            <Link to="/admin/departments" className="text-xs text-green-600 hover:text-green-700 font-semibold flex items-center gap-1">
              Manage <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {loading ? (
              <div className="p-6 animate-pulse space-y-3">
                {[1,2,3,4].map(i => <div key={i} className="h-8 bg-slate-100 rounded" />)}
              </div>
            ) : depts.length === 0 ? (
              <p className="p-6 text-sm text-slate-400 text-center">No departments found.</p>
            ) : (
              depts.slice(0, 7).map(dept => (
                <div key={dept.id} className="flex items-center justify-between px-6 py-3 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <Circle className="w-2 h-2 text-green-500 shrink-0 fill-current" />
                    <span className="text-sm font-medium text-slate-700 truncate">{dept.name}</span>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <span className="text-xs text-slate-400">Open: <span className="font-semibold text-slate-700">{dept.open}</span></span>
                    <span className="text-xs text-slate-400">Rate: <span className={`font-semibold ${dept.resolution_rate >= 70 ? 'text-green-600' : dept.resolution_rate >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>{dept.resolution_rate}%</span></span>
                    {dept.sla_breaches > 0 && (
                      <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-semibold">{dept.sla_breaches} SLA</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Critical Events */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Recent Critical Events</h2>
          <Link to="/admin/emergency" className="text-xs text-green-600 hover:text-green-700 font-semibold flex items-center gap-1">
            Emergency Center <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        {loading ? (
          <div className="p-6 animate-pulse space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-12 bg-slate-100 rounded" />)}
          </div>
        ) : incidents.length === 0 ? (
          <div className="p-8 text-center">
            <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-700">All clear — no active emergencies</p>
            <p className="text-xs text-slate-400 mt-1">for {scopeLabel}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">City</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Location</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Severity</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Time</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {incidents.map(inc => (
                  <tr key={inc.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3 font-medium text-slate-800">{inc.incident_type?.replace(/_/g, ' ') || '—'}</td>
                    <td className="px-6 py-3 text-slate-600">{inc['location__city__name'] || '—'}</td>
                    <td className="px-6 py-3 text-slate-500">{inc['location__name'] || '—'}</td>
                    <td className="px-6 py-3">
                      <span className="flex items-center gap-1.5">
                        <SeverityDot severity={inc.severity} />
                        <span className="text-xs font-semibold text-slate-700">{inc.severity}</span>
                      </span>
                    </td>
                    <td className="px-6 py-3"><StatusBadge status={inc.status} /></td>
                    <td className="px-6 py-3 text-xs text-slate-400">
                      {inc.created_at ? new Date(inc.created_at).toLocaleString() : '—'}
                    </td>
                    <td className="px-6 py-3">
                      <Link to="/admin/emergency" className="text-xs text-green-600 hover:text-green-700 font-semibold">View →</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
