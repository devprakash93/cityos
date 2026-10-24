import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCity } from '../../context/CityContext';
import api from '../../api/axios';
import { 
  Zap, AlertTriangle, RefreshCw, Plus, Search, Filter, 
  MapPin, CheckCircle, Clock, ShieldAlert, ArrowUpRight, 
  Edit2, Power, Eye, Activity, Bell, X, Flame
} from 'lucide-react';

export default function ElectricityManagement() {
  const { selectedCity } = useCity();
  const [activeTab, setActiveTab] = useState('zones'); // 'zones' | 'outages' | 'notices' | 'complaints'
  
  // Data states
  const [zones, setZones] = useState([]);
  const [outages, setOutages] = useState([]);
  const [notices, setNotices] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  
  // Modals & form
  const [zoneModalOpen, setZoneModalOpen] = useState(false);
  const [outageModalOpen, setOutageModalOpen] = useState(false);
  const [editingZone, setEditingZone] = useState(null);
  const [statusModalOutage, setStatusModalOutage] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const [zoneForm, setZoneForm] = useState({
    name: '',
    code: '',
    max_load_kw: '1500.00',
    total_consumers: 2500,
    is_active: true,
  });

  const [outageForm, setOutageForm] = useState({
    zone: '',
    cause: 'EQUIPMENT_FAILURE',
    description: '',
    affected_households: 150,
    status: 'ACTIVE'
  });

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = selectedCity ? { city_id: selectedCity.id } : {};
      
      const [zonesRes, outagesRes, notRes, compRes] = await Promise.allSettled([
        api.get('/electricity/zones/', { params }),
        api.get('/electricity/outages/', { params }),
        api.get('/electricity/notices/', { params }),
        api.get('/complaints/', { params: { category: 'ELECTRICITY,STREET_LIGHT' } }),
      ]);

      if (zonesRes.status === 'fulfilled') {
        const d = zonesRes.value.data.results ?? zonesRes.value.data ?? [];
        setZones(Array.isArray(d) ? d : []);
      }
      if (outagesRes.status === 'fulfilled') {
        const d = outagesRes.value.data.results ?? outagesRes.value.data ?? [];
        setOutages(Array.isArray(d) ? d : []);
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
      showToast('Failed to load electricity service data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedCity]);

  // Actions
  const handleToggleZoneActive = async (zone) => {
    try {
      const res = await api.patch(`/electricity/zones/${zone.id}/`, { is_active: !zone.is_active });
      setZones(prev => prev.map(z => z.id === zone.id ? { ...z, is_active: res.data.is_active } : z));
      showToast(`Grid zone "${zone.name}" marked ${res.data.is_active ? 'Active' : 'Inactive'}`);
    } catch (err) {
      console.error(err);
      showToast('Error updating zone status', 'error');
    }
  };

  const handleUpdateOutageStatus = async (outageId, newStatus) => {
    setActionLoading(true);
    try {
      const payload = {
        status: newStatus,
        ...(newStatus === 'RESOLVED' ? { end_time: new Date().toISOString() } : {})
      };
      const res = await api.patch(`/electricity/outages/${outageId}/`, payload);
      setOutages(prev => prev.map(o => o.id === outageId ? { ...o, ...res.data } : o));
      showToast(`Power outage status updated to ${newStatus}`);
      setStatusModalOutage(null);
    } catch (err) {
      console.error(err);
      showToast('Failed to update outage status', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveZone = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      if (editingZone) {
        const res = await api.patch(`/electricity/zones/${editingZone.id}/`, zoneForm);
        setZones(prev => prev.map(z => z.id === editingZone.id ? { ...z, ...res.data } : z));
        showToast('Grid zone updated successfully');
      } else {
        const res = await api.post('/electricity/zones/', zoneForm);
        setZones(prev => [res.data, ...prev]);
        showToast('Grid zone created successfully');
      }
      setZoneModalOpen(false);
      setEditingZone(null);
    } catch (err) {
      console.error(err);
      showToast('Failed to save grid zone', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveOutage = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const payload = {
        ...outageForm,
        zone: outageForm.zone ? parseInt(outageForm.zone, 10) : (zones[0]?.id || 1)
      };
      const res = await api.post('/electricity/outages/', payload);
      setOutages(prev => [res.data, ...prev]);
      showToast('Power outage logged successfully');
      setOutageModalOpen(false);
    } catch (err) {
      console.error(err);
      showToast('Failed to log power outage', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Metrics
  const activeOutages = outages.filter(o => o.status === 'ACTIVE' || o.status === 'RESTORING');
  const overloadedZones = zones.filter(z => z.latest_reading?.overload_flag || (parseFloat(z.latest_reading?.load_percent) >= 85));
  const totalConsumers = zones.reduce((acc, z) => acc + (z.total_consumers || 0), 0);

  // Filtered lists
  const filteredZones = zones.filter(z => {
    const matchSearch = (z.name || '').toLowerCase().includes(search.toLowerCase()) ||
                        (z.code || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'ALL' ||
                        (statusFilter === 'ACTIVE' && z.is_active) ||
                        (statusFilter === 'INACTIVE' && !z.is_active);
    return matchSearch && matchStatus;
  });

  const filteredOutages = outages.filter(o => {
    const matchSearch = (o.description || '').toLowerCase().includes(search.toLowerCase()) ||
                        (o.zone_name || '').toLowerCase().includes(search.toLowerCase()) ||
                        (o.cause || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || o.status === statusFilter;
    return matchSearch && matchStatus;
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
            <div className="p-2 rounded-lg bg-yellow-500 text-white shadow-sm">
              <Zap className="w-6 h-6" />
            </div>
            Electricity & Power Grid
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {selectedCity?.name || 'All Odisha'} · Substation grid load, outage resolution, and maintenance schedules
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Link
            to="/admin/map?filter=electricity"
            className="px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-sm flex items-center gap-1.5"
          >
            <MapPin className="w-4 h-4 text-yellow-500" />
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
              setOutageForm({
                zone: zones[0]?.id || '',
                cause: 'EQUIPMENT_FAILURE',
                description: '',
                affected_households: 150,
                status: 'ACTIVE'
              });
              setOutageModalOpen(true);
            }}
            className="px-3.5 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm flex items-center gap-1.5"
          >
            <AlertTriangle className="w-4 h-4" />
            Report Power Outage
          </button>
          <button
            onClick={() => {
              setEditingZone(null);
              setZoneForm({ name: '', code: '', max_load_kw: '1500.00', total_consumers: 2500, is_active: true });
              setZoneModalOpen(true);
            }}
            className="px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-sm flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4 text-slate-500" />
            Add Grid Zone
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Grid Substations</span>
            <Zap className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{loading ? '—' : zones.length}</p>
          <p className="text-xs text-slate-500 mt-1">{totalConsumers.toLocaleString()} Total consumers</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Outages</span>
            <AlertTriangle className="w-4 h-4 text-red-500" />
          </div>
          <p className="text-2xl font-bold text-red-600 mt-2">{loading ? '—' : activeOutages.length}</p>
          <p className="text-xs text-slate-500 mt-1">
            {outages.filter(o => o.status === 'RESTORING').length} In restoration progress
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Grid Overloads</span>
            <Flame className="w-4 h-4 text-orange-500" />
          </div>
          <p className="text-2xl font-bold text-orange-600 mt-2">{loading ? '—' : overloadedZones.length}</p>
          <p className="text-xs text-slate-500 mt-1">&ge; 85% maximum load</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Citizen Complaints</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-blue-600 mt-2">{loading ? '—' : complaints.length}</p>
          <p className="text-xs text-slate-500 mt-1">Power cuts & streetlights</p>
        </div>
      </div>

      {/* Main Tabs Container */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between flex-wrap gap-3">
          <div className="flex gap-6">
            <button
              onClick={() => { setActiveTab('zones'); setStatusFilter('ALL'); }}
              className={`py-4 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
                activeTab === 'zones'
                  ? 'border-yellow-500 text-yellow-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Zap className="w-4 h-4" />
              Grid Zones ({zones.length})
            </button>
            <button
              onClick={() => { setActiveTab('outages'); setStatusFilter('ALL'); }}
              className={`py-4 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
                activeTab === 'outages'
                  ? 'border-yellow-500 text-yellow-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              Power Outages ({outages.length})
            </button>
            <button
              onClick={() => { setActiveTab('notices'); setStatusFilter('ALL'); }}
              className={`py-4 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
                activeTab === 'notices'
                  ? 'border-yellow-500 text-yellow-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Bell className="w-4 h-4" />
              Maintenance Notices ({notices.length})
            </button>
            <button
              onClick={() => { setActiveTab('complaints'); setStatusFilter('ALL'); }}
              className={`py-4 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
                activeTab === 'complaints'
                  ? 'border-yellow-500 text-yellow-700'
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
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-yellow-500 w-44 sm:w-56"
              />
            </div>
            {activeTab === 'outages' && (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-yellow-500"
              >
                <option value="ALL">All Outage Status</option>
                <option value="ACTIVE">Active</option>
                <option value="RESTORING">Being Restored</option>
                <option value="RESOLVED">Resolved</option>
              </select>
            )}
          </div>
        </div>

        {/* Tab 1: Grid Zones Table */}
        {activeTab === 'zones' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5 text-left">Substation / Zone</th>
                  <th className="px-6 py-3.5 text-left">Code</th>
                  <th className="px-6 py-3.5 text-left">Max Capacity</th>
                  <th className="px-6 py-3.5 text-left">Current Load %</th>
                  <th className="px-6 py-3.5 text-left">Consumers</th>
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
                ) : filteredZones.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-slate-400">
                      No electricity grid zones found matching filters.
                    </td>
                  </tr>
                ) : (
                  filteredZones.map(zone => {
                    const r = zone.latest_reading;
                    const loadP = r ? parseFloat(r.load_percent) : 0;
                    return (
                      <tr key={zone.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-3.5 font-medium text-slate-900">
                          {zone.name}
                          <div className="text-[11px] text-slate-400 font-normal">{zone.city_name || selectedCity?.name || 'Odisha'}</div>
                        </td>
                        <td className="px-6 py-3.5 text-xs font-mono font-semibold text-slate-600">
                          {zone.code}
                        </td>
                        <td className="px-6 py-3.5 text-xs font-semibold text-slate-700">
                          {zone.max_load_kw} kW
                        </td>
                        <td className="px-6 py-3.5 text-xs">
                          {r ? (
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full ${
                                    loadP >= 85 ? 'bg-red-500' : loadP >= 60 ? 'bg-amber-500' : 'bg-emerald-500'
                                  }`} 
                                  style={{ width: `${Math.min(loadP, 100)}%` }}
                                />
                              </div>
                              <span className={`font-semibold ${loadP >= 85 ? 'text-red-600' : 'text-slate-700'}`}>
                                {loadP}% ({r.load_kw} kW)
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs">No sensor reading</span>
                          )}
                        </td>
                        <td className="px-6 py-3.5 text-xs text-slate-600">
                          {zone.total_consumers?.toLocaleString() || 0}
                        </td>
                        <td className="px-6 py-3.5">
                          <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${
                            zone.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {zone.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setEditingZone(zone);
                                setZoneForm({
                                  name: zone.name,
                                  code: zone.code,
                                  max_load_kw: zone.max_load_kw,
                                  total_consumers: zone.total_consumers,
                                  is_active: zone.is_active
                                });
                                setZoneModalOpen(true);
                              }}
                              className="p-1 text-slate-500 hover:text-yellow-600 rounded hover:bg-slate-100"
                              title="Edit Zone"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleToggleZoneActive(zone)}
                              className={`p-1 rounded ${
                                zone.is_active ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'
                              }`}
                              title={zone.is_active ? 'Deactivate Zone' : 'Activate Zone'}
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

        {/* Tab 2: Power Outages Table */}
        {activeTab === 'outages' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5 text-left">Outage Cause</th>
                  <th className="px-6 py-3.5 text-left">Grid Zone</th>
                  <th className="px-6 py-3.5 text-left">Affected Homes</th>
                  <th className="px-6 py-3.5 text-left">Status</th>
                  <th className="px-6 py-3.5 text-left">Started At</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOutages.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-slate-400">
                      No power outage events reported.
                    </td>
                  </tr>
                ) : (
                  filteredOutages.map(o => (
                    <tr key={o.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-3.5 font-medium text-slate-900">
                        {o.cause?.replace(/_/g, ' ')}
                        <div className="text-[11px] text-slate-400 font-normal">{o.description || 'Power interruption'}</div>
                      </td>
                      <td className="px-6 py-3.5 text-xs text-slate-700 font-semibold">
                        {o.zone_name || `Zone #${o.zone}`}
                      </td>
                      <td className="px-6 py-3.5 text-xs text-slate-700 font-semibold">
                        {o.affected_households} Households
                      </td>
                      <td className="px-6 py-3.5">
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${
                          o.status === 'ACTIVE' ? 'bg-red-50 text-red-700 border border-red-200' :
                          o.status === 'RESTORING' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                          'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          {o.status}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-xs text-slate-400">
                        {o.start_time ? new Date(o.start_time).toLocaleString() : '—'}
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <button
                          onClick={() => setStatusModalOutage(o)}
                          className="px-2.5 py-1 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded border border-amber-200"
                        >
                          Update Status
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: Maintenance Notices */}
        {activeTab === 'notices' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5 text-left">Notice Title</th>
                  <th className="px-6 py-3.5 text-left">Type</th>
                  <th className="px-6 py-3.5 text-left">Target Area</th>
                  <th className="px-6 py-3.5 text-left">Time Window</th>
                  <th className="px-6 py-3.5 text-left">Active Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {notices.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-slate-400">
                      No electricity maintenance notices scheduled.
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
                        {n.zone_name || n.ward_name || selectedCity?.name || 'City-wide'}
                      </td>
                      <td className="px-6 py-3.5 text-xs text-slate-500">
                        {n.start_time ? new Date(n.start_time).toLocaleString() : '—'}
                      </td>
                      <td className="px-6 py-3.5">
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${
                          n.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {n.is_active ? 'Active' : 'Expired'}
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
                      No power or streetlight complaints reported.
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
                          className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 hover:text-amber-700"
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

      {/* Modal: Add/Edit Grid Zone */}
      {zoneModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-lg">
                {editingZone ? 'Edit Grid Zone' : 'Add Electricity Grid Substation'}
              </h3>
              <button onClick={() => setZoneModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveZone} className="space-y-4 mt-4">
              <div>
                <label className="text-xs font-semibold text-slate-700">Substation / Zone Name</label>
                <input
                  type="text"
                  value={zoneForm.name}
                  onChange={(e) => setZoneForm({ ...zoneForm, name: e.target.value })}
                  placeholder="e.g. Nayapalli 33kV Substation"
                  className="w-full text-sm mt-1 px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-yellow-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Grid Code</label>
                  <input
                    type="text"
                    value={zoneForm.code}
                    onChange={(e) => setZoneForm({ ...zoneForm, code: e.target.value.toUpperCase() })}
                    placeholder="e.g. GRID-BBSR-01"
                    className="w-full text-sm mt-1 px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-yellow-500 font-mono uppercase"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Max Capacity (kW)</label>
                  <input
                    type="number"
                    value={zoneForm.max_load_kw}
                    onChange={(e) => setZoneForm({ ...zoneForm, max_load_kw: e.target.value })}
                    className="w-full text-sm mt-1 px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-yellow-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Total Consumers Served</label>
                <input
                  type="number"
                  value={zoneForm.total_consumers}
                  onChange={(e) => setZoneForm({ ...zoneForm, total_consumers: parseInt(e.target.value, 10) || 0 })}
                  className="w-full text-sm mt-1 px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-yellow-500"
                  required
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="zoneActive"
                  checked={zoneForm.is_active}
                  onChange={(e) => setZoneForm({ ...zoneForm, is_active: e.target.checked })}
                  className="rounded border-slate-300 text-yellow-500 focus:ring-yellow-500"
                />
                <label htmlFor="zoneActive" className="text-xs font-medium text-slate-700">
                  Active Grid Feed
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setZoneModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 text-sm font-semibold text-white bg-yellow-600 hover:bg-yellow-700 rounded-lg shadow-sm disabled:opacity-50"
                >
                  {actionLoading ? 'Saving...' : 'Save Grid Zone'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Report Power Outage */}
      {outageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                Report Power Grid Outage
              </h3>
              <button onClick={() => setOutageModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveOutage} className="space-y-4 mt-4">
              <div>
                <label className="text-xs font-semibold text-slate-700">Grid Substation</label>
                <select
                  value={outageForm.zone}
                  onChange={(e) => setOutageForm({ ...outageForm, zone: e.target.value })}
                  className="w-full text-sm mt-1 px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-yellow-500"
                  required
                >
                  <option value="">Select Substation...</option>
                  {zones.map(z => (
                    <option key={z.id} value={z.id}>{z.name} ({z.code})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Outage Cause</label>
                  <select
                    value={outageForm.cause}
                    onChange={(e) => setOutageForm({ ...outageForm, cause: e.target.value })}
                    className="w-full text-sm mt-1 px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-yellow-500"
                  >
                    <option value="EQUIPMENT_FAILURE">Equipment Failure</option>
                    <option value="OVERLOAD">Overload Trip</option>
                    <option value="MAINTENANCE">Maintenance</option>
                    <option value="WEATHER">Storm / Weather</option>
                    <option value="ACCIDENT">Accident</option>
                    <option value="UNKNOWN">Unknown</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Affected Homes</label>
                  <input
                    type="number"
                    value={outageForm.affected_households}
                    onChange={(e) => setOutageForm({ ...outageForm, affected_households: parseInt(e.target.value, 10) || 0 })}
                    className="w-full text-sm mt-1 px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-yellow-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Description</label>
                <textarea
                  value={outageForm.description}
                  onChange={(e) => setOutageForm({ ...outageForm, description: e.target.value })}
                  placeholder="Transformer blast, line snapped near Ward 3..."
                  rows="3"
                  className="w-full text-sm mt-1 px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-yellow-500"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setOutageModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm disabled:opacity-50"
                >
                  {actionLoading ? 'Logging...' : 'Log Outage'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Update Outage Status */}
      {statusModalOutage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl max-w-sm w-full p-5 shadow-xl border border-slate-200">
            <h3 className="font-bold text-slate-900 text-base">Update Restoration Status</h3>
            <p className="text-xs text-slate-500 mt-1">
              Outage in {statusModalOutage.zone_name} ({statusModalOutage.affected_households} households)
            </p>

            <div className="mt-4 space-y-2">
              {['ACTIVE', 'RESTORING', 'RESOLVED'].map(st => (
                <button
                  key={st}
                  disabled={actionLoading}
                  onClick={() => handleUpdateOutageStatus(statusModalOutage.id, st)}
                  className={`w-full py-2 px-3 text-xs font-semibold rounded-lg border text-left flex items-center justify-between transition-colors ${
                    statusModalOutage.status === st
                      ? 'bg-yellow-50 border-yellow-300 text-yellow-800'
                      : 'hover:bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  <span>{st === 'RESTORING' ? 'Being Restored (Crew on site)' : st}</span>
                  {statusModalOutage.status === st && <CheckCircle className="w-4 h-4 text-yellow-600" />}
                </button>
              ))}
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setStatusModalOutage(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
