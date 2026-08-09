import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { CheckCircle2, MapPin, FileText, Upload, X } from 'lucide-react';

const CATEGORIES = [
  { value: 'ROAD', label: 'Road Damage / Pothole' },
  { value: 'STREET_LIGHT', label: 'Street Light Issue' },
  { value: 'GARBAGE', label: 'Garbage / Illegal Dumping' },
  { value: 'DRAINAGE', label: 'Drainage Problem' },
  { value: 'WATER_SUPPLY', label: 'Water Supply Issue' },
  { value: 'WATER_LEAKAGE', label: 'Water Leakage' },
  { value: 'ELECTRICITY', label: 'Electricity Problem' },
  { value: 'TRAFFIC_SIGNAL', label: 'Traffic Signal' },
  { value: 'TRANSPORT', label: 'Public Transport' },
  { value: 'ROAD_BLOCKAGE', label: 'Road Blockage' },
  { value: 'POLLUTION', label: 'Pollution' },
  { value: 'STRAY_ANIMAL', label: 'Stray Animal' },
  { value: 'PUBLIC_TOILET', label: 'Public Toilet' },
  { value: 'FLOODING', label: 'Flooding / Waterlogging' },
  { value: 'CYCLONE', label: 'Cyclone Damage' },
  { value: 'OTHER', label: 'Other' },
];

export default function ReportComplaint() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState('');
  const [file, setFile] = useState(null);

  const [districts, setDistricts] = useState([]);
  const [cities, setCities] = useState([]);
  const [wards, setWards] = useState([]);
  const [geoLoading, setGeoLoading] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    category: 'ROAD',
    description: '',
    address: '',
    priority: 'MEDIUM',
    district_id: '',
    city_id: '',
    ward_id: '',
  });

  // Load districts on mount
  useEffect(() => {
    api.get('/geography/districts/', { params: { page_size: 50 } })
      .then(res => setDistricts(res.data.results || res.data || []))
      .catch(() => {});
  }, []);

  // Load cities when district changes
  useEffect(() => {
    if (!formData.district_id) { setCities([]); setWards([]); return; }
    setGeoLoading(true);
    api.get('/geography/cities/', { params: { district: formData.district_id, page_size: 50 } })
      .then(res => setCities(res.data.results || res.data || []))
      .catch(() => {})
      .finally(() => setGeoLoading(false));
  }, [formData.district_id]);

  // Load wards when city changes
  useEffect(() => {
    if (!formData.city_id) { setWards([]); return; }
    setGeoLoading(true);
    api.get('/geography/wards/', { params: { city: formData.city_id, page_size: 100 } })
      .then(res => setWards(res.data.results || res.data || []))
      .catch(() => {})
      .finally(() => setGeoLoading(false));
  }, [formData.city_id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      if (name === 'district_id') { updated.city_id = ''; updated.ward_id = ''; }
      if (name === 'city_id') { updated.ward_id = ''; }
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload = {
        title: formData.title,
        category: formData.category,
        description: formData.description,
        address: formData.address,
        priority: formData.priority,
        ward: formData.ward_id || null,
      };

      const res = await api.post('/complaints/', payload);
      const complaintId = res.data?.id;

      // Upload photo if attached
      if (file && complaintId) {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('media_type', 'EVIDENCE');
        fd.append('caption', 'Evidence photo attached by citizen');
        await api.post(`/complaints/${complaintId}/media/`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      setSuccess(res.data);
    } catch (err) {
      const errData = err.response?.data;
      if (errData?.error?.detail) {
        const msgs = Object.entries(errData.error.detail).map(([k, v]) =>
          `${k}: ${Array.isArray(v) ? v[0] : v}`
        );
        setError(msgs.join(' | '));
      } else {
        setError(errData?.error?.message || errData?.detail || 'Failed to submit complaint. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <div className="bg-white rounded-2xl border border-green-200 shadow-sm p-10">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Complaint Submitted!</h2>
          <p className="text-slate-500 mb-4">Your issue has been reported and will be reviewed shortly.</p>
          <div className="bg-green-50 border border-green-100 rounded-xl p-4 mb-6">
            <p className="text-sm font-medium text-green-700">Reference Number</p>
            <p className="text-2xl font-bold text-green-800 font-mono mt-1">{success.reference_number}</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => navigate('/citizen/complaints')}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg transition-colors">
              View My Complaints
            </button>
            <button onClick={() => { setSuccess(null); setFormData({ title: '', category: 'ROAD', description: '', address: '', priority: 'MEDIUM', district_id: '', city_id: '', ward_id: '' }); setFile(null); }}
              className="flex-1 py-2.5 border border-slate-300 text-slate-700 text-sm font-bold rounded-lg hover:bg-slate-50 transition-colors">
              Report Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Report an Issue</h1>
        <p className="text-sm text-slate-500 mt-0.5">Help improve your city by reporting civic problems</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm flex items-start gap-2">
            <X className="w-4 h-4 shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        {/* Basic Info */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-500" /> Issue Details
          </h3>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Issue Title *</label>
            <input type="text" name="title" required value={formData.title} onChange={handleChange}
              placeholder="e.g., Broken Street Light on MG Road"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Category *</label>
              <select name="category" required value={formData.category} onChange={handleChange}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Your Priority Assessment</label>
              <select name="priority" value={formData.priority} onChange={handleChange}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="LOW">🟢 Low</option>
                <option value="MEDIUM">🟡 Medium</option>
                <option value="HIGH">🟠 High</option>
                <option value="CRITICAL">🔴 Critical / Emergency</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Detailed Description *</label>
            <textarea name="description" required rows={4} value={formData.description} onChange={handleChange}
              placeholder="Describe the problem in detail. Include what you saw, when it started, and any safety concerns..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
        </div>

        {/* Location */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-500" /> Location
          </h3>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Street Address *</label>
            <input type="text" name="address" required value={formData.address} onChange={handleChange}
              placeholder="e.g., Near Cuttack Railway Station, Station Road"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">District</label>
              <select name="district_id" value={formData.district_id} onChange={handleChange}
                className="w-full rounded-lg border border-slate-300 px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select district...</option>
                {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">City / Town</label>
              <select name="city_id" value={formData.city_id} onChange={handleChange}
                disabled={!formData.district_id || geoLoading}
                className="w-full rounded-lg border border-slate-300 px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50">
                <option value="">Select city...</option>
                {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Ward</label>
              <select name="ward_id" value={formData.ward_id} onChange={handleChange}
                disabled={!formData.city_id || geoLoading}
                className="w-full rounded-lg border border-slate-300 px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50">
                <option value="">Select ward...</option>
                {wards.map(w => <option key={w.id} value={w.id}>Ward {w.number}{w.name ? ` - ${w.name}` : ''}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Photo Upload */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 mb-4">
            <Upload className="w-4 h-4 text-blue-500" /> Photo Evidence (Optional)
          </h3>
          <label htmlFor="photo-upload"
            className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all">
            {file ? (
              <div className="text-center">
                <p className="text-sm font-medium text-blue-600">{file.name}</p>
                <p className="text-xs text-slate-400 mt-1">{(file.size / 1024).toFixed(0)} KB · Click to change</p>
              </div>
            ) : (
              <div className="text-center">
                <Upload className="w-8 h-8 text-slate-400 mx-auto mb-1" />
                <p className="text-sm text-slate-500">Click to upload a photo</p>
                <p className="text-xs text-slate-400">JPG, PNG up to 10MB</p>
              </div>
            )}
            <input id="photo-upload" type="file" accept="image/*" className="sr-only"
              onChange={e => setFile(e.target.files?.[0] || null)} />
          </label>
        </div>

        {/* Submit */}
        <div className="flex gap-3">
          <button type="button" onClick={() => navigate(-1)}
            className="px-6 py-3 border border-slate-300 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={loading}
            className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl disabled:opacity-50 transition-colors">
            {loading ? 'Submitting...' : '📤 Submit Complaint'}
          </button>
        </div>
      </form>
    </div>
  );
}
