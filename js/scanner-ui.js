/**
 * HMS PRODUCTION UNIVERSAL QR SCANNER CONTROLLER
 * HD 1080p Stream Engine + Tri-Tier Decoding (BarcodeDetector -> @zxing/browser -> Nimiq QrScanner)
 */
(function (global) {
  'use strict';

  class HMSQRScannerManager {
    constructor() {
      this.overlayEl = null;
      this.videoEl = null;
      this.isScanning = false;
      this.isTorchOn = false;
      this.activeDevices = [];
      this.currentDeviceIndex = 0;
      this.activeStream = null;
      this.scanTimer = null;

      // Controller instances
      this.zxingReader = null;
      this.barcodeDetector = null;

      this.onScanCallback = null;
      this.onCloseCallback = null;
      this.onManualCallback = null;
      this.audioCtx = null;

      this.initEngines();
    }

    /* ----------------------------------------------------------------------
       1. Initialize Engines
       ---------------------------------------------------------------------- */
    initEngines() {
      // Tier 1: Hardware GPU BarcodeDetector (Chrome Android / Desktop)
      if ('BarcodeDetector' in global) {
        try {
          this.barcodeDetector = new global.BarcodeDetector({ formats: ['qr_code'] });
          console.log('⚡ Hardware GPU Acceleration Enabled: BarcodeDetector');
        } catch (e) {
          this.barcodeDetector = null;
        }
      }

      // Tier 2: @zxing/browser
      if (global.ZXingBrowser && global.ZXingBrowser.BrowserQRCodeReader) {
        try {
          this.zxingReader = new global.ZXingBrowser.BrowserQRCodeReader();
          console.log('✓ Primary Engine Initialized: @zxing/browser');
        } catch (e) {
          console.warn('ZXing Browser init warning:', e);
        }
      }
    }

    /* ----------------------------------------------------------------------
       2. Inject Fullscreen Scanner DOM Layout
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

        <!-- Viewfinder Stream Container -->
        <div class="hms-scanner-viewfinder">
          <!-- Loading Spinner Overlay -->
          <div class="hms-scanner-loader" id="hms-scanner-loader-el" style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; background: rgba(5,7,10,0.92); z-index: 100; gap: 1rem;">
            <i class="fa-solid fa-circle-notch fa-spin fa-3x" style="color: #38bdf8;"></i>
            <span style="color: #ffffff; font-size: 0.9rem; font-weight: 500;">Initializing HD Lens...</span>
          </div>

          <video id="hms-scanner-video-el" class="hms-scanner-video" autoplay playsinline muted></video>
          
          <!-- Centered Square Viewfinder Frame -->
          <div class="hms-scanner-frame-wrapper" id="hms-scanner-frame">
            <div class="hms-corner-cap hms-corner-tl"></div>
            <div class="hms-corner-cap hms-corner-tr"></div>
            <div class="hms-corner-cap hms-corner-bl"></div>
            <div class="hms-corner-cap hms-corner-br"></div>
            <div class="hms-laser-beam" id="hms-scanner-laser"></div>
          </div>
        </div>

        <!-- Debug On-Screen Scan Log Banner -->
        <div class="hms-scanner-debug-banner" id="hms-scanner-debug-banner" style="display: none; position: absolute; bottom: 85px; left: 16px; right: 16px; background: rgba(16, 185, 129, 0.95); color: #ffffff; padding: 10px 14px; border-radius: 12px; font-family: monospace; font-size: 0.8rem; z-index: 1000; box-shadow: 0 4px 20px rgba(0,0,0,0.5); word-break: break-all; text-align: left;">
          <strong>[SCANNED QR DECODED]:</strong> <span id="hms-scanner-debug-text"></span>
        </div>

        <!-- Minimal Bottom Bar -->
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

        <!-- Error View Overlay -->
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
       3. Attach Event Listeners
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
       4. Open Scanner Fullscreen
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

      const debugBanner = document.getElementById('hms-scanner-debug-banner');
      if (debugBanner) debugBanner.style.display = 'none';

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
       5. Start 1080p HD Camera Stream
       ---------------------------------------------------------------------- */
    async startCamera() {
      const loader = document.getElementById('hms-scanner-loader-el');
      const errorOverlay = document.getElementById('hms-scanner-error-overlay');
      if (loader) loader.style.display = 'flex';
      if (errorOverlay) errorOverlay.style.display = 'none';

      this.releaseStream();

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        this.showErrorState(
          'HTTPS Access Required',
          'Camera APIs are blocked on unsecured (HTTP) connections. Please access over HTTPS or localhost.'
        );
        return;
      }

      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        this.activeDevices = devices.filter(d => d.kind === 'videoinput');

        let selectedDeviceId = null;
        if (this.activeDevices.length > 0) {
          selectedDeviceId = this.activeDevices[0].deviceId;
          for (let i = 0; i < this.activeDevices.length; i++) {
            const label = (this.activeDevices[i].label || '').toLowerCase();
            if (label.includes('back') || label.includes('rear') || label.includes('environment')) {
              selectedDeviceId = this.activeDevices[i].deviceId;
              this.currentDeviceIndex = i;
              break;
            }
          }
        }

        // Build 1080p High-Resolution Constraints
        const videoConstraints = {
          facingMode: selectedDeviceId ? undefined : { ideal: 'environment' },
          deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined,
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
          frameRate: { ideal: 30 }
        };

        this.activeStream = await navigator.mediaDevices.getUserMedia({
          video: videoConstraints,
          audio: false
        });

        this.videoEl.srcObject = this.activeStream;
        await this.videoEl.play();

        // Enable continuous focus mode
        const track = this.activeStream.getVideoTracks()[0];
        if (track && track.applyConstraints) {
          try {
            await track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] });
          } catch (e) {}
        }

        this.isScanning = true;
        this.startDetectionLoop();

        if (loader) loader.style.display = 'none';

      } catch (err) {
        console.warn('1080p HD Camera stream failed, attempting standard resolution fallback:', err);
        try {
          this.activeStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: 'environment' } },
            audio: false
          });
          this.videoEl.srcObject = this.activeStream;
          await this.videoEl.play();

          this.isScanning = true;
          this.startDetectionLoop();

          if (loader) loader.style.display = 'none';
        } catch (fallbackErr) {
          console.error('Camera fallback error:', fallbackErr);
          this.showErrorState(
            fallbackErr.name === 'NotAllowedError' ? 'Camera Permission Denied' : 'Camera Unavailable',
            'Unable to start camera stream. Check camera permissions.'
          );
        }
      }
    }

    /* ----------------------------------------------------------------------
       6. Tri-Tier Frame Detection Loop
       ---------------------------------------------------------------------- */
    startDetectionLoop() {
      if (!this.isScanning) return;

      const scanFrame = async () => {
        if (!this.isScanning || !this.videoEl) return;

        if (this.videoEl.readyState >= 2 && !this.videoEl.paused && !this.videoEl.ended) {
          let decodedText = null;

          // Tier 1: Hardware GPU BarcodeDetector
          if (this.barcodeDetector) {
            try {
              const barcodes = await this.barcodeDetector.detect(this.videoEl);
              if (barcodes && barcodes.length > 0) {
                decodedText = barcodes[0].rawValue;
              }
            } catch (e) {}
          }

          // Tier 2: @zxing/browser
          if (!decodedText && this.zxingReader) {
            try {
              const result = this.zxingReader.decode(this.videoEl);
              if (result) {
                decodedText = result.getText();
              }
            } catch (e) {}
          }

          // Tier 3: Nimiq QrScanner fallback
          if (!decodedText && global.QrScanner) {
            try {
              const result = await global.QrScanner.scanImage(this.videoEl, { returnDetailedScanResult: true });
              if (result && result.data) {
                decodedText = result.data;
              }
            } catch (e) {}
          }

          if (decodedText && this.isScanning) {
            this.handleScanResult(decodedText);
            return;
          }
        }

        if (this.isScanning) {
          this.scanTimer = setTimeout(scanFrame, 120);
        }
      };

      scanFrame();
    }

    /* ----------------------------------------------------------------------
       7. Process & Debug Log Scanned Result
       ---------------------------------------------------------------------- */
    handleScanResult(decodedText) {
      if (!this.isScanning) return;

      // 1. Log to browser console
      console.log("%c=== UNIVERSAL QR DECODED ===", "color: #10b981; font-weight: bold; font-size: 14px;", decodedText);

      // 2. Display debug log banner on screen
      const debugBanner = document.getElementById('hms-scanner-debug-banner');
      const debugText = document.getElementById('hms-scanner-debug-text');
      if (debugBanner && debugText) {
        debugText.textContent = decodedText;
        debugBanner.style.display = 'block';
      }

      let payload = null;
      try {
        payload = this.validateAndParsePayload(decodedText);
      } catch (err) {
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
          throw new Error('Invalid QR payload format. Structured JSON required.');
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
      if (this.scanTimer) {
        clearTimeout(this.scanTimer);
        this.scanTimer = null;
      }

      // Haptic Vibration Feedback
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

      // Stop camera stream
      this.releaseStream();

      // Animation delay
      await new Promise((r) => setTimeout(r, 650));

      this.close(true);

      if (typeof this.onScanCallback === 'function') {
        this.onScanCallback(qrData);
      }
    }

    /* ----------------------------------------------------------------------
       8. Toggle Flashlight Torch Control
       ---------------------------------------------------------------------- */
    async toggleTorch() {
      if (!this.isScanning) return;
      try {
        let track = null;
        if (this.activeStream) {
          track = this.activeStream.getVideoTracks()[0];
        } else if (this.videoEl && this.videoEl.srcObject) {
          track = this.videoEl.srcObject.getVideoTracks()[0];
        }

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
        console.warn('Torch activation error:', err);
      }
    }

    /* ----------------------------------------------------------------------
       9. Switch Camera Lenses
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
       10. Error & Dialog Handlers
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
      this.isScanning = false;
      if (this.scanTimer) {
        clearTimeout(this.scanTimer);
        this.scanTimer = null;
      }

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
        osc.frequency.setValueAtTime(880, this.audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1320, this.audioCtx.currentTime + 0.12);

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

    /* ----------------------------------------------------------------------
       11. Clean Stream Disposal
       ---------------------------------------------------------------------- */
    releaseStream() {
      this.isScanning = false;
      if (this.scanTimer) {
        clearTimeout(this.scanTimer);
        this.scanTimer = null;
      }

      if (this.activeStream) {
        try {
          this.activeStream.getTracks().forEach((track) => track.stop());
        } catch (e) {}
        this.activeStream = null;
      }

      if (this.videoEl) {
        this.videoEl.srcObject = null;
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
