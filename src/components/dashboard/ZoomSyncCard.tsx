
import React from 'react';
import { SyncControlsCard } from '@/components/zoom/sync/SyncControlsCard';
import { ParticipantsSyncCard } from './ParticipantsSyncCard';
import { useSyncOperations } from '@/hooks/sync/useSyncOperations';
import { SyncType } from '@/types/zoom';

interface ZoomSyncCardProps {
  connectionId: string;
}

export const ZoomSyncCard: React.FC<ZoomSyncCardProps> = ({ connectionId }) => {
  const { startSync } = useSyncOperations(connectionId);

  const handleSyncStarted = () => {
    // Optional: Add any additional logic when sync starts
    console.log('Participants sync started');
  };

  const handleGeneralSync = (type: SyncType) => {
    startSync(type);
  };

  return (
    <div className="space-y-4">
      <SyncControlsCard onStartSync={handleGeneralSync} />
      <ParticipantsSyncCard 
        connectionId={connectionId} 
        onSyncStarted={handleSyncStarted}
      />
    </div>
  );
};
