import React from 'react';
import { useQRCode } from '@/hooks/useQRCode';
import { QRCard } from './QRCard';
import type { QRType, QRGeneratorOptions } from '@/types/qr';

export interface UniversalQRProps {
  type: QRType;
  id: string;
  payloadData?: Record<string, unknown>;
  ttlSeconds?: number;
  autoRefresh?: boolean;
  options?: QRGeneratorOptions;
  title?: string;
  description?: string;
  className?: string;
}

export const UniversalQR: React.FC<UniversalQRProps> = ({
  type,
  id,
  payloadData,
  ttlSeconds = 30,
  autoRefresh = true,
  options,
  title,
  description,
  className,
}) => {
  const {
    dataUrl,
    timeRemainingSeconds,
    isExpired,
    loading,
    error,
    regenerate,
  } = useQRCode({
    type,
    id,
    payloadData,
    ttlSeconds,
    autoRefresh,
    options,
  });

  return (
    <QRCard
      dataUrl={dataUrl}
      type={type}
      id={id}
      timeRemainingSeconds={timeRemainingSeconds}
      ttlSeconds={ttlSeconds}
      isExpired={isExpired}
      loading={loading}
      error={error}
      onRefresh={regenerate}
      title={title}
      description={description}
      className={className}
    />
  );
};
