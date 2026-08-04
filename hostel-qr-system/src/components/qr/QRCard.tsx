import React from 'react';
import { Card, Button } from '@/components/ui';
import { QRCountdown } from './QRCountdown';
import type { QRType } from '@/types/qr';
import { QrCode, RefreshCw, AlertCircle, ShieldCheck, Sparkles } from 'lucide-react';

export interface QRCardProps {
  dataUrl: string | null;
  type: QRType;
  id: string;
  timeRemainingSeconds: number;
  ttlSeconds: number;
  isExpired?: boolean;
  loading?: boolean;
  error?: Error | null;
  onRefresh?: () => void;
  title?: string;
  description?: string;
  className?: string;
}

const TYPE_BADGE_COLORS: Record<QRType, { bg: string; text: string; border: string }> = {
  STUDY: { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/30' },
  OUTPASS: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  VISITOR: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
  LIBRARY: { bg: 'bg-sky-500/10', text: 'text-sky-400', border: 'border-sky-500/30' },
  MESS: { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/30' },
};

export const QRCard: React.FC<QRCardProps> = ({
  dataUrl,
  type,
  id,
  timeRemainingSeconds,
  ttlSeconds,
  isExpired = false,
  loading = false,
  error = null,
  onRefresh,
  title,
  description,
  className = '',
}) => {
  const badgeStyle = TYPE_BADGE_COLORS[type] || TYPE_BADGE_COLORS.STUDY;

  return (
    <Card className={`w-full max-w-sm mx-auto flex flex-col items-center space-y-4 p-6 bg-slate-900/90 border-slate-800 shadow-2xl relative ${className}`}>
      {/* Top Header */}
      <div className="w-full flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <QrCode className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100">{title || `${type} Pass QR`}</h3>
            <p className="text-[10px] text-slate-400 font-mono">ID: {id}</p>
          </div>
        </div>

        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border tracking-wider ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border}`}>
          {type}
        </span>
      </div>

      {description && (
        <p className="text-xs text-slate-400 text-center px-2">{description}</p>
      )}

      {/* QR Code Container */}
      <div className="relative w-64 h-64 bg-white p-4 rounded-2xl border-4 border-slate-800 shadow-inner flex items-center justify-center overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center gap-2 text-slate-600">
            <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
            <span className="text-xs font-semibold">Generating QR Code...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center text-center gap-2 p-4 text-rose-600">
            <AlertCircle className="w-8 h-8" />
            <span className="text-xs font-semibold">{error.message || 'QR Generation Error'}</span>
            {onRefresh && (
              <Button size="sm" variant="danger" onClick={onRefresh} className="mt-2 text-xs">
                Retry
              </Button>
            )}
          </div>
        ) : dataUrl ? (
          <>
            <img
              src={dataUrl}
              alt={`${type} QR Code`}
              className={`w-full h-full object-contain transition-all duration-300 ${
                isExpired ? 'opacity-20 blur-sm scale-95' : 'opacity-100 scale-100'
              }`}
            />

            {/* Expired Overlay */}
            {isExpired && (
              <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center space-y-3">
                <AlertCircle className="w-8 h-8 text-rose-400 animate-bounce" />
                <div>
                  <p className="text-xs font-bold text-slate-100">QR Code Expired</p>
                  <p className="text-[10px] text-slate-400">Security token duration lapsed</p>
                </div>
                {onRefresh && (
                  <Button size="sm" variant="primary" onClick={onRefresh} className="text-xs">
                    <RefreshCw className="w-3 h-3 mr-1.5" />
                    Regenerate
                  </Button>
                )}
              </div>
            )}
          </>
        ) : null}
      </div>

      {/* Footer Countdown Bar */}
      <div className="w-full pt-1">
        <QRCountdown
          timeRemainingSeconds={timeRemainingSeconds}
          totalSeconds={ttlSeconds}
          isExpired={isExpired}
          onRefresh={onRefresh}
          isLoading={loading}
        />
      </div>

      {/* Security Footer Badge */}
      <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-500 pt-1">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
        <span>Universal Cryptographic HMAC Token</span>
        <Sparkles className="w-3 h-3 text-amber-400" />
      </div>
    </Card>
  );
};
