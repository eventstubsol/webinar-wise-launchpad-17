
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useZoomConnection } from '@/hooks/useZoomConnection';
import { TokenStatus } from '@/services/zoom/utils/tokenUtils';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

interface ZoomConnectionGateProps {
  children: React.ReactNode;
}

export const ZoomConnectionGate: React.FC<ZoomConnectionGateProps> = ({ children }) => {
  const { tokenStatus, isLoading } = useZoomConnection();
  const location = useLocation();

  // Show loading while checking connection status
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // If no valid Zoom connection, redirect to dashboard
  if (tokenStatus !== TokenStatus.VALID) {
    console.log('ZoomConnectionGate: No valid connection, redirecting to dashboard');
    return <Navigate to="/dashboard" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
