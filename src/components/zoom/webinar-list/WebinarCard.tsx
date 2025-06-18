
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, Users, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { WebinarStatusBadge } from './WebinarStatusBadge';
import { WebinarCardSyncStatus } from './WebinarCardSyncStatus';

interface WebinarCardProps {
  webinar: any;
  connectionId: string;
  onSyncComplete: () => void;
}

export const WebinarCard: React.FC<WebinarCardProps> = ({ 
  webinar, 
  connectionId, 
  onSyncComplete 
}) => {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-lg">{webinar.topic}</h3>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {webinar.start_time ? (
                      new Date(webinar.start_time).toLocaleDateString()
                    ) : (
                      'No date'
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {webinar.duration || 'Unknown'} min
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    ID: {webinar.webinar_id}
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <WebinarStatusBadge status={webinar.status} />
                {webinar.start_time && (
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(webinar.start_time), { addSuffix: true })}
                  </span>
                )}
              </div>
            </div>
            
            <WebinarCardSyncStatus
              webinar={webinar}
              connectionId={connectionId}
              onSyncComplete={onSyncComplete}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
