import type {
  ERPEventType,
  ERPEventPayload,
  ERPStandardPayload,
} from './types/erp';

export class ERPMapper {
  static toStandardERPPayload<T = Record<string, unknown>>(
    event: ERPEventPayload<T>
  ): ERPStandardPayload {
    return {
      header: {
        systemId: 'HOSTEL_QR_PORTAL_V1',
        eventCode: event.eventType,
        sentAt: event.timestamp || new Date().toISOString(),
        version: '1.0.0',
      },
      body: {
        eventId: event.eventId,
        sourceModule: event.sourceModule,
        data: event.data as Record<string, unknown>,
      },
    };
  }

  static createEventPayload<T extends Record<string, unknown>>(
    eventType: ERPEventType,
    sourceModule: 'STUDY' | 'OUTPASS' | 'SESSION',
    data: T
  ): ERPEventPayload<T> {
    return {
      eventId: `EVT-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      eventType,
      timestamp: new Date().toISOString(),
      sourceModule,
      data,
    };
  }
}
