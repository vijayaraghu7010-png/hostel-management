import { BridgeEvents } from './BridgeEvents';

export class SessionBridge {
  static notifySessionStarted(sessionData: Record<string, unknown>): void {
    BridgeEvents.emit('STUDENT_SESSION_UPDATE', {
      session: sessionData,
      status: 'ACTIVE',
      action: 'STARTED',
    });
  }

  static notifySessionEnded(sessionData: Record<string, unknown>): void {
    BridgeEvents.emit('STUDENT_SESSION_UPDATE', {
      session: sessionData,
      status: 'ENDED',
      action: 'ENDED',
    });
  }

  static subscribeToSessionChanges(
    callback: (data: Record<string, unknown>) => void
  ): () => void {
    return BridgeEvents.on('STUDENT_SESSION_UPDATE', (msg) => {
      callback(msg.payload);
    });
  }
}
