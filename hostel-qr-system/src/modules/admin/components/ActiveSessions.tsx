import React from 'react';
import { Card } from '@/components/ui';
import type { LiveStudySessionItem } from '../types/admin';
import { Clock, Users, ShieldCheck } from 'lucide-react';

export interface ActiveSessionsProps {
  sessions: LiveStudySessionItem[];
}

export const ActiveSessions: React.FC<ActiveSessionsProps> = ({ sessions }) => {
  return (
    <Card className="p-6 bg-slate-900/90 border-slate-800 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
          <Clock className="w-4 h-4 text-emerald-400" />
          Live Active Study Sessions ({sessions.length})
        </h3>
        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
          Realtime Pulse
        </span>
      </div>

      {sessions.length === 0 ? (
        <div className="text-center py-6 text-xs text-slate-500">No study sessions currently active.</div>
      ) : (
        <div className="space-y-3">
          {sessions.map((item) => (
            <div
              key={item.id}
              className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-indigo-400">#{item.id}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    {item.status}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-slate-200 mt-1">{item.sessionName}</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Started: {new Date(item.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>

              <div className="flex items-center gap-4 text-xs">
                <div className="text-right">
                  <span className="block text-[9px] uppercase font-bold text-slate-500">Duration</span>
                  <span className="font-mono text-slate-200 font-bold">{item.durationFormatted}</span>
                </div>
                <div className="text-right">
                  <span className="block text-[9px] uppercase font-bold text-slate-500">Present</span>
                  <span className="font-bold text-emerald-400 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    {item.presentCount}
                  </span>
                </div>
                <div className="text-right">
                  <span className="block text-[9px] uppercase font-bold text-slate-500">Pending</span>
                  <span className="font-bold text-amber-400 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    {item.pendingCount}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};
