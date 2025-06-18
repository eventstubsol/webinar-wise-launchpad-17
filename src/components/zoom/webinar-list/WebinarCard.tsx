
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Users, MapPin } from 'lucide-react';
import { WebinarCardSyncStatus } from './WebinarCardSyncStatus';
import { WebinarParticipantCount } from './WebinarParticipantCount';

interface WebinarCardProps {
  webinar: any;
  connectionId: string;
  onSyncComplete: () => void;
}

export const WebinarCard: React.FC<WebinarCardProps> = ({
  webinar,
  connectionId,
  onSyncComplete,
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'finished':
        return <Badge variant="secondary">Finished</Badge>;
      case 'available':
      case 'scheduled':
        return <Badge variant="default">Scheduled</Badge>;
      case 'started':
        return <Badge variant="destructive">Live</Badge>;
      default:
        return <Badge variant="outline">{status || 'Unknown'}</Badge>;
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg font-medium line-clamp-2">
            {webinar.topic}
          </CardTitle>
          {getStatusBadge(webinar.status)}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Webinar Details */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>{formatDate(webinar.start_time)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>{formatTime(webinar.start_time)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>{webinar.registrants_count || 0} registered</span>
          </div>
          <WebinarParticipantCount 
            webinarId={webinar.id}
            webinarStatus={webinar.status}
            participantSyncStatus={webinar.participant_sync_status}
          />
        </div>

        {/* Additional Info */}
        {webinar.duration && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{webinar.duration} minutes</span>
          </div>
        )}

        {webinar.timezone && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>{webinar.timezone}</span>
          </div>
        )}

        {/* Agenda Preview */}
        {webinar.agenda && (
          <div className="text-sm text-muted-foreground">
            <p className="line-clamp-2">{webinar.agenda}</p>
          </div>
        )}

        {/* Sync Status */}
        <WebinarCardSyncStatus
          webinar={webinar}
          connectionId={connectionId}
          onSyncComplete={onSyncComplete}
        />
      </CardContent>
    </Card>
  );
};
