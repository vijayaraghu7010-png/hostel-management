import type { QRType, UniversalQRPayload } from './qr';

export type ExtendedQRType = QRType | 'UNKNOWN';

export interface CameraDevice {
  deviceId: string;
  label: string;
  isBackCamera: boolean;
}

export interface ParsedScanResult {
  rawText: string;
  type: ExtendedQRType;
  parsedPayload: UniversalQRPayload | null;
  isValid: boolean;
  reason?: string;
  timestamp: number;
}

export interface ScannerState {
  isInitializing: boolean;
  isScanning: boolean;
  isPaused: boolean;
  hasPermission: boolean | null;
  permissionError: string | null;
  torchSupported: boolean;
  torchOn: boolean;
  selectedCameraId: string | null;
  availableCameras: CameraDevice[];
}

export interface ScannerOptions {
  autoStart?: boolean;
  preferredFacingMode?: 'user' | 'environment';
  duplicateIntervalMs?: number;
}
