
import React, { useState } from "react";
import { EmailTemplate } from "@/types/email";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Monitor, Tablet, Smartphone } from "lucide-react";
import { SafeHtml } from "@/utils/htmlSanitizer";

interface ResponsivePreviewProps {
  template: EmailTemplate;
  onClose: () => void;
}

const deviceSizes = {
  desktop: { width: "100%", height: "600px", icon: Monitor, label: "Desktop" },
  tablet: { width: "768px", height: "600px", icon: Tablet, label: "Tablet" },
  mobile: { width: "375px", height: "600px", icon: Smartphone, label: "Mobile" }
};

export function ResponsivePreview({ template, onClose }: ResponsivePreviewProps) {
  const [selectedDevice, setSelectedDevice] = useState<keyof typeof deviceSizes>("desktop");
  const [emailClient, setEmailClient] = useState("gmail");

  const renderPreview = () => {
    const clientStyles = {
      gmail: "font-family: Arial, sans-serif; background: #f5f5f5;",
      outlook: "font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #ffffff;",
      apple: "font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #fafafa;"
    };

    return (
      <div 
        style={{
          ...deviceSizes[selectedDevice],
          margin: "0 auto",
          border: "1px solid #e2e8f0",
          borderRadius: "8px",
          overflow: "hidden"
        }}
      >
        <SafeHtml 
          html={template.html_template}
          style={{
            width: "100%",
            height: "100%",
            padding: "20px",
            ...(clientStyles[emailClient as keyof typeof clientStyles] && {
              cssText: clientStyles[emailClient as keyof typeof clientStyles]
            })
          }}
        />
      </div>
    );
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-6xl h-[80vh]">
        <DialogHeader>
          <DialogTitle>Responsive Preview - {template.template_name}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between mb-4">
            <Tabs value={selectedDevice} onValueChange={(value) => setSelectedDevice(value as any)}>
              <TabsList>
                {Object.entries(deviceSizes).map(([key, config]) => {
                  const Icon = config.icon;
                  return (
                    <TabsTrigger key={key} value={key} className="flex items-center gap-2">
                      <Icon className="w-4 h-4" />
                      {config.label}
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </Tabs>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Email Client:</span>
              <Tabs value={emailClient} onValueChange={setEmailClient}>
                <TabsList>
                  <TabsTrigger value="gmail">Gmail</TabsTrigger>
                  <TabsTrigger value="outlook">Outlook</TabsTrigger>
                  <TabsTrigger value="apple">Apple Mail</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          <div className="flex-1 bg-muted p-4 rounded-lg overflow-auto">
            {renderPreview()}
          </div>

          <div className="flex justify-between items-center mt-4 text-sm text-muted-foreground">
            <div>
              Preview Size: {deviceSizes[selectedDevice].width} × {deviceSizes[selectedDevice].height}
            </div>
            <div>
              Email Client: {emailClient.charAt(0).toUpperCase() + emailClient.slice(1)}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
