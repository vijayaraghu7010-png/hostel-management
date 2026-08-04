import type { ParsedScanResult } from '@/types/scanner';
import { QRParser } from './QRParser';

export class ScanRouter {
  private recentScansMap: Map<string, number> = new Map();
  private duplicateIntervalMs: number;

  constructor(duplicateIntervalMs: number = 3000) {
    this.duplicateIntervalMs = duplicateIntervalMs;
  }

  processScan(rawText: string): { result: ParsedScanResult; isDuplicate: boolean } {
    const result = QRParser.parse(rawText);
    const now = Date.now();

    // Create unique key for duplicate check
    const scanKey = result.parsedPayload?.id
      ? `${result.type}_${result.parsedPayload.id}`
      : rawText;

    const lastSeenTime = this.recentScansMap.get(scanKey);

    if (lastSeenTime && now - lastSeenTime < this.duplicateIntervalMs) {
      return { result, isDuplicate: true };
    }

    // Record new scan timestamp
    this.recentScansMap.set(scanKey, now);
    this.cleanExpiredCache(now);

    return { result, isDuplicate: false };
  }

  resetDuplicateFilter(): void {
    this.recentScansMap.clear();
  }

  private cleanExpiredCache(now: number): void {
    if (this.recentScansMap.size > 100) {
      for (const [key, timestamp] of this.recentScansMap.entries()) {
        if (now - timestamp > this.duplicateIntervalMs * 2) {
          this.recentScansMap.delete(key);
        }
      }
    }
  }
}
