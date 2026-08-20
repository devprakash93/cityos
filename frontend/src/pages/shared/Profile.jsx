import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import {
  User, Mail, Phone, MapPin, Shield, Bell,
  Settings, LogOut, ChevronRight, Save,
  Edit3, X, CheckCircle2
} from 'lucide-react';

/* ─── Citizen-only Profile Page ─── */
export default function Profile() {
  const { user, logout, fetchProfile } = useAuth();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    address: '',
    bio: '',
  });

  useEffect(() => {
    if (user) {
      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        phone: user.profile?.phone || '',
        address: user.profile?.address || '',
        bio: user.profile?.bio || '',
      });
    }
  }, [user]);

  const handleChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSave = async () => {
    setLoading(true);
    try {
      await api.patch('/auth/me/', {
        first_name: formData.first_name,
        last_name: formData.last_name,
        profile: {
          phone: formData.phone,
          address: formData.address,
          bio: formData.bio,
        },
      });
      await fetchProfile?.();
      setSaved(true);
      setEditing(false);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      alert('Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  const initial = user.full_name
    ? user.full_name.charAt(0).toUpperCase()
    : user.email?.charAt(0).toUpperCase() || 'C';

  const fullName = user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">My Profile</h1>
        <p className="text-xs text-slate-500 mt-0.5">Manage your personal information</p>
      </div>

      {/* Success toast */}
      {saved && (
        <div className="citizen-card flex items-center gap-3 p-3.5 bg-green-50 border border-green-100">
          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
          <p className="text-sm font-semibold text-green-700">Profile updated successfully!</p>
        </div>
      )}

      {/* Avatar + Identity card */}
      <div className="citizen-card rounded-3xl overflow-hidden">
        {/* Gradient header */}
        <div className="h-20" style={{ background: 'linear-gradient(135deg, #1e3a5f, #2563eb)' }} />

        {/* Avatar */}
        <div className="px-4 pb-4 -mt-10">
          <div className="flex items-end justify-between">
            <div className="w-20 h-20 rounded-3xl border-4 border-white shadow-lg flex items-center justify-center text-2xl font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #0d9488, #0369a1)' }}
            >
              {initial}
            </div>
            <button
              onClick={() => setEditing(!editing)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-bold transition-all ${
                editing
                  ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
              }`}
            >
              {editing ? <X className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
              {editing ? 'Cancel' : 'Edit'}
            </button>
          </div>

          <div className="mt-3">
            <h2 className="text-lg font-bold text-slate-900">{fullName}</h2>
            <p className="text-sm text-slate-500">{user.email}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700">
                <Shield className="w-3 h-3" /> Citizen
              </span>
              {user.profile?.phone && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                  <Phone className="w-3 h-3" /> {user.profile.phone}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit form */}
      {editing ? (
        <div className="citizen-card rounded-3xl p-4 space-y-4">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Edit Information</h3>

          <div className="grid grid-cols-2 gap-3">
            {[
              { name: 'first_name', label: 'First Name' },
              { name: 'last_name', label: 'Last Name' },
            ].map(f => (
              <div key={f.name}>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">{f.label}</label>
                <input
                  name={f.name}
                  value={formData[f.name]}
                  onChange={handleChange}
                  className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-transparent transition-all"
                />
              </div>
            ))}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Phone Number</label>
            <input
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-transparent transition-all"
              placeholder="+91 XXXXX XXXXX"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Address</label>
            <input
              name="address"
              value={formData.address}
              onChange={handleChange}
              className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-transparent transition-all"
              placeholder="Your address"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Bio</label>
            <textarea
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              rows={3}
              className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-transparent resize-none transition-all"
              placeholder="Tell us a bit about yourself"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-blue-600 text-white text-sm font-bold rounded-2xl hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-60 shadow-sm"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      ) : (
        /* Info display rows */
        <div className="citizen-card rounded-3xl overflow-hidden divide-y divide-slate-100">
          {[
            { icon: Mail,    label: 'Email',   value: user.email },
            { icon: Phone,   label: 'Phone',   value: user.profile?.phone || 'Not set' },
            { icon: MapPin,  label: 'Address', value: user.profile?.address || 'Not set' },
            { icon: User,    label: 'Bio',     value: user.profile?.bio || 'Not set' },
          ].map(row => (
            <div key={row.label} className="flex items-center gap-3 px-4 py-3.5">
              <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                <row.icon className="w-4 h-4 text-slate-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">{row.label}</p>
                <p className={`text-sm font-medium mt-0.5 truncate ${row.value === 'Not set' ? 'text-slate-400 italic' : 'text-slate-800'}`}>
                  {row.value}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick actions */}
      <div className="citizen-card rounded-3xl overflow-hidden divide-y divide-slate-100">
        {[
          { icon: Bell,     label: 'Notifications',  to: '/citizen/notifications',  color: 'text-blue-600',  bg: 'bg-blue-50' },
          { icon: Settings, label: 'Settings',        to: '/citizen/settings',        color: 'text-slate-600', bg: 'bg-slate-100' },
        ].map(item => (
          <button
            key={item.to}
            onClick={() => navigate(item.to)}
            className="w-full flex items-center gap-3 px-4 py-4 hover:bg-slate-50 active:bg-slate-100 transition-colors text-left"
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${item.bg} flex-shrink-0`}>
              <item.icon className={`w-4 h-4 ${item.color}`} />
            </div>
            <span className="flex-1 text-sm font-semibold text-slate-800">{item.label}</span>
            <ChevronRight className="w-4 h-4 text-slate-300" />
          </button>
        ))}
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="w-full flex items-center gap-3 px-4 py-4 rounded-3xl bg-white border border-red-100 hover:bg-red-50 active:bg-red-100 transition-colors text-left"
        style={{ boxShadow: '0 1px 8px rgb(0 0 0 / 0.04)' }}
      >
        <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
          <LogOut className="w-4 h-4 text-red-500" />
        </div>
        <span className="flex-1 text-sm font-bold text-red-600">Logout</span>
      </button>

      {/* App version */}
      <p className="text-center text-xs text-slate-400 pb-2">Odisha CityOS · Citizen Portal v1.0</p>
    </div>
  );
}
