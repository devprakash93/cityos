import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCity } from '../../context/CityContext';
import api from '../../api/axios';
import { 
  Car, AlertTriangle, RefreshCw, Plus, Search, Filter, 
  MapPin, CheckCircle, Clock, ShieldAlert, ArrowUpRight, 
  TrendingUp, Edit2, Power, Eye, ExternalLink, X
} from 'lucide-react';

export default function TrafficManagement() {
  const { selectedCity, cities } = useCity();
  const [activeTab, setActiveTab] = useState('incidents'); // 'incidents' | 'zones' | 'complaints'
  
  // Data states
  const [zones, setZones] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  
  // Modals
  const [incidentModalOpen, setIncidentModalOpen] = useState(false);
  const [zoneModalOpen, setZoneModalOpen] = useState(false);
  const [editingZone, setEditingZone] = useState(null);
  const [statusModalIncident, setStatusModalIncident] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Form states
  const [incidentForm, setIncidentForm] = useState({
    incident_type: 'ACCIDENT',
    severity: 'HIGH',
    zone: '',
    description: '',
    location_lat: '20.4625',
    location_lng: '85.8830',
    status: 'ACTIVE'
  });

  const [zoneForm, setZoneForm] = useState({
    name: '',
    code: '',
    road_type: 'ARTERIAL',
    speed_limit_kmh: 60,
    is_active: true
  });

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = selectedCity ? { city_id: selectedCity.id } : {};
      
      const [zonesRes, incRes, compRes] = await Promise.allSettled([
        api.get('/traffic/zones/', { params }),
        api.get('/traffic/incidents/', { params }),
        api.get('/complaints/', { params: { category: 'ROAD,TRAFFIC_SIGNAL,ROAD_BLOCKAGE' } }),
      ]);

      if (zonesRes.status === 'fulfilled') {
        const d = zonesRes.value.data.results ?? zonesRes.value.data ?? [];
        setZones(Array.isArray(d) ? d : []);
      }
      if (incRes.status === 'fulfilled') {
        const d = incRes.value.data.results ?? incRes.value.data ?? [];
        setIncidents(Array.isArray(d) ? d : []);
      }
      if (compRes.status === 'fulfilled') {
        const d = compRes.value.data.results ?? compRes.value.data ?? [];
        setComplaints(Array.isArray(d) ? d : []);
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to load traffic data', 'error');
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
      const res = await api.patch(`/traffic/zones/${zone.id}/`, { is_active: !zone.is_active });
      setZones(prev => prev.map(z => z.id === zone.id ? { ...z, is_active: res.data.is_active } : z));
      showToast(`Zone "${zone.name}" marked ${res.data.is_active ? 'Active' : 'Inactive'}`);
    } catch (err) {
      console.error(err);
      showToast('Error updating zone status', 'error');
    }
  };

  const handleUpdateIncidentStatus = async (incidentId, newStatus) => {
    setActionLoading(true);
    try {
      const payload = { 
        status: newStatus,
        ...(newStatus === 'CLEARED' ? { cleared_at: new Date().toISOString() } : {})
      };
      const res = await api.patch(`/traffic/incidents/${incidentId}/`, payload);
      setIncidents(prev => prev.map(inc => inc.id === incidentId ? { ...inc, ...res.data } : inc));
      showToast(`Incident status updated to ${newStatus}`);
      setStatusModalIncident(null);
    } catch (err) {
      console.error(err);
      showToast('Failed to update incident status', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveZone = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      if (editingZone) {
        const res = await api.patch(`/traffic/zones/${editingZone.id}/`, zoneForm);
        setZones(prev => prev.map(z => z.id === editingZone.id ? res.data : z));
        showToast('Traffic zone updated successfully');
      } else {
        const res = await api.post('/traffic/zones/', zoneForm);
        setZones(prev => [res.data, ...prev]);
        showToast('Traffic zone created successfully');
      }
      setZoneModalOpen(false);
      setEditingZone(null);
    } catch (err) {
      console.error(err);
      showToast('Failed to save traffic zone', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveIncident = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const payload = {
        ...incidentForm,
        zone: incidentForm.zone ? parseInt(incidentForm.zone, 10) : (zones[0]?.id || null)
      };
      const res = await api.post('/traffic/incidents/', payload);
      setIncidents(prev => [res.data, ...prev]);
      showToast('Traffic incident reported successfully');
      setIncidentModalOpen(false);
    } catch (err) {
      console.error(err);
      showToast('Failed to report incident', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Metrics
  const activeIncidents = incidents.filter(i => i.status === 'ACTIVE');
  const criticalIncidents = incidents.filter(i => i.severity === 'CRITICAL' || i.incident_type === 'ACCIDENT');
  const jammedZones = zones.filter(z => z.latest_reading?.congestion_level === 'JAMMED' || (z.latest_reading?.density ?? 0) >= 70);

  // Filtered lists
  const filteredIncidents = incidents.filter(inc => {
    const matchSearch = (inc.description || '').toLowerCase().includes(search.toLowerCase()) ||
                        (inc.incident_type || '').toLowerCase().includes(search.toLowerCase()) ||
                        (inc.zone_name || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || inc.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const filteredZones = zones.filter(z => {
    const matchSearch = (z.name || '').toLowerCase().includes(search.toLowerCase()) ||
                        (z.code || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || 
                        (statusFilter === 'ACTIVE' && z.is_active) ||
                        (statusFilter === 'INACTIVE' && !z.is_active);
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
            <div className="p-2 rounded-lg bg-amber-500 text-white shadow-sm">
              <Car className="w-6 h-6" />
            </div>
            Traffic & Road Operations
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {selectedCity?.name || 'All Odisha'} · Congestion telemetry, incident dispatch, and road management
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Link
            to="/admin/map?filter=traffic"
            className="px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-sm flex items-center gap-1.5"
          >
            <MapPin className="w-4 h-4 text-amber-500" />
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
              setIncidentForm({
                incident_type: 'ACCIDENT',
                severity: 'HIGH',
                zone: zones[0]?.id || '',
                description: '',
                location_lat: '20.4625',
                location_lng: '85.8830',
                status: 'ACTIVE'
              });
              setIncidentModalOpen(true);
            }}
            className="px-3.5 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Report Incident
          </button>
          <button
            onClick={() => {
              setEditingZone(null);
              setZoneForm({ name: '', code: '', road_type: 'ARTERIAL', speed_limit_kmh: 60, is_active: true });
              setZoneModalOpen(true);
            }}
            className="px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-sm flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4 text-slate-500" />
            Add Zone
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Monitored Zones</span>
            <Car className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{loading ? '—' : zones.length}</p>
          <p className="text-xs text-slate-500 mt-1">{zones.filter(z => z.is_active).length} Active corridors</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Incidents</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-amber-600 mt-2">{loading ? '—' : activeIncidents.length}</p>
          <p className="text-xs text-slate-500 mt-1">{criticalIncidents.length} Critical / Accidents</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Congestion Hotspots</span>
            <TrendingUp className="w-4 h-4 text-red-500" />
          </div>
          <p className="text-2xl font-bold text-red-600 mt-2">{loading ? '—' : jammedZones.length}</p>
          <p className="text-xs text-slate-500 mt-1">High traffic density (&gt;70%)</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Road Complaints</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-blue-600 mt-2">{loading ? '—' : complaints.length}</p>
          <p className="text-xs text-slate-500 mt-1">Potholes & signals reported</p>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between flex-wrap gap-3">
          <div className="flex gap-6">
            <button
              onClick={() => { setActiveTab('incidents'); setStatusFilter('ALL'); }}
              className={`py-4 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
                activeTab === 'incidents'
                  ? 'border-amber-500 text-amber-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              Incidents & Hazards ({incidents.length})
            </button>
            <button
              onClick={() => { setActiveTab('zones'); setStatusFilter('ALL'); }}
              className={`py-4 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
                activeTab === 'zones'
                  ? 'border-amber-500 text-amber-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Car className="w-4 h-4" />
              Traffic Zones ({zones.length})
            </button>
            <button
              onClick={() => { setActiveTab('complaints'); setStatusFilter('ALL'); }}
              className={`py-4 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
                activeTab === 'complaints'
                  ? 'border-amber-500 text-amber-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
              Citizen Complaints ({complaints.length})
            </button>
          </div>

          {/* Filter / Search Bar */}
          <div className="py-2.5 flex items-center gap-2.5">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 w-44 sm:w-56"
              />
            </div>
            {activeTab === 'incidents' && (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="MONITORING">Monitoring</option>
                <option value="CLEARED">Cleared</option>
              </select>
            )}
            {activeTab === 'zones' && (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active Only</option>
                <option value="INACTIVE">Inactive Only</option>
              </select>
            )}
          </div>
        </div>

        {/* Tab 1: Incidents Content */}
        {activeTab === 'incidents' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5 text-left">Incident Type</th>
                  <th className="px-6 py-3.5 text-left">Severity</th>
                  <th className="px-6 py-3.5 text-left">Zone / Location</th>
                  <th className="px-6 py-3.5 text-left">Description</th>
                  <th className="px-6 py-3.5 text-left">Status</th>
                  <th className="px-6 py-3.5 text-left">Reported At</th>
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
                ) : filteredIncidents.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-slate-400">
                      No road incidents match the current filters.
                    </td>
                  </tr>
                ) : (
                  filteredIncidents.map(inc => (
                    <tr key={inc.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-3.5 font-medium text-slate-900">
                        {inc.incident_type?.replace(/_/g, ' ') || 'Incident'}
                      </td>
                      <td className="px-6 py-3.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                          inc.severity === 'CRITICAL' ? 'bg-red-100 text-red-700 border border-red-200' :
                          inc.severity === 'HIGH' ? 'bg-orange-100 text-orange-700 border border-orange-200' :
                          'bg-amber-100 text-amber-700 border border-amber-200'
                        }`}>
                          {inc.severity}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-xs text-slate-600">
                        <div className="font-semibold text-slate-800">{inc.zone_name || `Zone #${inc.zone}`}</div>
                        <div className="text-[11px] text-slate-400">{inc.city_name || selectedCity?.name || 'Odisha'}</div>
                      </td>
                      <td className="px-6 py-3.5 text-xs text-slate-600 max-w-xs truncate" title={inc.description}>
                        {inc.description || '—'}
                      </td>
                      <td className="px-6 py-3.5">
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${
                          inc.status === 'ACTIVE' ? 'bg-red-50 text-red-700 border border-red-200' :
                          inc.status === 'MONITORING' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                          'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          {inc.status}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-xs text-slate-400">
                        {inc.reported_at ? new Date(inc.reported_at).toLocaleString() : '—'}
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <button
                          onClick={() => setStatusModalIncident(inc)}
                          className="px-2.5 py-1 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded border border-amber-200 transition-colors"
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

        {/* Tab 2: Zones Content */}
        {activeTab === 'zones' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5 text-left">Zone Name</th>
                  <th className="px-6 py-3.5 text-left">Code</th>
                  <th className="px-6 py-3.5 text-left">Road Type</th>
                  <th className="px-6 py-3.5 text-left">Speed Limit</th>
                  <th className="px-6 py-3.5 text-left">Latest Flow / Density</th>
                  <th className="px-6 py-3.5 text-left">Active Status</th>
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
                      No traffic zones found.
                    </td>
                  </tr>
                ) : (
                  filteredZones.map(zone => {
                    const reading = zone.latest_reading;
                    return (
                      <tr key={zone.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-3.5 font-medium text-slate-900">
                          {zone.name}
                          <div className="text-[11px] text-slate-400 font-normal">{zone.city_name || selectedCity?.name || 'Odisha'}</div>
                        </td>
                        <td className="px-6 py-3.5 text-xs font-mono font-semibold text-slate-600">
                          {zone.code}
                        </td>
                        <td className="px-6 py-3.5 text-xs text-slate-600">
                          {zone.road_type}
                        </td>
                        <td className="px-6 py-3.5 text-xs text-slate-600">
                          {zone.speed_limit_kmh} km/h
                        </td>
                        <td className="px-6 py-3.5 text-xs">
                          {reading ? (
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                                reading.congestion_level === 'JAMMED' ? 'bg-red-100 text-red-700' :
                                reading.congestion_level === 'HEAVY' ? 'bg-orange-100 text-orange-700' :
                                reading.congestion_level === 'MODERATE' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-green-100 text-green-700'
                              }`}>
                                {reading.congestion_level} ({reading.density}%)
                              </span>
                              <span className="text-slate-400 text-[11px]">{reading.avg_speed_kmh} km/h</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs">No IoT reading</span>
                          )}
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
                                  road_type: zone.road_type,
                                  speed_limit_kmh: zone.speed_limit_kmh,
                                  is_active: zone.is_active
                                });
                                setZoneModalOpen(true);
                              }}
                              className="p-1 text-slate-500 hover:text-amber-600 rounded hover:bg-slate-100"
                              title="Edit Zone"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleToggleZoneActive(zone)}
                              className={`p-1 rounded ${
                                zone.is_active 
                                  ? 'text-emerald-600 hover:bg-emerald-50' 
                                  : 'text-slate-400 hover:bg-slate-100'
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

        {/* Tab 3: Complaints Content */}
        {activeTab === 'complaints' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5 text-left">Ref Number</th>
                  <th className="px-6 py-3.5 text-left">Category</th>
                  <th className="px-6 py-3.5 text-left">Title / Description</th>
                  <th className="px-6 py-3.5 text-left">Citizen</th>
                  <th className="px-6 py-3.5 text-left">Priority</th>
                  <th className="px-6 py-3.5 text-left">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  [...Array(3)].map((_, i) => (
                    <tr key={i}>
                      <td colSpan="7" className="px-6 py-4">
                        <div className="h-4 bg-slate-100 rounded animate-pulse" />
                      </td>
                    </tr>
                  ))
                ) : complaints.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-slate-400">
                      No traffic or road-related citizen complaints reported.
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

      {/* Modal: Report Incident */}
      {incidentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                Report Traffic Incident
              </h3>
              <button onClick={() => setIncidentModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveIncident} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Incident Type</label>
                  <select
                    value={incidentForm.incident_type}
                    onChange={(e) => setIncidentForm({ ...incidentForm, incident_type: e.target.value })}
                    className="w-full text-sm mt-1 px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="ACCIDENT">Accident</option>
                    <option value="BREAKDOWN">Vehicle Breakdown</option>
                    <option value="ROADWORK">Road Works</option>
                    <option value="FLOODING">Road Flooding</option>
                    <option value="OBSTRUCTION">Obstruction</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Severity</label>
                  <select
                    value={incidentForm.severity}
                    onChange={(e) => setIncidentForm({ ...incidentForm, severity: e.target.value })}
                    className="w-full text-sm mt-1 px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Traffic Zone / Corridor</label>
                <select
                  value={incidentForm.zone}
                  onChange={(e) => setIncidentForm({ ...incidentForm, zone: e.target.value })}
                  className="w-full text-sm mt-1 px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-amber-500"
                  required
                >
                  <option value="">Select Zone...</option>
                  {zones.map(z => (
                    <option key={z.id} value={z.id}>{z.name} ({z.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Description / Landmark</label>
                <textarea
                  value={incidentForm.description}
                  onChange={(e) => setIncidentForm({ ...incidentForm, description: e.target.value })}
                  placeholder="Detail the location, lane blockage, emergency units on scene..."
                  rows="3"
                  className="w-full text-sm mt-1 px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIncidentModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm disabled:opacity-50"
                >
                  {actionLoading ? 'Saving...' : 'Report Incident'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add/Edit Zone */}
      {zoneModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-lg">
                {editingZone ? 'Edit Traffic Zone' : 'Add Traffic Monitoring Zone'}
              </h3>
              <button onClick={() => setZoneModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveZone} className="space-y-4 mt-4">
              <div>
                <label className="text-xs font-semibold text-slate-700">Zone Name</label>
                <input
                  type="text"
                  value={zoneForm.name}
                  onChange={(e) => setZoneForm({ ...zoneForm, name: e.target.value })}
                  placeholder="e.g. Badambadi Junction, NH-16 Connector"
                  className="w-full text-sm mt-1 px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Zone Code</label>
                  <input
                    type="text"
                    value={zoneForm.code}
                    onChange={(e) => setZoneForm({ ...zoneForm, code: e.target.value.toUpperCase() })}
                    placeholder="e.g. TR-BBSR-01"
                    className="w-full text-sm mt-1 px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-amber-500 font-mono uppercase"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Road Type</label>
                  <select
                    value={zoneForm.road_type}
                    onChange={(e) => setZoneForm({ ...zoneForm, road_type: e.target.value })}
                    className="w-full text-sm mt-1 px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="HIGHWAY">Highway</option>
                    <option value="ARTERIAL">Arterial Road</option>
                    <option value="LOCAL">Local Street</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Speed Limit (km/h)</label>
                <input
                  type="number"
                  value={zoneForm.speed_limit_kmh}
                  onChange={(e) => setZoneForm({ ...zoneForm, speed_limit_kmh: parseInt(e.target.value, 10) || 40 })}
                  className="w-full text-sm mt-1 px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-amber-500"
                  min="20"
                  max="120"
                  required
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="zoneActive"
                  checked={zoneForm.is_active}
                  onChange={(e) => setZoneForm({ ...zoneForm, is_active: e.target.checked })}
                  className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                />
                <label htmlFor="zoneActive" className="text-xs font-medium text-slate-700">
                  Active Monitoring Status
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
                  className="px-4 py-2 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm disabled:opacity-50"
                >
                  {actionLoading ? 'Saving...' : 'Save Zone'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Quick Status Update for Incident */}
      {statusModalIncident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl max-w-sm w-full p-5 shadow-xl border border-slate-200">
            <h3 className="font-bold text-slate-900 text-base">Update Incident Status</h3>
            <p className="text-xs text-slate-500 mt-1">
              {statusModalIncident.incident_type?.replace(/_/g, ' ')} at {statusModalIncident.zone_name}
            </p>

            <div className="mt-4 space-y-2">
              {['ACTIVE', 'MONITORING', 'CLEARED'].map(st => (
                <button
                  key={st}
                  disabled={actionLoading}
                  onClick={() => handleUpdateIncidentStatus(statusModalIncident.id, st)}
                  className={`w-full py-2 px-3 text-xs font-semibold rounded-lg border text-left flex items-center justify-between transition-colors ${
                    statusModalIncident.status === st
                      ? 'bg-amber-50 border-amber-300 text-amber-800'
                      : 'hover:bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  <span>{st}</span>
                  {statusModalIncident.status === st && <CheckCircle className="w-4 h-4 text-amber-600" />}
                </button>
              ))}
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setStatusModalIncident(null)}
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
