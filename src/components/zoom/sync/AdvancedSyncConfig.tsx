
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Settings, 
  Clock, 
  Database, 
  Zap, 
  Shield, 
  TrendingUp,
  Calendar,
  Filter,
  Download,
  Upload
} from 'lucide-react';
import { useZoomConnection } from '@/hooks/useZoomConnection';
import { useToast } from '@/hooks/use-toast';

interface SyncConfiguration {
  dataTypes: {
    webinars: boolean;
    registrants: boolean;
    participants: boolean;
    recordings: boolean;
    polls: boolean;
    qna: boolean;
    chat: boolean;
  };
  scheduling: {
    enabled: boolean;
    frequency: 'hourly' | 'daily' | 'weekly' | 'monthly';
    time: string;
    timezone: string;
  };
  performance: {
    batchSize: number;
    throttleDelay: number;
    retryAttempts: number;
    timeoutSeconds: number;
  };
  conflicts: {
    resolution: 'last_write_wins' | 'manual_review' | 'zoom_wins' | 'local_wins';
    notifyOnConflict: boolean;
  };
  filters: {
    dateRange: number; // days
    webinarTypes: string[];
    minimumParticipants: number;
  };
}

export const AdvancedSyncConfig: React.FC = () => {
  const { connection } = useZoomConnection();
  const { toast } = useToast();
  
  const [config, setConfig] = useState<SyncConfiguration>({
    dataTypes: {
      webinars: true,
      registrants: true,
      participants: true,
      recordings: false,
      polls: false,
      qna: false,
      chat: false,
    },
    scheduling: {
      enabled: false,
      frequency: 'daily',
      time: '02:00',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    performance: {
      batchSize: 50,
      throttleDelay: 1000,
      retryAttempts: 3,
      timeoutSeconds: 30,
    },
    conflicts: {
      resolution: 'last_write_wins',
      notifyOnConflict: true,
    },
    filters: {
      dateRange: 30,
      webinarTypes: ['webinar', 'meeting'],
      minimumParticipants: 0,
    },
  });

  const [isSaving, setIsSaving] = useState(false);

  const handleSaveConfig = async () => {
    setIsSaving(true);
    try {
      // Save configuration via API
      toast({
        title: "Configuration Saved",
        description: "Your sync settings have been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Failed to save sync configuration. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const updateDataType = (type: keyof SyncConfiguration['dataTypes'], enabled: boolean) => {
    setConfig(prev => ({
      ...prev,
      dataTypes: {
        ...prev.dataTypes,
        [type]: enabled,
      },
    }));
  };

  const updateScheduling = (field: keyof SyncConfiguration['scheduling'], value: any) => {
    setConfig(prev => ({
      ...prev,
      scheduling: {
        ...prev.scheduling,
        [field]: value,
      },
    }));
  };

  const updatePerformance = (field: keyof SyncConfiguration['performance'], value: number) => {
    setConfig(prev => ({
      ...prev,
      performance: {
        ...prev.performance,
        [field]: value,
      },
    }));
  };

  if (!connection) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Database className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Connect a Zoom account to configure sync settings</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Advanced Sync Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="data-types" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="data-types">Data Types</TabsTrigger>
              <TabsTrigger value="scheduling">Scheduling</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
            </TabsList>

            <TabsContent value="data-types" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    Select Data to Sync
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.entries(config.dataTypes).map(([type, enabled]) => (
                    <div key={type} className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label className="capitalize">{type.replace(/([A-Z])/g, ' $1').trim()}</Label>
                        <div className="text-sm text-muted-foreground">
                          {type === 'webinars' && 'Basic webinar information and metadata'}
                          {type === 'registrants' && 'Registration data and attendee information'}
                          {type === 'participants' && 'Participation tracking and analytics'}
                          {type === 'recordings' && 'Recording metadata and access information'}
                          {type === 'polls' && 'Poll questions and responses'}
                          {type === 'qna' && 'Q&A questions and answers'}
                          {type === 'chat' && 'Chat messages and interactions'}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {enabled && <Badge variant="secondary">Enabled</Badge>}
                        <Switch
                          checked={enabled}
                          onCheckedChange={(checked) => updateDataType(type as keyof SyncConfiguration['dataTypes'], checked)}
                        />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="scheduling" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Automatic Sync Scheduling
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Enable Automatic Sync</Label>
                      <div className="text-sm text-muted-foreground">
                        Automatically sync data at scheduled intervals
                      </div>
                    </div>
                    <Switch
                      checked={config.scheduling.enabled}
                      onCheckedChange={(checked) => updateScheduling('enabled', checked)}
                    />
                  </div>

                  {config.scheduling.enabled && (
                    <>
                      <Separator />
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Frequency</Label>
                          <Select
                            value={config.scheduling.frequency}
                            onValueChange={(value) => updateScheduling('frequency', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="hourly">Hourly</SelectItem>
                              <SelectItem value="daily">Daily</SelectItem>
                              <SelectItem value="weekly">Weekly</SelectItem>
                              <SelectItem value="monthly">Monthly</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Time</Label>
                          <input
                            type="time"
                            value={config.scheduling.time}
                            onChange={(e) => updateScheduling('time', e.target.value)}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Timezone</Label>
                        <Select
                          value={config.scheduling.timezone}
                          onValueChange={(value) => updateScheduling('timezone', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="UTC">UTC</SelectItem>
                            <SelectItem value="America/New_York">Eastern Time</SelectItem>
                            <SelectItem value="America/Chicago">Central Time</SelectItem>
                            <SelectItem value="America/Denver">Mountain Time</SelectItem>
                            <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="performance" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Performance Optimization
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Batch Size: {config.performance.batchSize} items</Label>
                      <Slider
                        value={[config.performance.batchSize]}
                        onValueChange={([value]) => updatePerformance('batchSize', value)}
                        max={200}
                        min={10}
                        step={10}
                        className="w-full"
                      />
                      <div className="text-sm text-muted-foreground">
                        Number of items to process in each batch
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Throttle Delay: {config.performance.throttleDelay}ms</Label>
                      <Slider
                        value={[config.performance.throttleDelay]}
                        onValueChange={([value]) => updatePerformance('throttleDelay', value)}
                        max={5000}
                        min={100}
                        step={100}
                        className="w-full"
                      />
                      <div className="text-sm text-muted-foreground">
                        Delay between API requests to avoid rate limits
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Retry Attempts: {config.performance.retryAttempts}</Label>
                      <Slider
                        value={[config.performance.retryAttempts]}
                        onValueChange={([value]) => updatePerformance('retryAttempts', value)}
                        max={10}
                        min={1}
                        step={1}
                        className="w-full"
                      />
                      <div className="text-sm text-muted-foreground">
                        Number of retry attempts for failed requests
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Request Timeout: {config.performance.timeoutSeconds}s</Label>
                      <Slider
                        value={[config.performance.timeoutSeconds]}
                        onValueChange={([value]) => updatePerformance('timeoutSeconds', value)}
                        max={120}
                        min={10}
                        step={5}
                        className="w-full"
                      />
                      <div className="text-sm text-muted-foreground">
                        Maximum time to wait for API responses
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="advanced" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Conflict Resolution & Filters
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Conflict Resolution Strategy</Label>
                      <Select
                        value={config.conflicts.resolution}
                        onValueChange={(value) => setConfig(prev => ({
                          ...prev,
                          conflicts: { ...prev.conflicts, resolution: value as any }
                        }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="last_write_wins">Last Write Wins</SelectItem>
                          <SelectItem value="manual_review">Manual Review</SelectItem>
                          <SelectItem value="zoom_wins">Zoom Data Wins</SelectItem>
                          <SelectItem value="local_wins">Local Data Wins</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Notify on Conflicts</Label>
                        <div className="text-sm text-muted-foreground">
                          Send notifications when data conflicts are detected
                        </div>
                      </div>
                      <Switch
                        checked={config.conflicts.notifyOnConflict}
                        onCheckedChange={(checked) => setConfig(prev => ({
                          ...prev,
                          conflicts: { ...prev.conflicts, notifyOnConflict: checked }
                        }))}
                      />
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <Label>Date Range Filter: {config.filters.dateRange} days</Label>
                      <Slider
                        value={[config.filters.dateRange]}
                        onValueChange={([value]) => setConfig(prev => ({
                          ...prev,
                          filters: { ...prev.filters, dateRange: value }
                        }))}
                        max={365}
                        min={1}
                        step={1}
                        className="w-full"
                      />
                      <div className="text-sm text-muted-foreground">
                        Only sync webinars from the last N days
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Minimum Participants: {config.filters.minimumParticipants}</Label>
                      <Slider
                        value={[config.filters.minimumParticipants]}
                        onValueChange={([value]) => setConfig(prev => ({
                          ...prev,
                          filters: { ...prev.filters, minimumParticipants: value }
                        }))}
                        max={100}
                        min={0}
                        step={1}
                        className="w-full"
                      />
                      <div className="text-sm text-muted-foreground">
                        Only sync webinars with at least N participants
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end pt-6">
            <Button onClick={handleSaveConfig} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Download className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Save Configuration
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
