import type {
  ERPEventType,
  ERPEventPayload,
  ERPResponse,
} from './types/erp';
import { ERPEvents } from './ERPEvents';
import { ERPMapper } from './ERPMapper';
import { ERPClient } from './ERPClient';
import { ERPError } from './ERPError';

const ERP_QUEUE_STORAGE_KEY = 'hms_erp_event_queue_v1';

export class ERPConnector {
  private static isProcessingQueue = false;

  static async sendEvent<T extends Record<string, unknown> = Record<string, unknown>>(
    eventType: ERPEventType,
    sourceModule: 'STUDY' | 'OUTPASS' | 'SESSION',
    data: T
  ): Promise<ERPResponse> {
    const eventPayload = ERPMapper.createEventPayload(eventType, sourceModule, data);

    // Emit event locally first so reactive components can subscribe
    await ERPEvents.emit(eventPayload);

    const standardPayload = ERPMapper.toStandardERPPayload(eventPayload);

    try {
      const response = await ERPClient.post('erp_events', standardPayload);
      return response;
    } catch (err: unknown) {
      // Queue event for background retry on network/server error
      this.enqueueFailedEvent(eventPayload);

      const errorMessage = err instanceof ERPError ? err.message : 'Failed to transmit event to ERP';

      return {
        success: false,
        transactionId: eventPayload.eventId,
        processedAt: new Date().toISOString(),
        statusCode: err instanceof ERPError ? err.statusCode || 500 : 500,
        message: `${errorMessage} (Queued for background retry)`,
      };
    }
  }

  static async sendStudyAttendance(attendanceData: Record<string, unknown>): Promise<ERPResponse> {
    return this.sendEvent('STUDY_ATTENDANCE', 'STUDY', attendanceData);
  }

  static async sendOutpassScan(
    outpassData: Record<string, unknown>,
    actionType: 'EXIT' | 'ENTRY'
  ): Promise<ERPResponse> {
    const eventType: ERPEventType = actionType === 'EXIT' ? 'OUTPASS_EXIT' : 'OUTPASS_ENTRY';
    return this.sendEvent(eventType, 'OUTPASS', outpassData);
  }

  static async sendSessionEvent(
    sessionData: Record<string, unknown>,
    eventType: 'SESSION_STARTED' | 'SESSION_ENDED'
  ): Promise<ERPResponse> {
    return this.sendEvent(eventType, 'SESSION', sessionData);
  }

  private static enqueueFailedEvent(eventPayload: ERPEventPayload): void {
    try {
      const queue = this.getQueuedEvents();
      queue.push(eventPayload);
      localStorage.setItem(ERP_QUEUE_STORAGE_KEY, JSON.stringify(queue));
    } catch {
      // Storage write error ignore
    }
  }

  static getQueuedEvents(): ERPEventPayload[] {
    try {
      const data = localStorage.getItem(ERP_QUEUE_STORAGE_KEY);
      return data ? (JSON.parse(data) as ERPEventPayload[]) : [];
    } catch {
      return [];
    }
  }

  static async flushQueue(): Promise<number> {
    if (this.isProcessingQueue) return 0;
    this.isProcessingQueue = true;

    const queue = this.getQueuedEvents();
    if (queue.length === 0) {
      this.isProcessingQueue = false;
      return 0;
    }

    const remainingQueue: ERPEventPayload[] = [];
    let successCount = 0;

    for (const event of queue) {
      const standardPayload = ERPMapper.toStandardERPPayload(event);
      try {
        await ERPClient.post('erp_events', standardPayload);
        successCount++;
      } catch {
        remainingQueue.push(event);
      }
    }

    localStorage.setItem(ERP_QUEUE_STORAGE_KEY, JSON.stringify(remainingQueue));
    this.isProcessingQueue = false;

    return successCount;
  }
}
