
import React, { useEffect, useState } from "react";
import { EmailTemplateVersion } from "@/types/email";
import { TemplateLibraryService } from "@/services/email/TemplateLibraryService";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RotateCcw, Eye, Calendar, User } from "lucide-react";
import { Loader2 } from "lucide-react";
import { SafeHtml } from "@/utils/htmlSanitizer";

interface VersionHistoryProps {
  templateId: string;
  onClose: () => void;
  onRestore: (versionId: string) => void;
}

export function VersionHistory({ templateId, onClose, onRestore }: VersionHistoryProps) {
  const [versions, setVersions] = useState<EmailTemplateVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState<EmailTemplateVersion | null>(null);
  const [restoring, setRestoring] = useState<string | null>(null);

  useEffect(() => {
    loadVersions();
  }, [templateId]);

  const loadVersions = async () => {
    try {
      const data = await TemplateLibraryService.getTemplateVersions(templateId);
      setVersions(data);
    } catch (error) {
      console.error("Failed to load versions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (versionId: string) => {
    try {
      setRestoring(versionId);
      await TemplateLibraryService.restoreVersion(templateId, versionId);
      onRestore(versionId);
    } catch (error) {
      console.error("Failed to restore version:", error);
    } finally {
      setRestoring(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <Dialog open onOpenChange={() => onClose()}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-6xl h-[80vh]">
        <DialogHeader>
          <DialogTitle>Version History</DialogTitle>
        </DialogHeader>

        <div className="flex h-full gap-4">
          {/* Version List */}
          <div className="w-1/3 space-y-2 overflow-auto">
            <h3 className="font-semibold mb-2">Versions ({versions.length})</h3>
            {versions.map((version) => (
              <Card 
                key={version.id}
                className={`cursor-pointer transition-colors ${
                  selectedVersion?.id === version.id ? "border-primary" : ""
                }`}
                onClick={() => setSelectedVersion(version)}
              >
                <CardHeader className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">v{version.version_number}</Badge>
                      {version.version_number === Math.max(...versions.map(v => v.version_number)) && (
                        <Badge>Current</Badge>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRestore(version.id);
                      }}
                      disabled={restoring === version.id}
                    >
                      {restoring === version.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <RotateCcw className="w-3 h-3" />
                      )}
                    </Button>
                  </div>
                  <CardTitle className="text-sm truncate">{version.template_name}</CardTitle>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    {formatDate(version.created_at)}
                  </div>
                  {version.change_summary && (
                    <p className="text-xs text-muted-foreground truncate">
                      {version.change_summary}
                    </p>
                  )}
                </CardHeader>
              </Card>
            ))}
          </div>

          {/* Version Preview */}
          <div className="flex-1 border rounded-lg">
            {selectedVersion ? (
              <div className="h-full flex flex-col">
                <div className="border-b p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{selectedVersion.template_name}</h3>
                      <p className="text-sm text-muted-foreground">
                        Version {selectedVersion.version_number} • {formatDate(selectedVersion.created_at)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => handleRestore(selectedVersion.id)}
                        disabled={restoring === selectedVersion.id}
                      >
                        {restoring === selectedVersion.id ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <RotateCcw className="w-4 h-4 mr-2" />
                        )}
                        Restore This Version
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="flex-1 p-4 overflow-auto">
                  <SafeHtml 
                    html={selectedVersion.html_template}
                    className="bg-white border rounded p-4"
                  />
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center">
                  <Eye className="w-8 h-8 mx-auto mb-2" />
                  <p>Select a version to preview</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
