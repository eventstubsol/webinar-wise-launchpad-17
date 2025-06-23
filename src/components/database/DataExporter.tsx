'use client';

import React, { useState } from 'react';
import { dataExportService, ExportOptions } from '@/services/backup/export';
import { format } from 'date-fns';
import {
  Download,
  FileDown,
  FileText,
  FileSpreadsheet,
  Archive,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { DatePicker } from '@/components/ui/date-picker';
import { toast } from '@/components/ui/use-toast';

interface ExportState {
  isExporting: boolean;
  progress: number;
  currentTable?: string;
  error?: string;
  lastExport?: {
    fileName: string;
    tables: string[];
    recordCount: Record<string, number>;
    exportedAt: Date;
  };
}

const AVAILABLE_TABLES = [
  { value: 'zoom_webinars', label: 'Webinars', description: 'Webinar details and settings' },
  { value: 'zoom_participants', label: 'Participants', description: 'Attendance data and engagement' },
  { value: 'zoom_registrants', label: 'Registrants', description: 'Registration information' },
  { value: 'zoom_polls', label: 'Polls', description: 'Poll questions and responses' },
  { value: 'zoom_qna', label: 'Q&A', description: 'Questions and answers' },
  { value: 'email_campaigns', label: 'Email Campaigns', description: 'Campaign data and metrics' },
  { value: 'email_templates', label: 'Email Templates', description: 'Template designs and content' },
  { value: 'ai_insights', label: 'AI Insights', description: 'Generated insights and predictions' }
];

export function DataExporter() {
  const [selectedTables, setSelectedTables] = useState<string[]>(['zoom_webinars', 'zoom_participants', 'zoom_registrants']);
  const [exportFormat, setExportFormat] = useState<'json' | 'csv' | 'excel'>('json');
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [compress, setCompress] = useState(true);
  const [useDateRange, setUseDateRange] = useState(false);
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    to: new Date()
  });
  const [exportState, setExportState] = useState<ExportState>({
    isExporting: false,
    progress: 0
  });

  const handleExport = async () => {
    setExportState({
      isExporting: true,
      progress: 0,
      error: undefined
    });

    try {
      const options: ExportOptions = {
        tables: selectedTables,
        format: exportFormat,
        includeMetadata,
        compress: exportFormat === 'excel' ? false : compress, // Excel files are already compressed
        dateRange: useDateRange ? dateRange : undefined
      };

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setExportState(prev => ({
          ...prev,
          progress: Math.min(prev.progress + 10, 90)
        }));
      }, 200);

      const result = await dataExportService.exportData(options);

      clearInterval(progressInterval);

      if (result.success) {
        setExportState({
          isExporting: false,
          progress: 100,
          lastExport: {
            fileName: result.fileName,
            tables: result.tables,
            recordCount: result.recordCount,
            exportedAt: result.exportedAt
          }
        });

        toast({
          title: 'Export Successful',
          description: `Exported ${Object.values(result.recordCount).reduce((a, b) => a + b, 0)} records to ${result.fileName}`,
        });
      } else {
        throw new Error(result.error || 'Export failed');
      }
    } catch (error) {
      setExportState({
        isExporting: false,
        progress: 0,
        error: error instanceof Error ? error.message : 'Export failed'
      });

      toast({
        title: 'Export Failed',
        description: error instanceof Error ? error.message : 'An error occurred during export',
        variant: 'destructive'
      });
    }
  };

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'json': return <FileText className="h-4 w-4" />;
      case 'csv': return <FileDown className="h-4 w-4" />;
      case 'excel': return <FileSpreadsheet className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const toggleTable = (table: string) => {
    setSelectedTables(prev =>
      prev.includes(table)
        ? prev.filter(t => t !== table)
        : [...prev, table]
    );
  };

  const selectAllTables = () => {
    setSelectedTables(AVAILABLE_TABLES.map(t => t.value));
  };

  const deselectAllTables = () => {
    setSelectedTables([]);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Data Export</h2>
        <p className="text-muted-foreground">
          Export your data for backup or analysis
        </p>
      </div>

      {exportState.error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Export Error</AlertTitle>
          <AlertDescription>{exportState.error}</AlertDescription>
        </Alert>
      )}

      {exportState.lastExport && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>Last Export</AlertTitle>
          <AlertDescription>
            Exported {Object.values(exportState.lastExport.recordCount).reduce((a, b) => a + b, 0)} records 
            to {exportState.lastExport.fileName} on {format(exportState.lastExport.exportedAt, 'PPp')}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Table Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Select Tables</CardTitle>
            <CardDescription>
              Choose which tables to include in the export
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between mb-2">
              <Button
                variant="outline"
                size="sm"
                onClick={selectAllTables}
              >
                Select All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={deselectAllTables}
              >
                Deselect All
              </Button>
            </div>
            
            <div className="space-y-3">
              {AVAILABLE_TABLES.map((table) => (
                <div key={table.value} className="flex items-start space-x-3">
                  <Checkbox
                    id={table.value}
                    checked={selectedTables.includes(table.value)}
                    onCheckedChange={() => toggleTable(table.value)}
                  />
                  <div className="space-y-1">
                    <Label
                      htmlFor={table.value}
                      className="text-sm font-medium cursor-pointer"
                    >
                      {table.label}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {table.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Export Options */}
        <Card>
          <CardHeader>
            <CardTitle>Export Options</CardTitle>
            <CardDescription>
              Configure how your data will be exported
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Format Selection */}
            <div className="space-y-3">
              <Label>Export Format</Label>
              <RadioGroup value={exportFormat} onValueChange={(value: any) => setExportFormat(value)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="json" id="json" />
                  <Label htmlFor="json" className="flex items-center gap-2 cursor-pointer">
                    <FileText className="h-4 w-4" />
                    JSON
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="csv" id="csv" />
                  <Label htmlFor="csv" className="flex items-center gap-2 cursor-pointer">
                    <FileDown className="h-4 w-4" />
                    CSV
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="excel" id="excel" />
                  <Label htmlFor="excel" className="flex items-center gap-2 cursor-pointer">
                    <FileSpreadsheet className="h-4 w-4" />
                    Excel
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Compression */}
            {exportFormat !== 'excel' && (
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="compress">Compress File</Label>
                  <p className="text-xs text-muted-foreground">
                    Reduce file size with ZIP compression
                  </p>
                </div>
                <Switch
                  id="compress"
                  checked={compress}
                  onCheckedChange={setCompress}
                />
              </div>
            )}

            {/* Include Metadata */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="metadata">Include Metadata</Label>
                <p className="text-xs text-muted-foreground">
                  Add export information and statistics
                </p>
              </div>
              <Switch
                id="metadata"
                checked={includeMetadata}
                onCheckedChange={setIncludeMetadata}
              />
            </div>

            {/* Date Range */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="daterange">Filter by Date</Label>
                  <p className="text-xs text-muted-foreground">
                    Only export data within date range
                  </p>
                </div>
                <Switch
                  id="daterange"
                  checked={useDateRange}
                  onCheckedChange={setUseDateRange}
                />
              </div>
              
              {useDateRange && (
                <div className="grid gap-2">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-sm">Date Range</Label>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div>
                      <Label className="text-xs">From</Label>
                      <DatePicker
                        date={dateRange.from}
                        onDateChange={(date) => setDateRange(prev => ({ ...prev, from: date || prev.from }))}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">To</Label>
                      <DatePicker
                        date={dateRange.to}
                        onDateChange={(date) => setDateRange(prev => ({ ...prev, to: date || prev.to }))}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Export Progress */}
      {exportState.isExporting && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Exporting data...</span>
                <span className="text-sm text-muted-foreground">{exportState.progress}%</span>
              </div>
              <Progress value={exportState.progress} />
              {exportState.currentTable && (
                <p className="text-xs text-muted-foreground">
                  Processing: {exportState.currentTable}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Export Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleExport}
          disabled={exportState.isExporting || selectedTables.length === 0}
          size="lg"
        >
          {exportState.isExporting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Export Data
            </>
          )}
        </Button>
      </div>
    </div>
  );
}