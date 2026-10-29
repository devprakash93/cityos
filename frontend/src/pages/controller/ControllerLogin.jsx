import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import {
  ShieldAlert,
  Radio,
  Lock,
  User,
  AlertCircle,
  RotateCw,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  PhoneCall,
} from 'lucide-react';

export default function ControllerLogin() {
  const navigate = useNavigate();
  const { fetchProfile } = useAuth();
  const [controllerId, setControllerId] = useState('EMERGENCY-CTRL-ODISHA');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!controllerId.trim() || !password) {
      setError('Please provide both Controller ID and password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.post('/auth/controller-login/', {
        controller_id: controllerId.trim(),
        password,
      });

      if (res.data.success) {
        if (res.data.tokens?.access) {
          localStorage.setItem('access_token', res.data.tokens.access);
        }
        await fetchProfile();
        navigate('/controller/dashboard', { replace: true });
      } else {
        setError(res.data.error || 'Authentication failed.');
      }
    } catch (err) {
      setError(
        err.response?.data?.error ||
        err.response?.data?.detail ||
        'Authentication failed. Please verify Controller ID and Password.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-red-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-white relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center mb-3">
          <div className="w-16 h-16 rounded-3xl bg-red-600/20 text-red-500 border border-red-500/30 flex items-center justify-center shadow-xl shadow-red-950/50">
            <Radio className="w-8 h-8 animate-pulse text-red-400" />
          </div>
        </div>
        <h2 className="text-center text-2xl font-black tracking-tight text-white">
          Odisha ERSS — 112
        </h2>
        <p className="text-center text-xs font-semibold uppercase tracking-widest text-red-400 mt-1">
          Emergency Controller Access Desk
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <div className="bg-slate-900/80 backdrop-blur-xl py-8 px-6 shadow-2xl rounded-3xl border border-slate-800 sm:px-10">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {/* Demo Credentials Info Box */}
            <div className="bg-slate-950/60 border border-red-900/50 rounded-2xl p-3 text-xs text-slate-300">
              <div className="flex items-center gap-2 text-red-400 font-bold mb-1">
                <ShieldCheck className="w-4 h-4 text-red-400" />
                <span>Predefined Built-in Role</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Default Demo ID: <code className="bg-slate-800 text-amber-300 px-1.5 py-0.5 rounded font-mono font-bold">EMERGENCY-CTRL-ODISHA</code>
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-950/80 border border-red-700 text-red-200 rounded-xl text-xs flex items-center gap-2 animate-fade-in">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Emergency Controller ID
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={controllerId}
                  onChange={(e) => setControllerId(e.target.value)}
                  placeholder="e.g. EMERGENCY-CTRL-ODISHA"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 font-mono"
                  required
                />
                <User className="w-4 h-4 text-slate-500 absolute right-3.5 top-3.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Controller Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter controller password"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 active:scale-95 text-white font-black text-sm rounded-xl shadow-lg shadow-red-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin" />
                  <span>Authenticating Dispatch Desk...</span>
                </>
              ) : (
                <>
                  <span>Access Controller Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-800 text-center">
            <Link
              to="/login"
              className="text-xs text-slate-400 hover:text-white transition-colors inline-flex items-center gap-1"
            >
              ← Back to Main CityOS Login (Citizen / Officer / Admin)
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
