import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Zap, AlertTriangle, Clock, MapPin, ChevronRight, AlertCircle, Wrench, Calendar, Info, CheckCircle, ChevronDown, Activity, PhoneCall } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Electricity() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [districts, setDistricts] = useState([]);
  const [cities, setCities] = useState([]);
  const [zones, setZones] = useState([]);
  const [wards, setWards] = useState([]);
  
  const [selections, setSelections] = useState({
    district: '', city: '', zone: '', ward: ''
  });

  const [outages, setOutages] = useState([]);
  const [activeNotices, setActiveNotices] = useState([]);
  const [upcomingNotices, setUpcomingNotices] = useState([]);
  const [gridZones, setGridZones] = useState([]);

  // Fetch geography baseline
  useEffect(() => {
    api.get('/geography/districts/').then(res => setDistricts(res.data.results || res.data));
  }, []);

  // Handle cascaded geography loading
  useEffect(() => {
    if (selections.district) api.get(`/geography/cities/?district=${selections.district}`).then(res => setCities(res.data.results || res.data));
  }, [selections.district]);
  
  useEffect(() => {
    if (selections.city) {
        api.get(`/geography/zones/?city=${selections.city}`).then(res => setZones(res.data.results || res.data));
        api.get(`/geography/wards/?city=${selections.city}`).then(res => setWards(res.data.results || res.data));
    }
  }, [selections.city]);
  
  useEffect(() => {
    if (selections.zone) api.get(`/geography/wards/?zone=${selections.zone}`).then(res => setWards(res.data.results || res.data));
  }, [selections.zone]);

  // Fetch Electricity Data based on selections
  useEffect(() => {
    const fetchStatus = async () => {
      setLoading(true);
      try {
        const params = {};
        if (selections.ward) params.ward = selections.ward;
        if (selections.city) params.city_id = selections.city; // Handled by CityScopeMixin in backend

        const [outageRes, actNoticeRes, upNoticeRes, gridRes] = await Promise.allSettled([
          api.get('/electricity/outages/active/', { params }),
          api.get('/electricity/notices/active/', { params }),
          api.get('/electricity/notices/upcoming/', { params }),
          api.get('/electricity/zones/', { params })
        ]);

        if (outageRes.status === 'fulfilled') setOutages(outageRes.value.data.results || outageRes.value.data || []);
        if (actNoticeRes.status === 'fulfilled') setActiveNotices(actNoticeRes.value.data.results || actNoticeRes.value.data || []);
        if (upNoticeRes.status === 'fulfilled') setUpcomingNotices(upNoticeRes.value.data.results || upNoticeRes.value.data || []);
        if (gridRes.status === 'fulfilled') setGridZones(gridRes.value.data.results || gridRes.value.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStatus();
  }, [selections]);

  const handleChange = (field, value) => {
    setSelections(prev => {
      const next = { ...prev, [field]: value };
      if (field === 'district') { next.city = ''; next.zone = ''; next.ward = ''; }
      if (field === 'city') { next.zone = ''; next.ward = ''; }
      if (field === 'zone') { next.ward = ''; }
      return next;
    });
  };

  const getSystemStatus = () => {
    if (outages.length > 0) return { label: 'Outage Active', color: 'bg-red-500', bg: 'bg-red-50 border-red-200 text-red-900' };
    if (activeNotices.some(n => n.notice_type === 'MAINTENANCE')) return { label: 'Maintenance Ongoing', color: 'bg-yellow-500', bg: 'bg-yellow-50 border-yellow-200 text-yellow-900' };
    return { label: 'Normal Supply', color: 'bg-green-500', bg: 'bg-green-50 border-green-200 text-green-900' };
  };

  const sysStatus = getSystemStatus();

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div className="bg-gradient-to-br from-amber-600 to-orange-500 -mx-4 -mt-4 px-6 pt-12 pb-8 rounded-b-3xl shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
           <Zap className="w-32 h-32 text-white transform rotate-12" />
        </div>
        <div className="relative z-10 flex flex-col items-center text-center space-y-2">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/30 mb-2">
            <Zap className="w-8 h-8 text-white fill-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Electricity Services</h1>
          <p className="text-amber-100 max-w-sm font-medium">Power status, outages, and maintenance for your area.</p>
        </div>
      </div>

      {/* Area Selector */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 mx-2 -mt-4 relative z-20">
        <div className="flex items-center gap-2 mb-4 text-slate-800 font-bold">
          <MapPin className="w-5 h-5 text-amber-500" />
          <h2>Select Your Area</h2>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <select value={selections.district} onChange={(e) => handleChange('district', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-500 font-medium text-slate-700">
            <option value="">District</option>
            {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <select value={selections.city} onChange={(e) => handleChange('city', e.target.value)} disabled={!selections.district} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-500 font-medium text-slate-700 disabled:opacity-50">
            <option value="">City</option>
            {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={selections.zone} onChange={(e) => handleChange('zone', e.target.value)} disabled={!selections.city} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-500 font-medium text-slate-700 disabled:opacity-50">
            <option value="">Zone (Optional)</option>
            {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
          </select>
          <select value={selections.ward} onChange={(e) => handleChange('ward', e.target.value)} disabled={!selections.city} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-500 font-medium text-slate-700 disabled:opacity-50">
            <option value="">Ward</option>
            {wards.map(w => <option key={w.id} value={w.id}>Ward {w.number} {w.name ? `(${w.name})` : ''}</option>)}
          </select>
        </div>
      </div>

      {/* Main Status */}
      <div className={`mx-2 rounded-2xl p-6 border ${sysStatus.bg} shadow-sm transition-all duration-300 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4`}>
        <div className={`absolute top-0 left-0 w-1.5 h-full ${sysStatus.color}`} />
        <div className="pl-4 z-10">
          <p className="text-sm font-bold uppercase tracking-wider opacity-70 mb-1">Current Status</p>
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${sysStatus.color} animate-pulse shadow-lg`} />
            <h2 className="text-2xl font-black">{sysStatus.label}</h2>
          </div>
          <p className="text-sm mt-1 opacity-80">Last updated: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
        </div>
        
        <button 
          onClick={() => navigate('/citizen/report?category=ELECTRICITY')}
          className="z-10 bg-white shadow-sm border border-black/5 hover:border-black/10 px-5 py-3 rounded-xl flex items-center gap-3 transition-transform active:scale-95 group shrink-0"
        >
          <div className="bg-amber-100 p-2 rounded-lg group-hover:bg-amber-200 transition-colors">
             <AlertTriangle className="w-5 h-5 text-amber-700" />
          </div>
          <div className="text-left">
            <p className="text-sm font-bold text-slate-900">Report Problem</p>
            <p className="text-xs font-medium text-slate-500">Outage, Pole, Wire</p>
          </div>
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-12">
          <Activity className="w-8 h-8 text-amber-500 animate-spin mb-3" />
          <p className="text-slate-500 font-medium">Checking grid status...</p>
        </div>
      )}

      {/* Outages Section */}
      {!loading && outages.length > 0 && (
        <div className="mx-2 space-y-4">
          <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            Active Power Outages
          </h3>
          
          <div className="grid grid-cols-1 gap-4">
            {outages.map(o => (
              <div key={o.id} className="bg-white border-2 border-red-100 rounded-2xl overflow-hidden shadow-sm">
                <div className="bg-red-50 p-4 border-b border-red-100 flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-red-900">Outage in {o.zone_name}</h4>
                    <p className="text-red-700 text-sm mt-0.5">Cause: {o.cause.replace('_', ' ')}</p>
                  </div>
                  <span className="bg-red-100 text-red-800 text-xs font-bold px-3 py-1 rounded-full animate-pulse uppercase tracking-wide">
                    {o.status}
                  </span>
                </div>
                
                <div className="p-5">
                   <p className="text-slate-600 text-sm font-medium mb-6">{o.description}</p>
                   
                   {/* Restoration Timeline */}
                   <div className="relative border-l-2 border-slate-200 ml-3 space-y-6 pb-2">
                     <div className="relative pl-6">
                       <div className="absolute -left-[9px] top-1 w-4 h-4 bg-green-500 rounded-full ring-4 ring-white" />
                       <p className="font-bold text-slate-900 text-sm">Outage Reported</p>
                       <p className="text-xs text-slate-500">{new Date(o.start_time).toLocaleString()}</p>
                     </div>
                     
                     <div className="relative pl-6">
                       <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full ring-4 ring-white ${['RESTORING', 'RESOLVED'].includes(o.status) ? 'bg-amber-500' : 'bg-slate-300'}`} />
                       <p className={`font-bold text-sm ${['RESTORING', 'RESOLVED'].includes(o.status) ? 'text-slate-900' : 'text-slate-400'}`}>Restoration in Progress</p>
                       {['RESTORING', 'RESOLVED'].includes(o.status) && <p className="text-xs text-slate-500">Field team is working on the issue</p>}
                     </div>
                     
                     <div className="relative pl-6">
                       <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full ring-4 ring-white ${o.status === 'RESOLVED' ? 'bg-green-500' : 'bg-slate-300'}`} />
                       <p className={`font-bold text-sm ${o.status === 'RESOLVED' ? 'text-slate-900' : 'text-slate-400'}`}>Power Restored</p>
                       {o.estimated_restoration && o.status !== 'RESOLVED' && (
                         <div className="mt-2 inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-xs font-bold border border-blue-100">
                           <Clock className="w-3.5 h-3.5" />
                           Expected: {new Date(o.estimated_restoration).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                         </div>
                       )}
                     </div>
                   </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notices & Announcements */}
      {!loading && (activeNotices.length > 0 || upcomingNotices.length > 0) && (
        <div className="mx-2 space-y-4">
          <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
            <Info className="w-5 h-5 text-blue-500" />
            Notices & Maintenance
          </h3>
          
          <div className="space-y-3">
            {[...activeNotices, ...upcomingNotices].map(notice => {
              const isMaintenance = notice.notice_type === 'MAINTENANCE';
              const Icon = isMaintenance ? Wrench : AlertCircle;
              return (
                <div key={notice.id} className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm flex items-start gap-4">
                  <div className={`p-3 rounded-xl shrink-0 ${isMaintenance ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2 mb-1">
                      <h4 className="font-bold text-slate-900 leading-tight">{notice.title}</h4>
                      {notice.ward_name && (
                        <span className="text-[10px] font-bold uppercase tracking-wide bg-slate-100 text-slate-600 px-2 py-0.5 rounded shrink-0">
                          {notice.ward_name}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed mb-3">{notice.description}</p>
                    <div className="flex items-center gap-4 text-xs font-semibold text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {new Date(notice.start_time).toLocaleDateString()}</div>
                      <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> 
                         {new Date(notice.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - 
                         {notice.end_time ? new Date(notice.end_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Ongoing'}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!loading && outages.length === 0 && activeNotices.length === 0 && upcomingNotices.length === 0 && (
        <div className="mx-2 bg-white border border-slate-200 rounded-2xl p-10 flex flex-col items-center justify-center text-center shadow-sm">
          <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-4">
             <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">Everything is Good</h3>
          <p className="text-slate-500 max-w-sm">There are no active outages, scheduled maintenance, or notices for the selected area.</p>
        </div>
      )}
      
      {/* Footer Info */}
      <div className="mx-2 mt-8 text-center border-t border-slate-200 pt-8 pb-4">
         <p className="text-sm text-slate-400 font-medium mb-2">Need immediate emergency assistance?</p>
         <a href="tel:1912" className="inline-flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-full font-bold text-sm shadow-md hover:bg-slate-800 transition-colors">
            <PhoneCall className="w-4 h-4" />
            Call Electricity Helpline (1912)
         </a>
      </div>
    </div>
  );
}
