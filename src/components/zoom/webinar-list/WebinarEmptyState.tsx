
import React from 'react';
import { Calendar } from 'lucide-react';

interface WebinarEmptyStateProps {
  hasFilters: boolean;
}

export const WebinarEmptyState: React.FC<WebinarEmptyStateProps> = ({ hasFilters }) => {
  return (
    <div className="text-center py-8">
      <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold mb-2">No webinars found</h3>
      <p className="text-muted-foreground">
        {hasFilters 
          ? 'No webinars match your current filters.' 
          : 'No webinars have been synced yet.'}
      </p>
    </div>
  );
};
