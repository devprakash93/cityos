import { useState, useEffect } from 'react';
import { useCity } from '../../context/CityContext';
import api from '../../api/axios';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Plus, Edit2, Trash2, RefreshCw, Zap, Clock, AlertTriangle } from 'lucide-react';

export default function ElectricityManager() {
  const { selectedCity } = useCity();
  const [outages, setOutages] = useState([]);
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState('OUTAGES');
  const [showOutageModal, setShowOutageModal] = useState(false);
  const [showNoticeModal, setShowNoticeModal] = useState(false);
  const [formData, setFormData] = useState({});

  const fetchOutages = async () => {
    try {
      const res = await api.get('/electricity/outages/', {
        params: selectedCity ? { city_id: selectedCity.id } : {}
      });
      setOutages(res.data.results || res.data || []);
    } catch (err) { console.error(err); }
  };

  const fetchNotices = async () => {
    try {
      const res = await api.get('/electricity/notices/', {
        params: selectedCity ? { city_id: selectedCity.id } : {}
      });
      setNotices(res.data.results || res.data || []);
    } catch (err) { console.error(err); }
  };

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchOutages(), fetchNotices()]);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [selectedCity]);

  // Outage Handlers
  const handleOpenOutageModal = (outage = null) => {
    if (outage) {
      setFormData({
        id: outage.id,
        zone: outage.zone || '',
        cause: outage.cause,
        description: outage.description,
        affected_households: outage.affected_households,
        status: outage.status,
        estimated_restoration: outage.estimated_restoration ? new Date(outage.estimated_restoration).toISOString().slice(0,16) : '',
      });
    } else {
      setFormData({
        zone: '',
        cause: 'UNKNOWN',
        description: '',
        affected_households: 0,
        status: 'ACTIVE',
        estimated_restoration: '',
      });
    }
    setShowOutageModal(true);
  };

  const handleSaveOutage = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...formData };
      if (!payload.estimated_restoration) delete payload.estimated_restoration;
      
      if (payload.id) {
        await api.patch(`/electricity/outages/${payload.id}/`, payload);
      } else {
        await api.post('/electricity/outages/', payload);
      }
      setShowOutageModal(false);
      fetchOutages();
    } catch (err) {
      console.error(err);
      alert('Failed to save outage.');
    }
  };

  const handleDeleteOutage = async (id) => {
    if (!window.confirm('Delete this outage?')) return;
    try {
      await api.delete(`/electricity/outages/${id}/`);
      fetchOutages();
    } catch (err) { console.error(err); }
  };

  // Notice Handlers
  const handleOpenNoticeModal = (notice = null) => {
    if (notice) {
      setFormData({
        id: notice.id,
        title: notice.title,
        notice_type: notice.notice_type,
        description: notice.description,
        zone: notice.zone || '',
        ward: notice.ward || '',
        start_time: notice.start_time ? new Date(notice.start_time).toISOString().slice(0,16) : '',
        end_time: notice.end_time ? new Date(notice.end_time).toISOString().slice(0,16) : '',
        is_active: notice.is_active,
      });
    } else {
      setFormData({
        title: '',
        notice_type: 'ANNOUNCEMENT',
        description: '',
        zone: '',
        ward: '',
        start_time: '',
        end_time: '',
        is_active: true,
      });
    }
    setShowNoticeModal(true);
  };

  const handleSaveNotice = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...formData };
      if (!payload.zone) delete payload.zone;
      if (!payload.ward) delete payload.ward;
      if (!payload.end_time) delete payload.end_time;
      
      if (payload.id) {
        await api.patch(`/electricity/notices/${payload.id}/`, payload);
      } else {
        await api.post('/electricity/notices/', payload);
      }
      setShowNoticeModal(false);
      fetchNotices();
    } catch (err) {
      console.error(err);
      alert('Failed to save notice.');
    }
  };

  const handleDeleteNotice = async (id) => {
    if (!window.confirm('Delete this notice?')) return;
    try {
      await api.delete(`/electricity/notices/${id}/`);
      fetchNotices();
    } catch (err) { console.error(err); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <div className="p-2 rounded-lg bg-yellow-500">
              <Zap className="w-5 h-5 text-white" />
            </div>
            Electricity Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">Manage power outages and grid notices for {selectedCity?.name || 'your city'}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchData} variant="outline"><RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh</Button>
          <Button 
            onClick={() => activeTab === 'OUTAGES' ? handleOpenOutageModal() : handleOpenNoticeModal()} 
            className="bg-yellow-600 hover:bg-yellow-700"
          >
            <Plus className="w-4 h-4 mr-2" /> New {activeTab === 'OUTAGES' ? 'Outage' : 'Notice'}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('OUTAGES')}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors ${
            activeTab === 'OUTAGES' ? 'border-yellow-500 text-yellow-700' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Power Outages
        </button>
        <button
          onClick={() => setActiveTab('NOTICES')}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors ${
            activeTab === 'NOTICES' ? 'border-yellow-500 text-yellow-700' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Notices & Maintenance
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        {loading ? (
          <p className="text-slate-500 text-center py-8">Loading...</p>
        ) : activeTab === 'OUTAGES' ? (
          <div className="space-y-4">
            {outages.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <AlertTriangle className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                <p>No active power outages reported.</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {outages.map(outage => (
                  <Card key={outage.id} className="border border-slate-200 shadow-sm flex flex-col">
                    <CardHeader className="bg-slate-50 border-b border-slate-100 py-3 flex flex-row justify-between items-center">
                      <div className="font-semibold text-slate-800 text-sm truncate pr-2">{outage.cause.replace('_', ' ')}</div>
                      <StatusBadge status={outage.status} />
                    </CardHeader>
                    <CardContent className="p-4 flex-1 flex flex-col justify-between text-sm">
                      <div className="space-y-2 mb-4">
                        <p className="text-slate-600 line-clamp-2">{outage.description}</p>
                        <div className="flex items-center text-slate-500 gap-2 mt-2">
                          <Clock className="w-4 h-4" />
                          <span>Started: {new Date(outage.start_time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                        </div>
                        {outage.estimated_restoration && (
                          <div className="text-yellow-600 font-medium">
                            Expected: {new Date(outage.estimated_restoration).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                          </div>
                        )}
                        <p className="text-xs text-slate-400 mt-2">Zone: {outage.zone_name || 'Grid '+outage.zone} | Affected: {outage.affected_households}</p>
                      </div>
                      <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                        <Button variant="outline" size="sm" onClick={() => handleOpenOutageModal(outage)}>
                          <Edit2 className="w-3 h-3 mr-1" /> Edit
                        </Button>
                        <Button variant="outline" size="sm" className="text-red-600 hover:bg-red-50" onClick={() => handleDeleteOutage(outage.id)}>
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
          <div className="space-y-4">
            {notices.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <AlertTriangle className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                <p>No notices found.</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {notices.map(notice => (
                  <Card key={notice.id} className="border border-slate-200 shadow-sm flex flex-col">
                    <CardHeader className="bg-slate-50 border-b border-slate-100 py-3 flex flex-row justify-between items-center">
                      <div className="font-semibold text-slate-800 text-sm truncate pr-2">{notice.title}</div>
                      <span className={`px-2 py-1 text-xs rounded-full ${notice.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                        {notice.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </CardHeader>
                    <CardContent className="p-4 flex-1 flex flex-col justify-between text-sm">
                      <div className="space-y-2 mb-4">
                        <p className="text-slate-600 line-clamp-2">{notice.description}</p>
                        <div className="flex items-center text-slate-500 gap-2 mt-2">
                          <Clock className="w-4 h-4" />
                          <span>{new Date(notice.start_time).toLocaleDateString()} {new Date(notice.start_time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                        </div>
                        {notice.end_time && (
                          <div className="text-yellow-600 font-medium">
                            Until: {new Date(notice.end_time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                          </div>
                        )}
                        <p className="text-xs text-slate-400 mt-2">Ward: {notice.ward_name || 'All'} | Zone: {notice.zone_name || 'All'} | Type: {notice.notice_type}</p>
                      </div>
                      <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                        <Button variant="outline" size="sm" onClick={() => handleOpenNoticeModal(notice)}>
                          <Edit2 className="w-3 h-3 mr-1" /> Edit
                        </Button>
                        <Button variant="outline" size="sm" className="text-red-600 hover:bg-red-50" onClick={() => handleDeleteNotice(notice.id)}>
                          <Trash2 className="w-3 h-3 mr-1" /> Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* OUTAGE MODAL */}
      {showOutageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800">{formData.id ? 'Edit Outage' : 'Report Outage'}</h2>
              <button onClick={() => setShowOutageModal(false)} className="text-slate-400 hover:text-slate-600 font-bold text-xl">&times;</button>
            </div>
            
            <form onSubmit={handleSaveOutage} className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Grid Zone ID</label>
                  <input type="number" required value={formData.zone || ''} onChange={e => setFormData({...formData, zone: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none" />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                  <select value={formData.status || ''} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none">
                    <option value="ACTIVE">Active</option>
                    <option value="RESTORING">Being Restored</option>
                    <option value="RESOLVED">Resolved</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Cause</label>
                  <select value={formData.cause || ''} onChange={e => setFormData({...formData, cause: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none">
                    <option value="EQUIPMENT_FAILURE">Equipment Failure</option>
                    <option value="OVERLOAD">Overload</option>
                    <option value="MAINTENANCE">Planned Maintenance</option>
                    <option value="WEATHER">Weather Event</option>
                    <option value="ACCIDENT">Accident</option>
                    <option value="UNKNOWN">Unknown</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Affected Households</label>
                  <input type="number" value={formData.affected_households || 0} onChange={e => setFormData({...formData, affected_households: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none" />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                  <textarea rows="2" value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none" />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Estimated Restoration</label>
                  <input type="datetime-local" value={formData.estimated_restoration || ''} onChange={e => setFormData({...formData, estimated_restoration: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none" />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
                <Button type="button" variant="outline" onClick={() => setShowOutageModal(false)}>Cancel</Button>
                <Button type="submit" className="bg-yellow-600 hover:bg-yellow-700">Save Outage</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NOTICE MODAL */}
      {showNoticeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800">{formData.id ? 'Edit Notice' : 'Create Notice'}</h2>
              <button onClick={() => setShowNoticeModal(false)} className="text-slate-400 hover:text-slate-600 font-bold text-xl">&times;</button>
            </div>
            
            <form onSubmit={handleSaveNotice} className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                  <input type="text" required value={formData.title || ''} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none" />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Notice Type</label>
                  <select value={formData.notice_type || ''} onChange={e => setFormData({...formData, notice_type: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none">
                    <option value="MAINTENANCE">Scheduled Maintenance</option>
                    <option value="ANNOUNCEMENT">General Announcement</option>
                    <option value="OUTAGE_ALERT">Emergency Outage Alert</option>
                  </select>
                </div>

                <div className="flex items-center mt-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked})} className="w-4 h-4 text-yellow-600 border-gray-300 rounded focus:ring-yellow-500" />
                    <span className="text-sm font-medium text-slate-700">Is Active</span>
                  </label>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                  <textarea required rows="2" value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Start Time</label>
                  <input type="datetime-local" required value={formData.start_time || ''} onChange={e => setFormData({...formData, start_time: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">End Time</label>
                  <input type="datetime-local" value={formData.end_time || ''} onChange={e => setFormData({...formData, end_time: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Ward ID (Optional)</label>
                  <input type="number" value={formData.ward || ''} onChange={e => setFormData({...formData, ward: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Zone ID (Optional)</label>
                  <input type="number" value={formData.zone || ''} onChange={e => setFormData({...formData, zone: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none" />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
                <Button type="button" variant="outline" onClick={() => setShowNoticeModal(false)}>Cancel</Button>
                <Button type="submit" className="bg-yellow-600 hover:bg-yellow-700">Save Notice</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
