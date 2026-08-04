import React from 'react';
import type { CameraDevice } from '@/types/scanner';
import { Camera } from 'lucide-react';

export interface CameraSelectorProps {
  availableCameras: CameraDevice[];
  selectedCameraId: string | null;
  onSelectCamera: (deviceId: string) => void;
  className?: string;
}

export const CameraSelector: React.FC<CameraSelectorProps> = ({
  availableCameras,
  selectedCameraId,
  onSelectCamera,
  className = '',
}) => {
  if (availableCameras.length <= 1) return null;

  return (
    <div className={`relative flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-lg ${className}`}>
      <Camera className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
      <select
        value={selectedCameraId || ''}
        onChange={(e) => onSelectCamera(e.target.value)}
        className="bg-transparent text-xs font-semibold text-slate-200 outline-none cursor-pointer border-none focus:ring-0 pr-4"
      >
        {availableCameras.map((camera) => (
          <option key={camera.deviceId} value={camera.deviceId} className="bg-slate-900 text-slate-200">
            {camera.label} {camera.isBackCamera ? '(Rear)' : ''}
          </option>
        ))}
      </select>
    </div>
  );
};
