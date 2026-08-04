import React from 'react';
import { Card } from '@/components/ui';
import type { RecentScanItem } from '../types/admin';
import { QrCode, CheckCircle2, AlertTriangle } from 'lucide-react';

export interface RecentScansProps {
  scans: RecentScanItem[];
}

export const RecentScans: React.FC<RecentScansProps> = ({ scans }) => {
  return (
    <Card className="p-6 bg-slate-900/90 border-slate-800 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
          <QrCode className="w-4 h-4 text-indigo-400" />
          Realtime QR Scan Audit Log ({scans.length})
        </h3>
        <span className="text-[10px] text-slate-400">Live Hardware Stream</span>
      </div>

      <div className="space-y-2">
        {scans.map((scan) => (
          <div
            key={scan.id}
            className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between text-xs gap-3 hover:border-slate-700/80 transition-all"
          >
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-lg ${
                  scan.result === 'SUCCESS'
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'bg-rose-500/10 text-rose-400'
                }`}
              >
                {scan.result === 'SUCCESS' ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <AlertTriangle className="w-4 h-4" />
                )}
              </div>

              <div>
                <p className="font-bold text-slate-200">{scan.studentName}</p>
                <p className="text-[10px] font-mono text-slate-400">
                  {scan.studentReg} • {scan.scannerDevice}
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-slate-800 text-indigo-400 mr-2">
                {scan.qrType}
              </span>
              <span className="text-[11px] font-mono text-slate-400">{scan.time}</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
