import type { ParsedScanResult, ExtendedQRType } from '@/types/scanner';
import type { UniversalQRPayload, QRType } from '@/types/qr';
import { parsePayload } from '@/services/qr/QRPayload';
import { validatePayload } from '@/services/qr/QRValidator';

export class QRParser {
  static parse(rawText: string): ParsedScanResult {
    const timestamp = Date.now();

    if (!rawText || !rawText.trim()) {
      return {
        rawText,
        type: 'UNKNOWN',
        parsedPayload: null,
        isValid: false,
        reason: 'Empty QR code text',
        timestamp,
      };
    }

    const universalPayload = parsePayload(rawText);

    if (universalPayload) {
      const validation = validatePayload(universalPayload);
      const isKnownType = [
        'STUDY',
        'OUTPASS',
        'VISITOR',
        'LIBRARY',
        'MESS',
      ].includes(universalPayload.type);

      const type: ExtendedQRType = isKnownType
        ? (universalPayload.type as QRType)
        : 'UNKNOWN';

      return {
        rawText,
        type,
        parsedPayload: universalPayload as UniversalQRPayload,
        isValid: validation.isValid,
        reason: validation.reason,
        timestamp,
      };
    }

    // Non-universal payload (legacy or raw string fallback)
    return {
      rawText,
      type: 'UNKNOWN',
      parsedPayload: null,
      isValid: false,
      reason: 'Non-universal payload format',
      timestamp,
    };
  }
}
