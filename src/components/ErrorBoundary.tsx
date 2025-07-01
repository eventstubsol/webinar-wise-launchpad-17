import React, { Component, ReactNode } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { getUserFriendlyError, formatErrorForDisplay } from '@/lib/errorHandler';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log the error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error caught by boundary:', error, errorInfo);
    }
    
    // In production, you could send this to an error reporting service
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    // Optionally reload the page
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const userError = getUserFriendlyError(this.state.error);
      
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Something went wrong</h3>
                    <p>{formatErrorForDisplay(userError)}</p>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      onClick={this.handleReset}
                      variant="outline"
                      size="sm"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Try Again
                    </Button>
                    
                    <Button
                      onClick={() => window.location.href = '/'}
                      variant="outline"
                      size="sm"
                    >
                      Go to Dashboard
                    </Button>
                  </div>
                  
                  {process.env.NODE_ENV === 'development' && userError.originalError && (
                    <details className="mt-4 text-xs">
                      <summary className="cursor-pointer text-muted-foreground">
                        Developer Details
                      </summary>
                      <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                        {userError.originalError}
                      </pre>
                    </details>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
