
import React from 'react';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Users, Clock } from 'lucide-react';
import { WebinarStatusBadge } from './WebinarStatusBadge';

interface Webinar {
  id: string;
  topic: string;
  start_time: string | null;
  duration: number | null;
  total_attendees: number | null;
  total_registrants: number | null;
  status: string | null;
}

interface WebinarTableProps {
  webinars: Webinar[];
  onViewDetails: (webinarId: string) => void;
}

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

export const WebinarTable: React.FC<WebinarTableProps> = ({ webinars, onViewDetails }) => {
  return (
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
                <WebinarStatusBadge status={webinar.status} />
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onViewDetails(webinar.id)}
                >
                  View Details
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
