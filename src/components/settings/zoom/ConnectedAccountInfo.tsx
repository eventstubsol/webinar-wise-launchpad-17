
import React from 'react';
import { ZoomConnection } from '@/types/zoom';
import { formatDistanceToNow } from 'date-fns';

interface ConnectedAccountInfoProps {
  connection: ZoomConnection;
}

export const ConnectedAccountInfo: React.FC<ConnectedAccountInfoProps> = ({
  connection,
}) => {
  return (
    <div className="p-4 border rounded-lg bg-gray-50">
      <h3 className="text-sm font-medium mb-3">Connected Account</h3>
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Email:</span>
          <span className="text-sm font-medium">{connection.zoom_email}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Account Type:</span>
          <span className="text-sm font-medium">{connection.zoom_account_type || 'Unknown'}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Connected:</span>
          <span className="text-sm font-medium">
            {connection.created_at && formatDistanceToNow(new Date(connection.created_at), { addSuffix: true })}
          </span>
        </div>
        {connection.last_sync_at && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Last Sync:</span>
            <span className="text-sm font-medium">
              {formatDistanceToNow(new Date(connection.last_sync_at), { addSuffix: true })}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
