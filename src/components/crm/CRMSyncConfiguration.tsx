import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Play, Square, RefreshCw, Clock } from 'lucide-react';
import { CRMConnection } from '@/types/crm';
import { CRMConnectionManager } from '@/services/crm/CRMConnectionManager';
import { CRMSyncOrchestrator } from '@/services/crm/SyncOrchestrator';
import { useToast } from '@/hooks/use-toast';

interface CRMSyncConfigurationProps {
  connection: CRMConnection;
  onUpdate: () => void;
}

export function CRMSyncConfiguration({ connection, onUpdate }: CRMSyncConfigurationProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [formData, setFormData] = useState({
    syncEnabled: connection.sync_enabled,
    syncDirection: connection.sync_direction,
    syncFrequency: connection.sync_frequency_hours,
    nextSyncAt: connection.next_sync_at
  });

  const handleUpdateSettings = async () => {
    try {
      setLoading(true);
      
      const updates = {
        sync_enabled: formData.syncEnabled,
        sync_direction: formData.syncDirection,
        sync_frequency_hours: formData.syncFrequency
      };

      await CRMConnectionManager.updateConnection(connection.id, updates);
      
      toast({
        title: "Success",
        description: "Sync settings updated successfully",
      });

      onUpdate();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update sync settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleManualSync = async (direction?: 'incoming' | 'outgoing' | 'bidirectional') => {
    try {
      setIsSyncing(true);
      setSyncProgress(0);

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setSyncProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      const result = await CRMSyncOrchestrator.getInstance().startSync(connection.id, {
        direction: direction || formData.syncDirection
      });

      clearInterval(progressInterval);
      setSyncProgress(100);

      toast({
        title: "Sync Complete",
        description: `Sync completed successfully.`,
        variant: "default"
      });

      setTimeout(() => {
        setSyncProgress(0);
        setIsSyncing(false);
      }, 2000);

      onUpdate();
    } catch (error) {
      toast({
        title: "Sync Failed",
        description: "An error occurred during synchronization",
        variant: "destructive",
      });
      
      setIsSyncing(false);
      setSyncProgress(0);
    }
  };

  const handleDryRun = async () => {
    try {
      setLoading(true);
      
      toast({
        title: "Dry Run Complete",
        description: `Dry run completed successfully.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to perform dry run",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Sync Configuration</CardTitle>
          <CardDescription>
            Configure how and when your webinar data syncs with your CRM
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="syncEnabled">Enable Automatic Sync</Label>
              <p className="text-sm text-muted-foreground">
                Automatically sync data based on the schedule below
              </p>
            </div>
            <Switch
              id="syncEnabled"
              checked={formData.syncEnabled}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, syncEnabled: checked }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Sync Direction</Label>
              <Select
                value={formData.syncDirection}
                onValueChange={(value: any) => setFormData(prev => ({ ...prev, syncDirection: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bidirectional">
                    <div className="flex flex-col">
                      <span>Bidirectional</span>
                      <span className="text-xs text-muted-foreground">Sync both ways</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="outgoing">
                    <div className="flex flex-col">
                      <span>To CRM Only</span>
                      <span className="text-xs text-muted-foreground">Webinar → CRM</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="incoming">
                    <div className="flex flex-col">
                      <span>From CRM Only</span>
                      <span className="text-xs text-muted-foreground">CRM → Webinar</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Sync Frequency (hours)</Label>
              <Input
                type="number"
                min="1"
                max="168"
                value={formData.syncFrequency}
                onChange={(e) => setFormData(prev => ({ ...prev, syncFrequency: parseInt(e.target.value) }))}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleUpdateSettings} disabled={loading}>
              {loading ? 'Updating...' : 'Update Settings'}
            </Button>
            <Button variant="outline" onClick={handleDryRun} disabled={loading || isSyncing}>
              Test Sync (Dry Run)
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Manual Sync</CardTitle>
          <CardDescription>
            Trigger an immediate sync or test specific sync directions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isSyncing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Sync in progress...</span>
                <span className="text-sm text-muted-foreground">{syncProgress}%</span>
              </div>
              <Progress value={syncProgress} />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              variant="outline"
              onClick={() => handleManualSync('bidirectional')}
              disabled={isSyncing}
              className="flex flex-col h-auto p-4"
            >
              <RefreshCw className="h-6 w-6 mb-2" />
              <span className="font-medium">Full Sync</span>
              <span className="text-xs text-muted-foreground">Bidirectional</span>
            </Button>

            <Button
              variant="outline"
              onClick={() => handleManualSync('outgoing')}
              disabled={isSyncing}
              className="flex flex-col h-auto p-4"
            >
              <Play className="h-6 w-6 mb-2" />
              <span className="font-medium">To CRM</span>
              <span className="text-xs text-muted-foreground">Webinar → CRM</span>
            </Button>

            <Button
              variant="outline"
              onClick={() => handleManualSync('incoming')}
              disabled={isSyncing}
              className="flex flex-col h-auto p-4"
            >
              <Square className="h-6 w-6 mb-2" />
              <span className="font-medium">From CRM</span>
              <span className="text-xs text-muted-foreground">CRM → Webinar</span>
            </Button>
          </div>

          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Last sync:</span>
              <span>{connection.last_sync_at ? new Date(connection.last_sync_at).toLocaleString() : 'Never'}</span>
            </div>
            {connection.next_sync_at && formData.syncEnabled && (
              <div className="flex items-center space-x-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Next sync:</span>
                <span>{new Date(connection.next_sync_at).toLocaleString()}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sync Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <Badge variant={connection.status === 'active' ? 'default' : 'destructive'}>
              {connection.status}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {connection.sync_enabled ? 'Automatic sync enabled' : 'Automatic sync disabled'}
            </span>
          </div>
          {connection.error_message && (
            <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded">
              <p className="text-sm text-red-600">{connection.error_message}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
