import { useState, useEffect, useCallback, useRef } from 'react';
import type { CameraDevice } from '@/types/scanner';
import { CameraManager } from '@/services/scanner/CameraManager';

export function useCamera() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [availableCameras, setAvailableCameras] = useState<CameraDevice[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const [torchSupported, setTorchSupported] = useState<boolean>(false);
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const activeStreamRef = useRef<MediaStream | null>(null);

  const requestPermissionAndInit = useCallback(async () => {
    setIsLoading(true);
    setPermissionError(null);

    try {
      await CameraManager.requestPermission();
      setHasPermission(true);

      const cameras = await CameraManager.getAvailableCameras();
      setAvailableCameras(cameras);

      const optimal = CameraManager.selectOptimalCamera(cameras);
      if (optimal) {
        setSelectedCameraId(optimal.deviceId);
      }
    } catch (err) {
      setHasPermission(false);
      const errorMsg = err instanceof Error ? err.message : 'Camera access permission denied';
      setPermissionError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void requestPermissionAndInit();
  }, [requestPermissionAndInit]);

  const selectCamera = useCallback((deviceId: string) => {
    setSelectedCameraId(deviceId);
    setTorchOn(false);
  }, []);

  const switchCamera = useCallback(() => {
    if (availableCameras.length <= 1 || !selectedCameraId) return;

    const currentIndex = availableCameras.findIndex((c) => c.deviceId === selectedCameraId);
    const nextIndex = (currentIndex + 1) % availableCameras.length;
    const nextCamera = availableCameras[nextIndex];

    if (nextCamera) {
      selectCamera(nextCamera.deviceId);
    }
  }, [availableCameras, selectedCameraId, selectCamera]);

  const toggleTorch = useCallback(async () => {
    if (!activeStreamRef.current || !torchSupported) return;

    const nextState = !torchOn;
    const success = await CameraManager.setTorch(activeStreamRef.current, nextState);
    if (success) {
      setTorchOn(nextState);
    }
  }, [torchSupported, torchOn]);

  const updateActiveStream = useCallback((stream: MediaStream | null) => {
    activeStreamRef.current = stream;
    if (stream) {
      const isSupported = CameraManager.isTorchSupported(stream);
      setTorchSupported(isSupported);
    } else {
      setTorchSupported(false);
      setTorchOn(false);
    }
  }, []);

  useEffect(() => {
    return () => {
      CameraManager.stopStreamTracks(activeStreamRef.current);
    };
  }, []);

  return {
    hasPermission,
    permissionError,
    availableCameras,
    selectedCameraId,
    torchSupported,
    torchOn,
    isLoading,
    requestPermission: requestPermissionAndInit,
    selectCamera,
    switchCamera,
    toggleTorch,
    updateActiveStream,
  };
}
