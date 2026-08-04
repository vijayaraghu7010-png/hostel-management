import React, { useEffect, useRef, useState, useCallback } from "react";
import QRCode from "qrcode";
import type { QRGeneratorProps, QRGeneratorState, QRRenderOptions } from "./types";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const DEFAULT_SIZE = 240;
const DEFAULT_FOREGROUND = "#000000";
const DEFAULT_BACKGROUND = "#ffffff";
const ERROR_CORRECTION: QRRenderOptions["errorCorrectionLevel"] = "H";
const QR_MARGIN = 2;

/* ------------------------------------------------------------------ */
/*  Styles (inline objects – zero external CSS dependencies)           */
/* ------------------------------------------------------------------ */

const wrapperStyle: React.CSSProperties = {
  display: "inline-flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  maxWidth: "100%",
};

const imageBaseStyle: React.CSSProperties = {
  display: "block",
  maxWidth: "100%",
  height: "auto",
  borderRadius: 8,
  transition: "opacity 0.25s ease-in-out",
};

const statusBoxStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 8,
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  fontSize: 14,
  lineHeight: 1.4,
  textAlign: "center",
  padding: 16,
  boxSizing: "border-box",
};

/* ------------------------------------------------------------------ */
/*  Spinner (pure-CSS keyframe via inline style-tag)                   */
/* ------------------------------------------------------------------ */

const SPINNER_ID = "qrgen-spinner-keyframes";

function ensureSpinnerKeyframes(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById(SPINNER_ID)) return;

  const style = document.createElement("style");
  style.id = SPINNER_ID;
  style.textContent = `@keyframes qrgen-spin{to{transform:rotate(360deg)}}`;
  document.head.appendChild(style);
}

const spinnerStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  border: "3px solid rgba(128,128,128,0.25)",
  borderTopColor: "#666",
  borderRadius: "50%",
  animation: "qrgen-spin 0.7s linear infinite",
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

/**
 * A reusable, self-contained QR code generator built on top of the
 * `qrcode` npm package.
 *
 * Features
 * --------
 * - Auto-regenerates whenever `value`, `size`, `foreground`, or
 *   `background` props change.
 * - Renders a high-quality (error-correction level H) QR code as a
 *   `<img>` element using a base-64 data-URL.
 * - Fully responsive — the image never overflows its container.
 * - Exposes loading and error UI states.
 * - Supports dark-mode via the `foreground` / `background` props.
 * - Strict TypeScript — no `any`, no `console.log`.
 */
const QRGenerator: React.FC<QRGeneratorProps> = ({
  value,
  size = DEFAULT_SIZE,
  foreground = DEFAULT_FOREGROUND,
  background = DEFAULT_BACKGROUND,
  className,
}) => {
  /* ---- local state ------------------------------------------------ */

  const [state, setState] = useState<QRGeneratorState>({
    dataUrl: null,
    isLoading: false,
    error: null,
  });

  /**
   * Track the latest render "generation" so we can discard stale
   * promises when props change faster than the encoder resolves.
   */
  const generationRef = useRef<number>(0);

  /* ---- inject spinner keyframes once ------------------------------ */

  useEffect(() => {
    ensureSpinnerKeyframes();
  }, []);

  /* ---- QR generation ---------------------------------------------- */

  const generate = useCallback(async (): Promise<void> => {
    /* Bump generation counter; capture the current value so we can
       compare it when the promise resolves. */
    generationRef.current += 1;
    const thisGeneration = generationRef.current;

    if (!value) {
      setState({ dataUrl: null, isLoading: false, error: "No value provided." });
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    const options: QRRenderOptions = {
      width: size,
      margin: QR_MARGIN,
      errorCorrectionLevel: ERROR_CORRECTION,
      color: { dark: foreground, light: background },
    };

    try {
      const url: string = await (QRCode as { toDataURL(text: string, opts: QRRenderOptions): Promise<string> }).toDataURL(
        value,
        options,
      );

      /* Only apply if this is still the latest generation. */
      if (thisGeneration === generationRef.current) {
        setState({ dataUrl: url, isLoading: false, error: null });
      }
    } catch (err: unknown) {
      if (thisGeneration === generationRef.current) {
        const message =
          err instanceof Error ? err.message : "QR code generation failed.";
        setState({ dataUrl: null, isLoading: false, error: message });
      }
    }
  }, [value, size, foreground, background]);

  useEffect(() => {
    void generate();
  }, [generate]);

  /* ---- render ----------------------------------------------------- */

  const boxDimensions: React.CSSProperties = {
    width: size,
    height: size,
    maxWidth: "100%",
  };

  /* Loading state */
  if (state.isLoading) {
    return (
      <div
        className={className}
        style={{ ...wrapperStyle }}
        role="status"
        aria-label="Generating QR code"
      >
        <div style={{ ...statusBoxStyle, ...boxDimensions, background }}>
          <div style={spinnerStyle} />
        </div>
      </div>
    );
  }

  /* Error state */
  if (state.error) {
    return (
      <div className={className} style={{ ...wrapperStyle }} role="alert">
        <div
          style={{
            ...statusBoxStyle,
            ...boxDimensions,
            background: "rgba(220, 38, 38, 0.08)",
            color: "#dc2626",
            border: "1px solid rgba(220, 38, 38, 0.25)",
          }}
        >
          <span>{state.error}</span>
        </div>
      </div>
    );
  }

  /* Success state */
  if (state.dataUrl) {
    return (
      <div className={className} style={{ ...wrapperStyle }}>
        <img
          src={state.dataUrl}
          alt={`QR code for: ${value}`}
          width={size}
          height={size}
          style={{ ...imageBaseStyle, opacity: 1 }}
        />
      </div>
    );
  }

  /* Idle / empty value — render nothing */
  return null;
};

QRGenerator.displayName = "QRGenerator";

export default QRGenerator;
