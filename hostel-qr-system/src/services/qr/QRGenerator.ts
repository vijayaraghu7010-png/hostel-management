import QRCode from 'qrcode';
import type { QRGeneratorOptions } from '@/types/qr';

export const DEFAULT_QR_OPTIONS: QRGeneratorOptions = {
  size: 300,
  margin: 2,
  darkColor: '#000000',
  lightColor: '#ffffff',
  errorCorrectionLevel: 'M',
};

export async function generateDataUrl(
  text: string,
  options: QRGeneratorOptions = {}
): Promise<string> {
  const mergedOptions = { ...DEFAULT_QR_OPTIONS, ...options };

  return QRCode.toDataURL(text, {
    width: mergedOptions.size,
    margin: mergedOptions.margin,
    color: {
      dark: mergedOptions.darkColor,
      light: mergedOptions.lightColor,
    },
    errorCorrectionLevel: mergedOptions.errorCorrectionLevel,
  });
}

export async function generateCanvas(
  canvas: HTMLCanvasElement,
  text: string,
  options: QRGeneratorOptions = {}
): Promise<void> {
  const mergedOptions = { ...DEFAULT_QR_OPTIONS, ...options };

  await QRCode.toCanvas(canvas, text, {
    width: mergedOptions.size,
    margin: mergedOptions.margin,
    color: {
      dark: mergedOptions.darkColor,
      light: mergedOptions.lightColor,
    },
    errorCorrectionLevel: mergedOptions.errorCorrectionLevel,
  });
}
