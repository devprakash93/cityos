import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCity } from '../../context/CityContext';
import api from '../../api/axios';
import { 
  Wind, AlertTriangle, RefreshCw, Plus, Search, Filter, 
  MapPin, CheckCircle, Clock, ShieldAlert, ArrowUpRight, 
  Edit2, Power, Eye, Activity, Sparkles, X
} from 'lucide-react';

export default function PollutionManagement() {
  const { selectedCity } = useCity();
  const [activeTab, setActiveTab] = useState('stations'); // 'stations' | 'alerts' | 'complaints'
  
  // Data states
  const [stations, setStations] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  
  // Modals & form
  const [stationModalOpen, setStationModalOpen] = useState(false);
  const [editingStation, setEditingStation] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const [stationForm, setStationForm] = useState({
    name: '',
    is_active: true,
  });

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = selectedCity ? { city_id: selectedCity.id } : {};
      
      const [stRes, alertRes, compRes] = await Promise.allSettled([
        api.get('/pollution/stations/', { params }),
        api.get('/pollution/alerts/', { params }),
        api.get('/complaints/', { params: { category: 'POLLUTION' } }),
      ]);

      if (stRes.status === 'fulfilled') {
        const d = stRes.value.data.results ?? stRes.value.data ?? [];
        setStations(Array.isArray(d) ? d : []);
      }
      if (alertRes.status === 'fulfilled') {
        const d = alertRes.value.data.results ?? alertRes.value.data ?? [];
        setAlerts(Array.isArray(d) ? d : []);
      }
      if (compRes.status === 'fulfilled') {
        const d = compRes.value.data.results ?? compRes.value.data ?? [];
        setComplaints(Array.isArray(d) ? d : []);
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to load air quality data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedCity]);

  // Actions
  const handleToggleStationActive = async (station) => {
    try {
      const res = await api.patch(`/pollution/stations/${station.id}/`, { is_active: !station.is_active });
      setStations(prev => prev.map(s => s.id === station.id ? { ...s, is_active: res.data.is_active } : s));
      showToast(`Station "${station.name}" marked ${res.data.is_active ? 'Active' : 'Inactive'}`);
    } catch (err) {
      console.error(err);
      showToast('Error updating station status', 'error');
    }
  };

  const handleResolveAlert = async (alertId) => {
    try {
      const res = await api.patch(`/pollution/alerts/${alertId}/`, {
        status: 'RESOLVED',
        resolved_at: new Date().toISOString()
      });
      setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, ...res.data } : a));
      showToast('Pollution threshold alert marked resolved');
    } catch (err) {
      console.error(err);
      showToast('Failed to resolve alert', 'error');
    }
  };

  const handleSaveStation = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      if (editingStation) {
        const res = await api.patch(`/pollution/stations/${editingStation.id}/`, stationForm);
        setStations(prev => prev.map(s => s.id === editingStation.id ? { ...s, ...res.data } : s));
        showToast('AQI station updated successfully');
      } else {
        const res = await api.post('/pollution/stations/', stationForm);
        setStations(prev => [res.data, ...prev]);
        showToast('AQI station added successfully');
      }
      setStationModalOpen(false);
      setEditingStation(null);
    } catch (err) {
      console.error(err);
      showToast('Failed to save AQI station', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Metrics
  const activeStations = stations.filter(s => s.is_active);
  const activeAlerts = alerts.filter(a => a.status === 'ACTIVE');
  const hazardousStations = stations.filter(s => {
    const val = parseFloat(s.latest_reading?.aqi_value);
    return val > 150;
  });

  // Calculate average AQI across reporting stations
  const reportingValues = stations
    .map(s => parseFloat(s.latest_reading?.aqi_value))
    .filter(val => !isNaN(val));
  const avgAQI = reportingValues.length 
    ? Math.round(reportingValues.reduce((a, b) => a + b, 0) / reportingValues.length)
    : null;

  // Filtered lists
  const filteredStations = stations.filter(st => {
    const matchSearch = (st.name || '').toLowerCase().includes(search.toLowerCase()) ||
                        (st.location_address || '').toLowerCase().includes(search.toLowerCase());
    const matchCategory = categoryFilter === 'ALL' || st.latest_reading?.category === categoryFilter;
    const matchStatus = statusFilter === 'ALL' ||
                        (statusFilter === 'ACTIVE' && st.is_active) ||
                        (statusFilter === 'INACTIVE' && !st.is_active);
    return matchSearch && matchCategory && matchStatus;
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
            <div className="p-2 rounded-lg bg-teal-600 text-white shadow-sm">
              <Wind className="w-6 h-6" />
            </div>
            Pollution Control & Air Quality (AQI)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {selectedCity?.name || 'All Odisha'} · Continuous ambient air monitoring, PM2.5, PM10, and emission alerts
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Link
            to="/admin/map?filter=pollution"
            className="px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-sm flex items-center gap-1.5"
          >
            <MapPin className="w-4 h-4 text-teal-600" />
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
              setEditingStation(null);
              setStationForm({ name: '', is_active: true });
              setStationModalOpen(true);
            }}
            className="px-3.5 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Add AQI Station
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Avg City AQI</span>
            <Sparkles className="w-4 h-4 text-teal-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            {loading ? '—' : avgAQI !== null ? avgAQI : 'N/A'}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {avgAQI !== null ? (avgAQI <= 50 ? '🟢 Good air quality' : avgAQI <= 100 ? '🟡 Moderate quality' : '🔴 Elevated pollutants') : 'Pending reading'}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Stations</span>
            <Wind className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{loading ? '—' : stations.length}</p>
          <p className="text-xs text-slate-500 mt-1">{activeStations.length} Online telemetry stations</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Threshold Alerts</span>
            <AlertTriangle className="w-4 h-4 text-red-500" />
          </div>
          <p className="text-2xl font-bold text-red-600 mt-2">{loading ? '—' : activeAlerts.length}</p>
          <p className="text-xs text-slate-500 mt-1">{hazardousStations.length} AQI &gt; 150 Unhealthy</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Citizen Complaints</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-blue-600 mt-2">{loading ? '—' : complaints.length}</p>
          <p className="text-xs text-slate-500 mt-1">Industrial smoke & dust</p>
        </div>
      </div>

      {/* Main Tabs Container */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between flex-wrap gap-3">
          <div className="flex gap-6">
            <button
              onClick={() => { setActiveTab('stations'); setStatusFilter('ALL'); }}
              className={`py-4 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
                activeTab === 'stations'
                  ? 'border-teal-600 text-teal-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Wind className="w-4 h-4" />
              Monitoring Stations ({stations.length})
            </button>
            <button
              onClick={() => { setActiveTab('alerts'); setStatusFilter('ALL'); }}
              className={`py-4 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
                activeTab === 'alerts'
                  ? 'border-teal-600 text-teal-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              Pollution Alerts ({alerts.length})
            </button>
            <button
              onClick={() => { setActiveTab('complaints'); setStatusFilter('ALL'); }}
              className={`py-4 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
                activeTab === 'complaints'
                  ? 'border-teal-600 text-teal-600'
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
                placeholder="Search stations, areas..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 w-44 sm:w-56"
              />
            </div>
            {activeTab === 'stations' && (
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="ALL">All AQI Levels</option>
                <option value="GOOD">Good (0–50)</option>
                <option value="MODERATE">Moderate (51–100)</option>
                <option value="UNHEALTHY">Unhealthy (101–150)</option>
                <option value="HAZARDOUS">Hazardous (200+)</option>
              </select>
            )}
          </div>
        </div>

        {/* Tab 1: AQI Stations Table */}
        {activeTab === 'stations' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5 text-left">Station Name</th>
                  <th className="px-6 py-3.5 text-left">Location / Area</th>
                  <th className="px-6 py-3.5 text-left">Current AQI</th>
                  <th className="px-6 py-3.5 text-left">Pollutants (PM2.5 / PM10)</th>
                  <th className="px-6 py-3.5 text-left">Status</th>
                  <th className="px-6 py-3.5 text-left">Last Recorded</th>
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
                ) : filteredStations.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-slate-400">
                      No pollution monitoring stations match the filters.
                    </td>
                  </tr>
                ) : (
                  filteredStations.map(st => {
                    const r = st.latest_reading;
                    const aqi = r ? parseFloat(r.aqi_value) : null;
                    return (
                      <tr key={st.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-3.5 font-medium text-slate-900">
                          {st.name}
                        </td>
                        <td className="px-6 py-3.5 text-xs text-slate-600">
                          <div className="font-semibold text-slate-800">{st.location_address || 'City Monitoring Station'}</div>
                          <div className="text-[11px] text-slate-400">{st.city_name || selectedCity?.name || 'Odisha'}</div>
                        </td>
                        <td className="px-6 py-3.5 text-xs">
                          {aqi !== null ? (
                            <span className={`inline-flex items-center px-2.5 py-1 rounded font-bold text-xs ${
                              aqi <= 50 ? 'bg-emerald-100 text-emerald-800' :
                              aqi <= 100 ? 'bg-yellow-100 text-yellow-800' :
                              aqi <= 150 ? 'bg-orange-100 text-orange-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              AQI {aqi} · {r.category}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs">No reading</span>
                          )}
                        </td>
                        <td className="px-6 py-3.5 text-xs text-slate-700">
                          {r ? (
                            <div className="space-y-0.5 text-[11px]">
                              <div>PM2.5: <span className="font-semibold">{r.pm25} µg/m³</span></div>
                              <div>PM10: <span className="font-semibold">{r.pm10} µg/m³</span></div>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-6 py-3.5">
                          <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${
                            st.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {st.is_active ? 'Online' : 'Offline'}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-xs text-slate-400">
                          {r?.recorded_at ? new Date(r.recorded_at).toLocaleTimeString() : '—'}
                        </td>
                        <td className="px-6 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setEditingStation(st);
                                setStationForm({
                                  name: st.name,
                                  is_active: st.is_active
                                });
                                setStationModalOpen(true);
                              }}
                              className="p-1 text-slate-500 hover:text-teal-600 rounded hover:bg-slate-100"
                              title="Edit Station"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleToggleStationActive(st)}
                              className={`p-1 rounded ${
                                st.is_active ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'
                              }`}
                              title={st.is_active ? 'Deactivate Station' : 'Activate Station'}
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

        {/* Tab 2: Pollution Alerts */}
        {activeTab === 'alerts' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5 text-left">Monitoring Station</th>
                  <th className="px-6 py-3.5 text-left">AQI Level</th>
                  <th className="px-6 py-3.5 text-left">Alert Details</th>
                  <th className="px-6 py-3.5 text-left">Status</th>
                  <th className="px-6 py-3.5 text-left">Triggered At</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {alerts.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-slate-400">
                      No high pollution or hazardous air threshold alerts active.
                    </td>
                  </tr>
                ) : (
                  alerts.map(a => (
                    <tr key={a.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-3.5 font-medium text-slate-900">
                        {a.station_name || `Station #${a.station}`}
                      </td>
                      <td className="px-6 py-3.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-800">
                          AQI {a.aqi_value} · {a.category}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-xs text-slate-700 max-w-sm truncate">
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

        {/* Tab 3: Complaints */}
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
                      No pollution-related citizen complaints reported.
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
                          className="inline-flex items-center gap-1 text-xs font-medium text-teal-600 hover:text-teal-700"
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

      {/* Modal: Add/Edit AQI Station */}
      {stationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-lg">
                {editingStation ? 'Edit AQI Station' : 'Add AQI Monitoring Station'}
              </h3>
              <button onClick={() => setStationModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStation} className="space-y-4 mt-4">
              <div>
                <label className="text-xs font-semibold text-slate-700">Station Name</label>
                <input
                  type="text"
                  value={stationForm.name}
                  onChange={(e) => setStationForm({ ...stationForm, name: e.target.value })}
                  placeholder="e.g. Chandrasekharpur Industrial Air Monitor"
                  className="w-full text-sm mt-1 px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-teal-500"
                  required
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="stationActive"
                  checked={stationForm.is_active}
                  onChange={(e) => setStationForm({ ...stationForm, is_active: e.target.checked })}
                  className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                <label htmlFor="stationActive" className="text-xs font-medium text-slate-700">
                  Online Telemetry Broadcast
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setStationModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm disabled:opacity-50"
                >
                  {actionLoading ? 'Saving...' : 'Save Station'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
