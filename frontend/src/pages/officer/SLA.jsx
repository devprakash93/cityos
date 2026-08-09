import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { ShieldAlert, AlertTriangle, Clock, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/Card';

export default function OfficerSLA() {
  const [breaches, setBreaches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBreaches = async () => {
      try {
        const res = await api.get('/complaints/', { params: { sla_breached: true, status: 'PENDING,ASSIGNED,IN_PROGRESS,ACCEPTED,ON_SITE,REVIEW' } });
        setBreaches(res.data.results || res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchBreaches();
  }, []);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">SLA Monitoring</h1>
        <p className="text-sm text-slate-500 mt-1">Track and manage Service Level Agreement breaches.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <Card className="bg-red-50 border-red-200">
           <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 bg-red-100 text-red-600 rounded-full">
                 <ShieldAlert className="w-8 h-8" />
              </div>
              <div>
                 <p className="text-sm font-bold text-red-800 uppercase tracking-wider">Active Breaches</p>
                 <p className="text-3xl font-black text-red-900">{breaches.length}</p>
              </div>
           </CardContent>
         </Card>
      </div>

      <Card>
         <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
               <AlertTriangle className="w-5 h-5 text-red-500" />
               Complaints Breaching SLA
            </h3>
            <Link to="/officer/complaints" className="text-sm text-blue-600 font-semibold hover:underline">
               View All Complaints
            </Link>
         </div>
         <div className="p-0">
            {loading ? (
               <div className="p-8 text-center text-slate-400">Loading SLA data...</div>
            ) : breaches.length === 0 ? (
               <div className="p-12 text-center text-slate-500">
                  <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
                  No active SLA breaches! Great job.
               </div>
            ) : (
               <div className="divide-y divide-slate-100">
                 {breaches.map(b => (
                    <div key={b.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                       <div>
                          <p className="font-bold text-slate-900">#{b.reference_number || b.id} - {b.title}</p>
                          <p className="text-sm text-slate-600 mt-1 flex items-center gap-2">
                             <Clock className="w-4 h-4 text-slate-400" />
                             Due: {new Date(b.sla_due_at).toLocaleString()}
                          </p>
                       </div>
                       <Link to={`/officer/complaints/${b.id}`} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100">
                          <ArrowRight className="w-5 h-5" />
                       </Link>
                    </div>
                 ))}
               </div>
            )}
         </div>
      </Card>
    </div>
  );
}
