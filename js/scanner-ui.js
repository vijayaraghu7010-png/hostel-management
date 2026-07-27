/**
 * HMS PRODUCTION DEDICATED QR SCANNER CONTROLLER (METRO / GPAY / PHONEPE STYLE)
 * Fullscreen mobile-first scanner UI powered by ZXing-JS BrowserMultiFormatReader
 */
(function (global) {
  'use strict';

  class HMSQRScannerManager {
    constructor() {
      this.overlayEl = null;
      this.videoEl = null;
      this.isScanning = false;
      this.isTorchOn = false;
      this.codeReader = null;
      this.activeDevices = [];
      this.currentDeviceIndex = 0;
      this.onScanCallback = null;
      this.onCloseCallback = null;
      this.onManualCallback = null;
      this.audioCtx = null;

      // Initialize ZXing Reader
      if (global.ZXing) {
        this.codeReader = new global.ZXing.BrowserMultiFormatReader();
      } else {
        console.error('ZXing library not found in global scope.');
      }
    }

    /* ----------------------------------------------------------------------
       1. Inject & Initialize Fullscreen Scanner DOM Structure
       ---------------------------------------------------------------------- */
    initDOM() {
      if (document.getElementById('hms-qr-scanner-fullscreen')) {
        this.overlayEl = document.getElementById('hms-qr-scanner-fullscreen');
        this.videoEl = document.getElementById('hms-scanner-video-el');
        return;
      }

      const container = document.createElement('div');
      container.id = 'hms-qr-scanner-fullscreen';
      container.className = 'hms-scanner-overlay hms-hidden';
      container.innerHTML = `
        <!-- Minimal Top Bar -->
        <div class="hms-scanner-topbar">
          <button type="button" class="hms-btn-back" id="hms-scanner-btn-back" aria-label="Close Scanner">
            <i class="fa-solid fa-arrow-left"></i>
            <span>Back</span>
          </button>
          <h1 class="hms-scanner-title" id="hms-scanner-header-title">QR Scanner</h1>
          <div class="hms-top-actions">
            <button type="button" class="hms-icon-btn" id="hms-scanner-btn-torch" title="Toggle Flashlight" aria-label="Toggle Flashlight">
              <i class="fa-solid fa-bolt"></i>
            </button>
            <button type="button" class="hms-icon-btn" id="hms-scanner-btn-switch" title="Switch Camera" aria-label="Switch Camera">
              <i class="fa-solid fa-camera-rotate"></i>
            </button>
          </div>
        </div>

        <!-- Viewfinder Stream & Mask Overlay -->
        <div class="hms-scanner-viewfinder">
          <!-- Loading Spinner Overlay -->
          <div class="hms-scanner-loader" id="hms-scanner-loader-el" style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; background: rgba(5,7,10,0.9); z-index: 100; gap: 1rem;">
            <i class="fa-solid fa-circle-notch fa-spin fa-3x" style="color: #38bdf8;"></i>
            <span style="color: #ffffff; font-size: 0.9rem; font-weight: 500;">Initializing Lens...</span>
          </div>

          <video id="hms-scanner-video-el" class="hms-scanner-video" autoplay playsinline muted></video>
          
          <!-- Centered Square Viewfinder Frame with Corner Brackets & Laser -->
          <div class="hms-scanner-frame-wrapper" id="hms-scanner-frame">
            <div class="hms-corner-cap hms-corner-tl"></div>
            <div class="hms-corner-cap hms-corner-tr"></div>
            <div class="hms-corner-cap hms-corner-bl"></div>
            <div class="hms-corner-cap hms-corner-br"></div>
            <div class="hms-laser-beam" id="hms-scanner-laser"></div>
          </div>
        </div>

        <!-- Minimal Bottom Area -->
        <div class="hms-scanner-bottombar">
          <p class="hms-bottom-text" id="hms-bottom-text-main">Align the QR code inside the frame</p>
          <p class="hms-bottom-subtext" id="hms-bottom-text-sub">The QR will be scanned automatically.</p>
          <button type="button" class="hms-btn-manual-trigger" id="hms-btn-manual-entry" style="display: none;">
            <i class="fa-solid fa-keyboard"></i> Enter Code Manually
          </button>
        </div>

        <!-- Success Animation Overlay -->
        <div class="hms-success-overlay" id="hms-scanner-success-overlay">
          <div class="hms-success-checkmark-wrapper">
            <svg class="hms-success-checkmark-svg" viewBox="0 0 52 52">
              <path d="M14 27 l10 10 l16 -18" />
            </svg>
          </div>
          <p class="hms-success-title">QR Code Scanned!</p>
        </div>

        <!-- Permission / Camera Failure View Overlay -->
        <div class="hms-error-overlay" id="hms-scanner-error-overlay" style="display: none;">
          <div class="hms-error-icon-circle">
            <i class="fa-solid fa-camera-slash"></i>
          </div>
          <h2 class="hms-error-title" id="hms-error-title-text">Camera Access Required</h2>
          <p class="hms-error-msg" id="hms-error-msg-text">Please allow camera permissions to scan outpass QR codes automatically.</p>
          <div class="hms-error-actions">
            <button type="button" class="hms-btn-action hms-btn-action-primary" id="hms-btn-retry-camera">
              <i class="fa-solid fa-rotate-right"></i> Grant Access & Retry
            </button>
            <button type="button" class="hms-btn-action hms-btn-action-secondary" id="hms-btn-error-close">
              <i class="fa-solid fa-xmark"></i> Close Scanner
            </button>
          </div>
        </div>
      `;

      document.body.appendChild(container);
      this.overlayEl = container;
      this.videoEl = document.getElementById('hms-scanner-video-el');

      this.attachEvents();
    }

    /* ----------------------------------------------------------------------
       2. Attach Event Handlers
       ---------------------------------------------------------------------- */
    attachEvents() {
      const backBtn = document.getElementById('hms-scanner-btn-back');
      if (backBtn) backBtn.addEventListener('click', () => this.close());

      const torchBtn = document.getElementById('hms-scanner-btn-torch');
      if (torchBtn) torchBtn.addEventListener('click', () => this.toggleTorch());

      const switchBtn = document.getElementById('hms-scanner-btn-switch');
      if (switchBtn) switchBtn.addEventListener('click', () => this.switchCamera());

      const retryBtn = document.getElementById('hms-btn-retry-camera');
      if (retryBtn) retryBtn.addEventListener('click', () => this.startCamera());

      const errorCloseBtn = document.getElementById('hms-btn-error-close');
      if (errorCloseBtn) errorCloseBtn.addEventListener('click', () => this.close());

      const manualBtn = document.getElementById('hms-btn-manual-entry');
      if (manualBtn) {
        manualBtn.addEventListener('click', () => {
          this.close();
          if (typeof this.onManualCallback === 'function') {
            this.onManualCallback();
          }
        });
      }

      window.addEventListener('beforeunload', () => this.releaseStream());
      document.addEventListener('visibilitychange', () => {
        if (document.hidden && this.isScanning) {
          this.releaseStream();
        }
      });
    }

    /* ----------------------------------------------------------------------
       3. Open Fullscreen Dedicated Scanner Page
       ---------------------------------------------------------------------- */
    async open(options = {}) {
      this.initDOM();

      this.onScanCallback = options.onScan || null;
      this.onCloseCallback = options.onClose || null;
      this.onManualCallback = options.onManual || null;

      const headerTitle = document.getElementById('hms-scanner-header-title');
      if (headerTitle) headerTitle.textContent = options.title || 'QR Scanner';

      const mainText = document.getElementById('hms-bottom-text-main');
      if (mainText) mainText.textContent = options.mainText || 'Align the QR code inside the frame';

      const subText = document.getElementById('hms-bottom-text-sub');
      if (subText) subText.textContent = options.subText || 'The QR will be scanned automatically.';

      const manualBtn = document.getElementById('hms-btn-manual-entry');
      if (manualBtn) {
        manualBtn.style.display = options.allowManual ? 'inline-flex' : 'none';
      }

      const errorOverlay = document.getElementById('hms-scanner-error-overlay');
      if (errorOverlay) errorOverlay.style.display = 'none';

      const successOverlay = document.getElementById('hms-scanner-success-overlay');
      if (successOverlay) successOverlay.classList.remove('active');

      this.overlayEl.classList.remove('hms-hidden');
      document.body.style.overflow = 'hidden';

      this.isScanning = true;
      await this.startCamera();
    }

    /* ----------------------------------------------------------------------
       4. Start Camera Stream & ZXing Decoding Loop
       ---------------------------------------------------------------------- */
    async startCamera() {
      const loader = document.getElementById('hms-scanner-loader-el');
      const errorOverlay = document.getElementById('hms-scanner-error-overlay');
      if (loader) loader.style.display = 'flex';
      if (errorOverlay) errorOverlay.style.display = 'none';

      if (!this.codeReader) {
        this.showErrorState('ZXing Library Missing', 'Scanner dependency failed to initialize.');
        return;
      }

      this.releaseStream();

      try {
        // Enumerate video input devices
        this.activeDevices = await this.codeReader.listVideoInputDevices();
        if (!this.activeDevices || this.activeDevices.length === 0) {
          throw new Error('No camera devices detected.');
        }

        // Auto selection strategy: Prefer back/rear camera
        let deviceId = this.activeDevices[0].deviceId;
        this.currentDeviceIndex = 0;

        for (let i = 0; i < this.activeDevices.length; i++) {
          const label = (this.activeDevices[i].label || '').toLowerCase();
          if (label.includes('back') || label.includes('rear') || label.includes('environment')) {
            deviceId = this.activeDevices[i].deviceId;
            this.currentDeviceIndex = i;
            break;
          }
        }

        // If no rear camera matches, pick the last device
        if (this.currentDeviceIndex === 0 && this.activeDevices.length > 1) {
          this.currentDeviceIndex = this.activeDevices.length - 1;
          deviceId = this.activeDevices[this.currentDeviceIndex].deviceId;
        }

        this.isTorchOn = false;
        const torchBtn = document.getElementById('hms-scanner-btn-torch');
        if (torchBtn) torchBtn.classList.remove('active');

        // Start decoding using ZXing
        this.codeReader.decodeFromVideoDevice(deviceId, this.videoEl, (result, err) => {
          if (result) {
            this.handleScanResult(result.getText());
          }
          if (err && !(err instanceof global.ZXing.NotFoundException)) {
            // Log silent warnings for non-critical errors (standard for frame misses)
          }
        });

        // Hide loader after camera feed registers
        setTimeout(() => {
          if (loader) loader.style.display = 'none';
        }, 1000);

      } catch (err) {
        console.error('Camera startup error:', err);
        let title = 'Camera Unavailable';
        let desc = 'Unable to start camera lens. Check camera hardware permissions.';

        if (err.name === 'NotAllowedError') {
          title = 'Camera Permission Denied';
          desc = 'Please allow camera access in your browser settings to scan QR codes.';
        } else if (!navigator.mediaDevices) {
          title = 'HTTPS Access Required';
          desc = 'Camera capture APIs are blocked on unsecured (HTTP) connections.';
        }

        this.showErrorState(title, desc);
      }
    }

    /* ----------------------------------------------------------------------
       5. Process Scan Payload & Route (Universal Router)
       ---------------------------------------------------------------------- */
    handleScanResult(decodedText) {
      if (!this.isScanning) return;

      let payload = null;
      try {
        payload = this.validateAndParsePayload(decodedText);
      } catch (err) {
        // Vibrate to indicate invalid scan pattern
        if (navigator.vibrate) navigator.vibrate(250);
        this.showInvalidPopup(err.message || 'Malformed QR code format.');
        return;
      }

      this.handleSuccessfulScan(decodedText);
    }

    validateAndParsePayload(decodedText) {
      let payload = null;
      try {
        payload = JSON.parse(decodedText);
      } catch (err) {
        // Fallback for plain text backward compatibility
        if (decodedText.startsWith('HMSQR_')) {
          const parts = decodedText.split('_');
          payload = {
            type: 'STUDY_HOUR',
            id: decodedText,
            studentId: parts[3] || '',
            sessionId: parts[2] || '',
            timestamp: Date.now(),
            signature: ''
          };
        } else if (decodedText.startsWith('OP-')) {
          payload = {
            type: 'OUTPASS',
            id: decodedText,
            studentId: '',
            sessionId: '',
            timestamp: Date.now(),
            signature: ''
          };
        } else {
          throw new Error('Invalid QR format. Structured JSON payload required.');
        }
      }

      if (!payload.type) {
        throw new Error('Invalid QR: Missing payload type.');
      }

      const supportedTypes = ['STUDY_HOUR', 'OUTPASS', 'VISITOR', 'MAINTENANCE'];
      if (!supportedTypes.includes(payload.type)) {
        throw new Error(`Invalid QR: Unsupported system module type "${payload.type}".`);
      }

      return payload;
    }

    async handleSuccessfulScan(qrData) {
      this.isScanning = false;

      // Haptic Vibration
      if (navigator.vibrate) {
        try {
          navigator.vibrate([100, 50, 100]);
        } catch (e) {}
      }

      // Audio Chime Feedback
      this.playAudioBeep();

      // Show Green Checkmark Overlay
      const successOverlay = document.getElementById('hms-scanner-success-overlay');
      if (successOverlay) {
        successOverlay.classList.add('active');
      }

      // Stop camera feed
      this.releaseStream();

      // Wait 600ms for overlay animation
      await new Promise((r) => setTimeout(r, 650));

      this.close(true);

      if (typeof this.onScanCallback === 'function') {
        this.onScanCallback(qrData);
      }
    }

    /* ----------------------------------------------------------------------
       6. Toggle Flashlight / Torch via stream constraints
       ---------------------------------------------------------------------- */
    async toggleTorch() {
      if (!this.codeReader || !this.isScanning) return;
      try {
        const stream = this.codeReader.stream;
        const track = stream ? stream.getVideoTracks()[0] : null;
        if (!track) return;

        const capabilities = track.getCapabilities ? track.getCapabilities() : {};
        if (!capabilities.torch) {
          if (typeof showToast === 'function') {
            showToast('Flashlight torch is not supported on this camera device.', 'warning');
          }
          return;
        }

        this.isTorchOn = !this.isTorchOn;
        await track.applyConstraints({
          advanced: [{ torch: this.isTorchOn }]
        });

        const torchBtn = document.getElementById('hms-scanner-btn-torch');
        if (torchBtn) {
          torchBtn.classList.toggle('active', this.isTorchOn);
        }
      } catch (err) {
        console.warn('Torch activation failed:', err);
      }
    }

    /* ----------------------------------------------------------------------
       7. Switch Camera Lenses
       ---------------------------------------------------------------------- */
    async switchCamera() {
      if (this.activeDevices.length <= 1) {
        if (typeof showToast === 'function') {
          showToast('No alternative camera devices detected.', 'info');
        }
        return;
      }

      this.currentDeviceIndex = (this.currentDeviceIndex + 1) % this.activeDevices.length;
      if (this.isScanning) {
        await this.startCamera();
      }
    }

    /* ----------------------------------------------------------------------
       8. Dialogs & Release Stream Cleanups
       ---------------------------------------------------------------------- */
    showErrorState(title, message) {
      this.isScanning = false;
      this.releaseStream();

      const loader = document.getElementById('hms-scanner-loader-el');
      if (loader) loader.style.display = 'none';

      const titleEl = document.getElementById('hms-error-title-text');
      if (titleEl) titleEl.textContent = title || 'Camera Error';

      const msgEl = document.getElementById('hms-error-msg-text');
      if (msgEl) msgEl.textContent = message || 'Camera permission denied or lens unavailable.';

      const errorOverlay = document.getElementById('hms-scanner-error-overlay');
      if (errorOverlay) errorOverlay.style.display = 'flex';
    }

    showInvalidPopup(message) {
      // Temporarily halt scanning loop checks
      this.isScanning = false;

      let modalBackdrop = document.getElementById('hms-invalid-modal-backdrop');
      if (!modalBackdrop) {
        modalBackdrop = document.createElement('div');
        modalBackdrop.id = 'hms-invalid-modal-backdrop';
        modalBackdrop.className = 'hms-invalid-modal-backdrop';
        modalBackdrop.innerHTML = `
          <div class="hms-invalid-popup-sheet" id="hms-invalid-popup-sheet">
            <div class="hms-sheet-handle"></div>
            <div class="hms-invalid-icon">
              <i class="fa-solid fa-circle-xmark"></i>
            </div>
            <h3 class="hms-invalid-title" id="hms-invalid-modal-title">Invalid QR Code</h3>
            <p class="hms-invalid-msg" id="hms-invalid-modal-msg">The scanned QR code is either expired, invalid, or unrecognized.</p>
            <div style="display: flex; gap: 10px;">
              <button type="button" class="hms-btn-action hms-btn-action-secondary" id="hms-btn-invalid-close" style="flex: 1;">
                Close
              </button>
              <button type="button" class="hms-btn-action hms-btn-action-primary" id="hms-btn-invalid-retry" style="flex: 1.2;">
                <i class="fa-solid fa-qrcode"></i> Scan Again
              </button>
            </div>
          </div>
        `;
        document.body.appendChild(modalBackdrop);
      }

      const msgEl = document.getElementById('hms-invalid-modal-msg');
      if (msgEl) msgEl.textContent = message || 'The scanned QR code is either expired, invalid, or unrecognized.';

      const sheet = document.getElementById('hms-invalid-popup-sheet');
      modalBackdrop.classList.add('active');
      if (sheet) sheet.classList.add('active');

      const closeBtn = document.getElementById('hms-btn-invalid-close');
      const retryBtn = document.getElementById('hms-btn-invalid-retry');

      const closeHandler = () => {
        modalBackdrop.classList.remove('active');
        if (sheet) sheet.classList.remove('active');
        this.close();
      };

      if (closeBtn) closeBtn.onclick = closeHandler;
      if (modalBackdrop) {
        modalBackdrop.onclick = (e) => {
          if (e.target === modalBackdrop) closeHandler();
        };
      }

      if (retryBtn) {
        retryBtn.onclick = () => {
          modalBackdrop.classList.remove('active');
          if (sheet) sheet.classList.remove('active');
          this.isScanning = true;
          this.startCamera();
        };
      }
    }

    playAudioBeep() {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        if (!this.audioCtx) {
          this.audioCtx = new AudioCtx();
        }
        if (this.audioCtx.state === 'suspended') {
          this.audioCtx.resume();
        }
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, this.audioCtx.currentTime); // A5 note
        osc.frequency.exponentialRampToValueAtTime(1320, this.audioCtx.currentTime + 0.12); // E6 note

        gain.gain.setValueAtTime(0.15, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.18);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start();
        osc.stop(this.audioCtx.currentTime + 0.18);
      } catch (e) {
        console.warn('Audio chime warning:', e);
      }
    }

    releaseStream() {
      this.isScanning = false;
      if (this.codeReader) {
        try {
          this.codeReader.reset();
        } catch (e) {
          console.warn('Reader reset error:', e);
        }
      }
    }

    close(isSuccessScan = false) {
      this.releaseStream();

      if (this.overlayEl) {
        this.overlayEl.classList.add('hms-hidden');
      }

      document.body.style.overflow = '';

      if (!isSuccessScan && typeof this.onCloseCallback === 'function') {
        this.onCloseCallback();
      }
    }
  }

  global.HMSQRScanner = new HMSQRScannerManager();
})(typeof self !== 'undefined' ? self : this);
