
import React, { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWebinarAnalytics } from '@/hooks/useWebinarAnalytics';
import { useZoomConnection } from '@/hooks/useZoomConnection';
import { AnalyticsMetricsCards } from './AnalyticsMetricsCards';
import { AnalyticsCharts } from './AnalyticsCharts';
import { AnalyticsFilters } from './AnalyticsFilters';
import { WebinarAnalyticsTable } from './WebinarAnalyticsTable';

interface WebinarAnalyticsFilters {
  dateRange: { from: Date; to: Date };
  status?: string;
  minAttendees?: number;
  engagementLevel?: 'high' | 'medium' | 'low';
}

export const WebinarAnalyticsDashboard: React.FC = () => {
  const { connection, isConnected, isExpired } = useZoomConnection();
  
  // Initialize filters with last 30 days
  const [filters, setFilters] = useState<WebinarAnalyticsFilters>(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return {
      dateRange: { from: thirtyDaysAgo, to: now },
    };
  });

  const {
    data: analyticsData,
    isLoading,
    error,
    refetch,
  } = useWebinarAnalytics(filters);

  const handleViewDetails = (webinarId: string) => {
    // TODO: Navigate to detailed webinar view
    console.log('View details for webinar:', webinarId);
  };

  const handleExport = (webinarId: string) => {
    // TODO: Export webinar data
    console.log('Export data for webinar:', webinarId);
  };

  // Connection status checks
  if (!isConnected) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {isExpired 
              ? 'Your Zoom connection has expired. Please reconnect to view analytics.'
              : 'No Zoom connection found. Please connect your Zoom account to view analytics.'
            }
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>Failed to load analytics data: {error.message}</span>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Webinar Analytics</h1>
          <p className="text-muted-foreground">
            Comprehensive insights into your webinar performance and audience engagement
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => refetch()}
          disabled={isLoading}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Data
        </Button>
      </div>

      {/* Filters */}
      <AnalyticsFilters
        filters={filters}
        onFiltersChange={setFilters}
        isLoading={isLoading}
      />

      {/* Metrics Cards */}
      <AnalyticsMetricsCards
        metrics={analyticsData?.metrics || {
          totalWebinars: 0,
          totalAttendees: 0,
          averageAttendanceRate: 0,
          averageEngagementScore: 0,
          totalRegistrants: 0,
          periodChange: {
            webinars: 0,
            attendees: 0,
            attendanceRate: 0,
            engagement: 0,
          },
        }}
        isLoading={isLoading}
      />

      {/* Charts */}
      <AnalyticsCharts
        chartData={analyticsData?.chartData || {
          attendanceTrends: [],
          engagementDistribution: [],
          geographicData: [],
          deviceData: [],
        }}
        isLoading={isLoading}
      />

      {/* Webinars Table */}
      <WebinarAnalyticsTable
        data={analyticsData?.tableData || []}
        isLoading={isLoading}
        onViewDetails={handleViewDetails}
        onExport={handleExport}
      />

      {/* Empty State */}
      {!isLoading && analyticsData?.tableData.length === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No webinars found for the selected criteria. Try adjusting your filters or date range.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default WebinarAnalyticsDashboard;
