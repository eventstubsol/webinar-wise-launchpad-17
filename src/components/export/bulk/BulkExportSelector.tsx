
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Calendar, Users, Clock, Download, CheckSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface WebinarData {
  id: string;
  title: string;
  startTime: string;
  participantCount: number;
  duration: number;
  status: string;
}

interface BulkExportSelectorProps {
  webinars: WebinarData[];
  onExport: (selectedIds: string[], format: string, template?: string) => Promise<void>;
}

export function BulkExportSelector({ webinars, onExport }: BulkExportSelectorProps) {
  const [selectedWebinars, setSelectedWebinars] = useState<string[]>([]);
  const [exportFormat, setExportFormat] = useState('pdf');
  const [exportTemplate, setExportTemplate] = useState('comprehensive');
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const { toast } = useToast();

  const exportFormats = [
    { value: 'pdf', label: 'PDF Report', icon: '📄' },
    { value: 'excel', label: 'Excel Workbook', icon: '📊' },
    { value: 'csv', label: 'CSV Data', icon: '📋' },
    { value: 'multi', label: 'All Formats', icon: '📦' }
  ];

  const exportTemplates = [
    { value: 'summary', label: 'Executive Summary', description: 'High-level metrics and insights' },
    { value: 'detailed', label: 'Detailed Analysis', description: 'Comprehensive participant breakdown' },
    { value: 'comprehensive', label: 'Complete Report', description: 'All data including polls and Q&A' },
    { value: 'custom', label: 'Custom Template', description: 'User-defined template' }
  ];

  const handleSelectAll = () => {
    if (selectedWebinars.length === webinars.length) {
      setSelectedWebinars([]);
    } else {
      setSelectedWebinars(webinars.map(w => w.id));
    }
  };

  const handleWebinarToggle = (webinarId: string) => {
    setSelectedWebinars(prev => 
      prev.includes(webinarId) 
        ? prev.filter(id => id !== webinarId)
        : [...prev, webinarId]
    );
  };

  const handleBulkExport = async () => {
    if (selectedWebinars.length === 0) {
      toast({
        title: "No Selection",
        description: "Please select at least one webinar to export.",
        variant: "destructive"
      });
      return;
    }

    setIsExporting(true);
    setExportProgress(0);

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setExportProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 500);

      await onExport(selectedWebinars, exportFormat, exportTemplate);
      
      clearInterval(progressInterval);
      setExportProgress(100);
      
      setTimeout(() => {
        setExportProgress(0);
        setIsExporting(false);
        setSelectedWebinars([]);
      }, 1000);

      toast({
        title: "Export Started",
        description: `Bulk export of ${selectedWebinars.length} webinar(s) has been queued.`
      });
    } catch (error) {
      setIsExporting(false);
      setExportProgress(0);
      toast({
        title: "Export Failed",
        description: "Failed to start bulk export. Please try again.",
        variant: "destructive"
      });
    }
  };

  const getTotalParticipants = () => {
    return webinars
      .filter(w => selectedWebinars.includes(w.id))
      .reduce((sum, w) => sum + w.participantCount, 0);
  };

  const getEstimatedSize = () => {
    const baseSize = selectedWebinars.length * 2; // 2MB per webinar base
    const participantSize = getTotalParticipants() * 0.01; // 10KB per participant
    return `~${(baseSize + participantSize).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5" />
            Bulk Export Selection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Selection Controls */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              className="flex items-center gap-2"
            >
              <Checkbox 
                checked={selectedWebinars.length === webinars.length && webinars.length > 0}
                className="data-[state=checked]:bg-primary"
              />
              Select All ({webinars.length})
            </Button>
            
            {selectedWebinars.length > 0 && (
              <Badge variant="secondary">
                {selectedWebinars.length} selected
              </Badge>
            )}
          </div>

          {/* Webinar List */}
          <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-2">
            {webinars.map(webinar => (
              <div 
                key={webinar.id}
                className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedWebinars.includes(webinar.id) 
                    ? 'bg-blue-50 border-blue-200' 
                    : 'hover:bg-gray-50'
                }`}
                onClick={() => handleWebinarToggle(webinar.id)}
              >
                <Checkbox 
                  checked={selectedWebinars.includes(webinar.id)}
                  className="data-[state=checked]:bg-primary"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{webinar.title}</div>
                  <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(webinar.startTime).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {webinar.participantCount}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {webinar.duration}m
                    </span>
                  </div>
                </div>
                <Badge variant={webinar.status === 'completed' ? 'default' : 'secondary'}>
                  {webinar.status}
                </Badge>
              </div>
            ))}
          </div>

          {/* Export Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Export Format</Label>
              <Select value={exportFormat} onValueChange={setExportFormat}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {exportFormats.map(format => (
                    <SelectItem key={format.value} value={format.value}>
                      {format.icon} {format.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Template</Label>
              <Select value={exportTemplate} onValueChange={setExportTemplate}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {exportTemplates.map(template => (
                    <SelectItem key={template.value} value={template.value}>
                      <div>
                        <div>{template.label}</div>
                        <div className="text-xs text-gray-500">{template.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Export Summary */}
          {selectedWebinars.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-sm font-medium mb-2">Export Summary</div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Webinars:</span>
                  <div className="font-medium">{selectedWebinars.length}</div>
                </div>
                <div>
                  <span className="text-gray-500">Total Participants:</span>
                  <div className="font-medium">{getTotalParticipants().toLocaleString()}</div>
                </div>
                <div>
                  <span className="text-gray-500">Estimated Size:</span>
                  <div className="font-medium">{getEstimatedSize()}</div>
                </div>
              </div>
            </div>
          )}

          {/* Export Progress */}
          {isExporting && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Exporting...</span>
                <span>{exportProgress}%</span>
              </div>
              <Progress value={exportProgress} className="h-2" />
            </div>
          )}

          {/* Export Button */}
          <Button
            onClick={handleBulkExport}
            disabled={selectedWebinars.length === 0 || isExporting}
            className="w-full flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            {isExporting ? 'Exporting...' : `Export ${selectedWebinars.length} Webinar(s)`}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
