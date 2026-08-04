/**
 * Props accepted by the QRGenerator component.
 */
export interface QRGeneratorProps {
  /** The data string to encode into the QR code. Must be non-empty. */
  readonly value: string;

  /** Width and height of the rendered QR code in pixels. @default 240 */
  readonly size?: number;

  /** Foreground (dark module) colour as a CSS hex string. @default "#000000" */
  readonly foreground?: string;

  /** Background colour as a CSS hex string. @default "#ffffff" */
  readonly background?: string;

  /** Optional CSS class name applied to the outermost wrapper element. */
  readonly className?: string;
}

/**
 * Internal state tracked while generating a QR data-URL.
 */
export interface QRGeneratorState {
  /** Base-64 data-URL of the generated QR image, or `null` while loading / on error. */
  readonly dataUrl: string | null;

  /** Whether a generation pass is currently in progress. */
  readonly isLoading: boolean;

  /** Human-readable error message, or `null` when no error has occurred. */
  readonly error: string | null;
}

/**
 * Options forwarded to the underlying `qrcode` library renderer.
 */
export interface QRRenderOptions {
  readonly width: number;
  readonly margin: number;
  readonly errorCorrectionLevel: "L" | "M" | "Q" | "H";
  readonly color: {
    readonly dark: string;
    readonly light: string;
  };
}
