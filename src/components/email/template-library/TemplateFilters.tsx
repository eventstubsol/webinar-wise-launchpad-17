
import React from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, Search } from "lucide-react";

interface TemplateFiltersProps {
  filters: {
    category: string;
    search: string;
    tags: string[];
  };
  onFiltersChange: (filters: any) => void;
}

const categories = [
  { value: "all", label: "All Categories" },
  { value: "registration", label: "Registration" },
  { value: "reminder", label: "Reminder" },
  { value: "follow-up", label: "Follow-up" },
  { value: "re-engagement", label: "Re-engagement" },
  { value: "thank-you", label: "Thank You" },
  { value: "custom", label: "Custom" }
];

const popularTags = [
  "welcome", "onboarding", "reminder", "webinar", "notification",
  "thank-you", "follow-up", "resources", "re-engagement", "winback",
  "newsletter", "updates", "professional"
];

export function TemplateFilters({ filters, onFiltersChange }: TemplateFiltersProps) {
  const updateFilters = (updates: Partial<typeof filters>) => {
    onFiltersChange({ ...filters, ...updates });
  };

  const addTag = (tag: string) => {
    if (!filters.tags.includes(tag)) {
      updateFilters({ tags: [...filters.tags, tag] });
    }
  };

  const removeTag = (tag: string) => {
    updateFilters({ tags: filters.tags.filter(t => t !== tag) });
  };

  const clearFilters = () => {
    onFiltersChange({ category: "all", search: "", tags: [] });
  };

  const hasActiveFilters = (filters.category && filters.category !== "all") || filters.search || filters.tags.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={filters.search}
            onChange={(e) => updateFilters({ search: e.target.value })}
            className="pl-10"
          />
        </div>
        
        <Select value={filters.category || "all"} onValueChange={(category) => updateFilters({ category })}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category.value} value={category.value}>
                {category.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button variant="outline" onClick={clearFilters}>
            Clear Filters
          </Button>
        )}
      </div>

      {/* Selected Tags */}
      {filters.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-muted-foreground">Tags:</span>
          {filters.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1">
              {tag}
              <X 
                className="w-3 h-3 cursor-pointer hover:text-destructive" 
                onClick={() => removeTag(tag)}
              />
            </Badge>
          ))}
        </div>
      )}

      {/* Popular Tags */}
      <div>
        <div className="text-sm text-muted-foreground mb-2">Popular tags:</div>
        <div className="flex flex-wrap gap-2">
          {popularTags.map((tag) => (
            <Badge
              key={tag}
              variant={filters.tags.includes(tag) ? "default" : "outline"}
              className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
              onClick={() => filters.tags.includes(tag) ? removeTag(tag) : addTag(tag)}
            >
              {tag}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}
