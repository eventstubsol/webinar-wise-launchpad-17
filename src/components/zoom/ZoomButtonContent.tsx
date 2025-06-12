
import React from 'react';
import { Link, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { ZoomConnection } from '@/types/zoom';
import { ZoomConnectionService } from '@/services/zoom/ZoomConnectionService';

interface ZoomButtonContentProps {
  isLoading: boolean;
  isValidating: boolean;
  connection: ZoomConnection | null;
}

export const ZoomButtonContent: React.FC<ZoomButtonContentProps> = ({
  isLoading,
  isValidating,
  connection,
}) => {
  if (isLoading || isValidating) {
    return (
      <>
        <Loader className="h-4 w-4 animate-spin" />
        <span>{isValidating ? 'Validating...' : 'Loading...'}</span>
      </>
    );
  }

  if (connection) {
    const isExpired = ZoomConnectionService.isTokenExpired(connection.token_expires_at);
    
    if (isExpired) {
      return (
        <>
          <AlertCircle className="h-4 w-4" />
          <span>Revalidate Credentials</span>
        </>
      );
    }

    return (
      <>
        <CheckCircle className="h-4 w-4" />
        <span>Credentials Validated</span>
      </>
    );
  }

  return (
    <>
      <Link className="h-4 w-4" />
      <span>Validate Credentials</span>
    </>
  );
};
