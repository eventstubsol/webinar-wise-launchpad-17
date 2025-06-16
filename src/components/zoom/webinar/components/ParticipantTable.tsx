
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronUp, ChevronDown, Users, AlertTriangle, Clock, Mail } from 'lucide-react';
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
    try {
      return format(new Date(timeString), 'MMM dd, h:mm a');
    } catch {
      return 'Invalid Date';
    }
  };

  const formatDuration = (minutes: number) => {
    if (!minutes || minutes <= 0) return '0m';
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

  const getStatusBadge = (participant: any) => {
    if (!participant.status) {
      // If no status but has join_time, assume they attended
      if (participant.join_time) {
        return <Badge variant="default" className="text-green-700 bg-green-100"><Users className="w-3 h-3 mr-1" />Attended</Badge>;
      }
      return <Badge variant="outline">Unknown</Badge>;
    }
    
    switch (participant.status) {
      case 'in_meeting':
        return <Badge variant="default" className="text-green-700 bg-green-100"><Users className="w-3 h-3 mr-1" />In Meeting</Badge>;
      case 'in_waiting_room':
        return <Badge variant="outline" className="text-yellow-700 bg-yellow-100"><Clock className="w-3 h-3 mr-1" />Waiting Room</Badge>;
      default:
        return <Badge variant="outline">{participant.status}</Badge>;
    }
  };

  const getConnectionBadge = (participant: any) => {
    if (participant.failover) {
      return <Badge variant="destructive" className="text-red-700 bg-red-100"><AlertTriangle className="w-3 h-3 mr-1" />Failover</Badge>;
    }
    
    if (participant.internal_user) {
      return <Badge variant="secondary" className="text-blue-700 bg-blue-100">Internal</Badge>;
    }
    
    return null;
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

  if (!participants || participants.length === 0) {
    return (
      <div className="border rounded-lg p-8 text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="p-3 bg-gray-100 rounded-full">
            <Users className="h-8 w-8 text-gray-400" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Participant Data Available</h3>
            <div className="text-sm text-gray-600 space-y-1 max-w-md">
              <p>Participant data is only available for completed webinars.</p>
              {webinar?.start_time && new Date(webinar.start_time) > new Date() && (
                <p className="text-amber-600 font-medium">
                  This webinar is scheduled for {format(new Date(webinar.start_time), 'MMM dd, yyyy at h:mm a')}
                </p>
              )}
              <p className="text-xs text-gray-500 mt-2">
                Note: Zoom API requires 'report:read:list_webinar_participants:admin' scope for participant data.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
            <TableHead>Status</TableHead>
            <TableHead>Engagement</TableHead>
            <TableHead>Activities</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {participants.map((participant, index) => (
            <TableRow key={participant.id || `participant-${index}`}>
              <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                  <span>{participant.participant_name || 'Unknown Participant'}</span>
                  {getConnectionBadge(participant)}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  {participant.participant_email ? (
                    <>
                      <Mail className="w-3 h-3 text-gray-400" />
                      <span className="text-sm">{participant.participant_email}</span>
                    </>
                  ) : (
                    <span className="text-gray-500 text-sm">No email</span>
                  )}
                </div>
              </TableCell>
              <TableCell>{formatTime(participant.join_time)}</TableCell>
              <TableCell>{formatTime(participant.leave_time)}</TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-gray-400" />
                  <span>{formatDuration(participant.duration || 0)}</span>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  {getStatusBadge(participant)}
                </div>
              </TableCell>
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
                  {participant.camera_on_duration > 0 && (
                    <Badge variant="outline" className="text-xs">Camera</Badge>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      
      <div className="p-4 border-t bg-gray-50">
        <div className="text-sm text-gray-600">
          Showing {participants.length} participant{participants.length !== 1 ? 's' : ''}
          {webinar?.total_attendees && (
            <span> • Expected attendees: {webinar.total_attendees}</span>
          )}
        </div>
      </div>
    </div>
  );
};
