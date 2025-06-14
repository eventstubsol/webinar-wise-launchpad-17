
import React, { useEffect, useState } from "react";
import { TemplateCard } from "./TemplateCard";
import { TemplateLibraryService } from "@/services/email/TemplateLibraryService";
import { EmailTemplate } from "@/types/email";
import { Loader2, Grid3X3, List, SortAsc, SortDesc } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface TemplateGalleryProps {
  userId: string;
  filters: {
    category: string;
    search: string;
    tags: string[];
  };
  onSelectTemplate: (template: EmailTemplate) => void;
  includeSystem?: boolean;
  publicOnly?: boolean;
}

export function TemplateGallery({ 
  userId, 
  filters, 
  onSelectTemplate, 
  includeSystem = false,
  publicOnly = false 
}: TemplateGalleryProps) {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState<"name" | "created" | "usage">("created");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    loadTemplates();
  }, [userId, filters, includeSystem, publicOnly]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const options = {
        ...filters,
        category: filters.category === "all" ? "" : filters.category,
        userId: publicOnly ? undefined : userId,
        includeSystem
      };
      
      let data = await TemplateLibraryService.getTemplates(options);
      
      if (publicOnly) {
        data = data.filter(t => t.is_public);
      }
      
      // Sort templates
      data.sort((a, b) => {
        let aValue, bValue;
        switch (sortBy) {
          case "name":
            aValue = a.template_name.toLowerCase();
            bValue = b.template_name.toLowerCase();
            break;
          case "usage":
            aValue = a.usage_count || 0;
            bValue = b.usage_count || 0;
            break;
          default:
            aValue = new Date(a.created_at).getTime();
            bValue = new Date(b.created_at).getTime();
        }
        
        const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        return sortOrder === "asc" ? comparison : -comparison;
      });
      
      setTemplates(data);
    } catch (error) {
      console.error("Failed to load templates:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-muted-foreground">
          {templates.length} template{templates.length !== 1 ? 's' : ''} found
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created">Created</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="usage">Usage</SelectItem>
            </SelectContent>
          </Select>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
          >
            {sortOrder === "asc" ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
          >
            {viewMode === "grid" ? <List className="w-4 h-4" /> : <Grid3X3 className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {templates.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No templates found matching your criteria.</p>
        </div>
      ) : (
        <div className={
          viewMode === "grid" 
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
            : "space-y-2"
        }>
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              viewMode={viewMode}
              onSelect={() => onSelectTemplate(template)}
              onDuplicate={async () => {
                await TemplateLibraryService.duplicateTemplate(template.id, userId);
                loadTemplates();
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
