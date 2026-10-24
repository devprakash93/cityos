import { useState, useEffect } from 'react';
import { useCity } from '../../context/CityContext';
import api from '../../api/axios';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Plus, Edit2, Trash2, RefreshCw, Droplets, Clock, AlertTriangle } from 'lucide-react';

export default function WaterSupplyManager() {
  const { selectedCity } = useCity();
  const [notices, setNotices] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState('NOTICES');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({});

  const fetchNotices = async () => {
    try {
      const res = await api.get('/water/notices/', {
        params: selectedCity ? { city: selectedCity.id } : {}
      });
      setNotices(res.data.results || res.data || []);
    } catch (err) { console.error(err); }
  };

  const fetchSchedules = async () => {
    try {
      const res = await api.get('/water/schedules/', {
        params: selectedCity ? { city: selectedCity.id } : {}
      });
      setSchedules(res.data.results || res.data || []);
    } catch (err) { console.error(err); }
  };

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchNotices(), fetchSchedules()]);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [selectedCity]);

  const handleOpenModal = (notice = null) => {
    if (notice) {
      setFormData({
        id: notice.id,
        title: notice.title,
        notice_type: notice.notice_type,
        description: notice.description,
        reason: notice.reason,
        status: notice.status,
        start_time: notice.start_time ? new Date(notice.start_time).toISOString().slice(0,16) : '',
        expected_restoration: notice.expected_restoration ? new Date(notice.expected_restoration).toISOString().slice(0,16) : '',
        ward: notice.ward || '',
        city: notice.city || selectedCity?.id || ''
      });
    } else {
      setFormData({
        title: '',
        notice_type: 'PLANNED_CUT',
        description: '',
        reason: '',
        status: 'UPCOMING',
        start_time: '',
        expected_restoration: '',
        ward: '',
        city: selectedCity?.id || ''
      });
    }
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...formData };
      if (!payload.ward) delete payload.ward;
      
      if (payload.id) {
        await api.patch(`/water/notices/${payload.id}/`, payload);
      } else {
        await api.post('/water/notices/', payload);
      }
      setShowModal(false);
      fetchNotices();
    } catch (err) {
      console.error(err);
      alert('Failed to save notice. Check console for details.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this notice?')) return;
    try {
      await api.delete(`/water/notices/${id}/`);
      fetchNotices();
    } catch (err) { console.error(err); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-500">
              <Droplets className="w-5 h-5 text-white" />
            </div>
            Water Supply Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">Manage notices and schedules for {selectedCity?.name || 'your city'}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchData} variant="outline"><RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh</Button>
          <Button onClick={() => handleOpenModal()} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" /> New Notice
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('NOTICES')}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors ${
            activeTab === 'NOTICES' ? 'border-blue-500 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Notices & Interruptions
        </button>
        <button
          onClick={() => setActiveTab('SCHEDULES')}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors ${
            activeTab === 'SCHEDULES' ? 'border-blue-500 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Daily Schedules
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        {loading ? (
          <p className="text-slate-500 text-center py-8">Loading...</p>
        ) : activeTab === 'NOTICES' ? (
          <div className="space-y-4">
            {notices.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <AlertTriangle className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                <p>No notices found for this city.</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {notices.map(notice => (
                  <Card key={notice.id} className="border border-slate-200 shadow-sm flex flex-col">
                    <CardHeader className="bg-slate-50 border-b border-slate-100 py-3 flex flex-row justify-between items-center">
                      <div className="font-semibold text-slate-800 text-sm truncate pr-2">{notice.title}</div>
                      <StatusBadge status={notice.status} />
                    </CardHeader>
                    <CardContent className="p-4 flex-1 flex flex-col justify-between text-sm">
                      <div className="space-y-2 mb-4">
                        <p className="text-slate-600 line-clamp-2">{notice.description}</p>
                        {notice.reason && <p className="text-slate-500"><span className="font-semibold text-slate-700">Reason:</span> {notice.reason}</p>}
                        <div className="flex items-center text-slate-500 gap-2 mt-2">
                          <Clock className="w-4 h-4" />
                          <span>
                            {new Date(notice.start_time).toLocaleDateString()} {new Date(notice.start_time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                          </span>
                        </div>
                        {notice.expected_restoration && (
                          <div className="text-blue-600 font-medium">
                            Expected: {new Date(notice.expected_restoration).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                          </div>
                        )}
                        <p className="text-xs text-slate-400 mt-2">Ward: {notice.ward_name || 'All'} | Type: {notice.notice_type}</p>
                      </div>
                      <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                        <Button variant="outline" size="sm" onClick={() => handleOpenModal(notice)}>
                          <Edit2 className="w-3 h-3 mr-1" /> Edit
                        </Button>
                        <Button variant="outline" size="sm" className="text-red-600 hover:bg-red-50" onClick={() => handleDelete(notice.id)}>
                          <Trash2 className="w-3 h-3 mr-1" /> Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-600">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b">
                <tr>
                  <th className="px-4 py-3">Ward</th>
                  <th className="px-4 py-3">Morning</th>
                  <th className="px-4 py-3">Evening</th>
                  <th className="px-4 py-3">Days</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {schedules.map(sched => (
                  <tr key={sched.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{sched.ward_name}</td>
                    <td className="px-4 py-3">{sched.morning_start} - {sched.morning_end}</td>
                    <td className="px-4 py-3">{sched.evening_start} - {sched.evening_end}</td>
                    <td className="px-4 py-3">{sched.days_of_supply}</td>
                  </tr>
                ))}
                {schedules.length === 0 && (
                  <tr><td colSpan="4" className="text-center py-8 text-slate-500">No schedules found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800">{formData.id ? 'Edit Notice' : 'Create Notice'}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 font-bold text-xl">&times;</button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                  <input type="text" required value={formData.title || ''} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                  <select value={formData.notice_type || ''} onChange={e => setFormData({...formData, notice_type: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="PLANNED_CUT">Planned Water Cut</option>
                    <option value="EMERGENCY_CUT">Emergency Water Cut</option>
                    <option value="LOW_PRESSURE">Low Water Pressure</option>
                    <option value="MAINTENANCE">Pipeline Maintenance</option>
                    <option value="CONTAMINATION">Contamination Alert</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                  <select value={formData.status || ''} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="UPCOMING">Upcoming</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="RESOLVED">Resolved</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                  <textarea required rows="2" value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Reason</label>
                  <input type="text" value={formData.reason || ''} onChange={e => setFormData({...formData, reason: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Start Time</label>
                  <input type="datetime-local" required value={formData.start_time || ''} onChange={e => setFormData({...formData, start_time: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Expected Restoration</label>
                  <input type="datetime-local" value={formData.expected_restoration || ''} onChange={e => setFormData({...formData, expected_restoration: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">City ID</label>
                  <input type="number" required value={formData.city || ''} onChange={e => setFormData({...formData, city: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Ward ID (Optional)</label>
                  <input type="number" value={formData.ward || ''} onChange={e => setFormData({...formData, ward: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">Save Notice</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
