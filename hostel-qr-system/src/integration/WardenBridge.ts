import { BridgeEvents } from './BridgeEvents';
import { AttendanceBridge } from './AttendanceBridge';
import { OutpassBridge } from './OutpassBridge';

export class WardenBridge {
  static openScanner(
    scannerType: 'STUDY' | 'OUTPASS' = 'STUDY',
    route: '/warden/study' | '/warden/outpass' | '/warden/dashboard' = '/warden/study'
  ): void {
    BridgeEvents.emit('WARDEN_OPEN_SCANNER', {
      scannerType,
      route,
      targetUrl: `${window.location.origin}${route}`,
    }, 'ERP', 'PORTAL');

    if (typeof window !== 'undefined') {
      window.open(route, '_blank');
    }
  }

  static onScanEvent(callback: (data: Record<string, unknown>) => void): () => void {
    return BridgeEvents.on('WARDEN_SCAN_EVENT', (msg) => {
      callback(msg.payload);
    });
  }

  static onAttendanceUpdate(callback: (data: Record<string, unknown>) => void): () => void {
    return AttendanceBridge.subscribeToWardenAttendance(callback);
  }

  static onOutpassVerify(callback: (data: Record<string, unknown>) => void): () => void {
    return OutpassBridge.subscribeToWardenOutpassVerify(callback);
  }
}
