
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface WebinarListEmptyProps {
  hasFilters: boolean;
}

export const WebinarListEmpty: React.FC<WebinarListEmptyProps> = ({ hasFilters }) => {
  return (
    <Card>
      <CardContent className="p-8 text-center">
        <p className="text-muted-foreground">
          {hasFilters
            ? 'No webinars match your filters'
            : 'No webinars found'
          }
        </p>
      </CardContent>
    </Card>
  );
};
