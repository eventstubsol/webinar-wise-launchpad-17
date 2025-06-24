
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Download, 
  FileText, 
  FileSpreadsheet, 
  Archive,
  Calendar,
  Database,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { DatePicker } from '@/components/ui/date-picker';
import { dataExportService, ExportOptions, ExportResult } from '@/services/backup/export';
import { format } from 'date-fns';

interface ExportProgress {
  percentage: number;
  currentTable: string;
  message: string;
}

export function DataExporter() {
  const [exportFormat, setExportFormat] = useState<'json' | 'csv' | 'excel'>('json');
  const [selectedTables, setSelectedTables] = useState<string[]>([
    'zoom_webinars',
    'zoom_participants',
    'zoom_registrants'
  ]);
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [compressOutput, setCompressOutput] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null);
  const [lastExport, setLastExport] = useState<ExportResult | null>(null);

  const availableTables = [
    'zoom_webinars',
    'zoom_participants', 
    'zoom_registrants',
    'zoom_polls',
    'zoom_qna',
    'csv_imports',
    'csv_import_rows'
  ];

  const handleTableToggle = (table: string) => {
    setSelectedTables(prev => 
      prev.includes(table) 
        ? prev.filter(t => t !== table)
        : [...prev, table]
    );
  };

  const handleExport = async () => {
    if (selectedTables.length === 0) {
      return;
    }

    setIsExporting(true);
    setExportProgress({ percentage: 0, currentTable: '', message: 'Preparing export...' });

    try {
      const options: ExportOptions = {
        tables: selectedTables,
        format: exportFormat,
        includeMetadata,
        compress: compressOutput,
        dateRange: dateRange.from && dateRange.to ? {
          from: dateRange.from,
          to: dateRange.to,
          column: 'created_at'
        } : undefined
      };

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setExportProgress(prev => {
          if (!prev) return null;
          const newPercentage = Math.min(prev.percentage + 10, 90);
          return {
            ...prev,
            percentage: newPercentage,
            message: `Exporting ${selectedTables[Math.floor(newPercentage / 30)] || 'data'}...`
          };
        });
      }, 500);

      const result = await dataExportService.exportData(options);

      clearInterval(progressInterval);
      setExportProgress({ percentage: 100, currentTable: '', message: 'Export completed!' });
      setLastExport(result);

      // Clear progress after a delay
      setTimeout(() => {
        setExportProgress(null);
      }, 2000);

    } catch (error) {
      console.error('Export failed:', error);
      setExportProgress(null);
      setLastExport({
        success: false,
        fileName: '',
        tables: selectedTables,
        recordCount: {},
        exportedAt: new Date(),
        error: error instanceof Error ? error.message : 'Export failed'
      });
    } finally {
      setIsExporting(false);
    }
  };

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'json': return <FileText className="h-4 w-4" />;
      case 'csv': return <FileSpreadsheet className="h-4 w-4" />;
      case 'excel': return <FileSpreadsheet className="h-4 w-4" />;
      default: return <Archive className="h-4 w-4" />;
    }
  };

  const getFormatDescription = (format: string) => {
    switch (format) {
      case 'json': return 'Best for technical use and data analysis';
      case 'csv': return 'Compatible with spreadsheet applications';
      case 'excel': return 'Rich formatting with multiple sheets';
      default: return '';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Data Export
          </CardTitle>
          <CardDescription>
            Export your webinar data in various formats for backup or analysis
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Export Format */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Export Format</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(['json', 'csv', 'excel'] as const).map((format) => (
                <div key={format}>
                  <label className={`
                    flex items-center space-x-3 p-4 border rounded-lg cursor-pointer transition-colors
                    ${exportFormat === format 
                      ? 'border-primary bg-primary/5 text-primary' 
                      : 'border-border hover:border-primary/50'
                    }
                  `}>
                    <input
                      type="radio"
                      value={format}
                      checked={exportFormat === format}
                      onChange={(e) => setExportFormat(e.target.value as any)}
                      className="sr-only"
                    />
                    {getFormatIcon(format)}
                    <div>
                      <div className="font-medium capitalize">{format}</div>
                      <div className="text-sm text-muted-foreground">
                        {getFormatDescription(format)}
                      </div>
                    </div>
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Table Selection */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Tables to Export</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {availableTables.map((table) => (
                <div key={table} className="flex items-center space-x-2">
                  <Checkbox
                    id={table}
                    checked={selectedTables.includes(table)}
                    onCheckedChange={() => handleTableToggle(table)}
                  />
                  <Label htmlFor={table} className="text-sm font-mono">
                    {table}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Date Range */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Date Range (Optional)</Label>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="space-y-2">
                <Label htmlFor="from-date" className="text-sm">From</Label>
                <DatePicker
                  date={dateRange.from}
                  onSelect={(date) => setDateRange(prev => ({ ...prev, from: date }))}
                  placeholder="Start date"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="to-date" className="text-sm">To</Label>
                <DatePicker
                  date={dateRange.to}
                  onSelect={(date) => setDateRange(prev => ({ ...prev, to: date }))}
                  placeholder="End date"
                />
              </div>
            </div>
          </div>

          {/* Export Options */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Export Options</Label>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="metadata"
                  checked={includeMetadata}
                  onCheckedChange={setIncludeMetadata}
                />
                <Label htmlFor="metadata">Include metadata and export information</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="compress"
                  checked={compressOutput}
                  onCheckedChange={setCompressOutput}
                />
                <Label htmlFor="compress">Compress output file</Label>
              </div>
            </div>
          </div>

          {/* Progress */}
          {exportProgress && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Export Progress</Label>
                <span className="text-sm text-muted-foreground">
                  {exportProgress.percentage}%
                </span>
              </div>
              <Progress value={exportProgress.percentage} />
              <p className="text-sm text-muted-foreground">
                {exportProgress.message}
              </p>
            </div>
          )}

          {/* Last Export Result */}
          {lastExport && (
            <Alert variant={lastExport.success ? "default" : "destructive"}>
              <div className="flex items-center gap-2">
                {lastExport.success ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <AlertDescription>
                  {lastExport.success ? (
                    <>
                      Export completed successfully! Downloaded as{' '}
                      <Badge variant="secondary">{lastExport.fileName}</Badge>
                      {' '}with {Object.values(lastExport.recordCount).reduce((a, b) => a + b, 0)} total records.
                    </>
                  ) : (
                    <>Export failed: {lastExport.error}</>
                  )}
                </AlertDescription>
              </div>
            </Alert>
          )}

          {/* Export Button */}
          <Button 
            onClick={handleExport}
            disabled={isExporting || selectedTables.length === 0}
            className="w-full"
            size="lg"
          >
            {isExporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            {isExporting ? 'Exporting...' : 'Export Data'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
