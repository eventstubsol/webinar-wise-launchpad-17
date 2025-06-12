
import React from 'react';
import { ZoomConnectionCard } from '@/components/zoom/ZoomConnectionCard';
import { useZoom } from '@/hooks/useZoom';

export const ZoomIntegrationSection: React.FC = () => {
  const { primaryConnection, dashboardStats, loading } = useZoom();

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-48 bg-gray-200 rounded-lg"></div>
      </div>
    );
  }

  return (
    <ZoomConnectionCard 
      connection={primaryConnection}
      dashboardStats={dashboardStats}
    />
  );
};
