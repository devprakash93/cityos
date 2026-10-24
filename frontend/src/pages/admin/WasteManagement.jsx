import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCity } from '../../context/CityContext';
import api from '../../api/axios';
import { 
  Trash2, AlertTriangle, RefreshCw, Plus, Search, Filter, 
  MapPin, CheckCircle, Clock, ShieldAlert, ArrowUpRight, 
  Edit2, Power, Eye, Truck, Check, X
} from 'lucide-react';

export default function WasteManagement() {
  const { selectedCity } = useCity();
  const [activeTab, setActiveTab] = useState('bins'); // 'bins' | 'alerts' | 'routes' | 'complaints'
  
  // Data states
  const [bins, setBins] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [logs, setLogs] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  
  // Modals & form
  const [binModalOpen, setBinModalOpen] = useState(false);
  const [editingBin, setEditingBin] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const [binForm, setBinForm] = useState({
    name: '',
    bin_type: 'GENERAL',
    capacity_liters: 100,
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
      
      const [binsRes, routesRes, logsRes, compRes] = await Promise.allSettled([
        api.get('/waste/bins/', { params }),
        api.get('/waste/routes/', { params }),
        api.get('/waste/logs/', { params }),
        api.get('/complaints/', { params: { category: 'GARBAGE,DRAINAGE,PUBLIC_TOILET' } }),
      ]);

      if (binsRes.status === 'fulfilled') {
        const d = binsRes.value.data.results ?? binsRes.value.data ?? [];
        setBins(Array.isArray(d) ? d : []);
      }
      if (routesRes.status === 'fulfilled') {
        const d = routesRes.value.data.results ?? routesRes.value.data ?? [];
        setRoutes(Array.isArray(d) ? d : []);
      }
      if (logsRes.status === 'fulfilled') {
        const d = logsRes.value.data.results ?? logsRes.value.data ?? [];
        setLogs(Array.isArray(d) ? d : []);
      }
      if (compRes.status === 'fulfilled') {
        const d = compRes.value.data.results ?? compRes.value.data ?? [];
        setComplaints(Array.isArray(d) ? d : []);
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to load waste management data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedCity]);

  // Actions
  const handleToggleBinActive = async (bin) => {
    try {
      const res = await api.patch(`/waste/bins/${bin.id}/`, { is_active: !bin.is_active });
      setBins(prev => prev.map(b => b.id === bin.id ? { ...b, is_active: res.data.is_active } : b));
      showToast(`Bin "${bin.name}" marked ${res.data.is_active ? 'Active' : 'Inactive'}`);
    } catch (err) {
      console.error(err);
      showToast('Error updating bin status', 'error');
    }
  };

  const handleSaveBin = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      if (editingBin) {
        const res = await api.patch(`/waste/bins/${editingBin.id}/`, binForm);
        setBins(prev => prev.map(b => b.id === editingBin.id ? { ...b, ...res.data } : b));
        showToast('Waste bin record updated successfully');
      } else {
        const res = await api.post('/waste/bins/', binForm);
        setBins(prev => [res.data, ...prev]);
        showToast('Waste bin record created successfully');
      }
      setBinModalOpen(false);
      setEditingBin(null);
    } catch (err) {
      console.error(err);
      showToast('Failed to save waste bin', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Metrics
  const activeBins = bins.filter(b => b.is_active);
  const overflowingBins = bins.filter(b => (b.latest_reading?.fill_percent ?? 0) >= 80 || b.latest_reading?.alert_triggered);
  const totalCapacity = bins.reduce((acc, b) => acc + (b.capacity_liters || 0), 0);

  // Filtered lists
  const filteredBins = bins.filter(bin => {
    const matchSearch = (bin.name || '').toLowerCase().includes(search.toLowerCase()) ||
                        (bin.location_address || '').toLowerCase().includes(search.toLowerCase()) ||
                        (bin.city_name || '').toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === 'ALL' || bin.bin_type === typeFilter;
    const matchStatus = statusFilter === 'ALL' ||
                        (statusFilter === 'ACTIVE' && bin.is_active) ||
                        (statusFilter === 'INACTIVE' && !bin.is_active) ||
                        (statusFilter === 'OVERFLOW' && (bin.latest_reading?.fill_percent ?? 0) >= 80);
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
            <div className="p-2 rounded-lg bg-emerald-600 text-white shadow-sm">
              <Trash2 className="w-6 h-6" />
            </div>
            Waste Management & Cleanliness
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {selectedCity?.name || 'All Odisha'} · Smart waste bins, collection routes, and overflow monitoring
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Link
            to="/admin/map?filter=waste"
            className="px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-sm flex items-center gap-1.5"
          >
            <MapPin className="w-4 h-4 text-emerald-600" />
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
              setEditingBin(null);
              setBinForm({ name: '', bin_type: 'GENERAL', capacity_liters: 100, is_active: true });
              setBinModalOpen(true);
            }}
            className="px-3.5 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Add Waste Bin
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Bins</span>
            <Trash2 className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{loading ? '—' : bins.length}</p>
          <p className="text-xs text-slate-500 mt-1">{activeBins.length} Operational bins</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Overflowing / Alerts</span>
            <AlertTriangle className="w-4 h-4 text-red-500" />
          </div>
          <p className="text-2xl font-bold text-red-600 mt-2">{loading ? '—' : overflowingBins.length}</p>
          <p className="text-xs text-slate-500 mt-1">&ge; 80% capacity reached</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Collection Routes</span>
            <Truck className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-emerald-600 mt-2">{loading ? '—' : routes.length}</p>
          <p className="text-xs text-slate-500 mt-1">{logs.length} Recent pickups logged</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Citizen Complaints</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-blue-600 mt-2">{loading ? '—' : complaints.length}</p>
          <p className="text-xs text-slate-500 mt-1">Garbage & dumping reports</p>
        </div>
      </div>

      {/* Main Tabs Container */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between flex-wrap gap-3">
          <div className="flex gap-6">
            <button
              onClick={() => { setActiveTab('bins'); setStatusFilter('ALL'); }}
              className={`py-4 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
                activeTab === 'bins'
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Trash2 className="w-4 h-4" />
              Waste Bins ({bins.length})
            </button>
            <button
              onClick={() => { setActiveTab('alerts'); setStatusFilter('ALL'); }}
              className={`py-4 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
                activeTab === 'alerts'
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              Overflow Alerts ({overflowingBins.length})
            </button>
            <button
              onClick={() => { setActiveTab('routes'); setStatusFilter('ALL'); }}
              className={`py-4 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
                activeTab === 'routes'
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Truck className="w-4 h-4" />
              Collection Routes ({routes.length})
            </button>
            <button
              onClick={() => { setActiveTab('complaints'); setStatusFilter('ALL'); }}
              className={`py-4 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
                activeTab === 'complaints'
                  ? 'border-emerald-600 text-emerald-700'
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
                placeholder="Search bins, locations..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 w-44 sm:w-56"
              />
            </div>
            {activeTab === 'bins' && (
              <>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="ALL">All Bin Types</option>
                  <option value="GENERAL">General Waste</option>
                  <option value="RECYCLABLE">Recyclable</option>
                  <option value="ORGANIC">Organic</option>
                  <option value="HAZARDOUS">Hazardous</option>
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="ALL">All Status</option>
                  <option value="ACTIVE">Active</option>
                  <option value="OVERFLOW">Near Full (&ge;80%)</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </>
            )}
          </div>
        </div>

        {/* Tab 1: Waste Bins Table */}
        {activeTab === 'bins' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5 text-left">Bin Name</th>
                  <th className="px-6 py-3.5 text-left">Category / Type</th>
                  <th className="px-6 py-3.5 text-left">Location / Ward</th>
                  <th className="px-6 py-3.5 text-left">Capacity</th>
                  <th className="px-6 py-3.5 text-left">Current Fill Level</th>
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
                ) : filteredBins.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-slate-400">
                      No waste bins found matching the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredBins.map(bin => {
                    const fill = bin.latest_reading?.fill_percent ?? 0;
                    return (
                      <tr key={bin.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-3.5 font-medium text-slate-900">
                          {bin.name}
                          <div className="text-[11px] text-slate-400 font-normal">Installed: {bin.installed_at ? new Date(bin.installed_at).toLocaleDateString() : '—'}</div>
                        </td>
                        <td className="px-6 py-3.5">
                          <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${
                            bin.bin_type === 'RECYCLABLE' ? 'bg-blue-100 text-blue-700' :
                            bin.bin_type === 'ORGANIC' ? 'bg-emerald-100 text-emerald-700' :
                            bin.bin_type === 'HAZARDOUS' ? 'bg-red-100 text-red-700' :
                            'bg-stone-100 text-stone-700'
                          }`}>
                            {bin.bin_type}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-xs text-slate-600">
                          <div className="font-semibold text-slate-800">{bin.location_address || 'Central Municipal Point'}</div>
                          <div className="text-[11px] text-slate-400">
                            {bin.city_name || selectedCity?.name || 'Odisha'} {bin.ward_number ? `· Ward ${bin.ward_number}` : ''}
                          </div>
                        </td>
                        <td className="px-6 py-3.5 text-xs font-semibold text-slate-700">
                          {bin.capacity_liters} Liters
                        </td>
                        <td className="px-6 py-3.5 text-xs">
                          {bin.latest_reading ? (
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full ${
                                    fill >= 80 ? 'bg-red-500' : fill >= 50 ? 'bg-amber-500' : 'bg-emerald-500'
                                  }`} 
                                  style={{ width: `${Math.min(fill, 100)}%` }}
                                />
                              </div>
                              <span className={`font-semibold ${fill >= 80 ? 'text-red-600' : 'text-slate-700'}`}>
                                {fill}%
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs">No sensor data</span>
                          )}
                        </td>
                        <td className="px-6 py-3.5">
                          <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${
                            bin.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {bin.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setEditingBin(bin);
                                setBinForm({
                                  name: bin.name,
                                  bin_type: bin.bin_type,
                                  capacity_liters: bin.capacity_liters,
                                  is_active: bin.is_active,
                                });
                                setBinModalOpen(true);
                              }}
                              className="p-1 text-slate-500 hover:text-emerald-600 rounded hover:bg-slate-100"
                              title="Edit Bin"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleToggleBinActive(bin)}
                              className={`p-1 rounded ${
                                bin.is_active ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'
                              }`}
                              title={bin.is_active ? 'Deactivate Bin' : 'Activate Bin'}
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

        {/* Tab 2: Overflow Alerts */}
        {activeTab === 'alerts' && (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {overflowingBins.length === 0 ? (
                <div className="col-span-full py-12 text-center text-slate-400">
                  <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  All waste bins are within safe operational fill thresholds (&lt; 80%).
                </div>
              ) : (
                overflowingBins.map(bin => (
                  <div key={bin.id} className="bg-red-50/60 border border-red-200 rounded-xl p-4 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold px-2 py-0.5 bg-red-100 text-red-800 rounded">
                          {bin.latest_reading?.fill_percent ?? 85}% FULL
                        </span>
                        <span className="text-[11px] text-slate-500">{bin.bin_type}</span>
                      </div>
                      <h4 className="font-bold text-slate-900 mt-2">{bin.name}</h4>
                      <p className="text-xs text-slate-600 mt-1 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {bin.location_address || 'City Center'}, {bin.city_name || selectedCity?.name || 'Odisha'}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-red-200/60 flex items-center justify-between text-xs">
                      <span className="text-slate-500">Capacity: {bin.capacity_liters}L</span>
                      <Link 
                        to="/admin/map?filter=waste" 
                        className="text-red-700 font-semibold hover:underline flex items-center gap-1"
                      >
                        Locate <ArrowUpRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Collection Routes */}
        {activeTab === 'routes' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5 text-left">Route Name</th>
                  <th className="px-6 py-3.5 text-left">Assigned Vehicle</th>
                  <th className="px-6 py-3.5 text-left">Assigned Worker</th>
                  <th className="px-6 py-3.5 text-left">Covered Bins</th>
                  <th className="px-6 py-3.5 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {routes.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-slate-400">
                      No waste collection routes recorded for this city.
                    </td>
                  </tr>
                ) : (
                  routes.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-3.5 font-medium text-slate-900">{r.name}</td>
                      <td className="px-6 py-3.5 text-xs font-mono text-slate-700">{r.assigned_vehicle || 'Municipal Truck 01'}</td>
                      <td className="px-6 py-3.5 text-xs text-slate-600">{r.worker_name || 'Sanitation Team Lead'}</td>
                      <td className="px-6 py-3.5 text-xs text-slate-700 font-semibold">{r.bins_count ?? r.bins?.length ?? '—'} Bins</td>
                      <td className="px-6 py-3.5">
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${
                          r.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {r.is_active ? 'Active' : 'Inactive'}
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
                      No waste or cleanliness-related complaints filed.
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
                          className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700"
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

      {/* Modal: Add/Edit Waste Bin */}
      {binModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-lg">
                {editingBin ? 'Edit Waste Bin' : 'Add New Waste Bin'}
              </h3>
              <button onClick={() => setBinModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBin} className="space-y-4 mt-4">
              <div>
                <label className="text-xs font-semibold text-slate-700">Bin Identifier / Name</label>
                <input
                  type="text"
                  value={binForm.name}
                  onChange={(e) => setBinForm({ ...binForm, name: e.target.value })}
                  placeholder="e.g. Master Canteen Green Bin #04"
                  className="w-full text-sm mt-1 px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Bin Type</label>
                  <select
                    value={binForm.bin_type}
                    onChange={(e) => setBinForm({ ...binForm, bin_type: e.target.value })}
                    className="w-full text-sm mt-1 px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="GENERAL">General Waste</option>
                    <option value="RECYCLABLE">Recyclable</option>
                    <option value="ORGANIC">Organic</option>
                    <option value="HAZARDOUS">Hazardous</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Capacity (Liters)</label>
                  <input
                    type="number"
                    value={binForm.capacity_liters}
                    onChange={(e) => setBinForm({ ...binForm, capacity_liters: parseInt(e.target.value, 10) || 100 })}
                    className="w-full text-sm mt-1 px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-emerald-500"
                    min="50"
                    max="5000"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="binActive"
                  checked={binForm.is_active}
                  onChange={(e) => setBinForm({ ...binForm, is_active: e.target.checked })}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="binActive" className="text-xs font-medium text-slate-700">
                  Active Collection Bin
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setBinModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm disabled:opacity-50"
                >
                  {actionLoading ? 'Saving...' : 'Save Bin Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
