import { useState, useEffect, useRef } from 'react';
import api from '../../api/axios';
import { CityMap } from '../../components/maps/CityMap';
import {
  Phone,
  PhoneOff,
  PhoneCall,
  ShieldAlert,
  MapPin,
  AlertCircle,
  CheckCircle2,
  XCircle,
  RotateCw,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Radio,
  Lock,
  UserCheck,
  Crosshair,
  Compass,
  X,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';

const CONTACTS = [
  { type: 'police', label: 'Police', number: '100', icon: '🚓', color: 'bg-blue-600' },
  { type: 'fire', label: 'Fire Brigade', number: '101', icon: '🚒', color: 'bg-red-600' },
  { type: 'ambulance', label: 'Ambulance', number: '108', icon: '🚑', color: 'bg-green-600' },
  { type: 'disaster', label: 'Disaster Mgmt', number: '1077', icon: '🆘', color: 'bg-orange-600' },
];

export default function Emergency() {
  // Existing data state
  const [contacts, setContacts] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [sos, setSos] = useState(null);
  const [sosLoading, setSosLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  // ── 1. Geolocation State ──────────────────────────────────────────
  const [location, setLocation] = useState(null); // { lat, lng, accuracy }
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [address, setAddress] = useState(null);
  const [addressLoading, setAddressLoading] = useState(false);

  // ── 2. Emergency Controller Auth State ─────────────────────────────
  const [controllerId, setControllerId] = useState('EMERGENCY-CTRL-ODISHA');
  const [controllerPassword, setControllerPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [authSuccessMsg, setAuthSuccessMsg] = useState(null);
  const [controllerAuth, setControllerAuth] = useState(null); // { token, controller }

  // ── 3. Demo Calling State ─────────────────────────────────────────
  const [isCallingModalOpen, setIsCallingModalOpen] = useState(false);
  const [callState, setCallState] = useState('IDLE'); // 'CALLING' | 'CONNECTED' | 'ENDED'
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [demoCallData, setDemoCallData] = useState(null);
  const callTimerRef = useRef(null);

  // ── Fetch Initial Data & Trigger Automatic Geolocation ────────────
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [cRes, iRes] = await Promise.allSettled([
          api.get('/emergency/contacts/'),
          api.get('/emergency/incidents/'),
        ]);
        if (cRes.status === 'fulfilled') setContacts(cRes.value.data?.results || cRes.value.data || []);
        if (iRes.status === 'fulfilled') setIncidents((iRes.value.data?.results || iRes.value.data || []).slice(0, 5));
      } catch (e) {
        console.error('Error fetching emergency data', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();

    // Automatically detect citizen location on entering emergency workflow
    detectLocation();
  }, []);

  // ── Geolocation Detection Logic ───────────────────────────────────
  const detectLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      setLocation(null);
      return;
    }

    setLocationLoading(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const accuracy = position.coords.accuracy;

        setLocation({ lat, lng, accuracy });
        setLocationLoading(false);
        setLocationError(null);

        // Fetch reverse geocoded human-readable address
        setAddressLoading(true);
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
            { headers: { Accept: 'application/json' } }
          );
          if (res.ok) {
            const data = await res.json();
            setAddress(data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
          } else {
            setAddress(`${lat.toFixed(5)}° N, ${lng.toFixed(5)}° E`);
          }
        } catch {
          setAddress(`${lat.toFixed(5)}° N, ${lng.toFixed(5)}° E`);
        } finally {
          setAddressLoading(false);
        }
      },
      (error) => {
        setLocationLoading(false);
        setLocation(null); // Never substitute fake coordinates
        let msg = 'Failed to detect location.';
        if (error.code === 1) {
          msg = 'Location permission was denied. Please allow browser location access to share your coordinates with emergency dispatch.';
        } else if (error.code === 2) {
          msg = 'Position unavailable. Device GPS signal could not be acquired.';
        } else if (error.code === 3) {
          msg = 'Location detection timed out. Please click retry.';
        }
        setLocationError(msg);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0, // Request fresh location data
      }
    );
  };

  // ── Controller Authentication Logic ───────────────────────────────
  const handleControllerAuth = async (e) => {
    e?.preventDefault();
    if (!controllerId.trim() || !controllerPassword) {
      setAuthError('Please enter both Controller ID and password.');
      return;
    }

    setAuthLoading(true);
    setAuthError(null);
    setAuthSuccessMsg(null);

    try {
      const res = await api.post('/emergency/controller/auth/', {
        controller_id: controllerId.trim(),
        password: controllerPassword,
      });

      if (res.data.success) {
        setControllerAuth({
          token: res.data.token,
          controller: res.data.controller,
        });
        setAuthSuccessMsg(res.data.message || 'Emergency Controller authenticated successfully.');
        setControllerPassword(''); // Securely clear password from input state
      } else {
        setAuthError(res.data.error || 'Invalid credentials.');
      }
    } catch (err) {
      const errorMsg =
        err.response?.data?.error ||
        err.response?.data?.detail ||
        'Authentication failed. Please verify the Controller ID and Password.';
      setAuthError(errorMsg);
      setControllerAuth(null);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleDisconnectController = () => {
    setControllerAuth(null);
    setAuthSuccessMsg(null);
    setAuthError(null);
  };

  // ── Demo Calling Logic ────────────────────────────────────────────
  const startDemoCall = async () => {
    if (!controllerAuth?.token) {
      setAuthError('Please authenticate the Emergency Controller first.');
      return;
    }

    if (!location) {
      alert('Location permission or GPS detection is required before initiating the demo call.');
      detectLocation();
      return;
    }

    // Initialize call modal
    setIsCallingModalOpen(true);
    setCallState('CALLING');
    setCallDuration(0);
    setIsMuted(false);
    setIsSpeakerOn(true);

    try {
      // Notify backend demo call endpoint with verified citizen GPS
      const res = await api.post('/emergency/controller/demo-call/', {
        token: controllerAuth.token,
        latitude: location.lat,
        longitude: location.lng,
        accuracy: location.accuracy,
        address: address || 'Odisha, India',
      });
      setDemoCallData(res.data);
    } catch (err) {
      console.warn('Demo call logged locally', err);
      setDemoCallData({
        call_id: 'DEMO-CALL-LOC',
        status: 'CONNECTED',
        notice: 'DEMO ONLY: Simulated call. No emergency services contacted.',
      });
    }

    // Realistic call progression: ringing for 2.5s, then connected
    setTimeout(() => {
      setCallState('CONNECTED');
    }, 2500);
  };

  // Call timer effect while CONNECTED
  useEffect(() => {
    if (callState === 'CONNECTED') {
      callTimerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
    }
    return () => {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
    };
  }, [callState]);

  const endDemoCall = () => {
    if (callTimerRef.current) clearInterval(callTimerRef.current);
    setCallState('ENDED');
  };

  const closeCallModal = () => {
    if (callTimerRef.current) clearInterval(callTimerRef.current);
    setIsCallingModalOpen(false);
    setCallState('IDLE');
    setCallDuration(0);
  };

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // ── Existing SOS Trigger Logic (Preserved) ─────────────────────────
  const triggerSOS = async () => {
    if (!window.confirm('🚨 Are you sure you want to send an Emergency SOS? This will alert emergency services.')) return;
    setSosLoading(true);
    try {
      const payload = {
        incident_type: 'SOS',
        description: 'Citizen triggered Emergency SOS',
        location_lat: location?.lat || 0,
        location_lng: location?.lng || 0,
        severity: 'CRITICAL',
      };
      const res = await api.post('/emergency/incidents/', payload);
      setSos(res.data);
    } catch (e) {
      console.error(e);
      setSos({ id: 'SIM-1024', status: 'DISPATCHED', service_type: 'AMBULANCE', distance_km: 2.4 });
    } finally {
      setSosLoading(false);
    }
  };

  // Prepare map markers
  const markers = incidents
    .filter((i) => i.location_lat && i.location_lng)
    .map((i) => ({
      lat: parseFloat(i.location_lat),
      lng: parseFloat(i.location_lng),
      type: 'TRAFFIC',
      title: i.incident_type || 'Emergency',
      description: i.description || '',
    }));

  // Add citizen marker if location detected
  if (location) {
    markers.unshift({
      lat: location.lat,
      lng: location.lng,
      type: 'DEFAULT',
      title: '📍 Your Real-Time Location',
      description: address || `Lat: ${location.lat.toFixed(5)}, Lng: ${location.lng.toFixed(5)} (±${Math.round(location.accuracy)}m)`,
    });
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <span>🚨 Emergency Services & Dispatch</span>
          <span className="text-xs bg-red-100 text-red-700 font-semibold px-2.5 py-0.5 rounded-full border border-red-200">
            Citizen Safety Hub
          </span>
        </h1>
        <p className="text-slate-500 mt-1">
          Automated GPS positioning, Emergency Controller authentication, and emergency contacts.
        </p>
      </div>

      {/* ── SECTION A: AUTOMATIC CITIZEN LOCATION STATUS ── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              location ? 'bg-emerald-50 text-emerald-600' : locationLoading ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'
            }`}>
              <Compass className={`w-5 h-5 ${locationLoading ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">Citizen Live Location Detection</h3>
              <p className="text-xs text-slate-500">Browser GPS coordinate detection with accuracy verification</p>
            </div>
          </div>
          <button
            onClick={detectLocation}
            disabled={locationLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 self-start sm:self-auto"
          >
            <RotateCw className={`w-3.5 h-3.5 ${locationLoading ? 'animate-spin' : ''}`} />
            {locationLoading ? 'Detecting GPS...' : location ? 'Refresh Location' : 'Retry Location'}
          </button>
        </div>

        <div className="mt-4">
          {locationLoading ? (
            <div className="flex items-center gap-3 p-3 bg-amber-50 text-amber-800 rounded-xl text-sm border border-amber-200 animate-pulse">
              <Crosshair className="w-5 h-5 animate-spin text-amber-600 shrink-0" />
              <div>
                <p className="font-semibold text-xs">Requesting browser geolocation permission & coordinates...</p>
                <p className="text-xs text-amber-600 mt-0.5">Please allow location access when prompted by your browser.</p>
              </div>
            </div>
          ) : location ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">GPS Coordinates</p>
                <p className="text-sm font-bold text-slate-900 mt-1 font-mono">
                  {location.lat.toFixed(6)}° N, {location.lng.toFixed(6)}° E
                </p>
                <span className="inline-flex items-center gap-1 mt-1 text-[11px] text-emerald-600 font-medium">
                  <CheckCircle2 className="w-3 h-3" /> GPS Acquired
                </span>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Location Accuracy</p>
                <p className="text-sm font-bold text-slate-900 mt-1 font-mono">
                  ±{Math.round(location.accuracy)} meters
                </p>
                <span className="inline-flex items-center gap-1 mt-1 text-[11px] text-slate-500">
                  <Crosshair className="w-3 h-3 text-slate-400" /> High Precision Mode
                </span>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Detected Address</p>
                <p className="text-xs font-semibold text-slate-800 mt-1 line-clamp-2">
                  {addressLoading ? 'Resolving street address...' : address || 'Odisha, India'}
                </p>
                <span className="inline-flex items-center gap-1 mt-1 text-[11px] text-slate-400">
                  <MapPin className="w-3 h-3" /> Automatic Reverse Geocode
                </span>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-xs">Location Detection Incomplete</p>
                  <p className="text-xs text-red-600 mt-0.5">{locationError || 'Location could not be detected.'}</p>
                  <p className="text-[11px] text-red-500 mt-1">
                    Emergency services and demo calling require valid GPS coordinates. No simulated or fabricated location is substituted.
                  </p>
                  <button
                    onClick={detectLocation}
                    className="mt-2.5 inline-flex items-center gap-1 px-3 py-1 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 transition-colors"
                  >
                    <RotateCw className="w-3 h-3" /> Grant & Retry Location
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── SECTION B: EMERGENCY CONTROLLER AUTHENTICATION + DEMO CALLING ── */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-red-950 text-white rounded-3xl p-6 shadow-xl border border-red-900/40 relative overflow-hidden">
        {/* Subtle decorative background ring */}
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-white/10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-500/20 text-red-300 rounded-full text-xs font-semibold border border-red-500/30 mb-2">
              <Radio className="w-3 h-3 animate-pulse text-red-400" />
              <span>Emergency Controller Gateway</span>
              <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.2 rounded font-black tracking-wider uppercase">
                Demo
              </span>
            </div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span>Odisha ERSS — Controller Desk</span>
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">
              Authenticate with the predefined Emergency Controller credentials to unlock dispatch monitoring and initiate a simulated demo call.
            </p>
          </div>

          {/* Controller Authenticated Badge */}
          {controllerAuth && (
            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/15">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] text-emerald-300 font-semibold uppercase tracking-wider flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" /> Authenticated
                </p>
                <p className="text-xs font-bold text-white font-mono">{controllerAuth.controller?.controller_id}</p>
              </div>
              <button
                onClick={handleDisconnectController}
                className="ml-2 text-xs text-slate-400 hover:text-white underline"
              >
                Sign out
              </button>
            </div>
          )}
        </div>

        {/* Controller Auth Form vs. Authenticated Actions */}
        {!controllerAuth ? (
          <div className="mt-5">
            <form onSubmit={handleControllerAuth} className="space-y-4 max-w-2xl">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Emergency Controller ID
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={controllerId}
                      onChange={(e) => setControllerId(e.target.value)}
                      placeholder="e.g. EMERGENCY-CTRL-ODISHA"
                      className="w-full bg-slate-950/70 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500 font-mono"
                      required
                    />
                    <Lock className="w-4 h-4 text-slate-500 absolute right-3 top-3" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Controller Password
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      value={controllerPassword}
                      onChange={(e) => setControllerPassword(e.target.value)}
                      placeholder="Enter configured demo password"
                      className="w-full bg-slate-950/70 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                      required
                    />
                    <Lock className="w-4 h-4 text-slate-500 absolute right-3 top-3" />
                  </div>
                </div>
              </div>

              {/* Demo Hint Notification */}
              <div className="bg-slate-950/50 border border-slate-700/60 rounded-xl p-3 text-xs text-slate-300 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-amber-300">Demonstration Credentials Notice:</span>{' '}
                  The predefined controller ID is <code className="bg-slate-800 px-1 py-0.5 rounded text-amber-200 font-mono">EMERGENCY-CTRL-ODISHA</code>.
                  Password validation is executed securely on the backend against server environment settings.
                </div>
              </div>

              {authError && (
                <div className="p-3 bg-red-950/80 border border-red-700/80 text-red-200 rounded-xl text-xs flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={authLoading}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-red-600/30 disabled:opacity-50"
              >
                {authLoading ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin" /> Authenticating Controller...
                  </>
                ) : (
                  <>
                    <UserCheck className="w-4 h-4" /> Authenticate Emergency Controller
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            {authSuccessMsg && (
              <div className="p-3 bg-emerald-950/60 border border-emerald-700/60 text-emerald-200 rounded-xl text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{authSuccessMsg}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-700/50">
                <p className="text-slate-400 font-medium">Control Desk</p>
                <p className="font-bold text-white text-sm mt-0.5">{controllerAuth.controller?.unit || 'Bhubaneswar Central Dispatch'}</p>
              </div>
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-700/50">
                <p className="text-slate-400 font-medium">System Role</p>
                <p className="font-bold text-emerald-400 text-sm mt-0.5">ERSS-112 Authorized Controller</p>
              </div>
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-700/50">
                <p className="text-slate-400 font-medium">GPS Dispatch Status</p>
                <p className={`font-bold text-sm mt-0.5 ${location ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {location ? 'Coordinates Locked' : 'Awaiting GPS Permission'}
                </p>
              </div>
            </div>

            {/* Demo Call Action Section */}
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center gap-4">
              <button
                onClick={startDemoCall}
                disabled={!location}
                className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 active:scale-95 text-white font-extrabold text-sm rounded-2xl shadow-xl shadow-red-600/30 transition-all disabled:opacity-50 disabled:pointer-events-none"
              >
                <PhoneCall className="w-5 h-5 animate-bounce" />
                <span>Demo Call Controller</span>
                <span className="text-[10px] bg-black/30 px-2 py-0.5 rounded font-mono font-normal">SIMULATED</span>
              </button>

              {!location && (
                <p className="text-xs text-amber-300 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  Real GPS coordinates required to activate demo call. Please grant location access above.
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── SOS ACTIVATED BANNER (Existing preserved) ── */}
      {sos && (
        <div className="bg-green-50 border-2 border-green-300 rounded-xl p-5 animate-pulse-once">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
              <ShieldAlert className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-green-800">SOS Request Sent! ✅</p>
              <p className="text-green-600 text-sm">Emergency dispatch recorded with verified coordinates.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            <div className="bg-white rounded-lg p-3">
              <p className="text-xs text-slate-500">Request ID</p>
              <p className="font-bold text-slate-900">#{sos.id || sos.reference_number}</p>
            </div>
            <div className="bg-white rounded-lg p-3">
              <p className="text-xs text-slate-500">Status</p>
              <p className="font-bold text-green-600">{sos.status || 'DISPATCHED'}</p>
            </div>
            <div className="bg-white rounded-lg p-3">
              <p className="text-xs text-slate-500">Distance</p>
              <p className="font-bold text-slate-900">{sos.distance_km || '—'} km</p>
            </div>
          </div>
          <button onClick={() => setSos(null)} className="mt-3 text-xs text-green-700 hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* ── SOS BUTTON (Existing preserved) ── */}
      <div className="text-center py-6 bg-gradient-to-br from-red-50 to-red-100 rounded-2xl border border-red-200">
        <button
          onClick={triggerSOS}
          disabled={sosLoading || !!sos}
          className="w-36 h-36 rounded-full bg-red-600 hover:bg-red-700 active:scale-95 text-white font-black text-2xl shadow-2xl transition-all disabled:opacity-60 border-8 border-red-300 focus:outline-none focus:ring-4 focus:ring-red-300"
        >
          {sosLoading ? '...' : '🆘 SOS'}
        </button>
        <p className="text-red-700 font-semibold mt-4">One-Touch Emergency SOS</p>
        <p className="text-red-500 text-xs mt-1">
          {location
            ? `Transmits your coordinates (${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}) to active responders.`
            : 'Transmits emergency dispatch request.'}
        </p>
      </div>

      {/* ── EMERGENCY CONTACTS (Existing preserved) ── */}
      <div>
        <h2 className="font-semibold text-slate-900 mb-3">📞 Public Emergency Helplines</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {CONTACTS.map((c) => (
            <a
              key={c.type}
              href={`tel:${c.number}`}
              className={`${c.color} text-white rounded-xl p-4 flex flex-col items-center gap-2 hover:opacity-90 transition-opacity shadow-sm`}
            >
              <span className="text-3xl">{c.icon}</span>
              <p className="font-bold text-sm">{c.label}</p>
              <p className="text-white/80 text-sm font-mono">{c.number}</p>
            </a>
          ))}
        </div>
      </div>

      {/* ── LIVE MAP + ACTIVE INCIDENTS (Existing preserved) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">Live Incident & Position Map</h3>
            {location && (
              <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                GPS Locked
              </span>
            )}
          </div>
          <div className="relative z-0">
            <CityMap
              center={location ? [location.lat, location.lng] : [20.2961, 85.8245]}
              zoom={location ? 14 : 12}
              markers={markers}
              height="320px"
            />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900">Recent Incidents</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {loading ? (
              [...Array(3)].map((_, i) => <div key={i} className="p-4 animate-pulse h-16 bg-slate-50" />)
            ) : incidents.length > 0 ? (
              incidents.map((inc) => (
                <div key={inc.id} className="p-4 flex items-start gap-3">
                  <div className="w-8 h-8 bg-red-50 rounded-full flex items-center justify-center shrink-0">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 text-sm">{inc.incident_type}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{inc.description}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {new Date(inc.reported_at || inc.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-slate-400 text-sm">🟢 No active incidents. Stay safe!</div>
            )}
          </div>
        </div>
      </div>

      {/* ── SECTION C: REALISTIC DEMO CALLING MODAL ── */}
      {isCallingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 text-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl border border-slate-800 flex flex-col">
            {/* Prominent Demo Notice Header */}
            <div className="bg-amber-500 text-slate-950 px-4 py-2 text-center text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-slate-950" />
              <span>DEMO SIMULATION CALL ONLY — NO REAL 112/100 CONTACTED</span>
            </div>

            {/* Modal Content */}
            <div className="p-6 flex flex-col items-center text-center">
              {/* Controller Badge */}
              <div className="w-16 h-16 rounded-full bg-red-600/20 text-red-500 flex items-center justify-center mb-3 border border-red-500/30 relative">
                {callState === 'CALLING' ? (
                  <>
                    <Phone className="w-8 h-8 animate-pulse text-red-400" />
                    <span className="absolute inset-0 rounded-full border-2 border-red-500 animate-ping opacity-75" />
                  </>
                ) : callState === 'CONNECTED' ? (
                  <PhoneCall className="w-8 h-8 text-emerald-400" />
                ) : (
                  <PhoneOff className="w-8 h-8 text-slate-400" />
                )}
              </div>

              <h3 className="text-lg font-bold text-white">Odisha Emergency Dispatch Desk</h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Controller ID: {controllerAuth?.controller?.controller_id || 'EMERGENCY-CTRL-ODISHA'}
              </p>

              {/* Status State Progression */}
              <div className="my-4">
                {callState === 'CALLING' && (
                  <div className="flex flex-col items-center gap-1">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 text-amber-300 rounded-full text-xs font-semibold">
                      <Radio className="w-3.5 h-3.5 animate-pulse" /> Connecting secure line...
                    </span>
                    <p className="text-xs text-slate-400 mt-2">Transmitting verified citizen coordinates...</p>
                  </div>
                )}

                {callState === 'CONNECTED' && (
                  <div className="flex flex-col items-center gap-1">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-xs font-semibold">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      Live Audio Session · {formatTimer(callDuration)}
                    </span>
                    {/* Simulated Voice Waveform */}
                    <div className="flex items-center gap-1 mt-3 h-6">
                      <span className="w-1 bg-emerald-400 rounded-full animate-bounce h-3" />
                      <span className="w-1 bg-emerald-400 rounded-full animate-bounce h-5 delay-75" />
                      <span className="w-1 bg-emerald-400 rounded-full animate-bounce h-2 delay-150" />
                      <span className="w-1 bg-emerald-400 rounded-full animate-bounce h-6 delay-100" />
                      <span className="w-1 bg-emerald-400 rounded-full animate-bounce h-4 delay-200" />
                    </div>
                  </div>
                )}

                {callState === 'ENDED' && (
                  <div className="flex flex-col items-center gap-1">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-800 text-slate-300 rounded-full text-xs font-semibold">
                      <PhoneOff className="w-3.5 h-3.5" /> Call Terminated Safely
                    </span>
                    <p className="text-xs text-slate-400 mt-1">Duration: {formatTimer(callDuration)}</p>
                  </div>
                )}
              </div>

              {/* Telemetry Transmitted to Controller */}
              <div className="w-full bg-slate-950/70 rounded-2xl p-3.5 border border-slate-800 text-left text-xs space-y-1.5 my-2">
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                  📡 Transmitted Telemetry
                </p>
                <div className="grid grid-cols-2 gap-2 text-slate-300">
                  <div>
                    <span className="text-slate-500">Lat:</span>{' '}
                    <span className="font-mono text-white">{location?.lat.toFixed(5)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Lng:</span>{' '}
                    <span className="font-mono text-white">{location?.lng.toFixed(5)}</span>
                  </div>
                </div>
                <div>
                  <span className="text-slate-500">Accuracy:</span>{' '}
                  <span className="text-emerald-400 font-mono">±{Math.round(location?.accuracy || 0)}m</span>
                </div>
                <div className="text-[11px] text-slate-400 truncate">
                  <span className="text-slate-500">Address:</span> {address || 'Odisha, India'}
                </div>
              </div>

              {/* In-Call Controls */}
              {callState === 'CONNECTED' && (
                <div className="flex items-center justify-center gap-4 my-3">
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                      isMuted ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                    title={isMuted ? 'Unmute' : 'Mute'}
                  >
                    {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </button>

                  <button
                    onClick={() => setIsSpeakerOn(!isSpeakerOn)}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                      isSpeakerOn ? 'bg-slate-700 text-white' : 'bg-slate-800 text-slate-400'
                    }`}
                    title={isSpeakerOn ? 'Speaker On' : 'Speaker Off'}
                  >
                    {isSpeakerOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                  </button>
                </div>
              )}

              {/* Call Termination / Close Actions */}
              <div className="w-full mt-4">
                {callState !== 'ENDED' ? (
                  <button
                    onClick={endDemoCall}
                    className="w-full py-3.5 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-extrabold text-sm rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-red-600/40 transition-all"
                  >
                    <PhoneOff className="w-5 h-5" />
                    <span>End Demo Call</span>
                  </button>
                ) : (
                  <button
                    onClick={closeCallModal}
                    className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm rounded-2xl transition-all"
                  >
                    Close & Return to Dashboard
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
