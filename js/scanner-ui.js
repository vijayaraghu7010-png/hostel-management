/**
 * HMS PRODUCTION UNIVERSAL QR SCANNER CONTROLLER
 * Robust @zxing/browser + Nimiq QrScanner + BarcodeDetector Architecture
 */
(function (global) {
  'use strict';

  class HMSQRScannerManager {
    constructor() {
      this.overlayEl = null;
      this.videoEl = null;
      this.isScanning = false;
      this.scanLock = false;
      this.isTorchOn = false;
      this.activeDevices = [];
      this.currentDeviceIndex = 0;
      this.activeStream = null;
      this.scanTimer = null;
      this.activeTier = 'ZXING_BROWSER';

      // Engine instances
      this.zxingReader = null;
      this.zxingControls = null;
      this.nimiqScanner = null;
      this.barcodeDetector = null;

      this.onScanCallback = null;
      this.onCloseCallback = null;
      this.onManualCallback = null;
      this.audioCtx = null;

      this.initEngines();
    }

    /* ----------------------------------------------------------------------
       1. Initialize Engines (Feature-detect BarcodeDetector & @zxing/browser)
       ---------------------------------------------------------------------- */
    initEngines() {
      // Tier 1: @zxing/browser
      if (global.ZXingBrowser && global.ZXingBrowser.BrowserQRCodeReader) {
        try {
          this.zxingReader = new global.ZXingBrowser.BrowserQRCodeReader();
          this.activeTier = 'ZXING_BROWSER';
          console.log('✓ Primary Engine Initialized: @zxing/browser');
        } catch (e) {
          console.warn('ZXing Browser init warning:', e);
        }
      }

      // Feature-detect native BarcodeDetector for hardware acceleration fallback
      if ('BarcodeDetector' in global) {
        try {
          this.barcodeDetector = new global.BarcodeDetector({ formats: ['qr_code'] });
          console.log('⚡ Hardware GPU Acceleration Available: BarcodeDetector');
        } catch (e) {
          this.barcodeDetector = null;
        }
      }
    }

    /* ----------------------------------------------------------------------
       2. Inject Universal Fullscreen Scanner DOM Layout
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
        <div class="hms-scanner-viewfinder">
          <!-- Loading Spinner Overlay -->
          <div class="hms-scanner-loader" id="hms-scanner-loader-el" style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; background: rgba(5,7,10,0.92); z-index: 100; gap: 1rem;">
            <i class="fa-solid fa-circle-notch fa-spin fa-3x" style="color: #38bdf8;"></i>
            <span style="color: #ffffff; font-size: 0.9rem; font-weight: 500;" id="hms-scanner-status-text">Initializing HD Lens...</span>
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

        <!-- Temporary Debug Sheet Modal -->
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
      this.videoEl = document.getElementById('hms-scanner-video-el');

      this.attachEvents();
    }

    /* ----------------------------------------------------------------------
       3. Attach DOM Event Listeners
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
       4. Open Scanner Fullscreen Overlay
       ---------------------------------------------------------------------- */
    async open(options = {}) {
      this.initDOM();

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
      await this.startCamera();
    }

    /* ----------------------------------------------------------------------
       5. Camera Initialization (Ideal Constraints & Graceful Degradation Fallback)
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

        // Try Tier 1: @zxing/browser (Preferred Engine with IDEAL-ONLY resolution constraints)
        if (this.zxingReader && this.activeTier === 'ZXING_BROWSER') {
          try {
            const constraints = {
              video: {
                deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined,
                facingMode: selectedDeviceId ? undefined : { ideal: 'environment' },
                width: { ideal: 1920 },
                height: { ideal: 1080 }
              }
            };

            this.zxingControls = await this.zxingReader.decodeFromConstraints(
              constraints,
              this.videoEl,
              (result, err, controls) => {
                if (result && this.isScanning && !this.scanLock) {
                  this.handleScanResult(result.getText());
                } else if (err) {
                  // Filter out expected per-frame NotFoundException from real decode errors
                  const isNotFound = err.name === 'NotFoundException' ||
                                    (err.constructor && err.constructor.name === 'NotFoundException') ||
                                    (err.message && err.message.includes('No MultiFormat Readers'));
                  if (!isNotFound) {
                    console.warn('⚡ Real ZXing Frame Error:', err);
                  }
                }
              }
            );
            console.log('▶ Started scanning via Tier 1 (@zxing/browser)');
            if (loader) loader.style.display = 'none';
            return;
          } catch (zxingErr) {
            console.warn('Tier 1 (@zxing/browser) HD constraints failed, retrying with minimal constraints:', zxingErr);
            // Fallback retry with minimal constraints before abandoning Tier 1
            try {
              this.zxingControls = await this.zxingReader.decodeFromConstraints(
                { video: { facingMode: { ideal: 'environment' } } },
                this.videoEl,
                (result, err) => {
                  if (result && this.isScanning && !this.scanLock) {
                    this.handleScanResult(result.getText());
                  }
                }
              );
              console.log('▶ Started scanning via Tier 1 (@zxing/browser minimal fallback)');
              if (loader) loader.style.display = 'none';
              return;
            } catch (minZxingErr) {
              console.warn('Tier 1 minimal fallback failed, advancing to Tier 2 (Nimiq):', minZxingErr);
              this.activeTier = 'NIMIQ_SCANNER';
            }
          }
        }

        // Fallback Tier 2: Nimiq QrScanner (ONLY initialized if Tier 1 fails)
        if (this.activeTier === 'NIMIQ_SCANNER' && global.QrScanner) {
          try {
            this.nimiqScanner = new global.QrScanner(
              this.videoEl,
              (result) => {
                if (this.isScanning && !this.scanLock) {
                  const text = typeof result === 'object' ? result.data : result;
                  this.handleScanResult(text);
                }
              },
              {
                preferredCamera: 'environment',
                highlightScanRegion: false,
                highlightCodeOutline: false,
                maxScansPerSecond: 10
              }
            );
            await this.nimiqScanner.start();
            console.log('▶ Started scanning via Tier 2 (Nimiq QrScanner)');
            if (loader) loader.style.display = 'none';
            return;
          } catch (nimiqErr) {
            console.warn('Tier 2 (Nimiq) failed, attempting native BarcodeDetector fallback:', nimiqErr);
          }
        }

        // Fallback Tier 3: Native BarcodeDetector (feature-detected)
        if ('BarcodeDetector' in global) {
          const videoConstraints = {
            facingMode: selectedDeviceId ? undefined : { ideal: 'environment' },
            deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined,
            width: { ideal: 1280 },
            height: { ideal: 720 }
          };

          this.activeStream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints, audio: false });
          this.videoEl.srcObject = this.activeStream;
          await this.videoEl.play();

          const track = this.activeStream.getVideoTracks()[0];
          if (track && track.applyConstraints) {
            try {
              await track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] });
            } catch (e) {}
          }

          this.startNativeDetectionLoop();
          if (loader) loader.style.display = 'none';
          return;
        }

        throw new Error('No compatible QR decoding engine available.');

      } catch (err) {
        console.error('Camera Stream Initialization Error:', err);
        this.showErrorState(
          err.name === 'NotAllowedError' ? 'Camera Permission Denied' : 'Camera Unavailable',
          'Unable to access camera lens. Please check permissions.'
        );
      }
    }

    startNativeDetectionLoop() {
      const scanFrame = async () => {
        if (!this.isScanning || this.scanLock || !this.videoEl) return;

        if (this.videoEl.readyState >= 2 && !this.videoEl.paused && !this.videoEl.ended) {
          let decodedText = null;
          if (this.barcodeDetector) {
            try {
              const barcodes = await this.barcodeDetector.detect(this.videoEl);
              if (barcodes && barcodes.length > 0) {
                decodedText = barcodes[0].rawValue;
              }
            } catch (e) {}
          }

          if (decodedText && this.isScanning && !this.scanLock) {
            this.handleScanResult(decodedText);
            return;
          }
        }

        if (this.isScanning && !this.scanLock) {
          this.scanTimer = setTimeout(scanFrame, 120);
        }
      };

      scanFrame();
    }

    /* ----------------------------------------------------------------------
       6. Process & Debug Log Scanned Result
       ---------------------------------------------------------------------- */
    handleScanResult(decodedText) {
      if (!this.isScanning || this.scanLock) return;
      this.scanLock = true; // Lock immediately to prevent duplicate triggers

      // Print decoded value in Console
      console.log("%c=== UNIVERSAL QR DECODED ===", "color: #10b981; font-weight: bold; font-size: 14px;", decodedText);

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

      if (debugBackdrop) {
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

      this.releaseStream();

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
        await track.applyConstraints({ advanced: [{ torch: this.isTorchOn }] });

        const torchBtn = document.getElementById('hms-scanner-btn-torch');
        if (torchBtn) {
          torchBtn.classList.toggle('active', this.isTorchOn);
        }
      } catch (err) {
        console.warn('Torch activation error:', err);
      }
    }

    /* ----------------------------------------------------------------------
       8. Switch Camera Lenses
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
    releaseStream() {
      this.isScanning = false;
      if (this.scanTimer) {
        clearTimeout(this.scanTimer);
        this.scanTimer = null;
      }

      // Explicitly stop @zxing/browser controls
      if (this.zxingControls) {
        try {
          this.zxingControls.stop();
        } catch (e) {}
        this.zxingControls = null;
      }

      // Explicitly stop Nimiq QrScanner
      if (this.nimiqScanner) {
        try {
          this.nimiqScanner.stop();
          this.nimiqScanner.destroy();
        } catch (e) {}
        this.nimiqScanner = null;
      }

      // Explicitly stop MediaStream tracks
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
