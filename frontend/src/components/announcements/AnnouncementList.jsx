import { useState, useMemo } from 'react';
import { Search, Filter, Megaphone, AlertCircle, X } from 'lucide-react';
import AnnouncementCard from './AnnouncementCard';
import AnnouncementDetails from './AnnouncementDetails';

const CATEGORY_TABS = [
  { id: 'ALL', label: 'All Updates' },
  { id: 'WELFARE_SCHEME', label: 'Welfare Schemes' },
  { id: 'CITY_CAMPAIGN', label: 'City Campaigns' },
  { id: 'EMERGENCY_ALERT', label: 'Emergency Alerts' },
  { id: 'PUBLIC_NOTICE', label: 'Public Notices' },
  { id: 'TRAFFIC', label: 'Traffic & Roads' },
  { id: 'WATER', label: 'Water Supply' },
  { id: 'ELECTRICITY', label: 'Power & Grid' },
  { id: 'TRANSPORT', label: 'Public Transit' },
];

export default function AnnouncementList({
  announcements = [],
  loading = false,
  title = "📢 Official City Announcements",
  subtitle = "Government schemes, public notices, and civic campaigns for Odisha citizens.",
}) {
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeAnnouncement, setActiveAnnouncement] = useState(null);

  // Filtered announcements
  const filtered = useMemo(() => {
    return announcements.filter((item) => {
      const matchesCategory = selectedCategory === 'ALL' || item.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.title?.toLowerCase().includes(q) ||
        item.summary?.toLowerCase().includes(q) ||
        item.content?.toLowerCase().includes(q) ||
        item.department_name?.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [announcements, selectedCategory, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          {title}
        </h1>
        <p className="text-slate-500 mt-1.5 text-sm sm:text-base leading-relaxed">
          {subtitle}
        </p>
      </div>

      {/* Search Bar & Filter Controls */}
      <div className="space-y-3">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by keyword, scheme name, or department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-200/90 rounded-2xl pl-10 pr-10 py-2.5 sm:py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Horizontal Category Filter Pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORY_TABS.map((tab) => {
            const isSelected = selectedCategory === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedCategory(tab.id)}
                className={`whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 border ${
                  isSelected
                    ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Announcements Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="citizen-card p-5 animate-pulse flex flex-col justify-between h-40">
              <div className="flex justify-between">
                <div className="w-24 h-5 bg-slate-200 rounded-full" />
                <div className="w-16 h-4 bg-slate-100 rounded" />
              </div>
              <div className="space-y-2">
                <div className="w-3/4 h-5 bg-slate-200 rounded" />
                <div className="w-full h-3 bg-slate-100 rounded" />
              </div>
              <div className="w-1/3 h-4 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((item) => (
            <AnnouncementCard
              key={item.id}
              announcement={item}
              onOpenDetails={(ann) => setActiveAnnouncement(ann)}
            />
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="citizen-card p-10 text-center border-dashed border-2 border-slate-200">
          <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3 text-slate-400">
            <Megaphone className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No announcements found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {searchQuery || selectedCategory !== 'ALL'
              ? 'Try adjusting your search keywords or switching category filters.'
              : 'There are currently no active public announcements in this category.'}
          </p>
          {(searchQuery || selectedCategory !== 'ALL') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('ALL');
              }}
              className="mt-4 px-4 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-xl hover:bg-emerald-100 transition-colors"
            >
              Reset Filters
            </button>
          )}
        </div>
      )}

      {/* Details View Modal */}
      <AnnouncementDetails
        isOpen={Boolean(activeAnnouncement)}
        announcement={activeAnnouncement}
        onClose={() => setActiveAnnouncement(null)}
      />
    </div>
  );
}
