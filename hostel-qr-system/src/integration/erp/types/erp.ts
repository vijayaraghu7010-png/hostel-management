export type ERPEventType =
  | 'STUDY_ATTENDANCE'
  | 'OUTPASS_ENTRY'
  | 'OUTPASS_EXIT'
  | 'SESSION_STARTED'
  | 'SESSION_ENDED';

export interface ERPConfigOptions {
  baseUrl: string;
  apiKey: string;
  timeoutMs: number;
  maxRetries: number;
  retryDelayMs: number;
}

export interface ERPEventPayload<T = Record<string, unknown>> {
  eventId: string;
  eventType: ERPEventType;
  timestamp: string;
  sourceModule: 'STUDY' | 'OUTPASS' | 'SESSION';
  data: T;
}

export interface ERPStandardPayload {
  header: {
    systemId: string;
    eventCode: string;
    sentAt: string;
    version: string;
  };
  body: Record<string, unknown>;
}

export interface ERPResponse {
  success: boolean;
  transactionId: string;
  processedAt: string;
  statusCode: number;
  message: string;
  details?: Record<string, unknown>;
}
