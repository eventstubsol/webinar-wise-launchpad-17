
import React, { useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FileText, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CSVUploadData, ImportType } from '../CSVUploadWizard';
import { cn } from '@/lib/utils';

interface CSVFileUploadProps {
  uploadData: CSVUploadData;
  updateUploadData: (updates: Partial<CSVUploadData>) => void;
}

export function CSVFileUpload({ uploadData, updateUploadData }: CSVFileUploadProps) {
  const { toast } = useToast();

  const handleFileUpload = useCallback((file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast({
        title: "Invalid file type",
        description: "Please upload a CSV file (.csv)",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 10MB",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length === 0) {
        toast({
          title: "Empty file",
          description: "The CSV file appears to be empty",
          variant: "destructive",
        });
        return;
      }

      // Parse headers
      const headers = lines[0].split(',').map(header => header.trim().replace(/"/g, ''));
      
      // Parse preview data (first 5 rows)
      const previewData = lines.slice(1, 6).map((line, index) => {
        const values = line.split(',').map(value => value.trim().replace(/"/g, ''));
        const row: any = { _rowNumber: index + 2 };
        headers.forEach((header, i) => {
          row[header] = values[i] || '';
        });
        return row;
      });

      updateUploadData({
        file,
        headers,
        previewData,
        fieldMapping: {} // Reset field mapping when new file is uploaded
      });

      toast({
        title: "File uploaded successfully",
        description: `Found ${headers.length} columns and ${lines.length - 1} data rows`,
      });
    };

    reader.onerror = () => {
      toast({
        title: "Error reading file",
        description: "There was an error reading the CSV file",
        variant: "destructive",
      });
    };

    reader.readAsText(file);
  }, [updateUploadData, toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, [handleFileUpload]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, [handleFileUpload]);

  const downloadTemplate = (type: ImportType) => {
    let headers: string[];
    let sampleData: string[][];

    switch (type) {
      case 'participants':
        headers = ['first_name', 'last_name', 'email', 'organization', 'job_title', 'phone', 'city', 'state_province', 'country'];
        sampleData = [
          ['John', 'Smith', 'john.smith@acme.com', 'Acme Corp', 'Marketing Manager', '+1-555-0123', 'San Francisco', 'CA', 'USA'],
          ['Sarah', 'Johnson', 'sarah@techstart.com', 'TechStart Inc', 'Sales Director', '+1-555-0456', 'New York', 'NY', 'USA']
        ];
        break;
      case 'webinars':
        headers = ['title', 'description', 'start_time', 'duration_minutes', 'host_email', 'registrant_count', 'attendee_count'];
        sampleData = [
          ['Q3 Product Launch', 'Exciting new features and roadmap', '2025-06-15 14:00:00', '60', 'host@company.com', '150', '89'],
          ['Monthly Team Update', 'Team updates and announcements', '2025-06-20 10:00:00', '30', 'team@company.com', '25', '23']
        ];
        break;
      case 'participations':
        headers = ['webinar_title', 'participant_email', 'registration_time', 'join_time', 'leave_time', 'participation_status'];
        sampleData = [
          ['Q3 Product Launch', 'john.smith@acme.com', '2025-06-10 09:00:00', '2025-06-15 14:05:00', '2025-06-15 15:00:00', 'attended'],
          ['Q3 Product Launch', 'sarah@techstart.com', '2025-06-12 15:30:00', '', '', 'registered']
        ];
        break;
    }

    const csvContent = [headers, ...sampleData].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}_template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Step 1: Upload CSV File</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2">Data Type</label>
            <Select 
              value={uploadData.importType} 
              onValueChange={(value: ImportType) => updateUploadData({ importType: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select data type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="participants">Participants</SelectItem>
                <SelectItem value="webinars">Webinars</SelectItem>
                <SelectItem value="participations">Webinar Participations</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Download Template</label>
            <Button
              variant="outline"
              onClick={() => downloadTemplate(uploadData.importType)}
              className="w-full"
            >
              <Download className="w-4 h-4 mr-2" />
              Download {uploadData.importType} template
            </Button>
          </div>
        </div>
      </div>

      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
          "hover:border-blue-400 hover:bg-blue-50",
          uploadData.file ? "border-green-400 bg-green-50" : "border-gray-300"
        )}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        <input
          type="file"
          accept=".csv"
          onChange={handleFileSelect}
          className="hidden"
          id="csv-upload"
        />
        
        {uploadData.file ? (
          <div className="space-y-4">
            <FileText className="w-12 h-12 text-green-600 mx-auto" />
            <div>
              <p className="text-lg font-medium text-green-800">{uploadData.file.name}</p>
              <p className="text-sm text-green-600">
                {(uploadData.file.size / 1024).toFixed(2)} KB • {uploadData.headers.length} columns
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => document.getElementById('csv-upload')?.click()}
            >
              Choose Different File
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <Upload className="w-12 h-12 text-gray-400 mx-auto" />
            <div>
              <p className="text-lg font-medium text-gray-700">
                Drop your CSV file here or click to browse
              </p>
              <p className="text-sm text-gray-500">
                Maximum file size: 10MB
              </p>
            </div>
            <Button onClick={() => document.getElementById('csv-upload')?.click()}>
              Choose File
            </Button>
          </div>
        )}
      </div>

      {uploadData.previewData.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h4 className="font-medium mb-3">Preview Data (First 5 rows)</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    {uploadData.headers.map((header, index) => (
                      <th key={index} className="text-left p-2 font-medium">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {uploadData.previewData.map((row, index) => (
                    <tr key={index} className="border-b">
                      {uploadData.headers.map((header, colIndex) => (
                        <td key={colIndex} className="p-2">
                          {row[header] || ''}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
