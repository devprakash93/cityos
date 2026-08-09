import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import api from '../../api/axios';
import { Bell, CheckCircle, Info, AlertTriangle } from 'lucide-react';

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications/');
      if (res.data?.results) {
        setNotifications(res.data.results);
      } else if (Array.isArray(res.data)) {
        setNotifications(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markAsRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read/`);
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
    } catch (err) {
      console.error('Failed to mark as read', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.post('/notifications/mark-all-read/');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('Failed to mark all as read', err);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'SYSTEM': return <Info className="w-5 h-5 text-blue-500" />;
      case 'ALERT': return <AlertTriangle className="w-5 h-5 text-red-500" />;
      default: return <Bell className="w-5 h-5 text-primary-500" />;
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
          <p className="text-slate-500 mt-1">Stay updated on your activities and system alerts.</p>
        </div>
        <Button variant="outline" onClick={markAllAsRead}>Mark all as read</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-slate-500 animate-pulse">Loading notifications...</div>
          ) : notifications.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center">
              <div className="p-4 bg-slate-50 rounded-full mb-4">
                <CheckCircle className="w-8 h-8 text-slate-300" />
              </div>
              <p className="text-slate-500">You're all caught up!</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {notifications.map((n) => (
                <div key={n.id} className={`p-4 flex gap-4 transition-colors ${n.is_read ? 'bg-white opacity-60' : 'bg-slate-50'}`}>
                  <div className="mt-1 flex-shrink-0">
                    {getIcon(n.notification_type)}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-slate-900">{n.title}</h4>
                    <p className="text-sm text-slate-600 mt-1">{n.message}</p>
                    <p className="text-xs text-slate-400 mt-2">
                      {new Date(n.created_at).toLocaleString()}
                    </p>
                  </div>
                  {!n.is_read && (
                    <div className="flex items-center">
                      <Button size="sm" variant="outline" onClick={() => markAsRead(n.id)}>
                        Mark Read
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
