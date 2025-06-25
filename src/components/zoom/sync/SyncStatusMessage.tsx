
import React from 'react';
import { CheckCircle, XCircle, Clock, RefreshCw, AlertTriangle } from 'lucide-react';

interface SyncStatusMessageProps {
  status: 'idle' | 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  message?: string;
  webinarCount?: number;
  lastSyncAt?: string;
}

export function SyncStatusMessage({ status, message, webinarCount = 0, lastSyncAt }: SyncStatusMessageProps) {
  const getStatusIcon = () => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'running':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-orange-500" />;
      case 'cancelled':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusMessage = () => {
    switch (status) {
      case 'completed':
        return `Successfully synced ${webinarCount} webinars`;
      case 'failed':
        return message || 'Sync failed';
      case 'running':
        return message || 'Syncing in progress...';
      case 'pending':
        return 'Sync is queued and will start shortly';
      case 'cancelled':
        return 'Sync was cancelled';
      default:
        return 'Ready to sync';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'completed':
        return 'text-green-700 bg-green-50 border-green-200';
      case 'failed':
        return 'text-red-700 bg-red-50 border-red-200';
      case 'running':
        return 'text-blue-700 bg-blue-50 border-blue-200';
      case 'pending':
        return 'text-orange-700 bg-orange-50 border-orange-200';
      case 'cancelled':
        return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      default:
        return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className={`p-3 rounded-lg border ${getStatusColor()}`}>
      <div className="flex items-center gap-2">
        {getStatusIcon()}
        <span className="font-medium">{getStatusMessage()}</span>
      </div>
      {lastSyncAt && status !== 'running' && status !== 'pending' && (
        <div className="text-xs mt-1 opacity-75">
          Last sync: {new Date(lastSyncAt).toLocaleString()}
        </div>
      )}
    </div>
  );
}
