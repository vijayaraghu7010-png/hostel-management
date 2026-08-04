import React, { useState } from 'react';
import { UniversalScanner } from '@/components/scanner/UniversalScanner';
import type { ParsedScanResult } from '@/types/scanner';
import { Card, Button } from '@/components/ui';
import { StudyValidator } from '@/modules/study/services/StudyValidator';
import { StudyService } from '@/modules/study/services/StudyService';
import { OutpassValidator } from '@/modules/outpass/services/OutpassValidator';
import { OutpassService } from '@/modules/outpass/services/OutpassService';
import { ERPConnector } from '@/integration/erp/ERPConnector';
import { AuditLogger } from '@/utils/AuditLogger';
import { validateSignedPayload } from '@/services/qr/QRValidator';
import {
  Camera,
  CheckCircle2,
  AlertOctagon,
  Sparkles,
  BookOpen,
  DoorOpen,
  UserCheck,
  UtensilsCrossed,
  History,
} from 'lucide-react';

export const UniversalScannerPage: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'STUDY' | 'OUTPASS' | 'VISITOR' | 'MESS'>('ALL');
  const [scanResultNotification, setScanResultNotification] = useState<{
    title: string;
    message: string;
    studentName?: string;
    type: 'STUDY' | 'OUTPASS' | 'VISITOR' | 'MESS' | 'ERROR';
    success: boolean;
  } | null>(null);

  const [scanHistory, setScanHistory] = useState<
    { id: string; type: string; name: string; time: string; success: boolean }[]
  >([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const handleAutoRouteScan = async (scanResult: ParsedScanResult) => {
    if (!scanResult.isValid) {
      triggerNotification({
        title: 'Invalid QR Code',
        message: scanResult.reason || 'Unrecognized barcode format',
        type: 'ERROR',
        success: false,
      });
      return;
    }

    if (scanResult.parsedPayload) {
      const signatureValidation = await validateSignedPayload(scanResult.parsedPayload);
      if (!signatureValidation.isValid) {
        triggerNotification({
          title: 'Security Alert: Tamper Detected',
          message: signatureValidation.reason || 'Cryptographic signature verification failed',
          type: 'ERROR',
          success: false,
        });
        return;
      }
    }

    const payloadType = scanResult.type;

    // Mode filter enforce check if user explicitly set filter chip
    if (activeFilter !== 'ALL' && payloadType !== activeFilter) {
      triggerNotification({
        title: 'Filter Mismatch',
        message: `Scanner is in ${activeFilter} mode. Scanned QR code is of type ${payloadType}.`,
        type: 'ERROR',
        success: false,
      });
      return;
    }

    // 1. AUTO ROUTE STUDY QR
    if (payloadType === 'STUDY') {
      const activeSession = await StudyService.getCurrentSession();
      const existingRecords = activeSession ? await StudyService.getAttendance(activeSession.id) : [];
      const validation = StudyValidator.validateScan(scanResult, activeSession, existingRecords);

      if (!validation.canMark || !validation.studentReg) {
        triggerNotification({
          title: 'Study Attendance Failed',
          message: validation.reason,
          type: 'STUDY',
          success: false,
        });
        return;
      }

      if (activeSession) {
        const markRes = await StudyService.markAttendance(activeSession.id, validation.studentReg, 'PRESENT');
        if (markRes.success && markRes.record) {
          void ERPConnector.sendStudyAttendance(markRes.record as unknown as Record<string, unknown>);
          AuditLogger.log('ATTENDANCE', 'STUDY_QR_AUTO_SCAN', { studentReg: validation.studentReg });

          addToHistory('STUDY', markRes.record.studentName, true);

          triggerNotification({
            title: '📚 Study Attendance Recorded',
            message: `Checked in ${markRes.record.studentName} (${markRes.record.studentReg}) for ${activeSession.title}`,
            studentName: markRes.record.studentName,
            type: 'STUDY',
            success: true,
          });
        }
      }
    }

    // 2. AUTO ROUTE OUTPASS QR
    else if (payloadType === 'OUTPASS') {
      const outpassList = await OutpassService.getAllOutpasses();
      const validation = OutpassValidator.validateScan(scanResult, outpassList);

      if (!validation.isValid || !validation.outpass) {
        triggerNotification({
          title: 'Gate Pass Verification Failed',
          message: validation.message,
          type: 'OUTPASS',
          success: false,
        });
        return;
      }

      if (validation.actionType === 'EXIT') {
        await OutpassService.verifyExit(validation.outpass.id);
        void ERPConnector.sendOutpassScan(validation.outpass as unknown as Record<string, unknown>, 'EXIT');
        AuditLogger.log('SCAN', 'OUTPASS_EXIT_VERIFIED', { outpassId: validation.outpass.id });

        addToHistory('OUTPASS', validation.outpass.studentName, true);

        triggerNotification({
          title: '🚪 Gate Exit Verified',
          message: `Approved Exit for ${validation.outpass.studentName} (Destination: ${validation.outpass.destination})`,
          studentName: validation.outpass.studentName,
          type: 'OUTPASS',
          success: true,
        });
      } else {
        await OutpassService.verifyEntry(validation.outpass.id);
        void ERPConnector.sendOutpassScan(validation.outpass as unknown as Record<string, unknown>, 'ENTRY');
        AuditLogger.log('SCAN', 'OUTPASS_ENTRY_VERIFIED', { outpassId: validation.outpass.id });

        addToHistory('OUTPASS', validation.outpass.studentName, true);

        triggerNotification({
          title: '🏠 Hostel Re-entry Verified',
          message: `Checked in ${validation.outpass.studentName} back into hostel grounds`,
          studentName: validation.outpass.studentName,
          type: 'OUTPASS',
          success: true,
        });
      }
    }

    // 3. AUTO ROUTE VISITOR QR (FUTURE MODULE READY)
    else if (payloadType === 'VISITOR') {
      const name = (scanResult.parsedPayload?.payload?.visitorName as string) || 'Guest Visitor';
      addToHistory('VISITOR', name, true);
      triggerNotification({
        title: '👤 Visitor Check-in Logged',
        message: `Verified Visitor Pass for ${name}`,
        studentName: name,
        type: 'VISITOR',
        success: true,
      });
    }

    // 4. AUTO ROUTE MESS QR (FUTURE MODULE READY)
    else if (payloadType === 'MESS') {
      const name = (scanResult.parsedPayload?.payload?.studentName as string) || 'Student';
      addToHistory('MESS', name, true);
      triggerNotification({
        title: '🍽️ Mess Meal Check-in Logged',
        message: `Meal coupon verified for ${name}`,
        studentName: name,
        type: 'MESS',
        success: true,
      });
    }
  };

  const triggerNotification = (notif: typeof scanResultNotification) => {
    setScanResultNotification(notif);
    setTimeout(() => {
      setScanResultNotification(null);
    }, 4500);
  };

  const addToHistory = (type: string, name: string, success: boolean) => {
    setScanHistory((prev) => [
      {
        id: `H-${Date.now()}`,
        type,
        name,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        success,
      },
      ...prev,
    ]);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Top Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-blue-950/60 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xl">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-semibold border border-blue-500/20 mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            KVCET Enterprise QR Engine
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-100 tracking-tight">
            Universal Smart QR Scanner
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Single intelligent scanner automatically routing Study Attendance, Outpass Gate Pass, Visitors & Mess Check-ins
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => setShowHistoryModal(true)}
          className="bg-slate-950 border-slate-800 text-slate-300 hover:text-white"
        >
          <History className="w-4 h-4 mr-2 text-blue-400" />
          Scan History ({scanHistory.length})
        </Button>
      </div>

      {/* Quick Mode Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 px-1">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">Target Mode:</span>

        <button
          onClick={() => setActiveFilter('ALL')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
            activeFilter === 'ALL'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25 border border-blue-400/40'
              : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          Smart Auto-Detect All
        </button>

        <button
          onClick={() => setActiveFilter('STUDY')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
            activeFilter === 'STUDY'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/25 border border-emerald-400/40'
              : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          📚 Study Hour
        </button>

        <button
          onClick={() => setActiveFilter('OUTPASS')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
            activeFilter === 'OUTPASS'
              ? 'bg-sky-600 text-white shadow-lg shadow-sky-500/25 border border-sky-400/40'
              : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <DoorOpen className="w-3.5 h-3.5" />
          🚪 Gate Outpass
        </button>

        <button
          onClick={() => setActiveFilter('VISITOR')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
            activeFilter === 'VISITOR'
              ? 'bg-amber-600 text-white shadow-lg shadow-amber-500/25 border border-amber-400/40'
              : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5" />
          👤 Visitor Pass
        </button>

        <button
          onClick={() => setActiveFilter('MESS')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
            activeFilter === 'MESS'
              ? 'bg-rose-600 text-white shadow-lg shadow-rose-500/25 border border-rose-400/40'
              : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <UtensilsCrossed className="w-3.5 h-3.5" />
          🍽️ Mess Pass
        </button>
      </div>

      {/* Main Fullscreen Style Scanner Viewport */}
      <div className="relative">
        <UniversalScanner
          onScanResult={(res) => void handleAutoRouteScan(res)}
          duplicateIntervalMs={2500}
          title={
            activeFilter === 'ALL'
              ? 'Universal Enterprise Smart Scanner'
              : `${activeFilter} Mode QR Scanner`
          }
        />

        {/* Live Auto-Route Notification Overlay Card */}
        {scanResultNotification && (
          <div className="absolute top-4 left-4 right-4 z-40 animate-bounce">
            <Card
              className={`p-5 backdrop-blur-xl border shadow-2xl space-y-2 ${
                scanResultNotification.success
                  ? 'bg-slate-950/90 border-blue-500/50 shadow-blue-500/20'
                  : 'bg-slate-950/90 border-rose-500/50 shadow-rose-500/20'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`p-2.5 rounded-2xl shrink-0 ${
                    scanResultNotification.success
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                      : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                  }`}
                >
                  {scanResultNotification.success ? (
                    <CheckCircle2 className="w-6 h-6" />
                  ) : (
                    <AlertOctagon className="w-6 h-6" />
                  )}
                </div>

                <div className="space-y-0.5 flex-1">
                  <h4 className="text-sm font-bold text-slate-100">
                    {scanResultNotification.title}
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {scanResultNotification.message}
                  </p>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* History Audit Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-slate-900 border-slate-800 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Camera className="w-4 h-4 text-blue-400" />
                Session Scan Audit Log ({scanHistory.length})
              </h3>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-slate-400 hover:text-white text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {scanHistory.length === 0 ? (
              <p className="text-center py-6 text-xs text-slate-500">No scans recorded in this session.</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {scanHistory.map((item) => (
                  <div
                    key={item.id}
                    className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-blue-400">
                        {item.type}
                      </span>
                      <span className="font-bold text-slate-200">{item.name}</span>
                    </div>
                    <span className="font-mono text-[11px] text-slate-400">{item.time}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
};

export default UniversalScannerPage;
