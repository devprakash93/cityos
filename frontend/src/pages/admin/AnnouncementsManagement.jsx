import { useState, useEffect, useCallback } from 'react';
import { 
  Megaphone, Plus, BarChart3, ListFilter, Sparkles,
  RefreshCw, CheckCircle2, AlertCircle
} from 'lucide-react';
import api from '../../api/axios';
import AnnouncementAdminTable from '../../components/announcements/AnnouncementAdminTable';
import AnnouncementEditor from '../../components/announcements/AnnouncementEditor';
import AnnouncementAnalytics from '../../components/announcements/AnnouncementAnalytics';

export default function AnnouncementsManagement() {
  const [activeTab, setActiveTab] = useState('list'); // 'list' | 'create' | 'analytics'
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [notification, setNotification] = useState(null);

  const fetchAnnouncements = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/announcements/');
      const data = res.data?.results || res.data || [];
      setAnnouncements(data);
    } catch (err) {
      console.error('Failed to fetch announcements', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const showNotification = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await api.patch(`/admin/announcements/${id}/status/`, { status: newStatus });
      showNotification(`Announcement status updated to ${newStatus}.`);
      fetchAnnouncements();
    } catch (err) {
      alert('Failed to update status. Please check your administrative privileges.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this official announcement? This action will be audited.')) {
      return;
    }
    try {
      await api.delete(`/admin/announcements/${id}/`);
      showNotification('Announcement deleted successfully.');
      fetchAnnouncements();
    } catch (err) {
      alert('Failed to delete announcement.');
    }
  };

  const handleEdit = (announcement) => {
    setEditingAnnouncement(announcement);
    setActiveTab('create');
  };

  const handleSaveSuccess = () => {
    setEditingAnnouncement(null);
    setActiveTab('list');
    showNotification('Official announcement saved successfully.');
    fetchAnnouncements();
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2.5">
            <Megaphone className="w-7 h-7 text-blue-400" />
            Official Announcements &amp; Campaigns
          </h1>
          <p className="text-slate-400 mt-1 text-xs sm:text-sm">
            Publish, schedule, and manage official municipal notices, civic campaigns, and emergency advisories.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-1.5 rounded-2xl shrink-0">
          <button
            type="button"
            onClick={() => {
              setEditingAnnouncement(null);
              setActiveTab('list');
            }}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors ${
              activeTab === 'list'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ListFilter className="w-4 h-4" /> All Announcements
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingAnnouncement(null);
              setActiveTab('create');
            }}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors ${
              activeTab === 'create'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Plus className="w-4 h-4" />
            {editingAnnouncement ? 'Edit Campaign' : 'Create New'}
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingAnnouncement(null);
              setActiveTab('analytics');
            }}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors ${
              activeTab === 'analytics'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BarChart3 className="w-4 h-4" /> Analytics
          </button>
        </div>
      </div>

      {/* Floating Status Notification Toast */}
      {notification && (
        <div className="p-3.5 rounded-2xl bg-emerald-950/80 border border-emerald-700/80 text-emerald-200 text-xs sm:text-sm flex items-center justify-between shadow-lg animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{notification.msg}</span>
          </div>
          <button type="button" onClick={() => setNotification(null)} className="text-emerald-400 text-xs font-bold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Tab 1: All Announcements Table */}
      {activeTab === 'list' && (
        <AnnouncementAdminTable
          announcements={announcements}
          loading={loading}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onStatusChange={handleStatusChange}
          onNewAnnouncement={() => setActiveTab('create')}
        />
      )}

      {/* Tab 2: Create / Edit Module */}
      {activeTab === 'create' && (
        <AnnouncementEditor
          initialData={editingAnnouncement}
          onSaveSuccess={handleSaveSuccess}
          onCancel={() => {
            setEditingAnnouncement(null);
            setActiveTab('list');
          }}
        />
      )}

      {/* Tab 3: Analytics & Engagement Metrics */}
      {activeTab === 'analytics' && (
        <AnnouncementAnalytics />
      )}
    </div>
  );
}
