import type { CameraDevice } from '@/types/scanner';

export class CameraManager {
  static async requestPermission(): Promise<boolean> {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('MediaDevices API is not supported in this browser/environment');
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      this.stopStreamTracks(stream);
      return true;
    } catch {
      // Retry with fallback constraint
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        this.stopStreamTracks(stream);
        return true;
      } catch {
        throw new Error('Camera access permission denied or camera unavailable');
      }
    }
  }

  static async getAvailableCameras(): Promise<CameraDevice[]> {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      return [];
    }

    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoInputs = devices.filter((d) => d.kind === 'videoinput');

    return videoInputs.map((device, index) => {
      const label = device.label || `Camera ${index + 1}`;
      const lowerLabel = label.toLowerCase();
      const isBackCamera =
        lowerLabel.includes('back') ||
        lowerLabel.includes('rear') ||
        lowerLabel.includes('environment') ||
        lowerLabel.includes('0, facing back');

      return {
        deviceId: device.deviceId,
        label,
        isBackCamera,
      };
    });
  }

  static selectOptimalCamera(cameras: CameraDevice[]): CameraDevice | null {
    if (!cameras || cameras.length === 0) return null;

    // Prefer back/rear camera for scanning QR codes
    const rearCamera = cameras.find((c) => c.isBackCamera);
    if (rearCamera) return rearCamera;

    // Default to the last camera in list (often rear on mobile) or first
    return cameras[cameras.length - 1] || cameras[0];
  }

  static isTorchSupported(stream: MediaStream | null): boolean {
    if (!stream) return false;
    const tracks = stream.getVideoTracks();
    if (tracks.length === 0) return false;

    const track = tracks[0];
    if (typeof track.getCapabilities === 'function') {
      const capabilities = track.getCapabilities() as Record<string, unknown>;
      return Boolean(capabilities.torch);
    }

    return false;
  }

  static async setTorch(stream: MediaStream | null, enabled: boolean): Promise<boolean> {
    if (!stream) return false;
    const tracks = stream.getVideoTracks();
    if (tracks.length === 0) return false;

    const track = tracks[0];
    if (!this.isTorchSupported(stream)) return false;

    try {
      await (track as unknown as { applyConstraints: (c: unknown) => Promise<void> }).applyConstraints({
        advanced: [{ torch: enabled }],
      });
      return true;
    } catch {
      return false;
    }
  }

  static stopStreamTracks(stream: MediaStream | null): void {
    if (!stream) return;
    stream.getTracks().forEach((track) => {
      track.stop();
    });
  }
}
