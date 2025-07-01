
import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { X, AlertCircle } from 'lucide-react';
import { SyncError } from '@/hooks/sync/types';

interface SyncErrorDisplayProps {
  errors: SyncError[];
  onDismissError: (errorId: string) => void;
}

export const SyncErrorDisplay: React.FC<SyncErrorDisplayProps> = ({
  errors,
  onDismissError,
}) => {
  if (errors.length === 0) return null;

  return (
    <div className="space-y-2">
      {errors.map((error) => (
        <Alert key={error.id} variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex justify-between items-start">
            <span>{error.message}</span>
            {error.dismissible && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDismissError(error.id)}
                className="h-auto p-1 ml-2"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
};
