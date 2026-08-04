import React, { useState } from 'react';
import { Card, Button, Input } from '@/components/ui';
import { OutpassStatus } from './OutpassStatus';
import { ApprovalTimeline } from './ApprovalTimeline';
import type { OutpassRequest } from '../types/outpass';
import { OutpassWorkflow } from '../services/OutpassWorkflow';
import { Calendar, MapPin, Check, X, FileText } from 'lucide-react';

export interface OutpassCardProps {
  outpass: OutpassRequest;
  isWarden?: boolean;
  onApprove?: (id: string) => void;
  onReject?: (id: string, reason: string) => void;
  isLoading?: boolean;
}

export const OutpassCard: React.FC<OutpassCardProps> = ({
  outpass,
  isWarden = false,
  onApprove,
  onReject,
  isLoading = false,
}) => {
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);

  const canApprove = OutpassWorkflow.canApprove(outpass);
  const canReject = OutpassWorkflow.canReject(outpass);

  const handleConfirmReject = () => {
    if (onReject) {
      onReject(outpass.id, rejectReason || 'Rejected by Warden');
      setShowRejectInput(false);
    }
  };

  return (
    <Card className="w-full bg-slate-900/90 border-slate-800 p-5 space-y-4">
      {/* Top Header */}
      <div className="flex items-start justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-indigo-400">#{outpass.id}</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-slate-800 text-slate-300">
              {outpass.type.replace('_', ' ')}
            </span>
          </div>
          <h3 className="text-sm font-bold text-slate-100 mt-1">{outpass.studentName}</h3>
          <p className="text-[11px] text-slate-400">
            {outpass.studentReg} • {outpass.department} • Room {outpass.roomNumber}
          </p>
        </div>

        <OutpassStatus status={outpass.status} />
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div className="flex items-start gap-2 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
          <Calendar className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-[10px] text-slate-500 font-semibold uppercase">Out Date & Time</p>
            <p className="font-semibold text-slate-200">{outpass.outDate} @ {outpass.outTime}</p>
          </div>
        </div>

        <div className="flex items-start gap-2 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
          <Calendar className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-[10px] text-slate-500 font-semibold uppercase">Expected Return</p>
            <p className="font-semibold text-slate-200">{outpass.expectedReturnDate} @ {outpass.expectedReturnTime}</p>
          </div>
        </div>
      </div>

      {/* Destination & Reason */}
      <div className="space-y-1.5 text-xs bg-slate-950/40 p-3 rounded-xl border border-slate-800/60">
        <div className="flex items-center gap-1.5 text-slate-300 font-medium">
          <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
          <span>Destination: <strong className="text-slate-100">{outpass.destination}</strong></span>
        </div>
        <div className="flex items-start gap-1.5 text-slate-400">
          <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
          <span>Reason: {outpass.reason}</span>
        </div>

        {outpass.rejectionReason && (
          <p className="text-rose-400 text-[11px] pt-1">
            <strong>Rejection Reason:</strong> {outpass.rejectionReason}
          </p>
        )}
      </div>

      {/* Approval Timeline Component */}
      <ApprovalTimeline outpass={outpass} />

      {/* Warden Action Buttons */}
      {isWarden && canApprove && (
        <div className="pt-2 border-t border-slate-800/80 space-y-2">
          {!showRejectInput ? (
            <div className="flex items-center gap-2">
              {onApprove && (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => onApprove(outpass.id)}
                  isLoading={isLoading}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 border-emerald-500"
                >
                  <Check className="w-4 h-4 mr-1" />
                  Approve Request
                </Button>
              )}
              {canReject && (
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => setShowRejectInput(true)}
                  isLoading={isLoading}
                  className="flex-1"
                >
                  <X className="w-4 h-4 mr-1" />
                  Reject Request
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2 bg-slate-950 p-3 rounded-xl border border-rose-500/30">
              <Input
                placeholder="Enter rejection reason..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="text-xs"
              />
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={() => setShowRejectInput(false)}>
                  Cancel
                </Button>
                <Button size="sm" variant="danger" onClick={handleConfirmReject}>
                  Confirm Reject
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};
