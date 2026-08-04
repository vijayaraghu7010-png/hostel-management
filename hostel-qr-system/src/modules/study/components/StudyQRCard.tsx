import React from 'react';
import { DigitalWalletQR } from '@/components/qr/DigitalWalletQR';
import { StudyStatusBadge } from './StudyStatusBadge';
import { Card } from '@/components/ui';
import type { StudySessionRecord, StudyAttendanceStatus } from '../types/study';
import { CheckCircle2, Clock, AlertCircle } from 'lucide-react';

export interface StudyQRCardProps {
  session: StudySessionRecord | null;
  studentReg: string;
  studentName?: string;
  department?: string;
  roomNumber?: string;
  attendanceStatus?: StudyAttendanceStatus | null;
}

export const StudyQRCard: React.FC<StudyQRCardProps> = ({
  session,
  studentReg,
  studentName = 'Alex Rivera',
  department = 'CSE',
  roomNumber = '101',
  attendanceStatus = null,
}) => {
  if (!session || session.status !== 'ACTIVE') {
    return (
      <Card className="w-full max-w-sm mx-auto p-8 text-center space-y-4 bg-slate-900/90 border-slate-800">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
          <Clock className="w-7 h-7" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-bold text-slate-100">
            {session?.status === 'ENDED' ? 'Study Session Ended' : 'No Active Study Session'}
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            {session?.status === 'ENDED'
              ? 'The warden has closed this study session. Thank you for participating.'
              : 'Waiting for the warden to start the Evening Study Hour session.'}
          </p>
        </div>
      </Card>
    );
  }

  const isAlreadyMarked = attendanceStatus === 'PRESENT' || attendanceStatus === 'LATE';

  return (
    <div className="w-full max-w-sm mx-auto space-y-4">
      {/* Attendance Status Banner */}
      <Card className="p-4 bg-slate-900/90 border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {isAlreadyMarked ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          ) : (
            <AlertCircle className="w-5 h-5 text-amber-400" />
          )}
          <div>
            <p className="text-xs font-bold text-slate-200">
              {isAlreadyMarked ? 'Attendance Verified' : 'Scan Required'}
            </p>
            <p className="text-[10px] text-slate-400">
              {isAlreadyMarked
                ? 'Your attendance has been recorded by warden'
                : 'Present this QR code to the Warden'}
            </p>
          </div>
        </div>

        {attendanceStatus && (
          <StudyStatusBadge status={attendanceStatus} type="attendance" />
        )}
      </Card>

      {/* Apple Digital Wallet Style Pass */}
      <DigitalWalletQR
        type="STUDY"
        id={session.id}
        studentName={studentName}
        registrationNumber={studentReg}
        department={department}
        roomNumber={roomNumber}
        payloadData={{
          sessionId: session.id,
          studentReg,
          studentName,
          timestamp: Date.now(),
        }}
        title="Evening Study Hour Digital Pass"
      />
    </div>
  );
};
