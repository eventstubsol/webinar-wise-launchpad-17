
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useZoomConnection } from '@/hooks/useZoomConnection';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { X, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { ZoomSyncLog, SyncStatus, SyncType } from '@/types/zoom';

interface SyncProgressProps {
  onClose?: () => void;
  autoCloseDelay?: number;
}

interface ActiveSync {
  id: string;
  syncType: SyncType;
  status: SyncStatus;
  totalItems: number;
  processedItems: number;
  resourceType?: string;
  errorMessage?: string;
  startedAt: string;
  isTimedOut?: boolean;
}

export const SyncProgress: React.FC<SyncProgressProps> = ({ 
  onClose, 
  autoCloseDelay = 3000 
}) => {
  const { connection } = useZoomConnection();
  const { toast } = useToast();
  const [activeSync, setActiveSync] = useState<ActiveSync | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const channelRef = useRef<any>(null);

  // Calculate progress percentage
  const getProgressPercentage = useCallback((sync: ActiveSync): number => {
    if (!sync.totalItems || sync.totalItems === 0) return 0;
    return Math.min(100, Math.round((sync.processedItems / sync.totalItems) * 100));
  }, []);

  // Check if sync is timed out (older than 10 minutes)
  const checkSyncTimeout = useCallback((sync: ActiveSync): boolean => {
    const startTime = new Date(sync.startedAt).getTime();
    const now = Date.now();
    const tenMinutes = 10 * 60 * 1000;
    return now - startTime > tenMinutes;
  }, []);

  // Generate user-friendly status message
  const getStatusMessage = useCallback((sync: ActiveSync): string => {
    const { syncType, status, processedItems, totalItems, resourceType } = sync;
    
    if (sync.isTimedOut) {
      return 'Sync appears to have timed out. You can safely retry.';
    }
    
    if (status === SyncStatus.FAILED) {
      return `Sync failed: ${sync.errorMessage || 'Unknown error'}`;
    }
    
    if (status === SyncStatus.COMPLETED) {
      return `Sync completed successfully! Processed ${processedItems} items.`;
    }
    
    if (status === SyncStatus.CANCELLED) {
      return 'Sync was cancelled.';
    }
    
    if (status === SyncStatus.IN_PROGRESS) {
      const operation = resourceType ? `${resourceType}s` : 'items';
      return `Syncing ${operation}: ${processedItems} of ${totalItems}`;
    }
    
    return `Starting ${syncType} sync...`;
  }, []);

  // Get sync type display name
  const getSyncTypeDisplay = useCallback((syncType: SyncType): string => {
    switch (syncType) {
      case SyncType.INITIAL:
        return 'Initial Sync';
      case SyncType.INCREMENTAL:
        return 'Incremental Sync';
      case SyncType.MANUAL:
        return 'Manual Sync';
      case SyncType.WEBHOOK:
        return 'Webhook Sync';
      case SyncType.PARTICIPANTS_ONLY:
        return 'Participants Sync';
      default:
        return 'Sync';
    }
  }, []);

  // Handle retry action
  const handleRetry = useCallback(async () => {
    if (!activeSync) return;
    
    try {
      toast({
        title: "Retry requested",
        description: "Starting a new sync operation...",
      });
      
      handleClose();
    } catch (error) {
      toast({
        title: "Retry failed",
        description: "Could not start a new sync operation.",
        variant: "destructive",
      });
    }
  }, [activeSync, toast]);

  // Handle close with optional auto-close
  const handleClose = useCallback(() => {
    setIsVisible(false);
    setTimeout(() => {
      setActiveSync(null);
      onClose?.();
    }, 300);
  }, [onClose]);

  // Auto-close on successful completion
  useEffect(() => {
    if (activeSync?.status === SyncStatus.COMPLETED && autoCloseDelay > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, autoCloseDelay);
      
      return () => clearTimeout(timer);
    }
  }, [activeSync?.status, autoCloseDelay, handleClose]);

  // Set up real-time subscription with proper cleanup
  useEffect(() => {
    if (!connection?.id) return;

    // Clean up existing channel if it exists
    if (channelRef.current) {
      try {
        supabase.removeChannel(channelRef.current);
      } catch (error) {
        console.warn('Error removing existing channel:', error);
      }
      channelRef.current = null;
    }

    const setupSubscription = () => {
      const channelName = `sync-progress-${connection.id}`;
      channelRef.current = supabase.channel(channelName);

      channelRef.current
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'zoom_sync_logs',
            filter: `connection_id=eq.${connection.id}`,
          },
          (payload: any) => {
            const syncLog = payload.new as ZoomSyncLog;
            
            // Only show active syncs (not completed/failed unless there's an error)
            if (syncLog && (
              syncLog.sync_status === SyncStatus.STARTED ||
              syncLog.sync_status === SyncStatus.IN_PROGRESS ||
              syncLog.sync_status === SyncStatus.FAILED ||
              (syncLog.sync_status === SyncStatus.COMPLETED && payload.eventType === 'UPDATE')
            )) {
              const newActiveSync: ActiveSync = {
                id: syncLog.id,
                syncType: syncLog.sync_type,
                status: syncLog.sync_status,
                totalItems: syncLog.total_items || 0,
                processedItems: syncLog.processed_items || 0,
                resourceType: syncLog.resource_type || undefined,
                errorMessage: syncLog.error_message || undefined,
                startedAt: syncLog.started_at,
                isTimedOut: checkSyncTimeout({
                  id: syncLog.id,
                  syncType: syncLog.sync_type,
                  status: syncLog.sync_status,
                  totalItems: syncLog.total_items || 0,
                  processedItems: syncLog.processed_items || 0,
                  startedAt: syncLog.started_at
                })
              };
              
              setActiveSync(newActiveSync);
              setIsVisible(true);
              
              // Show toast for status changes
              if (payload.eventType === 'UPDATE') {
                if (syncLog.sync_status === SyncStatus.COMPLETED) {
                  toast({
                    title: "Sync completed",
                    description: `Successfully synced ${syncLog.processed_items} items.`,
                  });
                } else if (syncLog.sync_status === SyncStatus.FAILED) {
                  toast({
                    title: "Sync failed",
                    description: syncLog.error_message || "An error occurred during sync.",
                    variant: "destructive",
                  });
                }
              }
            }
            
            // Hide component if sync is completed/cancelled and not showing error
            if (syncLog && (
              syncLog.sync_status === SyncStatus.CANCELLED ||
              (syncLog.sync_status === SyncStatus.COMPLETED && !syncLog.error_message)
            )) {
              if (syncLog.sync_status === SyncStatus.CANCELLED) {
                setIsVisible(false);
                setTimeout(() => setActiveSync(null), 300);
              }
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('Subscribed to sync progress updates');
          } else if (status === 'CHANNEL_ERROR') {
            console.error('Error subscribing to sync progress updates');
            toast({
              title: "Connection error",
              description: "Unable to receive real-time sync updates.",
              variant: "destructive",
            });
          }
        });
    };

    setupSubscription();

    return () => {
      if (channelRef.current) {
        try {
          supabase.removeChannel(channelRef.current);
        } catch (error) {
          console.warn('Error removing channel on cleanup:', error);
        }
        channelRef.current = null;
      }
    };
  }, [connection?.id, toast, checkSyncTimeout]);

  // Don't render if no active sync
  if (!activeSync || !isVisible) {
    return null;
  }

  const progressPercentage = getProgressPercentage(activeSync);
  const statusMessage = getStatusMessage(activeSync);
  const syncTypeDisplay = getSyncTypeDisplay(activeSync.syncType);
  const isError = activeSync.status === SyncStatus.FAILED || activeSync.isTimedOut;
  const isCompleted = activeSync.status === SyncStatus.COMPLETED;
  const isInProgress = activeSync.status === SyncStatus.IN_PROGRESS || activeSync.status === SyncStatus.STARTED;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 max-w-[calc(100vw-2rem)]">
      <Card className={`transition-all duration-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center space-x-2">
              {isError ? (
                <AlertCircle className="h-5 w-5 text-destructive" />
              ) : isCompleted ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              )}
              <h3 className="text-sm font-semibold">{syncTypeDisplay}</h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-3">
            {/* Progress Bar */}
            {isInProgress && !activeSync.isTimedOut && (
              <div className="space-y-2">
                <Progress value={progressPercentage} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{progressPercentage}% complete</span>
                  <span>{activeSync.processedItems} / {activeSync.totalItems}</span>
                </div>
              </div>
            )}

            {/* Status Message */}
            <div className="text-sm">
              {isError ? (
                <Alert variant="destructive">
                  <AlertDescription>{statusMessage}</AlertDescription>
                </Alert>
              ) : (
                <p className={isCompleted ? 'text-green-600' : 'text-muted-foreground'}>
                  {statusMessage}
                </p>
              )}
            </div>

            {/* Actions */}
            {isError && (
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRetry}
                  className="text-xs"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Retry
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SyncProgress;
