
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Users, Video } from 'lucide-react';
import { format } from 'date-fns';

interface WebinarHeaderProps {
  webinar: any;
  analytics: any;
}

export const WebinarHeader: React.FC<WebinarHeaderProps> = ({ webinar, analytics }) => {
  const formatDate = (dateString: string) => {
    if (!dateString) return 'Not specified';
    return format(new Date(dateString), 'MMM dd, yyyy at h:mm a');
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'available':
        return 'bg-green-100 text-green-800';
      case 'ended':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Title and Status */}
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <h1 className="text-2xl font-bold">{webinar.topic}</h1>
              <Badge className={getStatusColor(webinar.status)}>
                {webinar.status || 'Unknown'}
              </Badge>
            </div>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{formatDate(webinar.start_time)}</span>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{webinar.duration || 0} minutes</span>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>{webinar.total_attendees || 0} attendees</span>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Video className="h-4 w-4" />
              <span>Host: {webinar.host_email}</span>
            </div>
          </div>

          {/* Description */}
          {webinar.agenda && (
            <div className="pt-4 border-t">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Description</h3>
              <p className="text-sm">{webinar.agenda}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
