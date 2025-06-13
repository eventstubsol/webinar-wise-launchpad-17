
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ArrowUpDown, Search, MoreHorizontal, Eye, Download } from 'lucide-react';
import { format } from 'date-fns';

interface WebinarTableData {
  id: string;
  topic: string;
  startTime: string;
  duration: number;
  registrants: number;
  attendees: number;
  attendanceRate: number;
  engagementScore: number;
  status: string;
}

interface WebinarAnalyticsTableProps {
  data: WebinarTableData[];
  isLoading?: boolean;
  onViewDetails?: (webinarId: string) => void;
  onExport?: (webinarId: string) => void;
}

type SortField = keyof WebinarTableData;
type SortDirection = 'asc' | 'desc';

export const WebinarAnalyticsTable: React.FC<WebinarAnalyticsTableProps> = ({
  data,
  isLoading,
  onViewDetails,
  onExport,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('startTime');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4" />;
    return (
      <ArrowUpDown 
        className={`h-4 w-4 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} 
      />
    );
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'available':
        return 'default';
      case 'unavailable':
        return 'secondary';
      case 'deleted':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getEngagementBadgeVariant = (score: number) => {
    if (score >= 70) return 'default';
    if (score >= 40) return 'secondary';
    return 'outline';
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  // Filter and sort data
  const filteredData = data
    .filter(item => 
      item.topic.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.status.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      return 0;
    });

  // Pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Webinar Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-10 bg-gray-200 rounded animate-pulse" />
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Webinar Analytics</CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search webinars..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 w-64"
              />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px]">
                  <Button variant="ghost" onClick={() => handleSort('topic')}>
                    Topic {getSortIcon('topic')}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => handleSort('startTime')}>
                    Date {getSortIcon('startTime')}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => handleSort('duration')}>
                    Duration {getSortIcon('duration')}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => handleSort('registrants')}>
                    Registrants {getSortIcon('registrants')}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => handleSort('attendees')}>
                    Attendees {getSortIcon('attendees')}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => handleSort('attendanceRate')}>
                    Rate {getSortIcon('attendanceRate')}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => handleSort('engagementScore')}>
                    Engagement {getSortIcon('engagementScore')}
                  </Button>
                </TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[70px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((webinar) => (
                <TableRow key={webinar.id}>
                  <TableCell className="font-medium">
                    <div className="max-w-[280px] truncate" title={webinar.topic}>
                      {webinar.topic}
                    </div>
                  </TableCell>
                  <TableCell>
                    {webinar.startTime ? format(new Date(webinar.startTime), 'MMM dd, yyyy') : 'N/A'}
                  </TableCell>
                  <TableCell>{formatDuration(webinar.duration)}</TableCell>
                  <TableCell>{webinar.registrants.toLocaleString()}</TableCell>
                  <TableCell>{webinar.attendees.toLocaleString()}</TableCell>
                  <TableCell>{webinar.attendanceRate.toFixed(1)}%</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span>{webinar.engagementScore.toFixed(1)}</span>
                      <Badge variant={getEngagementBadgeVariant(webinar.engagementScore)}>
                        {webinar.engagementScore >= 70 ? 'High' : 
                         webinar.engagementScore >= 40 ? 'Med' : 'Low'}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(webinar.status)}>
                      {webinar.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onViewDetails?.(webinar.id)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onExport?.(webinar.id)}>
                          <Download className="mr-2 h-4 w-4" />
                          Export Data
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredData.length)} of {filteredData.length} results
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
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
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
