import { useState } from 'react';
import { 
  Edit3, Trash2, CheckCircle, 
  Archive, AlertCircle, Building2, MapPin, 
  Search, Plus
} from 'lucide-react';
import AnnouncementCategoryBadge from './AnnouncementCategoryBadge';

export default function AnnouncementAdminTable({
  announcements = [],
  loading = false,
  onEdit,
  onDelete,
  onStatusChange,
  onNewAnnouncement,
}) {
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = announcements.filter((item) => {
    const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      item.title?.toLowerCase().includes(q) ||
      item.department_name?.toLowerCase().includes(q) ||
      item.category?.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PUBLISHED':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Published</span>;
      case 'DRAFT':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-700 text-slate-300 border border-slate-600">Draft</span>;
      case 'SCHEDULED':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">Scheduled</span>;
      case 'EXPIRED':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">Expired</span>;
      case 'ARCHIVED':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">Archived</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-400">{status}</span>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 p-4 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {['ALL', 'PUBLISHED', 'SCHEDULED', 'DRAFT', 'EXPIRED', 'ARCHIVED'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                statusFilter === st
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {st === 'ALL' ? 'All Status' : st}
            </button>
          ))}
        </div>

        <div className="relative min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search campaigns..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-hidden focus:border-blue-500"
          />
        </div>
      </div>

      {/* Table / Card Container */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs">Loading official announcements...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <AlertCircle className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-sm font-semibold text-slate-300">No announcements match your filter.</p>
            {onNewAnnouncement && (
              <button
                type="button"
                onClick={onNewAnnouncement}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-colors"
              >
                <Plus className="w-4 h-4" /> Create First Announcement
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Announcement &amp; Category</th>
                  <th className="py-3.5 px-4">Department &amp; Scope</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Engagement (CTR)</th>
                  <th className="py-3.5 px-4">Publish Date</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs text-slate-300">
                {filtered.map((item) => {
                  const banner = item.banner_image || item.banner_image_url || item.effective_banner;
                  const metrics = item.metrics || { impressions: 0, clicks: 0, ctr: 0 };

                  return (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                      {/* Announcement Info */}
                      <td className="py-4 px-4 max-w-xs">
                        <div className="flex items-start gap-3">
                          <div className="w-12 h-10 rounded-lg overflow-hidden shrink-0 bg-slate-800 border border-slate-700">
                            {banner ? (
                              <img src={banner} alt="" className="w-full h-full object-cover" />
                            ) : null}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 mb-1">
                              <AnnouncementCategoryBadge category={item.category} size="xs" />
                              {item.is_featured && (
                                <span className="text-[10px] font-bold text-amber-400 bg-amber-950/60 border border-amber-800/60 px-1.5 py-0.2 rounded">
                                  ★ Featured
                                </span>
                              )}
                              {item.is_pinned && (
                                <span className="text-[10px] text-blue-300 bg-blue-950/60 border border-blue-800/60 px-1.5 py-0.2 rounded">
                                  📌 Pinned
                                </span>
                              )}
                            </div>
                            <p className="font-bold text-white truncate max-w-[240px] leading-snug">
                              {item.title}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Department & Scope */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-slate-300 font-medium">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          <span className="truncate max-w-[160px]">
                            {item.department_name || 'Govt. of Odisha'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-1">
                          <MapPin className="w-3 h-3 text-slate-500" />
                          <span>{item.target_geography_name || 'All Odisha'}</span>
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        {getStatusBadge(item.status)}
                      </td>

                      {/* Engagement Metrics */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">{metrics.ctr}%</span>
                          <span className="text-[11px] text-slate-400">
                            ({metrics.clicks} / {metrics.impressions})
                          </span>
                        </div>
                      </td>

                      {/* Date */}
                      <td className="py-4 px-4 whitespace-nowrap text-slate-400">
                        {item.publish_at
                          ? new Date(item.publish_at).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })
                          : '—'}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => onEdit && onEdit(item)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-slate-800 transition-colors"
                            title="Edit Announcement"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          {item.status !== 'PUBLISHED' ? (
                            <button
                              type="button"
                              onClick={() => onStatusChange && onStatusChange(item.id, 'PUBLISHED')}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition-colors"
                              title="Publish Now"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onStatusChange && onStatusChange(item.id, 'DRAFT')}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors"
                              title="Unpublish to Draft"
                            >
                              <Archive className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => onDelete && onDelete(item.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
                            title="Delete Announcement"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
