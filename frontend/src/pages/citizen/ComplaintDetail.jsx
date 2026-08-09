import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../api/axios';
import {
  ArrowLeft, CheckCircle, Clock, User, Building2, MapPin,
  Image, MessageSquare, Star, ChevronRight
} from 'lucide-react';

function TimelineStep({ label, done, active, last }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex flex-col items-center">
        <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 ${
          done ? 'bg-green-500 border-green-500' : active ? 'bg-primary-500 border-primary-500' : 'bg-white border-slate-300'
        }`}>
          {done ? <CheckCircle className="w-4 h-4 text-white" /> : (
            <div className={`w-2.5 h-2.5 rounded-full ${active ? 'bg-white' : 'bg-slate-300'}`} />
          )}
        </div>
        {!last && <div className={`w-0.5 h-8 mt-1 ${done ? 'bg-green-300' : 'bg-slate-200'}`} />}
      </div>
      <div className="pt-1 pb-6">
        <p className={`text-sm font-medium ${done ? 'text-green-700' : active ? 'text-primary-700' : 'text-slate-500'}`}>{label}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    ASSIGNED: 'bg-blue-100 text-blue-800',
    IN_PROGRESS: 'bg-orange-100 text-orange-800',
    RESOLVED: 'bg-green-100 text-green-800',
    CLOSED: 'bg-slate-100 text-slate-600',
  };
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${map[status] || 'bg-slate-100 text-slate-600'}`}>
      {status?.replace('_', ' ')}
    </span>
  );
}

const TIMELINE = [
  { key: 'PENDING', label: 'Complaint Submitted' },
  { key: 'ASSIGNED', label: 'Department Assigned & Officer Reviewing' },
  { key: 'IN_PROGRESS', label: 'Worker Assigned & Working' },
  { key: 'RESOLVED', label: 'Issue Resolved' },
  { key: 'CLOSED', label: 'Closed / Verified' },
];

export default function ComplaintDetail() {
  const { id } = useParams();
  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  useEffect(() => {
    const fetchComplaint = async () => {
      try {
        const res = await api.get(`/complaints/${id}/`);
        setComplaint(res.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchComplaint();
  }, [id]);

  const statusIdx = TIMELINE.findIndex(t => t.key === complaint?.status);

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setSubmittingComment(true);
    try {
      // Post comment to complaint history/remarks (using status update with remarks)
      await api.patch(`/complaints/${id}/status/`, {
        status: complaint.status,
        remarks: comment
      });
      setComment('');
      const res = await api.get(`/complaints/${id}/`);
      setComplaint(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    if (!rating) return alert('Please select a star rating');
    setSubmittingFeedback(true);
    try {
      // Post to complaint remarks as feedback
      await api.patch(`/complaints/${id}/status/`, {
        status: 'CLOSED',
        remarks: `Citizen Feedback (${rating}⭐): ${feedback}`
      });
      const res = await api.get(`/complaints/${id}/`);
      setComplaint(res.data);
      alert('Thank you for your feedback!');
    } catch (e) {
      console.error(e);
    } finally {
      setSubmittingFeedback(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4 max-w-4xl mx-auto">
        <div className="h-8 bg-slate-100 rounded w-1/3" />
        <div className="h-64 bg-slate-100 rounded-xl" />
      </div>
    );
  }

  if (!complaint) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500">Complaint not found.</p>
        <Link to="/citizen/complaints" className="text-primary-600 hover:underline text-sm mt-2 block">← Back to My Complaints</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Link to="/citizen/complaints" className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900">{complaint.title}</h1>
          <p className="text-slate-500 text-sm">Reference: #{complaint.reference_number}</p>
        </div>
        <div className="ml-auto">
          <StatusBadge status={complaint.status} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Details */}
        <div className="lg:col-span-2 space-y-5">
          {/* Main Info */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="font-semibold text-slate-900 border-b border-slate-100 pb-3">Complaint Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-500 text-xs uppercase tracking-wider">Category</p>
                <p className="font-medium text-slate-900 mt-1">{complaint.category}</p>
              </div>
              <div>
                <p className="text-slate-500 text-xs uppercase tracking-wider">Priority</p>
                <p className="font-medium text-slate-900 mt-1">{complaint.priority}</p>
              </div>
              <div>
                <p className="text-slate-500 text-xs uppercase tracking-wider">Department</p>
                <p className="font-medium text-slate-900 mt-1">{complaint.department?.name || 'Unassigned'}</p>
              </div>
              <div>
                <p className="text-slate-500 text-xs uppercase tracking-wider">Submitted</p>
                <p className="font-medium text-slate-900 mt-1">{new Date(complaint.created_at).toLocaleDateString()}</p>
              </div>
            </div>
            <div>
              <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">Description</p>
              <p className="text-sm text-slate-700 leading-relaxed">{complaint.description}</p>
            </div>
            {complaint.address && (
              <div className="flex items-start gap-2 text-sm text-slate-600">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                {complaint.address}
              </div>
            )}
          </div>

          {/* Media/Images */}
          {complaint.media && complaint.media.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <h3 className="font-semibold text-slate-900 mb-3">Attached Photos</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {complaint.media.map(m => (
                  <a key={m.id} href={m.file_url} target="_blank" rel="noopener noreferrer" className="rounded-lg overflow-hidden border border-slate-200 hover:border-primary-400 transition-colors">
                    <img src={m.file_url} alt={m.caption || 'Evidence'} className="w-full h-24 object-cover" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Activity Timeline */}
          {complaint.history && complaint.history.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <h3 className="font-semibold text-slate-900 mb-4">Activity Timeline</h3>
              <div className="space-y-0">
                {complaint.history.map((h, i) => (
                  <div key={h.id} className="flex items-start gap-3 pb-4">
                    <div className="flex flex-col items-center">
                      <div className="w-7 h-7 rounded-full bg-primary-50 border border-primary-200 flex items-center justify-center shrink-0">
                        <Clock className="w-3.5 h-3.5 text-primary-500" />
                      </div>
                      {i < complaint.history.length - 1 && <div className="w-0.5 h-6 mt-1 bg-slate-200" />}
                    </div>
                    <div className="pt-1">
                      <p className="text-sm font-medium text-slate-900">{h.event_type?.replace('_', ' ')}</p>
                      {h.remarks && <p className="text-xs text-slate-500 mt-0.5">{h.remarks}</p>}
                      {h.changed_by && <p className="text-xs text-slate-400 mt-0.5">By {h.changed_by.full_name}</p>}
                      <p className="text-xs text-slate-400 mt-0.5">{new Date(h.timestamp).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Feedback Form (only when resolved) */}
          {complaint.status === 'RESOLVED' && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-5 shadow-sm">
              <h3 className="font-semibold text-green-800 mb-1">Was your issue resolved? ✅</h3>
              <p className="text-green-700 text-sm mb-4">Please rate the service quality.</p>
              <form onSubmit={handleFeedbackSubmit} className="space-y-3">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button key={star} type="button" onClick={() => setRating(star)}>
                      <Star className={`w-7 h-7 transition-colors ${star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-slate-300'}`} />
                    </button>
                  ))}
                </div>
                <textarea
                  rows={2}
                  placeholder="Share your experience (optional)..."
                  value={feedback}
                  onChange={e => setFeedback(e.target.value)}
                  className="w-full px-3 py-2 border border-green-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-white"
                />
                <button
                  type="submit"
                  disabled={submittingFeedback || !rating}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {submittingFeedback ? 'Submitting...' : 'Submit Feedback'}
                </button>
              </form>
            </div>
          )}

          {/* Comment Section */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-slate-500" /> Add a Comment
            </h3>
            <form onSubmit={handleCommentSubmit} className="space-y-3">
              <textarea
                rows={3}
                placeholder="Provide additional details or follow-up information..."
                value={comment}
                onChange={e => setComment(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submittingComment || !comment.trim()}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {submittingComment ? 'Posting...' : 'Post Comment'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right: Status Timeline */}
        <div className="space-y-5">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <h3 className="font-semibold text-slate-900 mb-4">Progress</h3>
            {TIMELINE.map((step, i) => (
              <TimelineStep
                key={step.key}
                label={step.label}
                done={i < statusIdx}
                active={i === statusIdx}
                last={i === TIMELINE.length - 1}
              />
            ))}
          </div>

          {/* Assignment Info */}
          {complaint.active_assignment && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <User className="w-4 h-4" /> Assigned Worker
              </h3>
              <p className="text-sm font-medium text-slate-900">{complaint.active_assignment.assigned_to?.full_name}</p>
              {complaint.active_assignment.remarks && (
                <p className="text-xs text-slate-500 mt-1">{complaint.active_assignment.remarks}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
