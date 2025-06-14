
import React from 'react';
import { CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

interface ExportQueueHeaderProps {
  onRefresh: () => void;
}

export function ExportQueueHeader({ onRefresh }: ExportQueueHeaderProps) {
  return (
    <CardHeader className="flex flex-row items-center justify-between">
      <CardTitle>Export Queue & History</CardTitle>
      <Button
        variant="outline"
        size="sm"
        onClick={onRefresh}
        className="flex items-center gap-2"
      >
        <RefreshCw className="h-4 w-4" />
        Refresh
      </Button>
    </CardHeader>
  );
}
