
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  RefreshCw, 
  Play, 
  Zap,
  AlertCircle,
  CheckCircle2,
  Clock,
  Database
} from 'lucide-react';
import { useZoomSync } from '@/hooks/useZoomSync';
import { useZoomConnection } from '@/hooks/useZoomConnection';
import { useDashboardRefresh } from '@/hooks/useDashboardRefresh';
import { SyncType } from '@/types/zoom';

export function FirstTimeSyncOnboarding() {
  const { connection } = useZoomConnection();
  const { refreshDashboardData } = useDashboardRefresh();
  const {
    isSyncing,
    syncProgress,
    currentOperation,
    startSync,
    syncError
  } = useZoomSync(connection);

  const handleStartInitialSync = () => {
    startSync(SyncType.INITIAL, {
      onComplete: refreshDashboardData
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Welcome Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-2">
          <Database className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Welcome to Webinar Analytics</h1>
        </div>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Let's sync your Zoom webinar data to unlock powerful insights and analytics
        </p>
      </div>

      {/* Sync Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-blue-600" />
            Initial Data Sync
            {isSyncing && (
              <Badge className="flex items-center gap-1">
                <RefreshCw className="w-3 h-3 animate-spin" />
                Syncing...
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {!isSyncing ? (
            <>
              <div className="text-center space-y-4">
                <div className="bg-blue-50 p-6 rounded-lg">
                  <CheckCircle2 className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Ready to Start Your First Sync
                  </h3>
                  <p className="text-gray-600 mb-4">
                    We'll fetch all your webinar data from Zoom and prepare it for analysis. 
                    This initial sync may take a few minutes depending on your data volume.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="bg-gray-50 p-4 rounded-lg text-center">
                    <Database className="h-6 w-6 text-gray-600 mx-auto mb-2" />
                    <p className="font-medium">Webinar Data</p>
                    <p className="text-gray-600">Basic webinar information</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg text-center">
                    <Clock className="h-6 w-6 text-gray-600 mx-auto mb-2" />
                    <p className="font-medium">Participant Data</p>
                    <p className="text-gray-600">Attendance and engagement</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg text-center">
                    <CheckCircle2 className="h-6 w-6 text-gray-600 mx-auto mb-2" />
                    <p className="font-medium">Analytics Ready</p>
                    <p className="text-gray-600">Insights and reports</p>
                  </div>
                </div>

                <Button 
                  onClick={handleStartInitialSync}
                  size="lg"
                  className="w-full md:w-auto px-8"
                  disabled={!connection}
                >
                  <Play className="w-4 h-4 mr-2" />
                  Start Initial Sync
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="text-center">
                <RefreshCw className="h-12 w-12 text-blue-600 mx-auto mb-4 animate-spin" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Syncing Your Data
                </h3>
                <p className="text-gray-600 mb-4">
                  Please wait while we fetch and process your webinar data...
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Progress</span>
                  <span>{syncProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-blue-600 h-3 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${syncProgress}%` }}
                  />
                </div>
                <p className="text-sm text-gray-600 text-center">
                  {currentOperation}
                </p>
              </div>

              {syncError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-red-800">Sync Error</h4>
                      <p className="text-sm text-red-700 mt-1">{syncError}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <Separator />

          <div className="text-xs text-gray-500 text-center">
            <p>
              Your data is processed securely and never shared with third parties. 
              The sync process respects Zoom's API rate limits to ensure reliability.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
