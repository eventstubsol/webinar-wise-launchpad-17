
import React from 'react';
import { ZoomConnection } from '@/types/zoom';
import { ZoomConnectionService } from '@/services/zoom/ZoomConnectionService';
import { ZoomCredentials } from '@/types/zoomCredentials';
import { AlertCircle, CheckCircle } from 'lucide-react';

interface ZoomButtonStatusProps {
  connection: ZoomConnection | null;
  credentials: ZoomCredentials | null;
  validationResult?: any | null;
}

export const ZoomButtonStatus: React.FC<ZoomButtonStatusProps> = ({
  connection,
  credentials,
  validationResult,
}) => {
  // Priority 1: Show validation result if available
  if (validationResult) {
    if (validationResult.success) {
      return (
        <div className="text-xs text-green-600 flex items-center gap-1">
          <CheckCircle className="w-3 h-3" />
          <span>Validated: {validationResult.accountInfo?.email || 'Success'}</span>
        </div>
      );
    }
    if (validationResult.error) {
      return (
        <div className="text-xs text-red-600 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          <span>Validation Failed. Please check credentials.</span>
        </div>
      );
    }
  }

  // Priority 2: Show existing connection status
  if (connection && !ZoomConnectionService.isTokenExpired(connection.token_expires_at)) {
    // Check if this is a Server-to-Server connection with placeholder tokens
    const isServerToServer = connection.access_token && 
      (connection.access_token.includes('SERVER_TO_SERVER_') || 
       connection.zoom_account_type !== 'OAuth');
    
    return (
      <div className="text-xs text-green-600 flex items-center gap-1">
        <CheckCircle className="w-3 h-3" />
        <span>Connected: {connection.zoom_email}</span>
      </div>
    );
  }
  
  if (connection && ZoomConnectionService.isTokenExpired(connection.token_expires_at)) {
    return (
      <div className="text-xs text-red-500 flex items-center gap-1">
        <AlertCircle className="w-3 h-3" />
        <span>Connection expired. Please re-validate.</span>
      </div>
    );
  }

  // Priority 3: Prompt to configure
  if (!credentials && !connection) {
    return (
      <div className="text-xs text-muted-foreground">
        Configure OAuth credentials to enable validation.
      </div>
    );
  }

  // Priority 4: Prompt to validate
  if (credentials && !connection) {
    return (
      <div className="text-xs text-muted-foreground">
        Ready to validate credentials.
      </div>
    );
  }

  return null;
};
