import React from 'react';
import { SidebarTrigger } from '@/components/ui/sidebar';

export function HeaderBranding() {
  return (
    <div className="flex items-center gap-3">
      <SidebarTrigger className="-ml-1" />
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-blue-600 rounded-md flex items-center justify-center">
          <span className="text-white font-bold text-sm">W</span>
        </div>
        <h1 className="text-xl font-semibold text-gray-900">WebinarWise</h1>
      </div>
    </div>
  );
}
