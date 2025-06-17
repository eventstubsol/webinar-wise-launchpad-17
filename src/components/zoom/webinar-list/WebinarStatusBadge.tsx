
import React from 'react';
import { Badge } from '@/components/ui/badge';

interface WebinarStatusBadgeProps {
  status: string | null;
}

export const WebinarStatusBadge: React.FC<WebinarStatusBadgeProps> = ({ status }) => {
  if (!status) return <Badge variant="secondary">Unknown</Badge>;
  
  switch (status.toLowerCase()) {
    case 'upcoming':
    case 'scheduled':
      return <Badge variant="outline">Upcoming</Badge>;
    case 'live':
    case 'started':
      return <Badge variant="default">Live</Badge>;
    case 'completed':
    case 'finished':
    case 'ended':
      return <Badge variant="secondary">Completed</Badge>;
    case 'cancelled':
    case 'deleted':
      return <Badge variant="destructive">Cancelled</Badge>;
    case 'available':
      return <Badge variant="outline">Available</Badge>;
    case 'unavailable':
      return <Badge variant="destructive">Unavailable</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};
