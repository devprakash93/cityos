import { useState, useEffect } from 'react';
import { 
  Eye, Save, Send, Clock, X, Upload, CheckCircle2,
  AlertTriangle, Building2, Globe, ShieldAlert, Sparkles, MapPin
} from 'lucide-react';
import api from '../../api/axios';
import AnnouncementPreview from './AnnouncementPreview';

const PRESET_BANNERS = [
  { label: 'Welfare Scheme', url: '/banners/welfare_scheme.svg', category: 'WELFARE_SCHEME' },
  { label: 'Clean City Campaign', url: '/banners/city_campaign.svg', category: 'CITY_CAMPAIGN' },
  { label: 'Emergency Alert', url: '/banners/emergency_alert.svg', category: 'EMERGENCY_ALERT' },
  { label: 'General Announcement', url: '/banners/announcement.svg', category: 'ANNOUNCEMENT' },
  { label: 'Traffic & Roads', url: '/banners/traffic.svg', category: 'TRAFFIC' },
];

const COMMON_INTERNAL_ROUTES = [
  { label: 'City Services Hub', route: '/citizen/services' },
  { label: 'Report a Grievance', route: '/citizen/report' },
  { label: 'Track Complaints', route: '/citizen/complaints' },
  { label: 'Emergency Services', route: '/citizen/emergency' },
  { label: 'Water Supply', route: '/citizen/water' },
  { label: 'Power & Grid', route: '/citizen/electricity' },
  { label: 'Public Transit', route: '/citizen/transport' },
  { label: 'Waste Management', route: '/citizen/waste' },
  { label: 'Traffic Live Monitor', route: '/citizen/traffic' },
  { label: 'Announcements Feed', route: '/citizen/announcements' },
];

export default function AnnouncementEditor({
  initialData = null,
  onSaveSuccess,
  onCancel,
}) {
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    summary: '',
    content: '',
    category: 'ANNOUNCEMENT',
    department: '',
    department_name: '',
    banner_image_url: '/banners/announcement.svg',
    thumbnail_image_url: '/banners/announcement.svg',
    audience_scope: 'ALL',
    target_district: '',
    target_city: '',
    target_zone: '',
    target_ward: '',
    cta_label: 'View Details',
    cta_type: 'INTERNAL',
    cta_destination: '/citizen/services',
    secondary_cta_label: '',
    secondary_cta_type: 'INTERNAL',
    secondary_cta_destination: '',
    is_featured: true,
    is_pinned: false,
    display_order: 0,
    priority: 'NORMAL',
    status: 'PUBLISHED',
    publish_at: new Date().toISOString().slice(0, 16),
    expires_at: '',
  });

  const [departments, setDepartments] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [cities, setCities] = useState([]);
  const [loadingLookups, setLoadingLookups] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  // Initialize form with initialData if editing
  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        publish_at: initialData.publish_at ? initialData.publish_at.slice(0, 16) : '',
        expires_at: initialData.expires_at ? initialData.expires_at.slice(0, 16) : '',
      });
    }
  }, [initialData]);

  // Load departments and geography lookups
  useEffect(() => {
    const fetchLookups = async () => {
      try {
        const [deptRes, distRes, cityRes] = await Promise.allSettled([
          api.get('/departments/'),
          api.get('/geography/districts/'),
          api.get('/geography/cities/'),
        ]);

        if (deptRes.status === 'fulfilled') {
          const data = deptRes.value.data?.results || deptRes.value.data || [];
          setDepartments(data);
        }
        if (distRes.status === 'fulfilled') {
          const data = distRes.value.data?.results || distRes.value.data || [];
          setDistricts(data);
        }
        if (cityRes.status === 'fulfilled') {
          const data = cityRes.value.data?.results || cityRes.value.data || [];
          setCities(data);
        }
      } catch (err) {
        console.error('Failed to load lookups', err);
      } finally {
        setLoadingLookups(false);
      }
    };
    fetchLookups();
  }, []);

  // Auto-slug generation from title
  const handleTitleChange = (val) => {
    const slugified = val
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');

    setFormData(prev => ({
      ...prev,
      title: val,
      slug: initialData ? prev.slug : slugified,
    }));
  };

  const handleDepartmentChange = (deptId) => {
    const found = departments.find(d => String(d.id) === String(deptId));
    setFormData(prev => ({
      ...prev,
      department: deptId ? Number(deptId) : null,
      department_name: found ? found.name : 'Government of Odisha',
    }));
  };

  const handleCategoryChange = (cat) => {
    // Recommend matching banner preset
    const preset = PRESET_BANNERS.find(p => p.category === cat);
    setFormData(prev => ({
      ...prev,
      category: cat,
      banner_image_url: preset ? preset.url : prev.banner_image_url,
      thumbnail_image_url: preset ? preset.url : prev.thumbnail_image_url,
      priority: cat === 'EMERGENCY_ALERT' ? 'EMERGENCY' : prev.priority,
    }));
  };

  // Submit Handler
  const handleSubmit = async (e, overrideStatus = null) => {
    if (e) e.preventDefault();
    setErrorMsg('');

    if (!formData.title.trim()) {
      setErrorMsg('Announcement title is required.');
      return;
    }

    const payload = {
      ...formData,
      status: overrideStatus || formData.status,
      publish_at: formData.publish_at ? new Date(formData.publish_at).toISOString() : new Date().toISOString(),
      expires_at: formData.expires_at ? new Date(formData.expires_at).toISOString() : null,
      target_district: formData.target_district ? Number(formData.target_district) : null,
      target_city: formData.target_city ? Number(formData.target_city) : null,
      department: formData.department ? Number(formData.department) : null,
      display_order: Number(formData.display_order) || 0,
    };

    setSubmitting(true);
    try {
      if (initialData?.id) {
        await api.patch(`/admin/announcements/${initialData.id}/`, payload);
      } else {
        await api.post('/admin/announcements/', payload);
      }
      if (onSaveSuccess) onSaveSuccess();
    } catch (err) {
      const respData = err.response?.data;
      if (typeof respData === 'object' && respData !== null) {
        const firstKey = Object.keys(respData)[0];
        const val = respData[firstKey];
        setErrorMsg(`${firstKey}: ${Array.isArray(val) ? val.join(', ') : val}`);
      } else {
        setErrorMsg('Failed to save announcement. Please check your inputs and permissions.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-white space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-400" />
            {initialData ? 'Edit Official Announcement' : 'Create Official Civic Announcement'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Author and configure official announcements, welfare campaigns, and emergency advisories.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowPreview(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs sm:text-sm font-semibold transition-colors"
          >
            <Eye className="w-4 h-4 text-blue-400" /> Live Preview
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-950/60 border border-red-800/80 text-red-200 text-xs sm:text-sm flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1">{errorMsg}</div>
        </div>
      )}

      {/* Main Form Form Fields */}
      <form onSubmit={(e) => handleSubmit(e)} className="space-y-6">
        {/* Section 1: Core Details */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
            1. Core Information
          </h3>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Announcement Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Biju Swasthya Kalyan Yojana (BSKY) Health Card Universal Coverage"
              value={formData.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="w-full bg-slate-800/70 border border-slate-700 rounded-xl p-3 text-sm text-white placeholder:text-slate-500 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Official Category <span className="text-red-400">*</span>
              </label>
              <select
                value={formData.category}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full bg-slate-800/70 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-hidden focus:border-blue-500"
              >
                <option value="ANNOUNCEMENT">Official Announcement</option>
                <option value="WELFARE_SCHEME">Welfare Scheme &amp; Citizen Benefits</option>
                <option value="CITY_CAMPAIGN">City Campaign &amp; Cleanliness</option>
                <option value="EMERGENCY_ALERT">Emergency Alert (Super Admin Only)</option>
                <option value="PUBLIC_NOTICE">Public Notice</option>
                <option value="TRAFFIC">Traffic &amp; Roadwork Notice</option>
                <option value="WATER">Water Supply Notice</option>
                <option value="ELECTRICITY">Electricity &amp; Power Notice</option>
                <option value="TRANSPORT">Public Transit Notice</option>
                <option value="EVENT">Public Civic Event</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Publishing Department
              </label>
              <select
                value={formData.department || ''}
                onChange={(e) => handleDepartmentChange(e.target.value)}
                className="w-full bg-slate-800/70 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-hidden focus:border-blue-500"
              >
                <option value="">Government of Odisha (General Administration)</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Short Teaser Summary (Banner &amp; Card View)
            </label>
            <textarea
              rows={2}
              placeholder="Crisp 1-2 sentence overview visible on the citizen homepage banner."
              value={formData.summary}
              onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
              className="w-full bg-slate-800/70 border border-slate-700 rounded-xl p-3 text-sm text-white placeholder:text-slate-500 focus:outline-hidden focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Full Content &amp; Directives (Markdown / Rich Text)
            </label>
            <textarea
              rows={5}
              placeholder="Full announcement instructions, eligibility, schedules, and helpline details."
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className="w-full bg-slate-800/70 border border-slate-700 rounded-xl p-3 text-sm text-white placeholder:text-slate-500 focus:outline-hidden focus:border-blue-500 font-mono text-xs leading-relaxed"
            />
          </div>
        </div>

        {/* Section 2: Visual Banner Assets */}
        <div className="space-y-4 pt-4 border-t border-slate-800">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
            2. Visual Banner &amp; Imagery
          </h3>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Select Curated High-Res Civic Banner Preset
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
              {PRESET_BANNERS.map((preset) => (
                <button
                  key={preset.url}
                  type="button"
                  onClick={() =>
                    setFormData(prev => ({
                      ...prev,
                      banner_image_url: preset.url,
                      thumbnail_image_url: preset.url,
                    }))
                  }
                  className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                    formData.banner_image_url === preset.url
                      ? 'border-blue-500 bg-blue-950/40 ring-1 ring-blue-500'
                      : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                  }`}
                >
                  <div className="h-12 w-full rounded-lg overflow-hidden bg-slate-900 mb-2 border border-slate-800">
                    <img src={preset.url} alt="" className="w-full h-full object-cover" />
                  </div>
                  <span className="text-[11px] font-semibold text-slate-200 truncate">
                    {preset.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Or Custom Banner Graphic URL / Upload Path
            </label>
            <input
              type="text"
              placeholder="/banners/welfare_scheme.svg or https://images.unsplash.com/..."
              value={formData.banner_image_url}
              onChange={(e) => setFormData({ ...formData, banner_image_url: e.target.value })}
              className="w-full bg-slate-800/70 border border-slate-700 rounded-xl p-3 text-sm text-white placeholder:text-slate-500 focus:outline-hidden focus:border-blue-500"
            />
          </div>
        </div>

        {/* Section 3: Audience & Geography Targeting */}
        <div className="space-y-4 pt-4 border-t border-slate-800">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-emerald-400" /> 3. Audience &amp; Geography Scope
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Target Audience Scope
              </label>
              <select
                value={formData.audience_scope}
                onChange={(e) => setFormData({ ...formData, audience_scope: e.target.value })}
                className="w-full bg-slate-800/70 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-hidden focus:border-blue-500"
              >
                <option value="ALL">All Odisha Citizens (Statewide Broadcast)</option>
                <option value="DISTRICT">Specific District</option>
                <option value="CITY">Specific City / Municipality</option>
              </select>
            </div>

            {formData.audience_scope === 'DISTRICT' && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Select Target District
                </label>
                <select
                  value={formData.target_district || ''}
                  onChange={(e) => setFormData({ ...formData, target_district: e.target.value })}
                  className="w-full bg-slate-800/70 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-hidden focus:border-blue-500"
                >
                  <option value="">-- Select District --</option>
                  {districts.map((dist) => (
                    <option key={dist.id} value={dist.id}>
                      {dist.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {formData.audience_scope === 'CITY' && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Select Target City / Municipal Corporation
                </label>
                <select
                  value={formData.target_city || ''}
                  onChange={(e) => setFormData({ ...formData, target_city: e.target.value })}
                  className="w-full bg-slate-800/70 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-hidden focus:border-blue-500"
                >
                  <option value="">-- Select City --</option>
                  {cities.map((city) => (
                    <option key={city.id} value={city.id}>
                      {city.name} ({city.district_name || 'Odisha'})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Section 4: Call to Action (CTA) Configuration */}
        <div className="space-y-4 pt-4 border-t border-slate-800">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
            4. Call to Action (CTA) Configuration
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Primary CTA Label
              </label>
              <input
                type="text"
                placeholder="Check Eligibility"
                value={formData.cta_label}
                onChange={(e) => setFormData({ ...formData, cta_label: e.target.value })}
                className="w-full bg-slate-800/70 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-hidden focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                CTA Destination Type
              </label>
              <select
                value={formData.cta_type}
                onChange={(e) => setFormData({ ...formData, cta_type: e.target.value })}
                className="w-full bg-slate-800/70 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-hidden focus:border-blue-500"
              >
                <option value="INTERNAL">Internal CityOS Route</option>
                <option value="EXTERNAL">External Portal URL (http/https)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                CTA Route or Destination URL
              </label>
              <input
                type="text"
                placeholder="/citizen/services or https://..."
                value={formData.cta_destination}
                onChange={(e) => setFormData({ ...formData, cta_destination: e.target.value })}
                className="w-full bg-slate-800/70 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-hidden focus:border-blue-500"
              />
            </div>
          </div>

          {/* Quick preset internal routes */}
          {formData.cta_type === 'INTERNAL' && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">
                Quick Preset Internal Destinations:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_INTERNAL_ROUTES.map((r) => (
                  <button
                    key={r.route}
                    type="button"
                    onClick={() => setFormData({ ...formData, cta_destination: r.route })}
                    className={`text-[11px] px-2.5 py-1 rounded-lg border transition-colors ${
                      formData.cta_destination === r.route
                        ? 'bg-blue-600 text-white border-blue-500'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Optional Secondary CTA */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Secondary CTA Label (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. View Guidelines"
                value={formData.secondary_cta_label}
                onChange={(e) => setFormData({ ...formData, secondary_cta_label: e.target.value })}
                className="w-full bg-slate-800/70 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-hidden focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Secondary Destination
              </label>
              <input
                type="text"
                placeholder="/citizen/announcements"
                value={formData.secondary_cta_destination}
                onChange={(e) => setFormData({ ...formData, secondary_cta_destination: e.target.value })}
                className="w-full bg-slate-800/70 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-hidden focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Section 5: Display Flags, Scheduling & Lifecycle */}
        <div className="space-y-4 pt-4 border-t border-slate-800">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
            5. Display Settings &amp; Publication Lifecycle
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-800/50 border border-slate-700">
              <input
                type="checkbox"
                id="is_featured"
                checked={formData.is_featured}
                onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="is_featured" className="text-xs font-bold text-white cursor-pointer">
                Featured Carousel Banner
              </label>
            </div>

            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-800/50 border border-slate-700">
              <input
                type="checkbox"
                id="is_pinned"
                checked={formData.is_pinned}
                onChange={(e) => setFormData({ ...formData, is_pinned: e.target.checked })}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="is_pinned" className="text-xs font-bold text-white cursor-pointer">
                Pin to Top of Listing
              </label>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Priority Tier
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full bg-slate-800/70 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-hidden focus:border-blue-500"
              >
                <option value="NORMAL">Normal Priority</option>
                <option value="HIGH">High Priority</option>
                <option value="LOW">Low Priority</option>
                <option value="EMERGENCY">Emergency Priority (Super Admin)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Lifecycle Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full bg-slate-800/70 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-hidden focus:border-blue-500"
              >
                <option value="PUBLISHED">Published (Immediately Visible)</option>
                <option value="DRAFT">Draft (Admin Only)</option>
                <option value="SCHEDULED">Scheduled (Future Activation)</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Publication Start Date/Time
              </label>
              <input
                type="datetime-local"
                value={formData.publish_at}
                onChange={(e) => setFormData({ ...formData, publish_at: e.target.value })}
                className="w-full bg-slate-800/70 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-hidden focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Expiration Date/Time (Optional)
              </label>
              <input
                type="datetime-local"
                value={formData.expires_at}
                onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                className="w-full bg-slate-800/70 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-hidden focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-6 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setShowPreview(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs sm:text-sm font-semibold transition-colors"
          >
            <Eye className="w-4 h-4 text-blue-400" />
            Check Live Preview
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={submitting}
              onClick={(e) => handleSubmit(e, 'DRAFT')}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs sm:text-sm font-semibold transition-colors disabled:opacity-50"
            >
              Save as Draft
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-blue-900/30 transition-all active:scale-95 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {submitting ? 'Saving...' : initialData ? 'Update & Publish' : 'Publish Announcement'}
            </button>
          </div>
        </div>
      </form>

      {/* Live Preview Modal */}
      <AnnouncementPreview
        isOpen={showPreview}
        formData={formData}
        onClose={() => setShowPreview(false)}
      />
    </div>
  );
}
