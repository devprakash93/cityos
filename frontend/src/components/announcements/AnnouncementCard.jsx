import { Building2, ChevronRight, ShieldAlert } from 'lucide-react';
import AnnouncementCategoryBadge, { CATEGORY_CONFIG } from './AnnouncementCategoryBadge';

export default function AnnouncementCard({
  announcement,
  onOpenDetails,
}) {
  const isEmergency = announcement.priority === 'EMERGENCY' || announcement.category === 'EMERGENCY_ALERT';
  const config = CATEGORY_CONFIG[announcement.category] || CATEGORY_CONFIG.ANNOUNCEMENT;
  const CategoryIcon = config.icon;
  const thumbnail = announcement.thumbnail_image || announcement.thumbnail_image_url || announcement.effective_thumbnail;

  const formattedDate = announcement.publish_at || announcement.published_at || announcement.created_at
    ? new Date(announcement.publish_at || announcement.published_at || announcement.created_at).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '';

  return (
    <div
      onClick={() => onOpenDetails && onOpenDetails(announcement)}
      className="citizen-card-hover group relative flex flex-col justify-between p-4 sm:p-5 cursor-pointer bg-white border border-slate-200/80 rounded-2xl transition-all duration-200 hover:border-slate-300 hover:shadow-md"
    >
      <div>
        {/* Top Meta: Category Badge + Priority / Geography */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <AnnouncementCategoryBadge category={announcement.category} size="xs" />
          {isEmergency ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
              <ShieldAlert className="w-3 h-3" />
              URGENT
            </span>
          ) : announcement.is_pinned ? (
            <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
              📌 Pinned
            </span>
          ) : announcement.target_geography_name && announcement.audience_scope !== 'ALL' ? (
            <span className="text-[10px] font-medium text-slate-500 truncate max-w-[120px]">
              {announcement.target_geography_name}
            </span>
          ) : null}
        </div>

        {/* Thumbnail + Title Row */}
        <div className="flex items-start gap-3.5">
          {/* Thumbnail / Category Icon */}
          <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-slate-100 border border-slate-200/80 flex items-center justify-center">
            {thumbnail ? (
              <img
                src={thumbnail}
                alt=""
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextSibling.style.display = 'flex';
                }}
              />
            ) : null}
            <div
              className={`w-full h-full flex items-center justify-center ${config.badgeClass}`}
              style={{ display: thumbnail ? 'none' : 'flex' }}
            >
              <CategoryIcon className="w-5 h-5" />
            </div>
          </div>

          {/* Title & Short Description */}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-700 transition-colors line-clamp-2 leading-snug">
              {announcement.title}
            </h3>
            <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
              {announcement.summary || announcement.content}
            </p>
          </div>
        </div>
      </div>

      {/* Footer Info: Department, Date, and Read More */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-1.5 truncate max-w-[65%]">
          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="truncate font-medium text-slate-600">
            {announcement.department_name || 'City Administration'}
          </span>
          {formattedDate && <span className="text-slate-300">· {formattedDate}</span>}
        </div>

        <div className="flex items-center gap-1 font-semibold text-blue-600 group-hover:translate-x-0.5 transition-transform shrink-0">
          <span>Read More</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </div>
      </div>
    </div>
  );
}
