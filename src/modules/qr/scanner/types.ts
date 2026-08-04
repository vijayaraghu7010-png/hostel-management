import type { IScannerControls } from "@zxing/browser";

/* ------------------------------------------------------------------ */
/*  Enumerations                                                        */
/* ------------------------------------------------------------------ */

/** All possible states the scanner UI can be in. */
export type ScannerStatus =
  | "idle"
  | "requesting"
  | "scanning"
  | "success"
  | "permission_denied"
  | "camera_not_found"
  | "error";

/* ------------------------------------------------------------------ */
/*  Camera / device info                                               */
/* ------------------------------------------------------------------ */

/** Wrapper around a MediaDeviceInfo with extra metadata. */
export interface CameraDevice {
  readonly deviceId: string;
  readonly label: string;
  /** True when the device faces away from the user (back/environment). */
  readonly isRearFacing: boolean;
}

/* ------------------------------------------------------------------ */
/*  Hook state                                                          */
/* ------------------------------------------------------------------ */

/** State returned by the `useCamera` hook. */
export interface UseCameraState {
  readonly status: ScannerStatus;
  readonly devices: ReadonlyArray<CameraDevice>;
  readonly activeDeviceIndex: number;
  readonly hasTorch: boolean;
  readonly torchOn: boolean;
  readonly error: Error | null;
}

/** Actions returned by the `useCamera` hook. */
export interface UseCameraActions {
  /** Start the camera and begin continuous decode. */
  start: () => Promise<void>;
  /** Stop scanning and release all tracks. */
  stop: () => void;
  /** Switch to the next available camera. */
  switchCamera: () => void;
  /** Toggle the torch (flashlight). */
  toggleTorch: () => Promise<void>;
  /** Retry after a failure. */
  retry: () => Promise<void>;
}

/** Full return type of `useCamera`. */
export interface UseCameraReturn extends UseCameraState, UseCameraActions {
  /** Ref to attach to the <video> element in JSX. */
  readonly videoRef: React.RefObject<HTMLVideoElement>;
  /** Live IScannerControls reference (may be null when stopped). */
  readonly controlsRef: React.MutableRefObject<IScannerControls | null>;
}

/* ------------------------------------------------------------------ */
/*  Component props                                                     */
/* ------------------------------------------------------------------ */

/** Props for the top-level <QRScanner> component. */
export interface QRScannerProps {
  /** Called once with the decoded text immediately after a successful scan. */
  onScan: (result: string) => void;
  /** Called when an unrecoverable error occurs. */
  onError: (error: Error) => void;
  /** Called when the user clicks the Cancel button. */
  onClose?: () => void;
  /** Optional CSS class on the outermost wrapper. */
  className?: string;
}

/** Props for the glassmorphism overlay layer. */
export interface ScannerOverlayProps {
  /** Whether the animated scan line should be visible. */
  readonly isScanning: boolean;
  /** Whether a torch-toggle button should be shown. */
  readonly hasTorch: boolean;
  /** Current torch state. */
  readonly torchOn: boolean;
  /** How many cameras are available (shows switch button when > 1). */
  readonly cameraCount: number;
  onToggleTorch: () => void;
  onSwitchCamera: () => void;
  onCancel?: () => void;
}
