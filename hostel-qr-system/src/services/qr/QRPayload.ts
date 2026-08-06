import type { QRType, UniversalQRPayload } from '@/types/qr';
import { QRSecurity } from '@/utils/security';

export const CURRENT_QR_VERSION = 1;
export const DEFAULT_TTL_SECONDS = 60;

export async function createSignedPayload<T extends Record<string, unknown> = Record<string, unknown>>(
  type: QRType,
  id: string,
  payloadData: T = {} as T,
  ttlSeconds: number = DEFAULT_TTL_SECONDS
): Promise<UniversalQRPayload<T>> {
  const now = Date.now();
  const expiresAt = now + ttlSeconds * 1000;
  const nonce = QRSecurity.generateNonce();

  const basePayload: UniversalQRPayload<T> = {
    version: CURRENT_QR_VERSION,
    type,
    id,
    issuedAt: now,
    expiresAt,
    payload: payloadData,
    nonce,
  };

  const dataToSign = `${basePayload.version}:${basePayload.type}:${basePayload.id}:${basePayload.issuedAt}:${basePayload.expiresAt}:${nonce}`;
  const signature = await QRSecurity.generateSignature(dataToSign);

  return {
    ...basePayload,
    signature,
  };
}

export function createUniversalPayload<T extends Record<string, unknown> = Record<string, unknown>>(
  type: QRType,
  id: string,
  payloadData: T = {} as T,
  ttlSeconds: number = DEFAULT_TTL_SECONDS
): UniversalQRPayload<T> {
  const now = Date.now();
  const expiresAt = now + ttlSeconds * 1000;
  const nonce = QRSecurity.generateNonce();

  return {
    version: CURRENT_QR_VERSION,
    type,
    id,
    issuedAt: now,
    expiresAt,
    payload: payloadData,
    nonce,
  };
}

export function serializePayload<T extends Record<string, unknown>>(
  payload: UniversalQRPayload<T>
): string {
  return JSON.stringify(payload);
}

export function parsePayload<T extends Record<string, unknown> = Record<string, unknown>>(
  jsonString: string
): UniversalQRPayload<T> | null {
  try {
    const data = JSON.parse(jsonString) as unknown;

    if (
      typeof data === 'object' &&
      data !== null &&
      'version' in data &&
      'type' in data &&
      'id' in data &&
      'issuedAt' in data &&
      'expiresAt' in data &&
      'payload' in data
    ) {
      return data as UniversalQRPayload<T>;
    }

    return null;
  } catch {
    return null;
  }
}
