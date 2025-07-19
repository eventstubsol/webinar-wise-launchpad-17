
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calendar, Clock, Info, Save, AlertCircle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";

interface SyncScheduleConfig {
  enabled: boolean;
  frequency: 'hourly' | 'daily' | 'weekly' | 'monthly';
  time?: string; // HH:MM format
  dayOfWeek?: number; // 0-6 (Sunday-Saturday)
  dayOfMonth?: number; // 1-31
  syncMode: 'smart' | 'full' | 'delta';
  dateRange: {
    pastDays: number;
    futureDays: number;
  };
}

interface SyncSchedulerProps {
  connectionId: string;
}

export function SyncScheduler({ connectionId }: SyncSchedulerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [config, setConfig] = useState<SyncScheduleConfig>({
    enabled: false,
    frequency: 'daily',
    time: '02:00',
    dayOfWeek: 1, // Monday
    dayOfMonth: 1,
    syncMode: 'smart',
    dateRange: {
      pastDays: 90,
      futureDays: 180
    }
  });

  // Fetch existing schedule
  const { data: existingSchedule, isLoading } = useQuery({
    queryKey: ['sync-schedule', connectionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sync_schedules')
        .select('*')
        .eq('connection_id', connectionId)
        .single();

      if (error) {
        console.log('Sync schedule not found:', error);
        // Return null if table doesn't exist or no record found
        return null;
      }

      return data;
    }
  });

  // Update config when data is loaded
  useEffect(() => {
    if (existingSchedule && existingSchedule.config) {
      // Parse the config from Json type
      try {
        const parsedConfig = typeof existingSchedule.config === 'string' 
          ? JSON.parse(existingSchedule.config) 
          : existingSchedule.config;
        setConfig(parsedConfig as SyncScheduleConfig);
      } catch (error) {
        console.error('Failed to parse schedule config:', error);
      }
    }
  }, [existingSchedule]);

  // Save schedule mutation
  const saveSchedule = useMutation({
    mutationFn: async (newConfig: SyncScheduleConfig) => {
      const { error } = await supabase
        .from('sync_schedules')
        .upsert({
          connection_id: connectionId,
          config: newConfig as any, // Cast to Json type
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'connection_id'
        });

      if (error) throw error;

      // If enabled, schedule the next sync
      if (newConfig.enabled) {
        await scheduleNextSync(newConfig);
      }
    },
    onSuccess: () => {
      toast({
        title: "Schedule Saved",
        description: "Your sync schedule has been updated successfully"
      });
      queryClient.invalidateQueries({ queryKey: ['sync-schedule', connectionId] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save schedule",
        variant: "destructive"
      });
    }
  });

  const scheduleNextSync = async (scheduleConfig: SyncScheduleConfig) => {
    // Calculate next sync time
    const now = new Date();
    let nextSync: Date;

    switch (scheduleConfig.frequency) {
      case 'hourly':
        nextSync = new Date(now.getTime() + 60 * 60 * 1000);
        break;
      case 'daily':
        nextSync = new Date(now);
        const [hours, minutes] = scheduleConfig.time!.split(':').map(Number);
        nextSync.setHours(hours, minutes, 0, 0);
        if (nextSync <= now) {
          nextSync.setDate(nextSync.getDate() + 1);
        }
        break;
      case 'weekly':
        nextSync = new Date(now);
        const [weekHours, weekMinutes] = scheduleConfig.time!.split(':').map(Number);
        nextSync.setHours(weekHours, weekMinutes, 0, 0);
        
        // Find next occurrence of the specified day
        const daysUntilNext = (scheduleConfig.dayOfWeek! - now.getDay() + 7) % 7 || 7;
        nextSync.setDate(nextSync.getDate() + daysUntilNext);
        break;
      case 'monthly':
        nextSync = new Date(now);
        const [monthHours, monthMinutes] = scheduleConfig.time!.split(':').map(Number);
        nextSync.setDate(scheduleConfig.dayOfMonth!);
        nextSync.setHours(monthHours, monthMinutes, 0, 0);
        
        if (nextSync <= now) {
          nextSync.setMonth(nextSync.getMonth() + 1);
        }
        break;
    }

    // Create scheduled task
    await supabase.from('scheduled_syncs').insert({
      connection_id: connectionId,
      scheduled_time: nextSync.toISOString(),
      sync_type: scheduleConfig.syncMode,
      status: 'pending'
    });
  };

  const handleSave = () => {
    saveSchedule.mutate(config);
  };

  const getNextSyncTime = () => {
    if (!config.enabled) return null;

    const now = new Date();
    let next: Date;

    switch (config.frequency) {
      case 'hourly':
        next = new Date(now.getTime() + 60 * 60 * 1000);
        break;
      case 'daily':
        next = new Date(now);
        const [hours, minutes] = config.time!.split(':').map(Number);
        next.setHours(hours, minutes, 0, 0);
        if (next <= now) {
          next.setDate(next.getDate() + 1);
        }
        break;
      case 'weekly':
        next = new Date(now);
        const [weekHours, weekMinutes] = config.time!.split(':').map(Number);
        next.setHours(weekHours, weekMinutes, 0, 0);
        
        const daysUntilNext = (config.dayOfWeek! - now.getDay() + 7) % 7 || 7;
        next.setDate(next.getDate() + daysUntilNext);
        break;
      case 'monthly':
        next = new Date(now);
        const [monthHours, monthMinutes] = config.time!.split(':').map(Number);
        next.setDate(config.dayOfMonth!);
        next.setHours(monthHours, monthMinutes, 0, 0);
        
        if (next <= now) {
          next.setMonth(next.getMonth() + 1);
        }
        break;
    }

    return next;
  };

  const nextSync = getNextSyncTime();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Sync Schedule</CardTitle>
            <CardDescription>
              Automatically sync your webinar data on a regular schedule
            </CardDescription>
          </div>
          <Badge variant={config.enabled ? "default" : "secondary"}>
            {config.enabled ? "Active" : "Inactive"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable/Disable Switch */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="schedule-enabled">Enable Scheduled Sync</Label>
            <p className="text-sm text-muted-foreground">
              Run automatic syncs based on your schedule
            </p>
          </div>
          <Switch
            id="schedule-enabled"
            checked={config.enabled}
            onCheckedChange={(checked) => setConfig({ ...config, enabled: checked })}
          />
        </div>

        {config.enabled && (
          <>
            {/* Frequency Selection */}
            <div className="space-y-2">
              <Label>Sync Frequency</Label>
              <Select
                value={config.frequency}
                onValueChange={(value) => setConfig({ ...config, frequency: value as any })}
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

            {/* Time Selection (for non-hourly) */}
            {config.frequency !== 'hourly' && (
              <div className="space-y-2">
                <Label htmlFor="sync-time">
                  <Clock className="inline h-4 w-4 mr-1" />
                  Time
                </Label>
                <Input
                  id="sync-time"
                  type="time"
                  value={config.time}
                  onChange={(e) => setConfig({ ...config, time: e.target.value })}
                />
              </div>
            )}

            {/* Day of Week (for weekly) */}
            {config.frequency === 'weekly' && (
              <div className="space-y-2">
                <Label>Day of Week</Label>
                <Select
                  value={config.dayOfWeek?.toString()}
                  onValueChange={(value) => setConfig({ ...config, dayOfWeek: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Sunday</SelectItem>
                    <SelectItem value="1">Monday</SelectItem>
                    <SelectItem value="2">Tuesday</SelectItem>
                    <SelectItem value="3">Wednesday</SelectItem>
                    <SelectItem value="4">Thursday</SelectItem>
                    <SelectItem value="5">Friday</SelectItem>
                    <SelectItem value="6">Saturday</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Day of Month (for monthly) */}
            {config.frequency === 'monthly' && (
              <div className="space-y-2">
                <Label htmlFor="day-of-month">Day of Month</Label>
                <Input
                  id="day-of-month"
                  type="number"
                  min="1"
                  max="31"
                  value={config.dayOfMonth}
                  onChange={(e) => setConfig({ ...config, dayOfMonth: parseInt(e.target.value) || 1 })}
                />
              </div>
            )}

            {/* Sync Mode */}
            <div className="space-y-2">
              <Label>Sync Mode</Label>
              <Select
                value={config.syncMode}
                onValueChange={(value) => setConfig({ ...config, syncMode: value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="smart">Smart Sync (Recommended)</SelectItem>
                  <SelectItem value="full">Full Sync</SelectItem>
                  <SelectItem value="delta">Delta Sync</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="past-days">Past Days</Label>
                <Input
                  id="past-days"
                  type="number"
                  min="1"
                  max="365"
                  value={config.dateRange.pastDays}
                  onChange={(e) => setConfig({
                    ...config,
                    dateRange: {
                      ...config.dateRange,
                      pastDays: parseInt(e.target.value) || 90
                    }
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="future-days">Future Days</Label>
                <Input
                  id="future-days"
                  type="number"
                  min="1"
                  max="365"
                  value={config.dateRange.futureDays}
                  onChange={(e) => setConfig({
                    ...config,
                    dateRange: {
                      ...config.dateRange,
                      futureDays: parseInt(e.target.value) || 180
                    }
                  })}
                />
              </div>
            </div>

            {/* Next Sync Time */}
            {nextSync && (
              <Alert>
                <Calendar className="h-4 w-4" />
                <AlertDescription>
                  Next sync scheduled for: <strong>{format(nextSync, 'PPpp')}</strong>
                </AlertDescription>
              </Alert>
            )}
          </>
        )}

        {/* Save Button */}
        <Button 
          onClick={handleSave} 
          disabled={saveSchedule.isPending}
          className="w-full"
        >
          <Save className="h-4 w-4 mr-2" />
          {saveSchedule.isPending ? 'Saving...' : 'Save Schedule'}
        </Button>

        {/* Info Alert */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Scheduled syncs run automatically in the background. You'll receive notifications
            about sync status and any issues that may occur.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
