import React from 'react';
import type { OutpassRequest } from '../types/outpass';
import { CheckCircle2, Clock, XCircle, LogOut as LogOutIcon, LogIn as LogInIcon } from 'lucide-react';

export interface ApprovalTimelineProps {
  outpass: OutpassRequest;
}

export const ApprovalTimeline: React.FC<ApprovalTimelineProps> = ({ outpass }) => {
  const steps = [
    {
      title: 'Applied',
      subtitle: new Date(outpass.createdAt).toLocaleDateString(),
      completed: true,
      icon: Clock,
      activeColor: 'text-indigo-400 border-indigo-500 bg-indigo-500/10',
    },
    {
      title: 'Approval',
      subtitle: outpass.status === 'APPROVED' ? 'Approved' : outpass.status === 'REJECTED' ? 'Rejected' : 'Pending Review',
      completed: outpass.status === 'APPROVED' || outpass.status === 'USED',
      failed: outpass.status === 'REJECTED',
      icon: outpass.status === 'REJECTED' ? XCircle : CheckCircle2,
      activeColor: outpass.status === 'REJECTED' ? 'text-rose-400 border-rose-500 bg-rose-500/10' : 'text-emerald-400 border-emerald-500 bg-emerald-500/10',
    },
    {
      title: 'Gate Exit',
      subtitle: outpass.exitVerifiedAt ? 'Exit Verified' : 'Pending Exit',
      completed: Boolean(outpass.exitVerifiedAt),
      icon: LogOutIcon,
      activeColor: 'text-sky-400 border-sky-500 bg-sky-500/10',
    },
    {
      title: 'Return Entry',
      subtitle: outpass.entryVerifiedAt ? 'Returned' : 'Pending Return',
      completed: Boolean(outpass.entryVerifiedAt),
      icon: LogInIcon,
      activeColor: 'text-emerald-400 border-emerald-500 bg-emerald-500/10',
    },
  ];

  return (
    <div className="w-full py-2">
      <div className="grid grid-cols-4 gap-2 relative">
        {steps.map((step, idx) => (
          <div key={idx} className="flex flex-col items-center text-center space-y-1 relative z-10">
            <div
              className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all ${
                step.failed
                  ? 'border-rose-500 bg-rose-500/20 text-rose-400'
                  : step.completed
                  ? step.activeColor
                  : 'border-slate-800 bg-slate-900 text-slate-500'
              }`}
            >
              <step.icon className="w-4 h-4" />
            </div>
            <p className="text-[11px] font-bold text-slate-200">{step.title}</p>
            <p className="text-[9px] text-slate-400">{step.subtitle}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
