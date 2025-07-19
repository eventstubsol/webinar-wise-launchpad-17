
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useZoomSync } from '@/hooks/useZoomSync';
import { useZoomConnection } from '@/hooks/useZoomConnection';
import { SyncType } from '@/types/zoom';

interface ZoomSyncModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const ZoomSyncModal: React.FC<ZoomSyncModalProps> = ({
  open,
  onOpenChange,
  onSuccess
}) => {
  const { connection } = useZoomConnection();
  const { startSync, isSyncing } = useZoomSync(connection);
  const [step, setStep] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [currentOperation, setCurrentOperation] = useState('');

  const handleStartSync = async () => {
    setStep('syncing');
    setProgress(0);
    setCurrentOperation('Starting sync...');
    
    try {
      await startSync(SyncType.INITIAL);
      setStep('success');
      setTimeout(() => {
        onOpenChange(false);
        onSuccess?.();
      }, 2000);
    } catch (error) {
      setStep('error');
    }
  };

  // Simulate progress for demo purposes
  useEffect(() => {
    if (step === 'syncing') {
      const operations = [
        'Connecting to Zoom API...',
        'Fetching webinars...',
        'Processing participants...',
        'Syncing data to database...',
        'Finalizing sync...'
      ];
      
      let currentOp = 0;
      const interval = setInterval(() => {
        if (currentOp < operations.length) {
          setCurrentOperation(operations[currentOp]);
          setProgress((currentOp + 1) * 20);
          currentOp++;
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [step]);

  const handleClose = () => {
    if (step !== 'syncing') {
      setStep('idle');
      setProgress(0);
      setCurrentOperation('');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sync Zoom Data</DialogTitle>
        </DialogHeader>

        {step === 'idle' && (
          <div className="space-y-4">
            <p className="text-center text-gray-600">
              This will fetch all your webinar data from Zoom and sync it to your database.
            </p>
            <Button 
              onClick={handleStartSync}
              className="w-full"
              disabled={isSyncing}
            >
              Start Sync
            </Button>
          </div>
        )}

        {step === 'syncing' && (
          <div className="space-y-4 py-4">
            <div className="flex items-center space-x-3">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
              <span className="text-sm">{currentOperation}</span>
            </div>
            <Progress value={progress} className="w-full" />
            <p className="text-center text-sm text-gray-600">
              {progress}% complete
            </p>
          </div>
        )}

        {step === 'success' && (
          <div className="flex flex-col items-center space-y-4 py-8">
            <CheckCircle className="w-8 h-8 text-green-600" />
            <p className="text-center font-medium">Sync completed successfully!</p>
          </div>
        )}

        {step === 'error' && (
          <div className="flex flex-col items-center space-y-4 py-8">
            <XCircle className="w-8 h-8 text-red-600" />
            <p className="text-center text-red-600">Sync failed. Please try again.</p>
            <Button onClick={() => setStep('idle')} variant="outline">
              Try Again
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
