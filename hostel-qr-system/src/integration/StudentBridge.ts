import { BridgeEvents } from './BridgeEvents';
import { AttendanceBridge } from './AttendanceBridge';
import { SessionBridge } from './SessionBridge';
import { OutpassBridge } from './OutpassBridge';

export class StudentBridge {
  static openQRPortal(
    studentReg: string,
    route: '/student/study' | '/student/outpass' | '/student/dashboard' = '/student/study'
  ): void {
    BridgeEvents.emit('STUDENT_OPEN_PORTAL', {
      studentReg,
      route,
      targetUrl: `${window.location.origin}${route}`,
    }, 'ERP', 'PORTAL');

    // Launch portal route in popup or navigate
    if (typeof window !== 'undefined') {
      window.open(route, '_blank');
    }
  }

  static onAttendanceUpdate(callback: (data: Record<string, unknown>) => void): () => void {
    return AttendanceBridge.subscribeToStudentAttendance(callback);
  }

  static onSessionUpdate(callback: (data: Record<string, unknown>) => void): () => void {
    return SessionBridge.subscribeToSessionChanges(callback);
  }

  static onOutpassUpdate(callback: (data: Record<string, unknown>) => void): () => void {
    return OutpassBridge.subscribeToStudentOutpass(callback);
  }
}
