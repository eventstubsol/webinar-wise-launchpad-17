
import React from 'react';
import { Badge } from '@/components/ui/badge';

interface WebinarStatusBadgeProps {
  status: string | null;
}

export const WebinarStatusBadge: React.FC<WebinarStatusBadgeProps> = ({ status }) => {
  if (!status) return <Badge variant="secondary">Unknown</Badge>;
  
  switch (status.toLowerCase()) {
    case 'available':
      return <Badge variant="outline">Scheduled</Badge>;
    case 'started':
      return <Badge variant="default" className="bg-green-600">Live</Badge>;
    case 'ended':
      return <Badge variant="secondary">Completed</Badge>;
    case 'aborted':
      return <Badge variant="destructive">Cancelled</Badge>;
    case 'deleted':
      return <Badge variant="destructive">Deleted</Badge>;
    case 'unavailable':
      return <Badge variant="outline" className="text-gray-500">Unavailable</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};
