import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { CityMap } from '../../components/maps/CityMap';
import {
  ShieldAlert,
  Radio,
  PhoneCall,
  PhoneOff,
  Phone,
  CheckCircle2,
  Clock,
  AlertCircle,
  MapPin,
  Siren,
  RotateCw,
  LogOut,
  Send,
  Truck,
  Flame,
  Activity,
  Search,
  Filter,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  X,
  Compass,
  AlertTriangle,
} from 'lucide-react';

export default function ControllerDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [metrics, setMetrics] = useState({
    new: 0,
    acknowledged: 0,
    dispatched: 0,
    resolved: 0,
    total: 0,
    active_demo_calls: 0,
  });
  const [incidents, setIncidents] = useState([]);
  const [responders, setResponders] = useState([]);
  const [activeCalls, setActiveCalls] = useState([]);

  // Selected incident for details & map focus
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Responder dispatch modal state
  const [dispatchModalOpen, setDispatchModalOpen] = useState(false);
  const [targetIncident, setTargetIncident] = useState(null);
  const [selectedResponderId, setSelectedResponderId] = useState('');
  const [dispatchNotes, setDispatchNotes] = useState('');
  const [dispatchLoading, setDispatchLoading] = useState(false);

  // Active Controller in-call state
  const [activeCallSession, setActiveCallSession] = useState(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const callTimerRef = useRef(null);

  const fetchDashboardData = async (isPoll = false) => {
    if (!isPoll) setRefreshing(true);
    try {
      const res = await api.get('/emergency/controller/dashboard/');
      if (res.data.success) {
        setMetrics(res.data.metrics || {});
        setIncidents(res.data.incidents || []);
        setResponders(res.data.responders || []);
        setActiveCalls(res.data.active_demo_calls || []);

        // Default select first incident if none selected
        if (!selectedIncident && res.data.incidents?.length > 0) {
          setSelectedIncident(res.data.incidents[0]);
        }
      }
    } catch (err) {
      console.error('Error loading controller dashboard', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    // Poll dashboard data and active incoming calls every 4 seconds
    const interval = setInterval(() => {
      fetchDashboardData(true);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Call timer effect
  useEffect(() => {
    if (activeCallSession && activeCallSession.status === 'CONNECTED') {
      callTimerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
    }
    return () => {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
    };
  }, [activeCallSession]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      localStorage.removeItem('access_token');
    }
    navigate('/controller/login', { replace: true });
  };

  const handleUpdateStatus = async (incidentId, newStatus) => {
    try {
      const res = await api.post(`/emergency/incidents/${incidentId}/update-status/`, {
        status: newStatus,
      });
      // Update local state
      setIncidents((prev) =>
        prev.map((inc) => (inc.id === incidentId ? res.data : inc))
      );
      if (selectedIncident?.id === incidentId) {
        setSelectedIncident(res.data);
      }
      fetchDashboardData(true);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update status.');
    }
  };

  const openDispatchModal = (incident) => {
    setTargetIncident(incident);
    setSelectedResponderId('');
    setDispatchNotes('');
    setDispatchModalOpen(true);
  };

  const handleDispatchResponder = async (e) => {
    e.preventDefault();
    if (!selectedResponderId || !targetIncident) return;

    setDispatchLoading(true);
    try {
      await api.post(`/emergency/incidents/${targetIncident.id}/assign-responder/`, {
        responder_id: selectedResponderId,
        notes: dispatchNotes,
      });
      setDispatchModalOpen(false);
      fetchDashboardData(true);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to dispatch responder.');
    } finally {
      setDispatchLoading(false);
    }
  };

  // Controller Call Actions
  const handleAcceptCall = async (call) => {
    try {
      await api.post(`/emergency/controller/calls/${call.call_id}/action/`, {
        action: 'accept',
      });
      setActiveCallSession({ ...call, status: 'CONNECTED' });
      setCallDuration(0);
      fetchDashboardData(true);
    } catch (err) {
      console.error('Failed to accept demo call', err);
    }
  };

  const handleEndCall = async (callId) => {
    try {
      await api.post(`/emergency/controller/calls/${callId}/action/`, {
        action: 'end',
      });
      setActiveCallSession(null);
      setCallDuration(0);
      fetchDashboardData(true);
    } catch (err) {
      console.error('Failed to end demo call', err);
    }
  };

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Filtered incidents
  const filteredIncidents = incidents.filter((inc) => {
    const matchesStatus = statusFilter === 'ALL' || inc.status === statusFilter;
    const matchesSearch =
      !searchQuery ||
      inc.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inc.incident_type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inc.reported_by_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inc.location_address?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Map markers
  const markers = incidents
    .filter((i) => i.location_lat && i.location_lng)
    .map((i) => ({
      lat: i.location_lat,
      lng: i.location_lng,
      type: i.severity === 'CRITICAL' || i.incident_type === 'SOS' ? 'TRAFFIC' : 'DEFAULT',
      title: `[#${i.id}] ${i.incident_type}`,
      description: `${i.description || i.title} · Status: ${i.status}`,
    }));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* ── TOP NAV BAR ── */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-3.5 flex items-center justify-between shadow-md sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-red-600/20 text-red-500 border border-red-500/30 flex items-center justify-center">
            <Radio className="w-5 h-5 animate-pulse text-red-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black text-white tracking-wide">
                Odisha ERSS — 112 Control Room
              </h1>
              <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                ONLINE
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Emergency Controller Desk · State Command Center
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => fetchDashboardData()}
            disabled={refreshing}
            className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors"
            title="Refresh Live Data"
          >
            <RotateCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-red-400' : ''}`} />
          </button>

          <div className="text-right hidden sm:block border-l border-slate-800 pl-4">
            <p className="text-xs font-bold text-white font-mono">
              {user?.username || 'EMERGENCY-CTRL-ODISHA'}
            </p>
            <p className="text-[11px] text-slate-400">Emergency Controller</p>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-950/60 hover:bg-red-900/60 text-red-300 border border-red-800/60 rounded-xl text-xs font-semibold transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* ── INCOMING DEMO CALL BANNER ── */}
      {activeCalls.length > 0 && activeCalls.some((c) => c.status === 'RINGING') && (
        <div className="bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 text-white px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg animate-pulse-once">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white text-red-600 flex items-center justify-center font-bold">
              <PhoneCall className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-wider bg-black/30 px-2 py-0.5 rounded inline-block">
                DEMO CALL SIMULATION ONLY
              </p>
              <p className="text-sm font-bold">
                Incoming Citizen Emergency Call: {activeCalls[0].citizen_name || 'Citizen'} ({activeCalls[0].citizen_phone || 'Live App User'})
              </p>
              <p className="text-xs text-white/90">
                Location: {activeCalls[0].address || `${activeCalls[0].latitude}, ${activeCalls[0].longitude}`} (±{Math.round(activeCalls[0].accuracy || 0)}m)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleAcceptCall(activeCalls[0])}
              className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
            >
              <Phone className="w-3.5 h-3.5" /> Accept Demo Call
            </button>
            <button
              onClick={() => handleEndCall(activeCalls[0].call_id)}
              className="px-3 py-1.5 bg-black/40 hover:bg-black/60 text-white font-semibold text-xs rounded-xl transition-all"
            >
              Decline
            </button>
          </div>
        </div>
      )}

      {/* ── ACTIVE IN-CALL CONSOLE (When call is accepted) ── */}
      {activeCallSession && (
        <div className="bg-slate-900 border-b border-emerald-500/40 px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <PhoneCall className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  Active Demo Call Session · {formatTimer(callDuration)}
                </span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-mono font-bold">
                  SIMULATION
                </span>
              </div>
              <p className="text-sm font-bold text-white mt-0.5">
                Connected to: {activeCallSession.citizen_name} · GPS: {activeCallSession.latitude?.toFixed(4)}, {activeCallSession.longitude?.toFixed(4)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Audio Waveform */}
            <div className="flex items-center gap-1 h-5 mr-3">
              <span className="w-1 bg-emerald-400 rounded-full animate-bounce h-2" />
              <span className="w-1 bg-emerald-400 rounded-full animate-bounce h-5 delay-75" />
              <span className="w-1 bg-emerald-400 rounded-full animate-bounce h-3 delay-150" />
              <span className="w-1 bg-emerald-400 rounded-full animate-bounce h-6 delay-100" />
              <span className="w-1 bg-emerald-400 rounded-full animate-bounce h-4 delay-200" />
            </div>

            <button
              onClick={() => setIsMuted(!isMuted)}
              className={`p-2 rounded-xl text-xs font-semibold ${
                isMuted ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
              title={isMuted ? 'Unmute Mic' : 'Mute Mic'}
            >
              {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            <button
              onClick={() => setIsSpeakerOn(!isSpeakerOn)}
              className={`p-2 rounded-xl text-xs font-semibold ${
                isSpeakerOn ? 'bg-slate-700 text-white' : 'bg-slate-800 text-slate-400'
              }`}
              title={isSpeakerOn ? 'Speaker On' : 'Speaker Off'}
            >
              {isSpeakerOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            <button
              onClick={() => handleEndCall(activeCallSession.call_id)}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-lg shadow-red-600/30 transition-all"
            >
              <PhoneOff className="w-4 h-4" /> End Call
            </button>
          </div>
        </div>
      )}

      {/* ── METRICS SUMMARY CARDS ── */}
      <div className="max-w-7xl mx-auto w-full px-6 py-6 space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>New Requests</span>
              <AlertCircle className="w-4 h-4 text-red-500" />
            </div>
            <p className="text-2xl font-black text-red-500 mt-2 font-mono">{metrics.new}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Awaiting triage</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>Acknowledged</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-2xl font-black text-amber-400 mt-2 font-mono">{metrics.acknowledged}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Controller reviewed</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>Dispatched</span>
              <Truck className="w-4 h-4 text-blue-500" />
            </div>
            <p className="text-2xl font-black text-blue-400 mt-2 font-mono">{metrics.dispatched}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Responders en route</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>Resolved</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-black text-emerald-400 mt-2 font-mono">{metrics.resolved}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Incidents closed</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>Total Emergency Records</span>
              <ShieldAlert className="w-4 h-4 text-slate-400" />
            </div>
            <p className="text-2xl font-black text-white mt-2 font-mono">{metrics.total}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Database total</p>
          </div>
        </div>

        {/* ── MAIN WORKFLOW 2-COLUMN VIEW ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT: Incident Queue */}
          <div className="lg:col-span-7 space-y-4">
            {/* Filter and Search Bar */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
                {['ALL', 'REPORTED', 'ACKNOWLEDGED', 'RESPONDING', 'RESOLVED'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                      statusFilter === status
                        ? 'bg-red-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {status === 'ALL' ? 'All' : status === 'REPORTED' ? 'New' : status}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-56">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search incident, location..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                />
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
              </div>
            </div>

            {/* Incidents List */}
            <div className="space-y-3">
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <div key={i} className="h-24 bg-slate-900 border border-slate-800 rounded-2xl animate-pulse" />
                ))
              ) : filteredIncidents.length > 0 ? (
                filteredIncidents.map((inc) => {
                  const isSelected = selectedIncident?.id === inc.id;
                  return (
                    <div
                      key={inc.id}
                      onClick={() => setSelectedIncident(inc)}
                      className={`bg-slate-900 border rounded-2xl p-4 transition-all cursor-pointer ${
                        isSelected
                          ? 'border-red-500 shadow-lg shadow-red-950/40 bg-slate-900/90'
                          : 'border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                              inc.severity === 'CRITICAL'
                                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                : inc.severity === 'HIGH'
                                ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {inc.severity}
                          </span>
                          <span className="text-xs font-bold text-white uppercase tracking-wide">
                            {inc.incident_type}
                          </span>
                          <span className="text-xs font-mono text-slate-400">#{inc.id}</span>
                        </div>

                        {/* Status badge */}
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            inc.status === 'REPORTED'
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                              : inc.status === 'ACKNOWLEDGED'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : inc.status === 'RESPONDING'
                              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          }`}
                        >
                          {inc.status}
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-slate-100 mt-2">{inc.title}</h4>
                      <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">{inc.description}</p>

                      <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1 text-slate-300">
                            <MapPin className="w-3.5 h-3.5 text-red-400" />
                            <span className="truncate max-w-[200px]">{inc.location_address || 'Live Reported Position'}</span>
                          </span>
                          <span>•</span>
                          <span>{new Date(inc.reported_at).toLocaleTimeString()}</span>
                        </div>

                        {/* Quick Action Buttons */}
                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          {inc.status === 'REPORTED' && (
                            <button
                              onClick={() => handleUpdateStatus(inc.id, 'ACKNOWLEDGED')}
                              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[11px] font-bold transition-colors"
                            >
                              Acknowledge
                            </button>
                          )}
                          {(inc.status === 'REPORTED' || inc.status === 'ACKNOWLEDGED') && (
                            <button
                              onClick={() => openDispatchModal(inc)}
                              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold transition-colors flex items-center gap-1"
                            >
                              <Truck className="w-3 h-3" /> Dispatch
                            </button>
                          )}
                          {inc.status === 'RESPONDING' && (
                            <button
                              onClick={() => handleUpdateStatus(inc.id, 'RESOLVED')}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold transition-colors"
                            >
                              Resolve
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-500 text-sm">
                  🟢 No incidents matching filter. All quiet on the dispatch board.
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Incident Detail & Live Map */}
          <div className="lg:col-span-5 space-y-4">
            {/* Live Interactive Map */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <Compass className="w-4 h-4 text-red-400" />
                  <span>Real-Time Citizen GPS Map</span>
                </h3>
                {selectedIncident?.location_lat && (
                  <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                    {selectedIncident.location_lat.toFixed(4)}, {selectedIncident.location_lng?.toFixed(4)}
                  </span>
                )}
              </div>
              <div className="h-64 relative z-0">
                <CityMap
                  center={
                    selectedIncident?.location_lat
                      ? [selectedIncident.location_lat, selectedIncident.location_lng]
                      : [20.2961, 85.8245]
                  }
                  zoom={selectedIncident?.location_lat ? 14 : 12}
                  markers={markers}
                  height="256px"
                />
              </div>
            </div>

            {/* Selected Incident Details Box */}
            {selectedIncident ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-red-400 uppercase">
                      Incident #{selectedIncident.id}
                    </span>
                    <h3 className="text-base font-bold text-white">{selectedIncident.title}</h3>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-800 text-white">
                    {selectedIncident.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
                    <p className="text-slate-400 text-[10px] uppercase font-semibold">Citizen Reported</p>
                    <p className="font-bold text-white mt-0.5">{selectedIncident.reported_by_name || 'Anonymous'}</p>
                    <p className="text-slate-400 text-[11px] font-mono">{selectedIncident.reported_by_phone || 'App Dispatched'}</p>
                  </div>
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
                    <p className="text-slate-400 text-[10px] uppercase font-semibold">Reported At</p>
                    <p className="font-bold text-white mt-0.5">{new Date(selectedIncident.reported_at).toLocaleDateString()}</p>
                    <p className="text-slate-400 text-[11px]">{new Date(selectedIncident.reported_at).toLocaleTimeString()}</p>
                  </div>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 text-xs">
                  <p className="text-slate-400 text-[10px] uppercase font-semibold mb-1">Reported Coordinates</p>
                  <p className="text-slate-200">{selectedIncident.location_address || 'Odisha, India'}</p>
                  {selectedIncident.location_lat && (
                    <p className="text-emerald-400 font-mono mt-1 text-[11px]">
                      Latitude: {selectedIncident.location_lat} · Longitude: {selectedIncident.location_lng}
                    </p>
                  )}
                </div>

                {/* Assigned Responder Unit Info */}
                {selectedIncident.assigned_responder && (
                  <div className="bg-blue-950/40 border border-blue-800/50 p-3 rounded-xl text-xs">
                    <div className="flex items-center justify-between text-blue-300 font-bold mb-1">
                      <span className="flex items-center gap-1.5">
                        <Truck className="w-3.5 h-3.5" /> Assigned Unit
                      </span>
                      <span className="text-[10px] bg-blue-500/20 px-2 py-0.5 rounded font-mono">
                        {selectedIncident.assigned_responder.unit_code}
                      </span>
                    </div>
                    <p className="text-slate-300">
                      Type: {selectedIncident.assigned_responder.responder_type} · Contact: {selectedIncident.assigned_responder.contact_phone || '112'}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-500 text-xs">
                Select an incident from the queue to view full coordinates & responder dispatch status.
              </div>
            )}

            {/* Responder Fleet Status */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center justify-between">
                <span>Emergency Responder Fleet</span>
                <span className="text-[10px] font-mono text-slate-400">({responders.length} units registered)</span>
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {responders.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between p-2.5 bg-slate-950 rounded-xl border border-slate-800 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300 font-bold">
                        {r.responder_type === 'AMBULANCE' ? '🚑' : r.responder_type === 'FIRE' ? '🚒' : '🚓'}
                      </div>
                      <div>
                        <p className="font-bold text-white font-mono">{r.unit_code}</p>
                        <p className="text-[10px] text-slate-400">{r.responder_type}</p>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        r.status === 'AVAILABLE'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {r.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── RESPONDER DISPATCH MODAL ── */}
      {dispatchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 text-white w-full max-w-md rounded-3xl p-6 border border-slate-800 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Truck className="w-4 h-4 text-blue-400" />
                <span>Dispatch Response Unit</span>
              </h3>
              <button
                onClick={() => setDispatchModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDispatchResponder} className="mt-4 space-y-4">
              <div className="text-xs bg-slate-950 p-3 rounded-xl border border-slate-800">
                <p className="text-slate-400">Incident Target:</p>
                <p className="font-bold text-white mt-0.5">#{targetIncident?.id} · {targetIncident?.title}</p>
                <p className="text-[11px] text-slate-400 truncate">{targetIncident?.location_address}</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Select Available Unit
                </label>
                <select
                  value={selectedResponderId}
                  onChange={(e) => setSelectedResponderId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                  required
                >
                  <option value="">-- Choose Emergency Unit --</option>
                  {responders
                    .filter((r) => r.status === 'AVAILABLE')
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.unit_code} ({r.responder_type})
                      </option>
                    ))}
                </select>
                {responders.filter((r) => r.status === 'AVAILABLE').length === 0 && (
                  <p className="text-[11px] text-amber-400 mt-1">
                    No units currently marked AVAILABLE.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Dispatch Instructions / Notes
                </label>
                <textarea
                  rows={2}
                  value={dispatchNotes}
                  onChange={(e) => setDispatchNotes(e.target.value)}
                  placeholder="e.g. Code 3 priority, hazardous situation reported..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDispatchModalOpen(false)}
                  className="w-1/2 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={dispatchLoading || !selectedResponderId}
                  className="w-1/2 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-blue-600/30 disabled:opacity-50"
                >
                  {dispatchLoading ? 'Dispatching...' : 'Confirm Dispatch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
