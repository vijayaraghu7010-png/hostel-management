import { BrowserQRCodeReader } from '@zxing/browser';
import type { IScannerControls } from '@zxing/browser';

export interface ScanCallback {
  (text: string): void;
}

export class ScannerEngine {
  private codeReader: BrowserQRCodeReader;
  private currentControls: IScannerControls | null = null;
  private isScanning: boolean = false;
  private isPaused: boolean = false;

  constructor() {
    this.codeReader = new BrowserQRCodeReader();
  }

  async start(
    deviceId: string | undefined,
    videoElement: HTMLVideoElement,
    onScan: ScanCallback
  ): Promise<IScannerControls> {
    this.stop();

    this.isScanning = true;
    this.isPaused = false;

    try {
      this.currentControls = await this.codeReader.decodeFromVideoDevice(
        deviceId,
        videoElement,
        (result, _error) => {
          if (this.isPaused || !this.isScanning) return;

          if (result) {
            const text = result.getText();
            if (text) {
              onScan(text);
            }
          }
        }
      );

      return this.currentControls;
    } catch (err) {
      this.isScanning = false;
      throw err;
    }
  }

  pause(): void {
    this.isPaused = true;
  }

  resume(): void {
    this.isPaused = false;
  }

  stop(): void {
    this.isScanning = false;
    this.isPaused = false;

    if (this.currentControls) {
      try {
        this.currentControls.stop();
      } catch {
        // Ignore stop error on unmount
      }
      this.currentControls = null;
    }
  }

  getIsScanning(): boolean {
    return this.isScanning;
  }

  getIsPaused(): boolean {
    return this.isPaused;
  }

  getStream(): MediaStream | null {
    if (!this.currentControls) return null;
    
    // IScannerControls implementation has stream or video element reference
    const controlsObj = this.currentControls as unknown as { stream?: MediaStream };
    return controlsObj.stream || null;
  }
}
