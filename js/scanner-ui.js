/**
 * HMS PRODUCTION UNIVERSAL QR SCANNER CONTROLLER
 * html5-qrcode Engine Architecture for KVCET Hostel ERP
 */
(function (global) {
  'use strict';

  class HMSQRScannerManager {
    constructor() {
      this.overlayEl = null;
      this.cameraContainerEl = null;
      this.isScanning = false;
      this.scanLock = false;
      this.isTorchOn = false;
      this.availableCameras = [];
      this.currentCameraIndex = 0;
      this.html5QrCode = null;

      this.onScanCallback = null;
      this.onCloseCallback = null;
      this.onManualCallback = null;
      this.audioCtx = null;

      this._lastScannedText = null;
      this._lastScannedTime = 0;
    }

    /**
     * Ensure html5-qrcode script is loaded
     */
    async ensureHtml5QrcodeLoaded() {
      if (global.Html5Qrcode) return true;

      return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = (window.location.pathname.includes('/pages/') ? '../../' : './') + 'js/vendor/html5-qrcode.min.js';
        script.onload = () => {
          console.log('✓ html5-qrcode script loaded successfully.');
          resolve(true);
        };
        script.onerror = () => {
          console.error('Failed to load html5-qrcode.min.js');
          resolve(false);
        };
        document.head.appendChild(script);
      });
    }

    /* ----------------------------------------------------------------------
       1. Inject Universal Fullscreen Scanner DOM Layout
       ---------------------------------------------------------------------- */
    initDOM() {
      if (document.getElementById('hms-qr-scanner-fullscreen')) {
        this.overlayEl = document.getElementById('hms-qr-scanner-fullscreen');
        this.cameraContainerEl = document.getElementById('hms-scanner-camera-container');
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
          <h1 class="hms-scanner-title" id="hms-scanner-header-title">Universal QR Scanner</h1>
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
        <div class="hms-scanner-viewfinder" id="hms-scanner-viewfinder">
          <!-- Loading Spinner Overlay -->
          <div class="hms-scanner-loader" id="hms-scanner-loader-el" style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; background: rgba(5,7,10,0.92); z-index: 100; gap: 1rem;">
            <i class="fa-solid fa-circle-notch fa-spin fa-3x" style="color: #38bdf8;"></i>
            <span style="color: #ffffff; font-size: 0.9rem; font-weight: 500;" id="hms-scanner-status-text">Initializing HD Lens...</span>
          </div>

          <!-- HTML5-QRCode Render Target Container -->
          <div id="hms-scanner-camera-container" style="position: absolute; inset: 0; width: 100%; height: 100%; background: #000;"></div>
          
          <!-- Centered Square Viewfinder Frame -->
          <div class="hms-scanner-frame-wrapper" id="hms-scanner-frame">
            <div class="hms-corner-cap hms-corner-tl"></div>
            <div class="hms-corner-cap hms-corner-tr"></div>
            <div class="hms-corner-cap hms-corner-bl"></div>
            <div class="hms-corner-cap hms-corner-br"></div>
            <div class="hms-laser-beam" id="hms-scanner-laser"></div>
          </div>
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
          <p class="hms-success-title" id="hms-success-title-text">QR Code Scanned!</p>
        </div>

        <!-- Error View Overlay -->
        <div class="hms-error-overlay" id="hms-scanner-error-overlay" style="display: none;">
          <div class="hms-error-icon-circle">
            <i class="fa-solid fa-camera-slash"></i>
          </div>
          <h2 class="hms-error-title" id="hms-error-title-text">Camera Access Required</h2>
          <p class="hms-error-msg" id="hms-error-msg-text">Please allow camera permissions to scan QR codes automatically.</p>
          <div class="hms-error-actions">
            <button type="button" class="hms-btn-action hms-btn-action-primary" id="hms-btn-retry-camera">
              <i class="fa-solid fa-rotate-right"></i> Grant Access & Retry
            </button>
            <button type="button" class="hms-btn-action hms-btn-action-secondary" id="hms-btn-error-close">
              <i class="fa-solid fa-xmark"></i> Close Scanner
            </button>
          </div>
        </div>

        <!-- Debug Sheet Modal -->
        <div class="hms-debug-modal-backdrop" id="hms-debug-modal-backdrop" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.75); z-index: 9999; align-items: flex-end; justify-content: center;">
          <div style="background: #0f172a; color: #f8fafc; border-top: 2px solid #38bdf8; width: 100%; max-width: 540px; border-radius: 20px 20px 0 0; padding: 20px; font-family: monospace; box-shadow: 0 -10px 40px rgba(0,0,0,0.8); max-height: 80vh; overflow-y: auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #334155; padding-bottom: 10px; margin-bottom: 12px;">
              <h3 style="margin: 0; font-size: 1rem; color: #38bdf8; font-weight: 700;">⚡ QR Scanner Debug Panel</h3>
              <button type="button" id="hms-debug-btn-close" style="background: transparent; border: none; color: #94a3b8; font-size: 1.2rem; cursor: pointer;">&times;</button>
            </div>
            
            <div style="font-size: 0.8rem; display: flex; flex-direction: column; gap: 10px;">
              <div>
                <span style="color: #94a3b8; display: block;">1. RAW DECODED TEXT:</span>
                <div id="hms-debug-raw" style="background: #1e293b; padding: 8px; border-radius: 6px; color: #4ade80; word-break: break-all;">-</div>
              </div>
              <div>
                <span style="color: #94a3b8; display: block;">2. PARSED PAYLOAD JSON:</span>
                <pre id="hms-debug-parsed" style="background: #1e293b; padding: 8px; border-radius: 6px; color: #f43f5e; margin: 0; white-space: pre-wrap; word-break: break-all;">-</pre>
              </div>
              <div>
                <span style="color: #94a3b8; display: block;">3. DETECTED TYPE:</span>
                <div id="hms-debug-type" style="background: #1e293b; padding: 8px; border-radius: 6px; color: #38bdf8; font-weight: bold;">-</div>
              </div>
              <div>
                <span style="color: #94a3b8; display: block;">4. ROUTING RESULT:</span>
                <div id="hms-debug-route" style="background: #1e293b; padding: 8px; border-radius: 6px; color: #fbbf24;">-</div>
              </div>
            </div>

            <div style="margin-top: 16px; display: flex; gap: 10px;">
              <button type="button" id="hms-debug-btn-proceed" style="flex: 1; background: #0284c7; color: white; border: none; padding: 10px; border-radius: 8px; font-weight: bold; cursor: pointer;">
                Proceed Workflow &rarr;
              </button>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(container);
      this.overlayEl = container;
      this.cameraContainerEl = document.getElementById('hms-scanner-camera-container');

      this.attachEvents();
    }

    /* ----------------------------------------------------------------------
       2. Attach DOM Event Listeners
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
       3. Open Scanner Fullscreen Overlay
       ---------------------------------------------------------------------- */
    async open(options = {}) {
      this.initDOM();
      await this.ensureHtml5QrcodeLoaded();

      this.onScanCallback = options.onScan || null;
      this.onCloseCallback = options.onClose || null;
      this.onManualCallback = options.onManual || null;

      const headerTitle = document.getElementById('hms-scanner-header-title');
      if (headerTitle) headerTitle.textContent = options.title || 'Universal QR Scanner';

      const mainText = document.getElementById('hms-bottom-text-main');
      if (mainText) mainText.textContent = options.mainText || 'Align the QR code inside the frame';

      const subText = document.getElementById('hms-bottom-text-sub');
      if (subText) subText.textContent = options.subText || 'The QR will be scanned automatically.';

      const manualBtn = document.getElementById('hms-btn-manual-entry');
      if (manualBtn) {
        manualBtn.style.display = options.allowManual ? 'inline-flex' : 'none';
      }

      const debugBackdrop = document.getElementById('hms-debug-modal-backdrop');
      if (debugBackdrop) debugBackdrop.style.display = 'none';

      const errorOverlay = document.getElementById('hms-scanner-error-overlay');
      if (errorOverlay) errorOverlay.style.display = 'none';

      const successOverlay = document.getElementById('hms-scanner-success-overlay');
      if (successOverlay) successOverlay.classList.remove('active');

      this.overlayEl.classList.remove('hms-hidden');
      document.body.style.overflow = 'hidden';

      this.isScanning = true;
      this.scanLock = false;
      this.isTorchOn = false;

      const torchBtn = document.getElementById('hms-scanner-btn-torch');
      if (torchBtn) torchBtn.classList.remove('active');

      await this.startCamera();
    }

    /* ----------------------------------------------------------------------
       4. Camera Initialization via html5-qrcode (Auto Rear Camera Selection)
       ---------------------------------------------------------------------- */
    async startCamera() {
      const loader = document.getElementById('hms-scanner-loader-el');
      const errorOverlay = document.getElementById('hms-scanner-error-overlay');
      if (loader) loader.style.display = 'flex';
      if (errorOverlay) errorOverlay.style.display = 'none';

      await this.releaseStream();

      if (!global.Html5Qrcode) {
        const loaded = await this.ensureHtml5QrcodeLoaded();
        if (!loaded) {
          this.showErrorState('Engine Error', 'Failed to load html5-qrcode scanner library.');
          return;
        }
      }

      try {
        // Enumerate video cameras
        try {
          const cameras = await global.Html5Qrcode.getCameras();
          this.availableCameras = cameras || [];
        } catch (e) {
          console.warn('Could not enumerate cameras via Html5Qrcode:', e);
          this.availableCameras = [];
        }

        // Auto-select Rear / Environment camera
        let selectedCameraId = null;
        if (this.availableCameras.length > 0) {
          const findByLabel = (kw) => this.availableCameras.find(c => (c.label || '').toLowerCase().includes(kw));
          const rearCam = findByLabel('back') ||
                          findByLabel('environment') ||
                          findByLabel('rear') ||
                          findByLabel('facing back') ||
                          this.availableCameras[this.availableCameras.length - 1];

          if (rearCam) {
            selectedCameraId = rearCam.id;
            this.currentCameraIndex = this.availableCameras.findIndex(c => c.id === rearCam.id);
          }
        }

        // Create Html5Qrcode instance targeted at our container
        this.html5QrCode = new global.Html5Qrcode('hms-scanner-camera-container', { verbose: false });

        // Build camera constraint (Device ID or environment facingMode fallback)
        const cameraConfig = selectedCameraId
          ? { deviceId: { exact: selectedCameraId } }
          : { facingMode: 'environment' };

        const scanConfig = {
          fps: 15,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            const boxSize = Math.floor(minEdge * 0.72);
            return { width: Math.max(boxSize, 200), height: Math.max(boxSize, 200) };
          },
          aspectRatio: 1.0
        };

        // Start scanning with html5-qrcode engine
        await this.html5QrCode.start(
          cameraConfig,
          scanConfig,
          (decodedText, decodedResult) => {
            if (this.isScanning && !this.scanLock) {
              this.handleDecodeSuccess(decodedText);
            }
          },
          (errorMessage) => {
            // Frame parse error - ignore standard non-QR frame errors
          }
        );

        console.log('▶ html5-qrcode scanner started successfully!');
        if (loader) loader.style.display = 'none';

      } catch (err) {
        console.error('Camera Initialization Error:', err);
        this.showErrorState(
          err.name === 'NotAllowedError' ? 'Camera Permission Denied' : 'Camera Unavailable',
          'Unable to access camera lens. Please check browser camera permissions.'
        );
      }
    }

    /* ----------------------------------------------------------------------
       5. Existing Callback Bridge: handleDecodeSuccess(decodedText)
       ---------------------------------------------------------------------- */
    handleDecodeSuccess(decodedText) {
      this.handleScanResult(decodedText);
    }

    /* ----------------------------------------------------------------------
       6. Process & Debug Log Scanned Result (With 2s Duplicate Scan Prevention)
       ---------------------------------------------------------------------- */
    handleScanResult(decodedText) {
      if (!this.isScanning || this.scanLock) return;

      // Duplicate scan prevention (2000ms debounce window)
      const now = Date.now();
      if (this._lastScannedText === decodedText && (now - this._lastScannedTime < 2000)) {
        console.log('Duplicate QR scan ignored within 2000ms debounce window:', decodedText);
        return;
      }

      this._lastScannedText = decodedText;
      this._lastScannedTime = now;
      this.scanLock = true; // Lock immediately to prevent duplicate triggers

      console.log("%c=== UNIVERSAL QR DECODED (html5-qrcode) ===", "color: #10b981; font-weight: bold; font-size: 14px;", decodedText);

      let payload = null;
      let parseError = null;

      try {
        payload = JSON.parse(decodedText);
      } catch (err) {
        parseError = err;
        console.warn("QR JSON parse error, attempting legacy token mapping:", err);

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
        }
      }

      const detectedType = payload ? (payload.type || 'UNKNOWN') : 'INVALID_JSON';
      let routingResult = 'Executing Universal Workflow...';

      if (detectedType === 'OUTPASS') {
        routingResult = 'Routing to Warden Gate Control Outpass Exit/Return Flow';
      } else if (detectedType === 'STUDY_HOUR') {
        routingResult = 'Routing to Study Hour Attendance Verification Flow';
      } else if (detectedType === 'VISITOR') {
        routingResult = 'Routing to Visitor Gate Check-in Flow';
      } else {
        routingResult = 'Unknown/Unsupported Module Type';
      }

      // Update Debug Modal Panel
      const debugBackdrop = document.getElementById('hms-debug-modal-backdrop');
      const debugRaw = document.getElementById('hms-debug-raw');
      const debugParsed = document.getElementById('hms-debug-parsed');
      const debugType = document.getElementById('hms-debug-type');
      const debugRoute = document.getElementById('hms-debug-route');
      const btnProceed = document.getElementById('hms-debug-btn-proceed');

      if (debugRaw) debugRaw.textContent = decodedText;
      if (debugParsed) debugParsed.textContent = payload ? JSON.stringify(payload, null, 2) : `Error: ${parseError ? parseError.message : 'Invalid Payload'}`;
      if (debugType) debugType.textContent = detectedType;
      if (debugRoute) debugRoute.textContent = routingResult;

      if (!payload || !payload.type) {
        if (navigator.vibrate) navigator.vibrate(250);
        this.scanLock = false;
        this.showInvalidPopup(parseError ? parseError.message : 'Invalid QR code format. Structured JSON required.');
        return;
      }

      const executeScanWorkflow = () => {
        if (debugBackdrop) debugBackdrop.style.display = 'none';
        this.handleSuccessfulScan(decodedText);
      };

      if (debugBackdrop && window.location.search.includes('debug=true')) {
        debugBackdrop.style.display = 'flex';
        const closeDebug = document.getElementById('hms-debug-btn-close');
        if (closeDebug) closeDebug.onclick = () => {
          debugBackdrop.style.display = 'none';
          this.close();
        };
        if (btnProceed) btnProceed.onclick = () => executeScanWorkflow();
      } else {
        executeScanWorkflow();
      }
    }

    async handleSuccessfulScan(qrData) {
      this.isScanning = false;

      // Haptic Feedback
      if (navigator.vibrate) {
        try {
          navigator.vibrate([100, 50, 100]);
        } catch (e) {}
      }

      // Audio Chime
      this.playAudioBeep();

      // Show Success Checkmark Overlay
      const successOverlay = document.getElementById('hms-scanner-success-overlay');
      if (successOverlay) {
        successOverlay.classList.add('active');
      }

      await this.releaseStream();

      await new Promise((r) => setTimeout(r, 650));
      this.close(true);

      if (typeof this.onScanCallback === 'function') {
        this.onScanCallback(qrData);
      }
    }

    /* ----------------------------------------------------------------------
       7. Toggle Flashlight Torch Control
       ---------------------------------------------------------------------- */
    async toggleTorch() {
      try {
        this.isTorchOn = !this.isTorchOn;

        let torchApplied = false;
        if (this.html5QrCode && typeof this.html5QrCode.applyVideoConstraints === 'function') {
          try {
            await this.html5QrCode.applyVideoConstraints({
              advanced: [{ torch: this.isTorchOn }]
            });
            torchApplied = true;
          } catch (e) {
            console.warn('html5QrCode applyVideoConstraints torch failed:', e);
          }
        }

        if (!torchApplied) {
          // Fallback directly to video element track constraints
          const container = document.getElementById('hms-scanner-camera-container');
          const video = container ? container.querySelector('video') : null;
          const stream = video ? video.srcObject : null;
          const track = stream ? stream.getVideoTracks()[0] : null;

          if (track && track.applyConstraints) {
            await track.applyConstraints({ advanced: [{ torch: this.isTorchOn }] });
            torchApplied = true;
          }
        }

        const torchBtn = document.getElementById('hms-scanner-btn-torch');
        if (torchBtn) {
          torchBtn.classList.toggle('active', this.isTorchOn);
        }

        if (!torchApplied && typeof showToast === 'function') {
          showToast('Flashlight torch is not supported on this camera device.', 'warning');
        }
      } catch (err) {
        console.warn('Torch activation error:', err);
      }
    }

    /* ----------------------------------------------------------------------
       8. Switch Camera Lenses
       ---------------------------------------------------------------------- */
    async switchCamera() {
      if (this.availableCameras.length <= 1) {
        this.currentCameraIndex = (this.currentCameraIndex + 1) % 2;
      } else {
        this.currentCameraIndex = (this.currentCameraIndex + 1) % this.availableCameras.length;
      }

      if (this.isScanning) {
        await this.startCamera();
      }
    }

    /* ----------------------------------------------------------------------
       9. Error & Invalid Dialog Popups
       ---------------------------------------------------------------------- */
    showErrorState(title, message) {
      this.isScanning = false;
      this.scanLock = false;
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
      this.releaseStream();

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
          this.scanLock = false;
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
       10. Clean Disposal & Memory Release
       ---------------------------------------------------------------------- */
    async releaseStream() {
      this.isScanning = false;
      if (this.html5QrCode) {
        try {
          if (this.html5QrCode.isScanning) {
            await this.html5QrCode.stop();
          }
          this.html5QrCode.clear();
        } catch (e) {
          console.warn('html5QrCode releaseStream warning:', e);
        }
        this.html5QrCode = null;
      }
    }

    close(isSuccessScan = false) {
      this.releaseStream();

      if (this.overlayEl) {
        this.overlayEl.classList.add('hms-hidden');
      }

      const debugBackdrop = document.getElementById('hms-debug-modal-backdrop');
      if (debugBackdrop) debugBackdrop.style.display = 'none';

      document.body.style.overflow = '';

      if (!isSuccessScan && typeof this.onCloseCallback === 'function') {
        this.onCloseCallback();
      }
    }
  }

  global.HMSQRScanner = new HMSQRScannerManager();
})(typeof self !== 'undefined' ? self : this);
