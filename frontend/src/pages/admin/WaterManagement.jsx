import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCity } from '../../context/CityContext';
import api from '../../api/axios';
import { 
  Droplets, AlertTriangle, RefreshCw, Plus, Search, Filter, 
  MapPin, CheckCircle, Clock, ShieldAlert, ArrowUpRight, 
  Edit2, Power, Eye, Activity, Bell, X, Calendar
} from 'lucide-react';

export default function WaterManagement() {
  const { selectedCity } = useCity();
  const [activeTab, setActiveTab] = useState('sources'); // 'sources' | 'alerts' | 'notices' | 'complaints'
  
  // Data states
  const [sources, setSources] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [notices, setNotices] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  
  // Modals & form
  const [sourceModalOpen, setSourceModalOpen] = useState(false);
  const [noticeModalOpen, setNoticeModalOpen] = useState(false);
  const [editingSource, setEditingSource] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const [sourceForm, setSourceForm] = useState({
    name: '',
    source_type: 'RESERVOIR',
    capacity_million_liters: '5.0',
    is_active: true,
  });

  const [noticeForm, setNoticeForm] = useState({
    notice_type: 'PLANNED_CUT',
    title: '',
    description: '',
    start_time: new Date().toISOString().slice(0, 16),
    status: 'UPCOMING'
  });

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = selectedCity ? { city_id: selectedCity.id } : {};
      
      const [srcRes, alertRes, notRes, compRes] = await Promise.allSettled([
        api.get('/water/sources/', { params }),
        api.get('/water/alerts/', { params }),
        api.get('/water/notices/', { params }),
        api.get('/complaints/', { params: { category: 'WATER_SUPPLY,WATER_LEAKAGE,FLOODING' } }),
      ]);

      if (srcRes.status === 'fulfilled') {
        const d = srcRes.value.data.results ?? srcRes.value.data ?? [];
        setSources(Array.isArray(d) ? d : []);
      }
      if (alertRes.status === 'fulfilled') {
        const d = alertRes.value.data.results ?? alertRes.value.data ?? [];
        setAlerts(Array.isArray(d) ? d : []);
      }
      if (notRes.status === 'fulfilled') {
        const d = notRes.value.data.results ?? notRes.value.data ?? [];
        setNotices(Array.isArray(d) ? d : []);
      }
      if (compRes.status === 'fulfilled') {
        const d = compRes.value.data.results ?? compRes.value.data ?? [];
        setComplaints(Array.isArray(d) ? d : []);
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to load water supply data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedCity]);

  // Actions
  const handleToggleSourceActive = async (source) => {
    try {
      const res = await api.patch(`/water/sources/${source.id}/`, { is_active: !source.is_active });
      setSources(prev => prev.map(s => s.id === source.id ? { ...s, is_active: res.data.is_active } : s));
      showToast(`Source "${source.name}" marked ${res.data.is_active ? 'Active' : 'Inactive'}`);
    } catch (err) {
      console.error(err);
      showToast('Error updating source status', 'error');
    }
  };

  const handleResolveAlert = async (alertId) => {
    try {
      const res = await api.patch(`/water/alerts/${alertId}/`, { 
        status: 'RESOLVED',
        resolved_at: new Date().toISOString()
      });
      setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, ...res.data } : a));
      showToast('Water alert resolved successfully');
    } catch (err) {
      console.error(err);
      showToast('Failed to resolve alert', 'error');
    }
  };

  const handleSaveSource = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      if (editingSource) {
        const res = await api.patch(`/water/sources/${editingSource.id}/`, sourceForm);
        setSources(prev => prev.map(s => s.id === editingSource.id ? { ...s, ...res.data } : s));
        showToast('Water source updated successfully');
      } else {
        const res = await api.post('/water/sources/', sourceForm);
        setSources(prev => [res.data, ...prev]);
        showToast('Water source added successfully');
      }
      setSourceModalOpen(false);
      setEditingSource(null);
    } catch (err) {
      console.error(err);
      showToast('Failed to save water source', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveNotice = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const payload = {
        ...noticeForm,
        city: selectedCity?.id || 1
      };
      const res = await api.post('/water/notices/', payload);
      setNotices(prev => [res.data, ...prev]);
      showToast('Water interruption notice posted successfully');
      setNoticeModalOpen(false);
    } catch (err) {
      console.error(err);
      showToast('Failed to post supply notice', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Metrics
  const activeSources = sources.filter(s => s.is_active);
  const activeAlerts = alerts.filter(a => a.status === 'ACTIVE');
  const upcomingNotices = notices.filter(n => n.status !== 'RESOLVED');

  // Filtered lists
  const filteredSources = sources.filter(s => {
    const matchSearch = (s.name || '').toLowerCase().includes(search.toLowerCase()) ||
                        (s.location_address || '').toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === 'ALL' || s.source_type === typeFilter;
    const matchStatus = statusFilter === 'ALL' ||
                        (statusFilter === 'ACTIVE' && s.is_active) ||
                        (statusFilter === 'INACTIVE' && !s.is_active);
    return matchSearch && matchType && matchStatus;
  });

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-lg shadow-lg text-white font-medium text-sm flex items-center gap-2 ${
          toast.type === 'error' ? 'bg-red-600' : 'bg-emerald-600'
        }`}>
          {toast.type === 'error' ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-600 text-white shadow-sm">
              <Droplets className="w-6 h-6" />
            </div>
            Water Supply & Infrastructure
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {selectedCity?.name || 'All Odisha'} · Reservoirs, water quality telemetry, supply cuts, and leakages
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Link
            to="/admin/map?filter=water"
            className="px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-sm flex items-center gap-1.5"
          >
            <MapPin className="w-4 h-4 text-blue-600" />
            Command Map
          </Link>
          <button
            onClick={fetchData}
            className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 shadow-sm text-slate-600"
            title="Refresh records"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => {
              setNoticeModalOpen(true);
            }}
            className="px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-sm flex items-center gap-1.5"
          >
            <Bell className="w-4 h-4 text-amber-500" />
            Post Supply Notice
          </button>
          <button
            onClick={() => {
              setEditingSource(null);
              setSourceForm({ name: '', source_type: 'RESERVOIR', capacity_million_liters: '5.0', is_active: true });
              setSourceModalOpen(true);
            }}
            className="px-3.5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Add Water Source
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Water Sources</span>
            <Droplets className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{loading ? '—' : sources.length}</p>
          <p className="text-xs text-slate-500 mt-1">{activeSources.length} Operational facilities</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Quality Alerts</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-amber-600 mt-2">{loading ? '—' : activeAlerts.length}</p>
          <p className="text-xs text-slate-500 mt-1">Turbidity & low level flags</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Supply Cuts / Notices</span>
            <Activity className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-blue-600 mt-2">{loading ? '—' : upcomingNotices.length}</p>
          <p className="text-xs text-slate-500 mt-1">Maintenance & planned cuts</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Citizen Complaints</span>
            <Clock className="w-4 h-4 text-cyan-500" />
          </div>
          <p className="text-2xl font-bold text-cyan-600 mt-2">{loading ? '—' : complaints.length}</p>
          <p className="text-xs text-slate-500 mt-1">Leakage & pressure issues</p>
        </div>
      </div>

      {/* Main Tabs Container */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between flex-wrap gap-3">
          <div className="flex gap-6">
            <button
              onClick={() => { setActiveTab('sources'); setStatusFilter('ALL'); }}
              className={`py-4 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
                activeTab === 'sources'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Droplets className="w-4 h-4" />
              Water Sources ({sources.length})
            </button>
            <button
              onClick={() => { setActiveTab('alerts'); setStatusFilter('ALL'); }}
              className={`py-4 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
                activeTab === 'alerts'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              Quality & Level Alerts ({alerts.length})
            </button>
            <button
              onClick={() => { setActiveTab('notices'); setStatusFilter('ALL'); }}
              className={`py-4 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
                activeTab === 'notices'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Calendar className="w-4 h-4" />
              Supply Notices ({notices.length})
            </button>
            <button
              onClick={() => { setActiveTab('complaints'); setStatusFilter('ALL'); }}
              className={`py-4 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
                activeTab === 'complaints'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
              Citizen Complaints ({complaints.length})
            </button>
          </div>

          {/* Search and Filters */}
          <div className="py-2.5 flex items-center gap-2.5 flex-wrap">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search sources, locations..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 w-44 sm:w-56"
              />
            </div>
            {activeTab === 'sources' && (
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">All Source Types</option>
                <option value="RESERVOIR">Reservoir</option>
                <option value="TREATMENT_PLANT">Treatment Plant</option>
                <option value="TANK">Overhead Tank</option>
                <option value="BOREWELL">Borewell</option>
              </select>
            )}
          </div>
        </div>

        {/* Tab 1: Water Sources Table */}
        {activeTab === 'sources' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5 text-left">Facility Name</th>
                  <th className="px-6 py-3.5 text-left">Type</th>
                  <th className="px-6 py-3.5 text-left">Capacity (ML)</th>
                  <th className="px-6 py-3.5 text-left">Current Water Level</th>
                  <th className="px-6 py-3.5 text-left">Water Quality (pH / NTU)</th>
                  <th className="px-6 py-3.5 text-left">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  [...Array(4)].map((_, i) => (
                    <tr key={i}>
                      <td colSpan="7" className="px-6 py-4">
                        <div className="h-4 bg-slate-100 rounded animate-pulse" />
                      </td>
                    </tr>
                  ))
                ) : filteredSources.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-slate-400">
                      No water facilities found matching the filters.
                    </td>
                  </tr>
                ) : (
                  filteredSources.map(src => {
                    const r = src.latest_reading;
                    const level = r ? parseFloat(r.level_percent) : null;
                    return (
                      <tr key={src.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-3.5 font-medium text-slate-900">
                          {src.name}
                          <div className="text-[11px] text-slate-400 font-normal">
                            {src.location_address || 'Central Water Works'}, {src.city_name || selectedCity?.name || 'Odisha'}
                          </div>
                        </td>
                        <td className="px-6 py-3.5">
                          <span className="inline-flex px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            {src.source_type?.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-xs font-semibold text-slate-700">
                          {src.capacity_million_liters} ML
                        </td>
                        <td className="px-6 py-3.5 text-xs">
                          {level !== null ? (
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full ${
                                    level < 25 ? 'bg-red-500' : level < 50 ? 'bg-amber-500' : 'bg-blue-500'
                                  }`} 
                                  style={{ width: `${Math.min(level, 100)}%` }}
                                />
                              </div>
                              <span className="font-semibold text-slate-700">{level}%</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs">No IoT reading</span>
                          )}
                        </td>
                        <td className="px-6 py-3.5 text-xs">
                          {r && (r.ph || r.turbidity_ntu) ? (
                            <div className="space-y-0.5 text-[11px]">
                              {r.ph && <div>pH: <span className="font-semibold text-slate-700">{r.ph}</span></div>}
                              {r.turbidity_ntu && <div>Turbidity: <span className="font-semibold text-slate-700">{r.turbidity_ntu} NTU</span></div>}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs">No quality data</span>
                          )}
                        </td>
                        <td className="px-6 py-3.5">
                          <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${
                            src.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {src.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setEditingSource(src);
                                setSourceForm({
                                  name: src.name,
                                  source_type: src.source_type,
                                  capacity_million_liters: src.capacity_million_liters,
                                  is_active: src.is_active
                                });
                                setSourceModalOpen(true);
                              }}
                              className="p-1 text-slate-500 hover:text-blue-600 rounded hover:bg-slate-100"
                              title="Edit Source"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleToggleSourceActive(src)}
                              className={`p-1 rounded ${
                                src.is_active ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'
                              }`}
                              title={src.is_active ? 'Deactivate Source' : 'Activate Source'}
                            >
                              <Power className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Alerts */}
        {activeTab === 'alerts' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5 text-left">Alert Type</th>
                  <th className="px-6 py-3.5 text-left">Source Facility</th>
                  <th className="px-6 py-3.5 text-left">Message</th>
                  <th className="px-6 py-3.5 text-left">Status</th>
                  <th className="px-6 py-3.5 text-left">Triggered At</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {alerts.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-slate-400">
                      No water quality or level alerts recorded.
                    </td>
                  </tr>
                ) : (
                  alerts.map(a => (
                    <tr key={a.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-3.5 font-medium text-slate-900">
                        {a.alert_type?.replace(/_/g, ' ')}
                      </td>
                      <td className="px-6 py-3.5 text-xs text-slate-700 font-semibold">
                        {a.source_name || `Source #${a.source}`}
                      </td>
                      <td className="px-6 py-3.5 text-xs text-slate-600 max-w-sm truncate">
                        {a.message}
                      </td>
                      <td className="px-6 py-3.5">
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${
                          a.status === 'ACTIVE' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          {a.status}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-xs text-slate-400">
                        {a.triggered_at ? new Date(a.triggered_at).toLocaleString() : '—'}
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        {a.status === 'ACTIVE' ? (
                          <button
                            onClick={() => handleResolveAlert(a.id)}
                            className="px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200"
                          >
                            Mark Resolved
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">Resolved</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: Supply Notices */}
        {activeTab === 'notices' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5 text-left">Notice Title</th>
                  <th className="px-6 py-3.5 text-left">Type</th>
                  <th className="px-6 py-3.5 text-left">Affected Area</th>
                  <th className="px-6 py-3.5 text-left">Start Time</th>
                  <th className="px-6 py-3.5 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {notices.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-slate-400">
                      No water supply interruption notices currently active.
                    </td>
                  </tr>
                ) : (
                  notices.map(n => (
                    <tr key={n.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-3.5 font-medium text-slate-900">
                        {n.title}
                        <div className="text-[11px] text-slate-400 font-normal">{n.description}</div>
                      </td>
                      <td className="px-6 py-3.5">
                        <span className="inline-flex px-2 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          {n.notice_type?.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-xs text-slate-600">
                        {n.city_name || selectedCity?.name || 'City-wide'} {n.ward_name ? `· ${n.ward_name}` : ''}
                      </td>
                      <td className="px-6 py-3.5 text-xs text-slate-500">
                        {n.start_time ? new Date(n.start_time).toLocaleString() : '—'}
                      </td>
                      <td className="px-6 py-3.5">
                        <span className="inline-flex px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          {n.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 4: Complaints */}
        {activeTab === 'complaints' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5 text-left">Ref Number</th>
                  <th className="px-6 py-3.5 text-left">Category</th>
                  <th className="px-6 py-3.5 text-left">Title / Location</th>
                  <th className="px-6 py-3.5 text-left">Citizen</th>
                  <th className="px-6 py-3.5 text-left">Priority</th>
                  <th className="px-6 py-3.5 text-left">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {complaints.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-slate-400">
                      No water supply or leakage complaints reported.
                    </td>
                  </tr>
                ) : (
                  complaints.map(comp => (
                    <tr key={comp.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-3.5 font-mono text-xs font-semibold text-slate-700">
                        {comp.reference_number || `#${comp.id}`}
                      </td>
                      <td className="px-6 py-3.5 text-xs text-slate-600">
                        {comp.category?.replace(/_/g, ' ')}
                      </td>
                      <td className="px-6 py-3.5 text-xs text-slate-700 max-w-sm truncate">
                        <div className="font-semibold text-slate-900">{comp.title}</div>
                        <div className="text-slate-400 text-[11px]">{comp.address}</div>
                      </td>
                      <td className="px-6 py-3.5 text-xs text-slate-600">
                        {comp.citizen_name || comp.citizen?.full_name || 'Citizen'}
                      </td>
                      <td className="px-6 py-3.5">
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${
                          comp.priority === 'CRITICAL' ? 'bg-red-100 text-red-700' :
                          comp.priority === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {comp.priority}
                        </span>
                      </td>
                      <td className="px-6 py-3.5">
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${
                          comp.status === 'RESOLVED' ? 'bg-green-100 text-green-700' :
                          comp.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                          'bg-orange-100 text-orange-700'
                        }`}>
                          {comp.status}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <Link
                          to={`/admin/complaints/${comp.id}`}
                          className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
                        >
                          View <ArrowUpRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Add/Edit Water Source */}
      {sourceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-lg">
                {editingSource ? 'Edit Water Facility' : 'Add Water Facility / Reservoir'}
              </h3>
              <button onClick={() => setSourceModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSource} className="space-y-4 mt-4">
              <div>
                <label className="text-xs font-semibold text-slate-700">Facility / Source Name</label>
                <input
                  type="text"
                  value={sourceForm.name}
                  onChange={(e) => setSourceForm({ ...sourceForm, name: e.target.value })}
                  placeholder="e.g. Mahanadi Intake Water Treatment Plant"
                  className="w-full text-sm mt-1 px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Source Type</label>
                  <select
                    value={sourceForm.source_type}
                    onChange={(e) => setSourceForm({ ...sourceForm, source_type: e.target.value })}
                    className="w-full text-sm mt-1 px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="RESERVOIR">Reservoir</option>
                    <option value="TREATMENT_PLANT">Treatment Plant</option>
                    <option value="TANK">Overhead Tank</option>
                    <option value="BOREWELL">Borewell</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Capacity (Million Liters)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={sourceForm.capacity_million_liters}
                    onChange={(e) => setSourceForm({ ...sourceForm, capacity_million_liters: e.target.value })}
                    className="w-full text-sm mt-1 px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="sourceActive"
                  checked={sourceForm.is_active}
                  onChange={(e) => setSourceForm({ ...sourceForm, is_active: e.target.checked })}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="sourceActive" className="text-xs font-medium text-slate-700">
                  Active Monitoring Status
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSourceModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm disabled:opacity-50"
                >
                  {actionLoading ? 'Saving...' : 'Save Source'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Post Supply Notice */}
      {noticeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-lg">Post Water Supply Interruption Notice</h3>
              <button onClick={() => setNoticeModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNotice} className="space-y-4 mt-4">
              <div>
                <label className="text-xs font-semibold text-slate-700">Notice Type</label>
                <select
                  value={noticeForm.notice_type}
                  onChange={(e) => setNoticeForm({ ...noticeForm, notice_type: e.target.value })}
                  className="w-full text-sm mt-1 px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="PLANNED_CUT">Planned Water Cut</option>
                  <option value="EMERGENCY_CUT">Emergency Water Cut</option>
                  <option value="LOW_PRESSURE">Low Pressure Advisory</option>
                  <option value="MAINTENANCE">Pipeline Maintenance</option>
                  <option value="CONTAMINATION">Contamination Alert</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Title</label>
                <input
                  type="text"
                  value={noticeForm.title}
                  onChange={(e) => setNoticeForm({ ...noticeForm, title: e.target.value })}
                  placeholder="e.g. Scheduled Maintenance on Pipeline Ward 4–8"
                  className="w-full text-sm mt-1 px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Description & Restoration Time</label>
                <textarea
                  value={noticeForm.description}
                  onChange={(e) => setNoticeForm({ ...noticeForm, description: e.target.value })}
                  placeholder="Supply will be affected from 10 AM to 4 PM. Water tankers deployed..."
                  rows="3"
                  className="w-full text-sm mt-1 px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setNoticeModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm disabled:opacity-50"
                >
                  {actionLoading ? 'Publishing...' : 'Publish Notice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
