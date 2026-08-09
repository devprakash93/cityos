import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import {
  MapPin, Search, ChevronRight, Building, Users, Map,
  RefreshCw, Filter, Plus
} from 'lucide-react';
import GeographyModal from './geography/GeographyModal';

const TABS = ['Districts', 'Cities', 'Zones', 'Wards'];

function StatBadge({ label, value, color = 'bg-slate-100 text-slate-700' }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${color}`}>
      {value} {label}
    </span>
  );
}

export default function GeographyManagement() {
  const [activeTab, setActiveTab] = useState('Districts');
  const [cities, setCities] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [zones, setZones] = useState([]);
  const [wards, setWards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalType, setModalType] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [distRes, cityRes, zoneRes, wardRes] = await Promise.all([
        api.get('/geography/districts/'),
        api.get('/geography/cities/'),
        api.get('/geography/zones/'),
        api.get('/geography/wards/'),
      ]);
      setDistricts(distRes.data.results ?? distRes.data ?? []);
      setCities(cityRes.data.results ?? cityRes.data ?? []);
      setZones(zoneRes.data.results ?? zoneRes.data ?? []);
      setWards(wardRes.data.results ?? wardRes.data ?? []);
    } catch (err) {
      console.error("Failed to fetch geography data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filteredCities = cities.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.district_name?.toLowerCase().includes(search.toLowerCase())
  );
  const filteredDistricts = districts.filter(d =>
    d.name?.toLowerCase().includes(search.toLowerCase())
  );
  const filteredZones = zones.filter(z =>
    z.name?.toLowerCase().includes(search.toLowerCase()) ||
    z.city_name?.toLowerCase().includes(search.toLowerCase())
  );
  const filteredWards = wards.filter(w =>
    w.name?.toLowerCase().includes(search.toLowerCase()) ||
    w.zone_name?.toLowerCase().includes(search.toLowerCase()) ||
    w.city_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Geography Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage Odisha's geographic hierarchy</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchData} className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => setModalType(activeTab.slice(0, -1).toLowerCase())} className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm">
            <Plus className="w-4 h-4" /> Add {activeTab.slice(0, -1)}
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Map, label: 'Districts', value: districts.length, color: 'text-blue-600 bg-blue-50' },
          { icon: Building, label: 'Cities', value: cities.length, color: 'text-green-600 bg-green-50' },
          { icon: MapPin, label: 'Zones', value: zones.length, color: 'text-purple-600 bg-purple-50' },
          { icon: Users, label: 'Wards', value: wards.length, color: 'text-orange-600 bg-orange-50' },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3 shadow-sm">
            <div className={`p-2 rounded-lg ${card.color}`}>
              <card.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500">{card.label}</p>
              <p className="text-xl font-bold text-slate-900">{loading ? '—' : card.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main panel */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Tabs + Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 border-b border-slate-100 gap-3">
          <div className="flex gap-1 p-1 bg-slate-100 rounded-lg">
            {TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  activeTab === tab
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent w-full sm:w-56"
            />
          </div>
        </div>

        {/* Cities Table */}
        {activeTab === 'Cities' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">City</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">District</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Zones</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Wards</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Population</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Area</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  [...Array(4)].map((_, i) => (
                    <tr key={i}><td colSpan="7" className="px-6 py-4"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td></tr>
                  ))
                ) : filteredCities.length === 0 ? (
                  <tr><td colSpan="7" className="px-6 py-10 text-center text-slate-400">No cities found.</td></tr>
                ) : (
                  filteredCities.map(city => (
                    <tr key={city.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-3 font-semibold text-slate-800">{city.name}</td>
                      <td className="px-6 py-3 text-slate-600">{city.district_name || '—'}</td>
                      <td className="px-6 py-3 text-slate-600">{city.zone_count ?? '—'}</td>
                      <td className="px-6 py-3 text-slate-600">{city.ward_count ?? '—'}</td>
                      <td className="px-6 py-3 text-slate-600">{city.population ? city.population.toLocaleString() : '—'}</td>
                      <td className="px-6 py-3 text-slate-600">{city.area_sq_km ? `${city.area_sq_km} km²` : '—'}</td>
                      <td className="px-6 py-3">
                        <Link to={`/admin/geography/cities/${city.id}`} className="text-xs text-green-600 hover:text-green-700 font-semibold flex items-center gap-1">
                          View <ChevronRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Districts Table */}
        {activeTab === 'Districts' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">District</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">State</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Cities</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  [...Array(4)].map((_, i) => (
                    <tr key={i}><td colSpan="4" className="px-6 py-4"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td></tr>
                  ))
                ) : filteredDistricts.length === 0 ? (
                  <tr><td colSpan="4" className="px-6 py-10 text-center text-slate-400">No districts found.</td></tr>
                ) : (
                  filteredDistricts.map(dist => (
                    <tr key={dist.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-3 font-semibold text-slate-800">{dist.name}</td>
                      <td className="px-6 py-3 text-slate-600">{dist.state_name || 'Odisha'}</td>
                      <td className="px-6 py-3 text-slate-600">
                        {cities.filter(c => c.district === dist.id).length} cities
                      </td>
                      <td className="px-6 py-3">
                        <Link to={`/admin/geography/districts/${dist.id}`} className="text-xs text-green-600 hover:text-green-700 font-semibold flex items-center gap-1">
                          View <ChevronRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Zones Table */}
        {activeTab === 'Zones' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Zone</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">City</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Wards</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  [...Array(4)].map((_, i) => (
                    <tr key={i}><td colSpan="5" className="px-6 py-4"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td></tr>
                  ))
                ) : filteredZones.length === 0 ? (
                  <tr><td colSpan="5" className="px-6 py-10 text-center text-slate-400">No zones found.</td></tr>
                ) : (
                  filteredZones.map(zone => (
                    <tr key={zone.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-3 font-semibold text-slate-800">{zone.name}</td>
                      <td className="px-6 py-3 text-slate-600">{zone.city_name || '—'}</td>
                      <td className="px-6 py-3 text-slate-600">
                        {wards.filter(w => w.zone === zone.id).length} wards
                      </td>
                      <td className="px-6 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${zone.is_active !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {zone.is_active !== false ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        <Link to={`/admin/geography/zones/${zone.id}`} className="text-xs text-green-600 hover:text-green-700 font-semibold flex items-center gap-1">
                          View <ChevronRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Wards Table */}
        {activeTab === 'Wards' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Ward</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Zone</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">City</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  [...Array(4)].map((_, i) => (
                    <tr key={i}><td colSpan="5" className="px-6 py-4"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td></tr>
                  ))
                ) : filteredWards.length === 0 ? (
                  <tr><td colSpan="5" className="px-6 py-10 text-center text-slate-400">No wards found.</td></tr>
                ) : (
                  filteredWards.map(ward => (
                    <tr key={ward.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-3 font-semibold text-slate-800">Ward {ward.number} {ward.name && `(${ward.name})`}</td>
                      <td className="px-6 py-3 text-slate-600">{ward.zone_name || '—'}</td>
                      <td className="px-6 py-3 text-slate-600">{ward.city_name || '—'}</td>
                      <td className="px-6 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${ward.is_active !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {ward.is_active !== false ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        <Link to={`/admin/geography/wards/${ward.id}`} className="text-xs text-green-600 hover:text-green-700 font-semibold flex items-center gap-1">
                          View <ChevronRight className="w-3 h-3" />
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

      {modalType && (
        <GeographyModal 
          type={modalType} 
          onClose={() => setModalType(null)} 
          onSuccess={fetchData} 
        />
      )}
    </div>
  );
}
