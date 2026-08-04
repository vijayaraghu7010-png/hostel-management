import React, { useState } from 'react';
import { Card } from '@/components/ui';
import type { SystemErrorLog } from '../types/admin';
import { AlertOctagon, CheckCircle2, Filter } from 'lucide-react';

export interface ErrorLogsProps {
  logs: SystemErrorLog[];
}

export const ErrorLogs: React.FC<ErrorLogsProps> = ({ logs }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const filteredLogs = selectedCategory === 'ALL'
    ? logs
    : logs.filter((l) => l.category === selectedCategory);

  return (
    <Card className="p-6 bg-slate-900/90 border-slate-800 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
          <AlertOctagon className="w-4 h-4 text-rose-400" />
          System Diagnostic Error Monitor ({filteredLogs.length})
        </h3>

        {/* Filter Category Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto text-[11px]">
          <Filter className="w-3.5 h-3.5 text-slate-500 mr-1 shrink-0" />
          {['ALL', 'NETWORK', 'SCANNER', 'AUTH', 'ERP', 'SUPABASE'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2 py-0.5 rounded-lg font-bold transition-all ${
                selectedCategory === cat
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {filteredLogs.map((log) => (
          <div
            key={log.id}
            className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
          >
            <div className="flex items-start gap-2.5">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-rose-400 mt-0.5">
                {log.category}
              </span>
              <div>
                <p className="font-medium text-slate-200">{log.message}</p>
                <p className="text-[10px] text-slate-500">{log.timestamp}</p>
              </div>
            </div>

            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                log.status === 'RESOLVED'
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'bg-rose-500/10 text-rose-400'
              }`}
            >
              {log.status === 'RESOLVED' ? <CheckCircle2 className="w-3 h-3" /> : <AlertOctagon className="w-3 h-3" />}
              {log.status}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
};
