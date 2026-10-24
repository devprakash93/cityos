import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, ArrowRight, ExternalLink,
  Building2, Calendar, Clock, AlertTriangle, ShieldAlert
} from 'lucide-react';
import AnnouncementCategoryBadge from './AnnouncementCategoryBadge';
import api from '../../api/axios';

export default function FeaturedAnnouncementCarousel({
  announcements = [],
  loading = false,
  onOpenDetails,
}) {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [recordedImpressions, setRecordedImpressions] = useState(new Set());
  const timerRef = useRef(null);

  const total = announcements.length;
  const current = announcements[currentIndex] || null;

  // Record impression for current active banner
  useEffect(() => {
    if (!current?.id) return;
    if (recordedImpressions.has(current.id)) return;

    const logImpression = async () => {
      try {
        const sessionId = localStorage.getItem('cityos_session_id') || `sess_${Date.now()}`;
        localStorage.setItem('cityos_session_id', sessionId);
        await api.post(`/announcements/${current.id}/impressions/`, { session_id: sessionId });
        setRecordedImpressions(prev => new Set(prev).add(current.id));
      } catch (err) {
        // Silently tolerate impression telemetry errors
      }
    };
    logImpression();
  }, [current?.id, recordedImpressions]);

  // Next / Prev slide handlers
  const goToNext = useCallback(() => {
    if (total <= 1) return;
    setCurrentIndex(prev => (prev + 1) % total);
  }, [total]);

  const goToPrev = useCallback(() => {
    if (total <= 1) return;
    setCurrentIndex(prev => (prev - 1 + total) % total);
  }, [total]);

  // Auto-rotation logic with safeguards
  useEffect(() => {
    if (total <= 1 || isPaused) return;

    // Check prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    // NEVER auto-rotate away from emergency notices
    if (current?.priority === 'EMERGENCY' || current?.category === 'EMERGENCY_ALERT') {
      return;
    }

    timerRef.current = setInterval(() => {
      goToNext();
    }, 6000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [total, isPaused, current?.priority, current?.category, goToNext]);

  // Mobile Touch Swipe Handling
  const handleTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 45;
    const isRightSwipe = distance < -45;
    if (isLeftSwipe) {
      goToNext();
    } else if (isRightSwipe) {
      goToPrev();
    }
  };

  // CTA Click handler with telemetry
  const handleCtaClick = async (e, announcement, isSecondary = false) => {
    e.stopPropagation();
    const destination = isSecondary ? announcement.secondary_cta_destination : announcement.cta_destination;
    const ctaType = isSecondary ? announcement.secondary_cta_type : announcement.cta_type;

    try {
      const sessionId = localStorage.getItem('cityos_session_id') || `sess_${Date.now()}`;
      await api.post(`/announcements/${announcement.id}/clicks/`, {
        session_id: sessionId,
        destination: destination || '',
        event_type: isSecondary ? 'SECONDARY_CLICK' : 'CLICK',
      });
    } catch {}

    if (!destination) {
      if (onOpenDetails) onOpenDetails(announcement);
      return;
    }

    if (ctaType === 'EXTERNAL' || destination.startsWith('http://') || destination.startsWith('https://')) {
      window.open(destination, '_blank', 'noopener,noreferrer');
    } else {
      navigate(destination);
    }
  };

  if (loading) {
    return (
      <div className="w-full rounded-3xl overflow-hidden bg-slate-100 border border-slate-200 shadow-sm p-6 animate-pulse min-h-[260px] md:min-h-[300px] flex flex-col justify-between">
        <div className="flex justify-between items-center">
          <div className="w-28 h-6 bg-slate-200 rounded-full" />
          <div className="w-20 h-4 bg-slate-200 rounded" />
        </div>
        <div className="space-y-3 my-4">
          <div className="w-3/4 h-7 bg-slate-200 rounded-lg" />
          <div className="w-full h-4 bg-slate-200 rounded" />
          <div className="w-2/3 h-4 bg-slate-200 rounded" />
        </div>
        <div className="flex gap-3">
          <div className="w-36 h-10 bg-slate-200 rounded-xl" />
          <div className="w-28 h-10 bg-slate-200 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!current) {
    return null;
  }

  const isEmergency = current.priority === 'EMERGENCY' || current.category === 'EMERGENCY_ALERT';
  const bannerImage = current.banner_image || current.banner_image_url || current.effective_banner;

  return (
    <div
      className="relative w-full rounded-3xl overflow-hidden border border-slate-200/90 shadow-lg shadow-slate-900/5 transition-all select-none group"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      aria-roledescription="carousel"
      aria-label="Official Featured Civic Announcements"
    >
      {/* Banner Background Container */}
      <div 
        className="relative w-full min-h-[290px] sm:min-h-[310px] md:min-h-[340px] flex flex-col justify-between p-5 sm:p-6 md:p-8 cursor-pointer"
        onClick={() => onOpenDetails && onOpenDetails(current)}
      >
        {/* Visual Background image with deep overlay */}
        {bannerImage ? (
          <img
            src={bannerImage}
            alt=""
            className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none"
            onError={(e) => {
              // Graceful fallback to rich SVG background if image fails
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : null}

        {/* Dynamic Theme Gradient Overlay to Guarantee Government Contrast */}
        <div
          className={`absolute inset-0 pointer-events-none ${
            isEmergency
              ? 'bg-gradient-to-t from-red-950/95 via-red-950/80 to-red-900/60'
              : 'bg-gradient-to-t from-slate-950/95 via-slate-950/80 to-slate-900/50'
          }`}
        />

        {/* Top Header: Badge, Emergency Flag, Expiry */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <AnnouncementCategoryBadge category={current.category} size="sm" showIcon />
            {isEmergency && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-600 text-white shadow-xs tracking-wider animate-bounce">
                <ShieldAlert className="w-3.5 h-3.5" />
                ACTIVE ADVISORY
              </span>
            )}
            {current.target_geography_name && current.audience_scope !== 'ALL' && (
              <span className="text-[11px] font-medium text-white/80 bg-white/15 px-2 py-0.5 rounded-full backdrop-blur-xs">
                📍 {current.target_geography_name}
              </span>
            )}
          </div>

          {/* Department Tag */}
          <div className="flex items-center gap-1.5 text-xs text-white/85 bg-white/10 px-2.5 py-1 rounded-full backdrop-blur-xs">
            <Building2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="truncate max-w-[150px] sm:max-w-[200px] font-medium">
              {current.department_name || 'Govt. of Odisha'}
            </span>
          </div>
        </div>

        {/* Middle Content: Title and Teaser */}
        <div className="relative z-10 my-4 space-y-2 max-w-3xl">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white leading-tight tracking-tight drop-shadow-xs">
            {current.title}
          </h2>
          <p className="text-xs sm:text-sm md:text-base text-slate-200 line-clamp-2 sm:line-clamp-3 leading-relaxed drop-shadow-xs font-normal">
            {current.summary || current.content}
          </p>
        </div>

        {/* Bottom Actions and Carousel Navigation */}
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-white/15">
          {/* CTA Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={(e) => handleCtaClick(e, current, false)}
              className={`inline-flex items-center justify-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-md active:scale-95 ${
                isEmergency
                  ? 'bg-white text-red-700 hover:bg-red-50 shadow-red-900/30'
                  : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-emerald-900/30'
              }`}
            >
              <span>{current.cta_label || 'View Details'}</span>
              {current.cta_type === 'EXTERNAL' ? (
                <ExternalLink className="w-4 h-4 shrink-0" />
              ) : (
                <ArrowRight className="w-4 h-4 shrink-0" />
              )}
            </button>

            {current.secondary_cta_label && (
              <button
                type="button"
                onClick={(e) => handleCtaClick(e, current, true)}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl font-semibold text-xs sm:text-sm bg-white/15 hover:bg-white/25 text-white backdrop-blur-xs transition-colors active:scale-95"
              >
                <span>{current.secondary_cta_label}</span>
              </button>
            )}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onOpenDetails) onOpenDetails(current);
              }}
              className="text-xs font-medium text-slate-300 hover:text-white underline underline-offset-4 ml-1"
            >
              Read Full Notice
            </button>
          </div>

          {/* Carousel Controls & Indicator Dots */}
          {total > 1 && (
            <div className="flex items-center justify-between sm:justify-end gap-3" onClick={e => e.stopPropagation()}>
              {/* Pagination Dots */}
              <div className="flex items-center gap-1.5">
                {announcements.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCurrentIndex(idx)}
                    className={`transition-all rounded-full ${
                      idx === currentIndex
                        ? 'w-6 h-2 bg-white'
                        : 'w-2 h-2 bg-white/40 hover:bg-white/60'
                    }`}
                    aria-label={`Go to slide ${idx + 1}`}
                  />
                ))}
              </div>

              {/* Prev / Next Arrows */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={goToPrev}
                  className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center backdrop-blur-xs transition-colors active:scale-90"
                  aria-label="Previous announcement"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={goToNext}
                  className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center backdrop-blur-xs transition-colors active:scale-90"
                  aria-label="Next announcement"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
