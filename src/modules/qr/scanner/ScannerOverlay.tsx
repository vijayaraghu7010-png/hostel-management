import React, { useEffect, useRef } from "react";
import type { ScannerOverlayProps } from "./types";

/* ------------------------------------------------------------------ */
/*  Keyframe injection (once per page)                                  */
/* ------------------------------------------------------------------ */

const KEYFRAME_ID = "qr-scanner-keyframes";

function ensureKeyframes(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById(KEYFRAME_ID)) return;
  const style = document.createElement("style");
  style.id = KEYFRAME_ID;
  style.textContent = `
    @keyframes qrs-scan-line {
      0%   { top: 8%; opacity: 1; }
      48%  { opacity: 1; }
      50%  { top: 88%; opacity: 0.6; }
      52%  { opacity: 1; }
      100% { top: 8%; opacity: 1; }
    }
    @keyframes qrs-corner-pulse {
      0%, 100% { opacity: 1; }
      50%       { opacity: 0.4; }
    }
    @keyframes qrs-fade-in {
      from { opacity: 0; transform: translateY(8px); }
      to   { opacity: 1; transform: translateY(0); }
    }
  `;
  document.head.appendChild(style);
}

/* ------------------------------------------------------------------ */
/*  Corner bracket SVG                                                  */
/* ------------------------------------------------------------------ */

interface CornerProps {
  position: "tl" | "tr" | "bl" | "br";
}

const CORNER_SIZE = 28;
const CORNER_STROKE = 3;
const CORNER_COLOR = "#4ade80"; // vibrant green

function Corner({ position }: CornerProps): React.ReactElement {
  const isTL = position === "tl";
  const isTR = position === "tr";
  const isBL = position === "bl";

  const style: React.CSSProperties = {
    position: "absolute",
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    animation: "qrs-corner-pulse 2s ease-in-out infinite",
    ...(isTL ? { top: 0, left: 0 } : {}),
    ...(isTR ? { top: 0, right: 0 } : {}),
    ...(isBL ? { bottom: 0, left: 0 } : {}),
    ...(!isTL && !isTR && !isBL ? { bottom: 0, right: 0 } : {}),
  };

  const L = CORNER_SIZE;
  const S = CORNER_STROKE;
  const A = 10; // arm length

  let d = "";
  if (isTL)       d = `M ${A} ${S/2} L ${S/2} ${S/2} L ${S/2} ${A}`;
  else if (isTR)  d = `M ${L-A} ${S/2} L ${L-S/2} ${S/2} L ${L-S/2} ${A}`;
  else if (isBL)  d = `M ${S/2} ${L-A} L ${S/2} ${L-S/2} L ${A} ${L-S/2}`;
  else            d = `M ${L-A} ${L-S/2} L ${L-S/2} ${L-S/2} L ${L-S/2} ${L-A}`;

  return (
    <svg viewBox={`0 0 ${L} ${L}`} style={style} aria-hidden="true">
      <path
        d={d}
        stroke={CORNER_COLOR}
        strokeWidth={S}
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Scan line                                                           */
/* ------------------------------------------------------------------ */

function ScanLine(): React.ReactElement {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        left: "4%",
        right: "4%",
        height: 2,
        background: `linear-gradient(90deg, transparent, ${CORNER_COLOR}, transparent)`,
        boxShadow: `0 0 8px 2px ${CORNER_COLOR}66`,
        borderRadius: 1,
        animation: "qrs-scan-line 2.4s ease-in-out infinite",
        pointerEvents: "none",
      }}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Icon helpers                                                        */
/* ------------------------------------------------------------------ */

function IconSwitch(): React.ReactElement {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/>
      <circle cx="12" cy="12" r="2"/>
      <path d="M17 3l-5 4-5-4"/>
    </svg>
  );
}

function IconFlash({ on }: { on: boolean }): React.ReactElement {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={on ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  );
}

function IconClose(): React.ReactElement {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Control button                                                      */
/* ------------------------------------------------------------------ */

interface CtrlBtnProps {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
  active?: boolean;
}

function CtrlBtn({ onClick, label, children, active }: CtrlBtnProps): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 48,
        height: 48,
        borderRadius: "50%",
        border: "1.5px solid rgba(255,255,255,0.3)",
        background: active
          ? "rgba(74,222,128,0.25)"
          : "rgba(255,255,255,0.12)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        color: active ? CORNER_COLOR : "#fff",
        cursor: "pointer",
        transition: "background 0.2s, color 0.2s, transform 0.15s",
      }}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  ScannerOverlay                                                      */
/* ------------------------------------------------------------------ */

/**
 * Glassmorphism overlay rendered on top of the camera feed.
 * Contains the viewfinder frame, animated scan line, corner brackets,
 * and control buttons (torch, camera switch, cancel).
 */
const ScannerOverlay: React.FC<ScannerOverlayProps> = ({
  isScanning,
  hasTorch,
  torchOn,
  cameraCount,
  onToggleTorch,
  onSwitchCamera,
  onCancel,
}) => {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ensureKeyframes();
  }, []);

  /* Outer dark mask around the viewfinder */
  const maskStyle: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    display: "grid",
    gridTemplateRows: "1fr auto 1fr",
    gridTemplateColumns: "1fr auto 1fr",
    pointerEvents: "none",
  };

  const maskCellStyle = (col: 1 | 2 | 3, row: 1 | 2 | 3): React.CSSProperties => ({
    gridColumn: col,
    gridRow: row,
    background: "rgba(0,0,0,0.55)",
  });

  /* Viewfinder box — column 2, row 2 */
  const viewfinderSize = "min(72vw, 72vh, 320px)";

  const viewfinderStyle: React.CSSProperties = {
    gridColumn: 2,
    gridRow: 2,
    width: viewfinderSize,
    height: viewfinderSize,
    position: "relative",
    pointerEvents: "none",
  };

  return (
    <div
      ref={overlayRef}
      style={{ position: "absolute", inset: 0, zIndex: 10 }}
    >
      {/* Dark mask (9-cell grid) */}
      <div style={maskStyle}>
        {/* Row 1 */}
        <div style={maskCellStyle(1, 1)} />
        <div style={maskCellStyle(2, 1)} />
        <div style={maskCellStyle(3, 1)} />
        {/* Row 2 */}
        <div style={maskCellStyle(1, 2)} />
        {/* Viewfinder (transparent) */}
        <div style={viewfinderStyle}>
          <Corner position="tl" />
          <Corner position="tr" />
          <Corner position="bl" />
          <Corner position="br" />
          {isScanning && <ScanLine />}
        </div>
        <div style={maskCellStyle(3, 2)} />
        {/* Row 3 */}
        <div style={maskCellStyle(1, 3)} />
        <div style={maskCellStyle(2, 3)} />
        <div style={maskCellStyle(3, 3)} />
      </div>

      {/* Top bar: cancel button */}
      {onCancel && (
        <div
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            zIndex: 20,
            pointerEvents: "auto",
          }}
        >
          <CtrlBtn onClick={onCancel} label="Cancel scanning">
            <IconClose />
          </CtrlBtn>
        </div>
      )}

      {/* Bottom controls bar */}
      <div
        style={{
          position: "absolute",
          bottom: 32,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          gap: 20,
          zIndex: 20,
          pointerEvents: "auto",
          animation: "qrs-fade-in 0.4s ease-out both",
        }}
      >
        {hasTorch && (
          <CtrlBtn
            onClick={onToggleTorch}
            label={torchOn ? "Turn off torch" : "Turn on torch"}
            active={torchOn}
          >
            <IconFlash on={torchOn} />
          </CtrlBtn>
        )}
        {cameraCount > 1 && (
          <CtrlBtn onClick={onSwitchCamera} label="Switch camera">
            <IconSwitch />
          </CtrlBtn>
        )}
      </div>

      {/* Hint text */}
      <div
        style={{
          position: "absolute",
          bottom: 100,
          left: 0,
          right: 0,
          textAlign: "center",
          color: "rgba(255,255,255,0.75)",
          fontSize: 13,
          letterSpacing: "0.02em",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          pointerEvents: "none",
        }}
      >
        Align QR code within the frame
      </div>
    </div>
  );
};

ScannerOverlay.displayName = "ScannerOverlay";
export default ScannerOverlay;
