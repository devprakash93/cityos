import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Megaphone, Calendar, Tag } from 'lucide-react';

export default function Announcements() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Try fetching from notifications with type filter, as backend may not have a standalone announcements API
    const fetchData = async () => {
      try {
        const res = await api.get('/notifications/?notification_type=ANNOUNCEMENT');
        const data = res.data?.results || res.data || [];
        setAnnouncements(data);
      } catch (e) {
        // Fallback: fetch all notifications and filter client-side
        try {
          const res = await api.get('/notifications/');
          const all = res.data?.results || res.data || [];
          setAnnouncements(all.filter(n => n.notification_type === 'ANNOUNCEMENT' || n.notification_type === 'SYSTEM'));
        } catch (e2) {
          console.error(e2);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Mock announcements for demo if empty
  const displayAnnouncements = announcements.length > 0 ? announcements : [
    {
      id: 1,
      title: 'Road Maintenance — Main Street',
      message: 'Main Street from Junction A to Junction B will be under maintenance from August 10-12. Please use alternate routes.',
      notification_type: 'ANNOUNCEMENT',
      created_at: new Date().toISOString(),
    },
    {
      id: 2,
      title: 'Water Supply Interruption — Zone C',
      message: 'Due to pipeline upgrade work, water supply in Zone C will be interrupted on August 9 from 10 AM to 4 PM.',
      notification_type: 'ALERT',
      created_at: new Date(Date.now() - 86400000).toISOString(),
    },
  ];

  const typeConfig = {
    ANNOUNCEMENT: { color: 'bg-blue-100 text-blue-700 border-blue-200', dot: 'bg-blue-500', label: 'Announcement' },
    ALERT: { color: 'bg-red-100 text-red-700 border-red-200', dot: 'bg-red-500', label: 'Alert' },
    SYSTEM: { color: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400', label: 'System' },
    INFO: { color: 'bg-green-100 text-green-700 border-green-200', dot: 'bg-green-500', label: 'Info' },
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">📢 City Announcements</h1>
        <p className="text-slate-500 mt-1">Official communications from city departments and government.</p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm animate-pulse h-28" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {displayAnnouncements.map(ann => {
            const config = typeConfig[ann.notification_type] || typeConfig.SYSTEM;
            return (
              <div key={ann.id} className={`bg-white border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow ${config.color.includes('border') ? '' : 'border-slate-200'}`}>
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${config.color}`}>
                    <Megaphone className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                      <h3 className="font-bold text-slate-900">{ann.title}</h3>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.color}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
                        {config.label}
                      </span>
                    </div>
                    <p className="text-slate-600 text-sm leading-relaxed">{ann.message}</p>
                    <div className="flex items-center gap-2 mt-3 text-xs text-slate-400">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{new Date(ann.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
