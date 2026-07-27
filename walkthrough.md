# QR Verification Scanner Diagnostics & Universal Routing — Walkthrough

## What Was Resolved

### 1. Fixed Fallback QR Decoder Library (`js/vendor/jsqr.min.js`)
- **Root Cause**: The local fallback `jsQR` decoder engine was replaced by a mock placeholder stub (73 lines, 2.4 KB) that always returned `null`, preventing cameras from parsing QR codes on devices where GPU-native `BarcodeDetector` wasn't enabled.
- **Fix**: Restored the authentic fully-featured minified `jsQR` decoder engine (10,102 lines, 256 KB) matching the Git index.

### 2. Universal QR Routing Engine (`js/warden.js`)
- Integrated a **Universal Scanner Router** into the Gate Control dashboard scanner:
  - **Outpass QR**: Scans, decodes, and validates outpass tokens to render the exit/return action card.
  - **Study Hour QR** (`HMSQR_...`): Automatically routes verification requests to `HostelDB.verifyQRToken` and displays a dedicated study presence card.
  - **Future / Unrecognized QR**: Gracefully handles and displays raw parsed payloads with alert feedback.

### 3. Production Asset Bundling Fix (`vite.config.js`)
- **Root Cause**: Vite builds didn't bundle non-module dependencies in `<script>` tags, causing missing assets (404 errors) when deployed.
- **Fix**: Implemented a custom post-bundle copying plugin in `vite.config.js` to ensure the `js` and `components` folders are correctly present in the built `dist` folder.

### 4. Browser Security & HTTPS Safety Checks (`js/scanner-ui.js`)
- Handled browser sandboxing rules by adding clean warnings if `navigator.mediaDevices` is blocked (e.g. when testing over unencrypted HTTP connections).

---

## Verification Status
- ✅ Build compiled successfully: `npx vite build` succeeded.
- ✅ Pushed to origin main: Commit `061e1eb`.
