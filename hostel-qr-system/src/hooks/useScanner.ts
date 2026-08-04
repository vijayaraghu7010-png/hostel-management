import { useState, useEffect, useCallback, useRef } from 'react';
import type { ParsedScanResult } from '@/types/scanner';
import { useCamera } from './useCamera';
import { ScannerEngine } from '@/services/scanner/ScannerEngine';
import { ScanRouter } from '@/services/scanner/ScanRouter';

export interface UseScannerProps {
  onScanResult: (result: ParsedScanResult) => void;
  autoStart?: boolean;
  duplicateIntervalMs?: number;
}

export function useScanner({
  onScanResult,
  autoStart = true,
  duplicateIntervalMs = 3000,
}: UseScannerProps) {
  const camera = useCamera();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const engineRef = useRef<ScannerEngine | null>(null);
  const routerRef = useRef<ScanRouter>(new ScanRouter(duplicateIntervalMs));

  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [lastScanResult, setLastScanResult] = useState<ParsedScanResult | null>(null);

  if (!engineRef.current) {
    engineRef.current = new ScannerEngine();
  }

  const startScanning = useCallback(async () => {
    if (!videoRef.current || !camera.hasPermission) return;

    try {
      const engine = engineRef.current;
      if (!engine) return;

      const deviceId = camera.selectedCameraId || undefined;

      await engine.start(deviceId, videoRef.current, (rawText) => {
        const router = routerRef.current;
        const { result, isDuplicate } = router.processScan(rawText);

        if (!isDuplicate) {
          setLastScanResult(result);
          onScanResult(result);
        }
      });

      setIsScanning(true);
      setIsPaused(false);

      const stream = engine.getStream();
      camera.updateActiveStream(stream);
    } catch {
      setIsScanning(false);
    }
  }, [camera, onScanResult]);

  const pauseScanning = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.pause();
      setIsPaused(true);
    }
  }, []);

  const resumeScanning = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.resume();
      setIsPaused(false);
    }
  }, []);

  const stopScanning = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.stop();
    }
    setIsScanning(false);
    setIsPaused(false);
    camera.updateActiveStream(null);
  }, [camera]);

  const restartScanning = useCallback(async () => {
    stopScanning();
    routerRef.current.resetDuplicateFilter();
    await startScanning();
  }, [stopScanning, startScanning]);

  // Auto start scanning when camera is ready
  useEffect(() => {
    if (autoStart && camera.hasPermission && camera.selectedCameraId && !isScanning) {
      void startScanning();
    }
  }, [autoStart, camera.hasPermission, camera.selectedCameraId, isScanning, startScanning]);

  // Handle camera switch
  useEffect(() => {
    if (isScanning && camera.selectedCameraId) {
      void startScanning();
    }
  }, [camera.selectedCameraId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (engineRef.current) {
        engineRef.current.stop();
      }
    };
  }, []);

  return {
    videoRef,
    camera,
    isScanning,
    isPaused,
    lastScanResult,
    startScanning,
    pauseScanning,
    resumeScanning,
    stopScanning,
    restartScanning,
  };
}
