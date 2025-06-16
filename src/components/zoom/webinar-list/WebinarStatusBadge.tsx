
import React from 'react';
import { Badge } from '@/components/ui/badge';

interface WebinarStatusBadgeProps {
  status: string | null;
}

export const WebinarStatusBadge: React.FC<WebinarStatusBadgeProps> = ({ status }) => {
  if (!status) return <Badge variant="secondary">Unknown</Badge>;
  
  // Enhanced status mapping with more specific labels
  switch (status.toLowerCase()) {
    case 'available':
      return <Badge variant="outline" className="border-blue-300 text-blue-700">Scheduled</Badge>;
    case 'started':
      return <Badge variant="default" className="bg-green-600 hover:bg-green-700">Live</Badge>;
    case 'ended':
      return <Badge variant="secondary" className="bg-gray-100 text-gray-700">Completed</Badge>;
    case 'aborted':
      return <Badge variant="destructive">Cancelled</Badge>;
    case 'deleted':
      return <Badge variant="destructive" className="bg-red-100 text-red-700">Deleted</Badge>;
    case 'unavailable':
      return <Badge variant="outline" className="text-gray-500 border-gray-300">Unavailable</Badge>;
    default:
      // Fallback for any other status values
      const capitalizedStatus = status.charAt(0).toUpperCase() + status.slice(1);
      return <Badge variant="secondary">{capitalizedStatus}</Badge>;
  }
};
