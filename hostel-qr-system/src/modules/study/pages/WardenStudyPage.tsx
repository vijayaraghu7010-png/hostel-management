import React, { useState } from 'react';
import { Card, Button } from '@/components/ui';
import { UniversalScanner } from '@/components/scanner/UniversalScanner';
import type { ParsedScanResult } from '@/types/scanner';
import { useStudySession } from '../hooks/useStudySession';
import { useAttendance } from '../hooks/useAttendance';
import { StudySessionCard } from '../components/StudySessionCard';
import { AttendanceList } from '../components/AttendanceList';
import { StudyValidator } from '../services/StudyValidator';
import type { StudyAttendanceStatus } from '../types/study';
import { Camera, Users, CheckCircle2, Clock, X, AlertCircle } from 'lucide-react';

export const WardenStudyPage: React.FC = () => {
  const {
    currentSession,
    sessionStatus,
    elapsedTimeFormatted,
    startSession,
    endSession,
    loading: sessionLoading,
  } = useStudySession();

  const {
    records,
    metrics,
    markAttendance,
    loading: attendanceLoading,
  } = useAttendance(currentSession?.id);

  const [showScanner, setShowScanner] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'warning' } | null>(null);

  const triggerToast = (text: string, type: 'success' | 'error' | 'warning') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleScanResult = async (scanResult: ParsedScanResult) => {
    const validation = StudyValidator.validateScan(scanResult, currentSession, records);

    if (!validation.canMark) {
      triggerToast(validation.reason, 'error');
      return;
    }

    if (validation.studentReg) {
      const res = await markAttendance(validation.studentReg, 'PRESENT');
      if (res.success) {
        triggerToast(`✅ ${res.message}`, 'success');
      } else {
        triggerToast(res.message, 'warning');
      }
    }
  };

  const handleManualMark = async (studentReg: string, status: StudyAttendanceStatus) => {
    const res = await markAttendance(studentReg, status);
    if (res.success) {
      triggerToast(`✅ ${res.message}`, 'success');
    } else {
      triggerToast(res.message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification Popup */}
      {toastMessage && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-2xl border shadow-2xl text-xs font-bold flex items-center gap-2 animate-bounce ${
            toastMessage.type === 'success'
              ? 'bg-emerald-950 border-emerald-500 text-emerald-200'
              : toastMessage.type === 'warning'
              ? 'bg-amber-950 border-amber-500 text-amber-200'
              : 'bg-rose-950 border-rose-500 text-rose-200'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Main Session Banner Card */}
      <StudySessionCard
        session={currentSession}
        status={sessionStatus}
        elapsedTime={elapsedTimeFormatted}
        onStartSession={() => void startSession('Evening Study Hour')}
        onEndSession={() => void endSession()}
        isLoading={sessionLoading}
      />

      {/* Secondary Quick Scanner Launcher Banner */}
      {sessionStatus === 'ACTIVE' && (
        <div className="flex justify-between items-center bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:px-6">
          <div>
            <h3 className="text-sm font-bold text-slate-100">Live Attendance Scanner</h3>
            <p className="text-xs text-slate-400">Scan student phone QR codes to record attendance</p>
          </div>
          <Button
            variant="primary"
            size="md"
            onClick={() => setShowScanner(true)}
            className="bg-emerald-600 hover:bg-emerald-500 border-emerald-500"
          >
            <Camera className="w-4 h-4 mr-2" />
            Launch Camera Scanner
          </Button>
        </div>
      )}

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 space-y-1 bg-slate-900/90 border-slate-800">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Enrolled</span>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-black text-slate-100">{metrics.totalStudents}</span>
            <Users className="w-5 h-5 text-indigo-400" />
          </div>
        </Card>

        <Card className="p-4 space-y-1 bg-slate-900/90 border-slate-800">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Present</span>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-black text-emerald-400">{metrics.presentCount}</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>
        </Card>

        <Card className="p-4 space-y-1 bg-slate-900/90 border-slate-800">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pending / Absent</span>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-black text-rose-400">{metrics.pendingCount}</span>
            <AlertCircle className="w-5 h-5 text-rose-400" />
          </div>
        </Card>

        <Card className="p-4 space-y-1 bg-slate-900/90 border-slate-800">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Attendance Rate</span>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-black text-sky-400">{metrics.attendanceRate}%</span>
            <Clock className="w-5 h-5 text-sky-400" />
          </div>
        </Card>
      </div>

      {/* Roster & Attendance List */}
      <AttendanceList
        attendanceRecords={records}
        onMarkAttendance={handleManualMark}
        isLoading={attendanceLoading}
      />

      {/* Scanner Modal Overlay */}
      {showScanner && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg relative bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Camera className="w-4 h-4 text-emerald-400" />
                Scan Student QR Code
              </h3>
              <button
                onClick={() => setShowScanner(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <UniversalScanner
              onScanResult={(res) => void handleScanResult(res)}
              onClose={() => setShowScanner(false)}
              title="Study Hour QR Scanner"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default WardenStudyPage;
