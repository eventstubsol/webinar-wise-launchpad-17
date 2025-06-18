
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, XCircle, AlertCircle, Clock, Users, Zap } from 'lucide-react';
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
  isComparing,
}) => {
  if (!comparisonResult && !isComparing) return null;

  const getStatusIcon = (hasError: boolean, count: number) => {
    if (hasError) return <XCircle className="h-4 w-4 text-red-500" />;
    if (count > 0) return <CheckCircle className="h-4 w-4 text-green-500" />;
    return <AlertCircle className="h-4 w-4 text-yellow-500" />;
  };

  const getPerformanceBadge = (responseTime: number) => {
    if (responseTime < 1000) return <Badge variant="outline" className="text-green-600">Fast</Badge>;
    if (responseTime < 3000) return <Badge variant="outline" className="text-yellow-600">Moderate</Badge>;
    return <Badge variant="outline" className="text-red-600">Slow</Badge>;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Participants API Endpoints Comparison
          </DialogTitle>
          <DialogDescription>
            Comparing the original /report/ endpoint with the alternative /past_webinars/ endpoint
          </DialogDescription>
        </DialogHeader>

        {isComparing && (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span>Comparing endpoints...</span>
            </div>
          </div>
        )}

        {comparisonResult && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Report Endpoint */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {getStatusIcon(!!comparisonResult.reportEndpoint.error, comparisonResult.reportEndpoint.count)}
                    Report Endpoint
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Participants</span>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span className="font-medium">{comparisonResult.reportEndpoint.count}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Response Time</span>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span className="font-medium">{comparisonResult.reportEndpoint.responseTime}ms</span>
                      {getPerformanceBadge(comparisonResult.reportEndpoint.responseTime)}
                    </div>
                  </div>
                  {comparisonResult.reportEndpoint.error && (
                    <div className="p-2 bg-red-50 rounded text-sm text-red-700">
                      Error: {comparisonResult.reportEndpoint.error}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Past Webinars Endpoint */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {getStatusIcon(!!comparisonResult.pastWebinarEndpoint.error, comparisonResult.pastWebinarEndpoint.count)}
                    Past Webinars Endpoint
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Participants</span>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span className="font-medium">{comparisonResult.pastWebinarEndpoint.count}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Response Time</span>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span className="font-medium">{comparisonResult.pastWebinarEndpoint.responseTime}ms</span>
                      {getPerformanceBadge(comparisonResult.pastWebinarEndpoint.responseTime)}
                    </div>
                  </div>
                  {comparisonResult.pastWebinarEndpoint.error && (
                    <div className="p-2 bg-red-50 rounded text-sm text-red-700">
                      Error: {comparisonResult.pastWebinarEndpoint.error}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Separator />

            {/* Comparison Analysis */}
            <Card>
              <CardHeader>
                <CardTitle>Comparison Analysis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {comparisonResult.comparison.countDifference > 0 ? '+' : ''}{comparisonResult.comparison.countDifference}
                    </div>
                    <div className="text-sm text-muted-foreground">Count Difference</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      (Past Webinars - Report)
                    </div>
                  </div>
                  
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">
                      {comparisonResult.comparison.uniqueToReport.length}
                    </div>
                    <div className="text-sm text-muted-foreground">Unique to Report</div>
                  </div>
                  
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {comparisonResult.comparison.uniqueToPastWebinar.length}
                    </div>
                    <div className="text-sm text-muted-foreground">Unique to Past Webinars</div>
                  </div>
                </div>

                {comparisonResult.comparison.dataStructureDifferences.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Data Structure Differences:</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      {comparisonResult.comparison.dataStructureDifferences.map((diff, index) => (
                        <li key={index}>{diff}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Performance Comparison */}
                <div>
                  <h4 className="font-medium mb-2">Performance Analysis:</h4>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>
                      • The {comparisonResult.reportEndpoint.responseTime < comparisonResult.pastWebinarEndpoint.responseTime ? 'Report' : 'Past Webinars'} endpoint was faster by{' '}
                      {Math.abs(comparisonResult.reportEndpoint.responseTime - comparisonResult.pastWebinarEndpoint.responseTime)}ms
                    </p>
                    {comparisonResult.comparison.countDifference !== 0 && (
                      <p>
                        • The Past Webinars endpoint returned {Math.abs(comparisonResult.comparison.countDifference)} {comparisonResult.comparison.countDifference > 0 ? 'more' : 'fewer'} participants
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
