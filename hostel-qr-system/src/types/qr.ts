export type QRType = 'STUDY' | 'OUTPASS' | 'VISITOR' | 'LIBRARY' | 'MESS';

export interface UniversalQRPayload<T = Record<string, unknown>> {
  version: number;
  type: QRType;
  id: string;
  issuedAt: number;
  expiresAt: number;
  payload: T;
  nonce?: string;
  signature?: string;
}

export interface QRGeneratorOptions {
  size?: number;
  margin?: number;
  darkColor?: string;
  lightColor?: string;
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
}

export interface QRState {
  dataUrl: string | null;
  payload: UniversalQRPayload | null;
  rawJson: string | null;
  loading: boolean;
  error: Error | null;
  isExpired: boolean;
  timeRemainingSeconds: number;
}
