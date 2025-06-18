
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Users, AlertTriangle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface WebinarParticipantCountProps {
  webinarId: string;
  webinarStatus: string;
  participantSyncStatus: string;
}

export const WebinarParticipantCount: React.FC<WebinarParticipantCountProps> = ({
  webinarId,
  webinarStatus,
  participantSyncStatus
}) => {
  const { data: participantCount, isLoading } = useQuery({
    queryKey: ['participant-count', webinarId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('zoom_participants')
        .select('id', { count: 'exact' })
        .eq('webinar_id', webinarId);
      
      if (error) throw error;
      return count || 0;
    },
    enabled: !!webinarId && participantSyncStatus === 'synced',
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Users className="h-3 w-3" />
        <span>Loading...</span>
      </div>
    );
  }

  // Show warning for finished webinars with no participants
  const isFinished = webinarStatus === 'finished';
  const hasNoParticipants = participantCount === 0;
  const shouldShowWarning = isFinished && hasNoParticipants && participantSyncStatus === 'synced';

  return (
    <div className="flex items-center gap-1">
      <Users className={`h-3 w-3 ${shouldShowWarning ? 'text-amber-500' : 'text-muted-foreground'}`} />
      <span className={`text-xs ${shouldShowWarning ? 'text-amber-600' : 'text-muted-foreground'}`}>
        {participantCount || 0} participants
      </span>
      {shouldShowWarning && (
        <AlertTriangle className="h-3 w-3 text-amber-500" />
      )}
    </div>
  );
};
