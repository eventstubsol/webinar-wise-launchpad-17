
import React from 'react';
import { WebinarParticipantSyncButton } from './WebinarParticipantSyncButton';

interface WebinarCardSyncStatusProps {
  webinar: any;
  connectionId: string;
  onSyncComplete: () => void;
}

export const WebinarCardSyncStatus: React.FC<WebinarCardSyncStatusProps> = ({
  webinar,
  connectionId,
  onSyncComplete,
}) => {
  return (
    <div className="pt-2 border-t">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">
          Participant Sync:
        </span>
        <WebinarParticipantSyncButton
          webinar={{
            id: webinar.id,
            webinar_id: webinar.webinar_id,
            title: webinar.topic,
            status: webinar.status || '',
            participant_sync_status: webinar.participant_sync_status || '',
            participant_sync_error: webinar.participant_sync_error || '',
            participant_sync_attempted_at: webinar.participant_sync_attempted_at || ''
          }}
          connectionId={connectionId}
          onSyncComplete={onSyncComplete}
        />
      </div>
      {webinar.participant_sync_error && (
        <p className="text-xs text-destructive mt-1">
          {webinar.participant_sync_error}
        </p>
      )}
    </div>
  );
};
