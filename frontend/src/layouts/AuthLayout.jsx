import { Outlet } from 'react-router-dom';
import { Command, MapPin, Zap, Shield, Activity } from 'lucide-react';

export default function AuthLayout() {
  return (
    <div className="flex min-h-screen bg-white">
      {/* Left Pane - Visual Branding (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-slate-900 overflow-hidden flex-col justify-between p-12">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-30 mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-green-600/40 via-slate-900/90 to-slate-900 z-0"></div>
        
        {/* Top Logo */}
        <div className="relative z-10 flex items-center gap-2 text-white">
          <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/20">
            <Command className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight">Odisha CityOS</span>
        </div>

        {/* Center Hero Text */}
        <div className="relative z-10 max-w-md mt-12">
          <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight tracking-tight mb-6">
            The digital <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-300">nervous system</span> of our smart cities.
          </h1>
          <p className="text-slate-300 text-lg leading-relaxed">
            Unifying urban infrastructure, public services, and citizen engagement into a single, intelligent command center.
          </p>
        </div>

        {/* Bottom Feature Grid */}
        <div className="relative z-10 grid grid-cols-2 gap-6 mt-12">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-md">
              <Activity className="w-5 h-5 text-green-400" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-white">Live Monitoring</span>
              <span className="text-xs text-slate-400">IoT & Sensor Feeds</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-md">
              <Zap className="w-5 h-5 text-yellow-400" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-white">Rapid Response</span>
              <span className="text-xs text-slate-400">Automated SLAs</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-md">
              <MapPin className="w-5 h-5 text-blue-400" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-white">Spatial Intelligence</span>
              <span className="text-xs text-slate-400">GIS Integration</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-md">
              <Shield className="w-5 h-5 text-indigo-400" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-white">Secure Access</span>
              <span className="text-xs text-slate-400">Role-based Auth</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Pane - Login Form */}
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-20 xl:px-24 bg-white relative">
        
        {/* Mobile Header (Only visible on small screens) */}
        <div className="absolute top-8 left-6 lg:hidden flex items-center gap-2">
          <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center shadow-lg shadow-green-500/20">
            <Command className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold text-slate-900 tracking-tight">Odisha CityOS</span>
        </div>

        <div className="mx-auto w-full max-w-sm mt-12 lg:mt-0">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">
              Welcome back
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Please enter your credentials to access the command center.
            </p>
          </div>

          <div className="mt-8">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
