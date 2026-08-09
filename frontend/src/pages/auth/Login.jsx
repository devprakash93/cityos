import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { ShieldAlert } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  // If already logged in, redirect
  useEffect(() => {
    if (user) {
      const role = user.role?.name;
      if (role === 'CITIZEN') navigate('/citizen/dashboard');
      else if (role === 'OFFICER') navigate('/officer/dashboard');
      else if (role === 'FIELD_WORKER') navigate('/worker/dashboard');
      else if (role === 'SUPER_ADMIN') navigate('/admin/dashboard');
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const res = await login(email, password);
    if (!res.success) {
      setError(res.message);
    }
    setLoading(false);
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded-md flex items-start gap-2 text-sm border border-red-200">
          <ShieldAlert className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div>
        <Input
          label="Email address"
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="admin@odisha.gov"
        />
      </div>

      <div>
        <Input
          label="Password"
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      <div>
        <Button type="submit" className="w-full" isLoading={loading}>
          Sign in
        </Button>
      </div>

      <div className="mt-8 pt-6 border-t border-slate-100">
        <p className="text-xs font-semibold text-slate-900 mb-3 uppercase tracking-wider">Demo Accounts</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-600">
          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
            <span className="font-semibold text-slate-900 block mb-1">Admin</span>
            admin@cityos.gov<br/>Admin@1234
          </div>
          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
            <span className="font-semibold text-slate-900 block mb-1">Officer</span>
            officer@cityos.gov<br/>Officer@1234
          </div>
          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
            <span className="font-semibold text-slate-900 block mb-1">Worker</span>
            worker@cityos.gov<br/>Worker@1234
          </div>
          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
            <span className="font-semibold text-slate-900 block mb-1">Citizen</span>
            citizen@cityos.gov<br/>Citizen@1234
          </div>
        </div>
      </div>
    </form>
  );
}
