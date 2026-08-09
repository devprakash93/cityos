import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Megaphone, Plus, Trash2 } from 'lucide-react';

export default function AnnouncementsManagement() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    category: 'CIVIC',
    scope_level: 'CITY',
  });

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const res = await api.get('/notifications/announcements/');
      if (res.data.results) {
        setAnnouncements(res.data.results);
      } else {
        setAnnouncements(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/notifications/announcements/', formData);
      setShowForm(false);
      setFormData({ title: '', message: '', category: 'CIVIC', scope_level: 'CITY' });
      fetchAnnouncements();
    } catch (err) {
      alert('Error creating announcement');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Global Announcements</h1>
          <p className="text-slate-400">Broadcast civic notices to citizens.</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="bg-primary-600 hover:bg-primary-700">
          <Plus className="w-4 h-4 mr-2" /> New Announcement
        </Button>
      </div>

      {showForm && (
        <Card className="glass-dark border-slate-700">
          <CardHeader>
            <CardTitle>Create Broadcast</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Title</label>
                <input 
                  type="text" required
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-lg p-2.5 text-white"
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Message</label>
                <textarea 
                  required rows={4}
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-lg p-2.5 text-white"
                  value={formData.message}
                  onChange={e => setFormData({...formData, message: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Category</label>
                  <select 
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-lg p-2.5 text-white"
                    value={formData.category}
                    onChange={e => setFormData({...formData, category: e.target.value})}
                  >
                    <option value="CIVIC">Civic Announcement</option>
                    <option value="TRAFFIC">Traffic Notice</option>
                    <option value="DISASTER">Disaster Alert</option>
                    <option value="WEATHER">Weather Alert</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Scope</label>
                  <select 
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-lg p-2.5 text-white"
                    value={formData.scope_level}
                    onChange={e => setFormData({...formData, scope_level: e.target.value})}
                  >
                    <option value="STATE">Statewide (Odisha)</option>
                    <option value="DISTRICT">District Level</option>
                    <option value="CITY">City Level</option>
                  </select>
                </div>
              </div>
              <div className="pt-4 flex gap-3">
                <Button type="submit" className="bg-primary-600">Broadcast</Button>
                <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {loading ? (
          <div className="text-slate-400 p-8 text-center animate-pulse">Loading announcements...</div>
        ) : announcements.length === 0 ? (
          <div className="text-slate-400 p-8 text-center border border-dashed border-slate-700 rounded-xl">No active announcements.</div>
        ) : (
          announcements.map((ann) => (
            <Card key={ann.id} className="glass-dark border-slate-700/50">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex gap-4">
                    <div className="p-3 bg-primary-500/10 rounded-xl shrink-0">
                      <Megaphone className="w-6 h-6 text-primary-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-bold text-white">{ann.title}</h3>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">{ann.scope_display}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/20">{ann.category_display}</span>
                      </div>
                      <p className="text-slate-300">{ann.message}</p>
                      <p className="text-xs text-slate-500 mt-3">Posted by {ann.created_by_name || 'System'} on {new Date(ann.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
