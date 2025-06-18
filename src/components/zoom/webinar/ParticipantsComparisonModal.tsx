
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, AlertTriangle, Clock, Users, Zap } from 'lucide-react';
import type { ParticipantsComparisonResult } from '@/services/zoom/api/ZoomWebinarDataService';

interface ParticipantsComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  comparisonResult: ParticipantsComparisonResult | null;
  isComparing: boolean;
}

export const ParticipantsComparisonModal: React.FC<ParticipantsComparisonModalProps> = ({
  isOpen,
  onClose,
  comparisonResult,
  isComparing
}) => {
  if (!isOpen) return null;

  if (isComparing) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 animate-spin" />
              Comparing API Endpoints...
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-pulse text-muted-foreground">
                Testing both participant API endpoints to compare data quality and performance...
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!comparisonResult) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>API Comparison Results</DialogTitle>
          </DialogHeader>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              No comparison data available. Please run the comparison test first.
            </AlertDescription>
          </Alert>
        </DialogContent>
      </Dialog>
    );
  }

  const { reportEndpoint, pastWebinarEndpoint, comparison } = comparisonResult;

  const getStatusIcon = (hasError: boolean) => {
    return hasError ? 
      <XCircle className="h-5 w-5 text-red-500" /> : 
      <CheckCircle className="h-5 w-5 text-green-500" />;
  };

  const getPerformanceBadge = (responseTime: number) => {
    if (responseTime < 2000) return <Badge variant="default">Fast</Badge>;
    if (responseTime < 5000) return <Badge variant="secondary">Moderate</Badge>;
    return <Badge variant="destructive">Slow</Badge>;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Participant API Endpoints Comparison
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Performance Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Report Endpoint</span>
                  {getStatusIcon(!!reportEndpoint.error)}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  /report/webinars/{'{webinarId}'}/participants
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span>Participants Found:</span>
                  <Badge variant="outline">{reportEndpoint.count}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Response Time:</span>
                  {getPerformanceBadge(reportEndpoint.responseTime)}
                  <span className="text-sm text-muted-foreground">
                    {reportEndpoint.responseTime}ms
                  </span>
                </div>
                {reportEndpoint.error && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      {reportEndpoint.error}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Past Webinars Endpoint</span>
                  {getStatusIcon(!!pastWebinarEndpoint.error)}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  /past_webinars/{'{webinarId}'}/participants
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span>Participants Found:</span>
                  <Badge variant="outline">{pastWebinarEndpoint.count}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Response Time:</span>
                  {getPerformanceBadge(pastWebinarEndpoint.responseTime)}
                  <span className="text-sm text-muted-foreground">
                    {pastWebinarEndpoint.responseTime}ms
                  </span>
                </div>
                {pastWebinarEndpoint.error && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      {pastWebinarEndpoint.error}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Data Comparison Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Data Comparison Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {Math.abs(comparison.countDifference)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Participant Count Difference
                  </div>
                  {comparison.countDifference !== 0 && (
                    <div className="text-xs mt-1">
                      {comparison.countDifference > 0 ? 
                        'Past Webinars has more' : 
                        'Report endpoint has more'}
                    </div>
                  )}
                </div>

                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {comparison.uniqueToReport.length}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Unique to Report Endpoint
                  </div>
                </div>

                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {comparison.uniqueToPastWebinar.length}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Unique to Past Webinars
                  </div>
                </div>
              </div>

              {comparison.dataStructureDifferences.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Data Structure Differences:</h4>
                  <ul className="space-y-1">
                    {comparison.dataStructureDifferences.map((diff, index) => (
                      <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0 text-yellow-500" />
                        {diff}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {comparison.countDifference === 0 && comparison.uniqueToReport.length === 0 && comparison.uniqueToPastWebinar.length === 0 && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Perfect data consistency! Both endpoints return identical participant data.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle>Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pastWebinarEndpoint.responseTime < reportEndpoint.responseTime && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Performance:</strong> Past Webinars endpoint is faster ({pastWebinarEndpoint.responseTime}ms vs {reportEndpoint.responseTime}ms)
                    </AlertDescription>
                  </Alert>
                )}

                {comparison.countDifference > 0 && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Data Completeness:</strong> Past Webinars endpoint provides {comparison.countDifference} more participants
                    </AlertDescription>
                  </Alert>
                )}

                {!pastWebinarEndpoint.error && !reportEndpoint.error && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Reliability:</strong> Both endpoints are accessible and working properly
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};
