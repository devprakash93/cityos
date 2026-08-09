import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Search, Filter, CheckCircle, XCircle, ChevronDown, RefreshCw, User, Plus, Edit } from 'lucide-react';
import UserModal from './UserModal';

const ROLES = ['ALL', 'CITIZEN', 'OFFICER', 'FIELD_WORKER', 'SUPER_ADMIN'];
const STATUSES = ['ALL', 'Active', 'Inactive'];

function RoleBadge({ role }) {
  const map = {
    SUPER_ADMIN: 'bg-purple-100 text-purple-700 border-purple-200',
    OFFICER: 'bg-blue-100 text-blue-700 border-blue-200',
    FIELD_WORKER: 'bg-orange-100 text-orange-700 border-orange-200',
    CITIZEN: 'bg-slate-100 text-slate-600 border-slate-200',
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold border ${map[role] || 'bg-slate-100 text-slate-600'}`}>
      {role?.replace('_', ' ')}
    </span>
  );
}

export default function UsersManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = { page, page_size: 20 };
      if (search) params.search = search;
      if (roleFilter !== 'ALL') params['role__name'] = roleFilter;
      if (statusFilter === 'Active') params.is_active = true;
      if (statusFilter === 'Inactive') params.is_active = false;
      const res = await api.get('/accounts/users/', { params });
      const data = res.data.results ?? res.data;
      setUsers(Array.isArray(data) ? data : []);
      setTotalCount(res.data.count ?? data.length);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, [search, roleFilter, statusFilter, page]);

  const toggleStatus = async (user) => {
    try {
      await api.patch(`/accounts/users/${user.id}/`, { is_active: !user.is_active });
      fetchUsers();
    } catch (err) {
      alert('Error updating user status');
    }
  };

  const getUserName = (u) => {
    if (u.full_name && u.full_name.trim()) return u.full_name.trim();
    const first = u.first_name || '';
    const last = u.last_name || '';
    const combined = `${first} ${last}`.trim();
    return combined || u.username || u.email.split('@')[0];
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Users & Roles</h1>
          <p className="text-sm text-slate-500 mt-0.5">{totalCount} users across Odisha CityOS</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchUsers} className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm transition-colors">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button 
             onClick={() => { setSelectedUser(null); setShowModal(true); }}
             className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Create User
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        <select
          value={roleFilter}
          onChange={e => { setRoleFilter(e.target.value); setPage(1); }}
          className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
        >
          {ROLES.map(r => <option key={r} value={r}>{r === 'ALL' ? 'All Roles' : r.replace('_', ' ')}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
        >
          {STATUSES.map(s => <option key={s} value={s}>{s === 'ALL' ? 'All Statuses' : s}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">User</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Role</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Department</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">City</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Joined</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td colSpan="7" className="px-6 py-4">
                      <div className="h-4 bg-slate-100 rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center">
                    <User className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="text-slate-400">No users found matching your filters.</p>
                  </td>
                </tr>
              ) : (
                users.map(u => {
                  const name = getUserName(u);
                  return (
                    <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                            {name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-slate-800">{name}</p>
                            <p className="text-xs text-slate-400">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3"><RoleBadge role={u.role_name} /></td>
                      <td className="px-6 py-3 text-slate-600 text-xs">{u.department_name || '—'}</td>
                      <td className="px-6 py-3 text-slate-600 text-xs">{u.profile?.city_ref_name || u.profile?.city || '—'}</td>
                      <td className="px-6 py-3">
                        {u.is_active ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-600">
                            <CheckCircle className="w-3.5 h-3.5" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-500">
                            <XCircle className="w-3.5 h-3.5" /> Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-xs text-slate-400">
                        {u.date_joined ? new Date(u.date_joined).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                           <button
                             onClick={() => { setSelectedUser(u); setShowModal(true); }}
                             className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                             title="Edit User"
                           >
                             <Edit className="w-4 h-4" />
                           </button>
                           <button
                             onClick={() => toggleStatus(u)}
                             className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors ${
                               u.is_active
                                 ? 'bg-red-50 text-red-600 hover:bg-red-100'
                                 : 'bg-green-50 text-green-600 hover:bg-green-100'
                             }`}
                           >
                             {u.is_active ? 'Deactivate' : 'Activate'}
                           </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalCount > 20 && (
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Showing {((page - 1) * 20) + 1}–{Math.min(page * 20, totalCount)} of {totalCount}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg disabled:opacity-50 hover:bg-slate-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page * 20 >= totalCount}
                className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg disabled:opacity-50 hover:bg-slate-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <UserModal 
           user={selectedUser} 
           onClose={() => setShowModal(false)} 
           onSuccess={() => { setShowModal(false); fetchUsers(); }}
        />
      )}
    </div>
  );
}
