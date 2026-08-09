import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCity } from '../../context/CityContext';
import api from '../../api/axios';
import { Clock, AlertTriangle, Search, Filter, RefreshCw, Eye } from 'lucide-react';

const STATUS_TABS = ['ALL', 'PENDING', 'IN_PROGRESS', 'RESOLVED', 'SLA_BREACH'];

function StatusBadge({ status }) {
  const map = {
    PENDING: 'bg-orange-100 text-orange-700 border-orange-200',
    ASSIGNED: 'bg-blue-100 text-blue-700 border-blue-200',
    IN_PROGRESS: 'bg-blue-100 text-blue-700 border-blue-200',
    RESOLVED: 'bg-green-100 text-green-700 border-green-200',
    CLOSED: 'bg-slate-100 text-slate-600 border-slate-200',
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold border ${map[status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
      {status?.replace('_', ' ')}
    </span>
  );
}

function PriorityBadge({ priority }) {
  const map = {
    CRITICAL: 'bg-red-100 text-red-700',
    HIGH: 'bg-orange-100 text-orange-700',
    MEDIUM: 'bg-yellow-100 text-yellow-700',
    LOW: 'bg-slate-100 text-slate-600',
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${map[priority] || 'bg-slate-100 text-slate-600'}`}>
      {priority}
    </span>
  );
}

export default function ComplaintsAdmin() {
  const { selectedCity } = useCity();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL');
  const [search, setSearch] = useState('');
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const params = { page, page_size: 20 };
      if (selectedCity) params.city_id = selectedCity.id;
      if (search) params.search = search;
      if (activeTab === 'SLA_BREACH') {
        params.sla_breached = true;
      } else if (activeTab !== 'ALL') {
        params.status = activeTab;
      }
      const res = await api.get('/complaints/', { params });
      const data = res.data.results ?? res.data;
      setComplaints(Array.isArray(data) ? data : []);
      setTotalCount(res.data.count ?? data.length);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchComplaints(); }, [activeTab, search, selectedCity, page]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Complaint Administration</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {totalCount} complaints · {selectedCity ? selectedCity.name : 'All Odisha'}
          </p>
        </div>
        <button onClick={fetchComplaints} className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
        {STATUS_TABS.map(tab => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === tab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            } ${tab === 'SLA_BREACH' && activeTab === tab ? '!bg-red-50 !text-red-700' : ''}`}
          >
            {tab.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search complaints..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">#</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Category</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Description</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Ward/City</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Priority</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">SLA</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Date</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}><td colSpan="9" className="px-6 py-4"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td></tr>
                ))
              ) : complaints.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-6 py-12 text-center text-slate-400">
                    No complaints found.
                  </td>
                </tr>
              ) : (
                complaints.map(c => (
                  <tr key={c.id} className={`hover:bg-slate-50 transition-colors ${c.sla_breached ? 'bg-red-50/30' : ''}`}>
                    <td className="px-6 py-3 font-mono text-xs text-slate-400">#{c.id}</td>
                    <td className="px-6 py-3 font-medium text-slate-700">{c.category?.replace(/_/g, ' ')}</td>
                    <td className="px-6 py-3 text-slate-600 max-w-xs truncate">{c.description}</td>
                    <td className="px-6 py-3 text-xs text-slate-500">{c.ward_name || c.ward || '—'}</td>
                    <td className="px-6 py-3"><PriorityBadge priority={c.priority} /></td>
                    <td className="px-6 py-3"><StatusBadge status={c.status} /></td>
                    <td className="px-6 py-3">
                      {c.sla_breached ? (
                        <span className="inline-flex items-center gap-1 text-xs text-red-600 font-semibold">
                          <AlertTriangle className="w-3 h-3" /> Breached
                        </span>
                      ) : (
                        <span className="text-xs text-green-600 font-semibold">OK</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-xs text-slate-400">
                      {c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-6 py-3">
                      <Link to={`/admin/complaints/${c.id}`} className="text-xs text-green-600 hover:text-green-700 font-semibold flex items-center gap-1">
                        <Eye className="w-3 h-3" /> View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalCount > 20 && (
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
            <p className="text-sm text-slate-500">Page {page} · {totalCount} total</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50">
                Previous
              </button>
              <button onClick={() => setPage(p => p + 1)} disabled={page * 20 >= totalCount}
                className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50">
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
