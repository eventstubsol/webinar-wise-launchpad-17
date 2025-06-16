
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, XCircle, Info, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useZoomConnection } from '@/hooks/useZoomConnection';
import { useZoomCredentials } from '@/hooks/useZoomCredentials';
import { supabase } from '@/integrations/supabase/client';

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
  const [results, setResults] = useState<TestResult[]>([]);

  const addResult = (result: TestResult) => {
    setResults(prev => [...prev, result]);
  };

  const runConnectionTest = async () => {
    if (!user) {
      addResult({
        step: 'Authentication',
        status: 'error',
        message: 'User not authenticated'
      });
      return;
    }

    setIsLoading(true);
    setResults([]);

    try {
      addResult({
        step: 'Starting Test',
        status: 'info',
        message: 'Testing Zoom API connection...'
      });

      // Test the connection
      const { data, error } = await supabase.functions.invoke('zoom-test-fetch', {
        body: { userId: user.id }
      });

      if (error) {
        addResult({
          step: 'Connection Test',
          status: 'error',
          message: `Test failed: ${error.message}`,
          data: error
        });
        return;
      }

      // Process the response
      if (data?.success) {
        addResult({
          step: 'Connection Test',
          status: 'success',
          message: data.message,
          data: data.data
        });
      } else {
        addResult({
          step: 'Connection Test',
          status: 'error',
          message: data?.message || 'Unknown error occurred',
          data: data
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
            <Button 
              onClick={runConnectionTest} 
              disabled={isLoading}
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
            <p className="text-gray-600">Connection Type</p>
            <p className="font-medium">{connection?.connection_type || 'None'}</p>
          </div>
          <div>
            <p className="text-gray-600">Has Credentials</p>
            <p className="font-medium">{credentials ? 'Yes' : 'No'}</p>
          </div>
          <div>
            <p className="text-gray-600">Connection Status</p>
            <p className="font-medium">{connection?.connection_status || 'Not Connected'}</p>
          </div>
          <div>
            <p className="text-gray-600">Token Length</p>
            <p className="font-medium">{connection?.access_token?.length || 0} chars</p>
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
            This test verifies your Zoom API connection by attempting to authenticate and make a simple API call.
            If the test fails, check your credentials and connection configuration.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};
