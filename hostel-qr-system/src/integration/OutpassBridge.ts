import { BridgeEvents } from './BridgeEvents';

export class OutpassBridge {
  static sendOutpassUpdate(outpassRecord: Record<string, unknown>): void {
    BridgeEvents.emit('STUDENT_OUTPASS_UPDATE', {
      outpass: outpassRecord,
      action: 'UPDATED',
    });
  }

  static sendGateVerification(
    outpassRecord: Record<string, unknown>,
    actionType: 'EXIT' | 'ENTRY'
  ): void {
    BridgeEvents.emit('WARDEN_OUTPASS_VERIFY', {
      outpass: outpassRecord,
      actionType,
      action: 'VERIFIED',
    });
  }

  static subscribeToStudentOutpass(
    callback: (data: Record<string, unknown>) => void
  ): () => void {
    return BridgeEvents.on('STUDENT_OUTPASS_UPDATE', (msg) => {
      callback(msg.payload);
    });
  }

  static subscribeToWardenOutpassVerify(
    callback: (data: Record<string, unknown>) => void
  ): () => void {
    return BridgeEvents.on('WARDEN_OUTPASS_VERIFY', (msg) => {
      callback(msg.payload);
    });
  }
}
