import React from 'react';
import { cn } from '../../lib/utils';

export function StatusBadge({ status, className }) {
  const statusMap = {
    'PENDING': { label: 'Pending', colors: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
    'ASSIGNED': { label: 'Assigned', colors: 'bg-blue-100 text-blue-800 border-blue-200' },
    'IN_PROGRESS': { label: 'In Progress', colors: 'bg-purple-100 text-purple-800 border-purple-200' },
    'RESOLVED': { label: 'Resolved', colors: 'bg-green-100 text-green-800 border-green-200' },
    'CLOSED': { label: 'Closed', colors: 'bg-slate-100 text-slate-800 border-slate-200' },
    
    // Priority badges (optional extension if needed)
    'HIGH': { label: 'High', colors: 'bg-red-100 text-red-800 border-red-200' },
    'MEDIUM': { label: 'Medium', colors: 'bg-orange-100 text-orange-800 border-orange-200' },
    'LOW': { label: 'Low', colors: 'bg-green-100 text-green-800 border-green-200' },
  };

  const config = statusMap[status?.toUpperCase()] || { label: status, colors: 'bg-slate-100 text-slate-800 border-slate-200' };

  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border", config.colors, className)}>
      {config.label}
    </span>
  );
}
