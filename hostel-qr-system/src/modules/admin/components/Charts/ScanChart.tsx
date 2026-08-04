import React from 'react';
import { motion } from 'framer-motion';
import type { AnalyticsTrendPoint } from '../../types/admin';

export interface ScanChartProps {
  data: AnalyticsTrendPoint[];
}

export const ScanChart: React.FC<ScanChartProps> = ({ data }) => {
  const maxVal = Math.max(...data.map((d) => d.scans), 400);

  return (
    <div className="w-full space-y-3">
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>Daily QR Scan Processing Volume</span>
        <span className="font-mono text-sky-400 font-bold">Total Scans</span>
      </div>

      <div className="h-44 w-full flex items-end gap-2 sm:gap-4 pt-6 pb-2 px-2 bg-slate-950/40 rounded-2xl border border-slate-800/80 relative">
        {data.map((item, idx) => {
          const heightPercent = Math.round((item.scans / maxVal) * 100);
          return (
            <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group">
              <div className="text-[10px] font-mono text-sky-300 opacity-0 group-hover:opacity-100 transition-opacity mb-1 font-bold">
                {item.scans}
              </div>
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${heightPercent}%` }}
                transition={{ duration: 0.6, delay: idx * 0.08 }}
                className="w-full bg-gradient-to-t from-sky-600 to-emerald-400 rounded-t-lg shadow-lg shadow-sky-500/20 group-hover:from-sky-500 group-hover:to-indigo-400 transition-all"
              />
              <span className="text-[10px] font-bold text-slate-400 mt-2">{item.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
