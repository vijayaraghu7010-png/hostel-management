import React from 'react';
import { Providers } from './providers';
import { AppRouter } from './Router';
import { ErrorBoundary } from '@/components/layout/ErrorBoundary';

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <Providers>
        <AppRouter />
      </Providers>
    </ErrorBoundary>
  );
};

export default App;
