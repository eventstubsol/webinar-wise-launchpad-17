
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Settings, 
  Users, 
  Activity, 
  Zap, 
  Shield, 
  TrendingUp,
  Database,
  Bell
} from 'lucide-react';
import { ZoomIntegrationSettings } from '../ZoomIntegrationSettings';
import { MultiAccountManager } from '@/components/zoom/connection/MultiAccountManager';
import { ConnectionHealthDashboard } from '@/components/zoom/connection/ConnectionHealthDashboard';
import { AdvancedSyncConfig } from '@/components/zoom/sync/AdvancedSyncConfig';
import { PerformanceMetricsDashboard } from '@/components/sync/PerformanceMetricsDashboard';
import { useZoomConnection } from '@/hooks/useZoomConnection';

export const EnhancedZoomSettings: React.FC = () => {
  const { connection, isConnected } = useZoomConnection();
  const [activeTab, setActiveTab] = useState('connection');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Enhanced Zoom Integration Settings
            <Badge variant="secondary">v2.0</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Comprehensive Zoom integration management with advanced features for multi-account support, 
            health monitoring, and performance optimization.
          </p>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="connection" className="flex items-center gap-1">
            <Settings className="h-3 w-3" />
            Connection
          </TabsTrigger>
          <TabsTrigger value="accounts" className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            Accounts
          </TabsTrigger>
          <TabsTrigger value="health" className="flex items-center gap-1">
            <Activity className="h-3 w-3" />
            Health
          </TabsTrigger>
          <TabsTrigger value="sync" className="flex items-center gap-1">
            <Database className="h-3 w-3" />
            Sync Config
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-1">
            <Shield className="h-3 w-3" />
            Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value="connection">
          <ZoomIntegrationSettings />
        </TabsContent>

        <TabsContent value="accounts">
          <MultiAccountManager />
        </TabsContent>

        <TabsContent value="health">
          <ConnectionHealthDashboard />
        </TabsContent>

        <TabsContent value="sync">
          <AdvancedSyncConfig />
        </TabsContent>

        <TabsContent value="performance">
          {isConnected && connection ? (
            <PerformanceMetricsDashboard 
              connectionId={connection.id} 
              userId={connection.user_id} 
            />
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Connect a Zoom account to view performance metrics</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security & Compliance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Shield className="h-4 w-4 text-green-500" />
                        <span className="font-medium">Encryption</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        All tokens and credentials are encrypted at rest and in transit
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Activity className="h-4 w-4 text-blue-500" />
                        <span className="font-medium">Audit Logging</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Complete audit trail of all connection and sync activities
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Bell className="h-4 w-4 text-yellow-500" />
                        <span className="font-medium">Alerts</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Real-time notifications for security events and issues
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Zap className="h-4 w-4 text-purple-500" />
                        <span className="font-medium">Auto-Recovery</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Automatic detection and recovery from connection issues
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Compliance & Standards</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li>• SOC 2 Type II compliant data handling</li>
                      <li>• GDPR compliant data processing</li>
                      <li>• OAuth 2.0 security standards</li>
                      <li>• Regular security audits and updates</li>
                      <li>• Zero-trust architecture implementation</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
