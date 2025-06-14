
import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ExportConfig } from '@/services/export/types';

interface ReportDataSelectionProps {
  dateRange: ExportConfig['dateRange'];
  onDateRangeChange: (field: 'start' | 'end', value: string) => void;
  // Placeholder for filter logic if it becomes more complex
  onFilterChange: (value: string) => void; 
}

export function ReportDataSelection({ dateRange, onDateRangeChange, onFilterChange }: ReportDataSelectionProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Date Range</Label>
          <div className="flex gap-2">
            <Input
              type="date"
              value={dateRange?.start || ''}
              onChange={(e) => onDateRangeChange('start', e.target.value)}
            />
            <Input
              type="date"
              value={dateRange?.end || ''}
              onChange={(e) => onDateRangeChange('end', e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Data Filters</Label>
          <Select
            onValueChange={onFilterChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="All webinars" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Webinars</SelectItem>
              <SelectItem value="completed">Completed Only</SelectItem>
              <SelectItem value="high-engagement">High Engagement</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
