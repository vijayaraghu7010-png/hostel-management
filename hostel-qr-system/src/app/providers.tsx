import React, { useEffect } from 'react';
import { useAuthStore } from '@/store';

export interface ProvidersProps {
  children: React.ReactNode;
}

export const Providers: React.FC<ProvidersProps> = ({ children }) => {
  const initializeAuth = useAuthStore((state) => state.initialize);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  return (
    <React.StrictMode>
      {children}
    </React.StrictMode>
  );
};
