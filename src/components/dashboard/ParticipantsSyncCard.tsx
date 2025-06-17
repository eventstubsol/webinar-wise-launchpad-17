
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Play, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { SyncType } from '@/types/zoom';

interface ParticipantsSyncCardProps {
  connectionId: string;
  onSyncStarted?: () => void;
}

export const ParticipantsSyncCard: React.FC<ParticipantsSyncCardProps> = ({
  connectionId,
  onSyncStarted
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'running' | 'completed' | 'error'>('idle');
  const { toast } = useToast();

  const handleParticipantsSync = async () => {
    if (!connectionId) {
      toast({
        title: "No Connection",
        description: "Please connect your Zoom account first.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setSyncStatus('running');

    try {
      const response = await supabase.functions.invoke('zoom-sync-webinars', {
        body: {
          connectionId,
          syncType: SyncType.PARTICIPANTS_ONLY,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to start participants sync');
      }

      setSyncStatus('completed');
      toast({
        title: "Participants Sync Started",
        description: "Participant data sync has been initiated successfully.",
      });
      
      onSyncStarted?.();
    } catch (error) {
      setSyncStatus('error');
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      toast({
        title: "Sync Failed to Start",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = () => {
    switch (syncStatus) {
      case 'running':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-600" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Users className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusText = () => {
    switch (syncStatus) {
      case 'running':
        return 'Syncing participants...';
      case 'completed':
        return 'Participants sync completed';
      case 'error':
        return 'Sync failed';
      default:
        return 'Sync participant data only';
    }
  };

  return (
    <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          {getStatusIcon()}
          Participants Data Sync
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-gray-600">
          Fetch participant reports for all your existing webinars without affecting webinar or registrant data.
        </p>
        
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">{getStatusText()}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleParticipantsSync}
            disabled={isLoading || syncStatus === 'running'}
            className="bg-white hover:bg-purple-50 border-purple-200"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            {isLoading ? 'Starting...' : 'Sync Participants'}
          </Button>
        </div>

        {syncStatus === 'completed' && (
          <div className="text-xs text-green-700 bg-green-50 p-2 rounded border border-green-200">
            ✓ Participant data sync initiated. Check sync status for progress.
          </div>
        )}
        
        {syncStatus === 'error' && (
          <div className="text-xs text-red-700 bg-red-50 p-2 rounded border border-red-200">
            ✗ Failed to start sync. Please try again or check your connection.
          </div>
        )}
      </CardContent>
    </Card>
  );
};
