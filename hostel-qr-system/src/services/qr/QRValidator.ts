import type { QRType, UniversalQRPayload } from '@/types/qr';
import { QRSecurity } from '@/utils/security';

export interface ValidationResult {
  isValid: boolean;
  reason?: string;
}

const SUPPORTED_TYPES: Set<QRType> = new Set([
  'STUDY',
  'OUTPASS',
  'VISITOR',
  'LIBRARY',
  'MESS',
]);

export function isExpired(expiresAt: number, now: number = Date.now()): boolean {
  return now >= expiresAt;
}

export function getTimeRemainingSeconds(expiresAt: number, now: number = Date.now()): number {
  const diffMs = expiresAt - now;
  return Math.max(0, Math.ceil(diffMs / 1000));
}

export function validatePayload(data: unknown): ValidationResult {
  if (typeof data !== 'object' || data === null) {
    return { isValid: false, reason: 'Invalid JSON payload format' };
  }

  const payloadObj = data as Record<string, unknown>;

  if (typeof payloadObj.version !== 'number' || payloadObj.version < 1) {
    return { isValid: false, reason: 'Unsupported or invalid payload version' };
  }

  if (
    typeof payloadObj.type !== 'string' ||
    !SUPPORTED_TYPES.has(payloadObj.type as QRType)
  ) {
    return { isValid: false, reason: `Unsupported QR payload type: ${String(payloadObj.type)}` };
  }

  if (typeof payloadObj.id !== 'string' || !payloadObj.id.trim()) {
    return { isValid: false, reason: 'Missing or invalid identifier' };
  }

  if (typeof payloadObj.issuedAt !== 'number' || typeof payloadObj.expiresAt !== 'number') {
    return { isValid: false, reason: 'Missing or invalid timestamps' };
  }

  if (isExpired(payloadObj.expiresAt)) {
    return { isValid: false, reason: 'QR code has expired' };
  }

  // Anti-Replay Nonce Validation
  if (payloadObj.nonce && typeof payloadObj.nonce === 'string') {
    if (QRSecurity.isNonceReplayed(payloadObj.nonce, payloadObj.issuedAt as number)) {
      return { isValid: false, reason: 'Security Error: Replayed QR code detected' };
    }
  }

  return { isValid: true };
}

export async function validateSignedPayload(payload: UniversalQRPayload): Promise<ValidationResult> {
  const basicValidation = validatePayload(payload);
  if (!basicValidation.isValid) return basicValidation;

  if (payload.signature && payload.nonce) {
    const dataToSign = `${payload.version}:${payload.type}:${payload.id}:${payload.issuedAt}:${payload.expiresAt}:${payload.nonce}`;
    const isValidSignature = await QRSecurity.verifySignature(dataToSign, payload.signature);

    if (!isValidSignature) {
      return { isValid: false, reason: 'Security Error: Tampered QR signature detected' };
    }
  }

  return { isValid: true };
}

export function isValidUniversalPayload(
  payload: UniversalQRPayload
): boolean {
  return validatePayload(payload).isValid;
}
