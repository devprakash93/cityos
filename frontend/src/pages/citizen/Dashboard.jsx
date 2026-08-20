import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import {
  AlertTriangle, FileText, LayoutGrid,
  Wind, TrafficCone, Droplets, Zap,
  ShieldAlert, Bell, ChevronRight,
  TrendingUp, CheckCircle2, Clock, Plus
} from 'lucide-react';

/* ─── Helper: get AQI label & color ─── */
function aqiInfo(val) {
  if (!val) return { label: 'N/A', color: '#94a3b8', bg: '#f1f5f9', desc: 'Unavailable' };
  if (val <= 50)  return { label: `${val}`, color: '#16a34a', bg: '#dcfce7', desc: 'Good' };
  if (val <= 100) return { label: `${val}`, color: '#ca8a04', bg: '#fef9c3', desc: 'Moderate' };
  if (val <= 150) return { label: `${val}`, color: '#ea580c', bg: '#fed7aa', desc: 'Unhealthy' };
  return                { label: `${val}`, color: '#dc2626', bg: '#fee2e2', desc: 'Hazardous' };
}

/* ─── Status badge ─── */
const STATUS_STYLES = {
  PENDING:     { label: 'Pending',     cls: 'badge-pending' },
  ASSIGNED:    { label: 'Assigned',    cls: 'badge-assigned' },
  ACCEPTED:    { label: 'Accepted',    cls: 'badge-assigned' },
  ON_SITE:     { label: 'On Site',     cls: 'badge-progress' },
  IN_PROGRESS: { label: 'In Progress', cls: 'badge-progress' },
  REVIEW:      { label: 'Under Review',cls: 'badge-progress' },
  RESOLVED:    { label: 'Resolved',    cls: 'badge-resolved' },
  CLOSED:      { label: 'Closed',      cls: 'badge-closed' },
  REJECTED:    { label: 'Rejected',    cls: 'badge-rejected' },
};

function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] || { label: status, cls: 'badge-closed' };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${s.cls}`}>
      {s.label}
    </span>
  );
}

/* ─── City Snapshot Card (small horizontal) ─── */
function SnapshotCard({ icon: Icon, label, value, color, bg }) {
  return (
    <div className="citizen-card flex-shrink-0 w-36 p-3.5 flex flex-col gap-2">
      <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: bg }}>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <div>
        <p className="text-[11px] text-slate-500 font-medium leading-none">{label}</p>
        <p className="text-sm font-bold text-slate-800 mt-1 leading-tight">{value}</p>
      </div>
    </div>
  );
}

/* ─── Complaint Row Card ─── */
function ComplaintCard({ c }) {
  return (
    <Link
      to={`/citizen/complaints/${c.id}`}
      className="citizen-card-hover flex items-center gap-3 p-4"
    >
      <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center flex-shrink-0">
        <FileText className="w-5 h-5 text-blue-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-900 truncate">{c.title}</p>
        <p className="text-xs text-slate-400 mt-0.5 truncate">
          #{c.reference_number} · {c.category?.replace('_', ' ')}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1.5">
        <StatusBadge status={c.status} />
        <ChevronRight className="w-4 h-4 text-slate-300" />
      </div>
    </Link>
  );
}

/* ─────────────────────────────────────────────
   MAIN DASHBOARD
───────────────────────────────────────────── */
export default function CitizenDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [aqi, setAqi] = useState(null);
  const [stats, setStats] = useState({ total: 0, active: 0, resolved: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [cmpRes, notifRes, aqiRes] = await Promise.allSettled([
          api.get('/complaints/'),
          api.get('/notifications/'),
          api.get('/pollution/stations/city-aqi/'),
        ]);

        if (cmpRes.status === 'fulfilled') {
          const all = cmpRes.value.data?.results || cmpRes.value.data || [];
          setComplaints(all.slice(0, 3));
          setStats({
            total: all.length,
            active: all.filter(c => ['PENDING','ASSIGNED','ACCEPTED','ON_SITE','IN_PROGRESS','REVIEW'].includes(c.status)).length,
            resolved: all.filter(c => ['RESOLVED','CLOSED'].includes(c.status)).length,
          });
        }
        if (notifRes.status === 'fulfilled') {
          const all = notifRes.value.data?.results || notifRes.value.data || [];
          setNotifications(all.filter(n => !n.is_read).slice(0, 2));
        }
        if (aqiRes.status === 'fulfilled') {
          const data = aqiRes.value.data;
          if (Array.isArray(data) && data.length > 0) {
            setAqi(data[0]?.latest_reading?.aqi_value ?? null);
          }
        }
      } catch {}
      finally { setLoading(false); }
    };
    load();
  }, []);

  const aqi_ = aqiInfo(aqi);

  return (
    <div className="space-y-5">

      {/* ── SECTION 1: 3 HERO ACTION CARDS ── */}
      <div className="space-y-3">

        {/* REPORT A PROBLEM */}
        <Link to="/citizen/report" className="block">
          <div className="rounded-3xl overflow-hidden relative"
            style={{
              background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)',
              boxShadow: '0 8px 32px rgb(30 58 95 / 0.28)',
            }}
          >
            <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-9 h-9 rounded-2xl bg-white/15 flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-xs font-bold text-white/70 uppercase tracking-wider">Most Used</span>
                  </div>
                  <h2 className="text-xl font-bold text-white leading-tight">Report a Problem</h2>
                  <p className="text-sm text-white/75 mt-1">Pothole, garbage, streetlight, water leakage & more</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center flex-shrink-0 mt-1">
                  <ChevronRight className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
            {/* Decorative circles */}
            <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full bg-white/5" />
            <div className="absolute -bottom-6 right-12 w-16 h-16 rounded-full bg-white/5" />
          </div>
        </Link>

        {/* MY COMPLAINTS + CITY SERVICES side by side */}
        <div className="grid grid-cols-2 gap-3">
          {/* MY COMPLAINTS */}
          <Link to="/citizen/complaints" className="block">
            <div className="rounded-3xl overflow-hidden relative"
              style={{
                background: 'linear-gradient(135deg, #0f766e 0%, #0d9488 100%)',
                boxShadow: '0 4px 20px rgb(15 118 110 / 0.25)',
              }}
            >
              <div className="p-4">
                <div className="w-9 h-9 rounded-2xl bg-white/20 flex items-center justify-center mb-3">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-base font-bold text-white leading-tight">My Complaints</h3>
                <p className="text-xs text-white/75 mt-0.5">Track your issues</p>
                <div className="flex items-center gap-3 mt-3">
                  <div className="text-center">
                    <p className="text-lg font-bold text-white leading-none">{loading ? '—' : stats.active}</p>
                    <p className="text-[10px] text-white/70 mt-0.5">Active</p>
                  </div>
                  <div className="w-px h-6 bg-white/25" />
                  <div className="text-center">
                    <p className="text-lg font-bold text-white leading-none">{loading ? '—' : stats.resolved}</p>
                    <p className="text-[10px] text-white/70 mt-0.5">Resolved</p>
                  </div>
                </div>
              </div>
            </div>
          </Link>

          {/* CITY SERVICES */}
          <Link to="/citizen/services" className="block">
            <div className="rounded-3xl overflow-hidden relative"
              style={{
                background: 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)',
                boxShadow: '0 4px 20px rgb(124 58 237 / 0.25)',
              }}
            >
              <div className="p-4">
                <div className="w-9 h-9 rounded-2xl bg-white/20 flex items-center justify-center mb-3">
                  <LayoutGrid className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-base font-bold text-white leading-tight">City Services</h3>
                <p className="text-xs text-white/75 mt-0.5">Explore all services</p>
                <div className="mt-3 flex flex-wrap gap-1">
                  {['Traffic', 'AQI', 'Water', 'Power'].map(t => (
                    <span key={t} className="text-[10px] font-semibold bg-white/20 text-white px-2 py-0.5 rounded-full">{t}</span>
                  ))}
                </div>
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* ── SECTION 2: CITY SNAPSHOT (horizontal scroll) ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">City Snapshot</h2>
          <Link to="/citizen/services" className="text-xs font-semibold text-blue-600">See All →</Link>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          <SnapshotCard icon={Wind} label="Air Quality" value={aqi_ ? `AQI ${aqi_.label} — ${aqi_.desc}` : 'Loading...'} color={aqi_.color} bg={aqi_.bg} />
          <SnapshotCard icon={TrafficCone} label="Traffic" value="Moderate" color="#ca8a04" bg="#fef9c3" />
          <SnapshotCard icon={Droplets} label="Water Supply" value="Normal" color="#0369a1" bg="#e0f2fe" />
          <SnapshotCard icon={Zap} label="Electricity" value="Stable" color="#d97706" bg="#fef3c7" />
        </div>
      </div>

      {/* ── SECTION 3: UNREAD NOTIFICATIONS ── */}
      {notifications.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Alerts</h2>
            <Link to="/citizen/notifications" className="text-xs font-semibold text-blue-600">View All →</Link>
          </div>
          <div className="space-y-2">
            {notifications.map(n => (
              <div key={n.id} className="citizen-card flex items-start gap-3 p-3.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bell className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 leading-snug">{n.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{new Date(n.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                </div>
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── SECTION 4: RECENT COMPLAINTS ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Recent Complaints</h2>
          <Link to="/citizen/complaints" className="text-xs font-semibold text-blue-600">View All →</Link>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1,2,3].map(i => (
              <div key={i} className="citizen-card p-4 animate-pulse flex gap-3">
                <div className="w-10 h-10 rounded-2xl bg-slate-100" />
                <div className="flex-1">
                  <div className="h-4 bg-slate-100 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-slate-50 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : complaints.length > 0 ? (
          <div className="space-y-2">
            {complaints.map(c => <ComplaintCard key={c.id} c={c} />)}
          </div>
        ) : (
          <div className="citizen-card p-8 text-center">
            <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <FileText className="w-7 h-7 text-slate-400" />
            </div>
            <p className="text-sm font-semibold text-slate-600">No complaints yet</p>
            <p className="text-xs text-slate-400 mt-1">Help improve your city by reporting issues.</p>
            <Link
              to="/citizen/report"
              className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" /> Report a Problem
            </Link>
          </div>
        )}
      </div>

      {/* ── SECTION 5: EMERGENCY QUICK DIAL ── */}
      <Link to="/citizen/emergency">
        <div className="rounded-3xl p-4 flex items-center gap-4"
          style={{ background: 'linear-gradient(135deg, #991b1b, #dc2626)', boxShadow: '0 4px 20px rgb(220 38 38 / 0.3)' }}
        >
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <ShieldAlert className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-base font-bold text-white">Emergency SOS</p>
            <p className="text-xs text-white/75">Police · Ambulance · Fire Brigade</p>
          </div>
          <ChevronRight className="w-5 h-5 text-white/60" />
        </div>
      </Link>

    </div>
  );
}
