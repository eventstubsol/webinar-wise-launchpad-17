
import React, { useState } from "react";
import { TemplateGallery } from "./TemplateGallery";
import { TemplateFilters } from "./TemplateFilters";
import { PrebuiltTemplates } from "./PrebuiltTemplates";
import { ResponsivePreview } from "./ResponsivePreview";
import { VersionHistory } from "./VersionHistory";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmailTemplate } from "@/types/email";

interface TemplateLibraryProps {
  userId: string;
  onSelectTemplate?: (template: EmailTemplate) => void;
  onCreateNew?: () => void;
}

export function TemplateLibrary({ userId, onSelectTemplate, onCreateNew }: TemplateLibraryProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showResponsivePreview, setShowResponsivePreview] = useState(false);
  const [filters, setFilters] = useState({
    category: "",
    search: "",
    tags: [] as string[]
  });

  const handleTemplateSelect = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    onSelectTemplate?.(template);
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="border-b p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Email Template Library</h2>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onCreateNew}>
              Create New Template
            </Button>
            {selectedTemplate && (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => setShowVersionHistory(true)}
                >
                  Version History
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setShowResponsivePreview(true)}
                >
                  Preview
                </Button>
              </>
            )}
          </div>
        </div>
        
        <TemplateFilters 
          filters={filters}
          onFiltersChange={setFilters}
        />
      </div>

      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="my-templates" className="h-full">
          <TabsList className="w-full justify-start border-b rounded-none">
            <TabsTrigger value="my-templates">My Templates</TabsTrigger>
            <TabsTrigger value="system-templates">System Templates</TabsTrigger>
            <TabsTrigger value="public-templates">Public Templates</TabsTrigger>
          </TabsList>
          
          <TabsContent value="my-templates" className="h-full mt-0">
            <TemplateGallery
              userId={userId}
              filters={filters}
              onSelectTemplate={handleTemplateSelect}
              includeSystem={false}
            />
          </TabsContent>
          
          <TabsContent value="system-templates" className="h-full mt-0">
            <PrebuiltTemplates
              onSelectTemplate={handleTemplateSelect}
              filters={filters}
            />
          </TabsContent>
          
          <TabsContent value="public-templates" className="h-full mt-0">
            <TemplateGallery
              userId={userId}
              filters={filters}
              onSelectTemplate={handleTemplateSelect}
              includeSystem={false}
              publicOnly={true}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals */}
      {showVersionHistory && selectedTemplate && (
        <VersionHistory
          templateId={selectedTemplate.id}
          onClose={() => setShowVersionHistory(false)}
          onRestore={() => {
            setShowVersionHistory(false);
            // Refresh template list
          }}
        />
      )}

      {showResponsivePreview && selectedTemplate && (
        <ResponsivePreview
          template={selectedTemplate}
          onClose={() => setShowResponsivePreview(false)}
        />
      )}
    </div>
  );
}
