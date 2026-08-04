import type { BridgeEventType, BridgeMessage } from './BridgeTypes';

export type BridgeEventListener<T = Record<string, unknown>> = (
  message: BridgeMessage<T>
) => void;

const CHANNEL_NAME = 'hms_erp_portal_bridge_channel';

export class BridgeEvents {
  private static broadcastChannel: BroadcastChannel | null = null;
  private static listeners: Map<string, Set<BridgeEventListener>> = new Map();

  static init(): void {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window && !this.broadcastChannel) {
      try {
        this.broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
        this.broadcastChannel.onmessage = (event: MessageEvent<BridgeMessage>) => {
          this.dispatch(event.data);
        };
      } catch {
        // Fallback to window message listener if BroadcastChannel fails
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('message', (event: MessageEvent) => {
        if (event.data && typeof event.data === 'object' && 'type' in event.data && 'source' in event.data) {
          this.dispatch(event.data as BridgeMessage);
        }
      });
    }
  }

  static on<T = Record<string, unknown>>(
    eventType: BridgeEventType,
    listener: BridgeEventListener<T>
  ): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }

    const set = this.listeners.get(eventType)!;
    set.add(listener as BridgeEventListener);

    return () => this.off(eventType, listener);
  }

  static off<T = Record<string, unknown>>(
    eventType: BridgeEventType,
    listener: BridgeEventListener<T>
  ): void {
    const set = this.listeners.get(eventType);
    if (set) {
      set.delete(listener as BridgeEventListener);
    }
  }

  static emit<T extends Record<string, unknown> = Record<string, unknown>>(
    type: BridgeEventType,
    payload: T,
    source: 'ERP' | 'PORTAL' = 'PORTAL',
    target: 'ERP' | 'PORTAL' = 'ERP'
  ): BridgeMessage<T> {
    const message: BridgeMessage<T> = {
      id: `MSG-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type,
      source,
      target,
      payload,
      timestamp: new Date().toISOString(),
    };

    // 1. Dispatch locally
    this.dispatch(message as BridgeMessage);

    // 2. Broadcast via BroadcastChannel
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(message);
      } catch {
        // Channel post error fallback
      }
    }

    // 3. Post to parent / child window
    if (typeof window !== 'undefined') {
      if (window.opener) {
        window.opener.postMessage(message, '*');
      }
      if (window.parent && window.parent !== window) {
        window.parent.postMessage(message, '*');
      }
    }

    return message;
  }

  private static dispatch(message: BridgeMessage): void {
    if (!message || !message.type) return;

    const set = this.listeners.get(message.type);
    if (set && set.size > 0) {
      set.forEach((listener) => {
        try {
          listener(message);
        } catch {
          // Suppress listener exception
        }
      });
    }
  }

  static close(): void {
    if (this.broadcastChannel) {
      this.broadcastChannel.close();
      this.broadcastChannel = null;
    }
    this.listeners.clear();
  }
}

// Auto-initialize event bus
BridgeEvents.init();
