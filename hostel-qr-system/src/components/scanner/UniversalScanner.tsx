import React from 'react';
import type { ParsedScanResult } from '@/types/scanner';
import { useScanner } from '@/hooks/useScanner';
import { ScannerOverlay } from './ScannerOverlay';
import { ScannerControls } from './ScannerControls';
import { CameraSelector } from './CameraSelector';
import { Card, Button } from '@/components/ui';
import { CameraOff, AlertOctagon, RefreshCw, X } from 'lucide-react';

export interface UniversalScannerProps {
  onScanResult: (result: ParsedScanResult) => void;
  onClose?: () => void;
  autoStart?: boolean;
  duplicateIntervalMs?: number;
  title?: string;
  className?: string;
}

export const UniversalScanner: React.FC<UniversalScannerProps> = ({
  onScanResult,
  onClose,
  autoStart = true,
  duplicateIntervalMs = 3000,
  title = 'Universal QR Scanner',
  className = '',
}) => {
  const {
    videoRef,
    camera,
    isScanning,
    isPaused,
    pauseScanning,
    resumeScanning,
  } = useScanner({
    onScanResult,
    autoStart,
    duplicateIntervalMs,
  });

  return (
    <div className={`relative w-full max-w-lg mx-auto flex flex-col items-center gap-4 ${className}`}>
      {/* Top Camera Switcher Bar */}
      {camera.hasPermission && camera.availableCameras.length > 1 && (
        <div className="w-full flex justify-end px-2">
          <CameraSelector
            availableCameras={camera.availableCameras}
            selectedCameraId={camera.selectedCameraId}
            onSelectCamera={camera.selectCamera}
          />
        </div>
      )}

      {/* Main Viewport Container */}
      <Card className="relative w-full aspect-square sm:aspect-[4/3] bg-slate-950 border-slate-800 rounded-3xl overflow-hidden shadow-2xl p-0 flex items-center justify-center">
        {/* Loading Screen */}
        {camera.isLoading && (
          <div className="absolute inset-0 z-20 bg-slate-950 flex flex-col items-center justify-center gap-3 p-6 text-center">
            <RefreshCw className="w-10 h-10 text-indigo-500 animate-spin" />
            <div>
              <p className="text-sm font-bold text-slate-200">Initializing Camera...</p>
              <p className="text-xs text-slate-400 mt-0.5">Requesting hardware permissions</p>
            </div>
          </div>
        )}

        {/* Permission Denied / Camera Unavailable Screen */}
        {camera.hasPermission === false && !camera.isLoading && (
          <div className="absolute inset-0 z-20 bg-slate-950/95 flex flex-col items-center justify-center gap-4 p-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              {camera.permissionError?.includes('denied') ? (
                <CameraOff className="w-8 h-8" />
              ) : (
                <AlertOctagon className="w-8 h-8" />
              )}
            </div>

            <div className="space-y-1 max-w-xs">
              <h3 className="text-base font-bold text-slate-100">
                {camera.permissionError?.includes('denied') ? 'Camera Access Denied' : 'Camera Unavailable'}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {camera.permissionError || 'Unable to access camera hardware. Please check permissions.'}
              </p>
            </div>

            <div className="flex items-center gap-3 mt-2">
              <Button variant="primary" size="sm" onClick={() => void camera.requestPermission()}>
                <RefreshCw className="w-4 h-4 mr-1.5" />
                Retry
              </Button>
              {onClose && (
                <Button variant="secondary" size="sm" onClick={onClose}>
                  <X className="w-4 h-4 mr-1.5" />
                  Cancel
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Live Video Feed */}
        <video
          ref={videoRef}
          playsInline
          muted
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            camera.hasPermission && !camera.isLoading ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Glassmorphism Reticle & Scanning Overlay */}
        {camera.hasPermission && !camera.isLoading && (
          <ScannerOverlay isScanning={isScanning} isPaused={isPaused} title={title} />
        )}
      </Card>

      {/* Floating Action Controls */}
      {camera.hasPermission && !camera.isLoading && (
        <ScannerControls
          torchSupported={camera.torchSupported}
          torchOn={camera.torchOn}
          onToggleTorch={() => void camera.toggleTorch()}
          canSwitchCamera={camera.availableCameras.length > 1}
          onSwitchCamera={camera.switchCamera}
          isPaused={isPaused}
          onTogglePause={() => (isPaused ? resumeScanning() : pauseScanning())}
          onClose={onClose}
        />
      )}
    </div>
  );
};
