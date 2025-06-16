
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, XCircle, AlertTriangle, Play } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface DiagnosticPhase {
  status: string;
  [key: string]: any;
}

interface DiagnosticReport {
  success: boolean;
  timestamp: string;
  phases: {
    connection: DiagnosticPhase;
    authentication: DiagnosticPhase;
    webinars_api: DiagnosticPhase;
    registrants_api: DiagnosticPhase | null;
    participants_api: DiagnosticPhase | null;
    database: DiagnosticPhase;
  };
  recommendations: Array<{
    priority: string;
    issue: string;
    solution: string;
  }>;
}

export const ZoomDiagnostic = () => {
  const { user } = useAuth();
  const [isRunning, setIsRunning] = useState(false);
  const [report, setReport] = useState<DiagnosticReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runDiagnostic = async () => {
    if (!user) return;

    setIsRunning(true);
    setError(null);
    setReport(null);

    try {
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

      setReport(data);
    } catch (err) {
      console.error('Diagnostic error:', err);
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
        {priority}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Zoom Integration Diagnostic
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Button onClick={runDiagnostic} disabled={isRunning || !user}>
            {isRunning ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            {isRunning ? 'Running Diagnostic...' : 'Run Diagnostic'}
          </Button>
          {!user && (
            <span className="text-sm text-muted-foreground">
              Please log in to run diagnostic
            </span>
          )}
        </div>

        {error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {report && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Diagnostic completed at {new Date(report.timestamp).toLocaleString()}
            </div>

            <div className="grid gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Phase Results</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span>Connection Check</span>
                    {getStatusIcon(report.phases.connection.status)}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span>Authentication</span>
                    {getStatusIcon(report.phases.authentication.status)}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span>Webinars API</span>
                    {getStatusIcon(report.phases.webinars_api.status)}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span>Registrants API</span>
                    {report.phases.registrants_api ? 
                      getStatusIcon(report.phases.registrants_api.success) : 
                      <span className="text-sm text-muted-foreground">Not tested</span>
                    }
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span>Participants API</span>
                    {report.phases.participants_api ? 
                      getStatusIcon(report.phases.participants_api.success) : 
                      <span className="text-sm text-muted-foreground">Not tested</span>
                    }
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span>Database Access</span>
                    {getStatusIcon(report.phases.database.registrants_table && report.phases.database.participants_table)}
                  </div>
                </CardContent>
              </Card>

              {report.phases.authentication.scopes && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">API Scopes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm font-mono bg-muted p-2 rounded">
                      {report.phases.authentication.scopes}
                    </div>
                  </CardContent>
                </Card>
              )}

              {report.phases.registrants_api && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Registrants Test</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {report.phases.registrants_api.success ? (
                      <div className="space-y-2">
                        <p className="text-sm">
                          Found {report.phases.registrants_api.count} registrants
                        </p>
                        {report.phases.registrants_api.sample && report.phases.registrants_api.sample.length > 0 && (
                          <div className="text-xs bg-muted p-2 rounded">
                            <strong>Sample data:</strong>
                            <pre>{JSON.stringify(report.phases.registrants_api.sample[0], null, 2)}</pre>
                          </div>
                        )}
                      </div>
                    ) : (
                      <Alert variant="destructive">
                        <AlertDescription>
                          Error {report.phases.registrants_api.status}: {report.phases.registrants_api.error}
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              )}

              {report.phases.participants_api && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Participants Test</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {report.phases.participants_api.success ? (
                      <div className="space-y-2">
                        <p className="text-sm">
                          Found {report.phases.participants_api.count} participants
                        </p>
                        {report.phases.participants_api.sample && report.phases.participants_api.sample.length > 0 && (
                          <div className="text-xs bg-muted p-2 rounded">
                            <strong>Sample data:</strong>
                            <pre>{JSON.stringify(report.phases.participants_api.sample[0], null, 2)}</pre>
                          </div>
                        )}
                      </div>
                    ) : (
                      <Alert variant="destructive">
                        <AlertDescription>
                          Error {report.phases.participants_api.status}: {report.phases.participants_api.error}
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              )}

              {report.recommendations.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Recommendations</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {report.recommendations.map((rec, index) => (
                      <div key={index} className="flex items-start gap-3">
                        {getPriorityBadge(rec.priority)}
                        <div className="flex-1">
                          <p className="font-medium text-sm">{rec.issue}</p>
                          <p className="text-sm text-muted-foreground">{rec.solution}</p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
