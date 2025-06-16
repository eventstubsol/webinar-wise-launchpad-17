
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertTriangle, CheckCircle, XCircle, Play, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface DiagnosticResult {
  success: boolean;
  timestamp: string;
  phases: {
    connection: any;
    authentication: any;
    webinars_api: any;
    registrants_api: any;
    participants_api: any;
    database: any;
  };
  recommendations: Array<{
    priority: string;
    issue: string;
    solution: string;
  }>;
}

export const ZoomDiagnosticPanel = () => {
  const { user } = useAuth();
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runDiagnostic = async () => {
    if (!user) return;

    setIsRunning(true);
    setError(null);
    setResult(null);

    try {
      console.log('🔍 Starting comprehensive Zoom API diagnostic...');
      
      const { data, error: invokeError } = await supabase.functions.invoke('zoom-diagnostic', {
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      if (invokeError) {
        throw new Error(invokeError.message);
      }

      if (!data.success) {
        throw new Error(data.error || 'Diagnostic failed');
      }

      console.log('✅ Diagnostic completed successfully:', data);
      setResult(data);
    } catch (err) {
      console.error('❌ Diagnostic error:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (success: boolean | string) => {
    if (success === true || success === 'success') {
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    }
    return <XCircle className="h-4 w-4 text-red-600" />;
  };

  const getPriorityBadge = (priority: string) => {
    const variants = {
      high: 'destructive',
      medium: 'default',
      low: 'secondary'
    } as const;
    
    return (
      <Badge variant={variants[priority as keyof typeof variants] || 'default'}>
        {priority.toUpperCase()}
      </Badge>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Zoom API Diagnostic Tool
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            This tool will test your Zoom API connection, scopes, and data access to identify why registrant and participant data is not being fetched.
          </AlertDescription>
        </Alert>

        <div className="flex items-center gap-2">
          <Button 
            onClick={runDiagnostic} 
            disabled={isRunning || !user}
            className="w-full"
          >
            {isRunning ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            {isRunning ? 'Running Comprehensive Diagnostic...' : 'Run Zoom API Diagnostic'}
          </Button>
        </div>

        {!user && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>Please log in to run the diagnostic</AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Diagnostic Failed:</strong> {error}
            </AlertDescription>
          </Alert>
        )}

        {result && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Diagnostic completed at {new Date(result.timestamp).toLocaleString()}
            </div>

            {/* Critical Issues Summary */}
            <Card className="border-red-200 bg-red-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-red-800">Critical Issues Found</CardTitle>
              </CardHeader>
              <CardContent>
                {result.recommendations.filter(r => r.priority === 'high').length === 0 ? (
                  <p className="text-green-700">✅ No critical issues detected</p>
                ) : (
                  <div className="space-y-2">
                    {result.recommendations.filter(r => r.priority === 'high').map((rec, index) => (
                      <div key={index} className="p-3 bg-white border border-red-200 rounded">
                        <p className="font-medium text-red-800">{rec.issue}</p>
                        <p className="text-sm text-red-700 mt-1">{rec.solution}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* API Test Results */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">API Test Results</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <span>Connection Status</span>
                    {getStatusIcon(result.phases.connection.status)}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span>Authentication</span>
                    {getStatusIcon(result.phases.authentication.status)}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span>Webinars API</span>
                    {getStatusIcon(result.phases.webinars_api.status)}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span>Database Access</span>
                    {getStatusIcon(result.phases.database.registrants_table && result.phases.database.participants_table)}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Registrants API</span>
                      {result.phases.registrants_api ? 
                        getStatusIcon(result.phases.registrants_api.success) : 
                        <span className="text-sm text-muted-foreground">Not tested</span>
                      }
                    </div>
                    {result.phases.registrants_api && (
                      <div className="text-sm text-muted-foreground">
                        {result.phases.registrants_api.success ? 
                          `✅ Found ${result.phases.registrants_api.count} registrants` :
                          `❌ Error: ${result.phases.registrants_api.error}`
                        }
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Participants API</span>
                      {result.phases.participants_api ? 
                        getStatusIcon(result.phases.participants_api.success) : 
                        <span className="text-sm text-muted-foreground">Not tested</span>
                      }
                    </div>
                    {result.phases.participants_api && (
                      <div className="text-sm text-muted-foreground">
                        {result.phases.participants_api.success ? 
                          `✅ Found ${result.phases.participants_api.count} participants` :
                          `❌ Error: ${result.phases.participants_api.error}`
                        }
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* API Scopes Information */}
            {result.phases.authentication.scopes && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Current API Scopes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="text-sm font-mono bg-muted p-3 rounded">
                      {result.phases.authentication.scopes}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <strong>Required scopes for registrant data:</strong> webinar:read:registrant:admin<br/>
                      <strong>Required scopes for participant data:</strong> report:read:list_webinar_participants:admin
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* All Recommendations */}
            {result.recommendations.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">All Recommendations</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {result.recommendations.map((rec, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 border rounded">
                      {getPriorityBadge(rec.priority)}
                      <div className="flex-1">
                        <p className="font-medium text-sm">{rec.issue}</p>
                        <p className="text-sm text-muted-foreground mt-1">{rec.solution}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
