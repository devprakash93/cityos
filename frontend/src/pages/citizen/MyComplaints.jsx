import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import {
  FileText, Search, Plus, ChevronRight,
  Clock, CheckCircle2, AlertCircle, Circle
} from 'lucide-react';

/* ─── Status config ─── */
const STATUS_CONFIG = {
  PENDING:     { label: 'Submitted',    icon: Clock,         cls: 'badge-pending',  step: 0 },
  ASSIGNED:    { label: 'Assigned',     icon: AlertCircle,   cls: 'badge-assigned', step: 1 },
  ACCEPTED:    { label: 'Accepted',     icon: AlertCircle,   cls: 'badge-assigned', step: 1 },
  ON_SITE:     { label: 'On Site',      icon: AlertCircle,   cls: 'badge-progress', step: 2 },
  IN_PROGRESS: { label: 'In Progress',  icon: AlertCircle,   cls: 'badge-progress', step: 2 },
  REVIEW:      { label: 'Under Review', icon: AlertCircle,   cls: 'badge-progress', step: 2 },
  RESOLVED:    { label: 'Resolved',     icon: CheckCircle2,  cls: 'badge-resolved', step: 3 },
  CLOSED:      { label: 'Closed',       icon: CheckCircle2,  cls: 'badge-closed',   step: 3 },
  REJECTED:    { label: 'Rejected',     icon: AlertCircle,   cls: 'badge-rejected', step: -1 },
};

const STEPS = ['Submitted', 'Assigned', 'In Progress', 'Resolved'];

/* ─── Status Stepper ─── */
function StatusStepper({ status }) {
  const cfg = STATUS_CONFIG[status] || { step: 0 };
  if (cfg.step === -1) {
    return (
      <div className="mt-3 flex items-center gap-1.5">
        <div className="w-2 h-2 rounded-full bg-red-400" />
        <span className="text-xs font-semibold text-red-600">Rejected</span>
      </div>
    );
  }
  return (
    <div className="mt-3">
      <div className="flex items-center gap-0">
        {STEPS.map((step, i) => (
          <div key={step} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                i < cfg.step ? 'bg-green-500' : i === cfg.step ? 'bg-blue-600' : 'bg-slate-200'
              }`}>
                {i < cfg.step ? (
                  <CheckCircle2 className="w-2.5 h-2.5 text-white" />
                ) : i === cfg.step ? (
                  <div className="w-2 h-2 rounded-full bg-white" />
                ) : (
                  <div className="w-2 h-2 rounded-full bg-slate-400" />
                )}
              </div>
              <span className={`text-[8px] font-medium whitespace-nowrap ${
                i <= cfg.step ? 'text-slate-700' : 'text-slate-400'
              }`}>{step}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-0.5 flex-1 mx-0.5 mb-3 ${i < cfg.step ? 'bg-green-400' : 'bg-slate-200'}`} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Priority badge ─── */
const PRIORITY_STYLES = {
  LOW:      'bg-slate-100 text-slate-500',
  MEDIUM:   'bg-blue-50 text-blue-600',
  HIGH:     'bg-orange-50 text-orange-600',
  CRITICAL: 'bg-red-50 text-red-600',
};

/* ─── Complaint Card ─── */
function ComplaintCard({ c }) {
  const cfg = STATUS_CONFIG[c.status] || STATUS_CONFIG.PENDING;
  return (
    <Link to={`/citizen/complaints/${c.id}`} className="block citizen-card-hover rounded-3xl overflow-hidden">
      <div className="p-4">
        {/* Header row */}
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center flex-shrink-0">
            <FileText className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-900 leading-snug line-clamp-1">{c.title}</p>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <span className="text-[10px] font-medium text-slate-400">#{c.reference_number}</span>
              <span className="text-slate-300">·</span>
              <span className="text-[10px] font-medium text-slate-500">{c.category?.replace(/_/g, ' ')}</span>
              {c.priority && (
                <>
                  <span className="text-slate-300">·</span>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${PRIORITY_STYLES[c.priority] || ''}`}>
                    {c.priority}
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold ${cfg.cls}`}>
              {cfg.label}
            </span>
            <span className="text-[10px] text-slate-400">{new Date(c.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
          </div>
        </div>

        {/* Status stepper */}
        <StatusStepper status={c.status} />
      </div>
    </Link>
  );
}

/* ─── Filter Chips ─── */
const FILTERS = [
  { label: 'All', value: '' },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Assigned', value: 'ASSIGNED' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Resolved', value: 'RESOLVED' },
  { label: 'Closed', value: 'CLOSED' },
];

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
export default function MyComplaints() {
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      // For ACTIVE pseudo-filter, we'll filter client-side
      if (filter && filter !== 'ACTIVE') params.status = filter;
      const res = await api.get('/complaints/', { params });
      let data = res.data?.results || res.data || [];
      if (filter === 'ACTIVE') {
        data = data.filter(c => ['PENDING','ASSIGNED','ACCEPTED','ON_SITE','IN_PROGRESS','REVIEW'].includes(c.status));
      }
      setComplaints(data);
    } catch {}
    finally { setLoading(false); }
  }, [search, filter]);

  useEffect(() => { load(); }, [load]);

  const active = complaints.filter(c => ['PENDING','ASSIGNED','ACCEPTED','ON_SITE','IN_PROGRESS','REVIEW'].includes(c.status)).length;
  const resolved = complaints.filter(c => ['RESOLVED','CLOSED'].includes(c.status)).length;

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">My Complaints</h1>
          <p className="text-xs text-slate-500 mt-0.5">Track all your submitted issues</p>
        </div>
        <button
          onClick={() => navigate('/citizen/report')}
          className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-xs font-bold rounded-2xl shadow-sm hover:bg-blue-700 active:scale-95 transition-all"
        >
          <Plus className="w-3.5 h-3.5" /> Report
        </button>
      </div>

      {/* Stats row */}
      {!loading && complaints.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Total', value: complaints.length, color: 'text-slate-900' },
            { label: 'Active', value: active, color: 'text-orange-600' },
            { label: 'Resolved', value: resolved, color: 'text-green-600' },
          ].map(s => (
            <div key={s.label} className="citizen-card p-3 text-center">
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="search"
          placeholder="Search complaints..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-white rounded-2xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
        />
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
              filter === f.value
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-blue-300 hover:text-blue-600'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => (
            <div key={i} className="citizen-card p-4 animate-pulse">
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-2xl bg-slate-100 flex-shrink-0" />
                <div className="flex-1">
                  <div className="h-4 bg-slate-100 rounded-lg w-3/4 mb-2" />
                  <div className="h-3 bg-slate-50 rounded-lg w-1/2" />
                </div>
              </div>
              <div className="mt-3 h-8 bg-slate-50 rounded-xl" />
            </div>
          ))}
        </div>
      ) : complaints.length === 0 ? (
        <div className="citizen-card p-10 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-slate-400" />
          </div>
          <p className="font-bold text-slate-700">{search || filter ? 'No complaints found' : 'No complaints yet'}</p>
          <p className="text-sm text-slate-400 mt-1">
            {search || filter ? 'Try adjusting your search or filter.' : 'Report civic issues to help improve your city.'}
          </p>
          {!search && !filter && (
            <button
              onClick={() => navigate('/citizen/report')}
              className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-2xl hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" /> Report a Problem
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {complaints.map(c => <ComplaintCard key={c.id} c={c} />)}
        </div>
      )}
    </div>
  );
}
