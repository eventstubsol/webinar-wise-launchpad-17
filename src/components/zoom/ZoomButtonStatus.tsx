
import React from 'react';
import { ZoomConnection } from '@/types/zoom';
import { ZoomConnectionService } from '@/services/zoom/ZoomConnectionService';
import { ZoomCredentials } from '@/types/zoomCredentials';

interface ZoomButtonStatusProps {
  connection: ZoomConnection | null;
  credentials: ZoomCredentials | null;
}

export const ZoomButtonStatus: React.FC<ZoomButtonStatusProps> = ({
  connection,
  credentials,
}) => {
  if (connection && !ZoomConnectionService.isTokenExpired(connection.token_expires_at)) {
    return (
      <div className="text-xs text-muted-foreground">
        Validated for: {connection.zoom_email}
      </div>
    );
  }
  
  if (!credentials && !connection) {
    return (
      <div className="text-xs text-muted-foreground">
        Configure OAuth credentials to enable validation
      </div>
    );
  }

  return null;
};
