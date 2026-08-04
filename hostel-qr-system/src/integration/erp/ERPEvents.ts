import type { ERPEventType, ERPEventPayload } from './types/erp';

export type ERPEventListener<T = Record<string, unknown>> = (
  event: ERPEventPayload<T>
) => void | Promise<void>;

export class ERPEvents {
  private static listeners: Map<string, Set<ERPEventListener>> = new Map();

  static on<T = Record<string, unknown>>(
    eventType: ERPEventType,
    listener: ERPEventListener<T>
  ): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }

    const set = this.listeners.get(eventType)!;
    set.add(listener as ERPEventListener);

    return () => this.off(eventType, listener);
  }

  static off<T = Record<string, unknown>>(
    eventType: ERPEventType,
    listener: ERPEventListener<T>
  ): void {
    const set = this.listeners.get(eventType);
    if (set) {
      set.delete(listener as ERPEventListener);
    }
  }

  static async emit<T = Record<string, unknown>>(
    event: ERPEventPayload<T>
  ): Promise<void> {
    const set = this.listeners.get(event.eventType);
    if (!set || set.size === 0) return;

    const promises: Promise<void>[] = [];

    set.forEach((listener) => {
      try {
        const result = listener(event as ERPEventPayload);
        if (result && typeof result.then === 'function') {
          promises.push(result);
        }
      } catch {
        // Suppress listener invocation error to keep emitter robust
      }
    });

    if (promises.length > 0) {
      await Promise.allSettled(promises);
    }
  }

  static removeAllListeners(): void {
    this.listeners.clear();
  }
}
