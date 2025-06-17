
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  Database, 
  Activity,
  Clock,
  Users,
  Zap
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface DiagnosticReport {
  summary: {
    totalWebinars: number;
    webinarsWithParticipants: number;
    webinarsWithoutParticipants: number;
    eligibleForParticipantSync: number;
    connectionStatus: string;
  };
  webinarAnalysis: Array<{
    id: string;
    webinar_id: string;
    topic: string;
    start_time: string | null;
    participant_sync_status: string;
    attendees_count: number | null;
    daysSinceWebinar: number | null;
    eligibleForSync: boolean;
  }>;
  apiTests: {
    connectionValid: boolean;
    scopeValidation: {
      hasWebinarRead: boolean;
      hasReportRead: boolean;
      hasUserRead: boolean;
      requiredScopes: string[];
      availableScopes: string[];
    };
    participantApiTest: {
      testedWebinarId: string | null;
      success: boolean;
      error: string | null;
      responseData: any;
      rateLimitInfo: {
        remaining: number | null;
        reset: string | null;
      };
    };
  };
  recommendations: string[];
  errors: string[];
}

export const ZoomSyncDiagnostics = () => {
  const [report, setReport] = useState<DiagnosticReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runDiagnostics = async () => {
    setIsLoading(true);
    setError(null);
    setReport(null);

    try {
      const { data, error: funcError } = await supabase.functions.invoke('zoom-sync-diagnostics');
      
      if (funcError) {
        throw new Error(funcError.message);
      }

      setReport(data);
    } catch (err) {
      console.error('Diagnostics failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to run diagnostics');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (success: boolean) => {
    return success ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    );
  };

  const getSyncStatusBadge = (status: string) => {
    switch (status) {
      case 'synced':
        return <Badge variant="secondary">Synced</Badge>;
      case 'pending':
        return <Badge variant="outline">Pending</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'not_applicable':
        return <Badge variant="outline">Not Applicable</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Zoom Sync Diagnostics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            Run diagnostics to check the health of your Zoom integration and identify sync issues.
          </p>
          <Button
            onClick={runDiagnostics}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            {isLoading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Running Diagnostics...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Run Diagnostics
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {report && (
        <div className="space-y-6">
          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{report.summary.totalWebinars}</div>
                  <div className="text-sm text-muted-foreground">Total Webinars</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{report.summary.webinarsWithParticipants}</div>
                  <div className="text-sm text-muted-foreground">With Participants</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{report.summary.webinarsWithoutParticipants}</div>
                  <div className="text-sm text-muted-foreground">Without Participants</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{report.summary.eligibleForParticipantSync}</div>
                  <div className="text-sm text-muted-foreground">Eligible for Sync</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* API Tests */}
          <Card>
            <CardHeader>
              <CardTitle>API Connection Tests</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span>Connection Valid</span>
                {getStatusIcon(report.apiTests.connectionValid)}
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium">Required Scopes</h4>
                {report.apiTests.scopeValidation.requiredScopes.map(scope => (
                  <div key={scope} className="flex items-center justify-between">
                    <span className="text-sm">{scope}</span>
                    {getStatusIcon(report.apiTests.scopeValidation.availableScopes.includes(scope))}
                  </div>
                ))}
              </div>

              {report.apiTests.participantApiTest.testedWebinarId && (
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">Participant API Test</h4>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm">Tested Webinar: {report.apiTests.participantApiTest.testedWebinarId}</span>
                    {getStatusIcon(report.apiTests.participantApiTest.success)}
                  </div>
                  {report.apiTests.participantApiTest.error && (
                    <Alert variant="destructive">
                      <AlertDescription>{report.apiTests.participantApiTest.error}</AlertDescription>
                    </Alert>
                  )}
                  {report.apiTests.participantApiTest.rateLimitInfo.remaining !== null && (
                    <div className="text-sm text-muted-foreground">
                      Rate Limit: {report.apiTests.participantApiTest.rateLimitInfo.remaining} requests remaining
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Webinar Analysis */}
          <Card>
            <CardHeader>
              <CardTitle>Webinar Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {report.webinarAnalysis.map(webinar => (
                  <div key={webinar.id} className="flex items-center justify-between p-3 border rounded">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{webinar.topic}</div>
                      <div className="text-sm text-muted-foreground">
                        {webinar.start_time ? new Date(webinar.start_time).toLocaleDateString() : 'No date'}
                        {webinar.daysSinceWebinar !== null && ` (${webinar.daysSinceWebinar} days ago)`}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getSyncStatusBadge(webinar.participant_sync_status)}
                      {webinar.eligibleForSync && (
                        <Badge variant="outline" className="text-xs">
                          <Clock className="h-3 w-3 mr-1" />
                          Eligible
                        </Badge>
                      )}
                      {webinar.attendees_count !== null && (
                        <Badge variant="outline" className="text-xs">
                          <Users className="h-3 w-3 mr-1" />
                          {webinar.attendees_count}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recommendations */}
          {report.recommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {report.recommendations.map((rec, index) => (
                    <Alert key={index}>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>{rec}</AlertDescription>
                    </Alert>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Errors */}
          {report.errors.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Errors</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {report.errors.map((error, index) => (
                    <Alert key={index} variant="destructive">
                      <XCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};
