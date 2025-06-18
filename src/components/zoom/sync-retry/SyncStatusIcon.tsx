
import React from 'react';
import { AlertCircle, CheckCircle, RefreshCw, Info } from 'lucide-react';

interface SyncStatusIconProps {
  status: string;
}

export const SyncStatusIcon: React.FC<SyncStatusIconProps> = ({ status }) => {
  switch (status) {
    case 'failed':
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    case 'synced':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'pending':
      return <RefreshCw className="h-4 w-4 text-blue-500" />;
    default:
      return <Info className="h-4 w-4 text-gray-500" />;
  }
};
