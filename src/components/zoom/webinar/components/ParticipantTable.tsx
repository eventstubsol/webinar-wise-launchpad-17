
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';

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
    return format(new Date(timeString), 'MMM dd, h:mm a');
  };

  const formatDuration = (minutes: number) => {
    if (!minutes) return '0m';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const getEngagementBadge = (participant: any) => {
    const activities = [];
    if (participant.answered_polling) activities.push('Polls');
    if (participant.asked_question) activities.push('Q&A');
    if (participant.posted_chat) activities.push('Chat');
    if (participant.raised_hand) activities.push('Hand');

    if (activities.length === 0) return <Badge variant="secondary">Low</Badge>;
    if (activities.length >= 3) return <Badge variant="default">High</Badge>;
    return <Badge variant="outline">Medium</Badge>;
  };

  const SortHeader = ({ field, children }: { field: string; children: React.ReactNode }) => (
    <TableHead 
      className="cursor-pointer hover:bg-gray-50" 
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortField === field && (
          sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
        )}
      </div>
    </TableHead>
  );

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <SortHeader field="participant_name">Name</SortHeader>
            <SortHeader field="participant_email">Email</SortHeader>
            <SortHeader field="join_time">Join Time</SortHeader>
            <SortHeader field="leave_time">Leave Time</SortHeader>
            <SortHeader field="duration">Duration</SortHeader>
            <TableHead>Engagement</TableHead>
            <TableHead>Activities</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {participants.map((participant) => (
            <TableRow key={participant.id}>
              <TableCell className="font-medium">
                {participant.participant_name || 'Unknown'}
              </TableCell>
              <TableCell>{participant.participant_email || 'N/A'}</TableCell>
              <TableCell>{formatTime(participant.join_time)}</TableCell>
              <TableCell>{formatTime(participant.leave_time)}</TableCell>
              <TableCell>{formatDuration(participant.duration || 0)}</TableCell>
              <TableCell>{getEngagementBadge(participant)}</TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
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
          ))}
        </TableBody>
      </Table>
      
      {participants.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No participants found
        </div>
      )}
    </div>
  );
};
