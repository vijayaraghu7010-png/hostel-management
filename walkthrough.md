# Multi-Tier Universal QR Scanner Rebuild — Walkthrough

## What Was Resolved

### 1. Multi-Tier Scanner Engine Architecture (`js/scanner-ui.js`)
Completely replaced the legacy scanner implementation with a fail-safe, 3-tier fallback engine:
- **Tier 1 (`@zxing/browser`)**: Preferred browser decoding engine using `ZXingBrowser.BrowserQRCodeReader`. Clean disposal via `controls.stop()`.
- **Tier 2 (`Nimiq QrScanner`)**: High-performance multi-threaded Web Worker fallback (`QrScanner`).
- **Hardware Acceleration (`BarcodeDetector`)**: GPU native hardware detection where supported by Chrome Android/Desktop.

If any tier fails on a specific browser/device, the scanner automatically falls back to the next tier without breaking the application or requiring page refreshes.

### 2. Universal Structured Payload Parser
- Parses structured JSON payloads (`type`, `id`, `studentId`, `sessionId`, `signature`, `timestamp`).
- Backwards-compatible string mapping for `HMSQR_...` and `OP-...` tokens.
- Rejects unsupported types with visual and haptic error feedback.

### 3. Automatic Outpass & Gate Transaction Workflow
- Automatically records campus exits (`recordOutpassExit`) or returns (`recordOutpassReturn`).
- Updates overdue outing counters and displays instant confirmation banners.

---

## Verification Status
- ✅ Build compiled successfully: `npx vite build` succeeded in 573ms.
- ✅ Pushed to origin main: Commit `c216ec6`.
