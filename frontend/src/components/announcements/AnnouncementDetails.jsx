import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X, Building2, Calendar, Clock, MapPin, Share2,
  ExternalLink, ArrowRight, ShieldAlert, Check, Copy
} from 'lucide-react';
import AnnouncementCategoryBadge from './AnnouncementCategoryBadge';
import api from '../../api/axios';

export default function AnnouncementDetails({
  announcement,
  isOpen = false,
  onClose,
}) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen || !announcement?.id) return;

    // Record view telemetry
    const recordView = async () => {
      try {
        const sessionId = localStorage.getItem('cityos_session_id') || `sess_${Date.now()}`;
        await api.get(`/announcements/${announcement.slug || announcement.id}/?session_id=${sessionId}`);
      } catch {}
    };
    recordView();
  }, [isOpen, announcement?.id, announcement?.slug]);

  if (!isOpen || !announcement) return null;

  const isEmergency = announcement.priority === 'EMERGENCY' || announcement.category === 'EMERGENCY_ALERT';
  const banner = announcement.banner_image || announcement.banner_image_url || announcement.effective_banner;

  const handleCta = async (isSecondary = false) => {
    const dest = isSecondary ? announcement.secondary_cta_destination : announcement.cta_destination;
    const type = isSecondary ? announcement.secondary_cta_type : announcement.cta_type;

    try {
      const sessionId = localStorage.getItem('cityos_session_id') || `sess_${Date.now()}`;
      await api.post(`/announcements/${announcement.id}/clicks/`, {
        session_id: sessionId,
        destination: dest || '',
        event_type: isSecondary ? 'SECONDARY_CLICK' : 'CLICK',
      });
    } catch {}

    if (!dest) return;

    if (type === 'EXTERNAL' || dest.startsWith('http://') || dest.startsWith('https://')) {
      window.open(dest, '_blank', 'noopener,noreferrer');
    } else {
      if (onClose) onClose();
      navigate(dest);
    }
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/citizen/announcements/${announcement.slug || announcement.id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: announcement.title,
          text: announcement.summary,
          url: shareUrl,
        });
        return;
      } catch {}
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const formattedDate = announcement.publish_at || announcement.published_at || announcement.created_at
    ? new Date(announcement.publish_at || announcement.published_at || announcement.created_at).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '';

  const expiryDate = announcement.expires_at
    ? new Date(announcement.expires_at).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 md:p-6 animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <AnnouncementCategoryBadge category={announcement.category} size="xs" showIcon />
            {isEmergency && (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
                <ShieldAlert className="w-3.5 h-3.5" />
                OFFICIAL EMERGENCY
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleShare}
              className="p-2 text-slate-500 hover:text-slate-800 rounded-full hover:bg-slate-200/60 transition-colors"
              title="Share announcement"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-200/60 transition-colors"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto flex-1 p-5 sm:p-6 space-y-5">
          {/* Banner Graphic if available */}
          {banner && (
            <div className="w-full h-48 sm:h-56 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200/70 shadow-xs">
              <img
                src={banner}
                alt={announcement.title}
                className="w-full h-full object-cover object-center"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            </div>
          )}

          {/* Title & Department Information */}
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-tight">
              {announcement.title}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-y-2 gap-x-4 text-xs text-slate-500">
              <div className="flex items-center gap-1 text-slate-700 font-medium">
                <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>{announcement.department_name || 'Government of Odisha'}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Published {formattedDate}</span>
              </div>
              {expiryDate && (
                <div className="flex items-center gap-1 text-amber-700 font-medium">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Valid until {expiryDate}</span>
                </div>
              )}
              {announcement.target_geography_name && announcement.audience_scope !== 'ALL' && (
                <div className="flex items-center gap-1 text-blue-700 font-medium">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Target: {announcement.target_geography_name}</span>
                </div>
              )}
            </div>
          </div>

          {/* Summary Callout */}
          {announcement.summary && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-sm font-medium text-slate-800 leading-relaxed">
              {announcement.summary}
            </div>
          )}

          {/* Full Content Body */}
          <div className="text-sm text-slate-700 leading-relaxed space-y-3 prose prose-slate max-w-none">
            {announcement.content ? (
              announcement.content.split('\n\n').map((paragraph, idx) => (
                <p key={idx} className="leading-relaxed whitespace-pre-line">
                  {paragraph}
                </p>
              ))
            ) : (
              <p>{announcement.message}</p>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-200/60 transition-colors"
          >
            Close
          </button>

          <div className="flex items-center gap-2.5">
            {announcement.secondary_cta_label && (
              <button
                type="button"
                onClick={() => handleCta(true)}
                className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors shadow-xs"
              >
                {announcement.secondary_cta_label}
              </button>
            )}

            <button
              type="button"
              onClick={() => handleCta(false)}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-md transition-all active:scale-95 ${
                isEmergency
                  ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-900/20'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-900/20'
              }`}
            >
              <span>{announcement.cta_label || 'View Details'}</span>
              {announcement.cta_type === 'EXTERNAL' ? (
                <ExternalLink className="w-4 h-4" />
              ) : (
                <ArrowRight className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
