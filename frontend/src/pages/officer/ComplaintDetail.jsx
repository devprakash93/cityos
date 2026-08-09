import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import {
  ArrowLeft, MapPin, User, Paperclip, CheckCircle, XCircle,
  AlertTriangle, Clock, ChevronDown, RefreshCw
} from 'lucide-react';

const STATUS_COLORS = {
  PENDING: 'bg-orange-100 text-orange-700 border-orange-300',
  ASSIGNED: 'bg-indigo-100 text-indigo-700 border-indigo-300',
  ACCEPTED: 'bg-blue-100 text-blue-700 border-blue-300',
  ON_SITE: 'bg-purple-100 text-purple-700 border-purple-300',
  IN_PROGRESS: 'bg-cyan-100 text-cyan-700 border-cyan-300',
  REVIEW: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  RESOLVED: 'bg-green-100 text-green-700 border-green-300',
  CLOSED: 'bg-slate-100 text-slate-600 border-slate-300',
  REJECTED: 'bg-red-100 text-red-700 border-red-300',
};

const PRIORITY_COLORS = {
  CRITICAL: 'bg-red-100 text-red-700',
  HIGH: 'bg-orange-100 text-orange-700',
  MEDIUM: 'bg-yellow-100 text-yellow-700',
  LOW: 'bg-slate-100 text-slate-600',
};

const TIMELINE_ICONS = {
  STATUS_CHANGE: '🔄',
  ASSIGNMENT: '👤',
  PRIORITY_CHANGE: '⚡',
  MEDIA_UPLOAD: '📎',
  REMARK: '💬',
};

export default function OfficerComplaintDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [complaint, setComplaint] = useState(null);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeAction, setActiveAction] = useState(null); // 'assign' | 'resolve' | 'reject' | 'priority'

  const [assignData, setAssignData] = useState({ assigned_to_id: '', deadline: '', remarks: '' });
  const [resolveRemarks, setResolveRemarks] = useState('');
  const [rejectRemarks, setRejectRemarks] = useState('');
  const [newPriority, setNewPriority] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [compRes, workRes] = await Promise.all([
        api.get(`/complaints/${id}/`),
        api.get('/accounts/officer-workers/'),
      ]);
      setComplaint(compRes.data);
      setWorkers(workRes.data.results || workRes.data || []);
    } catch (err) {
      console.error(err);
      alert('Failed to load complaint details');
      navigate('/officer/complaints');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAssign = async (e) => {
    e.preventDefault();
    if (!assignData.assigned_to_id) return alert('Please select a worker.');
    setActionLoading(true);
    try {
      await api.post(`/complaints/${id}/assign/`, assignData);
      await fetchData();
      setActiveAction(null);
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to assign task.');
    } finally { setActionLoading(false); }
  };

  const handleResolve = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await api.post(`/complaints/${id}/resolve/`, { remarks: resolveRemarks || 'Resolved by officer.' });
      await fetchData();
      setActiveAction(null);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to resolve.');
    } finally { setActionLoading(false); }
  };

  const handleReject = async (e) => {
    e.preventDefault();
    if (!rejectRemarks) return alert('Please provide a reason for rejection.');
    setActionLoading(true);
    try {
      await api.post(`/complaints/${id}/reject/`, { remarks: rejectRemarks });
      await fetchData();
      setActiveAction(null);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reject.');
    } finally { setActionLoading(false); }
  };

  const handlePriority = async (e) => {
    e.preventDefault();
    if (!newPriority) return alert('Select a priority.');
    setActionLoading(true);
    try {
      await api.patch(`/complaints/${id}/priority/`, { priority: newPriority });
      await fetchData();
      setActiveAction(null);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to change priority.');
    } finally { setActionLoading(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
    </div>
  );
  if (!complaint) return null;

  const isOpen = !['RESOLVED', 'CLOSED', 'REJECTED'].includes(complaint.status);
  const canResolve = ['REVIEW', 'IN_PROGRESS', 'ACCEPTED', 'ON_SITE', 'ASSIGNED'].includes(complaint.status);
  const canReject = isOpen;
  const canAssign = ['PENDING', 'ASSIGNED', 'REVIEW'].includes(complaint.status);

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-900">#{complaint.reference_number}</h1>
          <p className="text-sm text-slate-500">{complaint.title}</p>
        </div>
        <button onClick={fetchData} className="p-2 hover:bg-slate-100 rounded-lg">
          <RefreshCw className="w-4 h-4 text-slate-500" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left — complaint info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status & Badges */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex flex-wrap gap-2 items-center">
              <span className={`px-3 py-1 rounded-full text-xs font-bold border ${STATUS_COLORS[complaint.status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                {complaint.status?.replace(/_/g, ' ')}
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${PRIORITY_COLORS[complaint.priority] || 'bg-slate-100 text-slate-600'}`}>
                {complaint.priority} PRIORITY
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                {complaint.category?.replace(/_/g, ' ')}
              </span>
              {complaint.sla_breached && (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> SLA BREACHED
                </span>
              )}
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Description</h3>
              <p className="text-slate-700 text-sm bg-slate-50 p-4 rounded-lg border border-slate-100 whitespace-pre-wrap">
                {complaint.description}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <span className="block text-slate-500 text-xs font-medium">Location</span>
                  <span className="text-slate-800">{complaint.address || complaint.ward?.name || 'Not specified'}</span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <User className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <span className="block text-slate-500 text-xs font-medium">Citizen</span>
                  <span className="text-slate-800">{complaint.citizen?.full_name || complaint.citizen?.username || 'Unknown'}</span>
                  <span className="block text-xs text-slate-400">{complaint.citizen?.email}</span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <span className="block text-slate-500 text-xs font-medium">SLA Deadline</span>
                  <span className={`text-sm font-medium ${complaint.sla_breached ? 'text-red-600' : 'text-slate-800'}`}>
                    {complaint.sla_due_at ? new Date(complaint.sla_due_at).toLocaleString() : 'N/A'}
                  </span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <span className="block text-slate-500 text-xs font-medium">Filed</span>
                  <span className="text-slate-800">{new Date(complaint.created_at).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Media */}
            {complaint.media?.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Paperclip className="w-4 h-4" /> Attached Files ({complaint.media.length})
                </h3>
                <div className="flex flex-wrap gap-3">
                  {complaint.media.map(m => (
                    <a key={m.id} href={m.file_url} target="_blank" rel="noreferrer"
                      className="block w-20 h-20 rounded-lg overflow-hidden border border-slate-200 hover:ring-2 hover:ring-blue-400 transition-all">
                      <img src={m.file_url} alt={m.media_type} className="w-full h-full object-cover" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Timeline */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wider">Activity Timeline</h3>
            <div className="relative border-l-2 border-slate-100 ml-2 space-y-5">
              {complaint.history?.length === 0 && (
                <p className="text-sm text-slate-400 pl-5">No history yet.</p>
              )}
              {complaint.history?.map((h, i) => (
                <div key={h.id || i} className="relative pl-6">
                  <span className="absolute -left-2 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-white ring-2 ring-slate-200 text-[10px]">
                    {TIMELINE_ICONS[h.event_type] || '•'}
                  </span>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        {h.event_type.replace(/_/g, ' ')}
                        {h.old_value && h.new_value && (
                          <span className="text-slate-500 font-normal"> · {h.old_value.replace(/_/g,' ')} → <strong>{h.new_value.replace(/_/g,' ')}</strong></span>
                        )}
                      </p>
                      {h.remarks && <p className="text-xs text-slate-500 mt-0.5 italic">"{h.remarks}"</p>}
                    </div>
                    <div className="text-right text-xs text-slate-400 shrink-0 ml-4">
                      <p>{h.changed_by?.full_name || h.changed_by?.username || 'System'}</p>
                      <p>{new Date(h.timestamp).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right — Actions */}
        <div className="space-y-4">
          {/* Current Assignment */}
          {complaint.active_assignment && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <p className="text-xs font-bold text-green-700 uppercase mb-1">Currently Assigned To</p>
              <p className="text-green-900 font-semibold flex items-center gap-2">
                <User className="w-4 h-4" />
                {complaint.active_assignment.assigned_to?.full_name || complaint.active_assignment.assigned_to?.username}
              </p>
              <p className="text-xs text-green-600 mt-1">
                {new Date(complaint.active_assignment.assigned_at).toLocaleString()}
              </p>
              {complaint.active_assignment.deadline && (
                <p className="text-xs text-green-700 mt-1">
                  Deadline: {new Date(complaint.active_assignment.deadline).toLocaleString()}
                </p>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-200 px-4 py-3">
              <h3 className="text-sm font-bold text-slate-700">Actions</h3>
            </div>
            <div className="p-4 space-y-2">
              {canAssign && (
                <button onClick={() => setActiveAction(activeAction === 'assign' ? null : 'assign')}
                  className="w-full flex items-center justify-between px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors">
                  <span>{complaint.active_assignment ? 'Re-assign Worker' : 'Assign to Worker'}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${activeAction === 'assign' ? 'rotate-180' : ''}`} />
                </button>
              )}
              {canResolve && (
                <button onClick={() => setActiveAction(activeAction === 'resolve' ? null : 'resolve')}
                  className="w-full flex items-center justify-between px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors">
                  <span className="flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Mark Resolved</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${activeAction === 'resolve' ? 'rotate-180' : ''}`} />
                </button>
              )}
              {canReject && (
                <button onClick={() => setActiveAction(activeAction === 'reject' ? null : 'reject')}
                  className="w-full flex items-center justify-between px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors">
                  <span className="flex items-center gap-2"><XCircle className="w-4 h-4" /> Reject</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${activeAction === 'reject' ? 'rotate-180' : ''}`} />
                </button>
              )}
              {isOpen && (
                <button onClick={() => setActiveAction(activeAction === 'priority' ? null : 'priority')}
                  className="w-full flex items-center justify-between px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-lg transition-colors">
                  <span className="flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Change Priority</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${activeAction === 'priority' ? 'rotate-180' : ''}`} />
                </button>
              )}
            </div>

            {/* Assign Form */}
            {activeAction === 'assign' && (
              <form onSubmit={handleAssign} className="border-t border-slate-100 p-4 space-y-3 bg-blue-50/40">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Field Worker *</label>
                  <select required value={assignData.assigned_to_id}
                    onChange={e => setAssignData({ ...assignData, assigned_to_id: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="">Select worker...</option>
                    {workers.map(w => (
                      <option key={w.id} value={w.id}>{w.first_name} {w.last_name} ({w.email})</option>
                    ))}
                  </select>
                  {workers.length === 0 && <p className="text-xs text-orange-600 mt-1">No workers in your department. Create a Field Worker first.</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Deadline</label>
                  <input type="datetime-local" value={assignData.deadline}
                    onChange={e => setAssignData({ ...assignData, deadline: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Instructions</label>
                  <textarea rows={2} value={assignData.remarks}
                    onChange={e => setAssignData({ ...assignData, remarks: e.target.value })}
                    placeholder="E.g., Bring safety equipment..."
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none" />
                </div>
                <button type="submit" disabled={actionLoading}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg disabled:opacity-50">
                  {actionLoading ? 'Assigning...' : (complaint.active_assignment ? 'Confirm Re-assignment' : 'Assign Task')}
                </button>
              </form>
            )}

            {/* Resolve Form */}
            {activeAction === 'resolve' && (
              <form onSubmit={handleResolve} className="border-t border-slate-100 p-4 space-y-3 bg-emerald-50/40">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Resolution Notes</label>
                  <textarea rows={2} value={resolveRemarks} onChange={e => setResolveRemarks(e.target.value)}
                    placeholder="Describe how the issue was resolved..."
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none resize-none" />
                </div>
                <button type="submit" disabled={actionLoading}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-lg disabled:opacity-50">
                  {actionLoading ? 'Resolving...' : '✓ Confirm Resolved'}
                </button>
              </form>
            )}

            {/* Reject Form */}
            {activeAction === 'reject' && (
              <form onSubmit={handleReject} className="border-t border-slate-100 p-4 space-y-3 bg-red-50/40">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Reason for Rejection *</label>
                  <textarea rows={2} required value={rejectRemarks} onChange={e => setRejectRemarks(e.target.value)}
                    placeholder="Explain why this complaint is being rejected..."
                    className="w-full rounded-lg border border-red-300 px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 outline-none resize-none" />
                </div>
                <button type="submit" disabled={actionLoading}
                  className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-lg disabled:opacity-50">
                  {actionLoading ? 'Rejecting...' : '✕ Confirm Rejection'}
                </button>
              </form>
            )}

            {/* Priority Form */}
            {activeAction === 'priority' && (
              <form onSubmit={handlePriority} className="border-t border-slate-100 p-4 space-y-3 bg-amber-50/40">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">New Priority *</label>
                  <select required value={newPriority} onChange={e => setNewPriority(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 outline-none">
                    <option value="">Select priority...</option>
                    {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <button type="submit" disabled={actionLoading}
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-lg disabled:opacity-50">
                  {actionLoading ? 'Updating...' : 'Update Priority'}
                </button>
              </form>
            )}
          </div>

          {/* Complaint is closed */}
          {!isOpen && (
            <div className={`rounded-xl p-4 border text-center ${complaint.status === 'RESOLVED' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <p className={`text-sm font-bold ${complaint.status === 'RESOLVED' ? 'text-green-700' : 'text-red-700'}`}>
                {complaint.status === 'RESOLVED' ? '✓ Complaint Resolved' : '✕ Complaint Rejected'}
              </p>
              <p className={`text-xs mt-1 ${complaint.status === 'RESOLVED' ? 'text-green-600' : 'text-red-600'}`}>
                No further actions available.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
