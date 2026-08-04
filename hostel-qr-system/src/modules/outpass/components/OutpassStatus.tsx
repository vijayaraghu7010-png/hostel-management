import React from 'react';
import type { OutpassStatusType } from '../types/outpass';

export interface OutpassStatusProps {
  status: OutpassStatusType;
  className?: string;
}

export const OutpassStatus: React.FC<OutpassStatusProps> = ({
  status,
  className = '',
}) => {
  const getBadgeStyle = () => {
    switch (status) {
      case 'APPROVED':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'PENDING':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      case 'REJECTED':
        return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
      case 'USED':
        return 'bg-sky-500/15 text-sky-400 border-sky-500/30';
      case 'EXPIRED':
        return 'bg-slate-800 text-slate-400 border-slate-700';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${getBadgeStyle()} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
};
