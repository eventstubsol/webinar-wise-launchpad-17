
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RotateCcw, X } from 'lucide-react';
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
  variant?: 'reset-all' | 'cancel-current' | 'force-cancel';
  disabled?: boolean;
  size?: 'sm' | 'default';
}

export const SyncResetButton: React.FC<SyncResetButtonProps> = ({ 
  connectionId, 
  syncLogId,
  onReset,
  variant = 'reset-all',
  disabled = false,
  size = 'sm'
}) => {
  const [isResetting, setIsResetting] = useState(false);
  const { toast } = useToast();

  const handleReset = async () => {
    setIsResetting(true);
    
    try {
      let result;
      
      if (variant === 'cancel-current' && syncLogId) {
        result = await SyncRecoveryService.cancelStuckSync(syncLogId);
      } else if (variant === 'force-cancel') {
        result = await SyncRecoveryService.forceCancelCurrentSync(connectionId);
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

  const getButtonConfig = () => {
    switch (variant) {
      case 'cancel-current':
        return {
          text: 'Cancel Sync',
          title: 'Cancel Current Sync',
          description: 'This will cancel the current stuck sync. You can start a new sync afterwards.',
          icon: X,
          variant: 'outline' as const
        };
      case 'force-cancel':
        return {
          text: 'Force Cancel',
          title: 'Force Cancel Sync',
          description: 'This will immediately cancel the current sync operation.',
          icon: X,
          variant: 'destructive' as const
        };
      default:
        return {
          text: 'Reset All Syncs',
          title: 'Reset All Active Syncs',
          description: 'This will cancel all active sync operations for your connection. You can start a new sync afterwards.',
          icon: RotateCcw,
          variant: 'outline' as const
        };
    }
  };

  const config = getButtonConfig();
  const IconComponent = config.icon;

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button 
          variant={config.variant}
          size={size}
          disabled={isResetting || disabled}
        >
          <IconComponent className="w-4 h-4 mr-2" />
          {config.text}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            {config.title}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {config.description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleReset}
            disabled={isResetting}
          >
            {isResetting ? 'Processing...' : 'Confirm'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
