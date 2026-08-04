import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { Card, Button } from '@/components/ui';
import { AlertOctagon, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(_error: Error, errorInfo: ErrorInfo): void {
    // Audit log uncaught UI error
    void errorInfo;
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-slate-100">
          <Card className="max-w-md w-full p-8 space-y-6 text-center bg-slate-900 border-slate-800 shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
              <AlertOctagon className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-black tracking-tight text-slate-100">
                Application Exception Encountered
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                {this.state.error?.message || 'An unexpected client runtime error occurred.'}
              </p>
            </div>

            <Button
              variant="primary"
              size="md"
              onClick={this.handleReset}
              className="w-full bg-indigo-600 hover:bg-indigo-500 justify-center"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Reload Application
            </Button>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
