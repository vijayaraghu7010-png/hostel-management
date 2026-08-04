export type AuditCategory = 'SCAN' | 'ATTENDANCE' | 'AUTH' | 'ERP' | 'SYSTEM';

export interface AuditLogEntry {
  id: string;
  category: AuditCategory;
  action: string;
  details: Record<string, unknown>;
  timestamp: string;
}

const AUDIT_STORAGE_KEY = 'hms_audit_logs_v1';
const MAX_LOG_ENTRIES = 200;

export class AuditLogger {
  static log(
    category: AuditCategory,
    action: string,
    details: Record<string, unknown> = {}
  ): AuditLogEntry {
    const entry: AuditLogEntry = {
      id: `LOG-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      category,
      action,
      details,
      timestamp: new Date().toISOString(),
    };

    const stored = this.getLogs();
    stored.unshift(entry);

    if (stored.length > MAX_LOG_ENTRIES) {
      stored.length = MAX_LOG_ENTRIES;
    }

    try {
      localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(stored));
    } catch {
      // LocalStorage write error fallback
    }

    return entry;
  }

  static getLogs(): AuditLogEntry[] {
    try {
      const data = localStorage.getItem(AUDIT_STORAGE_KEY);
      return data ? (JSON.parse(data) as AuditLogEntry[]) : [];
    } catch {
      return [];
    }
  }

  static clearLogs(): void {
    try {
      localStorage.removeItem(AUDIT_STORAGE_KEY);
    } catch {
      // Storage remove error fallback
    }
  }
}
