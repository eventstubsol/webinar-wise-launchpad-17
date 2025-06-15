
import React from 'react';
import { Button } from '@/components/ui/button';
import { Calendar, RefreshCw, Settings } from 'lucide-react';
import { useZoomConnection } from '@/hooks/useZoomConnection';
import { Link } from 'react-router-dom';

interface WebinarEmptyStateProps {
  hasFilters: boolean;
}

export const WebinarEmptyState: React.FC<WebinarEmptyStateProps> = ({ hasFilters }) => {
  const { isConnected } = useZoomConnection();

  if (!isConnected) {
    return (
      <div className="text-center py-12">
        <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Zoom Connection</h3>
        <p className="text-gray-600 mb-6">
          Connect your Zoom account to view and analyze your webinars.
        </p>
        <Button asChild>
          <Link to="/settings">
            <Settings className="w-4 h-4 mr-2" />
            Connect Zoom Account
          </Link>
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
        Go to the Sync Center to import your webinars.
      </p>
      <Button asChild>
        <Link to="/sync-center">
          <RefreshCw className="mr-2 h-4 w-4" /> Go to Sync Center
        </Link>
      </Button>
    </div>
  );
};
