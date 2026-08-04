import React from 'react';
import { Card } from '@/components/ui';
import type { ServiceHealthItem } from '../types/admin';
import { Activity, ShieldCheck, Wifi } from 'lucide-react';

export interface SystemHealthProps {
  services: ServiceHealthItem[];
}

export const SystemHealth: React.FC<SystemHealthProps> = ({ services }) => {
  return (
    <Card className="p-6 bg-slate-900/90 border-slate-800 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-400" />
          Infrastructure & System Health
        </h3>
        <span className="text-[10px] font-mono text-emerald-400">99.9% Uptime</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {services.map((item) => (
          <div
            key={item.serviceName}
            className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3.5 space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200">{item.serviceName}</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            </div>

            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800/60">
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                {item.status}
              </span>
              <span className="font-mono text-slate-400 flex items-center gap-1">
                <Wifi className="w-3 h-3 text-slate-500" />
                {item.latencyMs}ms
              </span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
