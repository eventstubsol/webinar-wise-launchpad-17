
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, XCircle, Info } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface TestResult {
  step: string;
  status: 'success' | 'error' | 'info';
  message: string;
  data?: any;
}

export const ZoomTestFetch: React.FC = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);

  const addResult = (result: TestResult) => {
    setResults(prev => [...prev, result]);
  };

  const runTest = async () => {
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
        message: 'Initiating Zoom data fetch test...'
      });

      // Call the zoom-test-fetch edge function
      const { data, error } = await supabase.functions.invoke('zoom-test-fetch', {
        body: { userId: user.id }
      });

      if (error) {
        addResult({
          step: 'Edge Function Call',
          status: 'error',
          message: `Edge function error: ${error.message}`
        });
        return;
      }

      addResult({
        step: 'Edge Function Call',
        status: 'success',
        message: 'Successfully called zoom-test-fetch function'
      });

      if (data) {
        addResult({
          step: 'Response Data',
          status: 'success',
          message: 'Received response from edge function',
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Test Zoom API Connection</h3>
          <p className="text-sm text-gray-600">
            This will test fetching data from your Zoom connection
          </p>
        </div>
        <Button 
          onClick={runTest} 
          disabled={isLoading}
          className="min-w-[120px]"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Testing...
            </>
          ) : (
            'Run Test'
          )}
        </Button>
      </div>

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
                          View response data
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

      <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
        <p><strong>What this test does:</strong></p>
        <ul className="list-disc list-inside mt-1 space-y-1">
          <li>Finds your Zoom connection in the database</li>
          <li>Attempts to decrypt and use your access token</li>
          <li>Makes a simple API call to Zoom to list webinars</li>
          <li>Reports the results and any errors encountered</li>
        </ul>
      </div>
    </div>
  );
};
