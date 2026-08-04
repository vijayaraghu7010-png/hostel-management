import React from 'react';
import { Card, Button } from '@/components/ui';
import { StudyStatusBadge } from './StudyStatusBadge';
import type { StudySessionRecord, StudySessionStatus } from '../types/study';
import { Clock, Play, Square, ShieldCheck } from 'lucide-react';

export interface StudySessionCardProps {
  session: StudySessionRecord | null;
  status: StudySessionStatus;
  elapsedTime: string;
  onStartSession?: () => void;
  onEndSession?: () => void;
  isLoading?: boolean;
}

export const StudySessionCard: React.FC<StudySessionCardProps> = ({
  session,
  status,
  elapsedTime,
  onStartSession,
  onEndSession,
  isLoading = false,
}) => {
  return (
    <Card className="w-full bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/50 border-slate-800 p-6 sm:p-8">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        {/* Left Info */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <StudyStatusBadge status={status} type="session" />
            <span className="text-xs text-slate-400 font-medium">
              Hostel Discipline Control
            </span>
          </div>

          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight">
              {session?.title || 'Evening Study Hour Session'}
            </h2>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              <span>Created by: <strong className="text-slate-300">{session?.createdBy || 'Warden'}</strong></span>
              {session?.startTime && (
                <>
                  <span>•</span>
                  <span>Started: {new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Right Controls & Clock */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 border-slate-800/80 pt-4 md:pt-0">
          {/* Live Timer Display */}
          <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800 px-4 py-2 rounded-2xl shadow-inner">
            <Clock className="w-4 h-4 text-indigo-400 animate-pulse" />
            <div className="text-left">
              <span className="block text-[9px] uppercase font-bold text-slate-500 tracking-wider">
                Session Timer
              </span>
              <span className="font-mono text-lg font-black text-slate-100 leading-none">
                {elapsedTime}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {status === 'ACTIVE' ? (
              onEndSession && (
                <Button
                  variant="danger"
                  size="md"
                  onClick={onEndSession}
                  isLoading={isLoading}
                >
                  <Square className="w-4 h-4 mr-2 fill-current" />
                  End Session
                </Button>
              )
            ) : (
              onStartSession && (
                <Button
                  variant="primary"
                  size="md"
                  onClick={onStartSession}
                  isLoading={isLoading}
                >
                  <Play className="w-4 h-4 mr-2 fill-current" />
                  Start Session
                </Button>
              )
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};
