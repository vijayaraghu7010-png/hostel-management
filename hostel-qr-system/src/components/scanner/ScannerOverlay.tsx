import React from 'react';
import { ShieldCheck, Pause } from 'lucide-react';

export interface ScannerOverlayProps {
  isScanning: boolean;
  isPaused: boolean;
  title?: string;
}

export const ScannerOverlay: React.FC<ScannerOverlayProps> = ({
  isScanning,
  isPaused,
  title = 'Universal QR Scanner',
}) => {
  return (
    <div className="absolute inset-0 z-10 pointer-events-none flex flex-col items-center justify-between p-6">
      {/* Top Banner Status */}
      <div className="bg-slate-950/80 backdrop-blur-md border border-slate-800/80 px-4 py-2 rounded-2xl flex items-center gap-2 shadow-xl">
        <div className={`w-2.5 h-2.5 rounded-full ${isPaused ? 'bg-amber-400' : isScanning ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`} />
        <span className="text-xs font-bold text-slate-200">{title}</span>
        {isPaused && (
          <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-md">
            <Pause className="w-3 h-3" /> Paused
          </span>
        )}
      </div>

      {/* Target Reticle & Scan Line Box */}
      <div className="relative w-64 h-64 sm:w-72 sm:h-72">
        {/* Reticle Corner Brackets */}
        <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-indigo-500 rounded-tl-xl" />
        <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-indigo-500 rounded-tr-xl" />
        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-indigo-500 rounded-bl-xl" />
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-indigo-500 rounded-br-xl" />

        {/* Animated Scan Line */}
        {isScanning && !isPaused && (
          <div className="absolute inset-x-2 h-1 bg-gradient-to-r from-transparent via-indigo-400 to-transparent shadow-[0_0_15px_#818cf8] animate-scan-bounce" />
        )}
      </div>

      {/* Bottom Hint */}
      <div className="bg-slate-950/80 backdrop-blur-md border border-slate-800/80 px-4 py-1.5 rounded-xl flex items-center gap-1.5 text-[11px] font-medium text-slate-300 shadow-lg">
        <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
        <span>Supports STUDY, OUTPASS, VISITOR, LIBRARY & MESS QR</span>
      </div>

      {/* CSS Animation Keyframes for Scan Line */}
      <style>{`
        @keyframes scanBounce {
          0%, 100% { top: 8px; }
          50% { top: calc(100% - 12px); }
        }
        .animate-scan-bounce {
          animation: scanBounce 2.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};
