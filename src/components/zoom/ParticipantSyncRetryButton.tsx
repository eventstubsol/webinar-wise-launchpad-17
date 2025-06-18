
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, Users } from 'lucide-react';
import { useSyncAnalysis } from './sync-retry/useSyncAnalysis';
import { useSyncExecution } from './sync-retry/useSyncExecution';
import { SyncStrategyDialog } from './sync-retry/SyncStrategyDialog';
import type { SyncStrategy } from './sync-retry/types';

export const ParticipantSyncRetryButton: React.FC = () => {
  const [syncStrategy, setSyncStrategy] = useState<SyncStrategy | null>(null);
  const [showStrategyDialog, setShowStrategyDialog] = useState(false);
  
  const { isAnalyzing, analyzeSyncOptions } = useSyncAnalysis();
  const { isSyncing, executeSync } = useSyncExecution();

  const handleAnalyzeAndShow = async () => {
    const strategy = await analyzeSyncOptions();
    if (strategy) {
      setSyncStrategy(strategy);
      setShowStrategyDialog(true);
    }
  };

  const handleExecuteSync = async (strategy: SyncStrategy) => {
    setShowStrategyDialog(false);
    await executeSync(strategy);
    setSyncStrategy(null);
  };

  return (
    <>
      <Button
        onClick={handleAnalyzeAndShow}
        disabled={isAnalyzing || isSyncing}
        className="mb-4"
      >
        <RefreshCw className={`h-4 w-4 mr-2 ${isAnalyzing ? 'animate-spin' : ''}`} />
        <Users className="h-4 w-4 mr-2" />
        {isAnalyzing ? 'Analyzing...' : 'Smart Participant Sync'}
      </Button>
      
      <SyncStrategyDialog
        open={showStrategyDialog}
        onOpenChange={setShowStrategyDialog}
        strategy={syncStrategy}
        isSyncing={isSyncing}
        onExecuteSync={handleExecuteSync}
      />
    </>
  );
};
