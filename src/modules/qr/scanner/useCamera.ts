import { useCallback, useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader, BrowserCodeReader } from "@zxing/browser";
import type { IScannerControls } from "@zxing/browser";
import type React from "react";
import type {
  CameraDevice,
  ScannerStatus,
  UseCameraReturn,
} from "./types";

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Returns true when the label or group-id suggests a rear camera. */
function looksLikeRearCamera(info: MediaDeviceInfo): boolean {
  const label = info.label.toLowerCase();
  return (
    label.includes("back") ||
    label.includes("rear") ||
    label.includes("environment") ||
    label.includes("facing back")
  );
}

/** Converts a raw MediaDeviceInfo array into typed CameraDevice records. */
function toCameraDevices(infos: MediaDeviceInfo[]): CameraDevice[] {
  const videoInputs = infos.filter((d) => d.kind === "videoinput");

  // If only one camera and no label, treat index-0 as rear on mobile.
  if (videoInputs.length === 1 && !videoInputs[0].label) {
    return [
      { deviceId: videoInputs[0].deviceId, label: "Camera", isRearFacing: true },
    ];
  }

  return videoInputs.map((d) => ({
    deviceId: d.deviceId,
    label: d.label || "Camera",
    isRearFacing: looksLikeRearCamera(d),
  }));
}

/** Returns the index of the best default camera (prefer rear-facing). */
function preferredCameraIndex(devices: CameraDevice[]): number {
  const rearIdx = devices.findIndex((d) => d.isRearFacing);
  return rearIdx >= 0 ? rearIdx : 0;
}

/** Checks if a track exposes torch capability. */
function trackSupportsTorch(track: MediaStreamTrack): boolean {
  try {
    const caps = track.getCapabilities() as MediaTrackCapabilities & {
      torch?: boolean;
    };
    return caps.torch === true;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/*  Hook                                                                */
/* ------------------------------------------------------------------ */

/**
 * Manages camera access, device enumeration, continuous QR decoding,
 * and torch control for the QRScanner component.
 *
 * @param onScan - Callback fired with the decoded text on a successful scan.
 * @param onError - Callback fired when a non-recoverable error occurs.
 */
export function useCamera(
  onScan: (result: string) => void,
  onError: (error: Error) => void,
): UseCameraReturn {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const mountedRef = useRef(true);

  const [status, setStatus] = useState<ScannerStatus>("idle");
  const [devices, setDevices] = useState<CameraDevice[]>([]);
  const [activeDeviceIndex, setActiveDeviceIndex] = useState(0);
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /* ---- track mounted state --------------------------------------- */
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  /* ---- clean stop helper ---------------------------------------- */
  const stopScanning = useCallback(() => {
    if (controlsRef.current) {
      try {
        controlsRef.current.stop();
      } catch {
        // ignore – already stopped
      }
      controlsRef.current = null;
    }
    if (videoRef.current) {
      BrowserCodeReader.cleanVideoSource(videoRef.current);
    }
    BrowserCodeReader.releaseAllStreams();
  }, []);

  /* ---- start scanning ------------------------------------------- */
  const start = useCallback(
    async (deviceIndex?: number): Promise<void> => {
      if (!mountedRef.current) return;

      stopScanning();

      setStatus("requesting");
      setError(null);
      setTorchOn(false);
      setHasTorch(false);

      try {
        /* 1. Enumerate devices (may require a prior getUserMedia grant). */
        let rawDevices: MediaDeviceInfo[] = [];
        try {
          rawDevices = await BrowserCodeReader.listVideoInputDevices();
        } catch {
          // On some browsers listVideoInputDevices throws before permission.
          // Fall through – we will use constraints without a deviceId.
        }

        let cameraDevices = toCameraDevices(rawDevices);

        /* If no devices yet, request permission first then re-enumerate. */
        if (cameraDevices.length === 0) {
          try {
            const tempStream = await navigator.mediaDevices.getUserMedia({
              video: { facingMode: { ideal: "environment" } },
            });
            tempStream.getTracks().forEach((t) => t.stop());
            rawDevices = await BrowserCodeReader.listVideoInputDevices();
            cameraDevices = toCameraDevices(rawDevices);
          } catch (permErr: unknown) {
            if (!mountedRef.current) return;
            const err =
              permErr instanceof Error ? permErr : new Error(String(permErr));
            const isDenied =
              err.name === "NotAllowedError" ||
              err.name === "PermissionDeniedError";
            setStatus(isDenied ? "permission_denied" : "camera_not_found");
            setError(err);
            onError(err);
            return;
          }
        }

        if (!mountedRef.current) return;

        if (cameraDevices.length === 0) {
          const err = new Error("No camera found on this device.");
          setStatus("camera_not_found");
          setError(err);
          onError(err);
          return;
        }

        const targetIndex =
          deviceIndex !== undefined
            ? deviceIndex
            : preferredCameraIndex(cameraDevices);

        setDevices(cameraDevices);
        setActiveDeviceIndex(targetIndex);

        /* 2. Build constraints for the chosen camera. */
        const targetDevice = cameraDevices[targetIndex];
        const constraints: MediaStreamConstraints = {
          audio: false,
          video: targetDevice?.deviceId
            ? {
                deviceId: { exact: targetDevice.deviceId },
                width: { ideal: 1280 },
                height: { ideal: 720 },
              }
            : {
                facingMode: { ideal: "environment" },
                width: { ideal: 1280 },
                height: { ideal: 720 },
              },
        };

        /* 3. Create reader and begin continuous decode. */
        const reader = new BrowserMultiFormatReader();
        readerRef.current = reader;

        setStatus("scanning");

        const controls = await reader.decodeFromConstraints(
          constraints,
          videoRef.current ?? undefined,
          (result, err) => {
            if (!mountedRef.current) return;

            if (result) {
              /* Stop immediately after the first successful scan. */
              controls.stop();
              controlsRef.current = null;
              onScan(result.getText());
              setStatus("success");
              return;
            }

            if (err) {
              // NotFoundException fires on every empty frame – ignore it.
              const isExpected =
                err.name === "NotFoundException" ||
                err.message?.includes("No MultiFormat Readers");
              if (!isExpected) {
                onError(err instanceof Error ? err : new Error(String(err)));
              }
            }
          },
        );

        if (!mountedRef.current) {
          controls.stop();
          return;
        }

        controlsRef.current = controls;

        /* 4. Detect torch support after stream is live. */
        if (videoRef.current?.srcObject instanceof MediaStream) {
          const tracks = videoRef.current.srcObject.getVideoTracks();
          const torchSupported = tracks.some(trackSupportsTorch);
          setHasTorch(torchSupported);
        }
      } catch (startErr: unknown) {
        if (!mountedRef.current) return;
        const err =
          startErr instanceof Error ? startErr : new Error(String(startErr));
        const isDenied =
          err.name === "NotAllowedError" ||
          err.name === "PermissionDeniedError";
        const isNotFound =
          err.name === "NotFoundError" || err.name === "DevicesNotFoundError";
        setStatus(
          isDenied
            ? "permission_denied"
            : isNotFound
            ? "camera_not_found"
            : "error",
        );
        setError(err);
        onError(err);
      }
    },
    [stopScanning, onScan, onError],
  );

  /* ---- switch camera -------------------------------------------- */
  const switchCamera = useCallback(() => {
    if (devices.length < 2) return;
    const nextIndex = (activeDeviceIndex + 1) % devices.length;
    void start(nextIndex);
  }, [devices, activeDeviceIndex, start]);

  /* ---- toggle torch --------------------------------------------- */
  const toggleTorch = useCallback(async (): Promise<void> => {
    if (!controlsRef.current?.switchTorch) return;
    const next = !torchOn;
    try {
      await controlsRef.current.switchTorch(next);
      if (mountedRef.current) setTorchOn(next);
    } catch {
      // torch toggle failed silently
    }
  }, [torchOn]);

  /* ---- retry ---------------------------------------------------- */
  const retry = useCallback(async (): Promise<void> => {
    setDevices([]);
    setActiveDeviceIndex(0);
    await start(undefined);
  }, [start]);

  /* ---- cleanup on unmount --------------------------------------- */
  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, [stopScanning]);

  return {
    status,
    devices,
    activeDeviceIndex,
    hasTorch,
    torchOn,
    error,
    videoRef,
    controlsRef,
    start,
    stop: stopScanning,
    switchCamera,
    toggleTorch,
    retry,
  };
}
