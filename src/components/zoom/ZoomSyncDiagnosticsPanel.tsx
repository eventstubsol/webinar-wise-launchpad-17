
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Activity, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  TestTube,
  Wrench,
  Zap
} from 'lucide-react';
import { useZoomConnection } from '@/hooks/useZoomConnection';
import { ZoomConnectionTestService, ConnectionTestResult } from '@/services/zoom/ZoomConnectionTestService';
import { RenderZoomService } from '@/services/zoom/RenderZoomService';

export const ZoomSyncDiagnosticsPanel: React.FC = () => {
  const { connection } = useZoomConnection();
  const [isRunningDiagnostics, setIsRunningDiagnostics] = useState(false);
  const [diagnostics, setDiagnostics] = useState<{
    renderService: ConnectionTestResult;
    zoomApi: ConnectionTestResult;
    database: ConnectionTestResult;
    overall: ConnectionTestResult;
  } | null>(null);
  const [renderStatus, setRenderStatus] = useState<any>(null);

  useEffect(() => {
    // Get Render service status
    const getStatus = async () => {
      const status = RenderZoomService.getServiceStatus();
      setRenderStatus(status);
    };
    getStatus();
  }, []);

  const runComprehensiveDiagnostics = async () => {
    if (!connection?.id) return;
    
    setIsRunningDiagnostics(true);
    try {
      const results = await ZoomConnectionTestService.runDiagnostics(connection.id);
      setDiagnostics(results);
    } catch (error) {
      console.error('Diagnostics error:', error);
    } finally {
      setIsRunningDiagnostics(false);
    }
  };

  const testIndividualComponent = async (component: 'render' | 'zoom' | 'database') => {
    if (!connection?.id) return;
    
    try {
      let result: ConnectionTestResult;
      
      switch (component) {
        case 'zoom':
          result = await ZoomConnectionTestService.testConnection(connection.id);
          break;
        case 'render':
          const health = await RenderZoomService.healthCheck();
          result = {
            success: health.success,
            message: health.success ? 'Render service is healthy' : 'Render service is down',
            details: health
          };
          break;
        case 'database':
          // This would be implemented in the test service
          result = { success: true, message: 'Database test not implemented' };
          break;
        default:
          return;
      }
      
      ZoomConnectionTestService.showTestResults(result);
      
    } catch (error) {
      console.error(`${component} test error:`, error);
    }
  };

  const getStatusIcon = (result: ConnectionTestResult | undefined) => {
    if (!result) return <Activity className="h-4 w-4 text-gray-400" />;
    
    if (result.success) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    } else {
      return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusBadge = (result: ConnectionTestResult | undefined) => {
    if (!result) return <Badge variant="outline">Not Tested</Badge>;
    
    return (
      <Badge variant={result.success ? "default" : "destructive"}>
        {result.success ? "Healthy" : "Issues"}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Sync Diagnostics</h3>
          <p className="text-sm text-gray-600">
            Comprehensive health check for your Zoom sync system
          </p>
        </div>
        <Button 
          onClick={runComprehensiveDiagnostics}
          disabled={isRunningDiagnostics || !connection}
        >
          {isRunningDiagnostics ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Running...
            </>
          ) : (
            <>
              <TestTube className="w-4 h-4 mr-2" />
              Run Full Diagnostics
            </>
          )}
        </Button>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="render">Render Service</TabsTrigger>
          <TabsTrigger value="zoom">Zoom API</TabsTrigger>
          <TabsTrigger value="database">Database</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Overall Status */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Overall Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  {getStatusIcon(diagnostics?.overall)}
                  {getStatusBadge(diagnostics?.overall)}
                </div>
                {diagnostics?.overall && (
                  <p className="text-xs text-gray-600 mt-2">
                    {diagnostics.overall.message}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Render Service */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Render Service</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  {getStatusIcon(diagnostics?.renderService)}
                  {getStatusBadge(diagnostics?.renderService)}
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => testIndividualComponent('render')}
                  className="mt-2 h-6 text-xs"
                >
                  Test Now
                </Button>
              </CardContent>
            </Card>

            {/* Zoom API */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Zoom API</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  {getStatusIcon(diagnostics?.zoomApi)}
                  {getStatusBadge(diagnostics?.zoomApi)}
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => testIndividualComponent('zoom')}
                  className="mt-2 h-6 text-xs"
                >
                  Test Now
                </Button>
              </CardContent>
            </Card>

            {/* Database */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Database</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  {getStatusIcon(diagnostics?.database)}
                  {getStatusBadge(diagnostics?.database)}
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => testIndividualComponent('database')}
                  className="mt-2 h-6 text-xs"
                >
                  Test Now
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Recommendations */}
          {diagnostics && !diagnostics.overall.success && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium">Issues detected:</p>
                  <ul className="text-sm space-y-1">
                    {!diagnostics.renderService.success && (
                      <li>• Render service is not responding properly</li>
                    )}
                    {!diagnostics.zoomApi.success && (
                      <li>• Zoom API connection failed - check credentials</li>
                    )}
                    {!diagnostics.database.success && (
                      <li>• Database connectivity issues</li>
                    )}
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        <TabsContent value="render">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Render Service Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {renderStatus && (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Service Health</p>
                    <p className="font-medium">
                      {renderStatus.healthy ? 'Healthy' : 'Unhealthy'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Last Check</p>
                    <p className="font-medium">
                      {renderStatus.lastCheck ? new Date(renderStatus.lastCheck).toLocaleString() : 'Never'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Sync Mode</p>
                    <p className="font-medium">
                      {renderStatus.directSyncMode ? 'Direct (Fallback)' : 'Render API'}
                    </p>
                  </div>
                </div>
              )}

              {diagnostics?.renderService && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium">Last Test Result:</p>
                  <p className="text-sm text-gray-600 mt-1">
                    {diagnostics.renderService.message}
                  </p>
                  {diagnostics.renderService.details && (
                    <details className="mt-2">
                      <summary className="text-xs text-gray-500 cursor-pointer">
                        View Details
                      </summary>
                      <pre className="text-xs mt-1 bg-white p-2 rounded border overflow-auto">
                        {JSON.stringify(diagnostics.renderService.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => RenderZoomService.forceHealthCheck()}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Force Health Check
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => RenderZoomService.preWarmService()}
                >
                  <Wrench className="w-4 h-4 mr-2" />
                  Pre-warm Service
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="zoom">
          <Card>
            <CardHeader>
              <CardTitle>Zoom API Connection</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {diagnostics?.zoomApi && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    {getStatusIcon(diagnostics.zoomApi)}
                    <span className="font-medium">
                      {diagnostics.zoomApi.success ? 'Connection Successful' : 'Connection Failed'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    {diagnostics.zoomApi.message}
                  </p>
                  
                  {diagnostics.zoomApi.details && (
                    <div className="mt-3 space-y-2">
                      {diagnostics.zoomApi.details.userInfo && (
                        <div>
                          <p className="text-xs font-medium">User Information:</p>
                          <p className="text-xs text-gray-600">
                            Email: {diagnostics.zoomApi.details.userInfo.email}
                          </p>
                          <p className="text-xs text-gray-600">
                            Account: {diagnostics.zoomApi.details.userInfo.account_id}
                          </p>
                        </div>
                      )}
                      
                      {diagnostics.zoomApi.details.responseTime && (
                        <p className="text-xs text-gray-600">
                          Response Time: {diagnostics.zoomApi.details.responseTime}ms
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              <Button 
                onClick={() => testIndividualComponent('zoom')}
                className="w-full"
              >
                <TestTube className="w-4 h-4 mr-2" />
                Test Zoom Connection
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="database">
          <Card>
            <CardHeader>
              <CardTitle>Database Connection</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {diagnostics?.database && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    {getStatusIcon(diagnostics.database)}
                    <span className="font-medium">
                      {diagnostics.database.success ? 'Database OK' : 'Database Issues'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    {diagnostics.database.message}
                  </p>
                </div>
              )}

              <Button 
                onClick={() => testIndividualComponent('database')}
                className="w-full"
              >
                <TestTube className="w-4 h-4 mr-2" />
                Test Database Connection
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
