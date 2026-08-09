import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Clock, FileText, User, Bell, Shield } from 'lucide-react';

function getActivityIcon(type) {
  if (!type) return FileText;
  const t = type.toLowerCase();
  if (t.includes('complaint') || t.includes('status')) return FileText;
  if (t.includes('profile') || t.includes('user')) return User;
  if (t.includes('notification')) return Bell;
  if (t.includes('emergency') || t.includes('sos')) return Shield;
  return Clock;
}

export default function ActivityHistory() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivity = async () => {
      try {
        // Fetch complaint history as activity feed
        const [cmpRes] = await Promise.allSettled([
          api.get('/complaints/'),
        ]);

        const items = [];

        if (cmpRes.status === 'fulfilled') {
          const complaints = cmpRes.value.data?.results || cmpRes.value.data || [];
          complaints.forEach(c => {
            items.push({
              id: `complaint-created-${c.id}`,
              type: 'Complaint Created',
              description: `You submitted: "${c.title}"`,
              timestamp: c.created_at,
              icon: FileText,
              color: 'bg-primary-50 text-primary-600',
            });
            if (c.status !== 'PENDING') {
              items.push({
                id: `complaint-update-${c.id}`,
                type: 'Status Update',
                description: `Complaint "${c.title}" is now ${c.status}`,
                timestamp: c.updated_at,
                icon: FileText,
                color: 'bg-green-50 text-green-600',
              });
            }
          });
        }

        // Sort by timestamp desc
        items.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        setActivities(items.slice(0, 30));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchActivity();
  }, []);

  const groupByDate = (items) => {
    const groups = {};
    items.forEach(item => {
      const date = new Date(item.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
      if (!groups[date]) groups[date] = [];
      groups[date].push(item);
    });
    return groups;
  };

  const grouped = groupByDate(activities);

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">📅 Activity History</h1>
        <p className="text-slate-500 mt-1">A complete log of your activity on the CityOS platform.</p>
      </div>

      {loading ? (
        <div className="space-y-4 animate-pulse">
          {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-slate-100 rounded-xl" />)}
        </div>
      ) : activities.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-16 text-center shadow-sm">
          <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No activity recorded yet.</p>
        </div>
      ) : (
        Object.entries(grouped).map(([date, items]) => (
          <div key={date}>
            <div className="flex items-center gap-3 mb-3">
              <div className="h-px bg-slate-200 flex-1" />
              <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">{date}</span>
              <div className="h-px bg-slate-200 flex-1" />
            </div>
            <div className="space-y-2">
              {items.map(item => {
                const Icon = item.icon || Clock;
                return (
                  <div key={item.id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-start gap-3 shadow-sm">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${item.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-900">{item.type}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>
                    </div>
                    <span className="text-xs text-slate-400 shrink-0 mt-0.5">
                      {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
