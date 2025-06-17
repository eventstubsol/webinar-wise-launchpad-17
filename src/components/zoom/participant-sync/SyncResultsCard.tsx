
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle } from 'lucide-react';

interface SyncReport {
  webinarId: string;
  webinarDbId: string;
  title: string;
  success: boolean;
  participantsFetched: number;
  participantsBefore: number;
  participantsAfter: number;
  apiResponseTime: number | null;
  dbOperationTime: number | null;
  errorMessage?: string;
}

interface SyncResultsCardProps {
  syncResults: SyncReport[] | null;
}

export function SyncResultsCard({ syncResults }: SyncResultsCardProps) {
  const formatDuration = (ms: number | null) => {
    if (!ms) return 'N/A';
    return `${ms}ms`;
  };

  if (!syncResults) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-600" />
          Sync Results
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {syncResults.filter(r => r.success).length}
              </div>
              <div className="text-sm text-muted-foreground">Successful</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {syncResults.filter(r => !r.success).length}
              </div>
              <div className="text-sm text-muted-foreground">Failed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {syncResults.reduce((sum, r) => sum + r.participantsFetched, 0)}
              </div>
              <div className="text-sm text-muted-foreground">Total Participants</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {Math.round(syncResults.reduce((sum, r) => sum + (r.apiResponseTime || 0), 0) / syncResults.length)}ms
              </div>
              <div className="text-sm text-muted-foreground">Avg Response Time</div>
            </div>
          </div>

          <div className="space-y-2">
            {syncResults.map((result, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium truncate">{result.title}</div>
                  {result.success ? (
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                  )}
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Participants:</span>
                    <div className="font-medium">{result.participantsFetched}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">API Time:</span>
                    <div className="font-medium">{formatDuration(result.apiResponseTime)}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">DB Time:</span>
                    <div className="font-medium">{formatDuration(result.dbOperationTime)}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Before/After:</span>
                    <div className="font-medium">{result.participantsBefore} → {result.participantsAfter}</div>
                  </div>
                </div>

                {result.errorMessage && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                    {result.errorMessage}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
