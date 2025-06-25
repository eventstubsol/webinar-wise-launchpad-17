
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, XCircle, Info, RefreshCw, Wrench } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useZoomConnection } from '@/hooks/useZoomConnection';
import { useZoomCredentials } from '@/hooks/useZoomCredentials';
import { RenderConnectionService } from '@/services/zoom/RenderConnectionService';

interface TestResult {
  step: string;
  status: 'success' | 'error' | 'info';
  message: string;
  data?: any;
}

export const ZoomTestConnection: React.FC = () => {
  const { user } = useAuth();
  const { connection, refetch: refetchConnection } = useZoomConnection();
  const { credentials } = useZoomCredentials();
  const [isLoading, setIsLoading] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);

  const addResult = (result: TestResult) => {
    setResults(prev => [...prev, result]);
  };

  const runConnectionTest = async () => {
    if (!connection?.id) {
      addResult({
        step: 'Connection Check',
        status: 'error',
        message: 'No Zoom connection found'
      });
      return;
    }

    setIsLoading(true);
    setResults([]);

    try {
      addResult({
        step: 'Starting Test',
        status: 'info',
        message: 'Testing Zoom connection via Render API...'
      });

      // Test connection health
      const healthCheck = await RenderConnectionService.checkConnectionHealth(connection.id);
      
      if (healthCheck.isHealthy) {
        addResult({
          step: 'Health Check',
          status: 'success',
          message: 'Connection is healthy',
          data: healthCheck.details
        });
      } else {
        addResult({
          step: 'Health Check',
          status: 'error',
          message: 'Connection health issues detected',
          data: healthCheck.details
        });
      }

      // Test actual API connection
      const connectionTest = await RenderConnectionService.testConnection(connection.id);
      
      if (connectionTest.success) {
        addResult({
          step: 'API Test',
          status: 'success',
          message: connectionTest.message,
          data: connectionTest.details
        });
      } else {
        addResult({
          step: 'API Test',
          status: 'error',
          message: connectionTest.message,
          data: connectionTest.details
        });
      }

    } catch (error) {
      addResult({
        step: 'Test Execution',
        status: 'error',
        message: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  const attemptRecovery = async () => {
    if (!connection?.id) return;

    setIsRecovering(true);
    setResults([]);

    try {
      addResult({
        step: 'Recovery Started',
        status: 'info',
        message: 'Attempting automatic connection recovery...'
      });

      const recoveryResult = await RenderConnectionService.attemptConnectionRecovery(connection.id);
      
      // Add each recovery step as a result
      recoveryResult.recoverySteps.forEach((step, index) => {
        addResult({
          step: `Recovery Step ${index + 1}`,
          status: 'info',
          message: step
        });
      });

      // Final result
      addResult({
        step: 'Recovery Complete',
        status: recoveryResult.success ? 'success' : 'error',
        message: recoveryResult.success 
          ? 'Connection recovery successful!' 
          : 'Recovery failed - manual intervention required',
        data: { finalStatus: recoveryResult.finalStatus }
      });

      // Refresh connection data if recovery was successful
      if (recoveryResult.success) {
        await refetchConnection();
      }

    } catch (error) {
      addResult({
        step: 'Recovery Error',
        status: 'error',
        message: `Recovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setIsRecovering(false);
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'info':
        return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      case 'info':
        return 'bg-blue-100 text-blue-800';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Connection Test</span>
          <div className="flex gap-2">
            <Button 
              onClick={() => refetchConnection()}
              variant="outline"
              size="sm"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            {connection && (
              <Button 
                onClick={attemptRecovery}
                disabled={isRecovering}
                variant="secondary"
                size="sm"
              >
                {isRecovering ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Recovering...
                  </>
                ) : (
                  <>
                    <Wrench className="w-4 h-4 mr-2" />
                    Auto-Recover
                  </>
                )}
              </Button>
            )}
            <Button 
              onClick={runConnectionTest} 
              disabled={isLoading || !connection}
              size="sm"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                'Test Connection'
              )}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connection Info */}
        <div className="grid grid-cols-2 gap-4 text-sm p-3 bg-gray-50 rounded">
          <div>
            <p className="text-gray-600">Connection Status</p>
            <p className="font-medium">{connection?.connection_status || 'Not Connected'}</p>
          </div>
          <div>
            <p className="text-gray-600">Has Credentials</p>
            <p className="font-medium">{credentials ? 'Yes' : 'No'}</p>
          </div>
          <div>
            <p className="text-gray-600">Zoom Account</p>
            <p className="font-medium">{connection?.zoom_email || 'None'}</p>
          </div>
          <div>
            <p className="text-gray-600">API Backend</p>
            <p className="font-medium">Render API</p>
          </div>
        </div>

        {/* Test Results */}
        {results.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium">Test Results:</h4>
            {results.map((result, index) => (
              <Card key={index} className="border-l-4 border-l-gray-300">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {getStatusIcon(result.status)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{result.step}</span>
                        <Badge className={getStatusColor(result.status)}>
                          {result.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{result.message}</p>
                      {result.data && (
                        <details className="mt-2">
                          <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                            View details
                          </summary>
                          <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-40">
                            {JSON.stringify(result.data, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Help Information */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            This test uses the new Render API backend to verify your Zoom connection. 
            The auto-recovery feature can attempt to fix common connection issues automatically.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};
