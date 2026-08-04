import React from 'react';
import { Card } from '@/components/ui';
import type { LiveOutpassMetrics } from '../types/admin';
import { LogOut, LogIn, Clock, CheckCircle2, XCircle } from 'lucide-react';

export interface LiveAttendanceProps {
  metrics: LiveOutpassMetrics;
}

export const LiveAttendance: React.FC<LiveAttendanceProps> = ({ metrics }) => {
  return (
    <Card className="p-6 bg-slate-900/90 border-slate-800 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
          <LogOut className="w-4 h-4 text-sky-400" />
          Live Outpass Gate Controls
        </h3>
        <span className="text-[10px] text-slate-400">Gate Monitor</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
        <div className="bg-slate-950/60 border border-slate-800/80 p-3 rounded-2xl">
          <Clock className="w-4 h-4 text-amber-400 mx-auto mb-1" />
          <span className="text-[9px] font-bold uppercase text-slate-400 block">Pending</span>
          <span className="text-lg font-black text-amber-400">{metrics.pendingRequests}</span>
        </div>

        <div className="bg-slate-950/60 border border-slate-800/80 p-3 rounded-2xl">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
          <span className="text-[9px] font-bold uppercase text-slate-400 block">Approved</span>
          <span className="text-lg font-black text-emerald-400">{metrics.approved}</span>
        </div>

        <div className="bg-slate-950/60 border border-slate-800/80 p-3 rounded-2xl">
          <XCircle className="w-4 h-4 text-rose-400 mx-auto mb-1" />
          <span className="text-[9px] font-bold uppercase text-slate-400 block">Rejected</span>
          <span className="text-lg font-black text-rose-400">{metrics.rejected}</span>
        </div>

        <div className="bg-slate-950/60 border border-slate-800/80 p-3 rounded-2xl">
          <LogOut className="w-4 h-4 text-sky-400 mx-auto mb-1" />
          <span className="text-[9px] font-bold uppercase text-slate-400 block">Outside</span>
          <span className="text-lg font-black text-sky-400">{metrics.studentsOutside}</span>
        </div>

        <div className="bg-slate-950/60 border border-slate-800/80 p-3 rounded-2xl col-span-2 sm:col-span-1">
          <LogIn className="w-4 h-4 text-indigo-400 mx-auto mb-1" />
          <span className="text-[9px] font-bold uppercase text-slate-400 block">Returned</span>
          <span className="text-lg font-black text-indigo-400">{metrics.studentsReturned}</span>
        </div>
      </div>
    </Card>
  );
};
