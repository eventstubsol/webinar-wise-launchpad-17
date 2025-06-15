
import React from 'react';
import { Button } from '@/components/ui/button';
import { Calendar, RefreshCw, Settings } from 'lucide-react';
import { useZoomConnection } from '@/hooks/useZoomConnection';
import { SyncWebinarsButton } from '@/components/zoom/sync/SyncWebinarsButton';

interface WebinarEmptyStateProps {
  hasFilters: boolean;
}

export const WebinarEmptyState: React.FC<WebinarEmptyStateProps> = ({ hasFilters }) => {
  const { connection, isConnected } = useZoomConnection();

  if (!isConnected) {
    return (
      <div className="text-center py-12">
        <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Zoom Connection</h3>
        <p className="text-gray-600 mb-6">
          Connect your Zoom account to view and analyze your webinars.
        </p>
        <Button>
          <Settings className="w-4 h-4 mr-2" />
          Connect Zoom Account
        </Button>
      </div>
    );
  }

  if (hasFilters) {
    return (
      <div className="text-center py-12">
        <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Webinars Found</h3>
        <p className="text-gray-600 mb-6">
          No webinars match your current filters. Try adjusting your search criteria.
        </p>
      </div>
    );
  }

  return (
    <div className="text-center py-12">
      <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">No Webinar Data</h3>
      <p className="text-gray-600 mb-6">
        Your Zoom account is connected, but we haven't synced your webinar data yet. 
        Click the button below to import your webinars.
      </p>
      <SyncWebinarsButton 
        connectionId={connection?.id}
        variant="default"
        size="default"
      />
    </div>
  );
};
