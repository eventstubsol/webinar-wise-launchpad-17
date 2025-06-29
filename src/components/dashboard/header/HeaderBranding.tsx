
import React from 'react';
import { SidebarTrigger } from '@/components/ui/sidebar';

export function HeaderBranding() {
  return (
    <div className="flex items-center gap-2">
      <SidebarTrigger className="-ml-1" />
      <h1 className="text-xl font-semibold text-gray-900">WebinarWise</h1>
    </div>
  );
}
