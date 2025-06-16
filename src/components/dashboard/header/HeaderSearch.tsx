
import React from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

export function HeaderSearch() {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
      <Input
        type="search"
        placeholder="Search webinars, reports, attendees..."
        className="pl-10 w-80"
      />
    </div>
  );
}
