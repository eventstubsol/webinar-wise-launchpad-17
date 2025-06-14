
import React, { useState } from "react";
import { TemplateLibrary } from "@/components/email/template-library/TemplateLibrary";
import { EmailTemplateBuilder } from "@/components/email/EmailTemplateBuilder";
import { EmailTemplate } from "@/types/email";
import { useAuth } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function EmailTemplates() {
  const [currentView, setCurrentView] = useState<"library" | "editor">("library");
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const { getCurrentUser } = useAuth();

  const handleSelectTemplate = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setCurrentView("editor");
  };

  const handleCreateNew = () => {
    setSelectedTemplate(null);
    setCurrentView("editor");
  };

  const handleBackToLibrary = () => {
    setCurrentView("library");
    setSelectedTemplate(null);
  };

  const user = getCurrentUser();
  const userId = user?.data?.user?.id;

  if (!userId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Please log in to access email templates.</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {currentView === "editor" && (
        <div className="border-b p-4">
          <Button variant="ghost" onClick={handleBackToLibrary} className="mb-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Library
          </Button>
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        {currentView === "library" ? (
          <TemplateLibrary
            userId={userId}
            onSelectTemplate={handleSelectTemplate}
            onCreateNew={handleCreateNew}
          />
        ) : (
          <div className="h-full p-6">
            <EmailTemplateBuilder
              template={selectedTemplate || undefined}
              onChange={(template) => {
                // Handle template changes
                console.log("Template updated:", template);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
