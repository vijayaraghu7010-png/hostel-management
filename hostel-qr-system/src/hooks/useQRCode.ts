import { useState, useEffect, useCallback, useRef } from 'react';
import type { QRType, QRGeneratorOptions, QRState, UniversalQRPayload } from '@/types/qr';
import {
  createSignedPayload,
  serializePayload,
} from '@/services/qr/QRPayload';
import { generateDataUrl } from '@/services/qr/QRGenerator';
import { getTimeRemainingSeconds, isExpired } from '@/services/qr/QRValidator';

export interface UseQRCodeProps {
  type: QRType;
  id: string;
  payloadData?: Record<string, unknown>;
  ttlSeconds?: number;
  autoRefresh?: boolean;
  options?: QRGeneratorOptions;
}

export function useQRCode({
  type,
  id,
  payloadData = {},
  ttlSeconds = 60,
  autoRefresh = true,
  options,
}: UseQRCodeProps) {
  const [state, setState] = useState<QRState>({
    dataUrl: null,
    payload: null,
    rawJson: null,
    loading: true,
    error: null,
    isExpired: false,
    timeRemainingSeconds: ttlSeconds,
  });

  const timerRef = useRef<number | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const generateNewQR = useCallback(async () => {
    setState((prev: QRState) => ({ ...prev, loading: true, error: null }));

    try {
      const payload: UniversalQRPayload = await createSignedPayload(
        type,
        id,
        payloadData,
        ttlSeconds
      );
      const rawJson = serializePayload(payload);
      const dataUrl = await generateDataUrl(rawJson, optionsRef.current);

      setState({
        dataUrl,
        payload,
        rawJson,
        loading: false,
        error: null,
        isExpired: false,
        timeRemainingSeconds: ttlSeconds,
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to generate QR code');
      setState((prev: QRState) => ({
        ...prev,
        loading: false,
        error,
      }));
    }
  }, [type, id, payloadData, ttlSeconds]);

  // Initial generation and dependency update
  useEffect(() => {
    void generateNewQR();
  }, [generateNewQR]);

  // Countdown timer interval
  useEffect(() => {
    if (!state.payload || state.loading || state.error) return;

    const expiresAt = state.payload.expiresAt;

    timerRef.current = window.setInterval(() => {
      const remaining = getTimeRemainingSeconds(expiresAt);

      if (remaining <= 0) {
        if (autoRefresh) {
          void generateNewQR();
        } else {
          setState((prev: QRState) => ({
            ...prev,
            isExpired: true,
            timeRemainingSeconds: 0,
          }));
          if (timerRef.current !== null) {
            clearInterval(timerRef.current);
          }
        }
      } else {
        setState((prev: QRState) => ({
          ...prev,
          timeRemainingSeconds: remaining,
          isExpired: isExpired(expiresAt),
        }));
      }
    }, 1000);

    return () => {
      if (timerRef.current !== null) {
        clearInterval(timerRef.current);
      }
    };
  }, [state.payload, state.loading, state.error, autoRefresh, generateNewQR]);

  return {
    ...state,
    regenerate: generateNewQR,
    ttlSeconds,
  };
}
