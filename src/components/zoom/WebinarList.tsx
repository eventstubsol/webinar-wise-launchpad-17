
import React, { useState } from 'react';
import { format } from 'date-fns';
import { useWebinars } from '@/hooks/useWebinars';
import { useZoomConnection } from '@/hooks/useZoomConnection';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Search, Calendar, Users, Clock } from 'lucide-react';

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

  const getStatusBadge = (status: string | null) => {
    if (!status) return <Badge variant="secondary">Unknown</Badge>;
    
    switch (status.toLowerCase()) {
      case 'scheduled':
        return <Badge variant="outline">Scheduled</Badge>;
      case 'started':
        return <Badge variant="default">Live</Badge>;
      case 'finished':
        return <Badge variant="secondary">Completed</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return 'N/A';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };

  const formatAttendanceRate = (attendees: number | null, registrants: number | null) => {
    if (!attendees || !registrants || registrants === 0) return 'N/A';
    const rate = ((attendees / registrants) * 100).toFixed(1);
    return `${rate}%`;
  };

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
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search webinars..."
              value={filters.search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filters.status || 'all'} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="started">Live</SelectItem>
              <SelectItem value="finished">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center py-8">
            <LoadingSpinner size="lg" />
          </div>
        )}

        {/* Empty State */}
        {!isLoading && webinars.length === 0 && (
          <div className="text-center py-8">
            <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No webinars found</h3>
            <p className="text-muted-foreground">
              {filters.search || filters.status 
                ? 'No webinars match your current filters.' 
                : 'No webinars have been synced yet.'}
            </p>
          </div>
        )}

        {/* Table */}
        {!isLoading && webinars.length > 0 && (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Topic</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Attendance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {webinars.map((webinar) => (
                    <TableRow key={webinar.id}>
                      <TableCell className="font-medium">
                        <div className="max-w-xs truncate" title={webinar.topic}>
                          {webinar.topic}
                        </div>
                      </TableCell>
                      <TableCell>
                        {webinar.start_time ? (
                          <div className="text-sm">
                            <div>{format(new Date(webinar.start_time), 'MMM dd, yyyy')}</div>
                            <div className="text-muted-foreground">
                              {format(new Date(webinar.start_time), 'h:mm a')}
                            </div>
                          </div>
                        ) : (
                          'N/A'
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDuration(webinar.duration)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {webinar.total_attendees || 0}/{webinar.total_registrants || 0}
                          </div>
                          <div className="text-muted-foreground text-xs">
                            {formatAttendanceRate(webinar.total_attendees, webinar.total_registrants)} rate
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(webinar.status)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(webinar.id)}
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4">
                <div className="text-sm text-muted-foreground">
                  Showing {((currentPage - 1) * limit) + 1} to {Math.min(currentPage * limit, totalCount)} of {totalCount} webinars
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage <= 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage >= totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default WebinarList;
