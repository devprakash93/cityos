import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { 
  Droplets, AlertTriangle, Clock, MapPin, 
  ChevronRight, Calendar, AlertCircle, Bell, History, ArrowRight
} from 'lucide-react';

export default function WaterSupply() {
  const navigate = useNavigate();
  const [cities, setCities] = useState([]);
  const [wards, setWards] = useState([]);
  
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedWard, setSelectedWard] = useState('');
  
  const [notices, setNotices] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch Cities on load
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const cRes = await api.get('/geography/cities/');
        const cityData = cRes.data?.results || cRes.data || [];
        setCities(cityData);
        // Default to first city if available
        if (cityData.length > 0) {
          setSelectedCity(cityData[0].id.toString());
        }
      } catch (e) {
        console.error("Failed to load cities", e);
      }
    };
    fetchLocations();
  }, []);

  // Fetch Wards when City changes
  useEffect(() => {
    if (!selectedCity) return;
    const fetchWards = async () => {
      try {
        const wRes = await api.get(`/geography/wards/?city=${selectedCity}`);
        const wardData = wRes.data?.results || wRes.data || [];
        setWards(wardData);
        if (wardData.length > 0) {
          setSelectedWard(wardData[0].id.toString());
        } else {
          setSelectedWard('');
        }
      } catch (e) {
        console.error("Failed to load wards", e);
      }
    };
    fetchWards();
  }, [selectedCity]);

  // Fetch Notices and Schedules when Ward/City changes
  useEffect(() => {
    if (!selectedCity) return;
    
    const fetchData = async () => {
      setLoading(true);
      try {
        let qs = `?city=${selectedCity}`;
        if (selectedWard) qs += `&ward=${selectedWard}`;
        
        const [nRes, sRes, srcRes] = await Promise.allSettled([
          api.get(`/water/notices/${qs}`),
          api.get(`/water/schedules/${qs}`),
          api.get(`/water/sources/${qs}`)
        ]);
        
        if (nRes.status === 'fulfilled') {
          setNotices(nRes.value.data?.results || nRes.value.data || []);
        }
        if (sRes.status === 'fulfilled') {
          setSchedules(sRes.value.data?.results || sRes.value.data || []);
        }
        if (srcRes.status === 'fulfilled') {
          setSources(srcRes.value.data?.results || srcRes.value.data || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [selectedCity, selectedWard]);

  // Derived state
  const activeNotices = notices.filter(n => n.status === 'IN_PROGRESS');
  const upcomingNotices = notices.filter(n => n.status === 'UPCOMING');
  const resolvedNotices = notices.filter(n => n.status === 'RESOLVED');
  
  const currentSchedule = schedules.length > 0 ? schedules[0] : null;

  // Determine Overall Status
  let currentStatus = { label: 'Normal Supply', color: 'text-green-600', bg: 'bg-green-100', icon: Droplets };
  if (activeNotices.length > 0) {
    const primary = activeNotices[0];
    if (primary.notice_type === 'LOW_PRESSURE') {
      currentStatus = { label: 'Low Pressure', color: 'text-yellow-700', bg: 'bg-yellow-100', icon: AlertTriangle };
    } else if (primary.notice_type === 'MAINTENANCE') {
      currentStatus = { label: 'Maintenance', color: 'text-orange-700', bg: 'bg-orange-100', icon: Clock };
    } else {
      currentStatus = { label: 'No Supply', color: 'text-red-700', bg: 'bg-red-100', icon: AlertCircle };
    }
  }

  // Format Time
  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':');
    const d = new Date();
    d.setHours(h, m);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-5 pb-8 max-w-lg mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">💧 Water Supply</h1>
        <p className="text-sm text-slate-500 mt-1">Schedules, notices, and live status for your area.</p>
      </div>

      {/* 🔴 IMPORTANT NOTICE BANNER */}
      {activeNotices.map(notice => (
        <div key={notice.id} className="bg-red-50 border border-red-200 rounded-xl overflow-hidden shadow-sm">
          <div className="bg-red-600 px-4 py-2 flex items-center gap-2 text-white">
            <AlertCircle className="w-5 h-5" />
            <span className="font-bold text-sm tracking-wide">IMPORTANT NOTICE</span>
          </div>
          <div className="p-4">
            <h3 className="font-bold text-red-900 mb-1">{notice.title}</h3>
            <p className="text-sm text-red-700 mb-3">{notice.description}</p>
            <div className="space-y-1 text-sm text-red-800">
              <p className="flex justify-between"><span>Started:</span> <span className="font-medium">{formatDate(notice.start_time)}</span></p>
              <p className="flex justify-between"><span>Reason:</span> <span className="font-medium">{notice.reason}</span></p>
              <p className="flex justify-between"><span>Expected Restoral:</span> <span className="font-bold">{formatDate(notice.expected_restoration)}</span></p>
            </div>
            {/* Restoration Progress UI */}
            <div className="mt-4 pt-3 border-t border-red-200">
              <p className="text-xs font-semibold text-red-800 mb-2">Restoration Updates</p>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-600 animate-ping"></div>
                <p className="text-xs text-red-700 font-medium">Work in progress...</p>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* 📍 YOUR AREA SELECTOR */}
      <div className="citizen-card p-4 space-y-3">
        <h3 className="text-xs font-bold text-slate-500 tracking-wider uppercase mb-1">📍 Your Area</h3>
        <div className="grid grid-cols-2 gap-3">
          <select 
            value={selectedCity} 
            onChange={e => setSelectedCity(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 text-sm rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select 
            value={selectedWard} 
            onChange={e => setSelectedWard(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 text-sm rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Wards</option>
            {wards.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </div>
      </div>

      {/* 🟢 CURRENT STATUS */}
      <div className="citizen-card p-4 flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold text-slate-500 tracking-wider uppercase mb-1">Current Status</h3>
          <div className="flex items-center gap-2 mt-1">
            <div className={`p-1.5 rounded-lg ${currentStatus.bg}`}>
              <currentStatus.icon className={`w-5 h-5 ${currentStatus.color}`} />
            </div>
            <span className={`text-lg font-bold ${currentStatus.color}`}>{currentStatus.label}</span>
          </div>
        </div>
      </div>

      {/* 🕐 TODAY'S SCHEDULE */}
      <div className="citizen-card p-4">
        <h3 className="text-xs font-bold text-slate-500 tracking-wider uppercase mb-3">🕐 Today's Schedule</h3>
        {loading ? (
          <div className="animate-pulse h-16 bg-slate-100 rounded-lg"></div>
        ) : currentSchedule ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-blue-50/50 rounded-lg border border-blue-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">☀️</div>
                <span className="font-medium text-slate-700">Morning</span>
              </div>
              <span className="font-bold text-slate-900">
                {formatTime(currentSchedule.morning_start)} – {formatTime(currentSchedule.morning_end)}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-indigo-50/50 rounded-lg border border-indigo-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">🌙</div>
                <span className="font-medium text-slate-700">Evening</span>
              </div>
              <span className="font-bold text-slate-900">
                {formatTime(currentSchedule.evening_start)} – {formatTime(currentSchedule.evening_end)}
              </span>
            </div>
            <p className="text-xs text-center text-slate-500 mt-2">
              Supply frequency: <span className="font-medium">{currentSchedule.days_of_supply}</span>
            </p>
          </div>
        ) : (
          <p className="text-sm text-slate-500 text-center py-4 bg-slate-50 rounded-lg">No schedule available for this area.</p>
        )}
      </div>

      {/* 📢 UPCOMING NOTICES */}
      <div className="citizen-card overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-xs font-bold text-slate-500 tracking-wider uppercase">📢 Upcoming Notices</h3>
          <span className="text-xs text-primary-600 font-medium">View All</span>
        </div>
        <div className="divide-y divide-slate-100">
          {loading ? (
             <div className="p-4 animate-pulse h-16 bg-slate-50"></div>
          ) : upcomingNotices.length > 0 ? (
            upcomingNotices.map(notice => (
              <div key={notice.id} className="p-4 hover:bg-slate-50 transition-colors">
                <div className="flex gap-3">
                  <div className="mt-0.5"><Calendar className="w-5 h-5 text-slate-400" /></div>
                  <div>
                    <h4 className="font-semibold text-slate-900 text-sm mb-1">{notice.title}</h4>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mb-1">
                      <Clock className="w-3 h-3" /> {formatDate(notice.start_time)}
                    </p>
                    <p className="text-xs font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded inline-block">
                      {notice.reason || 'Planned Maintenance'}
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-6 text-center text-slate-500 text-sm">No upcoming interruptions scheduled.</div>
          )}
        </div>
      </div>

      {/* ACTION BUTTONS */}
      <div className="grid grid-cols-2 gap-3">
        <button 
          onClick={() => alert("Notifications enabled for this area.")}
          className="citizen-card p-3 flex flex-col items-center justify-center gap-2 hover:bg-primary-50 transition-colors border-transparent hover:border-primary-100 text-primary-700"
        >
          <Bell className="w-5 h-5" />
          <span className="text-xs font-bold">Enable Alerts</span>
        </button>
        
        <button 
          onClick={() => navigate('/complaints/new', { state: { category: 'WATER_SUPPLY' } })}
          className="citizen-card p-3 flex flex-col items-center justify-center gap-2 hover:bg-red-50 transition-colors border-transparent hover:border-red-100 text-red-600"
        >
          <AlertTriangle className="w-5 h-5" />
          <span className="text-xs font-bold">Report Issue</span>
        </button>
      </div>

      {/* 📜 SUPPLY HISTORY */}
      <div className="citizen-card p-4">
        <h3 className="text-xs font-bold text-slate-500 tracking-wider uppercase mb-3">📜 Supply History</h3>
        <div className="space-y-3">
          {resolvedNotices.slice(0,3).map(n => (
            <div key={n.id} className="flex justify-between items-center text-sm p-3 bg-slate-50 rounded-lg">
              <div>
                <p className="font-medium text-slate-800">{n.reason || 'Maintenance'}</p>
                <p className="text-xs text-slate-500">{new Date(n.start_time).toLocaleDateString()}</p>
              </div>
              <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold">Resolved</span>
            </div>
          ))}
          {resolvedNotices.length === 0 && !loading && (
            <p className="text-sm text-slate-500 text-center py-2">No recent interruptions.</p>
          )}
        </div>
      </div>

    </div>
  );
}
