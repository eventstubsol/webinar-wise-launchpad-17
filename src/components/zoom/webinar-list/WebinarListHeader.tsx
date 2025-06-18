
import React from 'react';
import { CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar } from 'lucide-react';

interface WebinarListHeaderProps {
  totalItems: number;
}

export const WebinarListHeader: React.FC<WebinarListHeaderProps> = ({ totalItems }) => {
  return (
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Calendar className="h-5 w-5" />
        Webinars
        {totalItems > 0 && (
          <Badge variant="secondary">{totalItems} total</Badge>
        )}
      </CardTitle>
    </CardHeader>
  );
};
