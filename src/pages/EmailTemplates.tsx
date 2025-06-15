
import React, { useState } from "react";
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/dashboard/AppSidebar';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { TemplateLibrary } from "@/components/email/template-library/TemplateLibrary";
import { EmailTemplateBuilder } from "@/components/email/EmailTemplateBuilder";
import { EmailTemplate } from "@/types/email";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function EmailTemplates() {
  const [currentView, setCurrentView] = useState<"library" | "editor">("library");
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [user, setUser] = useState<any>(null);

  // Get current user on component mount
  React.useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getCurrentUser();
  }, []);

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

  const userId = user?.id;

  const renderContent = () => {
    if (!userId) {
      return (
        <div className="flex items-center justify-center h-full">
          <p>Please log in to access email templates.</p>
        </div>
      );
    }
    
    if (currentView === "library") {
      return (
        <div className="p-6 space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Email Templates</h1>
            <p className="text-gray-600">Design and manage your reusable email templates.</p>
          </div>
          <TemplateLibrary
            userId={userId}
            onSelectTemplate={handleSelectTemplate}
            onCreateNew={handleCreateNew}
          />
        </div>
      );
    }

    if (currentView === "editor") {
      return (
        <div className="flex flex-col h-full">
          <div className="border-b p-4 flex items-center justify-between sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10">
            <Button variant="ghost" onClick={handleBackToLibrary}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Library
            </Button>
            <h2 className="text-lg font-semibold">{selectedTemplate ? 'Edit Template' : 'Create New Template'}</h2>
            <div className="w-32"></div> {/* Spacer to center title */}
          </div>
          <div className="flex-1 p-6">
            <EmailTemplateBuilder
              template={selectedTemplate || undefined}
              onChange={(template) => {
                // Handle template changes
                console.log("Template updated:", template);
              }}
            />
          </div>
        </div>
      );
    }
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <DashboardHeader />
        <main className="h-[calc(100vh-4rem)] overflow-y-auto">
          {renderContent()}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
