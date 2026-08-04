import { BridgeEvents } from './BridgeEvents';

export class AttendanceBridge {
  static sendAttendanceUpdate(attendanceRecord: Record<string, unknown>): void {
    BridgeEvents.emit('STUDENT_ATTENDANCE_UPDATE', {
      record: attendanceRecord,
      action: 'MARKED',
    });

    BridgeEvents.emit('WARDEN_ATTENDANCE_UPDATE', {
      record: attendanceRecord,
      action: 'RECORDED',
    });
  }

  static subscribeToStudentAttendance(
    callback: (data: Record<string, unknown>) => void
  ): () => void {
    return BridgeEvents.on('STUDENT_ATTENDANCE_UPDATE', (msg) => {
      callback(msg.payload);
    });
  }

  static subscribeToWardenAttendance(
    callback: (data: Record<string, unknown>) => void
  ): () => void {
    return BridgeEvents.on('WARDEN_ATTENDANCE_UPDATE', (msg) => {
      callback(msg.payload);
    });
  }
}
