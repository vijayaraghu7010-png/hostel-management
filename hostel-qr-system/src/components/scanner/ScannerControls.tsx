import React from 'react';
import { Zap, ZapOff, SwitchCamera, Pause, Play, X } from 'lucide-react';

export interface ScannerControlsProps {
  torchSupported: boolean;
  torchOn: boolean;
  onToggleTorch: () => void;
  canSwitchCamera: boolean;
  onSwitchCamera: () => void;
  isPaused: boolean;
  onTogglePause: () => void;
  onClose?: () => void;
  className?: string;
}

export const ScannerControls: React.FC<ScannerControlsProps> = ({
  torchSupported,
  torchOn,
  onToggleTorch,
  canSwitchCamera,
  onSwitchCamera,
  isPaused,
  onTogglePause,
  onClose,
  className = '',
}) => {
  return (
    <div className={`flex items-center justify-center gap-3 p-3 bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-xl ${className}`}>
      {/* Torch Toggle */}
      {torchSupported && (
        <button
          onClick={onToggleTorch}
          className={`p-3 rounded-xl transition-all duration-200 ${
            torchOn
              ? 'bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/30'
              : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
          }`}
          title={torchOn ? 'Turn Flash Off' : 'Turn Flash On'}
        >
          {torchOn ? <Zap className="w-5 h-5 fill-current" /> : <ZapOff className="w-5 h-5" />}
        </button>
      )}

      {/* Switch Camera */}
      {canSwitchCamera && (
        <button
          onClick={onSwitchCamera}
          className="p-3 rounded-xl bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white transition-all duration-200"
          title="Switch Camera"
        >
          <SwitchCamera className="w-5 h-5" />
        </button>
      )}

      {/* Pause / Resume */}
      <button
        onClick={onTogglePause}
        className={`p-3 rounded-xl transition-all duration-200 ${
          isPaused
            ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
            : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
        }`}
        title={isPaused ? 'Resume Scanning' : 'Pause Scanning'}
      >
        {isPaused ? <Play className="w-5 h-5 fill-current" /> : <Pause className="w-5 h-5" />}
      </button>

      {/* Close / Cancel */}
      {onClose && (
        <button
          onClick={onClose}
          className="p-3 rounded-xl bg-rose-600/20 border border-rose-500/30 text-rose-400 hover:bg-rose-600 hover:text-white transition-all duration-200"
          title="Close Scanner"
        >
          <X className="w-5 h-5" />
        </button>
      )}
    </div>
  );
};
