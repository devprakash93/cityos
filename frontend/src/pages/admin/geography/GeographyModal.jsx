import { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import api from '../../../api/axios';

export default function GeographyModal({ type, item, onClose, onSuccess }) {
  const isEdit = !!item;
  const titleType = type.charAt(0).toUpperCase() + type.slice(1);
  const title = isEdit ? `Edit ${titleType}` : `Add ${titleType}`;

  const [formData, setFormData] = useState({
    name: item?.name || '',
    number: item?.number || '',
    state: item?.state || '',
    district: item?.district || '',
    city: item?.city || '',
    zone: item?.zone || '',
    latitude: item?.latitude || '',
    longitude: item?.longitude || '',
    population: item?.population || '',
    is_active: item?.is_active ?? true,
  });

  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [cities, setCities] = useState([]);
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const stateRes = await api.get('/geography/states/');
        const statesData = stateRes.data.results ?? stateRes.data ?? [];
        setStates(statesData);
        if (!isEdit && statesData.length === 1) {
          setFormData(prev => ({ ...prev, state: statesData[0].id }));
        }

        const distRes = await api.get('/geography/districts/');
        setDistricts(distRes.data.results ?? distRes.data ?? []);

        const cityRes = await api.get('/geography/cities/');
        setCities(cityRes.data.results ?? cityRes.data ?? []);

        const zoneRes = await api.get('/geography/zones/');
        setZones(zoneRes.data.results ?? zoneRes.data ?? []);
      } catch (err) {
        console.error("Failed to load options", err);
      }
    };
    fetchOptions();
  }, [isEdit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      let payload = { ...formData };
      
      // Clean up payload based on type
      if (type === 'district') {
        payload = { name: payload.name, state: payload.state, is_active: payload.is_active };
      } else if (type === 'city') {
        payload = { 
          name: payload.name, district: payload.district, 
          latitude: payload.latitude || null, longitude: payload.longitude || null, 
          population: payload.population || null, is_active: payload.is_active 
        };
      } else if (type === 'zone') {
        payload = { name: payload.name, city: payload.city, is_active: payload.is_active };
      } else if (type === 'ward') {
        payload = { 
          name: payload.name, number: payload.number, 
          city: payload.city, zone: payload.zone || null, 
          is_active: payload.is_active 
        };
      }

      let url = `/geography/${type === 'city' ? 'cities' : type + 's'}/`;
      if (isEdit) {
        url += `${item.id}/`;
        await api.patch(url, payload);
      } else {
        await api.post(url, payload);
      }
      onSuccess();
      onClose();
    } catch (err) {
      if (err.response?.data) {
        // DRF returns object with errors
        const errObj = err.response.data;
        const msg = Object.values(errObj).map(v => Array.isArray(v) ? v[0] : v).join(' ');
        setError(msg || 'An error occurred.');
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredDistricts = districts.filter(d => !formData.state || d.state === parseInt(formData.state));
  const filteredCities = cities.filter(c => !formData.district || c.district === parseInt(formData.district));
  const filteredZones = zones.filter(z => !formData.city || z.city === parseInt(formData.city));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
              {error}
            </div>
          )}

          {/* District -> State */}
          {['district', 'city', 'zone', 'ward'].includes(type) && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">State <span className="text-red-500">*</span></label>
              <select
                required
                value={formData.state}
                onChange={e => setFormData({ ...formData, state: e.target.value, district: '', city: '', zone: '' })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Select State</option>
                {states.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}

          {/* City -> District */}
          {['city', 'zone', 'ward'].includes(type) && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">District <span className="text-red-500">*</span></label>
              <select
                required
                value={formData.district}
                onChange={e => setFormData({ ...formData, district: e.target.value, city: '', zone: '' })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                disabled={!formData.state && states.length > 0}
              >
                <option value="">Select District</option>
                {filteredDistricts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          )}

          {/* Zone, Ward -> City */}
          {['zone', 'ward'].includes(type) && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">City <span className="text-red-500">*</span></label>
              <select
                required
                value={formData.city}
                onChange={e => setFormData({ ...formData, city: e.target.value, zone: '' })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                disabled={!formData.district}
              >
                <option value="">Select City</option>
                {filteredCities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}

          {/* Ward -> Zone */}
          {type === 'ward' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Zone (Optional)</label>
              <select
                value={formData.zone}
                onChange={e => setFormData({ ...formData, zone: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                disabled={!formData.city}
              >
                <option value="">No Zone</option>
                {filteredZones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
              </select>
            </div>
          )}

          {/* Name */}
          {['district', 'city', 'zone', 'ward'].includes(type) && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Name {type !== 'ward' && <span className="text-red-500">*</span>}</label>
              <input
                required={type !== 'ward'}
                type="text"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder={type === 'ward' ? 'Optional (e.g. CDA Sector 6)' : `Enter ${type} name`}
              />
            </div>
          )}

          {/* Number (Ward only) */}
          {type === 'ward' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Ward Number <span className="text-red-500">*</span></label>
              <input
                required
                type="number"
                value={formData.number}
                onChange={e => setFormData({ ...formData, number: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="e.g. 12"
              />
            </div>
          )}

          {/* Coordinates & Population (City only) */}
          {type === 'city' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Latitude</label>
                  <input
                    type="number" step="0.0000001"
                    value={formData.latitude}
                    onChange={e => setFormData({ ...formData, latitude: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="e.g. 20.4625"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Longitude</label>
                  <input
                    type="number" step="0.0000001"
                    value={formData.longitude}
                    onChange={e => setFormData({ ...formData, longitude: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="e.g. 85.8830"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Population</label>
                <input
                  type="number"
                  value={formData.population}
                  onChange={e => setFormData({ ...formData, population: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="e.g. 1500000"
                />
              </div>
            </>
          )}

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
              />
              <label htmlFor="is_active" className="text-sm text-slate-700">Active</label>
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              {isEdit ? 'Save Changes' : `Create ${titleType}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
