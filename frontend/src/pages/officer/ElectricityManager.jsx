import { useState } from 'react';
import GenericServicePage from '../admin/GenericServicePage';
import { Zap, Info, Wrench, AlertCircle } from 'lucide-react';

export default function ElectricityManager() {
  const [activeTab, setActiveTab] = useState('OUTAGES');

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex space-x-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('OUTAGES')}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors ${
            activeTab === 'OUTAGES'
              ? 'border-yellow-500 text-yellow-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Power Outages
        </button>
        <button
          onClick={() => setActiveTab('NOTICES')}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors ${
            activeTab === 'NOTICES'
              ? 'border-yellow-500 text-yellow-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Notices & Maintenance
        </button>
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        {activeTab === 'OUTAGES' ? (
          <GenericServicePage 
            title="Power Outages Management" 
            icon={AlertCircle} 
            endpoint="/electricity/outages/" 
            color="bg-red-500" 
          />
        ) : (
          <GenericServicePage 
            title="Electricity Notices & Schedules" 
            icon={Info} 
            endpoint="/electricity/notices/" 
            color="bg-blue-500" 
          />
        )}
      </div>
    </div>
  );
}
