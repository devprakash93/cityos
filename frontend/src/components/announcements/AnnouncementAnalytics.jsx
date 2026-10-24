import { useState, useEffect } from 'react';
import { 
  TrendingUp, MousePointer, Eye, Megaphone, 
  Sparkles, CheckCircle2, ShieldAlert, BarChart3, Layers
} from 'lucide-react';
import api from '../../api/axios';
import AnnouncementCategoryBadge from './AnnouncementCategoryBadge';

export default function AnnouncementAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const res = await api.get('/admin/announcements/analytics/');
        setData(res.data);
      } catch (err) {
        console.error('Failed to load announcements analytics', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-5 bg-slate-900 border border-slate-800 rounded-3xl h-28" />
        ))}
      </div>
    );
  }

  const overview = data?.overview || {
    total_announcements: 0,
    active_published: 0,
    featured: 0,
    total_impressions: 0,
    total_views: 0,
    total_clicks: 0,
    overall_ctr: 0,
  };

  const topCampaigns = data?.top_campaigns || [];
  const categoryBreakdown = data?.category_breakdown || [];

  return (
    <div className="space-y-6 text-white">
      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Total Impressions */}
        <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Total Impressions</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Eye className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-white">{overview.total_impressions.toLocaleString()}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Citizen homepage exposures</p>
          </div>
        </div>

        {/* Total Clicks */}
        <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Total CTA Clicks</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <MousePointer className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-emerald-400">{overview.total_clicks.toLocaleString()}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Interactions on primary buttons</p>
          </div>
        </div>

        {/* Click-Through Rate */}
        <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Average CTR</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-purple-400">{overview.overall_ctr}%</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Click-to-impression efficiency</p>
          </div>
        </div>

        {/* Active Campaigns */}
        <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Active Live</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Megaphone className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-white">{overview.active_published} / {overview.total_announcements}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">{overview.featured} featured in spotlight</p>
          </div>
        </div>
      </div>

      {/* Top Performing Campaigns Table & Category Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Campaigns (2 cols) */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-400" />
              Highest Performing Official Campaigns
            </h3>
            <span className="text-xs text-slate-500">Sorted by CTR</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase">
                  <th className="py-2.5 px-3">Campaign</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3 text-right">Clicks</th>
                  <th className="py-2.5 px-3 text-right">Impressions</th>
                  <th className="py-2.5 px-3 text-right">CTR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {topCampaigns.map((camp) => (
                  <tr key={camp.id} className="hover:bg-slate-800/30">
                    <td className="py-3 px-3 font-semibold text-white max-w-xs truncate">
                      {camp.title}
                    </td>
                    <td className="py-3 px-3">
                      <AnnouncementCategoryBadge category={camp.category} size="xs" />
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-emerald-400">
                      {camp.clicks}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-400">
                      {camp.impressions}
                    </td>
                    <td className="py-3 px-3 text-right font-black text-blue-400">
                      {camp.ctr}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Category Breakdown (1 col) */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            Campaigns by Civic Category
          </h3>

          <div className="space-y-3 pt-2">
            {categoryBreakdown.map((item) => {
              const pct = overview.total_announcements > 0
                ? Math.round((item.count / overview.total_announcements) * 100)
                : 0;
              return (
                <div key={item.category} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-300">
                      {item.category.replace('_', ' ')}
                    </span>
                    <span className="text-slate-400 font-bold">{item.count} ({pct}%)</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-blue-500"
                      style={{ width: `${Math.max(pct, 5)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
