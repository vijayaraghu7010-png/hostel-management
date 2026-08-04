export type BridgeEventType =
  | 'STUDENT_OPEN_PORTAL'
  | 'STUDENT_ATTENDANCE_UPDATE'
  | 'STUDENT_SESSION_UPDATE'
  | 'STUDENT_OUTPASS_UPDATE'
  | 'WARDEN_OPEN_SCANNER'
  | 'WARDEN_SCAN_EVENT'
  | 'WARDEN_ATTENDANCE_UPDATE'
  | 'WARDEN_OUTPASS_VERIFY';

export interface BridgeMessage<T = Record<string, unknown>> {
  id: string;
  type: BridgeEventType;
  source: 'ERP' | 'PORTAL';
  target: 'ERP' | 'PORTAL';
  payload: T;
  timestamp: string;
  correlationId?: string;
}

export interface BridgeConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  timeoutMs: number;
  maxRetries: number;
  retryDelayMs: number;
  enableBroadcastChannel: boolean;
}

export interface BridgeState {
  isConnected: boolean;
  isConnecting: boolean;
  lastConnectedAt?: string;
  reconnectAttempts: number;
  queuedMessagesCount: number;
  error?: string;
}
