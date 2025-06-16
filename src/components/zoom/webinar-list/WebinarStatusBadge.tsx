
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { WebinarStatus } from '@/types/zoom/enums';
import { WebinarStatusDetector } from '@/services/zoom/utils/WebinarStatusDetector';

interface WebinarStatusBadgeProps {
  status: string | WebinarStatus | null;
}

export const WebinarStatusBadge: React.FC<WebinarStatusBadgeProps> = ({ status }) => {
  if (!status) return <Badge variant="secondary">Unknown</Badge>;
  
  // Normalize status to enum value
  let normalizedStatus: WebinarStatus;
  if (Object.values(WebinarStatus).includes(status as WebinarStatus)) {
    normalizedStatus = status as WebinarStatus;
  } else {
    // Map string status to enum
    normalizedStatus = WebinarStatusDetector.mapZoomStatus(status.toString());
  }
  
  // Get user-friendly label
  const label = WebinarStatusDetector.getStatusLabel(normalizedStatus);
  
  switch (normalizedStatus) {
    case WebinarStatus.SCHEDULED:
      return <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">
        {label}
      </Badge>;
    case WebinarStatus.STARTED:
      return <Badge variant="default" className="text-white bg-green-600 hover:bg-green-700">
        {label}
      </Badge>;
    case WebinarStatus.FINISHED:
      return <Badge variant="secondary" className="text-gray-600 bg-gray-100">
        {label}
      </Badge>;
    case WebinarStatus.CANCELLED:
      return <Badge variant="destructive" className="text-red-600 bg-red-50 border-red-200">
        {label}
      </Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};
