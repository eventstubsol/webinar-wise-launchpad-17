
import React, { useState } from 'react';
import { useWebinars } from '@/hooks/useWebinars';
import { useZoomConnection } from '@/hooks/useZoomConnection';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar } from 'lucide-react';
import { WebinarFilters } from './webinar-list/WebinarFilters';
import { WebinarTable } from './webinar-list/WebinarTable';
import { WebinarPagination } from './webinar-list/WebinarPagination';
import { WebinarEmptyState } from './webinar-list/WebinarEmptyState';

interface WebinarFilters {
  search: string;
  status: string;
}

const WebinarList: React.FC = () => {
  const { connection, isConnected } = useZoomConnection();
  const [filters, setFilters] = useState<WebinarFilters>({
    search: '',
    status: '',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const limit = 10;

  const { webinars, totalCount, isLoading, error, refetch } = useWebinars({
    filters,
    page: currentPage,
    limit,
  });

  const totalPages = Math.ceil(totalCount / limit);
  const hasFilters = Boolean(filters.search || filters.status);

  const handleSearchChange = (value: string) => {
    setFilters(prev => ({ ...prev, search: value }));
    setCurrentPage(1);
  };

  const handleStatusChange = (value: string) => {
    setFilters(prev => ({ ...prev, status: value === 'all' ? '' : value }));
    setCurrentPage(1);
  };

  const handleViewDetails = (webinarId: string) => {
    // TODO: Navigate to webinar details page
    console.log('View details for webinar:', webinarId);
  };

  if (!isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Webinar List</CardTitle>
          <CardDescription>Connect your Zoom account to view webinars</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>
              Please connect your Zoom account in the settings to view your webinars.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Webinar List</CardTitle>
          <CardDescription>Error loading webinars</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>
              Failed to load webinars: {error.message}
              <Button variant="outline" size="sm" onClick={() => refetch()} className="ml-2">
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Webinar List
        </CardTitle>
        <CardDescription>
          Manage and view your Zoom webinars
        </CardDescription>
      </CardHeader>
      <CardContent>
        <WebinarFilters
          searchValue={filters.search}
          statusValue={filters.status}
          onSearchChange={handleSearchChange}
          onStatusChange={handleStatusChange}
        />

        {isLoading && (
          <div className="flex justify-center py-8">
            <LoadingSpinner size="lg" />
          </div>
        )}

        {!isLoading && webinars.length === 0 && (
          <WebinarEmptyState hasFilters={hasFilters} />
        )}

        {!isLoading && webinars.length > 0 && (
          <>
            <WebinarTable 
              webinars={webinars}
              onViewDetails={handleViewDetails}
            />
            <WebinarPagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalCount={totalCount}
              limit={limit}
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default WebinarList;
