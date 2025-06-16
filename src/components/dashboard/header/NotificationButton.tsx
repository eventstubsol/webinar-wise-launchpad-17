
import React from 'react';
import { Button } from '@/components/ui/button';
import { Bell } from 'lucide-react';

export function NotificationButton() {
  return (
    <Button variant="ghost" size="icon" className="h-8 w-8">
      <Bell className="w-4 h-4" />
    </Button>
  );
}
