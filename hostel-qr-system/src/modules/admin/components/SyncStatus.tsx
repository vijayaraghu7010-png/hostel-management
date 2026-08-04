import React from 'react';
import { Card } from '@/components/ui';
import { RefreshCw, Database } from 'lucide-react';

export interface SyncStatusProps {
  queuedCount?: number;
  lastSyncedIso?: string;
}

export const SyncStatus: React.FC<SyncStatusProps> = ({
  queuedCount = 0,
  lastSyncedIso = new Date().toISOString(),
}) => {
  return (
    <Card className="p-4 bg-slate-900/90 border-slate-800 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
          <Database className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-xs font-bold text-slate-200">ERP Connector Pipeline</h4>
          <p className="text-[10px] text-slate-400">
            Last sync: {new Date(lastSyncedIso).toLocaleTimeString()}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-right">
          <span className="block text-[9px] font-bold uppercase text-slate-500">Backlog Queue</span>
          <span className="font-mono text-sm font-bold text-indigo-400">
            {queuedCount} events
          </span>
        </div>
        <RefreshCw className={`w-4 h-4 text-indigo-400 ${queuedCount > 0 ? 'animate-spin' : ''}`} />
      </div>
    </Card>
  );
};
