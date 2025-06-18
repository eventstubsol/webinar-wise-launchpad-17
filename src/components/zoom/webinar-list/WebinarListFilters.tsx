
import React from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';

interface WebinarListFiltersProps {
  searchTerm: string;
  statusFilter: string;
  syncStatusFilter: string;
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onSyncStatusFilterChange: (value: string) => void;
}

export const WebinarListFilters: React.FC<WebinarListFiltersProps> = ({
  searchTerm,
  statusFilter,
  syncStatusFilter,
  onSearchChange,
  onStatusFilterChange,
  onSyncStatusFilterChange,
}) => {
  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <div className="flex-1">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search webinars..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>
      <Select value={statusFilter} onValueChange={onStatusFilterChange}>
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="finished">Finished</SelectItem>
          <SelectItem value="scheduled">Scheduled</SelectItem>
          <SelectItem value="available">Available</SelectItem>
        </SelectContent>
      </Select>
      <Select value={syncStatusFilter} onValueChange={onSyncStatusFilterChange}>
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Sync Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Sync</SelectItem>
          <SelectItem value="synced">Synced</SelectItem>
          <SelectItem value="pending">Pending</SelectItem>
          <SelectItem value="failed">Failed</SelectItem>
          <SelectItem value="no_participants">No Participants</SelectItem>
          <SelectItem value="not_applicable">Not Applicable</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};
