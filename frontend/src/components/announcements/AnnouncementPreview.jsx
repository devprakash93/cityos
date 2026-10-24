import { useState } from 'react';
import { Smartphone, Monitor, X, ExternalLink, ArrowRight, Building2, Calendar, ShieldAlert } from 'lucide-react';
import AnnouncementCategoryBadge from './AnnouncementCategoryBadge';

export default function AnnouncementPreview({
  formData = {},
  isOpen = false,
  onClose,
}) {
  const [deviceMode, setDeviceMode] = useState('mobile'); // 'mobile' | 'desktop'

  if (!isOpen) return null;

  const title = formData.title || 'Untitled Announcement';
  const summary = formData.summary || 'Short teaser summary for citizen banner and cards.';
  const content = formData.content || 'Full details regarding this official announcement...';
  const category = formData.category || 'ANNOUNCEMENT';
  const departmentName = formData.department_name || 'Government of Odisha';
  const isEmergency = formData.priority === 'EMERGENCY' || category === 'EMERGENCY_ALERT';
  const ctaLabel = formData.cta_label || 'View Details';
  const secondaryCtaLabel = formData.secondary_cta_label;
  const banner = formData.banner_image_url || '/banners/announcement.svg';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
      <div 
        className="relative w-full max-w-4xl bg-slate-900 rounded-3xl border border-slate-700 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Toolbar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-slate-200">Live Preview</span>
            <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700">
              <button
                type="button"
                onClick={() => setDeviceMode('mobile')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  deviceMode === 'mobile'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" /> Mobile
              </button>
              <button
                type="button"
                onClick={() => setDeviceMode('desktop')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  deviceMode === 'desktop'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" /> Desktop
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewport Frame */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex justify-center bg-slate-950/60">
          <div
            className={`transition-all duration-300 w-full ${
              deviceMode === 'mobile'
                ? 'max-w-[390px] border-[6px] border-slate-800 rounded-[38px] p-3 bg-slate-100 shadow-2xl overflow-hidden'
                : 'max-w-3xl border border-slate-800 rounded-3xl p-6 bg-slate-100 shadow-2xl'
            }`}
          >
            {/* Simulation of Citizen Homepage Container */}
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-500 px-1 font-semibold uppercase tracking-wider">
                <span>Featured Civic Spotlight</span>
                <span>Preview</span>
              </div>

              {/* The Banner */}
              <div className="relative rounded-3xl overflow-hidden shadow-lg select-none min-h-[280px] p-5 flex flex-col justify-between">
                {banner && (
                  <img
                    src={banner}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                )}
                <div
                  className={`absolute inset-0 pointer-events-none ${
                    isEmergency
                      ? 'bg-gradient-to-t from-red-950/95 via-red-950/80 to-red-900/60'
                      : 'bg-gradient-to-t from-slate-950/95 via-slate-950/80 to-slate-900/50'
                  }`}
                />

                <div className="relative z-10 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <AnnouncementCategoryBadge category={category} size="xs" showIcon />
                    {isEmergency && (
                      <span className="text-[10px] font-bold text-white bg-red-600 px-2 py-0.5 rounded-full animate-pulse">
                        EMERGENCY
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-white/90 bg-white/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-emerald-400" />
                    <span className="truncate max-w-[120px]">{departmentName}</span>
                  </div>
                </div>

                <div className="relative z-10 my-3">
                  <h3 className="text-lg sm:text-xl font-extrabold text-white leading-tight">
                    {title}
                  </h3>
                  <p className="text-xs text-slate-200 mt-1 line-clamp-2 leading-relaxed">
                    {summary}
                  </p>
                </div>

                <div className="relative z-10 flex items-center justify-between gap-2 pt-2 border-t border-white/15">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm ${
                        isEmergency ? 'bg-white text-red-700' : 'bg-emerald-600 text-white'
                      }`}
                    >
                      {ctaLabel}
                    </button>
                    {secondaryCtaLabel && (
                      <button
                        type="button"
                        className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-white/20"
                      >
                        {secondaryCtaLabel}
                      </button>
                    )}
                  </div>
                  <span className="text-[10px] text-white/70">1 of 1</span>
                </div>
              </div>

              {/* Compact Card Simulation */}
              <div className="pt-2">
                <p className="text-xs text-slate-500 font-semibold mb-2 px-1 uppercase tracking-wider">
                  Updates List Card Representation
                </p>
                <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200 text-slate-500">
                    <Building2 className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <AnnouncementCategoryBadge category={category} size="xs" />
                      <span className="text-[10px] text-slate-400">Just now</span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 truncate">{title}</h4>
                    <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{summary}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/90 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white rounded-xl transition-colors"
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
}
