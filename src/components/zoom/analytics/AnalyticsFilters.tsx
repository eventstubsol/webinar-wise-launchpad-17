
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface WebinarAnalyticsFilters {
  dateRange: { from: Date; to: Date };
  status?: string;
  minAttendees?: number;
  engagementLevel?: 'high' | 'medium' | 'low';
}

interface AnalyticsFiltersProps {
  filters: WebinarAnalyticsFilters;
  onFiltersChange: (filters: WebinarAnalyticsFilters) => void;
  isLoading?: boolean;
}

export const AnalyticsFilters: React.FC<AnalyticsFiltersProps> = ({
  filters,
  onFiltersChange,
  isLoading,
}) => {
  const handleDateRangeChange = (range: { from: Date; to: Date }) => {
    onFiltersChange({
      ...filters,
      dateRange: range,
    });
  };

  const handleStatusChange = (status: string) => {
    onFiltersChange({
      ...filters,
      status: status === 'all' ? undefined : status,
    });
  };

  const handleMinAttendeesChange = (value: string) => {
    const numValue = parseInt(value);
    onFiltersChange({
      ...filters,
      minAttendees: isNaN(numValue) ? undefined : numValue,
    });
  };

  const handleEngagementLevelChange = (level: string) => {
    onFiltersChange({
      ...filters,
      engagementLevel: level === 'all' ? undefined : level as 'high' | 'medium' | 'low',
    });
  };

  const resetFilters = () => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    onFiltersChange({
      dateRange: { from: thirtyDaysAgo, to: now },
      status: undefined,
      minAttendees: undefined,
      engagementLevel: undefined,
    });
  };

  const getPresetDateRange = (days: number) => {
    const now = new Date();
    const past = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return { from: past, to: now };
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {/* Date Range */}
          <div className="lg:col-span-2">
            <Label htmlFor="date-range">Date Range</Label>
            <div className="flex gap-2 mt-1">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "flex-1 justify-start text-left font-normal",
                      !filters.dateRange.from && "text-muted-foreground"
                    )}
                    disabled={isLoading}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.dateRange.from ? (
                      filters.dateRange.to ? (
                        <>
                          {format(filters.dateRange.from, "LLL dd, y")} -{" "}
                          {format(filters.dateRange.to, "LLL dd, y")}
                        </>
                      ) : (
                        format(filters.dateRange.from, "LLL dd, y")
                      )
                    ) : (
                      <span>Pick a date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <div className="p-3 border-b">
                    <div className="grid grid-cols-2 gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleDateRangeChange(getPresetDateRange(7))}
                      >
                        Last 7 days
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleDateRangeChange(getPresetDateRange(30))}
                      >
                        Last 30 days
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleDateRangeChange(getPresetDateRange(90))}
                      >
                        Last 90 days
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleDateRangeChange(getPresetDateRange(365))}
                      >
                        Last year
                      </Button>
                    </div>
                  </div>
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={filters.dateRange.from}
                    selected={filters.dateRange}
                    onSelect={(range) => {
                      if (range?.from && range?.to) {
                        handleDateRangeChange({ from: range.from, to: range.to });
                      }
                    }}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <Label htmlFor="status">Status</Label>
            <Select
              value={filters.status || 'all'}
              onValueChange={handleStatusChange}
              disabled={isLoading}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="unavailable">Unavailable</SelectItem>
                <SelectItem value="deleted">Deleted</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Minimum Attendees */}
          <div>
            <Label htmlFor="min-attendees">Min Attendees</Label>
            <Input
              id="min-attendees"
              type="number"
              placeholder="0"
              value={filters.minAttendees || ''}
              onChange={(e) => handleMinAttendeesChange(e.target.value)}
              disabled={isLoading}
              className="mt-1"
            />
          </div>

          {/* Engagement Level */}
          <div>
            <Label htmlFor="engagement">Engagement Level</Label>
            <Select
              value={filters.engagementLevel || 'all'}
              onValueChange={handleEngagementLevelChange}
              disabled={isLoading}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="All levels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="high">High (70+)</SelectItem>
                <SelectItem value="medium">Medium (40-69)</SelectItem>
                <SelectItem value="low">Low (&lt;40)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Reset Button */}
        <div className="flex justify-end mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={resetFilters}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Reset Filters
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
