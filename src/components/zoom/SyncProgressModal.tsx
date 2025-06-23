import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertCircle, CheckCircle, Clock, Loader2, Pause, Play, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { RealtimeChannel } from "@supabase/supabase-js";
import { useToast } from "@/components/ui/use-toast";

interface SyncProgressModalProps {
  syncId: string;
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

interface ProgressUpdate {
  id: string;
  update_type: 'status' | 'progress' | 'webinar' | 'error' | 'info';
  message: string;
  details?: any;
  progress_percentage?: number;
  created_at: string;
}

interface SyncProgress {
  status: 'running' | 'paused' | 'completed' | 'failed';
  percentage: number;
  currentWebinar: string;
  processedCount: number;
  totalCount: number;
  estimatedTimeRemaining: number;
}

export function SyncProgressModal({ syncId, isOpen, onClose, onComplete }: SyncProgressModalProps) {
  const [progress, setProgress] = useState<SyncProgress>({
    status: 'running',
    percentage: 0,
    currentWebinar: '',
    processedCount: 0,
    totalCount: 0,
    estimatedTimeRemaining: 0
  });
  const [updates, setUpdates] = useState<ProgressUpdate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const { toast } = useToast();

  // Fetch initial progress
  useEffect(() => {
    if (!isOpen || !syncId) return;

    fetchProgress();
    const interval = setInterval(fetchProgress, 5000); // Poll every 5 seconds

    return () => clearInterval(interval);
  }, [syncId, isOpen]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!isOpen || !syncId) return;

    // Subscribe to progress updates
    channelRef.current = supabase
      .channel(`sync-progress-${syncId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'sync_progress_updates',
        filter: `sync_id=eq.${syncId}`
      }, (payload) => {
        const update = payload.new as ProgressUpdate;
        
        // Add to updates list
        setUpdates(prev => [update, ...prev.slice(0, 49)]); // Keep last 50 updates
        
        // Update progress if percentage is provided
        if (update.progress_percentage !== undefined) {
          setProgress(prev => ({
            ...prev,
            percentage: update.progress_percentage!
          }));
        }
        
        // Update status based on update type
        if (update.update_type === 'status') {
          if (update.message.includes('completed')) {
            setProgress(prev => ({ ...prev, status: 'completed', percentage: 100 }));
            onComplete();
          } else if (update.message.includes('failed')) {
            setProgress(prev => ({ ...prev, status: 'failed' }));
          }
        }
        
        // Update current webinar
        if (update.update_type === 'webinar' && update.details?.webinar_id) {
          setProgress(prev => ({
            ...prev,
            currentWebinar: update.message,
            processedCount: prev.processedCount + 1
          }));
        }
      })
      .subscribe();

    return () => {
      channelRef.current?.unsubscribe();
    };
  }, [syncId, isOpen, onComplete]);

  const fetchProgress = async () => {
    try {
      const response = await supabase.functions.invoke('zoom-sync-progress', {
        body: { syncId }
      });

      if (response.error) throw response.error;

      const data = response.data;
      setProgress({
        status: data.status,
        percentage: data.progress.percentage,
        currentWebinar: data.progress.currentWebinar,
        processedCount: data.progress.processedCount,
        totalCount: data.progress.totalCount,
        estimatedTimeRemaining: data.progress.estimatedTimeRemaining
      });

      // Set initial updates if empty
      if (updates.length === 0 && data.messages) {
        setUpdates(data.messages.map((msg: any, index: number) => ({
          id: `msg-${index}`,
          update_type: msg.type,
          message: msg.message,
          created_at: msg.timestamp
        })));
      }

      setIsLoading(false);
    } catch (error) {
      console.error('Failed to fetch progress:', error);
      toast({
        title: "Error",
        description: "Failed to fetch sync progress",
        variant: "destructive"
      });
    }
  };

  const handlePause = async () => {
    // TODO: Implement pause functionality
    toast({
      title: "Coming Soon",
      description: "Pause functionality will be available soon",
    });
  };

  const handleResume = async () => {
    // TODO: Implement resume functionality
    toast({
      title: "Coming Soon",
      description: "Resume functionality will be available soon",
    });
  };

  const handleCancel = async () => {
    // TODO: Implement cancel functionality
    const confirmed = window.confirm("Are you sure you want to cancel this sync?");
    if (confirmed) {
      toast({
        title: "Coming Soon",
        description: "Cancel functionality will be available soon",
      });
    }
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  const getStatusIcon = () => {
    switch (progress.status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'paused':
        return <Pause className="h-5 w-5 text-yellow-500" />;
      default:
        return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
    }
  };

  const getUpdateIcon = (type: string) => {
    switch (type) {
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'webinar':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'info':
        return <Clock className="h-4 w-4 text-blue-500" />;
      default:
        return <Loader2 className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getStatusIcon()}
            Zoom Sync Progress
          </DialogTitle>
          <DialogDescription>
            {progress.status === 'running' && "Syncing your webinar data from Zoom..."}
            {progress.status === 'completed' && "Sync completed successfully!"}
            {progress.status === 'failed' && "Sync failed. Please check the error messages below."}
            {progress.status === 'paused' && "Sync is paused. Click resume to continue."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{progress.processedCount} of {progress.totalCount} webinars</span>
              <span>{Math.round(progress.percentage)}%</span>
            </div>
            <Progress value={progress.percentage} className="h-3" />
            {progress.estimatedTimeRemaining > 0 && (
              <p className="text-sm text-muted-foreground">
                Estimated time remaining: {formatTime(progress.estimatedTimeRemaining)}
              </p>
            )}
          </div>

          {/* Current Processing */}
          {progress.currentWebinar && progress.status === 'running' && (
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm font-medium">Currently processing:</p>
                <p className="text-sm text-muted-foreground truncate">{progress.currentWebinar}</p>
              </CardContent>
            </Card>
          )}

          {/* Progress Updates */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Activity Log</h4>
            <ScrollArea className="h-48 rounded-md border p-4">
              <div className="space-y-2">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : updates.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No updates yet...
                  </p>
                ) : (
                  updates.map((update) => (
                    <div key={update.id} className="flex items-start gap-2 text-sm">
                      {getUpdateIcon(update.update_type)}
                      <div className="flex-1">
                        <p className={update.update_type === 'error' ? 'text-red-600' : ''}>
                          {update.message}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(update.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            {progress.status === 'running' && (
              <>
                <Button variant="outline" size="sm" onClick={handlePause}>
                  <Pause className="h-4 w-4 mr-1" />
                  Pause
                </Button>
                <Button variant="destructive" size="sm" onClick={handleCancel}>
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
              </>
            )}
            {progress.status === 'paused' && (
              <Button variant="default" size="sm" onClick={handleResume}>
                <Play className="h-4 w-4 mr-1" />
                Resume
              </Button>
            )}
            {(progress.status === 'completed' || progress.status === 'failed') && (
              <Button variant="default" size="sm" onClick={onClose}>
                Close
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
