
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { WebinarStatusBadge } from './WebinarStatusBadge';
import { Eye, Calendar, Users } from 'lucide-react';
import { format } from 'date-fns';

interface WebinarTableProps {
  webinars: any[];
  onViewDetails: (webinarId: string) => void;
}

export const WebinarTable: React.FC<WebinarTableProps> = ({ webinars, onViewDetails }) => {
  const navigate = useNavigate();

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return format(new Date(dateString), 'MMM dd, yyyy');
  };

  const formatTime = (dateString: string) => {
    if (!dateString) return 'N/A';
    return format(new Date(dateString), 'h:mm a');
  };

  const handleViewDetails = (webinarId: string) => {
    navigate(`/webinars/${webinarId}`);
  };

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Webinar</TableHead>
            <TableHead>Date & Time</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Attendees</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {webinars.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                No webinars found
              </TableCell>
            </TableRow>
          ) : (
            webinars.map((webinar) => (
              <TableRow key={webinar.id}>
                <TableCell className="font-medium">
                  <div>
                    <div className="font-medium">{webinar.topic}</div>
                    {webinar.agenda && (
                      <div className="text-sm text-muted-foreground truncate max-w-xs">
                        {webinar.agenda}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div>{formatDate(webinar.start_time)}</div>
                      <div className="text-muted-foreground">{formatTime(webinar.start_time)}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {webinar.duration ? `${webinar.duration} min` : 'N/A'}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>{webinar.total_attendees || 0}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <WebinarStatusBadge status={webinar.status} />
                </TableCell>
                <TableCell>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewDetails(webinar.id)}
                    className="flex items-center gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    View Details
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};
