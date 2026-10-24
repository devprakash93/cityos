import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCity } from '../../context/CityContext';
import api from '../../api/axios';
import { 
  Bus, AlertTriangle, RefreshCw, Plus, Search, Filter, 
  MapPin, CheckCircle, Clock, ShieldAlert, ArrowUpRight, 
  Edit2, Power, Eye, Radio, Navigation, Phone, User, X
} from 'lucide-react';

export default function TransportManagement() {
  const { selectedCity } = useCity();
  const [activeTab, setActiveTab] = useState('buses'); // 'buses' | 'routes' | 'schedules' | 'complaints'
  
  // Data states
  const [buses, setBuses] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Selected live location modal
  const [selectedBusLive, setSelectedBusLive] = useState(null);
  const [liveLocationLoading, setLiveLocationLoading] = useState(false);
  
  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  
  // Modals & form
  const [busModalOpen, setBusModalOpen] = useState(false);
  const [routeModalOpen, setRouteModalOpen] = useState(false);
  const [editingBus, setEditingBus] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const [busForm, setBusForm] = useState({
    registration_number: '',
    route: '',
    capacity: 50,
    driver_name: '',
    driver_phone: '',
    is_active: true,
  });

  const [routeForm, setRouteForm] = useState({
    route_number: '',
    name: '',
    origin: '',
    destination: '',
    distance_km: '18.5',
    fare_inr: '25.0',
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
      
      const [busesRes, routesRes, schedRes, compRes] = await Promise.allSettled([
        api.get('/transport/buses/', { params }),
        api.get('/transport/routes/', { params }),
        api.get('/transport/schedules/', { params }),
        api.get('/complaints/', { params: { category: 'TRANSPORT' } }),
      ]);

      if (busesRes.status === 'fulfilled') {
        const d = busesRes.value.data.results ?? busesRes.value.data ?? [];
        setBuses(Array.isArray(d) ? d : []);
      }
      if (routesRes.status === 'fulfilled') {
        const d = routesRes.value.data.results ?? routesRes.value.data ?? [];
        setRoutes(Array.isArray(d) ? d : []);
      }
      if (schedRes.status === 'fulfilled') {
        const d = schedRes.value.data.results ?? schedRes.value.data ?? [];
        setSchedules(Array.isArray(d) ? d : []);
      }
      if (compRes.status === 'fulfilled') {
        const d = compRes.value.data.results ?? compRes.value.data ?? [];
        setComplaints(Array.isArray(d) ? d : []);
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to load transport data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedCity]);

  // Fetch Live Location for a bus
  const handleViewLiveLocation = async (bus) => {
    setLiveLocationLoading(true);
    setSelectedBusLive({ bus, location: null });
    try {
      const res = await api.get(`/transport/buses/${bus.id}/live-location/`);
      setSelectedBusLive({ bus, location: res.data });
    } catch (err) {
      console.error(err);
      showToast('No active GPS ping for this vehicle', 'error');
    } finally {
      setLiveLocationLoading(false);
    }
  };

  // Actions
  const handleToggleBusActive = async (bus) => {
    try {
      const res = await api.patch(`/transport/buses/${bus.id}/`, { is_active: !bus.is_active });
      setBuses(prev => prev.map(b => b.id === bus.id ? { ...b, is_active: res.data.is_active } : b));
      showToast(`Bus ${bus.registration_number} status updated to ${res.data.is_active ? 'Active' : 'Out of Service'}`);
    } catch (err) {
      console.error(err);
      showToast('Error updating bus status', 'error');
    }
  };

  const handleSaveBus = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const payload = {
        ...busForm,
        route: busForm.route ? parseInt(busForm.route, 10) : (routes[0]?.id || null)
      };
      if (editingBus) {
        const res = await api.patch(`/transport/buses/${editingBus.id}/`, payload);
        setBuses(prev => prev.map(b => b.id === editingBus.id ? { ...b, ...res.data } : b));
        showToast('Bus details updated successfully');
      } else {
        const res = await api.post('/transport/buses/', payload);
        setBuses(prev => [res.data, ...prev]);
        showToast('Bus added to fleet successfully');
      }
      setBusModalOpen(false);
      setEditingBus(null);
    } catch (err) {
      console.error(err);
      showToast('Failed to save bus record', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveRoute = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const payload = {
        ...routeForm,
        city: selectedCity?.id || 1
      };
      const res = await api.post('/transport/routes/', payload);
      setRoutes(prev => [res.data, ...prev]);
      showToast('Transit route created successfully');
      setRouteModalOpen(false);
    } catch (err) {
      console.error(err);
      showToast('Failed to create transit route', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Metrics
  const activeBuses = buses.filter(b => b.is_active && b.status !== 'OUT_OF_SERVICE');
  const delayedBuses = buses.filter(b => b.status === 'DELAYED');
  const delayedSchedules = schedules.filter(s => (s.delay_minutes ?? 0) > 10);

  // Filtered lists
  const filteredBuses = buses.filter(b => {
    const matchSearch = (b.registration_number || '').toLowerCase().includes(search.toLowerCase()) ||
                        (b.driver_name || '').toLowerCase().includes(search.toLowerCase()) ||
                        (b.route_name || '').toLowerCase().includes(search.toLowerCase()) ||
                        (b.route_number || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || 
                        (statusFilter === 'ACTIVE' && b.is_active) ||
                        (statusFilter === 'DELAYED' && b.status === 'DELAYED') ||
                        (statusFilter === 'OUT_OF_SERVICE' && (!b.is_active || b.status === 'OUT_OF_SERVICE'));
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
            <div className="p-2 rounded-lg bg-indigo-600 text-white shadow-sm">
              <Bus className="w-6 h-6" />
            </div>
            Public Transport & Fleet Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {selectedCity?.name || 'All Odisha'} · Mo Bus corridors, vehicle telemetry, stops, and schedules
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Link
            to="/admin/map?filter=transport"
            className="px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-sm flex items-center gap-1.5"
          >
            <MapPin className="w-4 h-4 text-indigo-600" />
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
              setRouteForm({
                route_number: '',
                name: '',
                origin: '',
                destination: '',
                distance_km: '18.5',
                fare_inr: '25.0',
                is_active: true
              });
              setRouteModalOpen(true);
            }}
            className="px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-sm flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4 text-slate-500" />
            Add Route
          </button>
          <button
            onClick={() => {
              setEditingBus(null);
              setBusForm({
                registration_number: '',
                route: routes[0]?.id || '',
                capacity: 50,
                driver_name: '',
                driver_phone: '',
                is_active: true,
              });
              setBusModalOpen(true);
            }}
            className="px-3.5 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Add Bus
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Fleet</span>
            <Bus className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{loading ? '—' : buses.length}</p>
          <p className="text-xs text-slate-500 mt-1">{activeBuses.length} Active in service</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Transit Routes</span>
            <Navigation className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-2xl font-bold text-indigo-600 mt-2">{loading ? '—' : routes.length}</p>
          <p className="text-xs text-slate-500 mt-1">Designated city corridors</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Service Delays</span>
            <AlertTriangle className="w-4 h-4 text-orange-500" />
          </div>
          <p className="text-2xl font-bold text-orange-600 mt-2">{loading ? '—' : (delayedBuses.length || delayedSchedules.length)}</p>
          <p className="text-xs text-slate-500 mt-1">&gt; 10 min behind schedule</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Transit Complaints</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-blue-600 mt-2">{loading ? '—' : complaints.length}</p>
          <p className="text-xs text-slate-500 mt-1">Bus delays & route requests</p>
        </div>
      </div>

      {/* Main Tabs Container */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between flex-wrap gap-3">
          <div className="flex gap-6">
            <button
              onClick={() => { setActiveTab('buses'); setStatusFilter('ALL'); }}
              className={`py-4 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
                activeTab === 'buses'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Bus className="w-4 h-4" />
              Bus Fleet ({buses.length})
            </button>
            <button
              onClick={() => { setActiveTab('routes'); setStatusFilter('ALL'); }}
              className={`py-4 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
                activeTab === 'routes'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Navigation className="w-4 h-4" />
              Routes & Stops ({routes.length})
            </button>
            <button
              onClick={() => { setActiveTab('complaints'); setStatusFilter('ALL'); }}
              className={`py-4 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
                activeTab === 'complaints'
                  ? 'border-indigo-600 text-indigo-600'
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
                placeholder="Search buses, drivers, routes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-44 sm:w-56"
              />
            </div>
            {activeTab === 'buses' && (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active in Service</option>
                <option value="DELAYED">Delayed</option>
                <option value="OUT_OF_SERVICE">Out of Service</option>
              </select>
            )}
          </div>
        </div>

        {/* Tab 1: Buses Table */}
        {activeTab === 'buses' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5 text-left">Bus Number</th>
                  <th className="px-6 py-3.5 text-left">Assigned Route</th>
                  <th className="px-6 py-3.5 text-left">Operational Status</th>
                  <th className="px-6 py-3.5 text-left">Current / Next Stop</th>
                  <th className="px-6 py-3.5 text-left">Driver Contact</th>
                  <th className="px-6 py-3.5 text-left">Active Fleet</th>
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
                ) : filteredBuses.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-slate-400">
                      No transit buses found matching the current filters.
                    </td>
                  </tr>
                ) : (
                  filteredBuses.map(bus => (
                    <tr key={bus.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-3.5 font-mono font-bold text-slate-900">
                        {bus.registration_number || bus.bus_number}
                        <div className="text-[11px] text-slate-400 font-sans font-normal">Capacity: {bus.capacity} seats</div>
                      </td>
                      <td className="px-6 py-3.5 text-xs text-slate-700">
                        <div className="font-semibold text-slate-900">
                          {bus.route_number ? `Route ${bus.route_number}` : 'Unassigned'}
                        </div>
                        <div className="text-[11px] text-slate-400">{bus.route_name || 'Circular'}</div>
                      </td>
                      <td className="px-6 py-3.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                          bus.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          bus.status === 'DELAYED' ? 'bg-orange-50 text-orange-700 border border-orange-200' :
                          'bg-slate-100 text-slate-500'
                        }`}>
                          {bus.status || (bus.is_active ? 'ACTIVE' : 'OUT_OF_SERVICE')}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-xs text-slate-700">
                        <div><span className="text-slate-400">Current:</span> {bus.current_stop || 'In Transit'}</div>
                        <div><span className="text-slate-400">Next:</span> <span className="font-medium text-indigo-700">{bus.next_stop || 'Terminal'}</span></div>
                      </td>
                      <td className="px-6 py-3.5 text-xs text-slate-600">
                        <div className="font-medium text-slate-800">{bus.driver_name || 'Duty Driver'}</div>
                        <div className="text-[11px] text-slate-400">{bus.driver_phone || '—'}</div>
                      </td>
                      <td className="px-6 py-3.5">
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${
                          bus.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {bus.is_active ? 'In Fleet' : 'Decommissioned'}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleViewLiveLocation(bus)}
                            className="px-2.5 py-1 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded border border-indigo-200 flex items-center gap-1"
                            title="View GPS Ping"
                          >
                            <Radio className="w-3.5 h-3.5" />
                            GPS
                          </button>
                          <button
                            onClick={() => {
                              setEditingBus(bus);
                              setBusForm({
                                registration_number: bus.registration_number,
                                route: bus.route || '',
                                capacity: bus.capacity,
                                driver_name: bus.driver_name,
                                driver_phone: bus.driver_phone,
                                is_active: bus.is_active,
                              });
                              setBusModalOpen(true);
                            }}
                            className="p-1 text-slate-500 hover:text-indigo-600 rounded hover:bg-slate-100"
                            title="Edit Bus"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleToggleBusActive(bus)}
                            className={`p-1 rounded ${
                              bus.is_active ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'
                            }`}
                            title={bus.is_active ? 'Deactivate Bus' : 'Activate Bus'}
                          >
                            <Power className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Routes Table */}
        {activeTab === 'routes' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5 text-left">Route Number</th>
                  <th className="px-6 py-3.5 text-left">Route Name / Corridors</th>
                  <th className="px-6 py-3.5 text-left">Origin → Destination</th>
                  <th className="px-6 py-3.5 text-left">Distance & Fare</th>
                  <th className="px-6 py-3.5 text-left">En-route Stops</th>
                  <th className="px-6 py-3.5 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {routes.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-slate-400">
                      No transit routes registered for this area.
                    </td>
                  </tr>
                ) : (
                  routes.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-3.5 font-mono font-bold text-indigo-700">
                        {r.route_number}
                      </td>
                      <td className="px-6 py-3.5 font-medium text-slate-900">
                        {r.name}
                      </td>
                      <td className="px-6 py-3.5 text-xs text-slate-700">
                        <span className="font-semibold">{r.origin}</span> → <span className="font-semibold">{r.destination}</span>
                      </td>
                      <td className="px-6 py-3.5 text-xs text-slate-600">
                        {r.distance_km} km · ₹{r.fare_inr}
                      </td>
                      <td className="px-6 py-3.5 text-xs text-slate-600">
                        {r.stops?.length ? `${r.stops.length} Stops` : 'Direct Link'}
                      </td>
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
                      No public transport citizen complaints reported.
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
                          className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700"
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

      {/* Modal: Live GPS Telemetry */}
      {selectedBusLive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Radio className="w-4 h-4 text-indigo-600 animate-pulse" />
                Live Vehicle Telemetry
              </h3>
              <button onClick={() => setSelectedBusLive(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div className="text-xs text-slate-500">Bus Identifier</div>
                <div className="text-sm font-bold text-slate-900 font-mono">
                  {selectedBusLive.bus.registration_number}
                </div>
              </div>

              {liveLocationLoading ? (
                <div className="py-6 text-center text-xs text-slate-400 animate-pulse">
                  Pinging GPS hardware unit...
                </div>
              ) : selectedBusLive.location && selectedBusLive.location.location_lat ? (
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Latitude / Longitude</span>
                    <span className="font-mono font-semibold text-slate-800">
                      {selectedBusLive.location.location_lat}, {selectedBusLive.location.location_lng}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Current Speed</span>
                    <span className="font-semibold text-slate-800">{selectedBusLive.location.speed_kmh} km/h</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Passenger Occupancy</span>
                    <span className="font-semibold text-slate-800">{selectedBusLive.location.occupancy_percent}%</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Last Telemetry Ping</span>
                    <span className="text-slate-500">{new Date(selectedBusLive.location.recorded_at).toLocaleTimeString()}</span>
                  </div>
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-slate-400">
                  No active GPS signal received from hardware transmitter yet.
                </div>
              )}
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setSelectedBusLive(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add/Edit Bus */}
      {busModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-lg">
                {editingBus ? 'Edit Bus Record' : 'Add Vehicle to Fleet'}
              </h3>
              <button onClick={() => setBusModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBus} className="space-y-4 mt-4">
              <div>
                <label className="text-xs font-semibold text-slate-700">Vehicle Registration Number</label>
                <input
                  type="text"
                  value={busForm.registration_number}
                  onChange={(e) => setBusForm({ ...busForm, registration_number: e.target.value.toUpperCase() })}
                  placeholder="e.g. OD-02-CB-9021"
                  className="w-full text-sm mt-1 px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 font-mono uppercase"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Assigned Route</label>
                  <select
                    value={busForm.route}
                    onChange={(e) => setBusForm({ ...busForm, route: e.target.value })}
                    className="w-full text-sm mt-1 px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select Route...</option>
                    {routes.map(r => (
                      <option key={r.id} value={r.id}>Route {r.route_number}: {r.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Passenger Capacity</label>
                  <input
                    type="number"
                    value={busForm.capacity}
                    onChange={(e) => setBusForm({ ...busForm, capacity: parseInt(e.target.value, 10) || 50 })}
                    className="w-full text-sm mt-1 px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500"
                    min="15"
                    max="100"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Driver Name</label>
                  <input
                    type="text"
                    value={busForm.driver_name}
                    onChange={(e) => setBusForm({ ...busForm, driver_name: e.target.value })}
                    placeholder="e.g. Manoj Behera"
                    className="w-full text-sm mt-1 px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Driver Phone</label>
                  <input
                    type="text"
                    value={busForm.driver_phone}
                    onChange={(e) => setBusForm({ ...busForm, driver_phone: e.target.value })}
                    placeholder="e.g. 9876543210"
                    className="w-full text-sm mt-1 px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="busActive"
                  checked={busForm.is_active}
                  onChange={(e) => setBusForm({ ...busForm, is_active: e.target.checked })}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="busActive" className="text-xs font-medium text-slate-700">
                  Active in Municipal Fleet
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setBusModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm disabled:opacity-50"
                >
                  {actionLoading ? 'Saving...' : 'Save Bus'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Route */}
      {routeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-lg">Add Transit Route</h3>
              <button onClick={() => setRouteModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRoute} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Route Number</label>
                  <input
                    type="text"
                    value={routeForm.route_number}
                    onChange={(e) => setRouteForm({ ...routeForm, route_number: e.target.value.toUpperCase() })}
                    placeholder="e.g. 24A"
                    className="w-full text-sm mt-1 px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 font-mono uppercase"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Route Title</label>
                  <input
                    type="text"
                    value={routeForm.name}
                    onChange={(e) => setRouteForm({ ...routeForm, name: e.target.value })}
                    placeholder="e.g. Master Canteen to AIIMS"
                    className="w-full text-sm mt-1 px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Origin</label>
                  <input
                    type="text"
                    value={routeForm.origin}
                    onChange={(e) => setRouteForm({ ...routeForm, origin: e.target.value })}
                    placeholder="e.g. Master Canteen"
                    className="w-full text-sm mt-1 px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Destination</label>
                  <input
                    type="text"
                    value={routeForm.destination}
                    onChange={(e) => setRouteForm({ ...routeForm, destination: e.target.value })}
                    placeholder="e.g. AIIMS Hospital"
                    className="w-full text-sm mt-1 px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Distance (km)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={routeForm.distance_km}
                    onChange={(e) => setRouteForm({ ...routeForm, distance_km: e.target.value })}
                    className="w-full text-sm mt-1 px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Standard Fare (₹)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={routeForm.fare_inr}
                    onChange={(e) => setRouteForm({ ...routeForm, fare_inr: e.target.value })}
                    className="w-full text-sm mt-1 px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRouteModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm disabled:opacity-50"
                >
                  {actionLoading ? 'Creating...' : 'Create Route'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
