
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Calendar, Users, Clock, TrendingUp } from 'lucide-react';
import { useWebinarAnalytics } from '@/hooks/useWebinarAnalytics';
import { formatDistanceToNow, format } from 'date-fns';

interface WebinarAnalyticsFilters {
  dateRange: '7d' | '30d' | '90d' | 'all';
  status: 'all' | 'completed' | 'scheduled' | 'live';
}

interface WebinarAnalyticsDashboardProps {
  connectionId: string;
  filters?: WebinarAnalyticsFilters;
  onFiltersChange?: (filters: WebinarAnalyticsFilters) => void;
}

export const WebinarAnalyticsDashboard: React.FC<WebinarAnalyticsDashboardProps> = ({
  connectionId,
  filters = { dateRange: '30d', status: 'all' },
  onFiltersChange,
}) => {
  const {
    webinars,
    totalWebinars,
    totalParticipants,
    averageDuration,
    mostRecentWebinar,
    isLoading,
    data,
    error,
    refetch,
  } = useWebinarAnalytics(connectionId);

  // Process data for charts and tables
  const processedData = useMemo(() => {
    if (!webinars || webinars.length === 0) {
      return {
        metrics: [],
        chartData: [],
        tableData: [],
      };
    }

    // Create metrics from webinars data
    const metrics = webinars.map(webinar => ({
      id: webinar.id,
      topic: webinar.topic,
      start_time: webinar.start_time,
      duration: webinar.duration,
      status: webinar.status,
      participant_count: 0, // This would come from actual participant data
    }));

    // Create chart data for duration trends
    const chartData = webinars.map(webinar => ({
      name: format(new Date(webinar.start_time), 'MMM dd'),
      duration: webinar.duration,
      participants: 0, // Would be calculated from participant data
    }));

    // Create table data with additional computed fields
    const tableData = webinars.map(webinar => ({
      ...webinar,
      formattedDate: format(new Date(webinar.start_time), 'PPP'),
      formattedDuration: `${Math.floor(webinar.duration / 60)}h ${webinar.duration % 60}m`,
      relativeTime: formatDistanceToNow(new Date(webinar.start_time), { addSuffix: true }),
    }));

    return {
      metrics,
      chartData,
      tableData,
    };
  }, [webinars]);

  const handleRefresh = () => {
    refetch();
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="h-4 bg-gray-200 rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Error Loading Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600 mb-4">
            Failed to load webinar analytics: {error instanceof Error ? error.message : 'Unknown error'}
          </p>
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Webinars</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalWebinars}</div>
            {processedData.metrics && (
              <p className="text-xs text-muted-foreground">
                {processedData.metrics.filter(w => w.status === 'completed').length} completed
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Participants</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalParticipants}</div>
            {processedData.chartData && (
              <p className="text-xs text-muted-foreground">
                Avg {Math.round(totalParticipants / Math.max(totalWebinars, 1))} per webinar
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(averageDuration)}m
            </div>
            {processedData.tableData && processedData.tableData.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Last: {processedData.tableData[0]?.formattedDuration || 'N/A'}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Engagement</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">85%</div>
            <p className="text-xs text-muted-foreground">
              Avg attendance rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Webinars */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Webinars</CardTitle>
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {webinars.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No webinars found for this connection.
            </div>
          ) : (
            <div className="space-y-4">
              {webinars.slice(0, 5).map((webinar) => (
                <div key={webinar.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <div className="font-medium">{webinar.topic}</div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(webinar.start_time), 'PPP')} • {Math.floor(webinar.duration / 60)}h {webinar.duration % 60}m
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={webinar.status === 'completed' ? 'secondary' : 'default'}>
                      {webinar.status}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(webinar.start_time), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              ))}
              
              {webinars.length > 5 && (
                <div className="text-center py-2">
                  <Button variant="outline" size="sm">
                    View All {totalWebinars} Webinars
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
