import React from 'react';
import type { StudySessionStatus, StudyAttendanceStatus } from '../types/study';

export interface StudyStatusBadgeProps {
  status: StudySessionStatus | StudyAttendanceStatus;
  type?: 'session' | 'attendance';
  className?: string;
}

export const StudyStatusBadge: React.FC<StudyStatusBadgeProps> = ({
  status,
  type = 'session',
  className = '',
}) => {
  const getBadgeStyle = () => {
    if (type === 'session') {
      switch (status as StudySessionStatus) {
        case 'ACTIVE':
          return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
        case 'WAITING':
          return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
        case 'ENDED':
          return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
        default:
          return 'bg-slate-800 text-slate-400 border-slate-700';
      }
    } else {
      switch (status as StudyAttendanceStatus) {
        case 'PRESENT':
          return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
        case 'LATE':
          return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
        case 'ABSENT':
          return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
        default:
          return 'bg-slate-800 text-slate-400 border-slate-700';
      }
    }
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${getBadgeStyle()} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
};
