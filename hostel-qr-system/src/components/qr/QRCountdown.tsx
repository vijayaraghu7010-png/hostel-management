import React from 'react';
import { RefreshCw, Clock, AlertTriangle } from 'lucide-react';

export interface QRCountdownProps {
  timeRemainingSeconds: number;
  totalSeconds: number;
  isExpired?: boolean;
  onRefresh?: () => void;
  isLoading?: boolean;
}

export const QRCountdown: React.FC<QRCountdownProps> = ({
  timeRemainingSeconds,
  totalSeconds,
  isExpired = false,
  onRefresh,
  isLoading = false,
}) => {
  const percentage = Math.max(
    0,
    Math.min(100, (timeRemainingSeconds / Math.max(1, totalSeconds)) * 100)
  );

  const getStatusColor = () => {
    if (isExpired) return 'bg-rose-500 text-rose-400';
    if (percentage <= 20) return 'bg-rose-500 text-rose-400';
    if (percentage <= 50) return 'bg-amber-500 text-amber-400';
    return 'bg-emerald-500 text-emerald-400';
  };

  const statusColorClass = getStatusColor();

  return (
    <div className="w-full space-y-2.5">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 font-medium">
          {isExpired ? (
            <span className="flex items-center gap-1 text-rose-400 font-semibold">
              <AlertTriangle className="w-3.5 h-3.5" />
              QR Code Expired
            </span>
          ) : (
            <span className="flex items-center gap-1 text-slate-300">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              Auto-refreshing in{' '}
              <strong className="font-mono text-slate-100">{timeRemainingSeconds}s</strong>
            </span>
          )}
        </div>

        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="flex items-center gap-1 text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 disabled:opacity-50 transition-colors"
            title="Refresh QR Code"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        )}
      </div>

      {/* Progress Bar */}
      <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700/50">
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-linear ${statusColorClass.split(' ')[0]}`}
          style={{ width: `${isExpired ? 0 : percentage}%` }}
        />
      </div>
    </div>
  );
};
