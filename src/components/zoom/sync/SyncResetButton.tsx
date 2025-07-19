
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SyncRecoveryService } from '@/services/zoom/sync/SyncRecoveryService';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface SyncResetButtonProps {
  connectionId: string;
  syncLogId?: string;
  onReset?: () => void;
  variant?: 'reset-all' | 'cancel-current';
}

export const SyncResetButton: React.FC<SyncResetButtonProps> = ({ 
  connectionId, 
  syncLogId,
  onReset,
  variant = 'reset-all'
}) => {
  const [isResetting, setIsResetting] = useState(false);
  const { toast } = useToast();

  const handleReset = async () => {
    setIsResetting(true);
    
    try {
      let result;
      
      if (variant === 'cancel-current' && syncLogId) {
        result = await SyncRecoveryService.cancelStuckSync(syncLogId);
      } else {
        result = await SyncRecoveryService.resetAllActiveSyncs(connectionId);
      }

      if (result.success) {
        toast({
          title: "Sync Reset Successful",
          description: result.message,
        });
        
        if (onReset) {
          onReset();
        }
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Reset failed:', error);
      toast({
        title: "Reset Failed",
        description: error instanceof Error ? error.message : "Failed to reset sync",
        variant: "destructive",
      });
    } finally {
      setIsResetting(false);
    }
  };

  const buttonText = variant === 'cancel-current' ? 'Cancel Sync' : 'Reset All Syncs';
  const dialogTitle = variant === 'cancel-current' ? 'Cancel Current Sync' : 'Reset All Active Syncs';
  const dialogDescription = variant === 'cancel-current' 
    ? 'This will cancel the current stuck sync. You can start a new sync afterwards.'
    : 'This will cancel all active sync operations for your connection. You can start a new sync afterwards.';

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          disabled={isResetting}
        >
          <AlertTriangle className="w-4 h-4 mr-2" />
          {buttonText}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5" />
            {dialogTitle}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {dialogDescription}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleReset}
            disabled={isResetting}
          >
            {isResetting ? 'Resetting...' : 'Reset'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
