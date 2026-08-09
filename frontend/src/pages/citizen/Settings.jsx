import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import { Bell, Lock, Moon, Sun, Monitor, Shield, User, Eye, EyeOff } from 'lucide-react';

function Section({ title, icon: Icon, children }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
        <Icon className="w-4 h-4 text-slate-500" />
        <h3 className="font-semibold text-slate-900">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function Toggle({ label, sub, checked, onChange }) {
  return (
    <label className="flex items-center justify-between py-2 cursor-pointer">
      <div>
        <p className="font-medium text-slate-800 text-sm">{label}</p>
        {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-5.5 rounded-full transition-colors ${checked ? 'bg-primary-600' : 'bg-slate-300'}`}
        style={{ width: '40px', height: '22px' }}
      >
        <div className={`absolute top-0.5 w-4.5 h-4.5 bg-white rounded-full shadow transition-all ${checked ? 'translate-x-5' : 'translate-x-0.5'}`}
          style={{ width: '18px', height: '18px', top: '2px', transition: 'transform 0.2s', transform: checked ? 'translateX(20px)' : 'translateX(2px)' }}
        />
      </button>
    </label>
  );
}

export default function Settings() {
  const { user, logout } = useAuth();
  const [notif, setNotif] = useState({
    complaints: true,
    emergency: true,
    announcements: true,
    city_alerts: false,
  });
  const [theme, setTheme] = useState('system');
  const [passwordForm, setPasswordForm] = useState({ old: '', new1: '', new2: '' });
  const [showPw, setShowPw] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPwError('');
    setPwSuccess('');
    if (passwordForm.new1 !== passwordForm.new2) {
      setPwError('New passwords do not match.');
      return;
    }
    if (passwordForm.new1.length < 8) {
      setPwError('Password must be at least 8 characters.');
      return;
    }
    setPwLoading(true);
    try {
      await api.post('/auth/change-password/', {
        old_password: passwordForm.old,
        new_password: passwordForm.new1,
      });
      setPwSuccess('Password changed successfully!');
      setPasswordForm({ old: '', new1: '', new2: '' });
    } catch (e) {
      setPwError(e.response?.data?.error || e.response?.data?.old_password?.[0] || 'Failed to change password.');
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">⚙️ Settings</h1>
        <p className="text-slate-500 mt-1">Manage your account preferences and security.</p>
      </div>

      {/* Notification Preferences */}
      <Section title="Notification Preferences" icon={Bell}>
        <div className="space-y-1 divide-y divide-slate-50">
          <Toggle label="Complaint Updates" sub="Alerts when your complaint status changes" checked={notif.complaints} onChange={v => setNotif(p => ({ ...p, complaints: v }))} />
          <Toggle label="Emergency Alerts" sub="Critical city emergencies and SOS" checked={notif.emergency} onChange={v => setNotif(p => ({ ...p, emergency: v }))} />
          <Toggle label="City Announcements" sub="Government notices and public updates" checked={notif.announcements} onChange={v => setNotif(p => ({ ...p, announcements: v }))} />
          <Toggle label="City Alerts" sub="Traffic, pollution, and service alerts" checked={notif.city_alerts} onChange={v => setNotif(p => ({ ...p, city_alerts: v }))} />
        </div>
      </Section>

      {/* Appearance */}
      <Section title="Appearance" icon={Monitor}>
        <div className="flex gap-3">
          {[
            { value: 'light', icon: Sun, label: 'Light' },
            { value: 'dark', icon: Moon, label: 'Dark' },
            { value: 'system', icon: Monitor, label: 'System' },
          ].map(t => (
            <button
              key={t.value}
              onClick={() => setTheme(t.value)}
              className={`flex-1 flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${theme === t.value ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
            >
              <t.icon className="w-5 h-5" />
              <span className="text-xs font-medium">{t.label}</span>
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-400 mt-2">Dark mode is coming soon. Currently all themes use Light mode.</p>
      </Section>

      {/* Security — Change Password */}
      <Section title="Security" icon={Lock}>
        <form onSubmit={handlePasswordChange} className="space-y-3">
          {[
            { key: 'old', label: 'Current Password', placeholder: 'Enter current password' },
            { key: 'new1', label: 'New Password', placeholder: 'Minimum 8 characters' },
            { key: 'new2', label: 'Confirm New Password', placeholder: 'Repeat new password' },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-sm font-medium text-slate-700 mb-1">{f.label}</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  placeholder={f.placeholder}
                  value={passwordForm[f.key]}
                  onChange={e => setPasswordForm(p => ({ ...p, [f.key]: e.target.value }))}
                  className="w-full pr-10 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setShowPw(!showPw)}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700"
          >
            {showPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {showPw ? 'Hide' : 'Show'} passwords
          </button>
          {pwError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{pwError}</p>}
          {pwSuccess && <p className="text-sm text-green-600 bg-green-50 border border-green-200 rounded-lg px-3 py-2">{pwSuccess}</p>}
          <div className="flex justify-end pt-2">
            <button type="submit" disabled={pwLoading} className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50">
              {pwLoading ? 'Changing...' : 'Change Password'}
            </button>
          </div>
        </form>
      </Section>

      {/* Account Info */}
      <Section title="Account Information" icon={User}>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Account Status</span>
            <span className="text-green-600 font-semibold">Active</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Role</span>
            <span className="text-slate-800 font-medium">Citizen</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Member Since</span>
            <span className="text-slate-800">{user?.date_joined ? new Date(user.date_joined).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Email</span>
            <span className="text-slate-800">{user?.email}</span>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-slate-100">
          <button
            onClick={logout}
            className="w-full py-2.5 bg-red-50 hover:bg-red-100 text-red-600 font-semibold text-sm rounded-lg transition-colors border border-red-200"
          >
            Logout from all sessions
          </button>
        </div>
      </Section>
    </div>
  );
}
