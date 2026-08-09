import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { FileText, ShieldAlert, Users, Clock, CheckCircle, Activity, LayoutDashboard, Map, BoxSelect } from 'lucide-react';

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
        console.error("Error fetching officer dashboard:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-64 bg-slate-200 rounded"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-slate-200 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!data) return <div>Failed to load dashboard data.</div>;

  const { kpi, recent_complaints, department } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {department?.name || 'Department'} Operations
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Command Center Overview
          </p>
        </div>
        <div className="flex items-center gap-3">
           <Button variant="outline" size="sm" onClick={() => window.location.href='/officer/map'}>
             <Map className="w-4 h-4 mr-2" />
             Live Map
           </Button>
           <Button variant="outline" size="sm" onClick={() => window.location.href='/officer/complaints'}>
             <FileText className="w-4 h-4 mr-2" />
             Manage Complaints
           </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white border border-slate-200/60 shadow-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Open Complaints</p>
              <p className="text-2xl font-bold text-slate-900">{kpi.open_complaints || 0}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-slate-200/60 shadow-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">In Progress</p>
              <p className="text-2xl font-bold text-slate-900">{kpi.in_progress || 0}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-slate-200/60 shadow-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-green-50 text-green-600 rounded-lg">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Resolved Today</p>
              <p className="text-2xl font-bold text-slate-900">{kpi.resolved_today || 0}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-slate-200/60 shadow-sm relative overflow-hidden">
          {kpi.sla_breaches > 0 && (
             <div className="absolute top-0 right-0 w-2 h-full bg-red-500"></div>
          )}
          <CardContent className="p-5 flex items-center gap-4">
            <div className={`p-3 rounded-lg ${kpi.sla_breaches > 0 ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600'}`}>
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">SLA Breaches</p>
              <div className="flex items-end gap-2">
                 <p className="text-2xl font-bold text-slate-900">{kpi.sla_breaches || 0}</p>
                 {kpi.sla_warnings > 0 && (
                   <span className="text-xs font-medium text-orange-600 mb-1">({kpi.sla_warnings} warnings)</span>
                 )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Complaints */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border border-slate-200/60 shadow-sm h-full">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-500" />
                  Recent Complaints
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => window.location.href='/officer/complaints'}>
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {recent_complaints?.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-600">
                    <thead className="text-xs text-slate-500 uppercase bg-white border-b">
                      <tr>
                        <th className="px-4 py-3 font-medium">Ref</th>
                        <th className="px-4 py-3 font-medium">Title</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        <th className="px-4 py-3 font-medium">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {recent_complaints.map((c) => (
                        <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 font-medium text-slate-900">#{c.reference_number}</td>
                          <td className="px-4 py-3 truncate max-w-[200px]" title={c.title}>{c.title}</td>
                          <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                          <td className="px-4 py-3 text-slate-500">
                            {new Date(c.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-500">
                  No recent complaints found.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Operational Status */}
        <div className="space-y-6">
          <Card className="border border-slate-200/60 shadow-sm h-full">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <LayoutDashboard className="w-4 h-4 text-slate-500" />
                Operational Status
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-6">
               
               <div>
                  <div className="flex justify-between items-end mb-2">
                     <span className="text-sm font-medium text-slate-600 flex items-center gap-2">
                        <Users className="w-4 h-4 text-blue-500" /> Available Workers
                     </span>
                     <span className="text-xl font-bold text-slate-900">{kpi.available_workers || 0}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                     <div className="bg-blue-500 h-2 rounded-full" style={{ width: '100%' }}></div>
                  </div>
               </div>

               <div>
                  <div className="flex justify-between items-end mb-2">
                     <span className="text-sm font-medium text-slate-600 flex items-center gap-2">
                        <BoxSelect className="w-4 h-4 text-indigo-500" /> Assigned Tasks
                     </span>
                     <span className="text-xl font-bold text-slate-900">{kpi.assigned_tasks || 0}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                     <div className="bg-indigo-500 h-2 rounded-full" style={{ width: '100%' }}></div>
                  </div>
               </div>

               {kpi.active_incidents !== undefined && (
                 <div>
                    <div className="flex justify-between items-end mb-2">
                       <span className="text-sm font-medium text-slate-600 flex items-center gap-2">
                          <ShieldAlert className="w-4 h-4 text-red-500" /> Active Incidents
                       </span>
                       <span className="text-xl font-bold text-red-600">{kpi.active_incidents || 0}</span>
                    </div>
                 </div>
               )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
