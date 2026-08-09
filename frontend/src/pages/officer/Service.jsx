import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import GenericServicePage from '../admin/GenericServicePage';
import { Activity, Trash2, Droplets, Zap, Bus, Wind, Car } from 'lucide-react';
import { Card } from '../../components/ui/Card';

export default function OfficerService() {
  const { user } = useAuth();
  const deptCode = user?.department?.code;

  let serviceConfig = null;

  switch (deptCode) {
    case 'WASTE':
      serviceConfig = { title: 'Waste Bins', icon: Trash2, endpoint: '/waste/bins/', color: 'bg-stone-500' };
      break;
    case 'WATER':
      serviceConfig = { title: 'Water Readings', icon: Droplets, endpoint: '/water/readings/', color: 'bg-blue-500' };
      break;
    case 'ELECTRICITY':
      serviceConfig = { title: 'Power Outages', icon: Zap, endpoint: '/electricity/outages/', color: 'bg-yellow-500' };
      break;
    case 'TRANSPORT':
      serviceConfig = { title: 'Bus Fleet', icon: Bus, endpoint: '/transport/buses/', color: 'bg-indigo-500' };
      break;
    case 'POLLUTION':
      serviceConfig = { title: 'AQI Stations', icon: Wind, endpoint: '/pollution/readings/', color: 'bg-teal-500' };
      break;
    case 'TRAFFIC':
      serviceConfig = { title: 'Traffic Zones', icon: Car, endpoint: '/traffic/readings/', color: 'bg-slate-600' };
      break;
    default:
      serviceConfig = null;
  }

  if (!serviceConfig) {
    return (
      <Card className="p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
        <Activity className="w-16 h-16 text-slate-300 mb-4" />
        <h2 className="text-xl font-bold text-slate-700">No Specific IoT Service</h2>
        <p className="text-slate-500 mt-2 max-w-md">
          Your department ({user?.department?.name || 'Unknown'}) does not have a dedicated IoT monitoring dashboard. Please refer to your complaints and tasks.
        </p>
      </Card>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
       <GenericServicePage 
         title={`${user?.department?.name} Monitor`} 
         icon={serviceConfig.icon} 
         endpoint={serviceConfig.endpoint} 
         color={serviceConfig.color} 
       />
    </div>
  );
}
