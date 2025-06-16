
import React from 'react';
import { Badge } from '@/components/ui/badge';

interface WebinarStatusBadgeProps {
  status: string | null;
}

export const WebinarStatusBadge: React.FC<WebinarStatusBadgeProps> = ({ status }) => {
  if (!status) return <Badge variant="secondary">Unknown</Badge>;
  
  switch (status.toLowerCase()) {
    case 'scheduled':
      return <Badge variant="outline">Scheduled</Badge>;
    case 'started':
      return <Badge variant="default">Live</Badge>;
    case 'finished':
      return <Badge variant="secondary">Completed</Badge>;
    case 'cancelled':
      return <Badge variant="destructive">Cancelled</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};
