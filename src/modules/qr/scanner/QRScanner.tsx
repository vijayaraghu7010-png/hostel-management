import React, { useEffect } from "react";
import ScannerOverlay from "./ScannerOverlay";
import { useCamera } from "./useCamera";
import type { QRScannerProps } from "./types";

/* ------------------------------------------------------------------ */
/*  Font + base keyframe injection                                      */
/* ------------------------------------------------------------------ */

const BASE_STYLE_ID = "qr-scanner-base";

function ensureBaseStyles(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById(BASE_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = BASE_STYLE_ID;
  style.textContent = `
    @keyframes qrs-spinner {
      to { transform: rotate(360deg); }
    }
    @keyframes qrs-fade-up {
      from { opacity: 0; transform: translateY(16px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .qrs-video {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      background: #000;
    }
  `;
  document.head.appendChild(style);
}

/* ------------------------------------------------------------------ */
/*  Shared layout constants                                             */
/* ------------------------------------------------------------------ */

const FONT =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

const containerStyle: React.CSSProperties = {
  position: "relative",
  width: "100%",
  height: "100%",
  minHeight: 300,
  background: "#000",
  overflow: "hidden",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: FONT,
};

/* ------------------------------------------------------------------ */
/*  Status screens                                                      */
/* ------------------------------------------------------------------ */

interface StatusScreenProps {
  emoji: string;
  title: string;
  body: string;
  onRetry?: () => void;
  onCancel?: () => void;
}

function StatusScreen({
  emoji,
  title,
  body,
  onRetry,
  onCancel,
}: StatusScreenProps): React.ReactElement {
  const cardStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 12,
    padding: "32px 28px",
    borderRadius: 20,
    background: "rgba(255,255,255,0.08)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    border: "1px solid rgba(255,255,255,0.14)",
    color: "#fff",
    maxWidth: 320,
    width: "90%",
    animation: "qrs-fade-up 0.35s ease-out both",
    textAlign: "center",
  };

  const btnStyle = (primary: boolean): React.CSSProperties => ({
    marginTop: 4,
    padding: "10px 24px",
    borderRadius: 100,
    border: primary ? "none" : "1px solid rgba(255,255,255,0.25)",
    background: primary
      ? "linear-gradient(135deg,#4ade80,#22c55e)"
      : "rgba(255,255,255,0.1)",
    color: primary ? "#000" : "#fff",
    fontFamily: FONT,
    fontWeight: 600,
    fontSize: 14,
    cursor: "pointer",
    transition: "opacity 0.15s",
    minWidth: 100,
  });

  return (
    <div style={cardStyle}>
      <span style={{ fontSize: 44, lineHeight: 1 }}>{emoji}</span>
      <h2
        style={{
          margin: 0,
          fontSize: 18,
          fontWeight: 700,
          letterSpacing: "-0.01em",
        }}
      >
        {title}
      </h2>
      <p
        style={{
          margin: 0,
          fontSize: 14,
          color: "rgba(255,255,255,0.65)",
          lineHeight: 1.55,
        }}
      >
        {body}
      </p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center", marginTop: 4 }}>
        {onRetry && (
          <button type="button" style={btnStyle(true)} onClick={onRetry}>
            Try Again
          </button>
        )}
        {onCancel && (
          <button type="button" style={btnStyle(false)} onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Loading spinner                                                     */
/* ------------------------------------------------------------------ */

function LoadingScreen(): React.ReactElement {
  const spinnerStyle: React.CSSProperties = {
    width: 44,
    height: 44,
    border: "3px solid rgba(255,255,255,0.15)",
    borderTopColor: "#4ade80",
    borderRadius: "50%",
    animation: "qrs-spinner 0.8s linear infinite",
  };
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 18,
        color: "rgba(255,255,255,0.75)",
        fontSize: 14,
        animation: "qrs-fade-up 0.3s ease-out both",
      }}
      role="status"
      aria-label="Opening camera"
    >
      <div style={spinnerStyle} />
      <span>Opening camera…</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  QRScanner                                                           */
/* ------------------------------------------------------------------ */

/**
 * Standalone, full-screen QR code scanner.
 *
 * Usage:
 * ```tsx
 * <QRScanner
 *   onScan={(text) => { … }}
 *   onError={(err) => { … }}
 *   onClose={() => { … }}
 * />
 * ```
 *
 * Features
 * --------
 * - Automatic camera permission request on mount.
 * - Prefers rear/back camera on mobile devices.
 * - Camera switch support when multiple cameras are available.
 * - Torch (flashlight) toggle when supported by the browser/device.
 * - Continuous decoding via ZXing BrowserMultiFormatReader.
 * - Stops immediately after the first successful scan.
 * - Dedicated loading, permission-denied, camera-not-found, and error screens.
 * - Retry button on all error screens.
 * - Glassmorphism overlay with animated scan line and corner brackets.
 * - Responsive — works on Android Chrome, Samsung Internet, iPhone Safari, desktop.
 * - Full cleanup on unmount (no memory leaks).
 */
const QRScanner: React.FC<QRScannerProps> = ({
  onScan,
  onError,
  onClose,
  className,
}) => {
  const {
    status,
    devices,
    hasTorch,
    torchOn,
    videoRef,
    start,
    stop,
    switchCamera,
    toggleTorch,
    retry,
  } = useCamera(onScan, onError);

  /* Auto-start on mount */
  useEffect(() => {
    ensureBaseStyles();
    void start();
    return () => {
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCancel = (): void => {
    stop();
    onClose?.();
  };

  /* ---- render: loading ------------------------------------------ */
  if (status === "idle" || status === "requesting") {
    return (
      <div style={containerStyle} className={className}>
        <LoadingScreen />
      </div>
    );
  }

  /* ---- render: permission denied -------------------------------- */
  if (status === "permission_denied") {
    return (
      <div style={containerStyle} className={className}>
        <StatusScreen
          emoji="🔒"
          title="Camera Permission Denied"
          body="Please allow camera access in your browser settings and try again."
          onRetry={() => void retry()}
          onCancel={onClose ? handleCancel : undefined}
        />
      </div>
    );
  }

  /* ---- render: camera not found --------------------------------- */
  if (status === "camera_not_found") {
    return (
      <div style={containerStyle} className={className}>
        <StatusScreen
          emoji="📷"
          title="No Camera Found"
          body="We couldn't find a camera on this device. Make sure it's connected and try again."
          onRetry={() => void retry()}
          onCancel={onClose ? handleCancel : undefined}
        />
      </div>
    );
  }

  /* ---- render: generic error ------------------------------------ */
  if (status === "error") {
    return (
      <div style={containerStyle} className={className}>
        <StatusScreen
          emoji="⚠️"
          title="Something Went Wrong"
          body="An unexpected error occurred while starting the camera."
          onRetry={() => void retry()}
          onCancel={onClose ? handleCancel : undefined}
        />
      </div>
    );
  }

  /* ---- render: scanning / success ------------------------------ */
  return (
    <div style={containerStyle} className={className}>
      {/* Live camera feed */}
      <video
        ref={videoRef}
        className="qrs-video"
        playsInline
        muted
        autoPlay
        aria-label="Camera viewfinder"
      />

      {/* Glassmorphism overlay */}
      {status === "scanning" && (
        <ScannerOverlay
          isScanning
          hasTorch={hasTorch}
          torchOn={torchOn}
          cameraCount={devices.length}
          onToggleTorch={() => void toggleTorch()}
          onSwitchCamera={switchCamera}
          onCancel={onClose ? handleCancel : undefined}
        />
      )}

      {/* Success flash */}
      {status === "success" && (
        <div
          aria-live="polite"
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.6)",
            animation: "qrs-fade-up 0.3s ease-out both",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
              color: "#4ade80",
            }}
          >
            <svg
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="8 12 11 15 16 9" />
            </svg>
            <span
              style={{
                fontSize: 16,
                fontWeight: 700,
                fontFamily: FONT,
                letterSpacing: "-0.01em",
              }}
            >
              QR Code Detected
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

QRScanner.displayName = "QRScanner";
export default QRScanner;
