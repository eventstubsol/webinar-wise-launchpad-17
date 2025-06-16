
import React from 'react';
import { useEnhancedSyncProgress } from '@/hooks/sync/useEnhancedSyncProgress';
import { SyncType } from '@/types/zoom';
import { EnhancedSyncStatusCard } from './sync/EnhancedSyncStatusCard';
import { SyncControlsCard } from './sync/SyncControlsCard';
import { SyncErrorDisplay } from './sync/SyncErrorDisplay';
import { SyncHistoryCard } from './sync/SyncHistoryCard';
import { ConnectionAlert } from './sync/ConnectionAlert';

interface EnhancedSyncProgressIndicatorProps {
  connectionId: string;
  showHistory?: boolean;
  showControls?: boolean;
  compact?: boolean;
}

export const EnhancedSyncProgressIndicator: React.FC<EnhancedSyncProgressIndicatorProps> = ({
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
    estimatedTimeRemaining,
    syncHealth,
    lastUpdated,
    startSync,
    cancelSync,
    retrySync,
    forceCleanup,
    syncHistory,
  } = useEnhancedSyncProgress(connectionId);

  if (compact && !isActive && !syncHealth?.hasStuckSyncs) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Connection Status */}
      <ConnectionAlert isConnected={!!connectionId} />

      {/* Enhanced Sync Status */}
      <EnhancedSyncStatusCard
        isActive={isActive}
        status={status}
        progress={progress}
        currentOperation={currentOperation}
        syncHealth={syncHealth}
        estimatedTimeRemaining={estimatedTimeRemaining}
        lastUpdated={lastUpdated}
        onCancel={cancelSync}
        onRetry={retrySync}
        onForceCleanup={forceCleanup}
      />

      {/* Sync Controls */}
      {showControls && !isActive && (
        <SyncControlsCard onStartSync={startSync} />
      )}

      {/* Sync History */}
      {showHistory && syncHistory.length > 0 && (
        <SyncHistoryCard syncHistory={syncHistory} />
      )}
    </div>
  );
};

export default EnhancedSyncProgressIndicator;
