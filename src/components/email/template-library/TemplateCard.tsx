
import React, { useState } from "react";
import { EmailTemplate } from "@/types/email";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Copy, Star, Eye, Calendar, Users } from "lucide-react";
import { TemplateLibraryService } from "@/services/email/TemplateLibraryService";

interface TemplateCardProps {
  template: EmailTemplate;
  viewMode: "grid" | "list";
  onSelect: () => void;
  onDuplicate: () => void;
}

export function TemplateCard({ template, viewMode, onSelect, onDuplicate }: TemplateCardProps) {
  const [rating, setRating] = useState(0);

  const handleRate = async (newRating: number) => {
    setRating(newRating);
    await TemplateLibraryService.rateTemplate(template.id, newRating);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (viewMode === "list") {
    return (
      <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={onSelect}>
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-12 bg-muted rounded border flex items-center justify-center">
              <Eye className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold">{template.template_name}</h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-3 h-3" />
                {formatDate(template.created_at)}
                {template.usage_count && (
                  <>
                    <Users className="w-3 h-3 ml-2" />
                    {template.usage_count} uses
                  </>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{template.category}</Badge>
            {template.is_system_template && (
              <Badge variant="outline">System</Badge>
            )}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={onDuplicate}>
                  <Copy className="w-4 h-4 mr-2" />
                  Duplicate
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer group" onClick={onSelect}>
      <CardHeader className="p-4 pb-2">
        <div className="aspect-video bg-muted rounded border flex items-center justify-center mb-2">
          {template.preview_image_url ? (
            <img 
              src={template.preview_image_url} 
              alt={template.template_name}
              className="w-full h-full object-cover rounded"
            />
          ) : (
            <Eye className="w-8 h-8 text-muted-foreground" />
          )}
        </div>
        
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate">{template.template_name}</h3>
            <div className="flex items-center gap-1 mt-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-3 h-3 cursor-pointer ${
                    star <= (template.rating || 0) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRate(star);
                  }}
                />
              ))}
              {template.rating_count && (
                <span className="text-xs text-muted-foreground ml-1">
                  ({template.rating_count})
                </span>
              )}
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation();
                onDuplicate();
              }}>
                <Copy className="w-4 h-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      
      <CardFooter className="p-4 pt-0">
        <div className="flex items-center justify-between w-full">
          <div className="flex flex-wrap gap-1">
            <Badge variant="secondary" className="text-xs">{template.category}</Badge>
            {template.is_system_template && (
              <Badge variant="outline" className="text-xs">System</Badge>
            )}
          </div>
          
          {template.usage_count && (
            <div className="text-xs text-muted-foreground">
              {template.usage_count} uses
            </div>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
