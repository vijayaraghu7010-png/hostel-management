import type { BridgeState, BridgeConfig } from './BridgeTypes';
import { BridgeEvents } from './BridgeEvents';
import { StudentBridge } from './StudentBridge';
import { WardenBridge } from './WardenBridge';
import { SessionBridge } from './SessionBridge';
import { AttendanceBridge } from './AttendanceBridge';
import { OutpassBridge } from './OutpassBridge';

export class ERPBridge {
  private static state: BridgeState = {
    isConnected: true,
    isConnecting: false,
    lastConnectedAt: new Date().toISOString(),
    reconnectAttempts: 0,
    queuedMessagesCount: 0,
  };

  private static config: BridgeConfig = {
    supabaseUrl: import.meta.env.VITE_SUPABASE_URL || 'https://jxdsuhutztvuoknkypay.supabase.co',
    supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
    timeoutMs: 10000,
    maxRetries: 5,
    retryDelayMs: 2000,
    enableBroadcastChannel: true,
  };

  static connect(): BridgeState {
    this.state = {
      ...this.state,
      isConnected: true,
      isConnecting: false,
      lastConnectedAt: new Date().toISOString(),
      reconnectAttempts: 0,
      error: undefined,
    };

    BridgeEvents.init();
    return { ...this.state };
  }

  static getState(): BridgeState {
    return { ...this.state };
  }

  static getConfig(): BridgeConfig {
    return { ...this.config };
  }

  static disconnect(): void {
    BridgeEvents.close();
    this.state = {
      ...this.state,
      isConnected: false,
      isConnecting: false,
    };
  }

  public static Student = StudentBridge;
  public static Warden = WardenBridge;
  public static Session = SessionBridge;
  public static Attendance = AttendanceBridge;
  public static Outpass = OutpassBridge;
  public static Events = BridgeEvents;
}
