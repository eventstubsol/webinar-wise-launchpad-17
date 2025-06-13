
import React from 'react';
import { useSyncProgress } from '@/hooks/useSyncProgress';
import { SyncType } from '@/types/zoom';
import { SyncStatusCard } from './sync/SyncStatusCard';
import { SyncControlsCard } from './sync/SyncControlsCard';
import { SyncErrorDisplay } from './sync/SyncErrorDisplay';
import { SyncHistoryCard } from './sync/SyncHistoryCard';
import { ConnectionAlert } from './sync/ConnectionAlert';

interface SyncProgressIndicatorProps {
  connectionId: string;
  showHistory?: boolean;
  showControls?: boolean;
  compact?: boolean;
}

export const SyncProgressIndicator: React.FC<SyncProgressIndicatorProps> = ({
  connectionId,
  showHistory = false,
  showControls = true,
  compact = false,
}) => {
  const {
    isActive,
    progress,
    status,
    currentOperation,
    processedItems,
    totalItems,
    estimatedTimeRemaining,
    errors,
    startSync,
    cancelSync,
    dismissError,
    syncHistory,
    isConnected,
  } = useSyncProgress(connectionId);

  if (compact && !isActive) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Connection Status */}
      <ConnectionAlert isConnected={isConnected} />

      {/* Active Sync Display */}
      {isActive && (
        <SyncStatusCard
          status={status}
          progress={progress}
          currentOperation={currentOperation}
          processedItems={processedItems}
          totalItems={totalItems}
          estimatedTimeRemaining={estimatedTimeRemaining}
          showControls={showControls}
          onCancel={cancelSync}
        />
      )}

      {/* Sync Controls */}
      {showControls && !isActive && (
        <SyncControlsCard onStartSync={startSync} />
      )}

      {/* Error Display */}
      <SyncErrorDisplay errors={errors} onDismissError={dismissError} />

      {/* Sync History */}
      {showHistory && (
        <SyncHistoryCard syncHistory={syncHistory} />
      )}
    </div>
  );
};

export default SyncProgressIndicator;
