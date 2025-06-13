
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowUpDown } from 'lucide-react';
import { format } from 'date-fns';
import { EngagementCalculator } from '@/services/zoom/analytics/EngagementCalculator';

interface ParticipantTableProps {
  participants: any[];
  onSort: (field: string) => void;
  sortField: string;
  sortDirection: 'asc' | 'desc';
  webinar: any;
}

export const ParticipantTable: React.FC<ParticipantTableProps> = ({
  participants,
  onSort,
  sortField,
  sortDirection,
  webinar
}) => {
  const formatTime = (timeString: string) => {
    if (!timeString) return 'N/A';
    return format(new Date(timeString), 'h:mm a');
  };

  const formatDuration = (minutes: number) => {
    if (!minutes) return '0m';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const getEngagementBadge = (participant: any) => {
    const engagement = EngagementCalculator.calculateEngagementScore(
      participant, 
      webinar.duration || 0
    );
    
    if (engagement.totalScore >= 70) {
      return <Badge className="bg-green-100 text-green-800">High</Badge>;
    } else if (engagement.totalScore >= 40) {
      return <Badge className="bg-yellow-100 text-yellow-800">Medium</Badge>;
    } else {
      return <Badge className="bg-red-100 text-red-800">Low</Badge>;
    }
  };

  const SortButton: React.FC<{ field: string; children: React.ReactNode }> = ({ field, children }) => (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => onSort(field)}
      className="h-auto p-0 font-medium"
    >
      {children}
      <ArrowUpDown className="ml-2 h-4 w-4" />
    </Button>
  );

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <SortButton field="participant_name">Name</SortButton>
            </TableHead>
            <TableHead>
              <SortButton field="participant_email">Email</SortButton>
            </TableHead>
            <TableHead>
              <SortButton field="join_time">Join Time</SortButton>
            </TableHead>
            <TableHead>
              <SortButton field="duration">Duration</SortButton>
            </TableHead>
            <TableHead>Engagement</TableHead>
            <TableHead>Activities</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {participants.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                No participants found
              </TableCell>
            </TableRow>
          ) : (
            participants.map((participant) => (
              <TableRow key={participant.id}>
                <TableCell className="font-medium">
                  {participant.participant_name || 'Unknown'}
                </TableCell>
                <TableCell>
                  {participant.participant_email || 'N/A'}
                </TableCell>
                <TableCell>
                  {formatTime(participant.join_time)}
                </TableCell>
                <TableCell>
                  {formatDuration(participant.duration || 0)}
                </TableCell>
                <TableCell>
                  {getEngagementBadge(participant)}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 flex-wrap">
                    {participant.answered_polling && (
                      <Badge variant="outline" className="text-xs">Polls</Badge>
                    )}
                    {participant.asked_question && (
                      <Badge variant="outline" className="text-xs">Q&A</Badge>
                    )}
                    {participant.posted_chat && (
                      <Badge variant="outline" className="text-xs">Chat</Badge>
                    )}
                    {participant.raised_hand && (
                      <Badge variant="outline" className="text-xs">Hand</Badge>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};
