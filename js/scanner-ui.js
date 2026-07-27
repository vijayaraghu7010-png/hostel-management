/**
 * HMS PRODUCTION DEDICATED QR SCANNER CONTROLLER (METRO / GPAY / PHONEPE STYLE)
 * Fullscreen mobile-first scanner UI with native BarcodeDetector & fallback JS engine
 */
(function (global) {
  'use strict';

  class HMSQRScannerManager {
    constructor() {
      this.overlayEl = null;
      this.videoEl = null;
      this.canvasEl = document.createElement('canvas');
      this.ctx = this.canvasEl.getContext('2d', { willReadFrequently: true });
      this.stream = null;
      this.isScanning = false;
      this.isProcessingScan = false;
      this.isTorchOn = false;
      this.facingMode = 'environment'; // 'environment' | 'user'
      this.lastScannedText = '';
      this.lastScanTimestamp = 0;
      this.animationFrameId = null;
      this.barcodeDetector = null;
      
      // Callbacks
      this.onScanCallback = null;
      this.onCloseCallback = null;
      this.onManualCallback = null;

      // Audio context for crystal-clear success chime
      this.audioCtx = null;

      // Initialize BarcodeDetector if available (Native Android Chrome GPU engine)
      if ('BarcodeDetector' in global) {
        try {
          this.barcodeDetector = new global.BarcodeDetector({ formats: ['qr_code'] });
        } catch (e) {
          console.warn('BarcodeDetector initialization warning:', e);
        }
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
      // Back button
      const backBtn = document.getElementById('hms-scanner-btn-back');
      if (backBtn) {
        backBtn.addEventListener('click', () => this.close());
      }

      // Flashlight toggle
      const torchBtn = document.getElementById('hms-scanner-btn-torch');
      if (torchBtn) {
        torchBtn.addEventListener('click', () => this.toggleTorch());
      }

      // Switch camera (Rear / Front)
      const switchBtn = document.getElementById('hms-scanner-btn-switch');
      if (switchBtn) {
        switchBtn.addEventListener('click', () => this.switchCamera());
      }

      // Retry camera
      const retryBtn = document.getElementById('hms-btn-retry-camera');
      if (retryBtn) {
        retryBtn.addEventListener('click', () => this.startCamera());
      }

      // Error close
      const errorCloseBtn = document.getElementById('hms-btn-error-close');
      if (errorCloseBtn) {
        errorCloseBtn.addEventListener('click', () => this.close());
      }

      // Manual entry button
      const manualBtn = document.getElementById('hms-btn-manual-entry');
      if (manualBtn) {
        manualBtn.addEventListener('click', () => {
          this.close();
          if (typeof this.onManualCallback === 'function') {
            this.onManualCallback();
          }
        });
      }

      // Page unload & visibility cleanup
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

      // Update UI titles & hints
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

      // Hide error & success overlays
      const errorOverlay = document.getElementById('hms-scanner-error-overlay');
      if (errorOverlay) errorOverlay.style.display = 'none';

      const successOverlay = document.getElementById('hms-scanner-success-overlay');
      if (successOverlay) successOverlay.classList.remove('active');

      // Reset state
      this.isProcessingScan = false;
      this.lastScannedText = '';

      // Show Fullscreen Dedicated Scanner Page
      this.overlayEl.classList.remove('hms-hidden');
      document.body.style.overflow = 'hidden';

      // Start Camera
      await this.startCamera();
    }

    /* ----------------------------------------------------------------------
       4. Start Camera Stream & High-Performance Frame Loop
       ---------------------------------------------------------------------- */
    async startCamera() {
      // Hide error overlay if retrying
      const errorOverlay = document.getElementById('hms-scanner-error-overlay');
      if (errorOverlay) errorOverlay.style.display = 'none';

      // Release any existing stream first
      this.releaseStream();

      const constraints = {
        video: {
          facingMode: { ideal: this.facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        },
        audio: false
      };

      try {
        this.stream = await navigator.mediaDevices.getUserMedia(constraints);
        this.videoEl.srcObject = this.stream;
        
        // Handle mirroring for front camera
        if (this.facingMode === 'user') {
          this.videoEl.classList.add('mirror');
        } else {
          this.videoEl.classList.remove('mirror');
        }

        await new Promise((resolve) => {
          this.videoEl.onloadedmetadata = () => {
            this.videoEl.play();
            resolve();
          };
        });

        this.isScanning = true;
        this.isTorchOn = false;
        
        const torchBtn = document.getElementById('hms-scanner-btn-torch');
        if (torchBtn) torchBtn.classList.remove('active');

        // Apply continuous focus if available
        try {
          const track = this.stream.getVideoTracks()[0];
          if (track && track.applyConstraints) {
            track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] }).catch(() => {});
          }
        } catch (e) {}

        // Launch Scanning Loop
        this.startScanningLoop();
      } catch (err) {
        console.error('Camera startup error:', err);
        this.showErrorState(
          err.name === 'NotAllowedError' ? 'Camera Permission Denied' : 'Camera Unavailable',
          err.name === 'NotAllowedError' 
            ? 'Please allow camera access in your browser settings to scan QR codes.'
            : 'Unable to start camera lens. Please check if another app is using the camera and retry.',
          true
        );
      }
    }

    /* ----------------------------------------------------------------------
       5. Frame Scanning Loop (Native BarcodeDetector + Fallback jsQR)
       ---------------------------------------------------------------------- */
    startScanningLoop() {
      const scanFrame = async () => {
        if (!this.isScanning) return;

        if (this.videoEl && this.videoEl.readyState === this.videoEl.HAVE_ENOUGH_DATA && !this.isProcessingScan) {
          try {
            let decodedText = null;

            // 1. Try Native GPU BarcodeDetector (Chrome Android)
            if (this.barcodeDetector) {
              try {
                const barcodes = await this.barcodeDetector.detect(this.videoEl);
                if (barcodes && barcodes.length > 0) {
                  decodedText = barcodes[0].rawValue;
                }
              } catch (e) {
                // Fallback to canvas
              }
            }

            // 2. Fallback to Canvas Inspection + jsQR
            if (!decodedText && global.jsQR) {
              const width = this.videoEl.videoWidth;
              const height = this.videoEl.videoHeight;
              if (width > 0 && height > 0) {
                this.canvasEl.width = width;
                this.canvasEl.height = height;
                this.ctx.drawImage(this.videoEl, 0, 0, width, height);
                const imageData = this.ctx.getImageData(0, 0, width, height);
                const qrResult = global.jsQR(imageData.data, imageData.width, imageData.height);
                if (qrResult && qrResult.data) {
                  decodedText = qrResult.data;
                }
              }
            }

            // 3. Process Decoded QR Code
            if (decodedText) {
              const now = Date.now();
              // Debounce duplicate scans within 2.5s
              if (decodedText !== this.lastScannedText || (now - this.lastScanTimestamp > 2500)) {
                this.lastScannedText = decodedText;
                this.lastScanTimestamp = now;
                this.handleSuccessfulScan(decodedText);
                return;
              }
            }
          } catch (err) {
            console.warn('Frame inspection warning:', err);
          }
        }

        if (this.isScanning) {
          this.animationFrameId = requestAnimationFrame(scanFrame);
        }
      };

      this.animationFrameId = requestAnimationFrame(scanFrame);
    }

    /* ----------------------------------------------------------------------
       6. Successful Scan Handling (Feedback + Animation + Release + Callback)
       ---------------------------------------------------------------------- */
    async handleSuccessfulScan(qrData) {
      this.isProcessingScan = true;
      this.isScanning = false;
      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
      }

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

      // Immediately stop camera & release resources
      this.releaseStream();

      // Wait 600ms for user to enjoy green check animation
      await new Promise((r) => setTimeout(r, 600));

      // Close Fullscreen Overlay
      this.close(true);

      // Invoke Callback
      if (typeof this.onScanCallback === 'function') {
        this.onScanCallback(qrData);
      }
    }

    /* ----------------------------------------------------------------------
       7. Flashlight / Torch Toggle
       ---------------------------------------------------------------------- */
    async toggleTorch() {
      if (!this.stream || !this.isScanning) return;
      try {
        const track = this.stream.getVideoTracks()[0];
        if (!track) return;

        const capabilities = track.getCapabilities ? track.getCapabilities() : {};
        if (!capabilities.torch) {
          if (typeof showToast === 'function') {
            showToast('Flashlight torch is not supported on this camera lens.', 'warning');
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

        if (typeof showToast === 'function') {
          showToast(this.isTorchOn ? 'Flashlight On' : 'Flashlight Off', 'info');
        }
      } catch (err) {
        console.warn('Torch constraint error:', err);
      }
    }

    /* ----------------------------------------------------------------------
       8. Switch Camera (Rear vs Front)
       ---------------------------------------------------------------------- */
    async switchCamera() {
      this.facingMode = this.facingMode === 'environment' ? 'user' : 'environment';
      if (typeof showToast === 'function') {
        showToast(`Switched to ${this.facingMode === 'environment' ? 'Rear' : 'Front'} Camera`, 'info');
      }
      if (this.isScanning) {
        await this.startCamera();
      }
    }

    /* ----------------------------------------------------------------------
       9. Error State Handler
       ---------------------------------------------------------------------- */
    showErrorState(title, message, isPermissionError) {
      this.isScanning = false;
      this.releaseStream();

      const titleEl = document.getElementById('hms-error-title-text');
      if (titleEl) titleEl.textContent = title || 'Camera Error';

      const msgEl = document.getElementById('hms-error-msg-text');
      if (msgEl) msgEl.textContent = message || 'Camera permission denied or camera lens unavailable.';

      const errorOverlay = document.getElementById('hms-scanner-error-overlay');
      if (errorOverlay) errorOverlay.style.display = 'flex';
    }

    /* ----------------------------------------------------------------------
       10. Professional Invalid QR Code Popup Bottom Sheet
       ---------------------------------------------------------------------- */
    showInvalidPopup(message, onScanAgain) {
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
      };

      if (closeBtn) {
        closeBtn.onclick = closeHandler;
      }
      if (modalBackdrop) {
        modalBackdrop.onclick = (e) => {
          if (e.target === modalBackdrop) closeHandler();
        };
      }

      if (retryBtn) {
        retryBtn.onclick = () => {
          closeHandler();
          if (typeof onScanAgain === 'function') {
            onScanAgain();
          } else {
            this.open({ onScan: this.onScanCallback });
          }
        };
      }
    }

    /* ----------------------------------------------------------------------
       11. Synthesize Crystal Clear Audio Chime Feedback
       ---------------------------------------------------------------------- */
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

    /* ----------------------------------------------------------------------
       12. Release Camera MediaStream Tracks (Prevents Memory Leaks / Lock)
       ---------------------------------------------------------------------- */
    releaseStream() {
      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
      }
      this.isScanning = false;

      if (this.stream) {
        try {
          this.stream.getTracks().forEach((track) => {
            track.stop();
          });
        } catch (e) {
          console.warn('Track stop error:', e);
        }
        this.stream = null;
      }

      if (this.videoEl) {
        this.videoEl.srcObject = null;
      }
    }

    /* ----------------------------------------------------------------------
       13. Close Fullscreen Scanner
       ---------------------------------------------------------------------- */
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

  // Export Singleton Instance
  global.HMSQRScanner = new HMSQRScannerManager();
})(typeof self !== 'undefined' ? self : this);
