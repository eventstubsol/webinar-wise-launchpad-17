
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Wrench, 
  AlertTriangle, 
  CheckCircle, 
  BarChart3, 
  RefreshCw,
  FileText,
  Users,
  Calendar
} from 'lucide-react';
import { useWebinarMetricsRepair } from '@/hooks/useWebinarMetricsRepair';
import { useZoomConnection } from '@/hooks/useZoomConnection';

export function MetricsRepairDashboard() {
  const { connection } = useZoomConnection();
  const {
    repairMetrics,
    isRepairing,
    repairError,
    repairReport,
    generateReport,
    isGeneratingReport,
    reportError
  } = useWebinarMetricsRepair();

  const [lastReport, setLastReport] = useState<any>(null);

  const handleGenerateReport = async () => {
    try {
      const report = await new Promise((resolve, reject) => {
        generateReport(connection?.id, {
          onSuccess: resolve,
          onError: reject
        });
      });
      setLastReport(report);
    } catch (error) {
      console.error('Failed to generate report:', error);
    }
  };

  const handleRepairMetrics = () => {
    repairMetrics(connection?.id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Wrench className="h-5 w-5" />
        <h2 className="text-2xl font-bold">Webinar Metrics Repair</h2>
      </div>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          This tool fixes webinars where total_attendees is zero but participant data exists. 
          It recalculates metrics from existing participant and registrant data.
        </AlertDescription>
      </Alert>

      {!connection && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            No Zoom connection found. Please connect your Zoom account first.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Generate Report */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Diagnostic Report
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Generate a report to see which webinars need metrics repair.
            </p>
            
            <Button 
              onClick={handleGenerateReport}
              disabled={!connection || isGeneratingReport}
              className="w-full"
            >
              {isGeneratingReport ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Generating Report...
                </>
              ) : (
                <>
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Generate Report
                </>
              )}
            </Button>

            {reportError && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{reportError.message}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Repair Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              Repair Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Fix all webinars with missing or incorrect metrics data.
            </p>
            
            <Button 
              onClick={handleRepairMetrics}
              disabled={!connection || isRepairing}
              className="w-full"
              variant="default"
            >
              {isRepairing ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Repairing Metrics...
                </>
              ) : (
                <>
                  <Wrench className="mr-2 h-4 w-4" />
                  Repair All Metrics
                </>
              )}
            </Button>

            {repairError && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{repairError.message}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Report Results */}
      {lastReport && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Diagnostic Report Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  <span className="text-sm font-medium">Need Repair</span>
                </div>
                <div className="text-2xl font-bold">{lastReport.webinarsNeedingRepair}</div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-red-500" />
                  <span className="text-sm font-medium">Zero Attendees</span>
                </div>
                <div className="text-2xl font-bold">{lastReport.webinarsWithZeroAttendees}</div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm font-medium">Pending Sync</span>
                </div>
                <div className="text-2xl font-bold">{lastReport.webinarsWithPendingSync}</div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <span className="text-sm font-medium">Failed Sync</span>
                </div>
                <div className="text-2xl font-bold">{lastReport.webinarsWithFailedSync}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Repair Results */}
      {repairReport && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Repair Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <span className="text-sm font-medium">Total Processed</span>
                <div className="text-2xl font-bold">{repairReport.totalProcessed}</div>
              </div>
              
              <div className="space-y-2">
                <span className="text-sm font-medium">Successfully Repaired</span>
                <div className="text-2xl font-bold text-green-600">{repairReport.successCount}</div>
              </div>
              
              <div className="space-y-2">
                <span className="text-sm font-medium">Errors</span>
                <div className="text-2xl font-bold text-red-600">{repairReport.errorCount}</div>
              </div>
            </div>

            {repairReport.totalProcessed > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span>{Math.round((repairReport.successCount / repairReport.totalProcessed) * 100)}%</span>
                </div>
                <Progress 
                  value={(repairReport.successCount / repairReport.totalProcessed) * 100} 
                  className="w-full"
                />
              </div>
            )}

            {repairReport.errors && repairReport.errors.length > 0 && (
              <div className="space-y-2">
                <Separator />
                <h4 className="font-semibold text-red-600">Errors Encountered:</h4>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {repairReport.errors.slice(0, 5).map((error: string, index: number) => (
                    <div key={index} className="text-xs text-red-600 bg-red-50 p-2 rounded">
                      {error}
                    </div>
                  ))}
                  {repairReport.errors.length > 5 && (
                    <div className="text-xs text-muted-foreground">
                      ... and {repairReport.errors.length - 5} more errors
                    </div>
                  )}
                </div>
              </div>
            )}

            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Repair completed! Refresh your webinar data to see the updated metrics.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
